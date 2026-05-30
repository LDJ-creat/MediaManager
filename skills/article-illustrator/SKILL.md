---
name: article-illustrator
description: "为写好的 Markdown 文章设计配图提示词并生成图片。自动解析文章中的配图占位符，设计封面图和正文配图的生成提示词，调用 baoyu-image-gen 生成图片，将图片存放到文章对应目录，并将图片路径回写到文章中。触发场景：用户完成文章写作后需要配图、为已有 Markdown 文章生成插图、帮我配图、生成文章图片。"
---

# Article Illustrator

为文章设计并生成配图。读取 `article-writer` 输出的文章，解析配图占位符，设计提示词，调用 `baoyu-image-gen` 生成图片，回写文章。

## 目录结构约定

```
output/{slug}/
├── article.md                ← 读取（由 article-writer 生成），回写时追加图片引用
└── images/
    ├── cover.png             ← 封面图
    ├── img-01.png            ← 正文配图
    └── prompts/              ← 提示词存档
        ├── cover.md
        └── img-01.md
```

## 配图占位符格式（约定）

```markdown
<!-- img: cover | 封面图描述 -->
<!-- img: img-01 | 正文配图描述，说明内容和位置 -->
```

## 工作流

### Step 1：加载文章与配置

1. 用户提供文章路径（如 `output/bmad-framework/article.md`）
2. 读取文章，提取所有 `<!-- img: {id} | {desc} -->` 占位符
3. 读取 `references/image-style-guide.md`（默认风格指南）
4. 若用户在本次调用中提出了具体风格要求：优先级最高，覆盖风格指南中的冲突规则
5. 向用户展示解析到的占位符列表，确认数量和位置无误

### Step 2：设计提示词

为每个占位符设计英文图像生成提示词，综合以下输入：

- 占位符的语义描述（`desc` 字段）
- 该占位符所在段落的前后文（结合文章理解配图语境）
- 风格指南要求
- 用户临时风格要求（若有）

**封面图提示词重点**：整体调性、视觉冲击力、文章核心主题的象征化表达，宽幅构图。

**正文配图提示词重点**：与对应段落内容强相关，优先选择信息可视化、流程图、对比图等辅助理解的形式，而非纯装饰性插图。

输出格式：
```
封面 (cover)
描述：{desc}
提示词：{英文 prompt}

图片 1 (img-01)
描述：{desc}
提示词：{英文 prompt}
```

### Step 3：审查提示词

等待用户确认或提出修改意见，按反馈迭代，直至用户确认全部提示词。

### Step 4：生成图片

将每条提示词保存到 `output/{slug}/images/prompts/{id}.md`，然后调用 `baoyu-image-gen` 生成图片。

**尺寸规则**：
- 封面：`--ar 16:9`，输出 `output/{slug}/images/cover.png`
- 正文配图：`--ar 4:3`（默认），输出 `output/{slug}/images/{id}.png`

**调用方式**（2张及以上使用 batchfile 批量生成）：

单张：
```bash
# 封面
${BUN_X} {baoyu-image-gen-baseDir}/scripts/main.ts --promptfiles "output/{slug}/images/prompts/cover.md" --image "output/{slug}/images/cover.png" --ar 16:9

# 正文配图
${BUN_X} {baoyu-image-gen-baseDir}/scripts/main.ts --promptfiles "output/{slug}/images/prompts/img-01.md" --image "output/{slug}/images/img-01.png" --ar 4:3
```

多张（batchfile）：先将所有任务整理成 batch.json，再调用 `baoyu-image-gen` 的 `--batchfile` 模式一次性生成。

### Step 5：审查图片与回写文章

1. 通知用户图片存放路径（列出所有生成的图片路径）
2. 用户审查：
   - **满意**：进入回写
   - **不满意某张**：用户说明修改意见 → 更新 `images/prompts/{id}.md` → 重新调用 `baoyu-image-gen` 生成该张
3. 所有图片确认后，回写 `article.md`：
   - 对于 **正文配图**（如 `img-01` 等），在占位符注释下方追加图片引用：
     ```markdown
     <!-- img: img-01 | 原始描述 -->
     ![配图](./images/img-01.png)
     ```
   - 对于 **封面图**（`cover`），为了避免在各平台的正文中直接渲染出大图（与平台自身的独立封面设置冲突），需追加为隐式的专用提取注释格式：
     ```markdown
     <!-- img: cover | 原始描述 -->
     <!-- cover_path: ./images/cover.png -->
     ```

### Step 6：复盘与更新风格指南

1. 复盘本次提示词修改过程，提炼 1-3 条用户的配图偏好或风格要求
2. 询问用户是否更新 `references/image-style-guide.md`（不存在则创建）
3. 用户同意后更新文件；用户拒绝则跳过

## References

- **配图风格指南**：`references/image-style-guide.md` — 在 Step 1 加载，提供整体配图风格规范
