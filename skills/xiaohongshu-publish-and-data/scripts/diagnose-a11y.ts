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
  await page.waitForTimeout(8000);

  const probes = {
    getByText发布: await page.getByText("发布", { exact: true }).count(),
    getByRoleButton发布: await page.getByRole("button", { name: "发布" }).count(),
    locatorBgRed: await page.locator(".ce-btn.bg-red").count(),
    locatorPublishWrap: await page.locator(".publish-page-publish-btn").count(),
    xhsPublishBtn: await page.locator("xhs-publish-btn").count(),
    allElementsWith发布: await page.evaluate(`Array.from(document.querySelectorAll('*')).filter(function(el){ return (el.childNodes.length===1 && el.childNodes[0].nodeType===3 && /发布|暂存离开/.test(el.textContent.trim())); }).map(function(el){ return { tag: el.tagName, class: el.className, text: el.textContent.trim() }; })`),
    treeWalker: await page.evaluate(`(function(){ var out=[]; var w=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); while(w.nextNode()){ var t=w.currentNode.textContent.trim(); if(/^发布$|^暂存离开$/.test(t)) out.push({ text:t, parentTag:w.currentNode.parentElement && w.currentNode.parentElement.tagName, parentClass:w.currentNode.parentElement && w.currentNode.parentElement.className }); } return out; })()`),
  };

  console.log(JSON.stringify(probes, null, 2));

  // Try piercing with >>>
  try {
    const pierce = await page.locator("xhs-publish-btn >>> button.bg-red").count();
    console.log("Pierce shadow count:", pierce);
  } catch (e) {
    console.log("Pierce failed:", e);
  }

  await browser.close();
}

main();
