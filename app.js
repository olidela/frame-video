const form = document.querySelector("#extract-form");
const selectVideoButton = document.querySelector("#select-video-button");
const videoInput = document.querySelector("#video-input");
const modeInputs = document.querySelectorAll('input[name="capture-mode"]');
const fpsInput = document.querySelector("#fps-input");
const intervalInput = document.querySelector("#interval-input");
const modeFields = document.querySelectorAll("[data-mode-field]");
const prefixInput = document.querySelector("#prefix-input");
const startTimeInput = document.querySelector("#start-time-input");
const endTimeInput = document.querySelector("#end-time-input");
const fileName = document.querySelector("#file-name");
const durationStat = document.querySelector("#duration-stat");
const resolutionStat = document.querySelector("#resolution-stat");
const framesStat = document.querySelector("#frames-stat");
const zipStat = document.querySelector("#zip-stat");
const progressLabel = document.querySelector("#progress-label");
const progressCount = document.querySelector("#progress-count");
const progressFill = document.querySelector("#progress-fill");
const downloadLink = document.querySelector("#download-link");
const previewGrid = document.querySelector("#preview-grid");
const startButton = document.querySelector("#start-button");

const MAX_FRAMES = 5000;
const DIRECT_SAVE_FRAME_THRESHOLD = 250;
const DIRECT_SAVE_PIXEL_THRESHOLD = 250_000_000;
const ZIP_UINT16_MAX = 0xffffn;
const ZIP_UINT32_MAX = 0xffffffffn;
const MEDIA_EVENT_TIMEOUT_MS = 12000;
const LOCAL_API_TIMEOUT_MS = 1500;

let currentZipUrl = null;
let previewUrls = [];
let localApiAvailabilityPromise = null;

selectVideoButton.addEventListener("click", () => {
  videoInput.click();
});

videoInput.addEventListener("change", async () => {
  await refreshVideoStats();
});

modeInputs.forEach((input) => {
  input.addEventListener("change", async () => {
    syncModeFields();
    if (!videoInput.files?.[0]) {
      return;
    }

    await refreshVideoStats();
  });
});

fpsInput.addEventListener("input", async () => {
  if (getCaptureMode() !== "fps" || !videoInput.files?.[0]) {
    return;
  }

  await refreshVideoStats();
});

intervalInput.addEventListener("input", async () => {
  if (getCaptureMode() !== "interval" || !videoInput.files?.[0]) {
    return;
  }

  await refreshVideoStats();
});

startTimeInput.addEventListener("input", async () => {
  if (!videoInput.files?.[0]) {
    return;
  }

  await refreshVideoStats();
});

endTimeInput.addEventListener("input", async () => {
  if (!videoInput.files?.[0]) {
    return;
  }

  await refreshVideoStats();
});

syncModeFields();

function getCaptureMode() {
  return document.querySelector('input[name="capture-mode"]:checked')?.value || "fps";
}

function syncModeFields() {
  const activeMode = getCaptureMode();

  modeFields.forEach((field) => {
    const isActive = field.dataset.modeField === activeMode;
    field.classList.toggle("is-hidden", !isActive);
    const input = field.querySelector("input");
    if (input) {
      input.required = isActive;
    }
  });
}

async function canUseLocalApi() {
  if (!localApiAvailabilityPromise) {
    localApiAvailabilityPromise = checkLocalApiAvailability();
  }

  return localApiAvailabilityPromise;
}

async function checkLocalApiAvailability() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, LOCAL_API_TIMEOUT_MS);

  try {
    const response = await fetch("/api/health", {
      cache: "no-store",
      signal: controller.signal,
    });

    return response.ok;
  } catch (error) {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function loadVideoMetadataWithBestBackend(file) {
  if (await canUseLocalApi()) {
    const [serverResult, browserResult] = await Promise.allSettled([
      loadVideoMetadataFromServer(file),
      loadVideoMetadata(file),
    ]);

    const serverMetadata =
      serverResult.status === "fulfilled" ? serverResult.value : null;
    const browserMetadata =
      browserResult.status === "fulfilled" ? browserResult.value : null;

    if (serverMetadata && browserMetadata) {
      return mergeMetadataForLocalApi(serverMetadata, browserMetadata);
    }

    if (serverMetadata) {
      return {
        ...serverMetadata,
        backend: "server",
        previewMetadata: null,
      };
    }

    if (browserMetadata) {
      return {
        ...browserMetadata,
        backend: "browser",
        previewMetadata: browserMetadata,
      };
    }

    throw serverResult.reason || browserResult.reason || new Error("Não foi possível ler os metadados do vídeo.");
  }

  const metadata = await loadVideoMetadata(file);
  return {
    ...metadata,
    backend: "browser",
    previewMetadata: metadata,
  };
}

function mergeMetadataForLocalApi(serverMetadata, browserMetadata) {
  return {
    duration: pickMostReliableDuration(serverMetadata.duration, browserMetadata.duration),
    width: serverMetadata.width || browserMetadata.width,
    height: serverMetadata.height || browserMetadata.height,
    backend: "server",
    previewMetadata: browserMetadata,
  };
}

function pickMostReliableDuration(...rawDurations) {
  const durations = rawDurations
    .map((duration) => Number(duration))
    .filter((duration) => Number.isFinite(duration) && duration > 0);

  return durations.length ? Math.max(...durations) : NaN;
}

function getCaptureConfig() {
  const mode = getCaptureMode();

  if (mode === "interval") {
    const interval = getIntervalValue();
    return {
      mode,
      value: interval,
      timesBuilder: (timeRange) => buildCaptureTimesFromInterval(timeRange, interval),
    };
  }

  const fps = getFpsValue();
  return {
    mode,
    value: fps,
    timesBuilder: (timeRange) => buildCaptureTimesFromFps(timeRange, fps),
  };
}

async function refreshVideoStats() {
  const file = videoInput.files?.[0];

  resetDownload();
  clearPreviews();

  if (!file) {
    fileName.textContent = "Nenhum arquivo selecionado";
    setStatus("Selecione um vídeo para começar.", 0);
    durationStat.textContent = "-";
    resolutionStat.textContent = "-";
    framesStat.textContent = "-";
    return;
  }

  fileName.textContent = file.name;
  setStatus("Lendo metadados do vídeo...", 5);

  try {
    const metadata = await loadVideoMetadataWithBestBackend(file);
    const timeRange = getTimeRange(metadata.duration);
    const captureConfig = getCaptureConfig();
    const captureTimes = captureConfig.timesBuilder(timeRange);

    durationStat.textContent = formatDuration(metadata.duration, {
      includeMilliseconds: true,
    });
    resolutionStat.textContent = `${metadata.width} x ${metadata.height}`;
    framesStat.textContent = formatFrameCount(captureTimes.length);
    setStatus(
      metadata.backend === "server"
        ? "Vídeo pronto para extração com FFmpeg local."
        : "Vídeo pronto para extração.",
      0
    );
  } catch (error) {
    console.error(error);
    durationStat.textContent = "-";
    resolutionStat.textContent = "-";
    framesStat.textContent = "-";
    setStatus(error.message || "Não foi possível ler esse vídeo no navegador.", 0);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const file = videoInput.files?.[0];
  if (!videoInput.files?.[0]) {
    return;
  }

  if (!file) {
    setStatus("Selecione um vídeo antes de extrair.", 0);
    return;
  }

  const captureConfig = getCaptureConfig();
  const prefix = sanitizePrefix(prefixInput.value);

  startButton.disabled = true;
  resetDownload();
  clearPreviews();

  let zipWriter = null;

  try {
    const metadata = await loadVideoMetadataWithBestBackend(file);
    const timeRange = getTimeRange(metadata.duration);
    const captureTimes = captureConfig.timesBuilder(timeRange);

    durationStat.textContent = formatDuration(metadata.duration, {
      includeMilliseconds: true,
    });
    resolutionStat.textContent = `${metadata.width} x ${metadata.height}`;
    framesStat.textContent = formatFrameCount(captureTimes.length);
    zipStat.textContent = "Gerando...";

    if (metadata.backend === "server") {
      setStatus("Enviando vídeo para o FFmpeg local...", 4);

      const zipResult = await extractFramesWithServer({
        file,
        prefix,
        captureConfig,
        timeRange,
      });

      currentZipUrl = URL.createObjectURL(zipResult.blob);
      downloadLink.href = currentZipUrl;
      downloadLink.download = zipResult.fileName;
      downloadLink.classList.remove("disabled");

      const previewFrames = await extractPreviewFramesIfPossible({
        file,
        prefix,
        captureTimes,
        previewMetadata: metadata.previewMetadata,
      });

      if (previewFrames.length) {
        renderPreviews(previewFrames);
      } else {
        showPreviewMessage("Prévia indisponível para este arquivo no navegador. Baixe o ZIP para conferir os frames.");
      }

      zipStat.textContent = `${formatFrameCount(
        zipResult.fileCount || captureTimes.length
      )} imagens no ZIP`;
      setStatus("Concluído. O ZIP está pronto para download.", 100);
      return;
    }

    const useDirectSave = shouldUseDirectZipSave({
      width: metadata.width,
      height: metadata.height,
      frameCount: captureTimes.length,
    });

    if (useDirectSave) {
      setStatus("Escolha onde salvar o ZIP para exportações grandes.", 1);
    } else {
      setStatus("Preparando frames...", 2);
    }

    zipWriter = await createZipWriter({
      prefix,
      preferDirectSave: useDirectSave,
    });

    zipStat.textContent =
      zipWriter.mode === "disk" ? "Salvando direto no disco..." : "Montando ZIP...";

    const { previewFrames } = await extractFrames({
      file,
      width: metadata.width,
      height: metadata.height,
      times: captureTimes,
      prefix,
      onFrame: async (frame) => {
        await zipWriter.addFile(frame);
      },
      onProgress: (index, total) => {
        const percent = Math.round((index / total) * 100);
        setStatus(`Extraindo frame ${index} de ${total}...`, percent);
      },
    });

    setStatus("Finalizando arquivo ZIP...", 98);

    const zipResult = await zipWriter.finalize();
    renderPreviews(previewFrames);

    if (zipResult.mode === "download") {
      const zipUrl = URL.createObjectURL(zipResult.blob);
      currentZipUrl = zipUrl;

      downloadLink.href = zipUrl;
      downloadLink.download = zipResult.fileName;
      downloadLink.classList.remove("disabled");
      zipStat.textContent = `${formatFrameCount(zipResult.fileCount)} imagens no ZIP`;
      setStatus("Concluído. O ZIP está pronto para download.", 100);
    } else {
      downloadLink.classList.add("disabled");
      zipStat.textContent = `${formatFrameCount(zipResult.fileCount)} imagens salvas`;
      setStatus("Concluído. O ZIP foi salvo direto no disco.", 100);
    }
  } catch (error) {
    if (zipWriter) {
      await zipWriter.cancel().catch(() => {});
    }

    console.error(error);
    zipStat.textContent = "Falhou";
    setStatus(error.message || "Ocorreu um erro durante a extração.", 0);
  } finally {
    startButton.disabled = false;
  }
});

async function loadVideoMetadataFromServer(file) {
  const formData = new FormData();
  formData.append("video", file, file.name);

  const response = await fetch("/api/probe", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  const payload = await response.json();
  const duration = Number(payload.duration);
  const width = Number(payload.width);
  const height = Number(payload.height);

  if (!Number.isFinite(duration) || duration <= 0 || !width || !height) {
    throw new Error("O FFmpeg local não conseguiu ler metadados válidos do vídeo.");
  }

  return {
    duration,
    width,
    height,
  };
}

async function extractFramesWithServer({ file, prefix, captureConfig, timeRange }) {
  const formData = new FormData();
  formData.append("video", file, file.name);
  formData.append("prefix", prefix);
  formData.append("mode", captureConfig.mode);
  formData.append("value", String(captureConfig.value));
  formData.append("start_time", String(timeRange.start));
  formData.append("end_time", String(timeRange.end));

  const response = await fetch("/api/extract", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return {
    blob: await response.blob(),
    fileName: getDownloadFileName(response, `${prefix}-frames.zip`),
    fileCount: getServerFrameCount(response),
  };
}

async function extractPreviewFramesIfPossible({ file, prefix, captureTimes, previewMetadata }) {
  if (!previewMetadata || !captureTimes.length) {
    return [];
  }

  try {
    const { previewFrames } = await extractFrames({
      file,
      width: previewMetadata.width,
      height: previewMetadata.height,
      times: captureTimes.slice(0, 3),
      prefix,
      onFrame: async () => {},
      onProgress: () => {},
    });

    return previewFrames;
  } catch (error) {
    console.warn("Não foi possível gerar a prévia no navegador.", error);
    return [];
  }
}

function getFpsValue() {
  const value = Number(fpsInput.value);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function getIntervalValue() {
  const value = Number(intervalInput.value);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function getTimeRange(duration) {
  const rawStart = Number(startTimeInput.value);
  const rawEnd = endTimeInput.value === "" ? duration : Number(endTimeInput.value);
  const start = Number.isFinite(rawStart) ? rawStart : 0;
  const end = Number.isFinite(rawEnd) ? rawEnd : duration;

  if (start < 0) {
    throw new Error("O tempo inicial não pode ser negativo.");
  }

  if (end <= start) {
    throw new Error("O tempo final precisa ser maior que o tempo inicial.");
  }

  if (start >= duration) {
    throw new Error("O tempo inicial precisa estar dentro da duração do vídeo.");
  }

  return {
    start,
    end: Math.min(end, duration),
  };
}

function sanitizePrefix(value) {
  const cleaned = value.trim().replace(/[^a-z0-9_-]+/gi, "-").replace(/-+/g, "-");
  return cleaned ? cleaned.slice(0, 40) : "frame";
}

function getDownloadFileName(response, fallback) {
  const contentDisposition = response.headers.get("content-disposition") || "";
  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
}

function getServerFrameCount(response) {
  const rawCount = Number(response.headers.get("x-frame-count"));
  return Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 0;
}

async function getApiErrorMessage(response) {
  try {
    const payload = await response.json();
    return payload.error || "O FFmpeg local não conseguiu processar o vídeo.";
  } catch (error) {
    return "O FFmpeg local não conseguiu processar o vídeo.";
  }
}

function setStatus(message, percent) {
  progressLabel.textContent = message;
  progressCount.textContent = `${Math.max(0, Math.min(100, percent))}%`;
  progressFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function resetDownload() {
  if (currentZipUrl) {
    URL.revokeObjectURL(currentZipUrl);
    currentZipUrl = null;
  }

  downloadLink.href = "#";
  downloadLink.removeAttribute("download");
  downloadLink.classList.add("disabled");
  zipStat.textContent = "Aguardando";
}

function clearPreviews() {
  previewUrls.forEach((url) => URL.revokeObjectURL(url));
  previewUrls = [];
  showPreviewMessage("A prévia será exibida depois da extração.");
}

function showPreviewMessage(message) {
  previewGrid.innerHTML = `<p class="preview-empty">${message}</p>`;
}

async function loadVideoMetadata(file) {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");

  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = objectUrl;

  const cleanup = () => {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  };

  try {
    await once(video, "loadedmetadata", {
      errorMessage: buildVideoLoadErrorMessage(file),
    });

    const duration = await resolveVideoDuration(video);
    const width = Number(video.videoWidth);
    const height = Number(video.videoHeight);

    if (!Number.isFinite(duration) || duration <= 0 || !width || !height) {
      throw new Error(buildVideoLoadErrorMessage(file));
    }

    return { duration, width, height };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(buildVideoLoadErrorMessage(file));
  } finally {
    cleanup();
  }
}

async function resolveVideoDuration(video) {
  const readDuration = () => {
    const duration = Number(video.duration);
    return Number.isFinite(duration) && duration > 0 ? duration : NaN;
  };

  const initialDuration = readDuration();
  if (Number.isFinite(initialDuration)) {
    return initialDuration;
  }

  await waitForDurationHint(video);

  const hintedDuration = readDuration();
  if (Number.isFinite(hintedDuration)) {
    return hintedDuration;
  }

  try {
    video.currentTime = 1e101;
    await once(video, "seeked", {
      errorMessage: "O navegador não conseguiu navegar pelo vídeo para descobrir a duração.",
    });

    const discoveredDuration = readDuration();

    video.currentTime = 0;
    await once(video, "seeked", {
      errorMessage: "O navegador não conseguiu voltar ao início do vídeo.",
    });

    if (Number.isFinite(discoveredDuration)) {
      return discoveredDuration;
    }
  } catch (error) {
    console.warn("Não foi possível resolver a duração exata do vídeo.", error);
  }

  return Number(video.duration);
}

async function waitForDurationHint(video) {
  const duration = Number(video.duration);
  if (Number.isFinite(duration) && duration > 0) {
    return;
  }

  await Promise.race([
    once(video, "durationchange").catch(() => {}),
    once(video, "loadeddata").catch(() => {}),
    once(video, "canplay").catch(() => {}),
    wait(MEDIA_EVENT_TIMEOUT_MS / 2),
  ]);
}

function buildCaptureTimesFromFps(timeRange, fps) {
  const epsilon = 1 / 1000;
  const span = Math.max(0, timeRange.end - timeRange.start);
  const safeEnd = Math.max(timeRange.start, timeRange.end - epsilon);
  const frameStep = 1 / fps;
  const estimatedFrames = Math.floor(span * fps) + 1;

  if (estimatedFrames > MAX_FRAMES) {
    throw new Error(
      `Essa configuração geraria cerca de ${estimatedFrames} frames. Reduza o FPS para no máximo ${suggestMaxFps(span)}.`
    );
  }

  const times = [];
  for (let index = 0; index < estimatedFrames; index += 1) {
    const current = Number((timeRange.start + index * frameStep).toFixed(3));
    if (current > safeEnd) {
      break;
    }
    times.push(current);
  }

  if (!times.length) {
    times.push(Number(timeRange.start.toFixed(3)));
  }

  return times;
}

function buildCaptureTimesFromInterval(timeRange, intervalSeconds) {
  const epsilon = 1 / 1000;
  const span = Math.max(0, timeRange.end - timeRange.start);
  const lastFrameTime = Math.max(timeRange.start, timeRange.end - epsilon);
  const estimatedFrames = Math.floor(span / intervalSeconds) + 1;

  if (estimatedFrames > MAX_FRAMES) {
    throw new Error(
      `Essa configuração geraria cerca de ${estimatedFrames} frames. Aumente o intervalo para pelo menos ${suggestMinInterval(span)} segundos.`
    );
  }

  const times = [Number(timeRange.start.toFixed(3))];

  for (
    let current = timeRange.start + intervalSeconds;
    current < timeRange.end;
    current += intervalSeconds
  ) {
    times.push(Number(current.toFixed(3)));
  }

  if (times[times.length - 1] < lastFrameTime - epsilon) {
    times.push(Number(lastFrameTime.toFixed(3)));
  }

  return [...new Set(times)];
}

function suggestMaxFps(duration) {
  const maxFps = MAX_FRAMES / Math.max(duration, 1);
  return Math.max(0.1, Math.floor(maxFps * 10) / 10).toFixed(1);
}

function suggestMinInterval(duration) {
  const minInterval = Math.max(duration / MAX_FRAMES, 0.1);
  return (Math.ceil(minInterval * 10) / 10).toFixed(1);
}

async function extractFrames({ file, width, height, times, prefix, onFrame, onProgress }) {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", {
    alpha: false,
    willReadFrequently: false,
  });

  if (!context) {
    URL.revokeObjectURL(objectUrl);
    throw new Error("Seu navegador não conseguiu iniciar o canvas.");
  }

  canvas.width = width;
  canvas.height = height;
  context.imageSmoothingEnabled = false;
  context.imageSmoothingQuality = "high";
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = objectUrl;

  const cleanup = () => {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  };

  try {
    await once(video, "loadeddata", {
      errorMessage: buildVideoLoadErrorMessage(file),
    });

    const previewFrames = [];

    for (let index = 0; index < times.length; index += 1) {
      const targetTime = clampTime(times[index], video.duration);
      await seekVideo(video, targetTime);
      await waitForStableFrame(video);

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await canvasToBlob(canvas);
      const fileIndex = String(index + 1).padStart(4, "0");
      const name = `${prefix}-${fileIndex}-${formatTimeForName(targetTime)}.png`;
      const buffer = new Uint8Array(await blob.arrayBuffer());

      if (previewFrames.length < 3) {
        previewFrames.push({
          name,
          blob,
          capturedAt: targetTime,
        });
      }

      await onFrame({
        name,
        buffer,
        capturedAt: targetTime,
      });

      onProgress(index + 1, times.length);
    }

    return { previewFrames };
  } finally {
    cleanup();
  }
}

function clampTime(time, duration) {
  const epsilon = 1 / 1000;
  return Math.max(0, Math.min(time, Math.max(0, duration - epsilon)));
}

function seekVideo(video, time) {
  return new Promise((resolve, reject) => {
    if (Math.abs(video.currentTime - time) < 0.001) {
      resolve();
      return;
    }

    const onSeeked = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("Falha ao navegar entre os frames do vídeo."));
    };

    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    video.currentTime = time;
  });
}

function waitForStableFrame(video) {
  if (typeof video.requestVideoFrameCallback !== "function") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    let callbackId = 0;

    const finalize = () => {
      if (settled) {
        return;
      }

      settled = true;
      if (typeof video.cancelVideoFrameCallback === "function" && callbackId) {
        video.cancelVideoFrameCallback(callbackId);
      }
      resolve();
    };

    callbackId = video.requestVideoFrameCallback(() => {
      finalize();
    });

    setTimeout(finalize, 120);
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Não foi possível converter o frame em PNG."));
          return;
        }

        resolve(blob);
      },
      "image/png",
      1
    );
  });
}

function once(target, eventName, options = {}) {
  const { errorMessage = "Não foi possível carregar o vídeo para extração." } = options;

  if (isMediaReadyForEvent(target, eventName)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error(errorMessage));
    }, MEDIA_EVENT_TIMEOUT_MS);

    const onDone = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error(errorMessage));
    };

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      target.removeEventListener(eventName, onDone);
      target.removeEventListener("error", onError);
    };

    target.addEventListener(eventName, onDone, { once: true });
    target.addEventListener("error", onError, { once: true });
  });
}

function isMediaReadyForEvent(target, eventName) {
  if (!(target instanceof HTMLMediaElement)) {
    return false;
  }

  if (eventName === "loadedmetadata") {
    return target.readyState >= HTMLMediaElement.HAVE_METADATA;
  }

  if (eventName === "loadeddata") {
    return target.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  }

  if (eventName === "canplay") {
    return target.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA;
  }

  return false;
}

function buildVideoLoadErrorMessage(file) {
  const name = file?.name?.toLowerCase() || "";
  const type = file?.type?.toLowerCase() || "";
  const isMov = name.endsWith(".mov") || type.includes("quicktime");

  if (isMov) {
    return "Este arquivo MOV não pôde ser lido no navegador. Muitos MOV 4K usam HEVC/H.265 ou ProRes, que nem todo navegador e sistema conseguem decodificar. Se puder, converta para MP4 com H.264 ou teste em um navegador com suporte ao codec.";
  }

  return "Não foi possível ler esse vídeo no navegador. Tente usar MP4 com H.264 se o arquivo atual não abrir.";
}

function wait(timeoutMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, timeoutMs);
  });
}

function renderPreviews(frames) {
  clearPreviews();

  if (!frames.length) {
    return;
  }

  previewGrid.innerHTML = "";

  frames.forEach((frame) => {
    const previewUrl = URL.createObjectURL(frame.blob);
    previewUrls.push(previewUrl);

    const figure = document.createElement("figure");
    figure.className = "preview-card";
    figure.innerHTML = `
      <img src="${previewUrl}" alt="${frame.name}" />
      <figcaption>${frame.name}<br />${formatDuration(frame.capturedAt, {
        includeMilliseconds: true,
      })}</figcaption>
    `;
    previewGrid.appendChild(figure);
  });
}

function formatDuration(totalSeconds, options = {}) {
  const { includeMilliseconds = false } = options;
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(totalSeconds, 0) : 0;
  const totalMilliseconds = Math.round(safeSeconds * 1000);
  const wholeSeconds = Math.floor(totalMilliseconds / 1000);
  const milliseconds = totalMilliseconds % 1000;
  const seconds = (wholeSeconds % 60).toString().padStart(2, "0");
  const minutes = Math.floor((wholeSeconds / 60) % 60)
    .toString()
    .padStart(2, "0");
  const hours = Math.floor(wholeSeconds / 3600)
    .toString()
    .padStart(2, "0");

  if (!includeMilliseconds) {
    return `${hours}:${minutes}:${seconds}`;
  }

  return `${hours}:${minutes}:${seconds}.${milliseconds.toString().padStart(3, "0")}`;
}

function formatTimeForName(totalSeconds) {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(totalSeconds, 0) : 0;
  const totalMilliseconds = Math.round(safeSeconds * 1000);
  const milliseconds = totalMilliseconds % 1000;
  const wholeSeconds = Math.floor(totalMilliseconds / 1000);

  return `${formatDuration(wholeSeconds).replaceAll(":", "-")}-${milliseconds
    .toString()
    .padStart(3, "0")}`;
}

function formatFrameCount(count) {
  return new Intl.NumberFormat("pt-BR").format(count);
}

function shouldUseDirectZipSave({ width, height, frameCount }) {
  if (!supportsDirectZipSave()) {
    return false;
  }

  return (
    frameCount >= DIRECT_SAVE_FRAME_THRESHOLD ||
    width * height * frameCount >= DIRECT_SAVE_PIXEL_THRESHOLD
  );
}

function supportsDirectZipSave() {
  return typeof window.showSaveFilePicker === "function";
}

async function createZipWriter({ prefix, preferDirectSave }) {
  const fileName = `${prefix}-frames.zip`;

  if (preferDirectSave) {
    try {
      return await createDirectSaveZipWriter(fileName);
    } catch (error) {
      if (isAbortError(error)) {
        throw new Error("A exportação foi cancelada antes de salvar o ZIP.");
      }

      console.warn("Falha ao abrir o salvamento direto. Voltando para download padrão.", error);
    }
  }

  return createInMemoryZipWriter(fileName);
}

async function createDirectSaveZipWriter(fileName) {
  const handle = await window.showSaveFilePicker({
    suggestedName: fileName,
    types: [
      {
        description: "Arquivo ZIP",
        accept: {
          "application/zip": [".zip"],
        },
      },
    ],
  });
  const writable = await handle.createWritable();

  return createStoredZipWriter({
    fileName,
    mode: "disk",
    writePart: async (part) => {
      await writable.write(part);
    },
    closeWriter: async () => {
      await writable.close();
    },
    abortWriter: async () => {
      await writable.abort();
    },
    buildResult: async ({ fileCount }) => ({
      mode: "disk",
      fileName,
      fileCount,
    }),
  });
}

function createInMemoryZipWriter(fileName) {
  const parts = [];

  return createStoredZipWriter({
    fileName,
    mode: "download",
    writePart: async (part) => {
      parts.push(part);
    },
    closeWriter: async () => {},
    abortWriter: async () => {
      parts.length = 0;
    },
    buildResult: async ({ fileCount }) => ({
      mode: "download",
      fileName,
      fileCount,
      blob: new Blob(parts, {
        type: "application/zip",
      }),
    }),
  });
}

function createStoredZipWriter({ fileName, mode, writePart, closeWriter, abortWriter, buildResult }) {
  const encoder = new TextEncoder();
  const centralParts = [];
  let offset = 0n;
  let centralSize = 0n;
  let fileCount = 0n;
  let closed = false;

  return {
    fileName,
    mode,
    async addFile(file) {
      if (closed) {
        throw new Error("O arquivo ZIP já foi finalizado.");
      }

      const nameBytes = encoder.encode(file.name);
      const size = BigInt(file.buffer.length);
      const crc = crc32(file.buffer);
      const dos = getDosDateTime(new Date());
      const localOffset = offset;

      const localHeader = buildLocalFileHeader({
        nameBytes,
        crc,
        size,
        dos,
      });
      const centralHeader = buildCentralDirectoryHeader({
        nameBytes,
        crc,
        size,
        dos,
        localOffset,
      });

      await writePart(localHeader);
      await writePart(file.buffer);

      centralParts.push(centralHeader);
      offset += BigInt(localHeader.length + file.buffer.length);
      centralSize += BigInt(centralHeader.length);
      fileCount += 1n;
    },
    async finalize() {
      if (closed) {
        throw new Error("O arquivo ZIP já foi finalizado.");
      }

      const centralOffset = offset;
      for (const part of centralParts) {
        await writePart(part);
      }

      const endRecords = buildZipEndRecords({
        fileCount,
        centralSize,
        centralOffset,
      });

      for (const part of endRecords) {
        await writePart(part);
      }

      await closeWriter();
      closed = true;

      return buildResult({
        fileCount: Number(fileCount),
      });
    },
    async cancel() {
      if (closed) {
        return;
      }

      closed = true;
      await abortWriter();
    },
  };
}

function buildLocalFileHeader({ nameBytes, crc, size, dos }) {
  const needsZip64Sizes = size > ZIP_UINT32_MAX;
  const extraField = needsZip64Sizes
    ? buildZip64ExtraField({
        uncompressedSize: size,
        compressedSize: size,
      })
    : new Uint8Array(0);
  const header = new Uint8Array(30 + nameBytes.length + extraField.length);
  const view = new DataView(header.buffer);
  const versionNeeded = needsZip64Sizes ? 45 : 20;

  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, versionNeeded, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, dos.time, true);
  view.setUint16(12, dos.date, true);
  view.setUint32(14, crc >>> 0, true);
  view.setUint32(18, toZipUint32(size), true);
  view.setUint32(22, toZipUint32(size), true);
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, extraField.length, true);
  header.set(nameBytes, 30);
  header.set(extraField, 30 + nameBytes.length);

  return header;
}

function buildCentralDirectoryHeader({ nameBytes, crc, size, dos, localOffset }) {
  const zip64Values = {};

  if (size > ZIP_UINT32_MAX) {
    zip64Values.uncompressedSize = size;
    zip64Values.compressedSize = size;
  }

  if (localOffset > ZIP_UINT32_MAX) {
    zip64Values.localHeaderOffset = localOffset;
  }

  const extraField = buildZip64ExtraField(zip64Values);
  const needsZip64 = extraField.length > 0;
  const version = needsZip64 ? 45 : 20;
  const header = new Uint8Array(46 + nameBytes.length + extraField.length);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, version, true);
  view.setUint16(6, version, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, dos.time, true);
  view.setUint16(14, dos.date, true);
  view.setUint32(16, crc >>> 0, true);
  view.setUint32(20, toZipUint32(size), true);
  view.setUint32(24, toZipUint32(size), true);
  view.setUint16(28, nameBytes.length, true);
  view.setUint16(30, extraField.length, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, toZipUint32(localOffset), true);
  header.set(nameBytes, 46);
  header.set(extraField, 46 + nameBytes.length);

  return header;
}

function buildZip64ExtraField({ uncompressedSize, compressedSize, localHeaderOffset } = {}) {
  const values = [];

  if (typeof uncompressedSize === "bigint") {
    values.push(uncompressedSize);
  }

  if (typeof compressedSize === "bigint") {
    values.push(compressedSize);
  }

  if (typeof localHeaderOffset === "bigint") {
    values.push(localHeaderOffset);
  }

  if (!values.length) {
    return new Uint8Array(0);
  }

  const dataSize = values.length * 8;
  const field = new Uint8Array(4 + dataSize);
  const view = new DataView(field.buffer);

  view.setUint16(0, 0x0001, true);
  view.setUint16(2, dataSize, true);

  values.forEach((value, index) => {
    setBigUint64LE(view, 4 + index * 8, value);
  });

  return field;
}

function buildZipEndRecords({ fileCount, centralSize, centralOffset }) {
  const needsZip64 =
    fileCount > ZIP_UINT16_MAX || centralSize > ZIP_UINT32_MAX || centralOffset > ZIP_UINT32_MAX;

  if (!needsZip64) {
    return [buildClassicEndOfCentralDirectory({ fileCount, centralSize, centralOffset })];
  }

  const zip64EndOffset = centralOffset + centralSize;
  const zip64End = new Uint8Array(56);
  const zip64EndView = new DataView(zip64End.buffer);

  zip64EndView.setUint32(0, 0x06064b50, true);
  setBigUint64LE(zip64EndView, 4, 44n);
  zip64EndView.setUint16(12, 45, true);
  zip64EndView.setUint16(14, 45, true);
  zip64EndView.setUint32(16, 0, true);
  zip64EndView.setUint32(20, 0, true);
  setBigUint64LE(zip64EndView, 24, fileCount);
  setBigUint64LE(zip64EndView, 32, fileCount);
  setBigUint64LE(zip64EndView, 40, centralSize);
  setBigUint64LE(zip64EndView, 48, centralOffset);

  const locator = new Uint8Array(20);
  const locatorView = new DataView(locator.buffer);

  locatorView.setUint32(0, 0x07064b50, true);
  locatorView.setUint32(4, 0, true);
  setBigUint64LE(locatorView, 8, zip64EndOffset);
  locatorView.setUint32(16, 1, true);

  return [
    zip64End,
    locator,
    buildClassicEndOfCentralDirectory({
      fileCount,
      centralSize,
      centralOffset,
      forceZip64Placeholders: true,
    }),
  ];
}

function buildClassicEndOfCentralDirectory({
  fileCount,
  centralSize,
  centralOffset,
  forceZip64Placeholders = false,
}) {
  const end = new Uint8Array(22);
  const view = new DataView(end.buffer);

  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, forceZip64Placeholders ? 0xffff : toZipUint16(fileCount), true);
  view.setUint16(10, forceZip64Placeholders ? 0xffff : toZipUint16(fileCount), true);
  view.setUint32(12, forceZip64Placeholders ? 0xffffffff : toZipUint32(centralSize), true);
  view.setUint32(16, forceZip64Placeholders ? 0xffffffff : toZipUint32(centralOffset), true);
  view.setUint16(20, 0, true);

  return end;
}

function toZipUint16(value) {
  return value > ZIP_UINT16_MAX ? 0xffff : Number(value);
}

function toZipUint32(value) {
  return value > ZIP_UINT32_MAX ? 0xffffffff : Number(value);
}

function setBigUint64LE(view, offset, value) {
  let remaining = BigInt(value);

  for (let index = 0; index < 8; index += 1) {
    view.setUint8(offset + index, Number(remaining & 0xffn));
    remaining >>= 8n;
  }
}

function isAbortError(error) {
  return error instanceof DOMException && error.name === "AbortError";
}

function getDosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  return {
    time: (hours << 11) | (minutes << 5) | seconds,
    date: ((year - 1980) << 9) | (month << 5) | day,
  };
}

const CRC_TABLE = new Uint32Array(256).map((_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return crc >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
