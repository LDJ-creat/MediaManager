# Write and Publish

执行前先 `media workspace show`。详见 [write-and-publish](../../skills/media-manager/references/workflows/write-and-publish.md)。

## 门禁

选题、提纲、初稿、发布须用户确认。

## 步骤

0. **平台确认**：longform-only / xhs-only / full-stack（见 platform-families.md）
1. **选题**：`article-writer` skill；guidance 按内容族加载
2. **写作**：longform → `article.md`；xhs → `note.md`；full-stack → 两者
3. **配图**：longform → `article-illustrator`；xhs → `xhs-images`
4. **发布**（加载 `guidance/publishing/platform/*.md`）：
   - 微信：`media wechat post ...`
   - CSDN：`media csdn post --file ... --draft`
   - 掘金：`media juejin post --file ... --draft`
   - 小红书：`media xhs post-note --file output/{slug}/note.md ...`

Deep-dive：各 platform skill、[platform-families.md](../../skills/media-manager/references/platform-families.md)。
