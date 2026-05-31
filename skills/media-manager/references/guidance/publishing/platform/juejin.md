# 掘金发布指南

> **发布期加载**。写作阶段不读取本文件。

## CLI

```bash
media juejin post --file $WORKSPACE/output/{slug}/article.md --draft
```

## 元数据

| 字段 | 说明 |
|------|------|
| title | 简洁；frontmatter 或 `--title` |
| tags | frontmatter `tags` 或 `--tags` |
| cover | frontmatter `cover` / `--cover` |
| column | 专栏名 `--column` / frontmatter |
| visibility | 公开性 `--visibility` / frontmatter |

## 标题变体

- 可在 frontmatter `publish.juejin.title` 存掘金专用标题

## 正文

- Markdown 直接填入编辑器
- 一级标题若与 title 重复会被脚本移除

## 行为

- 仅保存草稿；`--publish` 会被忽略
- CLI 返回草稿编辑链接
