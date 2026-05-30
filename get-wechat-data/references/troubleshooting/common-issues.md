# Common Issues

## 1. Redirected to login page

Symptoms:

- final URL contains login
- check-login returns FAIL

Fix:

- open mp.weixin.qq.com in browser, confirm login is still valid
- re-export cookie JSON
- ensure cookie domain includes mp.weixin.qq.com
- re-export storageState.json and prefer it over cookies.json
- ensure the state was captured after opening a real backend page with visible analytics data

## 2. Captured response count is 0

Possible reasons:

- insufficient permissions for analysis pages
- page changed and API endpoints differ
- timeout too short

Fix:

- rerun with --timeout 60000
- rerun with --headful for visibility
- save raw and inspect final URL and network behavior
- if a manual --token was provided, retry without --token so the script can auto-discover the live token

## 3. Metric count too low

Possible reasons:

- date filter excluded most records
- API response shape changed
- only fallback state available

Fix:

- remove date filter and retry
- keep --save-raw and inspect raw files
- update capture keywords in scripts/wechat-scraper.ts

## 4. Summary values look correct but trend output is noisy

Possible reasons:

- the selected range contains many leading zero days before the first effective record
- raw payload includes more historical rows than the page summary card implies

Fix:

- use --start and --end to focus on the reporting window you care about
- inspect the normalized section in the JSON output before relying on curated metrics
- compare with raw-* only when parser behavior is in doubt

## 5. Ubuntu cannot launch browser

Fix:

- install system libs in references/ubuntu/headless-setup.md
- rerun playwright install chromium

## 6. Cookie file parse error

Fix:

- ensure file is JSON array
- each item must contain name, value, domain