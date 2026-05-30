# First-Time Setup

## CLI（推荐）

```bash
media workspace show
media doctor
media juejin auth export
media juejin auth check
media juejin analytics fetch
media juejin post --file output/{slug}/article.md --draft
```

Auth：`$WORKSPACE/.media-manager/auth/juejin/storageState.json`

---

## 1. Install runtime

Node.js 20+ and `@media-manager/cli`, or monorepo dev build.

## 2. Script dependencies（Deep-dive）

```bash
cd skills/juejin-publish-and-data/scripts
npm install
npx playwright install chromium
```

## 3. Auth file

See [../cookie/export-storage-state.md](../cookie/export-storage-state.md).

## 4. Verification

```bash
media juejin auth check
media juejin analytics fetch
```
