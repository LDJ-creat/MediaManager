---
name: csdn-publish-and-data
description: Save Markdown articles into the CSDN draft box and fetch CSDN creator analytics/article performance data with storageState.json or cookies.json. Use when the user asks to 保存 CSDN 草稿, 准备 CSDN 文章草稿, 批量生成 CSDN 草稿, 抓取 CSDN 创作中心运营数据, 获取最近文章的 7 日动态数据, 校验 CSDN 创作中心登录态, or export CSDN creator storage state.
---

# CSDN Publish And Data

## Language

Match the user's language.

## Use This Skill For

- Save a local Markdown file into the CSDN draft box.
- Validate whether the current CSDN creator auth state is still usable.
- Export Playwright storage state for later reuse.
- Fetch creator analytics with a JSON report focused on overall metrics plus per-article summary and recent 7-day dynamics.

Do not use this skill for password-based login, CAPTCHA bypass, multi-account automation, or hidden-field guessing.

## Resolve Paths And Runtime

Determine this SKILL.md directory as {baseDir}. Use scripts from {baseDir}/scripts.

Resolve ${RUN_TS} like this:

1. Use `npx tsx` if dependencies are already installed.
2. Run `npm install` inside `{baseDir}/scripts` only when dependencies are missing.
3. Ask the user to install Node.js LTS only when Node.js is unavailable.

## Choose The Workflow

Pick exactly one path for the current request:

- Post article (draft only): use `post-article.ts`.
- Fetch analytics: use `fetch-analytics.ts`.
- Check auth only: use `check-login.ts`.
- Export auth state only: use `export-storage-state.ts`.

Run one-time setup steps only when the environment is new, dependencies are missing, browser support changed, or the saved auth file is missing/expired.

## One-Time Setup

Run this checklist only for first-time setup or when the previous setup is no longer valid.

```text
One-Time Setup Progress:
- [ ] Step 1: Install dependencies in {baseDir}/scripts
- [ ] Step 2: Install Playwright browser if needed
- [ ] Step 3: Export or place storageState.json / cookies.json
- [ ] Step 4: Run login check once to confirm auth works
```

Useful commands:

```bash
cd {baseDir}/scripts
npm install
npx playwright install chromium
npx tsx check-login.ts --state <storageState.json>
```

After this succeeds once, skip these steps in normal runs unless auth expires or the machine/runtime changes.

## Auth File Discovery Order

1. CLI --state path
2. CLI --cookie path
3. <skillRoot>/.auth/storageState.json
4. <skillRoot>/.auth/cookies.json

Prefer `storageState.json`. Use `cookies.json` only as fallback.

Read extra references only when needed:

- First-time config and defaults: [references/config/first-time-setup.md](./references/config/first-time-setup.md)
- Export auth state: [references/auth/export-storage-state.md](./references/auth/export-storage-state.md)
- Draft-saving details: [references/article-posting.md](./references/article-posting.md)
- Output schema details: [references/output-format.md](./references/output-format.md)
- Troubleshooting: [references/troubleshooting/common-issues.md](./references/troubleshooting/common-issues.md)
- Ubuntu headless setup: [references/ubuntu/headless-setup.md](./references/ubuntu/headless-setup.md)

## Recurring Workflow: Save Draft

Use this path for requests like “把这篇文章保存到 CSDN 草稿箱”.

```text
Draft Workflow Progress:
- [ ] Step 1: Resolve auth file
- [ ] Step 2: Run post-article.ts with the original Markdown file
- [ ] Step 3: Confirm draft save result from JSON output
- [ ] Step 4: Report draft result files and warnings
```

Recommended command:

```bash
npx tsx {baseDir}/scripts/post-article.ts --file <article.md> --draft --state <storageState.json>
```

Rules:

- Pass the original Markdown file directly.
- Do not convert Markdown to HTML before calling the script.
- By default, saves draft only.
- If the editor layout changes or selectors fail, rerun with `--headful` and inspect the current page.
- If auth is already known-good, do not rerun dependency install or login check first.

## Recurring Workflow: Fetch Analytics

Use this path for requests like “抓取 CSDN 运营数据”, “获取最近文章 7 日数据”, or “导出 CSDN 创作中心表现”.

```text
Analytics Workflow Progress:
- [ ] Step 1: Resolve auth file
- [ ] Step 2: Run fetch-analytics.ts
- [ ] Step 3: Return the main JSON report path
- [ ] Step 4: Return raw output path only if --save-raw was used or debugging is needed
```

Recommended command:

```bash
npx tsx {baseDir}/scripts/fetch-analytics.ts --page both --state <storageState.json> --save-raw --output <output-dir>
```

Default interpretation of the analytics output:

- Main JSON is the primary report for analysis.
- Main JSON keeps only analysis-relevant fields: overall creator metrics plus per-article summary and recent 7-day dynamics.
- Raw files are for debugging and schema inspection only.
- If auth is already known-good, do not rerun dependency install or login check first.

Current report shape:

```json
{
  "generatedAt": "...",
  "report": {
    "range": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
    "overview": {
      "articleCount": 0,
      "exposuresCount": 0,
      "diggCount": 0,
      "commentCount": 0,
      "viewCount": 0,
      "score": 0,
      "averageQuality": 0,
      "collectCount": 0
    },
    "articles": [
      {
        "articleId": "...",
        "title": "...",
        "url": "...",
        "summary": {
          "publishTime": "...",
          "exposuresCount": 0,
          "viewCount": 0,
          "commentCount": 0,
          "diggCount": 0,
          "favoriteCount": 0,
          "fansCount": 0,
          "qualityScore": {
            "score": 0,
            "version": "V5.0",
            "createAt": "..."
          }
        },
        "recent7Days": [
          {
            "date": "YYYY-MM-DD",
            "exposuresCount": 0,
            "viewCount": 0,
            "commentCount": 0,
            "diggCount": 0,
            "favoriteCount": 0,
            "fansCount": 0
          }
        ]
      }
    ]
  }
}
```

Common options:

- `--page analytics|manage|both`
- `--start YYYY-MM-DD`
- `--end YYYY-MM-DD`
- `--output <dir>`
- `--state <path>`
- `--cookie <path>`
- `--probe`
- `--headful`
- `--timeout <ms>`

## Focused Execution Rules

- Prefer the main JSON report for user-facing answers.
- Mention raw files only when debugging, verification, or schema exploration is useful.
- Treat storage state as reusable session state; do not force refresh unless login has expired.
- Keep the user-facing summary focused on meaningful analytics rather than raw transport metadata.

## Auth-Only Workflow

Use this only when the request is specifically about validating or exporting auth state.

Check auth:

```bash
npx tsx {baseDir}/scripts/check-login.ts --state <storageState.json>
```

Export storage state:

```bash
npx tsx {baseDir}/scripts/export-storage-state.ts
```

## Safety And Boundaries

- Do not ask for account password, SMS code, or login QR secrets.
- Do not commit cookies.json or storageState.json into git.
- Draft save is always supported.
- If CSDN introduces new required fields in the editor or publish dialog, stop after surfacing the missing selector or warning instead of guessing hidden values.
