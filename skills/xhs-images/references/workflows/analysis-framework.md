# 内容分析（轻量）

分析 `note.md`（或提炼自 `article.md`），输出 `xhs-images/analysis.md`。技术自媒体场景，默认面向干货/教程/工具类。

## 必答项

1. **内容类型**：干货 | 教程 | 测评对比 | 避坑 | 清单
2. **受众**：打工人 / 开发者 / 学生 / 泛技术读者
3. **钩子**：标题是否 ≤20 字、有无数字/痛点/利益点（1–5 星）
4. **建议张数**：3–8（默认 5–7）
5. **style + layout**：从 `notion|chalkboard|study-notes|bold|minimal` × canvas 布局中选一组，给备选 1 组

## 平台要点

- 封面决定停留；每页末尾可留 swipe 钩子
- 强调**可收藏**（清单、步骤、对比表）
- 技术内容优先：`notion`+`dense`、`chalkboard`+`list`、`study-notes`+`balanced`

## analysis.md 模板

```yaml
---
title: "（来自 note frontmatter）"
content_type: 干货分享
recommended_image_count: 6
style: notion
layout: dense
---

## 受众
…

## 钩子评分
⭐⭐⭐⭐ — 理由与可选优化标题

## 信息图节奏
| 页 | 角色 | 核心信息 |
|----|------|----------|
| P1 | cover | … |
| P2–5 | content | … |
| P6 | ending | CTA |

## 推荐
- 主选：notion + dense
- 备选：chalkboard + list
```

## 完成后

向用户展示 3–5 行摘要，进入 outline 步骤。**无需单独 EXTEND 配置**；偏好见 `$WORKSPACE/guidance/writing/platform/xiaohongshu.md` 或用户当次指定。
