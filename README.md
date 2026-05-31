# MediaManager — 自媒体自动化 CLI 与 Skill 工具集

面向技术自媒体的 **工作区驱动** 自动化工具：选题、写作、配图、发布、运营数据分析。通过 `media` CLI 与 `media-manager` 总控 Skill 串联全流程。

## 安装

### Mode B（推荐终端/Agent端用户--在Claude Code，Cursor，OpenClaw等Agent端使用）

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


| 命令                            | 说明                                    |
| ----------------------------- | ------------------------------------- |
| `media setup`                 | 初始化工作区与全局配置（二次运行展示当前状态摘要）             |
| `media workspace show`        | 显示当前工作区路径                             |
| `media doctor`                | 环境自检                                  |
| `media news fetch`            | 抓取 RSS 资讯                             |
| `media news sources edit`     | 编辑工作区 RSS 源                           |
| `media analytics fetch --all` | 抓取各平台运营数据                             |
| `media skill install`         | 安装 Skills（默认 cursor + claude + codex） |
| `media skill update`          | 更新 Skills                             |
| `media skill uninstall`       | 卸载 Skills                             |


完整契约见 [docs/cli-contract.md](docs/cli-contract.md) 与 [skills/media-manager/references/cli-contract.md](skills/media-manager/references/cli-contract.md)。

## Skill 布局

所有 Skill 位于 `skills/`：


| Skill                                        | 用途                                               |
| -------------------------------------------- | ------------------------------------------------ |
| **media-manager**                            | 总控编排（工作流入口）                                      |
| article-writer                               | 长文 / 小红书笔记写作                                     |
| article-illustrator                          | 长文自动配图                                           |
| xhs-images                                   | 小红书信息图轮播                                         |
| news-skill                                   | 每日科技资讯 RSS                                       |
| post-to-wechat                               | 微信公众号发布                                          |
| baoyu-image-gen                              | AI 图片生成--未配置API时，若Agent端支持，则降级为使用Agent端内置的图片生成功能 |
| csdn / juejin / xiaohongshu-publish-and-data | 平台发布与数据                                          |
| get-wechat-data                              | 公众号数据分析                                          |


子 Skill 为 deep-dive；多步流程请从 **media-manager** 或三套工作流入手。

## 上游 Skill 与致谢

部分 Skill 集成自开源项目，并向原作者致谢：


| 本仓库 Skill                                                                                                           | 来源                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `baoyu-image-gen`                                                                                                   | [JimLiu/baoyu-skills · baoyu-image-gen](https://github.com/JimLiu/baoyu-skills/tree/main/skills/baoyu-image-gen)                                               |
| `xhs-images` | 基于 [JimLiu/baoyu-skills · baoyu-xhs-images](https://github.com/JimLiu/baoyu-skills/tree/main/skills/baoyu-xhs-images) 改造，详见 [改造说明](skills/xhs-images/ATTRIBUTION.md) |
| `post-to-wechat`、`csdn-publish-and-data`、`juejin-publish-and-data`、`xiaohongshu-publish-and-data`、`get-wechat-data` | 微信 / CSDN / 掘金 / 小红书的自动发布与运营数据抓取，复用自本人此前的开源项目 [LDJ-creat/media-skills](https://github.com/LDJ-creat/media-skills)                                              |


## 工作流

1. **daily-digest** — RSS → 筛选 → 中文日报 → 去重（仅素材，不写作）
2. **write-and-publish** — 选题 → 写作 → 配图 → 多平台发布（无素材时可先 daily-digest）
3. **publish-only** — 已有成稿 → 选平台 → CLI 发布（不改写正文）
4. **analyze-operation** — 数据抓取 → 复盘 → 更新 guidance

定义见 `skills/media-manager/references/workflows/`（canonical）；`npm run build` 或 `npm run sync:workflows` 自动镜像到 `.agents/workflows`、`.cursor/commands`、`.claude/commands`、`.github/instructions/`。详见 [docs/sync.md](docs/sync.md)。

### 自动发布行为


| 平台             | 方式       | 说明                                                           |
| -------------- | -------- | ------------------------------------------------------------ |
| 微信 / CSDN / 掘金 | **保存草稿** | 自动写入各平台草稿箱并返回后台编辑链接（微信另返回 media_id）；需人工审阅后再正式发布              |
| 小红书            | **正式发布** | 笔记通过skill发布后即上线。小红书创作中心草稿为**本地浏览器保存**，无法跨设备 / 浏览器共享，故不使用草稿流程 |


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
    ├── news/sources.json   # RSS 源（Mode B 由 media news sources edit 管理）
    └── …
```

详见 [docs/workspace.md](docs/workspace.md)。

## Skills 管理

```bash
media skill install
media skill update
media skill uninstall
```

**Deprecated（开发兜底）：** `sync-skills.ps1` / `sync-skills.sh` 仍可用于 monorepo 本地同步。Skill 与工作流同步策略见 [docs/sync.md](docs/sync.md)。

## 配置

- 微信 / 图片 API：各 Skill 目录下 `.env`（参考 `.env.example`）
- 平台登录态：`media csdn auth export` 等，凭证存于 `.media-manager/auth/`
- RSS 源：
  - **Mode B（CLI 用户）**：`$WORKSPACE/.media-manager/news/sources.json`，运行 `media news sources edit` 编辑；`media news fetch` 优先读该文件，不存在时使用 CLI 内置默认源
  - **Mode A（开发者）**：可直接编辑 `skills/news-skill/references/sources.json`，或使用工作区配置（同上）

## 开发与发布

```bash
npm run build          # 含 skills → runtime 复制与工作流镜像同步
npm run sync:workflows # 仅同步 workflows → .agents / .cursor / .claude / .github
npm test
./scripts/smoke-install.ps1
```

发布流程见 [.github/workflows/release.yml](.github/workflows/release.yml)。OpenClaw / ClawHub 可选发布见 [docs/openclaw-clawhub.md](docs/openclaw-clawhub.md)。Skill / Workflow 同步说明见 [docs/sync.md](docs/sync.md)。

---

仅供学习与自媒体运营效率提升，请遵守各平台使用规范。