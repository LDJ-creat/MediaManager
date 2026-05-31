---
description: 将已有成稿发布到微信/CSDN/掘金/小红书，不涉及写作或配图生成
---

执行前先 `media workspace show`。对应 [publish-only](../../skills/media-manager/references/workflows/publish-only.md)。

## 执行要求

1. **不改写正文**；发布前加载 `guidance/publishing/platform/{platform}.md`
2. longform → `article.md`；小红书 → `note.md` + `xhs-images/`（禁止 article.md 直发小红书）
3. 用户已明确平台 → 直接发布；未明确 → 询问
4. 发布前 `media doctor` 确认 auth

## 支持平台

| 平台 | 成稿 | 命令 |
|------|------|------|
| 微信 | article.md | `media wechat post ...` |
| CSDN | article.md | `media csdn post --file ... --draft` |
| 掘金 | article.md | `media juejin post --file ... --draft` |
| 小红书 | note.md | `media xhs post-note --file output/{slug}/note.md ...` |
