# CLI 契约（CSDN）

编排入口：[media-manager](../../media-manager/SKILL.md)。完整契约见 [media-manager/references/cli-contract.md](../../media-manager/references/cli-contract.md)。

| 命令 | 说明 |
|------|------|
| `media csdn post --file <path> [--draft]` | 保存草稿 |
| `media csdn analytics fetch` | 抓取运营数据 |
| `media csdn auth export` | 导出 Playwright 登录态 |
| `media csdn auth check` | 校验登录态 |

工作区路径：`$WORKSPACE/.media-manager/auth/csdn/`、`$WORKSPACE/.media-manager/data/analytics/csdn/`。
