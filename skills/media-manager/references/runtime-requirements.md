# 运行前提

## CLI

- Node.js >= 20
- 已安装 `@dsmlll/media-manager-cli`（`npm install -g @dsmlll/media-manager-cli`）
- 已配置工作区（`media setup`）

## Skills

`media setup` 会自动安装 Skills（默认 Cursor、Claude Code、Codex）。也可手动：

```bash
media skill install              # --target 默认 all
media skill install --target codex
media skill update
```

写作/配图相关：`article-writer`、`article-illustrator`（longform）、`xhs-images`（小红书信息图，依赖 `baoyu-image-gen` / `media image gen`）。

Guidance 模板在 `media setup` 时 seed 到工作区 `guidance/`（canonical 源：`skills/media-manager/references/guidance/`）。

## 其他运行时

- **Bun** 或 `npx -y bun`：微信公众号、AI 出图
- **Playwright Chromium**：CSDN、掘金、小红书、微信数据抓取
- **tsx**：news 与各平台 TS 脚本（CLI 自动 spawn）

## 工作区

默认：`~/Documents/MediaManager-Workspace`（Windows：`Documents\MediaManager-Workspace`）

开发者 clone 仓库后，repo 根目录即 workspace（Mode A）。
