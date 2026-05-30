---
name: baoyu-post-to-wechat
description: Posts WeChat Official Account (微信公众号) articles to Draft Box (草稿箱) via Official API. Supports HTML/Markdown/plain text input. Markdown workflows default to converting ordinary external links into bottom citations for WeChat-friendly output.
metadata:
  openclaw:
    homepage: https://github.com/JimLiu/baoyu-skills#baoyu-post-to-wechat
    requires:
      anyBins:
        - bun
        - npx
---

# Post to WeChat Official Account

## Language

**Match user's language**: Respond in the same language the user uses. If user writes in Chinese, respond in Chinese. If user writes in English, respond in English.

## Script Directory

**Agent Execution**: Determine this SKILL.md directory as `{baseDir}`, then use `{baseDir}/scripts/<name>.ts`. Resolve `${BUN_X}` runtime: if `bun` installed → `bun`; if `npx` available → `npx -y bun`; else suggest installing bun.

**Working directory & paths**:

- CLI/file paths (e.g. `article.md`, `--cover cover.png`) are resolved relative to the current working directory. To avoid path mistakes, prefer absolute paths, or run commands from the directory that contains your article and images.
- API credentials are loaded from environment variables first, then from `{baseDir}/.env` (skill root).

| Script                         | Purpose                          |
| ------------------------------ | -------------------------------- |
| `scripts/wechat-api.ts`        | Article posting via API (文章)   |
| `scripts/check-permissions.ts` | Verify environment & permissions |

## Preferences (EXTEND.md)

Check EXTEND.md existence (priority order):

```bash
# macOS, Linux, WSL, Git Bash
test -f .config/baoyu-markdown-to-html/EXTEND.md && echo "project"
test -f "${XDG_CONFIG_HOME:-$HOME/.config}/baoyu-markdown-to-html/EXTEND.md" && echo "user"
```

```powershell
# PowerShell (Windows)
if (Test-Path .config/baoyu-markdown-to-html/EXTEND.md) { "project" }
$xdg = if ($env:XDG_CONFIG_HOME) { $env:XDG_CONFIG_HOME } else { "$HOME/.config" }
if (Test-Path "$xdg/baoyu-markdown-to-html/EXTEND.md") { "user" }
```

┌────────────────────────────────────────────────────────┬───────────────────┐
│ Path │ Location │
├────────────────────────────────────────────────────────┼───────────────────┤
│ .config/baoyu-markdown-to-html/EXTEND.md │ Project directory │
├────────────────────────────────────────────────────────┼───────────────────┤
│ $HOME/.config/baoyu-markdown-to-html/EXTEND.md │ User home │
└────────────────────────────────────────────────────────┴───────────────────┘

┌───────────┬───────────────────────────────────────────────────────────────────────────┐
│ Result │ Action │
├───────────┼───────────────────────────────────────────────────────────────────────────┤
│ Found │ Read, parse, apply settings │
├───────────┼───────────────────────────────────────────────────────────────────────────┤
│ Not found │ Run first-time setup ([references/config/first-time-setup.md](references/config/first-time-setup.md)) → Save → Continue │
└───────────┴───────────────────────────────────────────────────────────────────────────┘

**EXTEND.md Supports**: Default theme | Default color | Default author

First-time setup: [references/config/first-time-setup.md](references/config/first-time-setup.md)

**Minimum supported keys** (case-insensitive):

| Key              | Default | Mapping                                                 |
| ---------------- | ------- | ------------------------------------------------------- |
| `default_author` | empty   | Fallback for `author` when CLI/frontmatter not provided |

**Recommended EXTEND.md example**:

```md
default_theme: default
default_color: blue
default_author: 神刀墨客
```

**Theme options**: default, grace, simple, modern

**Color presets**: blue, green, vermilion, yellow, purple, sky, rose, olive, black, gray, pink, red, orange (or hex value)

**Value priority**:

1. CLI arguments
2. Frontmatter
3. EXTEND.md
4. Skill defaults

## Pre-flight Check (Optional)

Before first use, suggest running the environment check. User can skip if they prefer.

```bash
${BUN_X} {baseDir}/scripts/check-permissions.ts
```

Checks: Bun runtime, API credentials.

**If any check fails**, provide fix guidance per item:

| Check           | Fix                                                                |
| --------------- | ------------------------------------------------------------------ |
| Bun runtime     | `brew install oven-sh/bun/bun` (macOS) or `npm install -g bun`     |
| API credentials | Follow guided setup in Step 2, or manually set in `{baseDir}/.env` |

## Article Posting Workflow (文章)

Copy this checklist and check off items as you complete them:

```
Publishing Progress:
- [ ] Step 0: Load preferences (EXTEND.md)
- [ ] Step 1: Determine input type
- [ ] Step 2: Select method and configure credentials
- [ ] Step 3: Resolve theme/color and validate metadata
- [ ] Step 4: Publish to WeChat
- [ ] Step 5: Report completion
```

### Step 0: Load Preferences

Check and load EXTEND.md settings (see Preferences section above).

**CRITICAL**: If not found, complete first-time setup BEFORE any other steps or questions.

Resolve and store these defaults for later steps:

- `default_theme` (default `default`)
- `default_color` (omit if not set — theme default applies)
- `default_author`

### Step 1: Determine Input Type

| Input Type    | Detection                              | Action                               |
| ------------- | -------------------------------------- | ------------------------------------ |
| HTML file     | Path ends with `.html`, file exists    | Skip to Step 3                       |
| Markdown file | Path ends with `.md`, file exists      | Continue to Step 2                   |
| Plain text    | Not a file path, or file doesn't exist | Save to markdown, continue to Step 2 |

**Plain Text Handling**:

1. Generate slug from content (first 2-4 meaningful words, kebab-case)
2. Create directory and save file:

```bash
mkdir -p "$(pwd)/post-to-wechat/$(date +%Y-%m-%d)"
# Save content to: post-to-wechat/yyyy-MM-dd/[slug].md
```

3. Continue processing as markdown file

**Slug Examples**:

- "Understanding AI Models" → `understanding-ai-models`
- "人工智能的未来" → `ai-future` (translate to English for slug)

### Step 2: Select Publishing Method and Configure

This skill publishes to WeChat Draft Box via Official API.

**Check API credentials**:

Recommended: save credentials in `{baseDir}/.env`. The scripts will find it even when run from a subdirectory.

**If Credentials Missing - Guide Setup**:

```
WeChat API credentials not found.

To obtain credentials:
1. Visit https://mp.weixin.qq.com
2. Go to: 开发 → 基本配置
3. Copy AppID and AppSecret

Where to save?
A) Skill-level: {baseDir}/.env
```

After location choice, prompt for values and write to `.env`:

```
WECHAT_APP_ID=<user_input>
WECHAT_APP_SECRET=<user_input>
```

### Step 3: Resolve Theme/Color and Validate Metadata

1. **Resolve theme** (first match wins, do NOT ask user if resolved):
   - CLI `--theme` argument
   - EXTEND.md `default_theme` (loaded in Step 0)
   - Fallback: `default`

2. **Resolve color** (first match wins):
   - CLI `--color` argument
   - EXTEND.md `default_color` (loaded in Step 0)
   - Omit if not set (theme default applies)

3. **Validate metadata** from frontmatter (markdown) or HTML meta tags (HTML input):

| Field   | If Missing                                                                             |
| ------- | -------------------------------------------------------------------------------------- |
| Title   | Prompt: "Enter title, or press Enter to auto-generate from content"                    |
| Summary | Prompt: "Enter summary, or press Enter to auto-generate (recommended for SEO)"         |
| Author  | Use fallback chain: CLI `--author` → frontmatter `author` → EXTEND.md `default_author` |

**Auto-Generation Logic**:

- **Title**: First H1/H2 heading, or first sentence
- **Summary**: First paragraph, truncated to 120 characters

4. **Cover Image Check** (required for API `article_type=news`):
   1. Use CLI `--cover` if provided.
   2. Else use frontmatter (`coverImage`, `featureImage`, `cover`, `image`).
5. Else fallback to first inline content image.
6. If still missing, stop and request a cover image before publishing.

### Step 4: Publish to WeChat

**CRITICAL**: Publishing scripts handle markdown conversion internally. Do NOT pre-convert markdown to HTML — pass the original markdown file directly.

**Markdown citation default**:

- For markdown input, ordinary external links are converted to bottom citations by default.
- Use `--no-cite` only if the user explicitly wants to keep ordinary external links inline.
- Existing HTML input is left as-is; no extra citation conversion is applied.

**API method** (accepts `.md` or `.html`):

```bash
${BUN_X} {baseDir}/scripts/wechat-api.ts <file> --theme <theme> [--color <color>] [--title <title>] [--summary <summary>] [--author <author>] [--cover <cover_path>] [--no-cite]
```

**CRITICAL**: Always include `--theme` parameter. Never omit it, even if using `default`. Only include `--color` if explicitly set by user or EXTEND.md.

Note: `--theme` is required for Markdown input (it controls the markdown→HTML renderer). For HTML input, `--theme` is not needed.

**`draft/add` payload rules**:

- Use endpoint: `POST https://api.weixin.qq.com/cgi-bin/draft/add?access_token=ACCESS_TOKEN`
- `article_type`: `news` (default) or `newspic`
- For `news`, include `thumb_media_id` (cover is required)
- `author` resolution: CLI `--author` → frontmatter `author` → EXTEND.md `default_author`

If script parameters do not expose the two comment fields, still ensure final API request body includes resolved values.

### Step 5: Completion Report

**For API method**, include draft management link:

```
WeChat Publishing Complete!

Input: [type] - [path]
Method: API
Theme: [theme name] [color if set]

Article:
• Title: [title]
• Summary: [summary]
• Images: [N] inline images
• Comments: [open/closed], [fans-only/all users]

Result:
✓ Draft saved to WeChat Official Account
• media_id: [media_id]

Next Steps:
→ Manage drafts: https://mp.weixin.qq.com (登录后进入「内容管理」→「草稿箱」)

Files created:
[• post-to-wechat/yyyy-MM-dd/slug.md (if plain text)]
[• slug.html (converted)]
```

## Detailed References

| Topic                                                | Reference                                                      |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| Article themes, image handling, API draft publishing | [references/article-posting.md](references/article-posting.md) |

## Feature Comparison

| Feature                  | Article (API) |
| ------------------------ | ------------- |
| Plain text input         | ✓             |
| HTML input               | ✓             |
| Markdown input           | ✓             |
| Multiple images          | ✓ (inline)    |
| Themes                   | ✓             |
| Auto-generate metadata   | ✓             |
| Requires API credentials | ✓             |
| Speed                    | Fast          |

## Prerequisites

**For API method**:

- WeChat Official Account API credentials
- Guided setup in Step 2, or manually set in `{baseDir}/.env`

**Config File Locations** (priority order):

1. Environment variables
2. `{baseDir}/.env`

## Troubleshooting

| Issue                   | Solution                                                                    |
| ----------------------- | --------------------------------------------------------------------------- |
| Missing API credentials | Follow guided setup in Step 2                                               |
| Access token error      | Check if API credentials are valid and not expired                          |
| Title/summary missing   | Use auto-generation or provide manually                                     |
| No cover image          | Provide `--cover`, set frontmatter cover fields, or include an inline image |
| File not found          | Use an absolute path, or run from the directory containing the file(s)      |

## Extension Support

Custom configurations via EXTEND.md. See **Preferences** section for paths and supported options.
