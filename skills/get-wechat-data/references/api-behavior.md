# Data Source Strategy

## Priority order

1. Capture XHR/fetch JSON responses from analysis pages
2. Read likely window state as fallback
3. DOM parsing reserved as future enhancement

## Why this order

- network payload is usually more stable than DOM rendering
- fallback window state helps when endpoint matching is incomplete
- normalized output is built from the captured payloads; use --save-raw to persist full crawl records for debugging

## Current endpoint matching

Content page capture keywords:

- appmsganalysis
- appmsg
- article
- read_num
- int_page_read

User page capture keywords:

- useranalysis
- user_summary
- user_source
- new_user
- cancel_user

If WeChat changes endpoint names, update scripts/wechat-scraper.ts keywords list.

## Output intent

- normalized in the main JSON keeps the compact business-facing structure used by reports
- raw crawl payloads are written only when --save-raw is enabled (for debugging and parser maintenance)