# First-Time Setup

## CLI（推荐）

```bash
media workspace show
media doctor
media csdn auth export    # 登录后导出凭证 → $WORKSPACE/.media-manager/auth/csdn/
media csdn auth check
media csdn analytics fetch
media csdn post --file output/{slug}/article.md --draft
```

Auth 优先路径：`$WORKSPACE/.media-manager/auth/csdn/storageState.json`（兼容 skill 内 `.auth/`）。

---

This skill is designed to work on Windows, macOS, and Linux.

## 1. Install runtime

Preferred runtime: Node.js 20+. Install `@dsmlll/media-manager-cli` or run from MediaManager monorepo after `npm run build`.

## 2. Install script dependencies（Deep-dive）

When running scripts directly (not via `media`):

```bash
cd skills/csdn-publish-and-data/scripts
npm install
npx playwright install chromium
```

Ubuntu missing libraries: [../ubuntu/headless-setup.md](../ubuntu/headless-setup.md).

## 3. Prepare auth file

Preferred: `$WORKSPACE/.media-manager/auth/csdn/storageState.json`

Fallback: `cookies.json` in the same directory.

Export guide: [../auth/export-storage-state.md](../auth/export-storage-state.md).

## 4. Optional defaults

Create `EXTEND.md` at `.config/EXTEND.md` or skill root. See SKILL.md for keys.

## 5. Quick verification

```bash
media csdn auth check
media csdn analytics fetch --preview   # if supported; else media doctor
```
