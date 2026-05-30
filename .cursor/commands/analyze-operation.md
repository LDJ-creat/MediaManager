---
description: 抓取各平台运营数据、分析复盘并更新 guidance
---

执行前先 `media workspace show`。对应 [analyze-operation](../../skills/media-manager/references/workflows/analyze-operation.md)。

## 步骤

1. **抓取**：`media analytics fetch --all`
2. **分析**：汇总至 `$WORKSPACE/output/analysis/`
3. **建议**：LLM 复盘，须用户确认
4. **更新**：用户同意后写入 `$WORKSPACE/guidance/`

## 分平台

```bash
media wechat analytics fetch
media csdn analytics fetch
media juejin analytics fetch
media xhs analytics fetch
```
