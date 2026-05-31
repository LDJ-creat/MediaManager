# Prompt 组装

从 preset + layout + outline 单页条目组装生图 prompt，存入 `prompts/NN-{type}-{slug}.md`。

## 结构

```markdown
Create a Xiaohongshu infographic (portrait 3:4, hand-drawn illustration style).

## Style
（从 presets/{style}.md 摘：色板、视觉元素、字体气质）

## Layout
（从 elements/canvas.md 摘：密度、留白、结构）

## Content
- Position: Cover | Content | Ending
- Text: （outline 该页标题与要点，与 note 语言一致）
- Visual: （outline 视觉描述）

Language: 与 note.md 正文一致（中文用「」、，。）
```

## 组装步骤

1. 读 `presets/{style}.md` → Style 段
2. 读 `elements/canvas.md` 中对应 layout → Layout 段
3. 从 `outline.md` 当前页复制 Text + Visual → Content 段
4. 写入 `prompts/NN-*.md`

## 系列一致性

1. **封面先出**（无 `--ref`）
2. **第 2 张起** 用 `--ref` 指向 `01-cover.png`（或 `media image gen` 等价参数）
3. 竖版 3:4；调用 `media image gen` / `baoyu-image-gen`

## 检查

- [ ] style/layout 与 outline frontmatter 一致
- [ ] 文案语言与 note 一致
- [ ] 无与 preset 冲突的写实/摄影指令（除非 preset 另有说明）
- [ ] 封面已存在后再 ref 后续张

## 水印

默认**不**加水印。用户明确要求时再在 Content 段末尾加一行说明。
