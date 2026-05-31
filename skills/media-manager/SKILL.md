---
name: media-manager
description: MediaManager 总控 skill。当用户需要 RSS 选题写作、根据素材/初稿润色、多平台发布（含仅发布成稿）、运营数据复盘与 guidance 进化时使用。优先通过已安装的 media CLI 完成可执行步骤。触发词：MediaManager、media CLI、每日资讯、写文章、发布、只发布、复盘、guidance。
---

# MediaManager

编排入口 skill。Deep-dive 见各子 skill（`article-writer`、`news-skill`、平台 skill 等）。

## 强制规则

1. 执行任何操作前先运行 `media workspace show`；若失败则引导用户 `media setup --interactive`。
2. 优先使用 `media ...` CLI，不要假设能读取 monorepo 源码。
3. 所有产物写入 **工作区**（`output/`、`guidance/`、`.media-manager/data/`），不要写到 Agent 临时目录。
4. LLM 门禁流程（选题/提纲/审稿）见各 workflow，不得跳过。

## 核心能力

| 用户意图 | 工作流 | 说明 / CLI |
|---------|--------|-----------|
| 仅资讯日报（抓素材，不写作） | [daily-digest](references/workflows/daily-digest.md) | RSS 抓取与日报；`media news fetch` |
| 无素材，RSS 驱动写作 | [daily-digest](references/workflows/daily-digest.md) → [write-and-publish](references/workflows/write-and-publish.md) | 先抓素材/选题，再按 write-and-publish 写作发布 |
| 有素材/初稿，写作润色发布 | [write-and-publish](references/workflows/write-and-publish.md) | 含 LLM 门禁；`media image gen`、平台 post |
| 已有成稿，仅发布 | [publish-only](references/workflows/publish-only.md) | 不改写正文；按平台 CLI 发布 |
| 数据复盘与进化 | [analyze-operation](references/workflows/analyze-operation.md) | `media analytics fetch --all` |

> **daily-digest** 只负责抓 RSS、生成日报素材，不含完整写作流程。无素材写作须串联 **write-and-publish**（其中步骤 1 已说明无选题时的 RSS 路径）。

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

- [CLI 契约](references/cli-contract.md)
- [运行前提](references/runtime-requirements.md)
- [故障排查](references/troubleshooting.md)
