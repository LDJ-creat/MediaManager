---
name: get-wechat-data
description: Fetches WeChat Official Account analytics (content analysis and user analysis) from mp.weixin.qq.com using user-provided Playwright storageState.json or Cookie JSON. Supports Windows, macOS, and Linux, including Ubuntu servers without GUI.
metadata:
  openclaw:
    requires:
      anyBins:
        - node
        - npx
---

# Get WeChat Analytics Data

## Language

Match the user's language.

## Script Directory

Determine this SKILL.md directory as {baseDir}, then use {baseDir}/scripts/<name>.ts.

Runtime resolution for ${RUN_TS}:

1. if dependencies are installed -> npx tsx
2. else run npm install in scripts first
3. if Node.js is missing -> ask user to install Node.js LTS

## What This Skill Does

This skill fetches analytics from WeChat Official Account backend pages:

- Content analysis page
- User analysis page

The fetch result now contains two layers:

- raw capture layer: original page/network payloads for debugging and future parser updates
- normalized layer: compact business-facing output with summary cards, daily trends, and content article items

Supported environments:

- Windows local development
- macOS local development
- Linux and Ubuntu servers without GUI

It uses a user-provided login state file. Prefer Playwright storageState.json. Cookie JSON remains supported as a fallback. It does not perform login, QR scan, CAPTCHA solving, or bypass.

## Required Inputs

- Preferred: Playwright storageState.json captured from a browser session already logged into mp.weixin.qq.com
- Fallback: Cookie JSON exported from a browser that is already logged into mp.weixin.qq.com
- Optional date range: --start YYYY-MM-DD --end YYYY-MM-DD

Token handling:

- Preferred: let the script auto-discover the live token from the authenticated mp.weixin.qq.com home page
- Optional: pass --token only when debugging a specific page state
- Do not rely on old manually copied tokens, because they expire and often cause relogin pages

Auth file discovery order:

1. CLI --state path
2. CLI --cookie path
3. <skillRoot>/.auth/storageState.json
4. <skillRoot>/.auth/cookies.json

## Preferences (EXTEND.md)

Optional config file path order:

1. <skillRoot>/.config/EXTEND.md
2. <skillRoot>/EXTEND.md

Supported keys (case-insensitive):

- default_page: content | user | both
- default_output_dir: output folder path
- default_save_raw: true | false
- default_timeout_ms: timeout in milliseconds
- cookie_file_name: cookie file name (default cookies.json)
- storage_state_file_name: auth state file name (default storageState.json)

First-time setup guide: [references/config/first-time-setup.md](./references/config/first-time-setup.md)

Storage state export guide: [references/cookie/export-storage-state.md](./references/cookie/export-storage-state.md)

Output format guide: see references/output-format.md.

## Workflow

Copy checklist and execute in order:

```
Progress:
- [ ] Step 1: Install dependencies and browser
- [ ] Step 2: Run environment check
- [ ] Step 3: Verify login state
- [ ] Step 4: Fetch analytics
- [ ] Step 5: Report output files
```

### Step 1: Install dependencies and browser

Run in {baseDir}/scripts:

```bash
npm install
npx playwright install chromium
```

For Ubuntu missing libraries, see [references/ubuntu/headless-setup.md](./references/ubuntu/headless-setup.md).

### Step 2: Environment check

```bash
npx tsx {baseDir}/scripts/check-environment.ts
```

If failed, stop and fix dependencies before continuing.

### Step 3: Login state check

```bash
npx tsx {baseDir}/scripts/check-login.ts --page both --state <storageState.json>
```

If redirected to login page or body shows relogin content, ask user to refresh login state and export storageState again.

### Step 4: Fetch analytics

Recommended command:

```bash
npx tsx {baseDir}/scripts/fetch-analytics.ts --page both --state <storageState.json> --save-raw --output <output-dir>
```

Recommended output directories:

- run from {baseDir}/scripts and use --output ../output-auto-token to save files under {baseDir}/output-auto-token
- if --output is omitted, files are written to the configured default_output_dir, which defaults to ./wechat-data-output relative to the current working directory

Examples:

```bash
# run from {baseDir}/scripts and store artifacts in {baseDir}/output-auto-token
npx tsx fetch-analytics.ts --page both --state ../.auth/storageState.json --save-raw --output ../output-auto-token

# optional date range filter
npx tsx fetch-analytics.ts --page content --state ../.auth/storageState.json --start 2026-03-01 --end 2026-03-10 --save-raw --output ../output-content
```

Common options:

- --page content|user|both
- --token <value>
- --start YYYY-MM-DD
- --end YYYY-MM-DD
- --output <dir>
- --state <path>
- --cookie <path>
- --probe
- --headful
- --timeout <ms>

### Step 5: Report results

Always report:

- output JSON file path
- output Markdown file path
- whether raw data folder is generated
- normalized summary values when present
- curated metric count
- if count is unexpectedly low, include troubleshooting hints from [references/troubleshooting/common-issues.md](./references/troubleshooting/common-issues.md)

Expected artifacts in the chosen output directory:

- wechat-analytics-YYYYMMDD-HHMMSS.json
- wechat-analytics-YYYYMMDD-HHMMSS.md
- raw-YYYYMMDD-HHMMSS/ when --save-raw is enabled

JSON output fields:

- records: deduplicated raw page captures and matched network responses
- normalized.content.summary: read, like, share, collection, comment
- normalized.content.dailyTotals: daily content trend rows
- normalized.content.articles: published article list with refDate, title, totalReadUv, readUvRatio
- normalized.user.summary: newUser, cancelUser, netgainUser, cumulateUser
- normalized.user.dailyTotals: daily user trend rows
- metrics: compatibility layer with curated metrics only, derived from normalized output

Markdown output sections:

- Page Summary
- Content Summary
- User Summary
- Content Daily Trend
- User Daily Trend
- Content Articles
- Curated Metrics

## Safety and Boundaries

- Do not ask for account password or SMS/2FA code.
- Do not implement login bypass.
- Treat cookie as sensitive secret, never commit it to git.
