# Write and Publish 工作流

从选题到多平台发布的**完整写作流程**。执行前先 `media workspace show`；产物在 `$WORKSPACE/output/{slug}/`。

若用户**已有成稿、只需发布**，改用 [publish-only](publish-only.md)，不要在此工作流中重复写作步骤。

若用户只需**资讯日报、不写作**，改用 [daily-digest](daily-digest.md)。

无素材 RSS 驱动写作时：**先**完成 daily-digest 步骤 1–4 获得选题/素材，**再**从本工作流步骤 1 继续。

## 门禁

选题、提纲、初稿、发布各阶段须用户确认（见 `article-writer` skill）。

## 步骤

### 1. 写作

- 有选题/素材：按 `article-writer` skill 执行
- 无选题：先 `media news fetch`，再 LLM 筛选选题
- 输出：`$WORKSPACE/output/{slug}/article.md`

### 2. 配图

按 `article-illustrator` skill；出图可用 `media image gen --prompt "..." --image $WORKSPACE/output/{slug}/images/cover.png`

**降级**：API 未配置或调用失败时，改用 Agent 内置生图工具；若无内置能力，告知用户无法配图（勿伪造路径）。

### 3. 发布（CLI）

| 平台 | 命令 |
|------|------|
| 微信 | `media wechat post ...` |
| CSDN | `media csdn post --file $WORKSPACE/output/{slug}/article.md --draft` |
| 掘金 | `media juejin post --file $WORKSPACE/output/{slug}/article.md --draft` |
| 小红书 | `media xhs post-note ...` |

平台细节见各 platform skill（deep-dive）。

### 4. 归档

记录各平台草稿链接 / media_id。
