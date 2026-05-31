# Publish Only 工作流

将**已有成稿**发布到指定平台。不涉及选题、写作、润色或配图生成。执行前先 `media workspace show`。

Guidance：发布前加载 `guidance/publishing/platform/{platform}.md`（longform 平台）。见 [platform-families.md](../platform-families.md)。

## 前置

- **longform 成稿**：`$WORKSPACE/output/{slug}/article.md`
- **小红书成稿**：`$WORKSPACE/output/{slug}/note.md` + `xhs-images/` 图片就绪
- **凭证**：`media doctor` 目标平台 auth 为 ✓
- **配图**：仅使用已有 `images/` 或 `xhs-images/`；勿在此流程触发出图

## 步骤

### 1. 定位成稿

1. 用户给出 slug 或路径则直接使用
2. 否则列出 `output/` 下含 `article.md` 和/或 `note.md` 的目录
3. 小红书：确认 `note.md` frontmatter `images:` 非空且文件存在

### 2. 确定目标平台

用户已明确则跳过询问。

| 选项 | 成稿 | 说明 |
|------|------|------|
| 微信公众号 | article.md | 草稿箱 |
| CSDN | article.md | 草稿 |
| 掘金 | article.md | 草稿 |
| 小红书 | note.md | 图文笔记 |
| 全部 | 各自对应文件 | 小红书单独确认图片 |

### 3. 发布（CLI）

发布前读取 `guidance/publishing/platform/{each}.md`。可从 `article.md` frontmatter `publish:` 读取各平台 title/summary/tags 变体。

**不要**改写正文；metadata 按 guidance 构造 CLI 参数。

| 平台 | 命令 |
|------|------|
| 微信 | `media wechat post ...` |
| CSDN | `media csdn post --file $WORKSPACE/output/{slug}/article.md --draft` |
| 掘金 | `media juejin post --file $WORKSPACE/output/{slug}/article.md --draft` |
| 小红书 | `media xhs post-note --file $WORKSPACE/output/{slug}/note.md --cdp-url ...` |

**禁止**将 `article.md` 直接用于 `media xhs post-note`。

### 4. 归档

记录发布时间、草稿链接 / media_id、失败摘要。

## 参考

- [write-and-publish](write-and-publish.md)
- 平台 skill：`post-to-wechat`、`csdn-publish-and-data`、`juejin-publish-and-data`、`xiaohongshu-publish-and-data`
