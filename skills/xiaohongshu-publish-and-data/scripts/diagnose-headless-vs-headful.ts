import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { XHS_PUBLISH_NOTE_URL } from "./common.js";
import { loadNoteInput, parsePostCliArgs, loadSkillConfig, resolveAuthFile } from "./common.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run(headless: boolean, label: string) {
  const config = loadSkillConfig();
  const note = loadNoteInput(parsePostCliArgs(["--file", path.resolve(__dirname, "../test-fixtures/note.md")], config));
  const authFile = resolveAuthFile(undefined, path.resolve(__dirname, "../.auth/storageState.json"), config);

  const browser = await chromium.launch({
    headless,
    channel: "chrome",
    args: headless ? [] : ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    storageState: authFile.path,
    viewport: { width: 1440, height: 960 },
    locale: "zh-CN",
  });
  const page = await context.newPage();
  await page.goto(XHS_PUBLISH_NOTE_URL, { waitUntil: "networkidle", timeout: 60_000 });
  await page.locator('input[type="file"]').first().setInputFiles(note.imagePaths);
  await page.locator('input[placeholder*="填写标题"]').first().waitFor({ state: "visible" });
  await page.locator('input[placeholder*="填写标题"]').first().fill(note.title);
  await page.waitForTimeout(8000);

  const treeWalker = await page.evaluate(`(function(){ var out=[]; var w=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); while(w.nextNode()){ var t=w.currentNode.textContent.trim(); if(/^发布$|^暂存离开$/.test(t)) out.push(t); } return out; })()`);
  const hostInner = await page.evaluate(`(function(){ var h=document.querySelector('xhs-publish-btn'); return h ? h.innerHTML.length : -1; })()`);
  const pw = await page.locator("xhs-publish-btn button.ce-btn.bg-red").count();

  const out = path.resolve(__dirname, "..", "test-output", `mode-${label}.png`);
  await page.screenshot({ path: out, fullPage: true });

  console.log(label, { treeWalker, hostInner, pw, screenshot: out, webdriver: await page.evaluate("navigator.webdriver") });

  await browser.close();
}

async function main() {
  await run(true, "headless");
  await run(false, "headful");
}

main();
