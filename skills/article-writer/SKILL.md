---
name: article-writer
description: 技术自媒体写作工作流。支持 longform（微信/CSDN/掘金共用 article.md）与 xhs（小红书 note.md）。无选题时委派 news-skill。经提纲审批后写作，输出 article.md 或 note.md。触发词：写文章、写一篇、帮我写、创作文章、生成文章。
---

> **编排入口**：多 skill 组合流程请使用 [`media-manager`](../media-manager/SKILL.md) 总控 skill 与 `media` CLI。本 skill 为 deep-dive。

# Article Writer

技术自媒体写作。内容族与 guidance 规则见 [`media-manager/references/platform-families.md`](../media-manager/references/platform-families.md)。

## 输出物

| 内容族 | 文件 | 后续 skill |
|--------|------|------------|
| `longform` | `output/{slug}/article.md` | article-illustrator |
| `xhs` | `output/{slug}/note.md` | xhs-images |
| `full-stack` | 两者 | 各走各的配图 skill |

## CLI 协作

```bash
media workspace show
media news fetch
media news mark-seen
```

## 强制门禁

1. 每次只推进一个阶段；未完成当前阶段审批不得进入下一阶段。
2. 没有用户明确确认，不得把候选选题、提纲、初稿视为已批准。
3. 每个阶段只输出该阶段产物。
4. 缺少用户确认时停止并说明需要什么确认。

## Guidance 加载规则

在 Step 1 / Step 3 前，根据**目标内容族**加载（由 write-and-publish Step 0 或用户指定）：

```
始终：guidance/topic-selection/general.md 或 guidance/writing/general.md

含 wechat / csdn / juejin（longform）：
  + guidance/topic-selection/longform.md
  + guidance/writing/longform.md

含 xiaohongshu（xhs）：
  + guidance/topic-selection/platform/xiaohongshu.md
  + guidance/writing/platform/xiaohongshu.md
```

**写作期禁止加载** `guidance/publishing/platform/*`（发布期才加载）。

**禁止**为 wechat/csdn/juejin 分别加载 `platform/wechat|csdn|juejin.md` 写作指南（三平台共用 longform）。

## longform：配图占位符

```markdown
<!-- img: cover | 封面图描述 -->
<!-- img: img-01 | 正文配图描述 -->
```

## xhs：note.md 格式

```yaml
---
title: "标题最多20字"
tags:
  - 标签1
images: []
---

🔥 前三行钩子...

短正文（非 Markdown 长文）...
```

信息图由 `xhs-images` 生成并回写 `images:`。

## 工作流

### Step 1：确定选题

**分支 A — 用户已提供选题**：进入 Step 2。

**分支 B — 无明确选题**：**优先 Subagent 委派 `news-skill`**（完整 daily-digest + news-skill 流程）；不支持 Subagent 时 inline 同等流程。见 [`media-manager` orchestration.md](../media-manager/references/orchestration.md)。

Subagent / inline 均需：

1. 按上文 **Guidance 加载规则** 读取选题指南
2. 执行 news-skill 完整流程（含日报与去重）
3. 筛选 3–5 个候选（标题 + 角度 + 来源）
4. 呈现用户选择；未确认前不得进入 Step 2

### Step 2：列提纲并审批

- **longform**：章节结构 + 要点 + 预计字数
- **xhs**：笔记页序列 + 钩子 + 信息图节奏（与 xhs-images outline 可衔接）
- **full-stack**：分叉展示长文提纲与笔记提纲

等待用户确认提纲后进入 Step 3。

### Step 3：写作

1. 按 **Guidance 加载规则** 读取写作指南
2. 场景指南：`guidance/writing/` 下匹配文件（若有）
3. 用户本次要求优先级最高

**longform**：展开提纲，插入配图占位符，输出 `article.md`

**xhs**：输出 `note.md`（frontmatter + 短正文），不写成 Markdown 长文

初稿完成后停止，请求审稿。

**Slug**：标题关键词 → 小写英文连字符，如 `bmad-framework-analysis`

### Step 4：审查与修改

按反馈迭代；用户满意后进入 Step 5。

### Step 5：复盘与更新指南

提炼 1–3 条经验，**先分类**再询问是否更新（分类见 analyze-operation）：

| 分类 | 落盘 |
|------|------|
| 通用 | `topic-selection/general.md` 或 `writing/general.md` |
| longform 共用 | `topic-selection/longform.md` 或 `writing/longform.md` |
| 仅小红书 | `topic-selection/platform/xiaohongshu.md` 或 `writing/platform/xiaohongshu.md` |
| 发布 metadata | `publishing/platform/{platform}.md`（非正文风格） |
| 待验证 | `analytics/platform/{platform}-YYYY-MM.md` |

与 longform 共用策略冲突的单平台洞察 **不得** 写入 `writing/longform.md`。

用户同意后更新；拒绝则跳过。

## References

- [platform-families.md](../media-manager/references/platform-families.md)
- `guidance/topic-selection/` — Step 1
- `guidance/writing/` — Step 3
- `guidance/publishing/` — 仅发布流程，本 skill 不加载
