importScripts("api-profiles.js");

const DEFAULTS = {
  enabled: true,
  focusMode: false,
  provider: "deepseek",
  targetLanguage: "简体中文",
  deepseekApiKey: "",
  openaiApiKey: "",
  openaiBaseUrl: "https://api.openai.com/v1",
  openaiModel: "gpt-4o-mini",
  googleApiKey: "",
  googleTarget: "zh-CN",
  customPrompt: "你是一名严谨的学术翻译助手。请结合上下文准确翻译选中文本，保留术语、公式和引用。只输出译文；如果是单词或短语，可补充一行极简释义。"
};

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(Object.keys(DEFAULTS));
  const missing = {};
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (current[key] === undefined) missing[key] = value;
  }
  if (Object.keys(missing).length) await chrome.storage.local.set(missing);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "TRANSLATE") {
    translate(message.text, message.context || "", message.profileId)
      .then(result => sendResponse({ ok: true, result }))
      .catch(error => sendResponse({ ok: false, error: cleanError(error) }));
    return true;
  }
  if (message?.type === "LIST_TRANSLATION_PROFILES") {
    listTranslationProfiles()
      .then(data => sendResponse({ ok: true, ...data }))
      .catch(error => sendResponse({ ok: false, error: cleanError(error) }));
    return true;
  }
  if (message?.type === "SAVE_TERM") {
    saveTerm(message.entry, sender)
      .then(entry => sendResponse({ ok: true, entry }))
      .catch(error => sendResponse({ ok: false, error: cleanError(error) }));
    return true;
  }
  return false;
});

async function saveTerm(entry, sender) {
  if (!entry?.source?.trim() || !entry?.translation?.trim()) throw new Error("词条内容不完整。");
  const { vocabulary = [] } = await chrome.storage.local.get("vocabulary");
  const item = {
    id: crypto.randomUUID(),
    source: entry.source.trim().slice(0, 500),
    translation: entry.translation.trim().slice(0, 3000),
    context: (entry.context || "").trim().slice(0, 2000),
    title: (entry.title || sender.tab?.title || "").trim().slice(0, 300),
    url: entry.url || sender.tab?.url || "",
    createdAt: new Date().toISOString()
  };
  const duplicateIndex = vocabulary.findIndex(old =>
    old.source.toLocaleLowerCase() === item.source.toLocaleLowerCase() && old.url === item.url && old.title === item.title
  );
  if (duplicateIndex >= 0) vocabulary.splice(duplicateIndex, 1);
  vocabulary.unshift(item);
  await chrome.storage.local.set({ vocabulary: vocabulary.slice(0, 5000) });
  return item;
}

async function listTranslationProfiles() {
  const settings = await chrome.storage.local.get(["apiProfiles", "activeApiProfileId", ...legacyProfileFields]);
  const { profiles, activeId } = readApiProfiles(settings);
  return {
    activeId,
    profiles: profiles.map(({ id, name, provider, model }) => ({
      id,
      name,
      model: provider === "deepseek" ? model || defaultDeepSeekModel : model,
      provider
    }))
  };
}

async function translate(text, context, profileId) {
  const settings = { ...DEFAULTS, ...(await chrome.storage.local.get(null)) };
  if (!settings.enabled) throw new Error("MarginGloss 已暂停，请在扩展弹窗中开启。");
  if (!text?.trim()) throw new Error("没有可翻译的文本。");
  if (text.length > 6000) throw new Error("选中文本过长，请缩短到 6000 字符以内。");

  const { profiles, activeId } = readApiProfiles(settings);
  const profile = profiles.find(item => item.id === (profileId ?? activeId));
  if (!profile && profileId) throw new Error("这组 API 配置已不可用，请重新划词后选择其他配置。");
  if (!profile) throw new Error("请在翻译设置中添加 API 配置，然后选择要使用的配置。");
  if (profile.provider === "google") return translateWithGoogle(text, profile);
  return translateWithLLM(text, context, settings, profile);
}

async function translateWithLLM(text, context, settings, profile) {
  const isDeepSeek = profile.provider === "deepseek";
  const apiKey = profile.apiKey;
  const baseUrl = isDeepSeek ? "https://api.deepseek.com" : profile.baseUrl || DEFAULTS.openaiBaseUrl;
  const model = isDeepSeek ? profile.model || defaultDeepSeekModel : profile.model;
  if (!apiKey) throw new Error(`请先在设置中填写 ${isDeepSeek ? "DeepSeek" : "LLM"} API Key。`);
  if (!baseUrl || !model) throw new Error("请检查接口地址和模型名称。");

  const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const userContent = [
    `目标语言：${settings.targetLanguage}`,
    context ? `上下文（仅用于消歧）：${context}` : "",
    `待翻译文本：\n${text}`
  ].filter(Boolean).join("\n\n");

  const thinkingEnabled = isDeepSeek && profile.thinking === "enabled";
  const generationOptions = thinkingEnabled
    ? { thinking: { type: "enabled" }, reasoning_effort: profile.reasoningEffort || "high" }
    : { temperature: 0.2 };
  if (isDeepSeek && !thinkingEnabled) generationOptions.thinking = { type: "disabled" };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      ...generationOptions,
      messages: [
        { role: "system", content: settings.customPrompt },
        { role: "user", content: userContent }
      ]
    })
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data?.error?.message || `接口请求失败（${response.status}）`);
  const result = data?.choices?.[0]?.message?.content?.trim();
  if (!result) throw new Error("接口返回了空结果。");
  return result;
}

async function translateWithGoogle(text, profile) {
  if (!profile.apiKey) throw new Error("请先在设置中填写 Google Cloud Translation API Key。");
  const endpoint = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(profile.apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, target: profile.target || DEFAULTS.googleTarget, format: "text" })
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data?.error?.message || `Google 翻译请求失败（${response.status}）`);
  const translated = data?.data?.translations?.[0]?.translatedText;
  if (!translated) throw new Error("Google 翻译返回了空结果。");
  return decodeHtml(translated);
}

async function readJson(response) {
  try { return await response.json(); }
  catch { throw new Error(`接口没有返回有效 JSON（${response.status}）`); }
}

function decodeHtml(value) {
  return value
    .replaceAll("&quot;", '"').replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}

function cleanError(error) {
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return "无法连接翻译接口。请检查接口地址、网络或 API 服务的跨域配置。";
  }
  return error?.message || "翻译失败，请稍后重试。";
}
