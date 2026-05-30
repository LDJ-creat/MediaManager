# Ubuntu Headless Setup

If Playwright Chromium cannot launch on Ubuntu, install the required browser libraries first.

## Recommended commands

```bash
sudo apt-get update
sudo apt-get install -y \
  libnss3 \
  libnspr4 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libdbus-1-3 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  libatspi2.0-0 \
  libxshmfence1
```

Then run:

```bash
npx playwright install chromium
```

## Notes

- Export storageState.json on a local desktop browser, then copy it to the server.
- Validate with `check-environment.ts` and `check-login.ts` before running fetch or posting drafts.