# 研读｜Chrome 论文阅读插件

**用自己的模型和 System Prompt 读论文。** 在 Chrome 里打开本地 PDF，划词看译文，顺手把生词和原句留给自己复习。

[下载最新版](https://github.com/Felicia2Wang/yandu/releases/latest) · [安装步骤](#安装) · [English](README.en.md)

- **模型和翻译规则自己定。** 保存多组 API 配置，按需切换 DeepSeek 或 OpenAI 兼容模型，再写自己的 System Prompt。例如「保留模型名、公式和引用，遇到缩写时补一句释义」。也支持 Google Cloud Translation。
- **本地 PDF 打开就能划词。** 从扩展里选 Chrome 已打开的 PDF，或手动打开文件。PDF 和普通网页都可以在原文旁看译文。
- **生词连同语境一起存。** 收藏原词、译文、上下文和来源，回头可以搜索或导出 CSV。
- **专注模式按页记住。** 弱化鼠标附近阅读带以外的内容。每篇论文、每个网页各自记住开关。

## 安装

1. 从 [GitHub Releases](https://github.com/Felicia2Wang/yandu/releases/latest) 下载并解压扩展 ZIP。
2. 打开 `chrome://extensions/`，开启「开发者模式」，点「加载已解压的扩展程序」，选择包含 `manifest.json` 的文件夹。
3. 点扩展弹窗里的「模型与提示词」，填好 API 配置和 System Prompt。读本地论文时点「本地 PDF 阅读」，选中文字后点「译」。

自动识别 Chrome 已打开的本地 PDF 需要在扩展详情开启「允许访问文件网址」。在内置阅读器里手动选择文件无需开启该权限。当前支持带文字层的 PDF，扫描件需先做 OCR。

## 数据与隐私

PDF 在浏览器本地解析，API Key、设置和收藏也存在浏览器里。翻译请求直达你选择的服务商。大模型请求包含选中文字、System Prompt 和可获取的附近上下文。

## 开发、反馈与引用

项目使用 Manifest V3 和原生 JavaScript，可直接加载源码。修改后重载扩展，再刷新网页或重新打开 PDF 阅读器。反馈问题时请注明 Chrome 和扩展版本、问题发生在网页还是 PDF 阅读器，请勿附上 API Key 或私有文档。

引用信息见 [CITATION.cff](CITATION.cff)。项目源码采用 [MIT License](LICENSE)，内置 Mozilla PDF.js 采用 [Apache License 2.0](vendor/LICENSE)。
