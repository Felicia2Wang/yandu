import * as pdfjs from "./vendor/pdf.mjs";

pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("vendor/pdf.worker.mjs");
const CSS_UNITS = 96 / 72;
const viewer = document.getElementById("viewer");
const pages = document.getElementById("pages");
const welcome = document.getElementById("welcome");
const progress = document.getElementById("progress");
const initUrl = new URL(location.href).searchParams.get("file");
let scale = 1;
let records = [];
let loadingTask;
let generation = 0;
let redrawTimer;
const visible = new Set();
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const record = records[Number(entry.target.dataset.index)];
    if (record?.element !== entry.target) continue;
    if (entry.isIntersecting) {
      visible.add(record);
      paint(record);
    } else {
      visible.delete(record);
      record.renderTask?.cancel();
      record.renderTask = null;
      record.density = null;
      record.surface.querySelector("canvas")?.remove();
    }
  }
}, { root: viewer, rootMargin: "350px" });

document.querySelectorAll('input[type="file"]').forEach(input => {
  input.addEventListener("change", () => {
    const file = input.files[0];
    input.value = "";
    if (file) loadPdf(file.arrayBuffer(), file.name);
  });
});
document.getElementById("settingsButton").onclick = () => chrome.runtime.openOptionsPage();
document.getElementById("zoomIn").onclick = () => zoom(scale * 1.15);
document.getElementById("zoomOut").onclick = () => zoom(scale / 1.15);
document.getElementById("fitWidth").onclick = () => {
  if (records.length) zoom(fitScale(anchor()?.record ?? records[0]));
};
window.addEventListener("wheel", event => {
  if (!event.ctrlKey || !records.length) return;
  event.preventDefault();
  const delta = Math.max(-100, Math.min(100, event.deltaY));
  const rect = viewer.getBoundingClientRect();
  const y = Math.max(rect.top, Math.min(rect.bottom, event.clientY));
  zoom(scale * Math.exp(-delta * .008), event.clientX, y);
}, { passive: false });

if (initUrl?.startsWith("file://")) {
  const path = new URL(initUrl).pathname;
  const bytes = fetch(initUrl).then(response => {
    if (!response.ok) throw new Error(`读取失败（${response.status}）`);
    return response.arrayBuffer();
  });
  loadPdf(bytes, decodeURIComponent(path.split("/").pop() || "local.pdf"));
}

async function loadPdf(bytes, name) {
  const token = ++generation;
  observer.disconnect();
  visible.clear();
  for (const record of records) {
    record.renderTask?.cancel();
    record.textTask?.cancel();
  }
  records = [];
  pages.replaceChildren();
  clearTimeout(redrawTimer);
  loadingTask?.destroy().catch(() => {});
  delete document.documentElement.dataset.pdfFingerprint;
  document.dispatchEvent(new Event("paperlingo-pdf-changed"));
  document.dispatchEvent(new Event("paperlingo-pdf-zoom"));
  welcome.hidden = true;
  progress.hidden = false;
  try {
    const data = new Uint8Array(await bytes);
    if (token !== generation) return;
    loadingTask = pdfjs.getDocument({ data, isEvalSupported: false });
    const pdf = await loadingTask.promise;
    const next = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      if (token !== generation) return;
      const viewport = page.getViewport({ scale: CSS_UNITS });
      const element = document.createElement("article");
      const surface = document.createElement("div");
      const textLayer = document.createElement("div");
      element.className = "pdf-page";
      element.dataset.index = String(i - 1);
      surface.className = "pdf-surface";
      textLayer.className = "textLayer";
      surface.style.width = `${viewport.width}px`;
      surface.style.height = `${viewport.height}px`;
      surface.style.setProperty("--total-scale-factor", viewport.scale * page.userUnit);
      surface.append(textLayer);
      element.append(surface);
      next.push({ page, viewport, element, surface, textLayer });
    }
    records = next;
    scale = fitScale(records[0]);
    layout();
    pages.append(...records.map(record => record.element));
    viewer.scrollTo(0, 0);
    records.forEach(record => observer.observe(record.element));
    document.title = `${name} · 浏览器论文阅读插件`;
    document.documentElement.dataset.pdfFingerprint = pdf.fingerprints[0];
    document.dispatchEvent(new Event("paperlingo-pdf-changed"));
  } catch (error) {
    if (token !== generation) return;
    welcome.hidden = false;
    alert(`PDF 打开失败：${error.message}\n也可以通过阅读器里的文件选择器重新打开。`);
  } finally {
    if (token === generation) progress.hidden = true;
  }
}

function fitScale(record) {
  return Math.min(1.75, Math.max(.35, (viewer.clientWidth - 40) / record.viewport.width));
}

function layout() {
  for (const { element, surface, viewport } of records) {
    element.style.width = `${viewport.width * scale}px`;
    element.style.height = `${viewport.height * scale}px`;
    surface.style.transform = `scale(${scale})`;
  }
  document.getElementById("zoomLabel").value = `${Math.round(scale * 100)}%`;
}

function anchor(x = viewer.clientWidth / 2, y = viewer.getBoundingClientRect().top + viewer.clientHeight / 2) {
  const record = records.find(({ element }) => element.getBoundingClientRect().bottom >= y) ?? records.at(-1);
  if (!record) return null;
  const rect = record.element.getBoundingClientRect();
  return { record, x, y, pageX: (x - rect.left) / scale, pageY: (y - rect.top) / scale };
}

function zoom(value, x, y) {
  const point = anchor(x, y);
  const next = Math.max(.35, Math.min(4, value));
  if (!point || next === scale) return;
  scale = next;
  document.getSelection()?.removeAllRanges();
  document.dispatchEvent(new Event("paperlingo-pdf-zoom"));
  layout();
  const rect = point.record.element.getBoundingClientRect();
  viewer.scrollBy(rect.left + point.pageX * scale - point.x, rect.top + point.pageY * scale - point.y);
  clearTimeout(redrawTimer);
  redrawTimer = setTimeout(() => visible.forEach(paint), 160);
}

async function paint(record) {
  const density = Math.min(4, Math.max(1, Math.ceil(devicePixelRatio * scale)));
  if (record.density === density) return;
  record.density = density;
  record.renderTask?.cancel();
  const { page, viewport, surface, textLayer } = record;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width * density);
  canvas.height = Math.ceil(viewport.height * density);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  const task = page.render({
    canvasContext: canvas.getContext("2d"),
    viewport,
    transform: [density, 0, 0, density, 0, 0]
  });
  record.renderTask = task;
  try {
    await task.promise;
    if (record.renderTask !== task || !surface.isConnected) return;
    surface.querySelector("canvas")?.remove();
    surface.prepend(canvas);
    if (!record.textTask) {
      record.textTask = new pdfjs.TextLayer({ textContentSource: page.streamTextContent(), container: textLayer, viewport });
      await record.textTask.render();
    }
  } catch (error) {
    if (error.name !== "RenderingCancelledException" && surface.isConnected) console.error(error);
  }
}
