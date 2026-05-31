# Analyze Operation 工作流

运营数据复盘与 guidance 进化。执行前先 `media workspace show`。

Guidance 三层模型见 [platform-families.md](../../skills/media-manager/references/platform-families.md)。

## 步骤

### 1. 抓取数据

```bash
media analytics fetch --all
```

或分平台：

```bash
media wechat analytics fetch
media csdn analytics fetch
media juejin analytics fetch
media xhs analytics fetch
```

输出：`$WORKSPACE/.media-manager/data/analytics/{platform}/`

### 2. 聚合分析

汇总 JSON，在 `$WORKSPACE/output/analysis/` 生成报告。

### 3. 复盘建议

LLM 提炼选题/写作/发布改进点，**须用户确认**后再更新。

每条洞察先**分类**：

| 分类 | 判定 | 落盘目标 |
|------|------|----------|
| `longform-content` | 三平台数据一致，或影响长文正文结构/风格 | `writing/longform.md` 或 `writing/general.md` |
| `xhs-content` | 仅小红书笔记/信息图形态 | `writing/platform/xiaohongshu.md` |
| `publish-metadata` | 标题/摘要/tags/分类等平台差异 | `publishing/platform/{platform}.md` |
| `archive` | 原始观察、待验证假设 | `analytics/platform/{platform}-YYYY-MM.md` |

**冲突处理**：

- 仅单平台有效且与 longform 共用策略冲突 → **不得**写入 `writing/longform.md`；降级为 `publishing/` 或 `archive`
- 微信/CSDN/掘金正文风格经验 → 优先合并到 `longform.md`，不拆三份 writing 指南

### 4. 更新 guidance

用户同意后写入：

- `$WORKSPACE/guidance/topic-selection/`（general / longform / platform/xiaohongshu）
- `$WORKSPACE/guidance/writing/`（同上）
- `$WORKSPACE/guidance/publishing/platform/`（metadata）
- `$WORKSPACE/guidance/analytics/platform/`（归档）

## 参考

各平台输出格式见对应 platform skill 的 `references/output-format.md`。
