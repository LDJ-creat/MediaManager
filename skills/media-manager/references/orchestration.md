# Agent 编排规范

MediaManager 主编排 Agent（`media-manager` skill）负责门禁、用户确认、`media` CLI 调度。下列规则适用于 [write-and-publish](workflows/write-and-publish.md)、[publish-only](workflows/publish-only.md) 及串联的 daily-digest 路径。

## 平台选择协议

用户**未明确**目标平台时，必须先确认再进入写作 Step 1 或发布 Step 3。**不得**默认全平台或猜测用户意图。

### 支持结构化选择器时

当 Agent 端具备多选 UI（如 Cursor `AskQuestion`、Claude 选项卡片等）：

1. 弹出**多选**选择器（`allow_multiple: true`）
2. 选项至少包含：

| 选项 ID | 标签 | 映射 |
|---------|------|------|
| `wechat` | 微信公众号 | longform |
| `csdn` | CSDN | longform |
| `juejin` | 掘金 | longform |
| `xhs` | 小红书 | xhs |
| `full-stack` | 全部（长文三平台 + 小红书） | full-stack |

3. 将选择映射为内容族：
   - 仅 longform 平台 → `longform`
   - 仅小红书 → `xhs`
   - 含 longform 且含小红书，或选「全部」→ `full-stack`
4. 向用户复述选择结果，**须用户确认**后再继续

### 不支持选择器时

用自然语言列出上表各选项，说明：

- longform 三平台共用 `article.md`，发布为**草稿箱**
- 小红书独立 `note.md` + 信息图，发布为**正式发布**（非草稿）

明确请用户回复目标平台（可多选）。**收到明确回复前**不得执行写作、配图或 `media * post*`。

### 已明确平台时

用户已说明目标（如「发到 CSDN 和掘金」「只发小红书」）→ **跳过**平台选择步骤，直接进入后续流程。

---

## Subagent 编排（强制偏好）

重步骤**优先委派 Subagent**（如 Cursor `Task`）。仅当当前环境**不支持** Subagent 时，主编排 Agent **inline 执行同等流程**（须完整遵循对应子 skill，不得简化或跳过）。

| 阶段 | 委派子 skill / 任务 | 主编排保留 |
|------|----------------------|------------|
| 无选题：RSS 抓素材与选题 | **news-skill**（含 daily-digest 步骤 1–4） | 用户选题确认、门禁 |
| 长文配图 | **article-illustrator** | 验证 `images/` 与 `article.md` 回写 |
| 小红书信息图 | **xhs-images** | 验证 `xhs-images/` 与 `note.md` `images:` |
| 发布（每平台） | 各平台 publish skill 或**按平台拆 Subagent** | 执行 `media wechat/csdn/juejin/xhs ...` CLI、归档链接 |

### 委派要求

1. **news-skill**：Subagent 须执行完整流程（`media news fetch` → LLM 筛选 → 日报 → `media news mark-seen`），返回 3–5 个候选选题供用户选择；不得仅口头概括 RSS 而不跑 CLI。
2. **article-illustrator / xhs-images**：Subagent 须读取成稿、按 skill 生成配图并回写；主编排不得自行编造 prompt 或伪造图片路径。
3. **发布**：Subagent 加载 `guidance/publishing/platform/{platform}.md`，构造 metadata 与 CLI 参数；**正文不改写**。多平台可并行委派，CLI 由主编排或 Subagent 执行均可，但须汇总各平台返回链接。
4. **full-stack**：longform 与 xhs 的配图 Subagent **可并行**；发布阶段各平台 Subagent 亦可并行（注意小红书需 CDP Chrome）。

### 禁止

- 主编排 Agent 跳过子 skill，自行完成配图 prompt 工程或平台发布细节
- 以「已有成稿」为由跳过 news-skill 的 CLI 去重与持久化步骤
- 在用户未确认平台组合前开始选题或发布

### 主编排须 inline 的步骤

- `media workspace show` / `media doctor` / `media config show`
- 各阶段用户门禁（选题、提纲、初稿、发布前确认）
- 最终归档（各平台链接、失败摘要）
