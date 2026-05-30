---
description: 调用 news-skill 抓取 RSS、筛选评分并生成每日科技资讯 Markdown 日报
---

本工作流用于生成「每日科技资讯」日报，调用 `./news-skill/SKILL.md` 完成 RSS 抓取、筛选评分、中文摘要与去重落盘。

### 第一步：抓取 RSS 文章 (Fetch)

在 `news-skill` 目录执行 `python scripts/fetch_rss.py`，获取近 48 小时文章并保存到 `data/latest_articles.json`。若用户指定时间窗口，使用 `--hours`；若仅检查源是否正常，使用 `--preview`。

### 第二步：筛选、评分与摘要 (Analyze)

读取抓取结果，按 `SKILL.md` 中的四维标准打分，应用动态阈值，完成分类与中文摘要。筛选细节可参考 `./news-skill/references/prompts.md`。

### 第三步：生成 Markdown 日报 (Render)

将结果写入 `./news-skill/data/digests/YYYY-MM-DD.md`，包含 💎 今日精选与各板块内容。

### 第四步：记录去重 (Dedup)

将纳入日报的文章 URL 写入 `data/selected_urls.json`，然后执行 `python scripts/mark_seen.py` 更新去重记录。
