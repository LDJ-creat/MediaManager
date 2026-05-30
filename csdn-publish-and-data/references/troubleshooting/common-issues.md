# Common Issues

## 1. Redirected to login page

Symptoms:

- final URL contains passport.csdn.net
- page title contains 登录
- check-login reports FAIL

Fix:

- re-export storageState.json after opening a real creator page
- prefer storageState.json over cookies.json
- confirm the account still has access to creator center

## 2. Captured response count is 0

Possible reasons:

- creator page changed its API endpoints
- timeout too short
- page needs additional scrolling or interaction before requesting data

Fix:

- rerun with `--timeout 60000`
- rerun with `--headful`
- keep `--save-raw` enabled and inspect final URL plus page state
- update capture keywords in scripts/csdn-scraper.ts if CSDN changes request names

## 3. Article table is incomplete

Possible reasons:

- manage page switched to a new table layout
- data is loaded lazily after extra filters or pagination

Fix:

- rerun with `--headful`
- inspect fallback tables in raw/manage.json
- update fallback table extraction or response matching logic

## 4. Draft button not found

Possible reasons:

- editor layout changed
- additional onboarding or popup blocked the action

Fix:

- rerun with `--headful`
- close onboarding or popup manually
- inspect visible button text and update draft button patterns in scripts/csdn-scraper.ts

## 5. Category was not filled or tags were skipped

Possible reasons:

- account-specific dialog differs
- controls are custom combobox widgets
- tag/original controls may be missing or rendered differently in the publish dialog

Fix:

- use `--headful` and verify visible control text
- keep the current warnings in the draft result and patch selectors based on the real account UI when needed

## 6. Ubuntu cannot launch browser

Fix:

- install system libraries from [../ubuntu/headless-setup.md](../ubuntu/headless-setup.md)
- rerun `npx playwright install chromium`