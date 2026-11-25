const profileProviders = { deepseek: "DeepSeek", openai: "OpenAI 兼容接口", google: "Google 翻译" };
const profileKeyFields = { deepseek: "deepseekApiKey", openai: "openaiApiKey", google: "googleApiKey" };
const defaultDeepSeekModel = "deepseek-flash";
const legacyProfileFields = ["provider", ...Object.values(profileKeyFields), "openaiBaseUrl", "openaiModel", "googleTarget"];

function readApiProfiles(settings) {
  if (Array.isArray(settings.apiProfiles)) {
    return { profiles: settings.apiProfiles, activeId: settings.activeApiProfileId };
  }
  const profiles = Object.entries(profileKeyFields)
    .filter(([, field]) => settings[field]?.trim())
    .map(([provider, field]) => ({
      id: `legacy-${provider}`,
      name: profileProviders[provider],
      provider,
      apiKey: settings[field],
      baseUrl: settings.openaiBaseUrl,
      model: provider === "deepseek" ? defaultDeepSeekModel : settings.openaiModel || "gpt-4o-mini",
      target: settings.googleTarget
    }));
  const activeId = profiles.find(profile => profile.provider === settings.provider)?.id ?? profiles[0]?.id;
  return { profiles, activeId };
}
