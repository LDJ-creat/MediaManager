---
description: 调用 media news 抓取 RSS、筛选评分并生成每日科技资讯 Markdown 日报
---

执行前先 `media workspace show`。本工作流对应 `media-manager` skill 的 [daily-digest](../../skills/media-manager/references/workflows/daily-digest.md)。

## 执行要求

1. 优先 `media news fetch`（非直接 npm scripts）
2. 数据目录：`$WORKSPACE/.media-manager/data/news/`
3. 完整流程须 `media news mark-seen`
4. Deep-dive 见 `news-skill` skill

## 命令

| 意图 | 命令 |
|------|------|
| 默认抓取 | `media news fetch` |
| 预览 | `media news fetch --preview` |
| 去重状态 | `media news mark-seen --status` |
| 记录去重 | `media news mark-seen` |

## 产物

| 产物 | 路径 |
|------|------|
| 抓取结果 | `.media-manager/data/news/latest_articles.json` |
| 日报 | `.media-manager/data/news/digests/YYYY-MM-DD.md` |
| 去重 | `.media-manager/data/news/seen_urls.json` |
