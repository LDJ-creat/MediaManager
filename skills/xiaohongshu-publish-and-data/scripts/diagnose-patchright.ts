import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "patchright";
import { XHS_PUBLISH_NOTE_URL } from "./common.js";
import { loadNoteInput, parsePostCliArgs, loadSkillConfig, resolveAuthFile } from "./common.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const config = loadSkillConfig();
  const note = loadNoteInput(parsePostCliArgs(["--file", path.resolve(__dirname, "../test-fixtures/note.md")], config));
  const authFile = resolveAuthFile(undefined, path.resolve(__dirname, "../.auth/storageState.json"), config);

  const browser = await chromium.launch({ headless: false, channel: "chrome" });
  const page = await (await browser.newContext({ storageState: authFile.path, viewport: { width: 1440, height: 960 } })).newPage();

  await page.goto(XHS_PUBLISH_NOTE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator('input[type="file"]').first().setInputFiles(note.imagePaths);
  await page.locator('input[placeholder*="填写标题"]').first().waitFor({ state: "visible" });
  await page.locator('input[placeholder*="填写标题"]').first().fill(note.title);
  await page.waitForTimeout(10000);

  const probe = await page.evaluate(`({
    webdriver: navigator.webdriver,
    hostInner: (document.querySelector('xhs-publish-btn')||{}).innerHTML?.length || 0,
    publishBtn: !!document.querySelector('button.ce-btn.bg-red'),
    texts: Array.from(document.querySelectorAll('button')).map(b => (b.textContent||'').trim()).filter(t => /发布|暂存/.test(t)),
  })`);
  console.log("patchright:", JSON.stringify(probe, null, 2));

  await browser.close();
}

main();
