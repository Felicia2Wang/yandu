(() => {
  if (window.__paperLingoPageFocusLoaded) return;
  window.__paperLingoPageFocusLoaded = true;
  // Overlay nodes from an older, reloaded extension can outlive its script.
  document.querySelectorAll(":root > .pl-root.pl-focus-mask").forEach(node => node.remove());

  const state = { bubble: null, card: null, selection: "", context: "", anchor: null, requestId: 0, focus: null };

  document.addEventListener("mouseup", onSelection, true);
  document.addEventListener("keyup", event => {
    if (event.key === "Escape") closeAll();
    else if (event.key.startsWith("Arrow") || event.key === "Shift") onSelection(event);
  }, true);
  document.addEventListener("mousedown", event => {
    if (!event.target.closest?.(".pl-root")) closeAll();
  }, true);
  window.addEventListener("scroll", () => removeBubble(), true);
  const isReader = location.protocol === "chrome-extension:" && location.pathname === "/pdf-viewer.html";
  let focusKey;
  const focusControl = isReader ? document.getElementById("pdfFocus") : null;
  async function refreshFocus(recheck = false) {
    const url = new URL(location.href);
    if (!/^#!?\//.test(url.hash)) url.hash = "";
    const documentId = document.documentElement.dataset.pdfFingerprint;
    const key = isReader ? (documentId && `focus:pdf:${documentId}`) : `focus:web:${url.href}`;
    const changed = key !== focusKey;
    if (!changed && !recheck) return;
    focusKey = key;
    if (changed) applyFocus(false);
    if (focusControl) focusControl.disabled = !key;
    if (!key) return;
    const stored = await chrome.storage.local.get(key);
    if (key === focusKey) applyFocus(Boolean(stored[key]));
  }
  function applyFocus(value) {
    setFocusMode(value);
    if (focusControl) focusControl.setAttribute("aria-pressed", String(value));
  }
  refreshFocus();
  window.addEventListener("pageshow", () => refreshFocus(true));
  window.addEventListener("hashchange", () => refreshFocus());
  window.navigation?.addEventListener("currententrychange", () => refreshFocus());
  document.addEventListener("paperlingo-pdf-changed", () => refreshFocus());
  document.addEventListener("paperlingo-pdf-zoom", closeAll);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && focusKey && changes[focusKey]) applyFocus(Boolean(changes[focusKey].newValue));
  });
  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message.type !== "GET_PAGE_FOCUS" && message.type !== "SET_PAGE_FOCUS") return;
    (async () => {
      await refreshFocus();
      const key = focusKey;
      if (!key) return { available: false };
      if (message.type === "SET_PAGE_FOCUS") await updateFocus(key, message.enabled);
      const data = await chrome.storage.local.get(key);
      return { available: true, enabled: Boolean(data[key]) };
    })().then(reply, () => reply({ available: false }));
    return true;
  });
  focusControl?.addEventListener("click", () => {
    if (focusKey) updateFocus(focusKey, !state.focus);
  });
  function updateFocus(key, enabled) {
    return enabled ? chrome.storage.local.set({ [key]: true }) : chrome.storage.local.remove(key);
  }

  async function onSelection(event) {
    if (event.target?.closest?.(".pl-root")) return;
    await delay(10);
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text || selection.isCollapsed || text.length > 6000) {
      removeBubble();
      return;
    }
    const { enabled = true } = await chrome.storage.local.get("enabled");
    if (!enabled) return;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) return;
    state.selection = text;
    state.context = getContext(text);
    state.anchor = rect;
    showBubble(rect);
  }

  function showBubble(rect) {
    removeBubble();
    const button = document.createElement("button");
    button.className = "pl-root pl-bubble";
    button.type = "button";
    button.title = "翻译选中文本";
    button.textContent = "译";
    document.documentElement.appendChild(button);
    state.bubble = button;
    position(button, rect.left + rect.width / 2 - 18, rect.bottom + 8, 42, 42);
    button.addEventListener("mousedown", e => e.stopPropagation());
    button.addEventListener("click", event => {
      if (event.isTrusted) requestTranslation();
    });
  }

  async function requestTranslation() {
    const text = state.selection;
    const anchor = state.anchor;
    if (!text || !anchor) return;
    removeBubble();
    const context = state.context;
    const card = createCard(text, context, anchor);
    const picker = card.querySelector(".pl-profile");
    try {
      const response = await chrome.runtime.sendMessage({ type: "LIST_TRANSLATION_PROFILES" });
      if (card !== state.card) return;
      if (!response?.ok) throw new Error(response?.error || "无法读取 API 配置。");
      for (const profile of response.profiles) {
        const model = profile.provider === "google" ? "Google 翻译" : profile.model;
        const label = model ? `${profile.name} · ${model}` : profile.name;
        const option = new Option(label, profile.id);
        picker.append(option);
      }
      if (response.profiles.length) picker.disabled = false;
      picker.addEventListener("change", event => {
        if (event.isTrusted && picker.value) {
          picker.options[0].disabled = true;
          translateCard(card, text, context, picker.value);
        }
      });
      if (response.profiles.some(profile => profile.id === response.activeId)) {
        picker.value = response.activeId;
        picker.options[0].disabled = true;
        await translateCard(card, text, context, response.activeId);
        return;
      }
      showCardError(card, response.profiles.length
        ? "请选择用于这次翻译的 API 配置。"
        : "请从扩展弹窗打开「翻译设置」，添加 API 配置。");
    } catch (error) {
      if (card === state.card) showCardError(card, error.message);
    }
  }

  async function translateCard(card, text, context, profileId) {
    const output = card.querySelector(".pl-output");
    const copy = card.querySelector(".pl-copy");
    const save = card.querySelector(".pl-save");
    const requestId = ++state.requestId;
    copy.hidden = true;
    save.hidden = true;
    copy.textContent = "复制译文";
    save.textContent = "收藏词库";
    save.disabled = false;
    output.classList.remove("pl-error");
    output.classList.add("pl-loading");
    output.replaceChildren(...Array.from({ length: 3 }, () => document.createElement("span")));
    try {
      const response = await chrome.runtime.sendMessage({
        type: "TRANSLATE",
        text,
        context,
        profileId
      });
      if (requestId !== state.requestId) return;
      output.classList.remove("pl-loading");
      if (!response?.ok) throw new Error(response?.error || "翻译失败");
      output.textContent = response.result;
      copy.hidden = false;
      save.hidden = false;
    } catch (error) {
      if (requestId === state.requestId) showCardError(card, error.message);
    }
  }

  function showCardError(card, message) {
    const output = card.querySelector(".pl-output");
    output.classList.remove("pl-loading");
    output.classList.add("pl-error");
    output.textContent = message || "翻译失败，请重试。";
  }

  function createCard(source, context, anchor) {
    closeCard();
    const card = document.createElement("section");
    card.className = "pl-root pl-card";
    card.innerHTML = `
      <header><span class="pl-brand"><i>MG</i> MarginGloss</span><button class="pl-close" title="关闭">×</button></header>
      <div class="pl-source"></div>
      <div class="pl-divider"></div>
      <div class="pl-output pl-loading"><span></span><span></span><span></span></div>
      <footer>
        <button class="pl-save" hidden>收藏词库</button>
        <button class="pl-copy" hidden>复制译文</button>
        <select class="pl-profile" aria-label="选择本次翻译的 API 配置" disabled><option value="">选择翻译配置</option></select>
      </footer>`;
    card.querySelector(".pl-source").textContent = source;
    document.documentElement.appendChild(card);
    state.card = card;
    const x = Math.min(anchor.left, window.innerWidth - 380);
    const y = anchor.bottom + 10;
    position(card, x, y, 360, 240);
    card.addEventListener("mousedown", e => e.stopPropagation());
    card.querySelector(".pl-close").onclick = closeAll;
    card.querySelector(".pl-save").onclick = async event => {
      const button = event.currentTarget;
      const requestId = state.requestId;
      button.disabled = true;
      const response = await chrome.runtime.sendMessage({
        type: "SAVE_TERM",
        entry: {
          source,
          translation: card.querySelector(".pl-output").textContent,
          context,
          title: document.title,
          url: location.pathname.endsWith("/pdf-viewer.html") ? "" : location.href
        }
      });
      if (requestId !== state.requestId) return;
      button.textContent = response?.ok ? "已收藏" : "收藏失败";
      if (!response?.ok) button.disabled = false;
    };
    card.querySelector(".pl-copy").onclick = async event => {
      const button = event.currentTarget;
      const requestId = state.requestId;
      await navigator.clipboard.writeText(card.querySelector(".pl-output").textContent);
      if (requestId !== state.requestId) return;
      button.textContent = "已复制";
      setTimeout(() => {
        if (requestId === state.requestId) button.textContent = "复制译文";
      }, 1200);
    };
    return card;
  }

  function getContext(selected) {
    const selection = window.getSelection();
    const node = selection?.anchorNode?.parentElement;
    const block = node?.closest?.("p, li, blockquote, td, div");
    const text = block?.innerText?.trim() || "";
    if (!text || text === selected) return "";
    const index = text.indexOf(selected);
    if (index < 0) return text.slice(0, 1200);
    const left = text.slice(0, index);
    const right = text.slice(index + selected.length);
    const leftBoundary = Math.max(left.lastIndexOf("。"), left.lastIndexOf("！"), left.lastIndexOf("？"), left.lastIndexOf("."), left.lastIndexOf("!"), left.lastIndexOf("?"), left.lastIndexOf("\n"));
    const candidates = ["。", "！", "？", ".", "!", "?", "\n"].map(mark => right.indexOf(mark)).filter(value => value >= 0);
    const rightBoundary = candidates.length ? Math.min(...candidates) + 1 : Math.min(right.length, 600);
    return `${left.slice(leftBoundary + 1)}${selected}${right.slice(0, rightBoundary)}`.trim().slice(0, 1200);
  }

  function setFocusMode(enabled) {
    if (!enabled) {
      state.focus?.top.remove();
      state.focus?.bottom.remove();
      if (state.focus?.move) document.removeEventListener("mousemove", state.focus.move, true);
      state.focus = null;
      return;
    }
    if (state.focus) return;
    const top = document.createElement("div");
    const bottom = document.createElement("div");
    top.className = "pl-root pl-focus-mask pl-focus-top";
    bottom.className = "pl-root pl-focus-mask pl-focus-bottom";
    document.documentElement.append(top, bottom);
    let frame = 0;
    const move = event => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (event.target?.closest?.(".pl-card,.pl-bubble")) return;
        const target = event.target instanceof Element ? event.target : document.body;
        const pdfText = target.closest(".textLayer span");
        const parsed = pdfText?.getBoundingClientRect().height || parseFloat(getComputedStyle(target).lineHeight);
        const lineHeight = Number.isFinite(parsed) ? Math.max(12, Math.min(parsed, 64)) : 22;
        const halfBand = lineHeight * 1.65;
        top.style.height = `${Math.max(0, event.clientY - halfBand)}px`;
        bottom.style.top = `${Math.min(innerHeight, event.clientY + halfBand)}px`;
      });
    };
    document.addEventListener("mousemove", move, true);
    state.focus = { top, bottom, move };
  }

  function position(element, x, y, width, estimatedHeight) {
    const margin = 12;
    let left = Math.max(margin, Math.min(x, window.innerWidth - width - margin));
    let top = y;
    if (top + estimatedHeight > window.innerHeight) top = Math.max(margin, state.anchor.top - estimatedHeight - 8);
    element.style.left = `${left}px`;
    element.style.top = `${Math.max(margin, top)}px`;
  }

  function removeBubble() { state.bubble?.remove(); state.bubble = null; }
  function closeCard() { state.card?.remove(); state.card = null; state.requestId++; }
  function closeAll() { removeBubble(); closeCard(); }
  function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
})();
