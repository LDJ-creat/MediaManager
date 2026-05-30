# Export Cookie JSON

## Goal

Export cookie JSON from a browser profile that is already logged in to https://mp.weixin.qq.com.

## Suggested method

Use browser extension or developer tools to export cookies as JSON array.

Required fields per cookie item:

- name
- value
- domain

Recommended additional fields:

- path
- expires
- httpOnly
- secure
- sameSite

## Validation tips

- domain should include mp.weixin.qq.com
- cookies should be fresh (export right before running script)
- avoid manual editing unless necessary

## Security

- Cookie is a secret credential
- do not commit into git
- rotate and re-export when session expires