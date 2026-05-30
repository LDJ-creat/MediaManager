# Ubuntu / Linux Notes

Publishing uses **CDP-attached system Chrome**, not Playwright-launched headless Chromium alone.

## Server workflow

1. Install Google Chrome on the server (or use a desktop session with X11/VNC).
2. Log in to creator center manually in that Chrome profile once.
3. Start Chrome with remote debugging:

```bash
google-chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.config/google-chrome" \
  --no-first-run
```

4. Run publish from another terminal:

```bash
npx tsx post-note.ts --file note.md --cdp-url http://127.0.0.1:9222
```

## Dependencies

Install Node.js 20+ and run `npm install` inside `scripts/`.

Playwright Chromium install is optional for this skill's publish path; system Chrome is required.

## Validation

```bash
npx tsx check-environment.ts
curl http://127.0.0.1:9222/json/version
```
