# Analyze Operation 工作流

运营数据复盘与 guidance 进化。执行前先 `media workspace show`。

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

LLM 提炼选题/写作改进点，**须用户确认**后再更新。

### 4. 更新 guidance

用户同意后，更新 `$WORKSPACE/guidance/topic-selection/` 与 `$WORKSPACE/guidance/writing/`。

## 参考

各平台输出格式见对应 platform skill 的 `references/output-format.md`。
