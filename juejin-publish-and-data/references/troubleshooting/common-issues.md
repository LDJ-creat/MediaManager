# Common Issues

## 1. Redirected to login page

Symptoms:

- final URL contains login or passport
- check-login returns FAIL
- creator page body contains 登录 or 扫码登录

Fix:

- open Juejin creator pages in a real browser and confirm the session is still valid
- re-export storageState.json and prefer it over cookies.json
- make sure the auth file was captured after the creator page fully loaded

## 2. Captured response count is 0

Possible reasons:

- creator permission is insufficient
- page structure or data endpoint changed
- timeout is too short

Fix:

- rerun with --timeout 60000
- rerun with --headful for visibility
- keep --save-raw enabled and inspect raw output

## 3. normalized.content.articles is empty

Possible reasons:

- the response payload shape changed
- the content page returned only dashboard shells without data
- only fallback window state was available and it lacked article rows

Fix:

- inspect raw-*/content.json
- update extraction keys in scripts/normalize.ts
- use --probe or --headful to confirm the page really loaded visible rows

## 4. follower metrics are missing or partial

Possible reasons:

- the follower page only returned summary cards
- the account lacks follower analytics permissions
- distribution blocks changed shape

Fix:

- compare raw-*/follower.json with current normalize.ts extraction keys
- treat distribution as optional and rely on dateRows if present

## 5. post-article cannot find title or body editor

Possible reasons:

- editor DOM changed
- the page loaded a different editor mode
- login state is not valid for editor access

Fix:

- rerun with --headful and inspect the editor page
- confirm page URL is still /editor/drafts/new?v=2 or an equivalent editor URL
- update selectors in scripts/juejin-scraper.ts

## 6. draft save works but tags or optional metadata are missing

Possible reasons:

- optional controls changed in the editor UI
- tag or column suggestion panels did not resolve as expected
- the platform requires manual confirmation for some optional fields

Fix:

- validate the draft was saved first
- pass tags, column, and cover explicitly
- use headful mode and inspect which optional control was not matched