# Data Source Strategy

## Priority order

1. Capture XHR/fetch JSON responses from analysis pages
2. Read likely window state as fallback
3. DOM parsing reserved as future enhancement

## Why this order

- network payload is usually more stable than DOM rendering
- fallback window state helps when endpoint matching is incomplete
- normalized output is built from the captured payloads, while raw records are preserved for debugging and parser maintenance

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

- records keep deduplicated raw captures
- normalized keeps the compact business-facing structure used by reports
- metrics is only a curated compatibility layer and should not be treated as the full source of truth