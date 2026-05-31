# Analyze Operation

执行前先 `media workspace show`。详见 [analyze-operation](../../skills/media-manager/references/workflows/analyze-operation.md)。

## 步骤

1. **抓取**：`media analytics fetch --all`
2. **分析**：报告写入 `$WORKSPACE/output/analysis/`
3. **复盘**：洞察分类（longform-content / xhs-content / publish-metadata / archive）
4. **更新**：用户同意后写入 `$WORKSPACE/guidance/`（见 platform-families.md）
