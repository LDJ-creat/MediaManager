---
description: 将已有成稿发布到指定平台，不涉及写作
---

# Publish Only

将已有成稿发布到指定平台，不涉及写作。对应 `media-manager` skill 的 publish-only workflow。

执行前先 `media workspace show`。

## 要点

- 用户已明确平台 → 直接 CLI 发布
- 未明确 → 选择器多选（微信/CSDN/掘金/小红书/全部），不支持则自然语言询问
- 不改写正文；凭证见 `media doctor`

完整步骤见 `skills/media-manager/references/workflows/publish-only.md`。
