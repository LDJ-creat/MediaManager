# First-Time Setup

This skill publishes through **CDP-attached real Chrome**. Playwright-launched Chromium alone is not supported for publish.

## 1. Install runtime

Preferred runtime: Node.js 20+.

- macOS: brew install node
- Linux/Ubuntu: install Node.js LTS from official source or NodeSource
- Windows: install Node.js LTS from the official installer

Install **Google Chrome** (system Chrome, not only Playwright Chromium).

## 2. Install script dependencies

Run inside xiaohongshu-publish-and-data/scripts:

```bash
npm install
npx tsx check-environment.ts
```

## 3. Log in to creator center

In your normal Chrome profile (or a dedicated automation profile):

1. Open https://creator.xiaohongshu.com/
2. Complete login manually
3. Confirm you can open the image-note publish page

## 4. Configure CDP launch

Learn the Chrome command for your OS with `--remote-debugging-port=9222` and your profile `--user-data-dir`. See SKILL.md.

Optional: set `XHS_CDP_URL=http://127.0.0.1:9222`.

## 5. Optional defaults

Create EXTEND.md at `.config/EXTEND.md` or `EXTEND.md`:

```md
default_output_dir: xhs-output
default_tags: AI工具, 程序员
default_timeout_ms: 60000
```

`default_output_dir` is resolved relative to the skill root (`xiaohongshu-publish-and-data/`), not the scripts working directory.

## 6. First publish verification

```bash
# Terminal 1: start Chrome with CDP (see SKILL.md)

# Terminal 2:
npx tsx post-note.ts --file ../test-fixtures/note.md --cdp-url http://127.0.0.1:9222
```

Confirm JSON output shows `success: true` and a warning like `Clicked 发布 via accessibility-cdp`.
