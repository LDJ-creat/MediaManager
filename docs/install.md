# 安装

## Mode B（推荐终端/Agent端用户--在Claude Code，Cursor，OpenClaw等Agent端使用）

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

`npm run build` 会编译 CLI 包、将 `skills/` 复制到 runtime bundle，并同步 workflow 到各 Agent 命令目录。详见 [sync.md](sync.md)。

## Skills 管理

```bash
media skill install              # 默认安装到 cursor、claude、codex
media skill install --target codex # 仅 Codex
media skill update
media skill uninstall
```



