# MarginGloss

**Read papers without leaving the page.** Translate a term or passage in a web article or local PDF, then save it with the original context for review.

[简体中文](README.zh-CN.md) · [Install](#install) · [Privacy](#privacy)

When you look up an unfamiliar term in a separate tab, you lose your place. When you save only the translation, you lose the sentence that made the term meaningful. MarginGloss puts lookup, reading, and vocabulary review in one Chrome extension.

## What you can do

| Reading problem | How MarginGloss helps |
| --- | --- |
| A technical term has several possible meanings | Select a word, phrase, or passage. The translation appears next to the selection. LLM providers can use nearby text to resolve ambiguity. |
| Your paper is a local PDF | Open it from the extension popup. MarginGloss can detect local PDF tabs already open in Chrome, or you can pick a file. Pinch or use the toolbar to zoom around your reading position. |
| Dense pages make it easy to lose your line | Enable Focus Mode to dim the area outside the current reading band. Each page or PDF remembers its own setting. |
| A saved definition is hard to remember in isolation | Save the selection and translation with its context, source title or URL, and date. Search your wordbook or export it as CSV. |
| You want control over which model sees the text | Save multiple DeepSeek, OpenAI-compatible, or Google Cloud Translation profiles. Choose a default in the popup or switch providers for a single translation in the result card. |

## Install

1. On GitHub, choose **Code → Download ZIP** and extract the archive.
2. Open `chrome://extensions/`, enable **Developer mode**, then choose **Load unpacked**. Select the extracted folder containing `manifest.json`.
3. Open the MarginGloss popup and choose **Translation settings (翻译设置)**. Create an API profile and save it. Current interface labels are in Simplified Chinese.
4. Select text on a webpage and click **译**. For a local PDF, choose **本地 PDF 阅读** in the popup.

To detect existing local PDF tabs, enable **Allow access to file URLs** in the extension details. The reader’s manual file picker works without that permission.

## Privacy

- PDF files are parsed on your device. Translation sends the selected text to the configured provider. LLM calls also include nearby context when available.
- API keys, settings, and vocabulary are stored in Chrome’s local extension storage. Requests go directly to the selected provider. There is no MarginGloss backend.
- The current release handles selectable text. Scanned PDFs without a text layer require OCR before lookup. Chrome’s built-in PDF viewer requires opening the document in the MarginGloss reader. Whole-page translation is outside the current feature set.

## Development

The extension uses Manifest V3 and plain JavaScript. Load the repository directly with **Load unpacked**. After editing, reload the extension in `chrome://extensions/`, then reload the target page or reopen the PDF reader.

If you report a bug, include the Chrome version, the extension version, and whether it occurs on a webpage or in the PDF reader. Keep API keys and private documents out of reports.

## Citation and license

Citation metadata is in [CITATION.cff](CITATION.cff). MarginGloss source code is available under the [MIT License](LICENSE). The bundled Mozilla PDF.js files are distributed separately under [Apache License 2.0](vendor/LICENSE).
