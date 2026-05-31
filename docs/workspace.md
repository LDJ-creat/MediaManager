# 工作区

MediaManager 使用 **工作区（workspace）** 存放文章、配图、guidance、资讯与 analytics 数据。

## Mode A（开发者）

Clone 仓库后，**repo 根目录** 即 workspace（存在 `.media-manager/repo-marker.json`）。

### Guidance：模板 vs 个人数据

| 位置 | 是否入 git | 用途 |
|------|------------|------|
| `skills/media-manager/references/guidance/` | **是** | 默认模板（提 PR 修改） |
| `{workspace}/guidance/`（Mode A 即 repo 根 `guidance/`） | **否**（gitignore） | 你的个性化指南、复盘沉淀、场景 SOP |

`media setup` 只将**缺失**的模板文件复制到工作区 `guidance/`，**不会覆盖**已有文件。你可自由新增如 `writing/podcast_interview_sop.md`，不会被提交。

## Mode B（CLI 用户）

安装 `@dsmlll/media-manager-cli` 时交互设置 workspace，默认：

- Windows：`Documents\MediaManager-Workspace`
- macOS/Linux：`~/Documents/MediaManager-Workspace`

配置：`~/.media-manager/config.json`。`media setup` 会 seed guidance 模板到工作区。

## 目录布局

```text
{workspace}/
├── output/{slug}/
│   ├── article.md          # longform（微信 / CSDN / 掘金共用）
│   ├── note.md             # 小红书笔记
│   ├── images/             # 长文配图（article-illustrator）
│   └── xhs-images/         # 小红书轮播图（xhs-images skill）
├── output/analysis/
├── guidance/
│   ├── README.md
│   ├── topic-selection/
│   │   ├── general.md
│   │   ├── longform.md
│   │   └── platform/xiaohongshu.md
│   ├── writing/
│   │   ├── general.md
│   │   ├── longform.md
│   │   ├── platform/xiaohongshu.md
│   │   └── …                  # 可自由新增场景 SOP（仅本地）
│   ├── publishing/platform/   # 发布期加载（wechat, csdn, juejin）
│   └── analytics/platform/    # 复盘归档
└── .media-manager/
    ├── config.json
    ├── news/sources.json
    ├── data/news/
    ├── data/analytics/{platform}/
    └── auth/{platform}/
```

内容族与 guidance 加载规则见 `skills/media-manager/references/platform-families.md`。

## 解析优先级

1. `--workspace` / `MEDIA_WORKSPACE`
2. `~/.media-manager/config.json`（Mode B）
3. 从当前目录向上查找 `.media-manager/config.json`
4. repo marker（Mode A）
