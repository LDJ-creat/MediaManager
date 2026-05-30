# First-Time Setup

## CLI（推荐）

```bash
media workspace show
media doctor
media wechat auth export
media wechat auth check
media wechat analytics fetch
```

Auth：`$WORKSPACE/.media-manager/auth/wechat/storageState.json`

---

## 1. Install runtime

Node.js 20+ and `@media-manager/cli`.

## 2. Script dependencies（Deep-dive）

```bash
cd skills/get-wechat-data/scripts
npm install
npx playwright install chromium
```

## 3. Auth file

Playwright `storageState.json` from logged-in mp.weixin.qq.com session.

See [../cookie/export-storage-state.md](../cookie/export-storage-state.md).

## 4. Optional EXTEND.md

Set `default_output_dir` relative to workspace if needed.

## 5. First fetch

```bash
media wechat analytics fetch
```

Output under `$WORKSPACE/.media-manager/data/analytics/wechat/`.

See [../output-format.md](../output-format.md).
