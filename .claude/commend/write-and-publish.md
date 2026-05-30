---
description: 选题、写作、配图并发布到 微信/CSDN/掘金
---

本工作流将串联多个 Skill，实现从选题确认到多平台发布的自动化运营闭合回路。

### 第一步：选题确定与文章撰写 (Writing)
调用 `./article-writer/SKILL.md` 进行核心创作流程。
1. **选题确认**：如果用户已提供选题则直接开始；若无，则由该 Skill 自动调用 `news-skill` 生成推荐。
2. **提纲与写作**：按该 Skill 指引完成提纲审批并生成文章,生成的文章需要请求用户进行审稿。
3. **输出路径**：文章最终应产出到 `./output/{slug}/article.md`。

### 第二步：配图设计与生成 (Illustration)
针对已撰写的文章，调用 `./article-illustrator/SKILL.md` 进行视觉增强。
1. 自动读取 `./output/{slug}/article.md` 中的配图占位符。
2. 生成封面图（cover）及正文插图（img-01, img-02...）。
3. 配图产物应统一存放至 `./output/{slug}/images/`。

### 第三步：多平台发布 (Multi-platform Publishing)
从 `./output/{slug}/` 中提取最终稿件和图片，发布至目标平台的草稿箱。
1. **微信公众号**：调用 `./baoyu-post-to-wechat/` 下的发布脚本。
2. **CSDN**：调用 `./csdn-publish-and-data/` 下的发布脚本。
3. **掘金**：调用 `./juejin-publish-and-data/` 下的发布脚本。

### 第四步：归档汇总
在任务完成后，记录本次发布的 `media_id` 或链接，并将 `./output/{slug}/` 标记为已完成。
