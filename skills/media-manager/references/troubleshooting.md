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

`media news fetch --preview --skip-dedup`；检查 `skills/news-skill/references/sources.json`。

## analytics 聚合

`media analytics fetch --all` 产出 `$WORKSPACE/output/analysis/YYYY-MM-DD/manifest.json`。

## OpenClaw / ClawHub（可选）

见 [docs/openclaw-clawhub.md](../../../docs/openclaw-clawhub.md)。
