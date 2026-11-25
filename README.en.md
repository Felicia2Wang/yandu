# Yandu

**Use your own model and system prompt to read research papers.** Translate selections in local PDFs or web articles and save unfamiliar terms with their original context.

[Download](https://github.com/Felicia2Wang/yandu/releases/latest) · [简体中文](README.md)

- **Bring your own model and system prompt.** Save multiple API profiles and choose how LLMs handle terms, abbreviations, or citations. Supports DeepSeek, OpenAI-compatible APIs, and Google Cloud Translation.
- **Translate selections in local PDFs or webpages.** Open a PDF already in Chrome or pick a local file. Read the translation next to the selection.
- **Build your own vocabulary.** Save terms with translations, original context, and sources. Search or export to CSV.
- **Focus per page.** Dim the area outside the reading band. Each webpage or PDF remembers its setting.

## Install

Download and extract the ZIP from the [latest release](https://github.com/Felicia2Wang/yandu/releases/latest). Go to `chrome://extensions/`, enable **Developer mode**, and select the folder containing `manifest.json` using **Load unpacked**. Open **模型与提示词** in the extension popup to set an API profile and system prompt. The interface is in Simplified Chinese.

Choose **本地 PDF 阅读** from the popup to read local PDFs. Enable **Allow access to file URLs** in the extension details if you want to detect local PDF tabs automatically. The manual file picker works without this permission. Scanned PDFs require a text layer from OCR.

## Privacy and license

PDF files are parsed on your device. The configured translation provider receives the selected text and, for LLM profiles, nearby context when available. API keys, preferences, and vocabulary are stored in Chrome's local extension storage.

See [CITATION.cff](CITATION.cff) for citation metadata. The extension source uses the [MIT License](LICENSE). Bundled PDF.js uses [Apache License 2.0](vendor/LICENSE).
