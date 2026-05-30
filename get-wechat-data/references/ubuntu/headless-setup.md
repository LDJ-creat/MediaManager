# Ubuntu Headless Setup

Use this when check-environment fails on Ubuntu server without GUI.

## Install Playwright browser

Run in get-wechat-data/scripts:

```bash
npx playwright install chromium
```

## Install common system dependencies

```bash
sudo apt-get update
sudo apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxrandr2 \
  libxshmfence1 \
  xdg-utils
```

## Run checks

```bash
npx tsx check-environment.ts
npx tsx check-login.ts --page both
```

## Typical failures

- Missing shared libraries: install apt dependencies above
- Login redirect: cookie expired, re-export cookies
- Response capture is empty: account may not have analysis permission