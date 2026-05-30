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

  const consoleLogs: string[] = [];
  const pageErrors: string[] = [];

  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await (await browser.newContext({ storageState: authFile.path, viewport: { width: 1440, height: 960 } })).newPage();
  page.on("console", (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  await page.goto(XHS_PUBLISH_NOTE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator('input[type="file"]').first().setInputFiles(note.imagePaths);
  await page.locator('input[placeholder*="填写标题"]').first().waitFor({ state: "visible" });
  await page.waitForTimeout(5000);

  const customEl = await page.evaluate(`({
    defined: !!customElements.get('xhs-publish-btn'),
    hostCount: document.querySelectorAll('xhs-publish-btn').length,
    hostInner: (document.querySelector('xhs-publish-btn')||{}).innerHTML?.length || 0,
    scripts: Array.from(document.scripts).map(s => s.src).filter(Boolean).slice(-5),
  })`);

  console.log("Custom element:", customEl);
  console.log("Page errors:", pageErrors.slice(0, 10));
  console.log("Console errors:", consoleLogs.filter((l) => /error|fail|warn/i.test(l)).slice(0, 20));

  await browser.close();
}

main();
