# First-Time Setup

This skill is designed to work on Windows, macOS, and Linux.

## 1. Install runtime

Preferred runtime: Node.js 20+.

- macOS: brew install node
- Linux/Ubuntu: install Node.js LTS from official source or NodeSource
- Windows: install Node.js LTS from the official installer

This skill uses npx tsx to run TypeScript scripts.

## 2. Install script dependencies

Run inside get-wechat-data/scripts:

```bash
npm install
npx playwright install chromium
```

## 3. Prepare auth file

Preferred file:

- .auth/storageState.json

Fallback file:

Create one of these locations:

- .auth/cookies.json

Recommended storage state locations:

- .auth/storageState.json

Storage state file must be a Playwright-compatible JSON object with `cookies` and optional `origins`.

Cookie file must be a JSON array compatible with browser cookie export.

## 4. Optional defaults

Create EXTEND.md at:

- .config/EXTEND.md

Example:

```md
default_page: both
default_output_dir: ./wechat-data-output
default_save_raw: true
default_timeout_ms: 30000
cookie_file_name: cookies.json
storage_state_file_name: storageState.json
```

Notes:

- default_output_dir is resolved relative to the current working directory when you run the command
- if you usually run inside get-wechat-data/scripts and want artifacts under get-wechat-data/output-auto-token, set default_output_dir: ../output-auto-token
- default_token is intentionally not recommended because the script can auto-discover the live token from an authenticated mp.weixin.qq.com home page

## 5. Quick verification

```bash
npx tsx check-environment.ts
npx tsx check-login.ts --page both
```

## 6. Recommended first fetch

Run inside get-wechat-data/scripts:

```bash
npx tsx fetch-analytics.ts --page both --state ../.auth/storageState.json --save-raw --output ../output-auto-token
```

Expected artifacts:

- ../output-auto-token/wechat-analytics-YYYYMMDD-HHMMSS.json
- ../output-auto-token/wechat-analytics-YYYYMMDD-HHMMSS.md
- ../output-auto-token/raw-YYYYMMDD-HHMMSS/

See [output-format.md](../output-format.md) for the normalized JSON structure and Markdown sections.