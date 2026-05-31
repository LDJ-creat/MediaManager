# CSDN 发布指南

> **发布期加载**。写作阶段不读取本文件。

## CLI

```bash
media csdn post --file $WORKSPACE/output/{slug}/article.md --draft
```

## 元数据

| 字段 | 说明 |
|------|------|
| title | 含技术关键词；清晰准确 |
| summary | 建议 140 字内；frontmatter `summary` / `abstract` |
| category | frontmatter `category` 或 `--category` |
| tags | frontmatter `tags` 或 `--tags` |
| original | 原创标记 `--original` / frontmatter |

## 标题变体

- 可在 frontmatter `publish.csdn.title` 存 CSDN 专用标题

## 正文

- 完整 Markdown 写入编辑器；代码块保留
- 封面：`--cover` 或 `cover_path` 注释

## 行为

- 仅保存草稿，不自动正式发布
- CLI 返回草稿编辑链接
