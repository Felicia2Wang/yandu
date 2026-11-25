# Browser Paper Reader

Translate selected text in research articles and local PDFs, dim distractions with Focus Mode, and save unfamiliar terms with their context.

[Download](https://github.com/Felicia2Wang/browser-paper-reader/releases/latest) · [简体中文](README.md)

- **Selection translation.** Look up a word or passage while keeping your place. LLM providers can use nearby text to resolve ambiguity.
- **Local PDF reader.** Open an existing local PDF tab or choose a file. Zoom with the trackpad or toolbar.
- **Per-page Focus Mode.** Dim the area outside a reading band. Each webpage or PDF remembers its own setting.
- **API and model profiles.** Save multiple DeepSeek, OpenAI-compatible, or Google Cloud Translation profiles. Pick a default in the popup or change the profile for a single translation in the result card.
- **Personal knowledge base for vocabulary.** Save terms and phrases with their translation, context, source, and date. Search, delete, or export entries to CSV.

## Install

Download and extract the ZIP from the [latest release](https://github.com/Felicia2Wang/browser-paper-reader/releases/latest). Go to `chrome://extensions/`, enable **Developer mode**, and select the folder containing `manifest.json` using **Load unpacked**. Open **翻译设置** in the extension popup to add an API profile. The interface is in Simplified Chinese.

Choose **本地 PDF 阅读** from the popup to read local PDFs. Enable **Allow access to file URLs** in the extension details if you want to detect local PDF tabs automatically. The manual file picker works without this permission. Scanned PDFs require a text layer from OCR.

## Privacy and license

PDF files are parsed on your device. The configured translation provider receives the selected text and, for LLM profiles, nearby context when available. API keys, preferences, and vocabulary are stored in Chrome's local extension storage.

See [CITATION.cff](CITATION.cff) for citation metadata. The extension source uses the [MIT License](LICENSE). Bundled PDF.js uses [Apache License 2.0](vendor/LICENSE).
