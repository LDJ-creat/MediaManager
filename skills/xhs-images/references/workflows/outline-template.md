# Outline 模板（单份）

MediaManager 默认只生成 **一份** `xhs-images/outline.md`，用户确认后再出图。不生成 A/B/C 多策略文件。

## 命名

| 文件 | 用途 |
|------|------|
| `outline.md` | 唯一 outline（须用户确认） |
| `prompts/NN-{type}-{slug}.md` | 每张图的 prompt |
| `NN-{type}-{slug}.png` | 成图 |

类型：`cover` | `content` | `ending`

## 布局速查

| layout | 适用 |
|--------|------|
| sparse | 封面、金句、CTA |
| balanced | 常规要点（3–4 点） |
| dense | 干货卡片、清单（5–8 点） |
| list | 步骤、排行、checklist |
| comparison | 前后对比、优劣 |
| flow | 流程、时间线 |

## outline.md 格式

```markdown
---
style: notion
layout: dense
image_count: 6
generated: YYYY-MM-DD
---

# 小红书信息图 Outline

## P1 — Cover
- **layout**: sparse
- **hook**: （≤20 字标题感）
- **filename**: 01-cover-{slug}.png
- **要点**: 主标题、副标题
- **视觉**: 一句话画面描述
- **swipe**: 下一张钩子（可选）

## P2 — Content
- **layout**: dense
- **filename**: 02-content-{slug}.png
- **要点**: …
- **视觉**: …

## P6 — Ending
- **layout**: sparse
- **filename**: 06-ending-{slug}.png
- **要点**: 总结 + CTA（收藏/评论引导）
- **视觉**: …
```

## 张数建议

| 内容 | 张数 |
|------|------|
| 单点干货 | 3–4 |
| 工具/技巧清单 | 5–7 |
| 教程步骤 | 6–8 |

默认 **5–7** 张；封面 + 若干 content + ending。

## 确认门禁

写入 `outline.md` 后 **停住**，展示摘要，等用户确认或修改。**确认前不出图。**
