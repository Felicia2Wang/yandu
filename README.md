# 浏览器论文阅读插件

**在 Chrome 里读网页论文和本地 PDF，遇到术语就划词翻译，想复习就连同原句一起收藏。**

[下载最新版](https://github.com/Felicia2Wang/browser-paper-reader/releases/latest) · [安装步骤](#安装) · [English](README.en.md)

## 能做什么

| 功能 | 使用场景 |
| --- | --- |
| **网页与 PDF 划词翻译** | 选中文字后点「译」，在原文旁看译文。使用大模型时，可结合附近的上下文理解术语。 |
| **本地 PDF 阅读** | 从扩展弹窗打开 Chrome 中已打开的本地 PDF，也可以手动选文件。阅读器支持双指和按钮缩放。 |
| **专注模式** | 阅读双栏或密排论文时，弱化鼠标附近阅读带以外的内容。每个网页和 PDF 单独记住开关。 |
| **API 与模型配置** | 可保存多组 DeepSeek、OpenAI 兼容接口或 Google Cloud Translation 配置。弹窗里选默认配置，翻译卡片里可以为这一条临时切换。DeepSeek 支持配置模型和思考模式。 |
| **个人知识库 · 生词与术语** | 收藏原词、译文、上下文、来源和时间。之后可以搜索、删除或导出 CSV。 |

## 安装

1. 从 [GitHub Releases](https://github.com/Felicia2Wang/browser-paper-reader/releases/latest) 下载并解压扩展 ZIP。
2. 打开 `chrome://extensions/`，开启「开发者模式」，点「加载已解压的扩展程序」，选择包含 `manifest.json` 的文件夹。
3. 点击扩展图标，在「翻译设置」里保存自己的 API 配置。在网页中选中文字后点「译」，读本地论文时点弹窗中的「本地 PDF 阅读」。

自动识别 Chrome 已打开的本地 PDF 需要在扩展详情开启「允许访问文件网址」。在内置阅读器里手动选择文件无需开启该权限。当前支持带文字层的 PDF，扫描件需先做 OCR。

## 数据与隐私

PDF 文件在浏览器本地解析。翻译时，选中文字会发给你选择的服务商。使用大模型时，如果能获取到附近的上下文，也会一同提交。API Key、设置和收藏存在 Chrome 扩展的本地存储中，项目没有中转服务器。

## 开发、反馈与引用

项目使用 Manifest V3 和原生 JavaScript，可直接加载源码。修改后重载扩展，再刷新网页或重新打开 PDF 阅读器。反馈问题时请注明 Chrome 和扩展版本、问题发生在网页还是 PDF 阅读器，请勿附上 API Key 或私有文档。

引用信息见 [CITATION.cff](CITATION.cff)。项目源码采用 [MIT License](LICENSE)，内置 Mozilla PDF.js 采用 [Apache License 2.0](vendor/LICENSE)。
