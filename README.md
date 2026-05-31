# MediaManager — 自媒体自动化 CLI 与 Skill 工具集

面向技术自媒体的 **工作区驱动** 自动化工具：选题、写作、配图、发布、运营数据分析。通过 `media` CLI 与 `media-manager` 总控 Skill 串联全流程。

## 安装

### Mode B（终端用户，推荐）

```bash
npm install -g @dsmlll/media-manager-cli
media setup
media doctor
```

安装时交互设置工作区（默认 `Documents/MediaManager-Workspace`），并自动安装 Skills。详见 [docs/install.md](docs/install.md)。

### Mode A（开发者）

```bash
git clone https://github.com/LDJ-creat/MediaManager.git
cd MediaManager
npm install && npm run build
media doctor
```

Repo 根目录即工作区（`.media-manager/repo-marker.json`）。

## 核心命令

| 命令 | 说明 |
|------|------|
| `media setup` | 初始化工作区与全局配置（二次运行展示当前状态摘要） |
| `media workspace show` | 显示当前工作区路径 |
| `media doctor` | 环境自检 |
| `media news fetch` | 抓取 RSS 资讯 |
| `media analytics fetch --all` | 抓取各平台运营数据 |
| `media skill install` | 安装 Skills（默认 cursor + claude + codex） |
| `media skill update` | 更新 Skills |
| `media skill uninstall` | 卸载 Skills |

完整契约见 [docs/cli-contract.md](docs/cli-contract.md) 与 [skills/media-manager/references/cli-contract.md](skills/media-manager/references/cli-contract.md)。

## Skill 布局

所有 Skill 位于 `skills/`：

| Skill | 用途 |
|-------|------|
| **media-manager** | 总控编排（工作流入口） |
| article-writer | 长文 / 小红书笔记写作 |
| article-illustrator | 长文自动配图 |
| xhs-images | 小红书信息图轮播 |
| news-skill | 每日科技资讯 RSS |
| post-to-wechat | 微信公众号发布 |
| baoyu-image-gen | AI 图片生成 |
| csdn / juejin / xiaohongshu-publish-and-data | 平台发布与数据 |
| get-wechat-data | 公众号数据分析 |

子 Skill 为 deep-dive；多步流程请从 **media-manager** 或三套工作流入手。

## 工作流

1. **daily-digest** — RSS → 筛选 → 中文日报 → 去重（仅素材，不写作）  
2. **write-and-publish** — 选题 → 写作 → 配图 → 多平台发布（无素材时可先 daily-digest）  
3. **publish-only** — 已有成稿 → 选平台 → CLI 发布（不改写正文）  
4. **analyze-operation** — 数据抓取 → 复盘 → 更新 guidance  

定义见 `skills/media-manager/references/workflows/`，已镜像到 `.cursor/commands`、`.claude/commands`、`.github/instructions/`。

## 工作区目录

```text
{workspace}/
├── output/{slug}/
│   ├── article.md          # longform（微信/CSDN/掘金）
│   ├── note.md             # 小红书
│   ├── images/             # 长文配图
│   └── xhs-images/         # 小红书轮播图
├── guidance/               # 个人工作区（gitignore，setup 时从模板 seed）
│   ├── topic-selection/    # general, longform, platform/xiaohongshu
│   ├── writing/
│   ├── publishing/platform/
│   └── analytics/platform/
└── .media-manager/
```

详见 [docs/workspace.md](docs/workspace.md)。

## Skills 管理

```bash
media skill install
media skill update
media skill uninstall
```

**Deprecated（开发兜底）：** `sync-skills.ps1` / `sync-skills.sh` 仍可用于 monorepo 本地同步。

## 配置

- 微信 / 图片 API：各 Skill 目录下 `.env`（参考 `.env.example`）
- 平台登录态：`media csdn auth export` 等，凭证存于 `.media-manager/auth/`
- RSS 源：`skills/news-skill/references/sources.json`

## 开发与发布

```bash
npm run build
npm test
./scripts/smoke-install.ps1
```

发布流程见 [.github/workflows/release.yml](.github/workflows/release.yml)。OpenClaw / ClawHub 可选发布见 [docs/openclaw-clawhub.md](docs/openclaw-clawhub.md)。

---
仅供学习与自媒体运营效率提升，请遵守各平台使用规范。
