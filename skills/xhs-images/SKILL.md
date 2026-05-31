---
name: xhs-images
description: Generates Xiaohongshu infographic series for MediaManager. Breaks note content into 1-10 images optimized for XHS. Use when user mentions 小红书图片, XHS images, xhs-images, or xhs content family illustration in write-and-publish workflow.
---

> **编排入口**：多 skill 组合流程请使用 [`media-manager`](../media-manager/SKILL.md) 总控 skill 与 `media` CLI。本 skill 为 deep-dive。

**调用方式**：在 write-and-publish Step 4（xhs / full-stack 分支），主编排 **优先 Subagent 委派**本 skill；不支持 Subagent 时 inline 同等流程。见 [`orchestration.md`](../media-manager/references/orchestration.md)。

# XHS Images

为小红书笔记生成信息图轮播。输入 `note.md`（或从 `article.md` 提炼），输出到 `output/{slug}/xhs-images/`，并回写 `note.md` frontmatter `images:`。

## 上游

基于 [JimLiu/baoyu-skills · baoyu-xhs-images](https://github.com/JimLiu/baoyu-skills/tree/main/skills/baoyu-xhs-images) 改造。详见 [ATTRIBUTION.md](ATTRIBUTION.md)。

## CLI 协作

```bash
media workspace show
media image gen --prompt "..." --image output/{slug}/xhs-images/01-cover.png
```

## 出图降级策略

1. **首选**：`media image gen` / `baoyu-image-gen`
2. **降级**：宿主 Agent 内置生图工具
3. **终止**：明确告知无法出图，勿伪造路径

## 目录约定

```
output/{slug}/
├── note.md                 ← 输入（优先）/ 回写 images:
├── article.md              ← 可选，提炼模式输入
└── xhs-images/
    ├── analysis.md
    ├── outline.md
    ├── prompts/
    └── *.png
```

## 默认参数（可被 guidance 或用户覆盖）

| 项 | 默认 |
|----|------|
| style | `notion` |
| layout | `dense` |
| 张数 | 5–7 |

偏好来源（优先级从高到低）：用户本次指定 → `$WORKSPACE/guidance/writing/platform/xiaohongshu.md` → skill `.config/EXTEND.md`

## 风格（按需读取 `references/presets/<name>.md`）

| Style | 适用 |
|-------|------|
| `notion` | 知识干货、SaaS、概念（默认） |
| `chalkboard` | 教程、课堂感 |
| `study-notes` | 手写笔记风、清单 |
| `bold` | 避坑、强观点 |
| `minimal` | 专业简洁 |

布局：`sparse` / `balanced` / `dense` / `list` / `comparison` / `flow` / `mindmap` / `quadrant` — 详见 `references/elements/canvas.md`

## 工作流（4 步）

### Step 1：分析

1. 读取 `$WORKSPACE/output/{slug}/note.md`（优先）或 `article.md`
2. 按 [`references/workflows/analysis-framework.md`](references/workflows/analysis-framework.md) 做轻量分析
3. 写入 `xhs-images/analysis.md`（内容类型、钩子、建议张数、推荐 style/layout）
4. 向用户展示摘要（无需单独门禁，除非信息不足）

### Step 2：Outline（须用户确认）

1. 生成**单份** `xhs-images/outline.md`（默认信息密集型：结论 → 要点卡片 → 建议/CTA）
2. YAML frontmatter 含 `style`、`layout`、`image_count`、各页 `P1`…`Pn` 要点
3. 模板见 [`references/workflows/outline-template.md`](references/workflows/outline-template.md)
4. **停住**，等待用户确认或修改；确认前不出图

### Step 3：生成图片

1. 每张 prompt 存入 `xhs-images/prompts/NN-{type}.md`
2. **封面先出**，后续张用 `--ref` 指向 `01-cover.png` 保持风格一致
3. 竖版比例优先（见 `references/elements/canvas.md`）
4. 调用 [`references/workflows/prompt-assembly.md`](references/workflows/prompt-assembly.md) 组装 prompt
5. 可选：用户逐张审查；不满意则改 prompt 后重生成该张

### Step 4：回写 note.md

更新 frontmatter `images:` 为绝对或相对于 `note.md` 的路径列表，顺序与轮播一致：

```yaml
images:
  - ./xhs-images/01-cover.png
  - ./xhs-images/02-content.png
```

发布：`media xhs post-note --file output/{slug}/note.md --cdp-url ...`

## 与 article-writer 分工

- **article-writer**：选题、note 正文与标题（≤20 字）、提纲（full-stack 时长文提纲另走 longform）
- **xhs-images**：信息图分析、outline、出图、回写 images 列表

## References（按需加载，勿全部嵌入上下文）

- `references/workflows/analysis-framework.md`
- `references/workflows/outline-template.md`
- `references/workflows/prompt-assembly.md`
- `references/presets/<style>.md`
- `references/elements/canvas.md`, `typography.md`, `decorations.md`, `image-effects.md`

## 边界

- 不将长文 `article.md` 直接作为 post-note 输入
- 不阻塞于 EXTEND.md 首次配置（有默认值）
- 不默认生成三套 A/B/C outline
