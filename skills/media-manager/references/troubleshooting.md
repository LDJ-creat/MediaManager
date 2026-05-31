# 故障排查

## `media workspace show` 失败

运行 `media setup --interactive` 或设置 `MEDIA_WORKSPACE`。

## `media doctor` 报 runtime skills 缺失

在 monorepo 根目录执行 `npm install && npm run build`。

## Playwright / 登录态

```bash
media csdn auth export
media juejin auth export
media wechat auth export
media xhs auth export
media csdn auth check   # 各平台同理
```

凭证目录：`$WORKSPACE/.media-manager/auth/{platform}/storageState.json`

## news fetch 为空

1. **确认实际使用的 RSS 配置**（`media news fetch` 会在 stderr 打印）：
  ```text
   [INFO] RSS 配置: ...
  ```
  - CLI 用户：若存在 `$WORKSPACE/.media-manager/news/sources.json`，**优先读该文件**（由 `media news sources edit` 创建/编辑）
  - 不存在工作区配置时，才使用内置默认 `references/sources.json`（runtime 包内）
  - **不要**只改 `~/.cursor/skills/news-skill/...，~/.claude/skills/news-skill/...,~/.agents/skills/news-skill/...中的内容`，`media news fetch` 不会读取 Agent 目录里的副本
2. **预览抓取（跳过去重）**：
  ```bash
   media news fetch --preview --skip-dedup
  ```
   若仍为空，多为 RSS 源不可达、超时或时间窗口内无新文章。
3. **检查/重置工作区 RSS 源**：
  ```bash
   media news sources edit
  ```
   首次运行会从默认源复制；检查 JSON 格式、`sources[].url` 是否有效、`params.TIME_WINDOW_HOURS` 是否过短。
4. **源码开发者**：可直接编辑 `skills/news-skill/references/sources.json` 后 `npm run build`（更新 runtime bundle）。

## analytics 聚合

`media analytics fetch --all` 产出 `$WORKSPACE/output/analysis/YYYY-MM-DD/manifest.json`。

## OpenClaw / ClawHub（可选）

见 [docs/openclaw-clawhub.md](../../../docs/openclaw-clawhub.md)。