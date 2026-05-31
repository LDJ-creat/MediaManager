# media CLI 契约

## 全局

- `--workspace <path>` 或环境变量 `MEDIA_WORKSPACE`
- 退出码：`0` 成功，非 `0` 失败
- 日志：`[INFO]`/`[ERROR]` 走 stderr；机器可读 JSON 走 stdout（如 `media news fetch`）

## Setup

| 命令 | 说明 |
|------|------|
| `media setup [--interactive] [--skip-auth] [--skip-secrets]` | 初始化工作区、登录凭证、API 密钥 |
| `media config show [--json]` | 凭证/API 配置状态（不含密钥明文） |
| `media workspace show` | 输出 workspace 与路径 JSON |
| `media workspace set <path>` | 更改工作区 |
| `media doctor` | 环境与健康检查 |
| `media skill install [--target cursor\|claude\|codex\|all]` | 安装 Skills（默认 all） |
| `media skill update [--target cursor\|claude\|codex\|all]` | 更新 Skills（默认 all） |
| `media skill uninstall` | 卸载 Skills |

## News

| 命令 | 说明 |
|------|------|
| `media news fetch [--hours N] [--preview] [--skip-dedup]` | RSS 抓取 → stdout JSON + `.media-manager/data/news/latest_articles.json`（RSS 源见 `.media-manager/news/sources.json`） |
| `media news mark-seen [--date YYYY-MM-DD] [--status]` | 更新去重记录 |
| `media news sources edit` | 打开工作区 RSS 源配置（首次从默认复制） |

## 平台

| 命令 | 说明 |
|------|------|
| `media wechat post ...` | 微信公众号草稿箱（返回 media_id 与后台编辑链接） |
| `media wechat config api` | 配置/更新微信 API 密钥（AppID/AppSecret） |
| `media wechat analytics fetch` | 公众号数据 |
| `media csdn post --file <md> [--draft]` | CSDN 草稿（返回编辑链接；不自动正式发布） |
| `media csdn analytics fetch` | CSDN 数据 |
| `media juejin post --file <md> [--draft]` | 掘金草稿（返回编辑链接；不自动正式发布） |
| `media juejin analytics fetch` | 掘金数据 |
| `media xhs post-note ...` | 小红书图文**正式发布**（非草稿；`--draft` 无效） |
| `media image gen --prompt "..." --image out.png` | AI 出图 |
| `media image-gen config` | 配置/更新图片生成 API 密钥与默认 Provider |
| `media analytics fetch --all` | 并行抓取各平台 analytics |

微信 / CSDN / 掘金 / 小红书发布与数据 Skill 复用自 [media-skills](https://github.com/LDJ-creat/media-skills)。小红书因草稿无法跨设备共享，采用直接发布而非存草稿。
