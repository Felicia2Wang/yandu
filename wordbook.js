let entries = [];
const listElement = document.getElementById("list");
const emptyElement = document.getElementById("empty");
const template = document.getElementById("entryTemplate");
const searchInput = document.getElementById("search");
const summaryElement = document.getElementById("summary");

init();
async function init() {
  ({ vocabulary: entries = [] } = await chrome.storage.local.get("vocabulary"));
  render();
}
searchInput.addEventListener("input", render);
document.getElementById("settingsButton").addEventListener("click", () => chrome.runtime.openOptionsPage());
document.getElementById("exportCsv").addEventListener("click", exportVocabulary);

function render() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const filtered = entries.filter(entry => !query || [entry.source, entry.translation, entry.context, entry.title, entry.url].some(value => value?.toLocaleLowerCase().includes(query)));
  listElement.replaceChildren();
  summaryElement.textContent = query ? `${filtered.length} / ${entries.length} 个词条` : `${entries.length} 个词条`;
  emptyElement.hidden = filtered.length > 0;
  filtered.forEach(entry => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".source").textContent = entry.source;
    node.querySelector(".translation").textContent = entry.translation;
    node.querySelector(".context").textContent = entry.context || "";
    node.querySelector("time").textContent = formatDate(entry.createdAt);
    const link = node.querySelector(".source-link");
    link.textContent = entry.title || entry.url || "本地 PDF";
    if (entry.url && !entry.url.startsWith("blob:")) link.href = entry.url;
    else link.removeAttribute("href");
    node.querySelector(".delete").addEventListener("click", () => deleteEntry(entry.id));
    listElement.appendChild(node);
  });
}

async function deleteEntry(id) {
  entries = entries.filter(entry => entry.id !== id);
  await chrome.storage.local.set({ vocabulary: entries });
  render();
}

function exportVocabulary() {
  if (!entries.length) return;
  const rows = [["原词", "翻译", "上下文", "页面标题", "网址", "收藏时间"], ...entries.map(entry => [entry.source, entry.translation, entry.context, entry.title, entry.url, entry.createdAt])];
  const csv = "\ufeff" + rows.map(row => row.map(value => `"${String(value || "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `margingloss-vocabulary-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function formatDate(value) {
  try { return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
  catch { return value || ""; }
}
