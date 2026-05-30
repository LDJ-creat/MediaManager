# media CLI 契约

## 全局

- `--workspace <path>` 或环境变量 `MEDIA_WORKSPACE`
- 退出码：`0` 成功，非 `0` 失败
- 日志：`[INFO]`/`[ERROR]` 走 stderr；机器可读 JSON 走 stdout（如 `media news fetch`）

## Setup

| 命令 | 说明 |
|------|------|
| `media setup [--interactive]` | 初始化工作区 + 写 `~/.media-manager/config.json` |
| `media workspace show` | 输出 workspace 与路径 JSON |
| `media workspace set <path>` | 更改工作区 |
| `media init [path] [--with-cursor]` | 补全目录；可选写入 `.cursor/commands` |
| `media doctor` | 环境与健康检查 |
| `media skill install [--minimal]` | 安装 skill 到 Agent 目录 |

## News

| 命令 | 说明 |
|------|------|
| `media news fetch [--hours N] [--preview] [--skip-dedup]` | RSS 抓取 → stdout JSON + `.media-manager/data/news/latest_articles.json` |
| `media news mark-seen [--date YYYY-MM-DD] [--status]` | 更新去重记录 |

## 平台

| 命令 | 说明 |
|------|------|
| `media wechat post ...` | 微信公众号草稿 |
| `media wechat analytics fetch` | 公众号数据 |
| `media csdn post --file <md> [--draft]` | CSDN 草稿 |
| `media csdn analytics fetch` | CSDN 数据 |
| `media juejin post --file <md> [--draft]` | 掘金草稿 |
| `media juejin analytics fetch` | 掘金数据 |
| `media xhs post-note ...` | 小红书图文 |
| `media image gen --prompt "..." --image out.png` | AI 出图 |
| `media analytics fetch --all` | 并行抓取各平台 analytics |
