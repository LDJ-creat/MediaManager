# Article Posting

## Supported input

- Markdown file path via `--file`
- optional frontmatter keys: `title`, `note`, `tags`, `images`
- explicit CLI overrides: `--images`, `--title`, `--note`, `--tags`

CLI values override frontmatter values.

## Prerequisites

- logged-in **real Chrome** with CDP enabled (`--cdp-url http://127.0.0.1:9222`)
- do not use Playwright-launched Chromium alone for publish

## Current publish flow

1. Attach to CDP Chrome.
2. Open the image-note publish page.
3. Upload one or more image files.
4. Fill title (max 20 characters), note body, and topic tags when provided.
5. Click `发布` through Chrome Accessibility + CDP.
6. Wait for `POST https://edith.xiaohongshu.com/web_api/sns/v2/note` and/or success URL.
7. Write result summary files.

## Important behavior

- Xiaohongshu-ready content only; no long-form article conversion.
- Publishes immediately; does not click `暂存离开`.
- Empty note body falls back to title.
- `--draft` is ignored with a warning.

## Minimal recommended metadata

- title (<= 20 chars)
- note body (non-empty, or title will be reused)
- images (at least one)
- tags when available

## Example frontmatter

```md
---
title: "Agent踩坑总结"
tags:
  - AI工具
  - 程序员
images:
  - ./images/cover.png
---

🔥 前三行钩子内容...

正文段落...
```

## Example command

```bash
npx tsx post-note.ts --file note.md --cdp-url http://127.0.0.1:9222
```
