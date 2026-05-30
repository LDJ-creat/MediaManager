---
description: 调用 news-skill 抓取 RSS、筛选评分并生成每日科技资讯 Markdown 日报
---

本工作流用于生成「每日科技资讯」日报，调用 `./news-skill/SKILL.md` 完成 RSS 抓取、筛选评分、中文摘要与去重落盘。

## 执行要求

1. **必须先读取** `./news-skill/SKILL.md`，严格按其中 Step 1–4 执行。
2. 所有 Python 脚本在 `news-skill` 目录下运行。
3. **必须跑完全流程**：生成日报后还要写入 `data/selected_urls.json` 并执行 `mark_seen.py`。
4. 若用户仅要求预览抓取，可只执行 `python scripts/fetch_rss.py --preview`，并说明未生成日报。

### 第一步：抓取 RSS 文章 (Fetch)

在 `news-skill` 目录执行 `python scripts/fetch_rss.py`，结果保存到 `data/latest_articles.json`。配置来自 `references/sources.json`；可用 `--hours` 调整时间窗口。

### 第二步：筛选、评分与摘要 (Analyze)

读取 `data/latest_articles.json`，按 `SKILL.md` 四维标准打分，应用动态阈值，完成分类与中文摘要。细节参考 `./news-skill/references/prompts.md`。

### 第三步：生成 Markdown 日报 (Render)

写入 `./news-skill/data/digests/YYYY-MM-DD.md`，包含 💎 今日精选（Top 3）与各板块内容，空板块跳过。

### 第四步：记录去重 (Dedup)

将纳入日报的 URL 写入 `data/selected_urls.json`，执行 `python scripts/mark_seen.py` 更新 `data/seen_urls.json`。

生成完成后向用户汇报：通过条数、阈值、日报路径及今日精选标题。
