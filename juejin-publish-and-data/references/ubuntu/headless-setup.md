# Ubuntu Headless Setup

Use this when running the skill on an Ubuntu server without GUI.

## 1. Install Node.js

Install Node.js LTS from the official source or NodeSource.

## 2. Install dependencies

Run inside juejin-publish-and-data/scripts:

```bash
npm install
npx playwright install chromium
```

## 3. Install common Playwright system libraries

Typical Ubuntu command:

```bash
sudo npx playwright install-deps chromium
```

If that is not available in your environment, install the missing shared libraries manually according to Playwright diagnostics.

## 4. Reuse desktop-generated storageState

Recommended flow:

1. export storageState.json on a local desktop with GUI
2. copy that file to the server
3. run check-login.ts first
4. run fetch-analytics.ts in headless mode

## 5. Suggested first verification

```bash
npx tsx check-environment.ts
npx tsx check-login.ts --page both --state ../.auth/storageState.json
npx tsx fetch-analytics.ts --page both --state ../.auth/storageState.json --save-raw --output ../output-headless
```

## 6. Limits

- export-storage-state.ts requires a GUI browser session and is not meant for headless-only servers
- if the server region or device fingerprint invalidates the session, regenerate storageState.json locally