---
name: juejin-publish-and-data
description: Saves Markdown articles to Juejin drafts and fetches creator analytics using Playwright storageState.json or cookie JSON. Supports recent content analytics, 7-day article trends, and follower analytics.
metadata:
  openclaw:
    requires:
      anyBins:
        - node
        - npx
---

# Juejin Publish And Data

## Language

Match the user's language.

## Script Directory

Determine this SKILL.md directory as {baseDir}, then use {baseDir}/scripts/<name>.ts.

Runtime resolution for ${RUN_TS}:

1. if dependencies are installed -> npx tsx
2. else run npm install in scripts first
3. if Node.js is missing -> ask user to install Node.js LTS

## What This Skill Does

This skill supports two separate capability lines for Juejin creator workflows:

- save Markdown articles into Juejin editor drafts
- fetch creator analytics from content data and follower data pages
- verify whether the current auth state can enter creator pages without relogin

Output layers for fetch:

- raw capture layer: original network payloads and fallback page state for debugging
- normalized JSON layer: compact LLM-friendly output for content overview, latest 5 articles, article links, recent 7-day article trends, and follower metrics

Fetch result location:

- if --output is provided, write results into that directory
- else use default_output_dir from EXTEND.md when configured
- else use ./juejin-data-output
- relative output paths are resolved from the shell working directory where the command is invoked
- always treat the final JSON file path printed/reported by the script as the source of truth for downstream LLM analysis

This skill does not perform login automation, QR code handling, SMS verification, CAPTCHA bypass, scheduling, or multi-account orchestration.

## Required Inputs

- Preferred auth file: Playwright storageState.json captured from an already logged-in Juejin browser session
- Fallback auth file: cookie JSON exported from the same logged-in browser session
- For publishing: a Markdown file, optionally with frontmatter title/tags/cover/column/visibility
- Optional CLI overrides: --title, --cover, --tags, --column, --draft

Auth file discovery order:

1. CLI --state path
2. CLI --cookie path
3. <skillRoot>/.auth/storageState.json
4. <skillRoot>/.auth/cookies.json

## Preferences (EXTEND.md)

Optional config file path order:

1. <skillRoot>/.config/EXTEND.md
2. <skillRoot>/EXTEND.md

Supported keys:

- default_page: content | follower | both
- default_output_dir: output folder path
- default_post_mode: draft
- default_tags: comma-separated tags
- default_column: default column name
- default_visibility: default visibility label text
- default_save_raw: true | false
- default_timeout_ms: timeout in milliseconds
- cookie_file_name: cookie file name
- storage_state_file_name: storage state file name

First-time setup guide: [references/config/first-time-setup.md](./references/config/first-time-setup.md)

Storage state export guide: [references/cookie/export-storage-state.md](./references/cookie/export-storage-state.md)

Output format guide: [references/output-format.md](./references/output-format.md)

Article posting guide: [references/article-posting.md](./references/article-posting.md)

## Workflow

Execution policy:

- first run on a machine, fresh environment, or after dependency/browser changes: run Step 1, Step 2, then Step 3
- recurring runs with the same installed dependencies, same browser setup, and still-valid auth state: skip directly to Step 4A or Step 4B
- rerun Step 3 whenever storageState.json or cookies.json changed, the session may have expired, or creator access is uncertain
- rerun Step 1 and Step 2 only when environment validation is needed again

First-run or recovery checklist:

```
Progress:
- [ ] Step 1: Install dependencies and browser
- [ ] Step 2: Run environment check
- [ ] Step 3: Verify creator login state
- [ ] Step 4A: Fetch creator analytics if needed
- [ ] Step 4B: Post article if needed
- [ ] Step 5: Report output files or draft result
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

### Step 3: Login state check

```bash
npx tsx {baseDir}/scripts/check-login.ts --page both --state <storageState.json>
```

If redirected to login page or creator page body shows relogin content, stop and refresh login state.

### Step 4A: Fetch analytics

Recommended command:

```bash
npx tsx {baseDir}/scripts/fetch-analytics.ts --page both --state <storageState.json> --save-raw --output <output-dir>
```

Supported options:

- --page content|follower|both
- --start YYYY-MM-DD
- --end YYYY-MM-DD
- --output <dir>
- --state <path>
- --cookie <path>
- --save-raw / --no-save-raw
- --probe
- --headful
- --timeout <ms>

### Step 4B: Post article

Default draft-first command:

```bash
npx tsx {baseDir}/scripts/post-article.ts --file <article.md> --state <storageState.json> --draft
```

Supported options:

- --file <article.md>
- --title <value>
- --cover <path>
- --tags <tag1,tag2>
- --column <value>
- --visibility <value>
- --draft
- --state <path>
- --cookie <path>
- --headful
- --timeout <ms>

### Step 5: Report results

For fetch, always report:

- absolute output JSON file path
- whether raw data folder is generated
- normalized latest article count and follower rows count
- whether content overview, article links, and 7-day trends were captured
- tell the user to read the reported JSON path as the final fetch result source

For post, always report:

- final mode: draft
- title used
- article URL if available
- article ID if available
- tags/column/cover actually applied
- any optional fields that could not be confirmed through UI

## Safety And Boundaries

- Do not ask for account password, SMS code, or QR login secrets.
- Do not implement login bypass or CAPTCHA bypass.
- Treat cookie JSON and storageState.json as sensitive files and never commit them.
- Only save drafts. Do not attempt final publish from this skill.
