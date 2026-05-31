# 工作区

MediaManager 使用 **工作区（workspace）** 存放文章、配图、guidance、资讯与 analytics 数据。

## Mode A（开发者）

Clone 仓库后，**repo 根目录** 即 workspace（存在 `.media-manager/repo-marker.json`）。

## Mode B（CLI 用户）

安装 `@dsmlll/media-manager-cli` 时交互设置 workspace，默认：

- Windows：`Documents\MediaManager-Workspace`
- macOS/Linux：`~/Documents/MediaManager-Workspace`

配置：`~/.media-manager/config.json`

## 目录布局

```text
{workspace}/
├── output/{slug}/article.md
├── output/analysis/
├── guidance/
└── .media-manager/
    ├── config.json
    ├── news/sources.json      # RSS 源（media news sources edit）
    ├── data/news/
    └── data/analytics/{platform}/
    └── auth/{platform}/
```

## 解析优先级

1. `--workspace` / `MEDIA_WORKSPACE`
2. `~/.media-manager/config.json`（Mode B：`media setup` 写入的全局工作区）
3. 从当前目录向上查找 `.media-manager/config.json`
4. repo marker（Mode A：clone 仓库根目录）
