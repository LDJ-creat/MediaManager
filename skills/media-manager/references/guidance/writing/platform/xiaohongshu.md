# 小红书写作指南

选择小红书目标时，与 `general.md` 一起加载。

## 产出

- 笔记文件：`output/{slug}/note.md`
- 信息图目录：`output/{slug}/xhs-images/`（由 `xhs-images` skill 生成）

## note.md 格式

```yaml
---
title: "标题最多20字"
tags:
  - 标签1
  - 标签2
images: []   # 配图完成后由 xhs-images skill 回写路径列表
---
```

正文要求：

- 短、口语化；前三行强钩子（痛点/数字/反差）
- 可用 emoji，避免 Markdown 长文结构（`#` 标题、代码块、内嵌图片语法）
- 标题 ≤20 字

## 与长文关系

- full-stack 时：先或与 `article.md` 并行；笔记正文是**提炼**而非复制长文
- 信息图是主内容；note 正文补充搜索与互动语境

## 配图

- 使用 `xhs-images` skill，默认 style=`notion`，layout=`dense`
- 偏好可在本文件「配图偏好」节更新

### 配图偏好（可复盘更新）

- 默认风格：notion
- 默认布局：dense
- 默认张数：5–7
