const byId = id => document.getElementById(id);
const picker = byId("editProfile");
const defaults = {
  targetLanguage: "简体中文",
  customPrompt: "你是一名严谨的学术翻译助手。请结合上下文准确翻译选中文本，保留术语、公式和引用。只输出译文；如果是单词或短语，可补充一行极简释义。"
};
let profiles = [];

async function loadProfiles() {
  const settings = await chrome.storage.local.get(["apiProfiles", "activeApiProfileId", ...legacyProfileFields]);
  return readApiProfiles(settings);
}

async function init() {
  const settings = await chrome.storage.local.get(defaults);
  for (const id of Object.keys(defaults)) byId(id).value = settings[id];
  const { activeId } = await loadProfiles();
  await refreshPicker(activeId);
}

async function refreshPicker(id) {
  ({ profiles } = await loadProfiles());
  picker.replaceChildren(new Option("＋ 新建配置", ""), ...profiles.map(item => new Option(item.name, item.id)));
  picker.value = profiles.some(item => item.id === id) ? id : "";
  edit();
}

function edit() {
  const profile = profiles.find(item => item.id === picker.value);
  byId("profileName").value = profile?.name || "";
  byId("provider").value = profile?.provider || "deepseek";
  for (const [provider, field] of Object.entries(profileKeyFields)) {
    byId(field).value = profile?.provider === provider ? profile.apiKey : "";
  }
  byId("openaiBaseUrl").value = profile?.baseUrl || "https://api.openai.com/v1";
  byId("openaiModel").value = (profile?.provider === "openai" && profile.model) || "gpt-4o-mini";
  byId("deepseekModel").value = (profile?.provider === "deepseek" && profile.model) || defaultDeepSeekModel;
  byId("deepseekThinking").value = profile?.thinking === "enabled" ? "enabled" : "disabled";
  byId("deepseekEffort").value = profile?.reasoningEffort || "high";
  byId("googleTarget").value = profile?.target || "zh-CN";
  byId("removeProfile").hidden = !profile;
  showProvider();
}

function showProvider() {
  for (const provider of Object.keys(profileProviders)) {
    byId(`${provider}Fields`).hidden = byId("provider").value !== provider;
  }
  byId("deepseekEffortField").hidden = byId("deepseekThinking").value !== "enabled";
}

picker.addEventListener("change", edit);
byId("provider").addEventListener("change", showProvider);
byId("deepseekThinking").addEventListener("change", showProvider);
byId("form").addEventListener("submit", async event => {
  event.preventDefault();
  const value = id => byId(id).value.trim();
  const provider = value("provider");
  const apiKey = value(profileKeyFields[provider]);
  const name = value("profileName");
  const prefs = Object.fromEntries(Object.keys(defaults).map(id => [id, value(id) || defaults[id]]));
  try {
    if (!picker.value && !apiKey && !name) {
      await chrome.storage.local.set(prefs);
      status("翻译偏好已保存");
      return;
    }
    if (!apiKey) throw new Error("请填写 API Key");
    const profile = { id: picker.value || crypto.randomUUID(), name: name || profileProviders[provider], provider, apiKey };
    if (provider === "deepseek") {
      profile.model = value("deepseekModel");
      if (!profile.model) throw new Error("请填写 DeepSeek 模型 ID");
      profile.thinking = value("deepseekThinking");
      profile.reasoningEffort = value("deepseekEffort");
    }
    if (provider === "openai") {
      const url = new URL(value("openaiBaseUrl"));
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
        throw new Error("请填写有效的 HTTP 或 HTTPS Base URL");
      }
      profile.baseUrl = url.href;
      profile.model = value("openaiModel");
      if (!profile.model) throw new Error("请填写模型名称");
    }
    if (provider === "google") profile.target = value("googleTarget") || "zh-CN";
    const { profiles: latest, activeId } = await loadProfiles();
    const index = latest.findIndex(item => item.id === profile.id);
    if (index < 0) latest.push(profile);
    else latest[index] = profile;
    await chrome.storage.local.set({ ...prefs, apiProfiles: latest, activeApiProfileId: activeId || profile.id });
    await refreshPicker(profile.id);
    status("配置已保存。可在扩展弹窗切换。");
  } catch (error) {
    status(error.message);
  }
});

byId("removeProfile").addEventListener("click", async () => {
  const id = picker.value;
  if (!id || !confirm("删除这组 API 配置？")) return;
  const { profiles: latest, activeId } = await loadProfiles();
  const remaining = latest.filter(item => item.id !== id);
  const next = activeId === id ? "" : activeId;
  await chrome.storage.local.set({ apiProfiles: remaining, activeApiProfileId: next });
  await refreshPicker(next);
  status("配置已删除");
});

function status(message) {
  byId("saved").textContent = message;
  byId("saved").classList.add("show");
}

init();
