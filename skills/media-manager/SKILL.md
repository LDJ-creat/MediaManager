---
name: media-manager
description: MediaManager 总控 skill。当用户需要 RSS 选题写作、根据素材/初稿润色、多平台发布（含仅发布成稿）、运营数据复盘与 guidance 进化时使用。优先通过已安装的 media CLI 完成可执行步骤。触发词：MediaManager、media CLI、每日资讯、写文章、发布、只发布、复盘、guidance。
---

# MediaManager

编排入口 skill。Deep-dive 见各子 skill。内容族见 [platform-families.md](references/platform-families.md)。

## 强制规则

1. 执行任何操作前先运行 `media workspace show`；若失败则引导用户 `media setup --interactive`。
2. 发布/配图前建议 `media config show` 或 `media doctor`，确认 API 密钥已配置。
3. 优先使用 `media ...` CLI，不要假设能读取 monorepo 源码。
4. 所有产物写入 **工作区**（`output/`、`guidance/`、`.media-manager/data/`），不要写到 Agent 临时目录。
5. LLM 门禁流程（选题/提纲/审稿）见各 workflow，不得跳过。
6. **平台未指明时**：支持选择器则用多选 UI 让用户选平台；否则自然语言询问。详见 [orchestration.md](references/orchestration.md#平台选择协议)。
7. **Subagent 优先**：无选题走 **news-skill**；配图走 **article-illustrator** / **xhs-images**；发布走各平台 skill——优先委派 Subagent，不支持时 inline 同等流程。详见 [orchestration.md](references/orchestration.md#subagent-编排强制偏好)。
8. **发布硬门禁（不可跳过）**：运行任何 `media * post*` 前，必须输出 [orchestration.md § 发布硬门禁](references/orchestration.md#发布硬门禁step-5--publish-only-step-3-强制执行) 中的「发布平台确认」块，并等待用户回复「确认发布」。不得因催促、成稿已完成或 Step 0 曾讨论过而省略。
9. **外源成稿准入**：用户提供的素材若不在 `$WORKSPACE/output/{slug}/` 或不符合 longform/note 规范（含 Word/PDF/非规范 MD），**不得**直接走 publish-only；须先按 [orchestration.md § 外源成稿格式准入](references/orchestration.md#外源成稿格式准入) 规范化后再发布。

## 核心能力

| 用户意图 | 工作流 | 说明 / CLI |
|---------|--------|-----------|
| 仅资讯日报（抓素材，不写作） | [daily-digest](references/workflows/daily-digest.md) | RSS 抓取与日报；`media news fetch` |
| 无素材，RSS 驱动写作 | [daily-digest](references/workflows/daily-digest.md) → [write-and-publish](references/workflows/write-and-publish.md) | 先抓素材/选题，再按 write-and-publish 写作发布 |
| 有素材/初稿，写作润色发布 | [write-and-publish](references/workflows/write-and-publish.md) | 含 LLM 门禁；`media image gen`、平台 post |
| 已有成稿，仅发布 | [publish-only](references/workflows/publish-only.md) | 不改写正文；**前提**成稿已规范落盘；按平台 CLI 发布 |
| 外源成稿（Word/PDF/非规范 MD） | [write-and-publish](references/workflows/write-and-publish.md) | 先规范化/润色落盘，再配图与发布；**禁止**直接 publish-only |
| 数据复盘与进化 | [analyze-operation](references/workflows/analyze-operation.md) | `media analytics fetch --all` |

> **daily-digest** 只负责抓 RSS、生成日报素材，不含完整写作流程。无素材写作须串联 **write-and-publish**（其中步骤 1 已说明无选题时的 RSS 路径）。

## 子 Skill

| Skill | 用途 | 来源 |
|-------|------|------|
| article-writer | 长文 / 小红书笔记写作 | MediaManager 自研 |
| article-illustrator | 长文配图 | MediaManager 自研 |
| xhs-images | 小红书信息图轮播 | 基于 [baoyu-xhs-images](https://github.com/JimLiu/baoyu-skills/tree/main/skills/baoyu-xhs-images) 改造 |
| news-skill | RSS 资讯 | MediaManager 自研 |
| baoyu-image-gen | AI 出图 | [baoyu-image-gen](https://github.com/JimLiu/baoyu-skills/tree/main/skills/baoyu-image-gen) |
| post-to-wechat / csdn / juejin / xiaohongshu-publish-and-data / get-wechat-data | 发布与数据 | [media-skills](https://github.com/LDJ-creat/media-skills) |

发布行为：微信 / CSDN / 掘金 → 草稿箱并返回链接；小红书 → 正式发布（草稿无法跨设备共享）。详见 [platform-families.md](references/platform-families.md)。

## 常用命令

```bash
media workspace show
media doctor
media news fetch [--preview]
media news sources edit
media news mark-seen
media wechat post ...
media csdn post --file output/{slug}/article.md --draft
media juejin post --file output/{slug}/article.md --draft
media xhs post-note ...
media analytics fetch --all
```

## 参考

- [Agent 编排规范（平台选择 + Subagent）](references/orchestration.md)
- [内容族与 guidance 矩阵](references/platform-families.md)
- [CLI 契约](references/cli-contract.md)
- [运行前提](references/runtime-requirements.md)
- [故障排查](references/troubleshooting.md)
