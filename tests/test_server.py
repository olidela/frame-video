import pathlib
import tempfile
import unittest
import zipfile
from unittest import mock

import server


class ParseDurationValueTests(unittest.TestCase):
    def test_parses_float_string(self):
        self.assertEqual(server.parse_duration_value("11.245"), 11.245)

    def test_parses_hh_mm_ss_fraction(self):
        self.assertEqual(server.parse_duration_value("00:00:11.245"), 11.245)

    def test_rejects_invalid_value(self):
        self.assertIsNone(server.parse_duration_value("abc"))


class PickBestDurationTests(unittest.TestCase):
    def test_picks_highest_positive_duration(self):
        duration = server.pick_best_duration(["00:00:11.245", "12.5", None, "0"])
        self.assertEqual(duration, 12.5)


class BuildExtractRequestTests(unittest.TestCase):
    def setUp(self):
        self.metadata = {"duration": 20.0}

    def test_builds_fps_request(self):
        form = FakeForm(
            {
                "prefix": "Frame Final",
                "mode": "fps",
                "value": "2",
                "start_time": "1.5",
                "end_time": "6.5",
            }
        )

        request = server.build_extract_request(form, self.metadata)

        self.assertEqual(request["prefix"], "Frame-Final")
        self.assertEqual(request["mode"], "fps")
        self.assertEqual(request["value"], 2.0)
        self.assertEqual(request["start_time"], 1.5)
        self.assertEqual(request["end_time"], 6.5)

    def test_clamps_end_time_to_video_duration(self):
        form = FakeForm(
            {
                "mode": "interval",
                "value": "2",
                "start_time": "3",
                "end_time": "99",
            }
        )

        request = server.build_extract_request(form, self.metadata)

        self.assertEqual(request["end_time"], 20.0)

    def test_rejects_when_frame_count_exceeds_limit(self):
        form = FakeForm(
            {
                "mode": "fps",
                "value": str(server.MAX_FRAMES),
                "start_time": "0",
                "end_time": "2",
            }
        )

        with self.assertRaises(server.RequestError) as context:
            server.build_extract_request(form, self.metadata)

        self.assertEqual(context.exception.status, server.HTTPStatus.BAD_REQUEST)
        self.assertIn("geraria cerca de", context.exception.message)

    def test_rejects_invalid_time_order(self):
        form = FakeForm(
            {
                "mode": "fps",
                "value": "1",
                "start_time": "5",
                "end_time": "5",
            }
        )

        with self.assertRaises(server.RequestError) as context:
            server.build_extract_request(form, self.metadata)

        self.assertIn("tempo final", context.exception.message)


class ProbeVideoTests(unittest.TestCase):
    @mock.patch("server.subprocess.run")
    def test_probe_video_uses_best_duration_source(self, run_mock):
        run_mock.return_value = mock.Mock(
            returncode=0,
            stdout='{"streams":[{"width":1920,"height":1080,"tags":{"DURATION":"00:00:11.245"}}],"format":{"duration":"10.0"}}',
        )

        metadata = server.probe_video("/tmp/video.mp4")

        self.assertEqual(metadata["duration"], 11.245)
        self.assertEqual(metadata["width"], 1920)
        self.assertEqual(metadata["height"], 1080)

    @mock.patch("server.subprocess.run")
    def test_probe_video_raises_request_error_on_ffprobe_failure(self, run_mock):
        run_mock.return_value = mock.Mock(returncode=1, stdout="", stderr="codec error")

        with self.assertRaises(server.RequestError) as context:
            server.probe_video("/tmp/video.mp4")

        self.assertEqual(context.exception.status, server.HTTPStatus.UNPROCESSABLE_ENTITY)


class CreateZipTests(unittest.TestCase):
    def test_create_zip_preserves_file_names(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = pathlib.Path(temp_dir)
            first = temp_path / "frame-0001.png"
            second = temp_path / "frame-0002.png"
            zip_path = temp_path / "frames.zip"

            first.write_bytes(b"frame-1")
            second.write_bytes(b"frame-2")

            server.create_zip([first, second], zip_path)

            with zipfile.ZipFile(zip_path) as archive:
                self.assertEqual(
                    sorted(archive.namelist()),
                    ["frame-0001.png", "frame-0002.png"],
                )


class FakeForm:
    def __init__(self, values):
        self.values = values

    def getfirst(self, key, default=None):
        return self.values.get(key, default)


if __name__ == "__main__":
    unittest.main()
