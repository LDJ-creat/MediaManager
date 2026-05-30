import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { XHS_PUBLISH_NOTE_URL } from "./common.js";
import { loadNoteInput, parsePostCliArgs, loadSkillConfig, resolveAuthFile } from "./common.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const config = loadSkillConfig();
  const note = loadNoteInput(parsePostCliArgs(["--file", path.resolve(__dirname, "../test-fixtures/note.md")], config));
  const authFile = resolveAuthFile(undefined, path.resolve(__dirname, "../.auth/storageState.json"), config);

  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await (await browser.newContext({ storageState: authFile.path, viewport: { width: 1440, height: 960 } })).newPage();
  await page.goto(XHS_PUBLISH_NOTE_URL, { waitUntil: "networkidle", timeout: 60_000 });

  const uploadInput = page.locator('input[type="file"]').first();
  await uploadInput.setInputFiles(note.imagePaths);
  await page.locator('input[placeholder*="填写标题"]').first().waitFor({ state: "visible", timeout: 30_000 });

  for (const delay of [0, 1000, 3000, 5000, 10000, 15000]) {
    if (delay) await page.waitForTimeout(delay);
    const probe = await page.evaluate(`(function(){
      var host = document.querySelector('xhs-publish-btn');
      if (!host) return { delay: ${delay}, host: false };
      var sr = host.shadowRoot;
      function q(sel){ return host.querySelector(sel) || (sr && sr.querySelector(sel)); }
      var pub = q('button.ce-btn.bg-red');
      var draft = q('button.ce-btn.white');
      var wrap = q('.publish-page-publish-btn');
      return {
        delay: ${delay},
        host: true,
        hasShadowRoot: !!sr,
        shadowMode: sr ? 'open' : 'none',
        innerHTMLLen: host.innerHTML.length,
        publishText: pub ? pub.textContent.trim() : null,
        draftText: draft ? draft.textContent.trim() : null,
        wrapClass: wrap ? wrap.className : null,
        childButtonCount: host.querySelectorAll('button').length,
        shadowButtonCount: sr ? sr.querySelectorAll('button').length : 0,
      };
    })()`);
    console.log(JSON.stringify(probe));
  }

  // Playwright locator pierce test
  const pwCount = await page.locator("xhs-publish-btn button.ce-btn.bg-red").count();
  console.log("Playwright locator count:", pwCount);

  await browser.close();
}

main();
