---
description: 抓取 微信/CSDN/掘金/小红书 的运营数据并进行汇总分析，并根据复盘建议更新写作指南
---

本工作流用于定期获取各平台的阅读量、收藏量、粉丝增长等核心指标，生成分析报告，并建立从数据到创作指南的反馈闭合回路。

### 第一步：抓取多平台运营数据 (Data Fetching)


1. **微信公众号**：使用 `./get-wechat-data/` 抓取最新指标（需确保 `storageState.json` 或 `cookie.json` 有效）。主 JSON 仅含 `normalized` 业务数据。
2. **CSDN**：使用 `./csdn-publish-and-data/` 获取文章统计。主 JSON 含 `report` 标准化结果。
3. **掘金**：使用 `./juejin-publish-and-data/` 获取交互数据。主 JSON 含 `normalized` 标准化结果。
4. **小红书**：使用 `./xiaohongshu-publish-and-data/` 抓取最近 10 条已发布笔记的数据表现

### 第二步：跨平台数据聚合与分析 (Aggregation)
汇总各平台产出的数据（JSON/Markdown）：
1. 分析近期文章的表现，识别各平台表现最优的内容及其共同点。
2. 计算总粉丝增长、交互率及各平台的受众偏好差异。
3. 在 `./output/analysis/` 目录下生成可视化分析报告。

### 第三步：策略复盘与改进建议 (Strategy Review)
基于上步的分析报告进行深度复盘：
1. **选题复盘**：分析哪些选题带来了更高的关注，哪些选题表现平平。
2. **写作复盘**：分析不同的行文风格、标题设计或排版对转化率的影响。
3. **生成建议**：针对“选题方向”或“写作方式”提炼 1-3 条具体的改进建议。

### 第四步：指南同步与讨论 (Guidance Sync & Discussion)
将改进建议提交给用户进行审查或讨论：
1. **展示建议**：向用户展示提炼出的改进点。
2. **交互讨论**：若用户对建议有异议或希望优化，与之进行交流直至达成共识。
3. **用户确认**：询问用户是否同意将建议更新至 `./guidance/` 下的对应文件。

### 第五步：更新指南 (Update Guidance)
在用户明确同意后，根据改进建议的性质，更新或创建 `./guidance/` 目录下的对应文件。

#### 选题指南（`./guidance/topic-selection/`）

- **通用选题改进** → 更新 `./guidance/topic-selection/general.md`
- **平台专属选题改进** → 更新 `./guidance/topic-selection/platform/{platform}.md`
  - `{platform}` 取值示例：`wechat`、`csdn`、`juejin`、`xiaohongshu` 等

#### 写作指南（`./guidance/writing/`）

- **通用风格改进** → 更新 `./guidance/writing/general.md`
- **平台专属改进** → 更新 `./guidance/writing/platform/{platform}.md`
- **特定场景/题材的详细写作指南**（如某类文章 SOP、访谈稿规范等）→ 在 `./guidance/writing/` 下新建独立文件
  - 命名建议：使用语义清晰的文件名，如 `{题材或场景}-sop.md`、`{场景}_guide.md`
  - 若内容足够独立、可复用，应拆分为独立文件，而非全部塞入 `general.md`
  - **可选**：在 `general.md` 中添加对该文件的引用链接；是否添加由 LLM 自行判断——当该指南是通用流程的重要补充、或读者需要知道其存在时才添加

#### 通用规则

- 若对应的目录或文件不存在，应自动创建
- 更新已有文件时，追加或修订相关章节，保持文档结构清晰，避免重复堆砌
