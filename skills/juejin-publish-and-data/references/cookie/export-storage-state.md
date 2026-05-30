# Export Storage State

Use this when you want a Playwright-compatible login state file for Juejin creator pages.

## Recommended flow

1. Run the helper script in a local desktop environment with GUI.
2. Log in to Juejin in the opened Chromium window.
3. Open creator pages and confirm content data or follower data is visible.
4. Press Enter in the terminal to save storageState.json.
5. Reuse the same storageState.json on Windows, macOS, or Ubuntu headless servers.

## Command

Run inside juejin-publish-and-data/scripts:

```bash
npx tsx export-storage-state.ts
# default output: ../.auth/storageState.json
```

## Why storageState is preferred

- creator pages often depend on more than raw cookies
- localStorage or same-site cookie behavior can matter for headless replay
- it is more stable across page navigations than manually exported cookie arrays

## Cookie fallback

If you cannot produce storageState.json, cookie JSON is still supported.

Expected cookie format:

- a JSON array
- each item should contain at least name, value, domain

## Security

- never commit storageState.json or cookies.json to git
- treat these files as account secrets
- regenerate them if the account session expires or the device changes