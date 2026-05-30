# 🚀 Media Skills - 自媒体自动化写作与运营工具集

这是一个面向技术自媒体的自动化工具集，旨在通过 AI 串联选题、写作、配图、发布及运营数据分析的全流程。

## 🛠️ 1. Skill 概览

本项目包含以下核心 Skill：

*   📝 **article-writer**: 自媒体文章写作。支持从热点选题、列提纲到全文撰写。
*   🎨 **article-illustrator**: 文章自动配图。解析文章占位符并自动生成封面及插图。
*   🖼️ **baoyu-image-gen**: 多平台 AI 图片生成（源自 [宝玉/baoyu-skills](https://github.com/JimLiu/baoyu-skills/tree/main/skills/baoyu-image-gen)）。支持 OpenAI, Google, OpenRouter, DashScope, 即梦, 豆包等。
*   📤 **baoyu-post-to-wechat**: 微信公众号发布（修改自 [宝玉/baoyu-skills](https://github.com/JimLiu/baoyu-skills/tree/main/skills/baoyu-post-to-wechat)）。将文章及图片自动发送至公众号草稿箱（已优化为仅使用官方 API，无需 Playwright/浏览器）。
*   💻 **csdn-publish-and-data**: CSDN 运营。支持文章发布草稿及 7 日动态数据抓取。
*   🔥 **juejin-publish-and-data**: 掘金运营。支持发布草稿及创作者中心数据抓取。
*   📊 **get-wechat-data**: 微信公众号数据。抓取内容分析、用户分析等运营指标。
*   📻 **news-skill**: 每日科技资讯。从 RSS 源聚合热点，辅助选题。

## 📂 2. 安装与使用

首先克隆本项目到本地：
```bash
git clone https://github.com/LDJ-creat/media-skills.git
```

### 💡 方式 1：通过工作流使用 (推荐)
项目中预配置了两套自动化工作流（存放在 `.agents/workflows` 和 `.claude/commend`），你可以直接调用：

1.  **`write-and-publish` (选题->写作->配图->发布)**:
    *   **作用**：一键式闭环。从 `news-skill` 获取热点推荐选题(或自行指定选题)，经 `article-writer` 写作，由 `article-illustrator` 自动配图，最后同步发布到微信、CSDN、掘金草稿箱。
2.  **`analyze-operation` (抓取->分析->反馈)**:
    *   **作用**：运营闭环。自动抓取各大平台的阅读、粉丝等数据，生成汇总报告，并根据表现优劣自动提炼经验，更新到 `./guidance/` 目录下的写作指南中。

### 🔄 方式 2：同步到全局技能使用
如果你希望在不同的项目或 AI 编辑器（如 Claude Code, Gemini CLI, Antigravity, Copilot）中随时调用这些 Skill，可以运行同步脚本：
*   **Windows (PowerShell)**: 运行 `.\sync-skills.ps1`
*   **macOS/Linux (Bash)**: 运行 `./sync-skills.sh`
脚本会自动将当前项目的 Skill 同步到你电脑对应的编辑器配置目录中。

## ⚙️ 3. 详细配置指南

### 🔑 API 及环境变量配置 (.env)

部分 Skill 需要配置 API 密钥才能工作。请在对应目录下根据 `.env.example` 文件新建 `.env` 文件。

*   **baoyu-post-to-wechat (微信发布)**:
    *   配置 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET`。
    *   **⚠️ 注意**：需在微信公众号后台配置“IP 白名单”。若未配置，脚本运行时会给出提示。
*   **baoyu-image-gen (图片生成)**:
    *   支持多个平台，你需要创建 `.env` 并根据你选择的模型提供商在其中填写对应的 API Key：
        *   `OPENAI_API_KEY`: OpenAI (DALL-E)
        *   `GOOGLE_API_KEY`: Google (Gemini/Imagen)
        *   `DASHSCOPE_API_KEY`: 阿里云通义万象
        *   `OPENROUTER_API_KEY`: OpenRouter
        *   `REPLICATE_API_TOKEN`: Replicate
        *   `JIMENG_ACCESS_KEY_ID / SECRET`: 字节即梦
        *   `ARK_API_KEY`: 字节豆包

### 👤 登录凭证获取 (Playwright)

对于 CSDN、掘金和微信数据抓取类 Skill，由于需要浏览器登录态，请按以下步骤操作：

1.  进入对应 Skill 目录（如 `csdn-publish-and-data`）。
2.  在终端运行获取凭证的脚本：`npx tsx scripts/export-storage-state.ts`。
3.  在浏览器自动开启后，完成登录并进入创作者中心页面。
4.  回到控制台关闭脚本，登录凭证（`storageState.json`）将自动保存，后续即可免登录运行。

### 🌐 RSS 资讯源配置

*   **news-skill**:
    *   你可以按自己的喜好在 `news-skill/references/sources.md` 中增减 RSS 链接。
    *   **🌟 推荐资源**：参考 [Awesome RSSHub Routes](https://github.com/JackyST0/awesome-rsshub-routes) 获取更多优质资讯源。

---
*注：本项目仅供学习与自媒体运营效率提升使用，请遵守各平台相关使用规范。*
