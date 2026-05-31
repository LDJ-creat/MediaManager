# 微信公众号发布指南

> **发布期加载**。写作 `article-writer` 阶段不读取本文件。

## CLI

```bash
media wechat post $WORKSPACE/output/{slug}/article.md [options]
```

## 元数据

| 字段 | 说明 |
|------|------|
| title | 可略偏情绪/好奇；frontmatter 或 `--title` 覆盖 |
| summary | 摘要/digest，`--summary` 或 frontmatter |
| cover | `--cover` 或 `<!-- cover_path: ./images/cover.png -->` |
| theme | 默认 `default`；可选 grace / simple / modern |

## 标题变体

- 长文标题偏技术准确；微信可略加强钩子
- 使用 `article.md` frontmatter `publish.wechat.title` 存变体（Agent 构造 CLI 参数）

## 正文

- Markdown 转 HTML；普通外链默认转底部引用（`--no-cite` 可关闭）
- 勿在正文重复插入封面大图

## 凭证

- `WECHAT_APP_ID` / `WECHAT_APP_SECRET` 或 skill 目录 `.env`

## 行为

- 保存至公众号草稿箱，不自动群发
- CLI 返回 media_id 与后台编辑链接，供人工审阅后正式发布
