# Platform Families（内容族）

MediaManager 按**内容形态**而非单个发布渠道组织写作与配图。

## 内容族映射

| 内容族 ID | 平台 | 产出物 | 写作 skill | 配图 skill | 发布 CLI | 发布方式 |
|-----------|------|--------|------------|------------|----------|----------|
| `longform` | wechat, csdn, juejin | `article.md` + `images/` | article-writer | article-illustrator | `media wechat post` / `media csdn post` / `media juejin post` | **草稿箱**（返回编辑链接 / media_id） |
| `xhs` | xiaohongshu | `note.md` + `xhs-images/` | article-writer（xhs 模式） | xhs-images | `media xhs post-note` | **正式发布**（非草稿） |

小红书不使用草稿：创作中心草稿为本地浏览器保存，无法跨设备 / 浏览器共享。

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
| xiaohongshu | 见 `xiaohongshu-publish-and-data` skill；确认 `note.md` + `xhs-images/`。**正式发布**（非草稿；草稿为本地保存） |

### 复盘（analyze-operation）

洞察分类后落盘 — 见 [analyze-operation.md](workflows/analyze-operation.md)。

## 工作流组合

| 用户选择 | 行为 |
|----------|------|
| longform-only | 一篇 `article.md` → Subagent `article-illustrator` → 发布到所选 longform 平台 |
| xhs-only | `note.md` → Subagent `xhs-images` → post-note |
| full-stack | 共享选题（默认同题）→ 分叉提纲 → 并行 longform + xhs 产出 |

平台未指明时的选择器 / 自然语言询问，以及 Subagent 委派细则见 [orchestration.md](orchestration.md)。

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
