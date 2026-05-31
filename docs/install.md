# 安装

## Mode B（推荐终端用户）

```bash
npm install -g @dsmlll/media-manager-cli
# 安装过程中交互设置 workspace（回车使用默认 Documents 路径）

npx skills add LDJ-creat/MediaManager --skill media-manager -g -a cursor -a claude-code -y

media doctor
```

## Mode A（开发者）

```bash
git clone https://github.com/LDJ-creat/MediaManager.git
cd MediaManager
npm install
npm run build
media doctor
```

## Skill 按需安装

```bash
# 仅总控 skill
media skill install --minimal

# 全部 skill + guidance
media skill install
```

## 环境变量

- `MEDIA_WORKSPACE`：覆盖工作区路径
- `MEDIA_MANAGER_SKIP_SETUP=1`：跳过 postinstall 交互
