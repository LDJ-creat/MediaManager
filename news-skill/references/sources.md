# RSS 源配置

> 直接编辑此文件即可新增/删除/修改 RSS 源，无需改动代码。
> `source_hint` 仅作为 LLM 分类的参考提示，最终分类由文章实际内容决定。

## RSS 源列表

| 名称 | URL | source_hint | weight |
|------|-----|-------------|--------|
| V2EX | https://www.v2ex.com/feed/tab/tech.xml | 开发与工程 | 1.0 |
| Anthropic | https://raw.githubusercontent.com/taobojlen/anthropic-rss-feed/main/anthropic_engineering_rss.xml | AI前沿 | 1.2 |
| OpenAI | https://openai.com/news/engineering/rss.xml | AI前沿 | 1.2 |
| GitHub | https://github.blog/feed/ | 开发与工程 | 1.1 |
| Andrew Wang | https://api.xgo.ing/rss/user/08b5488b20bc437c8bfc317a52e5c26d | AI前沿 | 1.1 |
| Karpathy | https://api.xgo.ing/rss/user/edf707b5c0b248579085f66d7a3c5524 | AI前沿 | 1.2 |
| 宝玉 | https://baoyu.io/feed.xml | AI前沿 | 1.1 |
| info | https://wechat2rss.bestblogs.dev/feed/13da94d7eb314b49fa251cb7e8399cae29d772db.xml | 产品与行业 | 1.0 |
| 阿里云开发者 | https://wechat2rss.bestblogs.dev/feed/39fc51b0b1316137e608c45da5dbbca4f9eb9538.xml | 大厂动态 | 1.0 |
| 字节跳动 | https://wechat2rss.bestblogs.dev/feed/d3a9e4d6f125cc98d1691dbc30cd97fec7ae2d03.xml | 大厂动态 | 1.0 |
| 极客公园 | https://wechat2rss.bestblogs.dev/feed/11ea7163fbea99e2ab9fa2812ac3d179574886cc.xml | 产品与行业 | 1.0 |

## 全局参数

| 参数 | 值 | 说明 |
|------|----|------|
| TOP_PICKS_COUNT | 3 | 💎 今日精选数量 |
| MAX_PER_SOURCE | 5 | 每个RSS源最多取几条 |
| GLOBAL_MAX | 40 | 送入LLM前的全局上限 |
| TIME_WINDOW_HOURS | 48 | 只抓取多少小时内的文章 |
| DEDUP_RETENTION_DAYS | 7 | seen_urls.json 保留天数 |
| BASE_THRESHOLD | 3.0 | LLM评分基准阈值（满分5分） |

## 板块定义

| 板块ID | 显示名称 | 图标 |
|--------|---------|------|
| AI前沿 | AI 前沿 | 🤖 |
| 开发与工程 | 开发与工程 | 🛠️ |
| 大厂动态 | 大厂动态 | 🏭 |
| 产品与行业 | 产品与行业 | 📦 |
