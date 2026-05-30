# Export Playwright Storage State

## Recommendation

When WeChat backend pages still show relogin with a plain cookies.json file, use a full Playwright storageState.json instead.

## What storage state contains

- cookies
- origin-scoped localStorage entries

This is often more reliable than exporting cookies alone.

## Recommended way

No plugin is required.

Use the helper script already included in this skill. Run it in get-wechat-data/scripts:

    npm run auth:export-state

Or specify a custom output path:

  npx tsx export-storage-state.ts --output ../.auth/storageState.json

The script will:

- open a headed browser window
- let you log in manually
- ask you to open the target analysis page and confirm real data is visible
- save a Playwright-compatible storageState.json after you press Enter in the terminal

Important:

- Log in inside the browser window opened by the script, not only in your existing Chrome window
- Before pressing Enter, open the content analysis or user analysis page and confirm you can see real metrics
- This produces a more reliable login state than cookies alone

## Suggested target path

- .auth/storageState.json

## Validation

After exporting, run:

  npx tsx check-login.ts --page both --state ../.auth/storageState.json

If login still fails, re-export immediately after confirming the analysis pages show real data in the browser.

If you later run fetch-analytics.ts, prefer omitting --token and let the script auto-discover the current live token.
