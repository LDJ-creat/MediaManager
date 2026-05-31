# 运行前提

## CLI

- Node.js >= 20
- 已安装 `@dsmlll/media-manager-cli`（`npm install -g @dsmlll/media-manager-cli`）
- 已配置工作区（安装 CLI 时交互 setup，或 `media setup --interactive`）

## Skill

```bash
npx skills add LDJ-creat/MediaManager --skill media-manager -g -a cursor -a claude-code -y
```

或 `media skill install --minimal`

## 其他运行时

- **Bun** 或 `npx -y bun`：微信公众号、AI 出图
- **Playwright Chromium**：CSDN、掘金、小红书、微信数据抓取
- **tsx**：news 与各平台 TS 脚本（CLI 自动 spawn）

## 工作区

默认：`~/Documents/MediaManager-Workspace`（Windows：`Documents\MediaManager-Workspace`）

开发者 clone 仓库后，repo 根目录即 workspace（Mode A）。
