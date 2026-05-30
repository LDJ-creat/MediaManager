# First-Time Setup

This skill is designed to work on Windows, macOS, and Linux.

## 1. Install runtime

Preferred runtime: Node.js 20+.

- macOS: brew install node
- Linux/Ubuntu: install Node.js LTS from official source or NodeSource
- Windows: install Node.js LTS from the official installer

This skill uses npx tsx to run TypeScript scripts.

## 2. Install script dependencies

Run inside juejin-publish-and-data/scripts:

```bash
npm install
npx playwright install chromium
```

## 3. Prepare auth file

Preferred file:

- .auth/storageState.json

Fallback file:

- .auth/cookies.json

Recommended storage state locations:

- .auth/storageState.json

Export storageState after you are already logged into Juejin creator pages and can see real creator data.

## 4. Optional defaults

Create EXTEND.md at:

- .config/EXTEND.md

Example:

```md
default_page: both
default_output_dir: ./juejin-data-output
default_post_mode: draft
default_tags: 掘金,技术
default_column: 我的专栏
default_visibility: 公开
default_save_raw: true
default_timeout_ms: 45000
cookie_file_name: cookies.json
storage_state_file_name: storageState.json
```

Notes:

- default_output_dir is resolved relative to the current working directory
- default_post_mode is draft-only
- storageState.json is more reliable than cookies.json for creator pages

## 5. Quick verification

```bash
npx tsx check-environment.ts
npx tsx check-login.ts --page both
```

## 6. Recommended first run

Fetch:

```bash
npx tsx fetch-analytics.ts --page both --state ../.auth/storageState.json --save-raw --output ../output-juejin
```

Draft post:

```bash
npx tsx post-article.ts --file ../demo/article.md --state ../.auth/storageState.json --draft --headful
```