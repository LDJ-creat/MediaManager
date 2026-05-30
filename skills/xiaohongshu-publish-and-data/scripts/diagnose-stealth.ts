import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { XHS_PUBLISH_NOTE_URL } from "./common.js";
import { loadNoteInput, parsePostCliArgs, loadSkillConfig, resolveAuthFile } from "./common.js";
import { DEFAULT_IGNORE_DEFAULT_ARGS, DEFAULT_LAUNCH_ARGS, STEALTH_INIT_SCRIPT } from "./stealth-init.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const config = loadSkillConfig();
  const note = loadNoteInput(parsePostCliArgs(["--file", path.resolve(__dirname, "../test-fixtures/note.md")], config));
  const authFile = resolveAuthFile(undefined, path.resolve(__dirname, "../.auth/storageState.json"), config);

  const browser = await chromium.launch({
    headless: false,
    channel: "chrome",
    ignoreDefaultArgs: DEFAULT_IGNORE_DEFAULT_ARGS,
    args: DEFAULT_LAUNCH_ARGS,
  });
  const context = await browser.newContext({
    storageState: authFile.path,
    viewport: { width: 1440, height: 960 },
    permissions: ["geolocation"],
    geolocation: { latitude: 31.2304, longitude: 121.4737 },
  });
  await context.addInitScript(STEALTH_INIT_SCRIPT);
  const page = await context.newPage();

  await page.goto(XHS_PUBLISH_NOTE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator('input[type="file"]').first().setInputFiles(note.imagePaths);
  await page.locator('input[placeholder*="填写标题"]').first().waitFor({ state: "visible" });
  await page.locator('input[placeholder*="填写标题"]').first().fill(note.title);
  await page.waitForTimeout(8000);

  const probe = await page.evaluate(`({
    webdriver: navigator.webdriver,
    hostInner: (document.querySelector('xhs-publish-btn')||{}).innerHTML?.length || 0,
    publishBtn: !!document.querySelector('button.ce-btn.bg-red'),
    texts: Array.from(document.querySelectorAll('button')).map(b => (b.textContent||'').trim()).filter(t => /发布|暂存/.test(t)),
  })`);
  console.log(JSON.stringify(probe, null, 2));

  await browser.close();
}

main();
