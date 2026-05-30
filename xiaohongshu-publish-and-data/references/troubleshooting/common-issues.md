# Common Issues

## 1. CDP connection refused

Symptoms:

- `connectOverCDP` fails or connection refused on port 9222

Fix:

- close all Chrome windows, then restart Chrome with `--remote-debugging-port=9222`
- verify `http://127.0.0.1:9222/json/version` returns JSON
- use a dedicated `--user-data-dir` if the default profile is locked

## 2. Redirected to login page

Symptoms:

- publish page redirects to https://creator.xiaohongshu.com/login

Fix:

- log in manually in the **same Chrome profile** used for CDP
- open the image publish page once in that Chrome window before running the script

## 3. Publish button visible but click does not publish

Symptoms:

- you see `发布` / `暂存离开` on screen
- script clicks but no success page / no `web_api/sns/v2/note` POST

Root cause:

- publish controls live in **closed Shadow DOM** inside `<xhs-publish-btn>`
- the script clicks via **Chrome Accessibility tree + CDP `backendDOMNodeId`**

Fix:

- ensure note body is not empty (script defaults to title when missing)
- close popups / onboarding overlays in CDP Chrome
- inspect failure screenshot in `scripts/xhs-output/`
- confirm warnings show `Clicked 发布 via accessibility-cdp`

## 4. Publish clicked but success page not reached

Possible reasons:

- required fields missing (title, images, body)
- confirmation dialog appeared
- network delay

Fix:

- watch the CDP Chrome window during the run
- increase timeout with `--timeout 120000`
- inspect failure screenshot and validation toasts

## 5. Tags were not applied

Fix:

- keep tags short and commonly used
- watch topic picker behavior in CDP Chrome during `--headful` observation

## 6. Title looks truncated

Expected: Xiaohongshu titles are limited to 20 characters.

## 7. Why draft mode is not supported

Xiaohongshu web drafts are browser-local. This skill publishes directly instead of saving drafts.
