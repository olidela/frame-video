#!/usr/bin/env python3
import cgi
import json
import math
import os
import pathlib
import shutil
import subprocess
import tempfile
import zipfile
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse


HOST = "0.0.0.0"
PORT = 8000
MAX_FRAMES = 5000
ROOT_DIR = pathlib.Path(__file__).resolve().parent


class FrameVideoHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/api/health":
            self.send_json(HTTPStatus.OK, {"ok": True})
            return

        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)

        if parsed.path == "/api/probe":
            self.handle_probe()
            return

        if parsed.path == "/api/extract":
            self.handle_extract()
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Endpoint nao encontrado.")

    def handle_probe(self):
        upload_path = None

        try:
            form = self.parse_form()
            video_field = self.get_video_field(form)
            upload_path = save_uploaded_file(video_field)
            metadata = probe_video(upload_path)
            self.send_json(HTTPStatus.OK, metadata)
        except RequestError as error:
            self.send_json(error.status, {"error": error.message})
        except Exception as error:
            self.log_error("Probe falhou: %s", error)
            self.send_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {"error": "O FFmpeg local nao conseguiu ler este video."},
            )
        finally:
            cleanup_path(upload_path)

    def handle_extract(self):
        upload_path = None
        temp_dir = None
        zip_path = None

        try:
            form = self.parse_form()
            video_field = self.get_video_field(form)
            upload_path = save_uploaded_file(video_field)
            metadata = probe_video(upload_path)
            request = build_extract_request(form, metadata)

            temp_dir = tempfile.mkdtemp(prefix="frame-video-")
            output_pattern = os.path.join(temp_dir, f"{request['prefix']}-%06d.png")
            extract_frames(upload_path, output_pattern, request)

            frame_paths = sorted(pathlib.Path(temp_dir).glob("*.png"))
            if not frame_paths:
                raise RequestError(
                    HTTPStatus.UNPROCESSABLE_ENTITY,
                    "Nenhum frame foi gerado pelo FFmpeg para esta configuracao.",
                )

            zip_path = os.path.join(temp_dir, f"{request['prefix']}-frames.zip")
            create_zip(frame_paths, zip_path)
            self.send_zip(zip_path, f"{request['prefix']}-frames.zip", len(frame_paths))
        except RequestError as error:
            self.send_json(error.status, {"error": error.message})
        except Exception as error:
            self.log_error("Extracao falhou: %s", error)
            self.send_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {"error": "O FFmpeg local nao conseguiu extrair frames deste video."},
            )
        finally:
            cleanup_path(upload_path)
            cleanup_path(zip_path)
            if temp_dir:
                shutil.rmtree(temp_dir, ignore_errors=True)

    def parse_form(self):
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            raise RequestError(
                HTTPStatus.BAD_REQUEST,
                "Envie o video usando multipart/form-data.",
            )

        return cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={
                "REQUEST_METHOD": "POST",
                "CONTENT_TYPE": content_type,
            },
        )

    def get_video_field(self, form):
        if "video" not in form:
            raise RequestError(HTTPStatus.BAD_REQUEST, "Nenhum video foi enviado.")

        video_field = form["video"]
        if not getattr(video_field, "filename", ""):
            raise RequestError(HTTPStatus.BAD_REQUEST, "O arquivo de video esta vazio.")

        return video_field

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_zip(self, zip_path, download_name, frame_count):
        size = os.path.getsize(zip_path)
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/zip")
        self.send_header("Content-Disposition", f'attachment; filename="{download_name}"')
        self.send_header("Content-Length", str(size))
        self.send_header("X-Frame-Count", str(frame_count))
        self.end_headers()

        with open(zip_path, "rb") as file_handle:
            shutil.copyfileobj(file_handle, self.wfile)


class RequestError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def save_uploaded_file(video_field):
    suffix = pathlib.Path(video_field.filename).suffix or ".video"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        shutil.copyfileobj(video_field.file, temp_file)
        return temp_file.name


def cleanup_path(path):
    if not path:
        return

    try:
        os.remove(path)
    except FileNotFoundError:
        return


def probe_video(video_path):
    command = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height,duration:stream_tags=DURATION:format=duration:format_tags=DURATION",
        "-of",
        "json",
        video_path,
    ]
    result = subprocess.run(command, capture_output=True, text=True, check=False)

    if result.returncode != 0:
        raise RequestError(
            HTTPStatus.UNPROCESSABLE_ENTITY,
            "O FFmpeg local nao conseguiu ler o codec deste video.",
        )

    try:
        payload = json.loads(result.stdout or "{}")
        stream = (payload.get("streams") or [{}])[0]
        format_payload = payload.get("format") or {}
        duration = pick_best_duration(
            [
                format_payload.get("duration"),
                (format_payload.get("tags") or {}).get("DURATION"),
                stream.get("duration"),
                (stream.get("tags") or {}).get("DURATION"),
            ]
        )
        width = int(stream.get("width") or 0)
        height = int(stream.get("height") or 0)
    except (TypeError, ValueError, json.JSONDecodeError) as error:
        raise RequestError(
            HTTPStatus.UNPROCESSABLE_ENTITY,
            "O FFmpeg local recebeu metadados invalidos deste video.",
        ) from error

    if duration <= 0 or width <= 0 or height <= 0:
        raise RequestError(
            HTTPStatus.UNPROCESSABLE_ENTITY,
            "O video nao trouxe duracao ou resolucao validas.",
        )

    return {
        "duration": duration,
        "width": width,
        "height": height,
    }


def pick_best_duration(raw_values):
    durations = [
        duration
        for duration in (parse_duration_value(value) for value in raw_values)
        if duration is not None
    ]
    return max(durations, default=0)


def parse_duration_value(raw_value):
    if raw_value is None:
        return None

    if isinstance(raw_value, (int, float)):
        duration = float(raw_value)
        return duration if math.isfinite(duration) and duration > 0 else None

    raw_text = str(raw_value).strip()
    if not raw_text:
        return None

    try:
        duration = float(raw_text)
        return duration if math.isfinite(duration) and duration > 0 else None
    except ValueError:
        pass

    parts = raw_text.split(":")
    if len(parts) != 3:
        return None

    try:
        hours = int(parts[0])
        minutes = int(parts[1])
        seconds = float(parts[2])
    except ValueError:
        return None

    duration = (hours * 3600) + (minutes * 60) + seconds
    return duration if math.isfinite(duration) and duration > 0 else None


def build_extract_request(form, metadata):
    prefix = sanitize_prefix(form.getfirst("prefix", "frame"))
    mode = form.getfirst("mode", "fps")

    if mode not in {"fps", "interval"}:
        raise RequestError(HTTPStatus.BAD_REQUEST, "Modo de extracao invalido.")

    value = parse_positive_float(form.getfirst("value", "1"), "O valor da extracao e invalido.")
    start_time = parse_non_negative_float(
        form.getfirst("start_time", "0"),
        "O tempo inicial precisa ser maior ou igual a zero.",
    )
    end_time = parse_positive_float(
        form.getfirst("end_time", str(metadata["duration"])),
        "O tempo final precisa ser maior que zero.",
    )

    duration = metadata["duration"]
    if start_time >= duration:
        raise RequestError(
            HTTPStatus.BAD_REQUEST,
            "O tempo inicial precisa estar dentro da duracao do video.",
        )

    end_time = min(end_time, duration)
    if end_time <= start_time:
        raise RequestError(
            HTTPStatus.BAD_REQUEST,
            "O tempo final precisa ser maior que o tempo inicial.",
        )

    estimated_frames = estimate_frame_count(mode, value, start_time, end_time)
    if estimated_frames > MAX_FRAMES:
        raise RequestError(
            HTTPStatus.BAD_REQUEST,
            f"Essa configuracao geraria cerca de {estimated_frames} frames. Reduza a quantidade antes de continuar.",
        )

    return {
        "prefix": prefix,
        "mode": mode,
        "value": value,
        "start_time": start_time,
        "end_time": end_time,
    }


def parse_positive_float(raw_value, error_message):
    try:
        value = float(raw_value)
    except (TypeError, ValueError) as error:
        raise RequestError(HTTPStatus.BAD_REQUEST, error_message) from error

    if not math.isfinite(value) or value <= 0:
        raise RequestError(HTTPStatus.BAD_REQUEST, error_message)

    return value


def parse_non_negative_float(raw_value, error_message):
    try:
        value = float(raw_value)
    except (TypeError, ValueError) as error:
        raise RequestError(HTTPStatus.BAD_REQUEST, error_message) from error

    if not math.isfinite(value) or value < 0:
        raise RequestError(HTTPStatus.BAD_REQUEST, error_message)

    return value


def estimate_frame_count(mode, value, start_time, end_time):
    span = max(0.0, end_time - start_time)

    if mode == "fps":
        return int(math.floor(span * value)) + 1

    return int(math.floor(span / value)) + 1


def sanitize_prefix(value):
    cleaned = "".join(char if char.isalnum() or char in {"-", "_"} else "-" for char in value.strip())
    while "--" in cleaned:
        cleaned = cleaned.replace("--", "-")

    cleaned = cleaned.strip("-")
    return (cleaned or "frame")[:40]


def extract_frames(video_path, output_pattern, request):
    filter_value = (
        f"fps={request['value']}"
        if request["mode"] == "fps"
        else f"fps=1/{request['value']}"
    )
    clip_duration = request["end_time"] - request["start_time"]

    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-ss",
        f"{request['start_time']:.6f}",
        "-i",
        video_path,
        "-t",
        f"{clip_duration:.6f}",
        "-an",
        "-sn",
        "-vf",
        filter_value,
        output_pattern,
    ]
    result = subprocess.run(command, capture_output=True, text=True, check=False)

    if result.returncode != 0:
        message = result.stderr.strip() or "O FFmpeg local nao conseguiu extrair frames deste video."
        raise RequestError(HTTPStatus.UNPROCESSABLE_ENTITY, message)


def create_zip(frame_paths, zip_path):
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_STORED) as archive:
        for frame_path in frame_paths:
            archive.write(frame_path, arcname=frame_path.name)


def main():
    server = ThreadingHTTPServer((HOST, PORT), FrameVideoHandler)
    print(f"Servidor em http://127.0.0.1:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
