---
description: 将已有成稿发布到微信/CSDN/掘金/小红书，不涉及写作或配图生成
---

执行前先 `media workspace show`。对应 [publish-only](../../skills/media-manager/references/workflows/publish-only.md)。

## 执行要求

1. **不改写正文**；仅格式转换以平台 skill 要求为准
2. 用户已明确平台 → 直接发布；未明确 → 优先多选选择器，否则自然语言询问
3. 发布前 `media doctor` 确认目标平台 auth
4. 各平台 CLI 见 platform skill（deep-dive）

## 支持平台

| 平台 | 命令 |
|------|------|
| 微信 | `media wechat post ...` |
| CSDN | `media csdn post --file $WORKSPACE/output/{slug}/article.md --draft` |
| 掘金 | `media juejin post --file $WORKSPACE/output/{slug}/article.md --draft` |
| 小红书 | `media xhs post-note ...` |

## 成稿路径

默认 `$WORKSPACE/output/{slug}/article.md`；用户指定路径时以用户为准。
