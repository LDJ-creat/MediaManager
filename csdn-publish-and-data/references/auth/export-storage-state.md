# Export Storage State

Use this flow when the user already has a valid CSDN login in a real browser session and wants to reuse it for Playwright.

## Recommended command

Run inside csdn-publish-and-data/scripts:

```bash
npx tsx export-storage-state.ts
# default output: ../.auth/storageState.json
```

## Manual flow

1. The script opens a Chromium window.
2. Log in to https://mp.csdn.net/ in that window.
3. Open either the editor page or analytics page and confirm real creator data is visible.
4. Return to terminal and press Enter.
5. The script writes a Playwright-compatible storageState.json.

## Notes

- Capture the state after you can actually access creator center pages, not only the public homepage.
- For Linux servers, export storageState.json on a local machine first, then copy it to the server.
- Prefer storageState.json over cookies.json because CSDN creator center often relies on more than cookies alone.