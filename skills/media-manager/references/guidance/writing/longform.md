# 长文写作指南（微信 / CSDN / 掘金）

与 `general.md` 一起加载。三平台共用正文，不在写作期区分平台风格。

## 篇幅与结构

- 目标 2000–4000 字（教程/深度文可更长）
- 推荐结构：背景 → 核心观点/方案 → 展开论证 → 实践建议 → 小结
- 代码示例：完整可读片段优于碎片化省略

## Markdown 规范

- 一级标题与 frontmatter `title` 一致时可从正文移除（发布脚本会自动处理）
- 外链保留；微信发布时会转为底部引用（见 `publishing/platform/wechat.md`）
- 封面使用 `<!-- cover_path: ./images/cover.png -->`，不在正文插入大图

## 输出

- 路径：`output/{slug}/article.md`
- 配图由 `article-illustrator` 写入 `output/{slug}/images/`

## 禁止在写作期加载

- `publishing/platform/wechat.md`、`csdn.md`、`juejin.md`（发布期才加载）
- 勿因单平台标题偏好改写整篇正文结构
