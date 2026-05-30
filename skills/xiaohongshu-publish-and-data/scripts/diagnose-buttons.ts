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

  await page.locator('input[type="file"]').first().setInputFiles(note.imagePaths);
  await page.locator('input[placeholder*="填写标题"]').first().waitFor({ state: "visible" });
  await page.locator('input[placeholder*="填写标题"]').first().fill(note.title);
  await page.waitForTimeout(5000);

  const result = await page.evaluate(`(function(){
    function chain(el, depth){
      if (!el || depth > 8) return [];
      var p = el.parentElement;
      if (!p) return [el.tagName.toLowerCase() + (el.className ? '.'+String(el.className).trim().split(/\\s+/).slice(0,3).join('.') : '')];
      return chain(p, depth+1).concat([el.tagName.toLowerCase() + (el.className ? '.'+String(el.className).trim().split(/\\s+/).slice(0,3).join('.') : '')]);
    }
    var buttons = Array.from(document.querySelectorAll('button'));
    return buttons.map(function(btn){
      var t = (btn.textContent || '').trim();
      if (!/发布|暂存|离开/.test(t)) return null;
      var rect = btn.getBoundingClientRect();
      return {
        text: t,
        className: String(btn.className),
        visible: rect.width > 0 && rect.height > 0,
        rect: { top: rect.top, left: rect.left, w: rect.width, h: rect.height },
        chain: chain(btn, 0),
      };
    }).filter(Boolean);
  })()`);

  console.log("Matching buttons:", JSON.stringify(result, null, 2));

  const frames = page.frames().map((f) => f.url());
  console.log("Frames:", frames);

  await browser.close();
}

main();
