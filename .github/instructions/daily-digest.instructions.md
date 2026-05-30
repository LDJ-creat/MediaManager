---
description: 调用 media news 抓取 RSS、筛选评分并生成每日科技资讯 Markdown 日报
---

执行前先 `media workspace show`。本工作流对应 `media-manager` skill 的 daily-digest workflow。

优先使用 `media news fetch` 与 `media news mark-seen`。数据目录：`$WORKSPACE/.media-manager/data/news/`。
