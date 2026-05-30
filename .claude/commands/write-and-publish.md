---
description: 选题、写作、配图并发布到 微信/CSDN/掘金/小红书
---

执行前先 `media workspace show`。对应 [write-and-publish](../../skills/media-manager/references/workflows/write-and-publish.md)。

## 门禁

选题、提纲、初稿、发布须用户确认。

## 步骤

1. **写作**：`article-writer` skill → `$WORKSPACE/output/{slug}/article.md`
2. **配图**：`article-illustrator` skill → `$WORKSPACE/output/{slug}/images/`
3. **发布**（优先 subagent 并行）：
   - 微信：`media wechat post ...`
   - CSDN：`media csdn post --file ... --draft`
   - 掘金：`media juejin post --file ... --draft`
   - 小红书：`media xhs post-note ...`

Deep-dive：各 platform skill。
