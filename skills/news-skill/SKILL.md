---
name: news-skill
description: 每日科技资讯聚合工具，从多个优质RSS源（Anthropic、OpenAI、GitHub Blog、V2EX、宝玉、Karpathy、极客公园等）获取近48小时的技术内容，由你（LLM）直接完成筛选、评分、翻译和摘要，最终生成中文Markdown日报。当用户需要获取每日科技资讯、生成技术日报、查看今日AI/编程/开源/产品动态时使用。触发词：每日资讯、今日科技、技术日报、生成日报。
---

> **编排入口**：多 skill 组合流程请使用 [`media-manager`](../media-manager/SKILL.md) 总控 skill 与 `media` CLI。本 skill 为 deep-dive。

# 每日科技资讯 Skill

**架构说明**：此 Skill 只负责数据 I/O（抓取文章 + 持久化去重记录）。**你（LLM）是唯一的分析引擎**，负责评分、筛选、分类、翻译和摘要。

**运行环境**：Node.js >= 18。首次使用前在 `scripts/` 目录执行 `npm install`。

---

## 工作流

### Step 1：获取文章列表

```bash
media news fetch
# 预览模式（不写文件）：
media news fetch --preview
```

- 数据目录：`$WORKSPACE/.media-manager/data/news/`
- 输出 JSON 到 stdout，同时保存到 `latest_articles.json`

### Step 2：你（LLM）完成分析

读取 Step 1 输出的文章列表，在你的上下文中完成：

**2a. 粗筛打分**（对每篇文章按以下4维度打 1.0-5.0 分，加权综合）：

| 维度 | 权重 | 说明 |
|------|------|------|
| 相关性 | 35% | 必须与 AI/编程/开源/软件工程/产品设计 相关，无关→1分 |
| 新颖性 | 30% | 首发/新发布/新观点优先；复述旧闻扣分 |
| 深度 | 25% | 有技术细节/数据/案例→高分；泛泛而谈→低分 |
| 信源 | 10% | Anthropic/OpenAI/GitHub 一手博客额外 +0.3 |

**强制排除**（不纳入日报）：
- 含广告/推广/优惠/福利/抽奖/扫码关键词
- 纯消费品评测、娱乐八卦、政治新闻与技术无关的内容

**2b. 动态阈值**：基准分 3.0，若通过条目 > 30 则提升至 4.0，>20 则 3.5，< 5 则降至 2.5，< 3 则 2.0

**2c. 分类**（按文章实际内容判断，source_hint 仅供参考）：
- `AI前沿`：大模型/Agent/AI研究/具身智能
- `开发与工程`：编程/开源项目/工程架构/开发工具
- `大厂动态`：大公司技术博客/内部实践/平台更新
- `产品与行业`：新产品发布/科技公司动向/行业趋势

**2d. 中文摘要**（仅对通过筛选的文章）：
- 2-3句话，60-100字
- 英文标题翻译为中文
- 聚焦：是什么、有何意义、对开发者/产品人的影响
- 不用"本文"、"文章指出"等引用式开头

### Step 3：生成 Markdown 日报

按以下格式写入 `data/digests/YYYY-MM-DD.md`：

```markdown
# 📰 每日科技资讯 · YYYY-MM-DD

> 📊 筛选通过 {N} 条 ｜ 阈值 {X} 分

---

## 💎 今日精选

（综合评分最高的3篇，附编号）

### 1. {中文标题}
**来源**：{source} ｜ **评分**：{score}
{中文摘要}
🔗 [阅读原文]({url})

---

## 🤖 AI 前沿

### {中文标题}
**来源**：{source} ｜ **评分**：{score}
{中文摘要}
🔗 [阅读原文]({url})

## 🛠️ 开发与工程
（……以此类推，空板块跳过）
```

### Step 4：记录去重

将本次纳入日报的文章 URL 写入 `data/selected_urls.json`，然后运行：

```bash
media news mark-seen
media news mark-seen --status
```

这会将 `data/selected_urls.json` 中的 URL 追加到 `data/seen_urls.json`，并自动清理 7 天前的记录。

---

## 快速参考

```bash
# 环境检查
media doctor

# 仅抓取预览（不分析，检查源是否正常）
media news fetch --preview

# 指定时间窗口（小时）
media news fetch --hours 24
```

## 配置文件

- **RSS 源 & 参数（CLI 用户）**：`$WORKSPACE/.media-manager/news/sources.json`
  - 运行 `media news sources edit` 打开；**首次运行会从默认源复制**，再编辑即可
  - `media news fetch` 优先读取该文件；不存在时使用内置默认 `references/sources.json`
- **RSS 源 & 参数（源码开发）**：`references/sources.json`（直接编辑 JSON，无需改代码）
- **评分标准参考**：`references/prompts.md`（记录筛选标准的详细说明，供参考）

### sources.json 结构

```json
{
  "version": 1,
  "sources": [
    {
      "name": "源名称",
      "url": "https://example.com/feed.xml",
      "source_hint": "AI前沿",
      "weight": 1.0
    }
  ],
  "params": {
    "TOP_PICKS_COUNT": 3,
    "MAX_PER_SOURCE": 5,
    "GLOBAL_MAX": 40,
    "TIME_WINDOW_HOURS": 48,
    "DEDUP_RETENTION_DAYS": 7,
    "BASE_THRESHOLD": 3.0
  },
  "categories": [
    { "id": "AI前沿", "display_name": "AI 前沿", "icon": "🤖" }
  ]
}
```

新增 RSS 源：在 `sources` 数组末尾追加对象；`source_hint` 取值须与 `categories[].id` 一致。
