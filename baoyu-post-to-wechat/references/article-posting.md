# Article Posting (API 草稿箱)

Publish articles to WeChat Official Account **Draft Box (草稿箱)** via Official API.

Supports:
- Markdown (.md)
- HTML (.html)
- Plain text (save to markdown first, then publish)

## Usage

```bash
# Publish markdown to draft
${BUN_X} ./scripts/wechat-api.ts article.md --theme default

# With theme and color
${BUN_X} ./scripts/wechat-api.ts article.md --theme grace --color purple

# Disable bottom citations for ordinary external links (markdown only)
${BUN_X} ./scripts/wechat-api.ts article.md --theme default --no-cite

# HTML input
${BUN_X} ./scripts/wechat-api.ts article.html --title "标题"

# Photo album style draft (newspic)
${BUN_X} ./scripts/wechat-api.ts article.md --type newspic --theme default

# Dry run (render & parse only)
${BUN_X} ./scripts/wechat-api.ts article.md --theme default --dry-run
```

## Parameters

| Parameter | Description |
|-----------|-------------|
| `<file>` | Markdown (.md) or HTML (.html) |
| `--type <news|newspic>` | Draft article type (default: news) |
| `--theme <name>` | Theme: default, grace, simple, modern (required) |
| `--color <preset|hex>` | Primary color preset or hex |
| `--title <text>` | Override title |
| `--author <name>` | Override author |
| `--summary <text>` | Override summary/digest |
| `--cover <path|url>` | Cover image (recommended; required for `news` if content has no image) |
| `--no-cite` | Keep ordinary external links inline (markdown only) |
| `--dry-run` | Parse and render only; do not publish |

## Markdown Notes

- Markdown is rendered to WeChat-friendly HTML using the theme renderer.
- Ordinary external links are converted to bottom citations by default.
- Inline images are uploaded to WeChat material store and rewritten to WeChat-hosted URLs.

## API Credentials

The script reads credentials in priority order:
1. Environment variables: `WECHAT_APP_ID`, `WECHAT_APP_SECRET`
2. `baoyu-post-to-wechat/.env` (skill root)

## Result

On success, the script prints a JSON payload containing `media_id`. Manage drafts in:
`https://mp.weixin.qq.com` → 内容管理 → 草稿箱
