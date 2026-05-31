# Daily Digest 工作流

生成「每日科技资讯」日报与 RSS 素材。**不含**完整写作与发布；写作见 [write-and-publish](write-and-publish.md)，仅发布见 [publish-only](publish-only.md)。

执行前先 `media workspace show`。

## 步骤

### 1. 抓取 RSS

```bash
media news fetch
```

预览：`media news fetch --preview`

自定义 RSS 源：`media news sources edit`（配置位于 `$WORKSPACE/.media-manager/news/sources.json`）

数据目录：`$WORKSPACE/.media-manager/data/news/`

### 2. LLM 分析

读取 `latest_articles.json`，按 `news-skill` skill 规则评分、分类、写中文摘要。

### 3. 写入日报

写入 `$WORKSPACE/.media-manager/data/news/digests/YYYY-MM-DD.md`

### 4. 去重

1. 将选中 URL 写入 `$WORKSPACE/.media-manager/data/news/selected_urls.json`
2. `media news mark-seen`

## 参考

- Deep-dive：`news-skill` skill
- 筛选细则：`../../skills/news-skill/references/prompts.md`
