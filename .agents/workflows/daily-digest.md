---
description: 调用 news-skill 抓取 RSS、筛选评分并生成每日科技资讯 Markdown 日报
---

本工作流专门用于生成「每日科技资讯」日报，串联 `./news-skill/SKILL.md` 中的完整四步流程：抓取 → LLM 分析 → 写入日报 → 去重落盘。

## 执行要求

1. **必须先读取** `./news-skill/SKILL.md`，严格按其中 Step 1–4 执行，不得跳过或简化。
2. 所有 Python 脚本在 `news-skill` 目录下运行（`cd news-skill` 或使用等价路径）。
3. **必须跑完全流程**：生成 `data/digests/YYYY-MM-DD.md` 后，还要写入 `data/selected_urls.json` 并执行 `mark_seen.py`；否则跨天去重会失效。
4. 若用户仅要求「预览抓取结果」或「检查 RSS 源是否正常」，可只执行 Step 1 的 `--preview` 模式，并在回复中说明未生成日报、未更新去重记录。
5. 筛选标准以 `SKILL.md` 为准；需要细节时可参考 `./news-skill/references/prompts.md`。

## 可选参数

| 用户意图 | 命令 |
|---------|------|
| 默认（48h 窗口） | `python scripts/fetch_rss.py` |
| 自定义时间窗口 | `python scripts/fetch_rss.py --hours 24` |
| 仅预览条目数 | `python scripts/fetch_rss.py --preview` |
| 调试跳过跨天去重 | `python scripts/fetch_rss.py --skip-dedup` |

---

### 第一步：抓取 RSS 文章 (Fetch)

在 `news-skill` 目录执行：

```bash
python scripts/fetch_rss.py
```

- 输出 JSON 到 stdout，同时保存到 `data/latest_articles.json`
- 自动应用 `references/sources.json` 中的时间窗口、同源上限、全局上限
- 自动过滤已在 `data/seen_urls.json` 中出现过的 URL

若抓取失败或条目为 0，向用户说明可能原因（RSS 源不可用、时间窗口过窄、已全部去重），并询问是否调整 `--hours` 或使用 `--preview` 排查。

### 第二步：LLM 筛选、评分与摘要 (Analyze)

读取 Step 1 产出的文章列表（优先 `data/latest_articles.json`），在上下文中完成：

1. **粗筛打分**：按相关性 / 新颖性 / 深度 / 信源四维度加权（1.0–5.0）
2. **动态阈值**：基准 3.0，按通过条目数调整（见 `SKILL.md`）
3. **分类**：`AI前沿` / `开发与工程` / `大厂动态` / `产品与行业`
4. **中文摘要**：2–3 句、60–100 字；英文标题译成中文

强制排除广告、推广、与技术无关的消费品评测 / 娱乐 / 政治等内容。

### 第三步：生成 Markdown 日报 (Render)

将筛选结果写入：

```
./news-skill/data/digests/YYYY-MM-DD.md
```

- 日期使用当天 `YYYY-MM-DD`（除非用户指定其他日期）
- 格式遵循 `SKILL.md` Step 3：今日精选（Top 3）+ 各板块分类，空板块跳过
- 板块图标与名称与 `references/sources.json` 中 `categories` 一致

生成后向用户简要汇报：通过条数、使用阈值、日报文件路径，以及 💎 今日精选标题列表。

### 第四步：记录去重 (Dedup)

1. 将本次纳入日报的所有文章 URL 写入 `data/selected_urls.json`（JSON 数组格式）
2. 执行：

```bash
python scripts/mark_seen.py
```

确认 `seen_urls.json` 已更新；可用 `python scripts/mark_seen.py --status` 查看摘要。

---

## 产物清单

| 产物 | 路径 |
|------|------|
| 原始抓取结果 | `news-skill/data/latest_articles.json` |
| 每日日报 | `news-skill/data/digests/YYYY-MM-DD.md` |
| 本次选中 URL | `news-skill/data/selected_urls.json` |
| 跨天去重记录 | `news-skill/data/seen_urls.json` |
