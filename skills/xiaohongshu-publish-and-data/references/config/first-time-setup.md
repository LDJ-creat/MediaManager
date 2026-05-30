# First-Time Setup

## CLI（推荐）

```bash
media workspace show
media xhs auth export          # Playwright 登录态（analytics）
media xhs auth check
media xhs analytics fetch
# 发布需 CDP Chrome：
media xhs post-note --file output/{slug}/note.md --cdp-url http://127.0.0.1:9222
```

Auth：`$WORKSPACE/.media-manager/auth/xhs/storageState.json`

---

## 1. Dependencies（Deep-dive）

```bash
cd skills/xiaohongshu-publish-and-data/scripts
npm install
media doctor
```

## 2. Publish: Chrome CDP

Start logged-in Chrome with `--remote-debugging-port=9222` (see SKILL.md).

## 3. Verification

```bash
media xhs auth check
media xhs analytics fetch
```
