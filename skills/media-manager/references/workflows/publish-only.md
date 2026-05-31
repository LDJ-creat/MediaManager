# Publish Only 工作流

将**已有成稿**发布到指定平台。不涉及选题、写作、润色或配图生成。执行前先 `media workspace show`。

## 前置

- **成稿路径**：默认 `$WORKSPACE/output/{slug}/article.md`；用户指定路径时以用户为准
- **凭证**：发布前确认 `media doctor` 中目标平台 auth 为 ✓；缺失则引导 `media <platform> auth export`
- **配图**：若平台需要封面/配图且用户未提供，仅使用 `$WORKSPACE/output/{slug}/images/` 下已有文件；**不要**在此工作流中触发写作或 AI 出图

## 步骤

### 1. 定位成稿

1. 若用户给出 slug 或文件路径，直接使用
2. 否则列出 `$WORKSPACE/output/` 下含 `article.md` 的目录，请用户选定一篇
3. 确认文件存在且可读；小红书图文另需图片路径（见平台 skill）

### 2. 确定目标平台

**用户已明确平台**（如「发到 CSDN」「发布到微信和掘金」）：跳过询问，直接进入步骤 3。

**用户未明确平台**：必须先确认发布目标。

#### 选择器优先（推荐）

在支持结构化选择的 Agent 环境（如 Cursor 多选表单、`AskQuestion` 等）中，提供多选：

| 选项 | 说明 |
|------|------|
| 微信公众号 | 草稿箱 |
| CSDN | 草稿 |
| 掘金 | 草稿 |
| 小红书 | 图文笔记（需图片） |
| 全部 | 上述所有适用平台 |

用户勾选后按选择执行；选「全部」时逐平台发布（小红书需单独确认图片是否就绪）。

#### 降级：自然语言询问

不支持选择器时，用自然语言询问：

> 请告诉我要发布到哪些平台：微信 / CSDN / 掘金 / 小红书 / 全部（可多选）

解析用户回复后再进入步骤 3。

### 3. 发布（CLI）

按平台调用，**不要**改写正文内容（除非平台 skill 要求格式转换，且应最小改动）：

| 平台 | 命令 |
|------|------|
| 微信 | `media wechat post ...`（参数见 `post-to-wechat` skill） |
| CSDN | `media csdn post --file $WORKSPACE/output/{slug}/article.md --draft` |
| 掘金 | `media juejin post --file $WORKSPACE/output/{slug}/article.md --draft` |
| 小红书 | `media xhs post-note ...`（见 `xiaohongshu-publish-and-data` skill） |

各平台细节、必填参数、失败重试见对应 platform skill（deep-dive）。

### 4. 归档

在 `$WORKSPACE/output/{slug}/` 或工作区笔记中记录：

- 发布时间
- 各平台草稿链接 / media_id
- 失败平台与错误摘要（便于用户稍后重试）

## 参考

- [write-and-publish](write-and-publish.md) — 含写作与配图的完整流程
- 平台 skill：`post-to-wechat`、`csdn-publish-and-data`、`juejin-publish-and-data`、`xiaohongshu-publish-and-data`
