# First-Time Setup

This skill is designed to work on Windows, macOS, and Linux.

## 1. Install runtime

Preferred runtime: Node.js 20+.

- macOS: brew install node
- Linux/Ubuntu: install Node.js LTS from official source or NodeSource
- Windows: install Node.js LTS from the official installer

This skill uses npx tsx to run TypeScript scripts.

## 2. Install script dependencies

Run inside csdn-publish-and-data/scripts:

```bash
npm install
npx playwright install chromium
```

If Ubuntu is missing browser libraries, see [../ubuntu/headless-setup.md](../ubuntu/headless-setup.md).

## 3. Prepare auth file

Preferred file:

- .auth/storageState.json

Fallback file:

- .auth/cookies.json

Recommended storage state locations:

- .auth/storageState.json

Use [../auth/export-storage-state.md](../auth/export-storage-state.md) if you need to export a fresh login state.

## 4. Optional defaults

Create EXTEND.md at one of these locations:

- .config/EXTEND.md
- EXTEND.md

Supported keys:

- default_output_dir
- default_categories
- default_tags
- default_original_flag
- default_save_raw
- default_timeout_ms
- cookie_file_name
- storage_state_file_name

Example:

```md
default_output_dir: ./csdn-output
default_categories: 后端, 工具
default_tags: typescript, playwright
default_original_flag: true
default_save_raw: true
default_timeout_ms: 30000
cookie_file_name: cookies.json
storage_state_file_name: storageState.json
```

## 5. Quick verification

```bash
npx tsx check-environment.ts
npx tsx check-login.ts --page both
```

## 6. Recommended first runs

```bash
npx tsx fetch-analytics.ts --page both --state ../.auth/storageState.json --save-raw --output ../output
```

```bash
npx tsx post-article.ts --file ../example.md --draft --state ../.auth/storageState.json --output ../output
```