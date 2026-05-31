# Write and Publish 工作流

从选题到多平台发布的**完整写作流程**。执行前先 `media workspace show`；产物在 `$WORKSPACE/output/{slug}/`。

若用户**已有成稿、只需发布**，改用 [publish-only](publish-only.md)，不要在此工作流中重复写作步骤。

若用户只需**资讯日报、不写作**，改用 [daily-digest](daily-digest.md)。

无素材 RSS 驱动写作时：**先**完成 daily-digest 步骤 1–4 获得选题/素材，**再**从本工作流 Step 0 继续。

内容族与 guidance 加载规则见 [platform-families.md](../../skills/media-manager/references/platform-families.md)。

编排规范（**平台选择**、**Subagent 委派**）见 [orchestration.md](../../skills/media-manager/references/orchestration.md)。

## 门禁

- **平台**：用户未明确目标平台时，**必须先询问**（选择器或多选 / 自然语言），收到明确选择并完成确认前，**不得**进入 Step 1，**不得**执行 `media * post*`。详见 Step 0 与 Step 5。
- 选题、提纲、初稿各阶段须用户确认（见 `article-writer` skill）。
- 发布前须再次核对 Step 0 记录的平台组合；用户变更意图或未确认时，按 [orchestration.md § 平台选择协议](../../skills/media-manager/references/orchestration.md#平台选择协议) 重新询问。

## 步骤

### 0. 确定目标平台（须用户确认）

本步决定内容族（`longform` / `xhs` / `full-stack`），影响后续选题 guidance、写作分支、配图 skill 与发布命令。**是全流程的前置条件，不可跳过或默认全平台。**

用户**已明确**目标平台（如「写一篇文章发 CSDN 和掘金」「只做小红书笔记」）→ 映射内容族后**复述确认**，用户同意则进入 Step 1。

用户**未明确**目标平台时，按 [orchestration.md § 平台选择协议](../../skills/media-manager/references/orchestration.md#平台选择协议) 执行：

- **有选择器**（如 Cursor `AskQuestion`）：多选「微信公众号 / CSDN / 掘金 / 小红书 / 全部」（`allow_multiple: true`）
- **无选择器**：自然语言列出下表选项并请用户回复（可多选），说明 longform 为草稿箱、小红书为正式发布

**收到明确选择并完成复述确认前**，不得进入 Step 1，不得开始选题、写作、配图或 `media * post*`。

| 选项 | 内容族 | 成稿 | 说明 |
|------|--------|------|------|
| 微信公众号 | longform | `article.md` | 草稿箱（返回 media_id 与编辑链接） |
| CSDN | longform | `article.md` | 草稿（返回编辑链接） |
| 掘金 | longform | `article.md` | 草稿（返回编辑链接） |
| 小红书 | `xhs` | `note.md` + 信息图 | **正式发布**（非草稿；草稿为本地保存，无法跨设备共享） |
| 全部 | `full-stack` | `article.md` + `note.md` | 默认同题，双产出；longform 与 xhs 分支并行 |

记录选择并向用户复述确认后再进入 Step 1。

### 1. 选题

- 有选题/素材：按 `article-writer` skill Step 1 分支 A
- **无选题**：**优先 Subagent 委派 `news-skill`**（完整 daily-digest 流程：`media news fetch` → LLM 筛选 → 日报 → `media news mark-seen`）；不支持 Subagent 时 inline 同等流程。详见 [orchestration.md](../../skills/media-manager/references/orchestration.md#subagent-编排强制偏好)
- Guidance：`topic-selection/general.md`；含 longform → + `longform.md`；含 xhs → + `platform/xiaohongshu.md`
- full-stack：**默认同题**；不同题仅当用户明确要求
- 呈现 3–5 个候选供用户选择；**未确认前不得进入 Step 2**

### 2. 提纲

- longform：article-writer 长文提纲 → 用户确认
- xhs：note 结构 + 信息图节奏（可在 article-writer xhs 模式或 xhs-images Step 2 前对齐）
- full-stack：**分叉提纲** — 长文章节 vs 笔记页序列；共享核心论点

### 3. 写作

| 分支 | skill | 产出 |
|------|-------|------|
| longform | `article-writer` + `writing/longform.md` | `output/{slug}/article.md` |
| xhs | `article-writer`（xhs）+ `writing/platform/xiaohongshu.md` | `output/{slug}/note.md` |
| full-stack | 并行两分支 | `article.md` + `note.md` |

### 4. 配图

**优先 Subagent 委派**对应 skill；不支持 Subagent 时 inline 同等流程（见 [orchestration.md](../../skills/media-manager/references/orchestration.md)）。

| 分支 | skill（Subagent 目标） | 产出 |
|------|------------------------|------|
| longform | `article-illustrator` | `output/{slug}/images/` |
| xhs | `xhs-images` | `output/{slug}/xhs-images/` + 回写 `note.md` `images:` |
| full-stack | 各委派各 skill（**可并行**） | 两个目录 |

主编排验证产物路径与回写完整性后再进入 Step 5。

**降级**：API 未配置时见各 skill 降级策略；勿伪造路径。

**轻量路径**：已有 `article.md` 仅发小红书 → 提炼 `note.md` + Subagent/`xhs-images`，不重写长文。

### 5. 发布（CLI）

**发布前平台确认**（与 Step 0 一致，不可省略）：

1. 核对 Step 0 已记录且用户已确认的目标平台
2. 若用户中途变更意图、或 Step 0 从未完成平台确认 → 按 [orchestration.md § 平台选择协议](../../skills/media-manager/references/orchestration.md#平台选择协议) 重新询问
3. **收到明确选择前**不得执行 `media * post*`

**优先 Subagent** 按平台加载 `guidance/publishing/platform/{platform}.md` 并构造 CLI 参数；多平台**可并行**委派。主编排汇总各平台 CLI 结果与链接。**不要**改写正文；metadata 按 guidance 构造 CLI 参数。

仅发布 Step 0 已确认的平台；勿默认全平台或擅自增删目标。

| 平台 | 命令 | 发布方式 |
|------|------|----------|
| 微信 | `media wechat post ...` | 草稿箱（返回 media_id 与编辑链接） |
| CSDN | `media csdn post --file $WORKSPACE/output/{slug}/article.md --draft` | 草稿（返回编辑链接） |
| 掘金 | `media juejin post --file $WORKSPACE/output/{slug}/article.md --draft` | 草稿（返回编辑链接） |
| 小红书 | `media xhs post-note --file $WORKSPACE/output/{slug}/note.md --cdp-url ...` | **正式发布**（非草稿） |

**禁止**将 `article.md` 直接用于 `media xhs post-note`。小红书草稿为本地浏览器保存，无法跨设备共享，故采用直接发布。

### 6. 归档

记录各平台返回链接：微信 media_id 与草稿编辑链接；CSDN / 掘金草稿编辑链接；小红书已发布笔记链接。
