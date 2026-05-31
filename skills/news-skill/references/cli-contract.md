# CLI 契约（资讯）

| 命令 | 说明 |
|------|------|
| `media news fetch [--preview] [--hours N]` | 抓取 RSS（优先 `$WORKSPACE/.media-manager/news/sources.json`） |
| `media news mark-seen [--date YYYY-MM-DD]` | 去重记录 |
| `media news sources edit` | 打开/初始化工作区 RSS 源配置 |

数据目录：`$WORKSPACE/.media-manager/data/news/`。RSS 源配置：`$WORKSPACE/.media-manager/news/sources.json`。
