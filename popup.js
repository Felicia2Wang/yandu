const profileSelect = document.getElementById("activeProfile");
const focusToggle = document.getElementById("focusMode");
const focusHelp = document.getElementById("focusHelp");
let focusTab;

init();
initFocus();
async function init() {
  const settings = await chrome.storage.local.get(["enabled", "apiProfiles", "activeApiProfileId", ...legacyProfileFields, "vocabulary"]);
  enabled.checked = settings.enabled !== false;
  wordCount.textContent = settings.vocabulary?.length || 0;
  const { profiles, activeId } = readApiProfiles(settings);
  profileSelect.replaceChildren(...profiles.map(item => new Option(item.name, item.id)));
  const active = profiles.find(item => item.id === activeId);
  if (!active) profileSelect.prepend(new Option("请选择 API 配置", ""));
  profileSelect.value = active?.id || "";
  profileSelect.disabled = !profiles.length;
  providerName.textContent = active ? profileProviders[active.provider] : "翻译服务";
  keyStatus.textContent = active ? "已配置" : "尚未选择 API 配置";
  if (active?.provider === "deepseek") {
    const mode = active.thinking === "enabled" ? "开启" : "关闭";
    keyStatus.textContent = `${active.model || defaultDeepSeekModel} · 思考${mode}`;
  }
  statusDot.classList.toggle("ready", Boolean(active));
}
profileSelect.addEventListener("change", async () => {
  const data = await chrome.storage.local.get(["apiProfiles", ...legacyProfileFields]);
  const update = { activeApiProfileId: profileSelect.value };
  if (!Array.isArray(data.apiProfiles)) update.apiProfiles = readApiProfiles(data).profiles;
  await chrome.storage.local.set(update);
  await init();
});
enabled.addEventListener("change", () => chrome.storage.local.set({ enabled: enabled.checked }));
focusToggle.addEventListener("change", async () => {
  focusToggle.disabled = true;
  await readFocus({ type: "SET_PAGE_FOCUS", enabled: focusToggle.checked });
});
async function initFocus() {
  try {
    [focusTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await readFocus({ type: "GET_PAGE_FOCUS" });
  } catch {
    focusHelp.textContent = "无法读取当前标签页，请重新打开弹窗。";
  }
}

async function readFocus(message) {
  let result;
  let unavailable = "当前页面无法使用专注模式。";
  try {
    if (Number.isInteger(focusTab?.id)) result = await sendFocusMessage(focusTab, message);
    if (focusTab?.url?.startsWith(chrome.runtime.getURL("pdf-viewer.html"))) {
      unavailable = "请先在阅读器中打开一份 PDF。";
    }
  } catch (error) {
    unavailable = /^https?:\/\//i.test(focusTab?.url || "")
      ? "无法连接此网页。请检查 MarginGloss 的网站访问权限，或刷新后重试。"
      : "请在普通网页或 MarginGloss PDF 阅读器中开启。";
    if (/extensions gallery|chrome web store/i.test(error.message)) {
      unavailable = "Chrome 网上应用店限制扩展访问。";
    }
  }
  focusToggle.checked = Boolean(result?.enabled);
  focusToggle.disabled = !result?.available;
  focusHelp.textContent = result?.available
    ? "鼠标附近约三行保持清晰"
    : unavailable;
}

async function sendFocusMessage(tab, message) {
  try {
    const response = await chrome.tabs.sendMessage(tab.id, message, { frameId: 0 });
    if (response) return response;
  } catch (error) {
    if (!/^https?:\/\//i.test(tab.url || "")) throw error;
  }
  if (!/^https?:\/\//i.test(tab.url || "")) return;

  // Tabs already open during an extension reload may lack the current content script.
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"]
  });
  const documentId = injection?.documentId;
  const target = documentId ? { tabId: tab.id, documentIds: [documentId] } : { tabId: tab.id };
  await chrome.scripting.insertCSS({ target, files: ["content.css"] });
  return chrome.tabs.sendMessage(tab.id, message, documentId ? { documentId } : { frameId: 0 });
}
settings.addEventListener("click", () => chrome.runtime.openOptionsPage());
wordbook.addEventListener("click", () => chrome.tabs.create({ url: chrome.runtime.getURL("wordbook.html") }));
const pdfButton = document.getElementById("openPdf");
const pdfChoices = document.getElementById("pdfChoices");
const pdfStatus = document.getElementById("pdfStatus");
const pdfList = document.getElementById("pdfList");
const fileAccess = document.getElementById("fileAccess");

pdfButton.addEventListener("click", findOpenPdf);
document.getElementById("chooseFile").addEventListener("click", () => openReader());
fileAccess.addEventListener("click", () => {
  chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
});

async function findOpenPdf() {
  pdfButton.disabled = true;
  pdfList.replaceChildren();
  fileAccess.hidden = true;
  showPdfStatus("正在查找已打开的本地 PDF…");

  try {
    if (!(await chrome.extension.isAllowedFileSchemeAccess())) {
      showPdfStatus("开启「允许访问文件网址」后，即可识别 Chrome 已打开的本地 PDF。");
      fileAccess.hidden = false;
      return;
    }

    const [tabs, [currentTab]] = await Promise.all([
      chrome.tabs.query({ url: "file:///*", windowType: "normal" }),
      chrome.tabs.query({ active: true, currentWindow: true })
    ]);
    const pdfTabs = tabs.filter(tab => localPdfUrl(tab.url));
    const currentPdf = currentTab && localPdfUrl(currentTab.url);
    if (currentPdf) {
      await openReader(currentPdf);
      return;
    }

    const files = new Map();
    for (const tab of pdfTabs) {
      const url = localPdfUrl(tab.url);
      files.set(url.href, url);
    }
    if (files.size === 1) {
      await openReader(files.values().next().value);
      return;
    }
    if (files.size === 0) {
      showPdfStatus("Chrome 中没有打开的本地 PDF。");
      return;
    }

    showPdfStatus("选择 Chrome 中已打开的本地 PDF");
    for (const url of files.values()) {
      const file = document.createElement("button");
      const name = readablePath(url.pathname);
      file.className = "pdf-file";
      file.textContent = name.split("/").pop();
      file.title = name;
      const directory = document.createElement("small");
      directory.textContent = name.slice(0, name.lastIndexOf("/") + 1);
      file.append(directory);
      file.addEventListener("click", () => openReader(url));
      pdfList.append(file);
    }
  } catch {
    showPdfStatus("无法读取 Chrome 标签页。请手动选择 PDF 文件。");
  } finally {
    pdfButton.disabled = false;
  }
}

function localPdfUrl(value) {
  if (!value?.startsWith("file://")) return null;
  const url = new URL(value);
  if (!readablePath(url.pathname).toLowerCase().endsWith(".pdf")) return null;
  url.hash = "";
  url.search = "";
  return url;
}

function readablePath(path) {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function showPdfStatus(message) {
  pdfChoices.hidden = false;
  pdfButton.setAttribute("aria-expanded", "true");
  pdfStatus.textContent = message;
}

async function openReader(file) {
  const url = new URL(chrome.runtime.getURL("pdf-viewer.html"));
  if (file) url.searchParams.set("file", file.href);
  try {
    await chrome.tabs.create({ url: url.href });
  } catch {
    showPdfStatus("无法打开 PDF 阅读器，请重试。");
  }
}
