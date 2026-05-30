---
name: xiaohongshu-publish-and-data
description: Publish Xiaohongshu image-notes by attaching to a logged-in Chrome via CDP (--cdp-url). Use when the user asks to 发布小红书图文, 上传小红书笔记, or validate creator login in CDP Chrome.
---

> **编排入口**：多 skill 组合流程请使用 [`media-manager`](../media-manager/SKILL.md) 总控 skill 与 `media` CLI。本 skill 为 deep-dive。

# Xiaohongshu Publish And Data

## Language

Match the user's language.

## Use This Skill For

- Publish a Xiaohongshu image-note from Markdown or explicit CLI inputs through **CDP-attached real Chrome**.
- Confirm the CDP Chrome session can reach the creator publish page.
- Fetch recent published note performance metrics (views, likes, comments, collects, shares) via Playwright + saved auth state.

Do not use this skill for password-based login automation, CAPTCHA bypass, QR automation, video publishing, scheduled publishing, draft-only workflows, or multi-account orchestration.

## Runtime Requirement

Publishing **requires** a logged-in real Chrome started with remote debugging and `--cdp-url`.

Do **not** document or recommend publishing with only `--state` and a Playwright-launched browser. That path cannot reliably click the `发布` button on Xiaohongshu creator center.

## CLI（推荐）

执行前先 `media workspace show`。

| 操作 | 命令 |
|------|------|
| 发布图文笔记 | `media xhs post-note --file output/{slug}/note.md --cdp-url http://127.0.0.1:9222` |
| 抓取笔记数据 | `media xhs analytics fetch` |
| 导出登录态 | `media xhs auth export` |
| 检查登录 | `media xhs auth check` |

## Resolve Paths And Runtime（Deep-dive）

Determine this SKILL.md directory as {baseDir}. Prefer `media xhs ...` above.

## Choose The Workflow

- Publish image-note: `post-note.ts` + `--cdp-url`
- Fetch note analytics: `fetch-analytics.ts` + `--state` (Playwright, no CDP required)
- Optional environment check: `check-environment.ts`

Run one-time setup only when dependencies are missing or Chrome/CDP is not configured yet.

## One-Time Setup

```text
One-Time Setup Progress:
- [ ] Step 1: Install dependencies in {baseDir}/scripts
- [ ] Step 2: Install Google Chrome (not Playwright-only Chromium for publish)
- [ ] Step 3: Log in to https://creator.xiaohongshu.com/ in your Chrome profile
- [ ] Step 4: Learn the CDP launch command for your OS
- [ ] Step 5: Run one successful publish with --cdp-url
```

```bash
cd {baseDir}/scripts
npm install
npx tsx check-environment.ts
```

## Start Chrome With CDP (required before every publish session)

Close all Chrome windows first, then start Chrome with remote debugging.

Windows (PowerShell):

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="$env:LOCALAPPDATA\Google\Chrome\User Data"
```

macOS:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/Library/Application Support/Google/Chrome"
```

Linux:

```bash
google-chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.config/google-chrome"
```

Use a dedicated profile directory if your main Chrome profile is already open.

Optional environment variable instead of repeating the flag:

```bash
export XHS_CDP_URL=http://127.0.0.1:9222
```

## Recurring Workflow: Publish Image-Note

```text
Publish Workflow Progress:
- [ ] Step 1: Start logged-in Chrome with --remote-debugging-port=9222
- [ ] Step 2: Run post-note.ts with --file or explicit --images/--title/--note and --cdp-url
- [ ] Step 3: Confirm success from JSON output (POST web_api/sns/v2/note or success URL)
- [ ] Step 4: Report result files and warnings
```

Recommended command:

```bash
media xhs post-note --file output/{slug}/note.md --cdp-url http://127.0.0.1:9222
```

Rules:

- Pass Xiaohongshu-ready Markdown directly when using `--file`.
- Do not convert long-form article Markdown into Xiaohongshu format inside this skill.
- Publishes immediately by clicking the red `发布` button via Chrome Accessibility + CDP; does not use `暂存离开`.
- Xiaohongshu web drafts are browser-local and not supported.
- Note body must not be empty; if frontmatter has no body, the script uses the title as default description.
- If publish fails, inspect warnings (click method, validation toast) and the failure screenshot in `{baseDir}/xhs-output/`.

## Recurring Workflow: Fetch Note Analytics

Uses Playwright with saved `storageState.json` (same auth export flow as other platforms). No CDP Chrome required.

```bash
media xhs analytics fetch
```

Default output: `{baseDir}/xhs-output/xhs-analytics-YYYYMMDD-HHMMSS.json` (works regardless of current working directory).

Use `--save-raw` only when debugging API changes or parser issues; routine analyze-operation runs do not need raw payloads.

Captured fields per note:

- title, url, publishTime
- viewCount, commentCount, likeCount, collectCount, shareCount

Data source: creator note manager API (`/api/galaxy/v2/creator/note/user/posted`).

## References

- First-time config: [references/config/first-time-setup.md](./references/config/first-time-setup.md)
- Publishing details: [references/article-posting.md](./references/article-posting.md)
- Output schema: [references/output-format.md](./references/output-format.md)
- Troubleshooting: [references/troubleshooting/common-issues.md](./references/troubleshooting/common-issues.md)
- Linux notes: [references/ubuntu/headless-setup.md](./references/ubuntu/headless-setup.md)

Content writing rules: [../guidance/writing/platform/xiaohongshu.md](../guidance/writing/platform/xiaohongshu.md)

## Safety And Boundaries

- Do not ask for account password, SMS code, or login QR secrets in automation.
- Do not commit `.auth/`, `.chrome-cdp-profile/`, or output artifacts into git.
- `--draft` is ignored with a warning; this skill publishes directly.
- If Xiaohongshu introduces new required fields, stop after surfacing the missing selector or warning instead of guessing hidden values.
