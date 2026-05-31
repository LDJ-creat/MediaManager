# 安装

## Mode B（推荐终端用户）

```bash
npm install -g @dsmlll/media-manager-cli
media setup
media doctor
```

`media setup` 会初始化工作区、可选配置平台登录凭证，并自动安装 Skills。二次运行时会展示当前配置摘要。

`--target` 默认为 `all`（Cursor + Claude Code + Codex）。

## Mode A（开发者）

```bash
git clone https://github.com/LDJ-creat/MediaManager.git
cd MediaManager
npm install
npm run build
media doctor
```

## Skills 管理

```bash
media skill install              # 默认安装到 cursor、claude、codex
media skill install --target codex # 仅 Codex
media skill update
media skill uninstall
```

## 环境变量

- `MEDIA_WORKSPACE`：覆盖工作区路径
- `MEDIA_MANAGER_SKIP_SETUP=1`：跳过 postinstall 交互
- `MEDIA_MANAGER_SKIP_SKILLS=1`：`media setup` 时跳过 Skills 安装
- `MEDIA_MANAGER_SKIP_AUTH_SETUP=1`：`media setup` 时跳过平台凭证配置
