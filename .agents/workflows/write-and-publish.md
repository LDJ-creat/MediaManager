# Write and Publish 工作流

从选题到多平台发布的**完整写作流程**。执行前先 `media workspace show`；产物在 `$WORKSPACE/output/{slug}/`。

若用户**已有成稿、只需发布**，改用 [publish-only](publish-only.md)，不要在此工作流中重复写作步骤。

若用户只需**资讯日报、不写作**，改用 [daily-digest](daily-digest.md)。

无素材 RSS 驱动写作时：**先**完成 daily-digest 步骤 1–4 获得选题/素材，**再**从本工作流 Step 0 继续。

内容族与 guidance 加载规则见 [platform-families.md](../../skills/media-manager/references/platform-families.md)。

## 门禁

选题、提纲、初稿、发布各阶段须用户确认（见 `article-writer` skill）。

## 步骤

### 0. 平台确认（须用户确认）

询问目标发布组合（可多选）：

| 选项 | 内容族 | 说明 |
|------|--------|------|
| 微信 / CSDN / 掘金 | `longform` | 共用一篇 `article.md` |
| 小红书 | `xhs` | 独立 `note.md` + 信息图 |
| 全部 | `full-stack` | 默认同题，双产出 |

记录选择后再进入 Step 1。**未确认前不得开始选题。**

### 1. 选题

- 有选题/素材：按 `article-writer` skill Step 1
- 无选题：先 `media news fetch`，再 LLM 筛选
- Guidance：`topic-selection/general.md`；含 longform → + `longform.md`；含 xhs → + `platform/xiaohongshu.md`
- full-stack：**默认同题**；不同题仅当用户明确要求

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

| 分支 | skill | 产出 |
|------|-------|------|
| longform | `article-illustrator` | `output/{slug}/images/` |
| xhs | `xhs-images` | `output/{slug}/xhs-images/` + 回写 `note.md` `images:` |
| full-stack | 各走各的 skill | 两个目录 |

**降级**：API 未配置时见各 skill 降级策略；勿伪造路径。

**轻量路径**：已有 `article.md` 仅发小红书 → 提炼 `note.md` + 跑 `xhs-images`，不重写长文。

### 5. 发布（CLI）

发布前加载 `guidance/publishing/platform/{platform}.md`（longform 平台）。

| 平台 | 命令 | 发布方式 |
|------|------|----------|
| 微信 | `media wechat post ...` | 草稿箱（返回 media_id 与编辑链接） |
| CSDN | `media csdn post --file $WORKSPACE/output/{slug}/article.md --draft` | 草稿（返回编辑链接） |
| 掘金 | `media juejin post --file $WORKSPACE/output/{slug}/article.md --draft` | 草稿（返回编辑链接） |
| 小红书 | `media xhs post-note --file $WORKSPACE/output/{slug}/note.md --cdp-url ...` | **正式发布**（非草稿） |

**禁止**将 `article.md` 直接用于 `media xhs post-note`。小红书草稿为本地浏览器保存，无法跨设备共享，故采用直接发布。

### 6. 归档

记录各平台返回链接：微信 media_id 与草稿编辑链接；CSDN / 掘金草稿编辑链接；小红书已发布笔记链接。
