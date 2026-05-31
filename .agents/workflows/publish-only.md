# Publish Only 工作流

将**已有成稿**发布到指定平台。不涉及选题、写作、润色或配图生成。执行前先 `media workspace show`。

Guidance：发布前加载 `guidance/publishing/platform/{platform}.md`（longform 平台）。见 [platform-families.md](../../skills/media-manager/references/platform-families.md)。

编排规范（**平台选择**、**Subagent 委派**）见 [orchestration.md](../../skills/media-manager/references/orchestration.md)。

## 前置

- **longform 成稿**：`$WORKSPACE/output/{slug}/article.md`
- **小红书成稿**：`$WORKSPACE/output/{slug}/note.md` + `xhs-images/` 图片就绪
- **凭证**：`media doctor` 目标平台 auth 为 ✓
- **配图**：仅使用已有 `images/` 或 `xhs-images/`；勿在此流程触发出图

## 外源成稿准入（Step 1 之前）

本工作流**不改写正文**，仅发布已规范成稿。若用户提供的素材不符合下列条件，**不得**进入本工作流 Step 3，应改走 [write-and-publish](write-and-publish.md)（article-writer 规范化/润色）：

| 条件 | 要求 |
|------|------|
| longform | 工作区 `output/{slug}/article.md`，结构符合 `guidance/writing/longform.md` |
| 小红书 | `note.md` + frontmatter `images:` 非空且文件存在 |
| 非 MD / Word / PDF / 粘贴文本 | 须先转为规范 `article.md`（及必要时 `note.md`） |
| 仅 longform MD 却要发小红书 | 须先提炼 `note.md` + `xhs-images`，禁止直接 post `article.md` |

详见 [orchestration.md § 外源成稿格式准入](../../skills/media-manager/references/orchestration.md#外源成稿格式准入)。

## 步骤

### 1. 定位成稿

1. 用户给出 slug 或路径则直接使用
2. 否则列出 `output/` 下含 `article.md` 和/或 `note.md` 的目录
3. 小红书：确认 `note.md` frontmatter `images:` 非空且文件存在

### 2. 确定目标平台

用户**已明确**目标平台 → 跳过询问，直接进入 Step 3。

用户**未明确**时，按 [orchestration.md § 平台选择协议](../../skills/media-manager/references/orchestration.md#平台选择协议) 执行：

- **有选择器**（如 Cursor `AskQuestion`）：多选「微信公众号 / CSDN / 掘金 / 小红书 / 全部」
- **无选择器**：自然语言列出下表选项并请用户回复（可多选）

**收到明确选择前**不得执行 `media * post*`。

| 选项 | 成稿 | 说明 |
|------|------|------|
| 微信公众号 | article.md | 草稿箱（返回 media_id 与编辑链接） |
| CSDN | article.md | 草稿（返回编辑链接） |
| 掘金 | article.md | 草稿（返回编辑链接） |
| 小红书 | note.md | **正式发布**（非草稿；草稿为本地保存，无法跨设备共享） |
| 全部 | 各自对应文件 | 小红书单独确认图片 |

### 3. 发布（CLI）

> ⛔ **硬门禁**：运行任何 `media * post*` 前，必须输出 [orchestration.md § 发布硬门禁](../../skills/media-manager/references/orchestration.md#发布硬门禁step-5--publish-only-step-3-强制执行) 中的 **「发布平台确认」块**，并**等待用户回复「确认发布」**。未完成则 **STOP**。

**禁止**：因用户说「发布」「各平台」而默认全平台；不得跳过确认块直接调用 CLI。

**优先 Subagent** 按平台加载 guidance、构造 metadata 与 CLI 参数；多平台**可并行**委派。主编排汇总链接与失败摘要。**不要**改写正文。

发布前读取 `guidance/publishing/platform/{each}.md`。可从 `article.md` frontmatter `publish:` 读取各平台 title/summary/tags 变体。

| 平台 | 命令 | 发布方式 |
|------|------|----------|
| 微信 | `media wechat post ...` | 草稿箱（返回 media_id 与编辑链接） |
| CSDN | `media csdn post --file $WORKSPACE/output/{slug}/article.md --draft` | 草稿（返回编辑链接） |
| 掘金 | `media juejin post --file $WORKSPACE/output/{slug}/article.md --draft` | 草稿（返回编辑链接） |
| 小红书 | `media xhs post-note --file $WORKSPACE/output/{slug}/note.md --cdp-url ...` | **正式发布**（非草稿） |

**禁止**将 `article.md` 直接用于 `media xhs post-note`。小红书草稿为本地浏览器保存，无法跨设备共享，故采用直接发布。

### 4. 归档

记录发布时间、各平台返回链接（微信 media_id / CSDN·掘金草稿编辑链接 / 小红书已发布笔记链接）、失败摘要。

## 参考

- [write-and-publish](write-and-publish.md)
- 平台 skill：`post-to-wechat`、`csdn-publish-and-data`、`juejin-publish-and-data`、`xiaohongshu-publish-and-data`
