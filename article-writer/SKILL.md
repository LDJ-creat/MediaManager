---
name: article-writer
description: 技术自媒体文章写作工作流。支持自定义选题或调用 news-skill 从热点中选题，经提纲审批后按写作指南完成写作，输出含配图占位符的 Markdown 文章，支持审查修改与写作经验复盘。使用场景：用户需要写技术博客、自媒体文章、AI/编程/产品类科普文；支持平台参数（xiaohongshu、wechat）加载对应平台写作规范。触发词：写文章、写一篇、帮我写、创作文章、生成文章。
---

# Article Writer

技术自媒体文章写作工作流。输出物：`output/{slug}/article.md`，其中包含配图占位符，供 `article-illustrator` skill 使用。

## 工作目录约定

所有文章输出到 `output/{slug}/` 目录（`slug` 由文章标题自动生成，如 `bmad-framework-analysis`）：

```
output/{slug}/
├── article.md          ← 本 skill 输出
└── images/             ← 由 article-illustrator 填充
```

## 配图占位符格式

写作时在合适的位置插入：

```markdown
<!-- img: cover | 封面图描述，体现文章主题 -->

<!-- img: img-01 | 配图描述，说明此处配图的内容和作用 -->
```

- `cover`：封面图，放在文章头部（frontmatter 之后，正文第一句之前）
- `img-01`、`img-02`...：正文配图，按出现顺序编号，放在需要视觉辅助的段落之前

## 工作流

### Step 1：确定选题

**分支 A — 用户已提供选题**：直接进入 Step 2。

**分支 B — 用户无明确选题**：
1. **加载选题指南**（如有）：检查项目根目录下是否存在 `guidance/topic-selection.md`。若存在，在筛选选题前加载，作为选题偏好、风格、受众定位的核心依据。
2. **获取热点并落盘**：调用 `news-skill` 获取近期热点。**要求执行完整流程**，包含日报 Markdown 文件的生成与去重记录（以确保数据持久化，防止多轮对话后丢失原始信息）。
3. **筛选并推荐**：结合“选题指南”，从 `news-skill` 生成的日报或原始数据中筛选 3-5 个适合写作的候选选题（列出选题标题 + 一句话说明写作角度）。
4. **交互确认**：让用户选择。若用户不满意或要求“更多选题”，可重新读取落盘的日报数据进行二次推荐。

### Step 2：列提纲并审批

1. 判断文章类型：概念讲解 / 工程案例 / 个人经历分享（影响导入方式和结构逻辑，详见写作指南）
2. 输出提纲：含完整章节结构 + 各节要点 + 预计总字数
3. 等待用户审批，按反馈迭代修改，直至用户确认

### Step 3：写作

**加载顺序**（每次写作前执行）：

1. 读取 `guidance/writing/general.md`（通用写作指南）
2. 若用户指定平台（`--platform xiaohongshu` / `--platform wechat`）：额外读取 `guidance/writing/platform/{platform}.md`
3. 若用户在本次调用中提出了具体写作要求：优先级最高，覆盖指南中的冲突规则

**写作要点**：
- 按提纲展开，遵循写作指南的行文规范
- 在合适位置插入配图占位符（每篇至少 1 个封面 + 1-3 个正文配图，视文章长度和内容类型决定）
- 输出完整文章到 `output/{slug}/article.md`

**Slug 生成规则**：取文章标题的关键词，转为小写英文加连字符，例如 `BMAD 框架深度解析` → `bmad-framework-analysis`

### Step 4：审查与修改

1. 呈现文章给用户（或告知文件路径）
2. 按用户反馈修改，可多轮迭代
3. 用户明确表示满意后进入 Step 5

### Step 5：复盘与更新写作指南

1. 复盘本次修改过程，提炼 1-3 条有实际价值的写作经验或注意点
2. 向用户展示提炼结果，询问是否更新到对应写作指南：
   - 通用经验 → `guidance/writing/general.md`
   - 平台专属经验 → `guidance/writing/platform/{platform}.md`（不存在则创建）
3. 用户同意后更新对应文件；用户拒绝则跳过

## References

- **选题指南**：`guidance/topic-selection.md` — 存在时在 Step 1 加载
- **通用写作指南**：`guidance/writing/general.md` — 在 Step 3 写作前加载，适用于所有文章
- **平台专项指南**：`guidance/writing/platform/xiaohongshu.md`、`guidance/writing/platform/wechat.md` — 仅在用户指定平台时额外加载
