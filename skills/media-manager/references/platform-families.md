# Platform Families（内容族）

MediaManager 按**内容形态**而非单个发布渠道组织写作与配图。

## 内容族映射

| 内容族 ID | 平台 | 产出物 | 写作 skill | 配图 skill | 发布 CLI |
|-----------|------|--------|------------|------------|----------|
| `longform` | wechat, csdn, juejin | `article.md` + `images/` | article-writer | article-illustrator | `media wechat post` / `media csdn post` / `media juejin post` |
| `xhs` | xiaohongshu | `note.md` + `xhs-images/` | article-writer（xhs 模式） | xhs-images | `media xhs post-note` |

## 产出目录

```
output/{slug}/
├── article.md          # longform（三平台共用一篇）
├── note.md             # xhs（xhs-only 或 full-stack）
├── images/             # longform 配图
└── xhs-images/         # 小红书轮播图
```

## Guidance 加载矩阵

### 选题（Step 1）

| 目标 | 加载文件 |
|------|----------|
| 任意 | `guidance/topic-selection/general.md` |
| 含 longform 平台 | + `guidance/topic-selection/longform.md` |
| 含 xiaohongshu | + `guidance/topic-selection/platform/xiaohongshu.md` |

**不加载** `topic-selection/platform/wechat|csdn|juejin.md`（不存在；三平台共用 longform）。

### 写作（Step 3）

| 目标 | 加载文件 |
|------|----------|
| 任意 | `guidance/writing/general.md` |
| 含 longform 平台 | + `guidance/writing/longform.md` |
| 含 xiaohongshu | + `guidance/writing/platform/xiaohongshu.md` |

**不加载** `writing/platform/wechat|csdn|juejin.md`（不存在；长文共用 `longform.md`）或 `publishing/platform/*`（写作期）。

### 发布（publish-only / write-and-publish 发布步）

| 目标平台 | 加载文件 |
|----------|----------|
| wechat | `guidance/publishing/platform/wechat.md` |
| csdn | `guidance/publishing/platform/csdn.md` |
| juejin | `guidance/publishing/platform/juejin.md` |
| xiaohongshu | 见 `xiaohongshu-publish-and-data` skill；确认 `note.md` + `xhs-images/` |

### 复盘（analyze-operation）

洞察分类后落盘 — 见 [analyze-operation.md](workflows/analyze-operation.md)。

## 工作流组合

| 用户选择 | 行为 |
|----------|------|
| longform-only | 一篇 `article.md` → article-illustrator → 发布到所选 longform 平台 |
| xhs-only | `note.md` → xhs-images → post-note |
| full-stack | 共享选题（默认同题）→ 分叉提纲 → 并行 longform + xhs 产出 |

## frontmatter 发布变体（可选）

长文三平台标题/摘要差异写在 `article.md` frontmatter，发布期由 Agent 读取 `publishing/platform/*.md` 构造 CLI：

```yaml
---
title: "BMAD 框架深度解析"
publish:
  wechat:
    title: "BMAD 框架：我踩过的 3 个坑"
    summary: "..."
  csdn:
    title: "BMAD 框架深度解析与实践"
    category: "人工智能"
  juejin:
    tags: ["AI", "Agent"]
---
```

正文不变；仅 metadata 按平台调整。
