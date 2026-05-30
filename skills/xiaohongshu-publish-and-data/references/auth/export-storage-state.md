# Export Storage State (legacy / optional)

> **Publish no longer uses `--state` + Playwright-launched Chrome.**  
> Use CDP-attached logged-in Chrome for `post-note.ts` instead.  
> This export flow is kept only for ad-hoc debugging or other tooling.

If you still need a Playwright storageState snapshot:

```bash
npx tsx export-storage-state.ts
# default output: ../.auth/storageState.json
```

Manual flow:

1. Script opens a Chromium window.
2. Log in to creator center manually.
3. Press Enter to save `storageState.json`.

Do not commit `.auth/storageState.json` to git.
