import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "playwright";
import { chromium } from "playwright";
import { XHS_PUBLISH_NOTE_URL } from "./common.js";
import { loadNoteInput, parsePostCliArgs, loadSkillConfig, resolveAuthFile } from "./common.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function inspectButtons(page: Page, label: string) {
  const info = await page.evaluate(`(() => {
    function pick(el) {
      if (!el) return null;
      var rect = el.getBoundingClientRect();
      var style = window.getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        className: String(el.className || ""),
        text: String(el.textContent || "").trim().slice(0, 80),
        visible: rect.width > 0 && rect.height > 0,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
        inViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth,
      };
    }
    var publishBtn = document.querySelector(".publish-page-publish-btn button.ce-btn.bg-red") || document.querySelector("xhs-publish-btn button.ce-btn.bg-red");
    var draftBtn = document.querySelector(".publish-page-publish-btn button.ce-btn.white") || document.querySelector("xhs-publish-btn button.ce-btn.white");
    return {
      url: location.href,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      scrollY: window.scrollY,
      bodyHeight: document.body.scrollHeight,
      publishHost: pick(document.querySelector("xhs-publish-btn")),
      publishWrap: pick(document.querySelector(".publish-page-publish-btn")),
      publishBtn: pick(publishBtn),
      draftBtn: pick(draftBtn),
      allRedButtons: Array.from(document.querySelectorAll("button.ce-btn.bg-red")).map(pick),
      allWhiteButtons: Array.from(document.querySelectorAll("button.ce-btn.white")).map(pick),
    };
  })()`);

  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(info, null, 2));
  return info;
}

async function main(): Promise<void> {
  const outDir = path.resolve(__dirname, "..", "test-output", "diagnose-" + Date.now());
  fs.mkdirSync(outDir, { recursive: true });

  const config = loadSkillConfig();
  const options = parsePostCliArgs(
    ["--file", path.resolve(__dirname, "../test-fixtures/note.md")],
    config,
  );
  const note = loadNoteInput(options);
  const authFile = resolveAuthFile(undefined, path.resolve(__dirname, "../.auth/storageState.json"), config);

  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    viewport: { width: 1440, height: 960 },
    permissions: ["geolocation"],
    storageState: authFile.path,
  });
  const page = await context.newPage();

  await page.goto(XHS_PUBLISH_NOTE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(outDir, "01-after-goto.png"), fullPage: true });
  await inspectButtons(page, "after goto");

  let uploadInput = page.locator('input[type="file"][accept*="image"]').first();
  if ((await uploadInput.count()) === 0) {
    uploadInput = page.locator("div[class^='upload-content'] input.upload-input").first();
  }
  await uploadInput.setInputFiles(note.imagePaths);
  console.log("Uploaded:", note.imagePaths);

  await page.waitForTimeout(8000);
  await page.screenshot({ path: path.join(outDir, "02-after-upload.png"), fullPage: true });
  const afterUpload = await inspectButtons(page, "after upload");

  const titleInput = page.locator('input[placeholder*="填写标题"]').first();
  const titleVisible = (await titleInput.count()) > 0;
  console.log("Title input visible:", titleVisible);
  if (titleVisible) {
    await titleInput.fill(note.title);
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, "03-after-title.png"), fullPage: true });
  await inspectButtons(page, "after title");

  await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, "04-scroll-bottom.png"), fullPage: true });
  await inspectButtons(page, "after scroll bottom");

  const tabs = await page.evaluate(`Array.from(document.querySelectorAll("button, div, span, a")).map(function(el){ return (el.textContent || "").trim(); }).filter(function(t){ return /上传图文|图文|视频|写长文/.test(t); }).slice(0, 20)`);
  console.log("\nTab-like texts:", tabs);

  console.log(`\nScreenshots: ${outDir}`);
  console.log("Publish btn after upload:", afterUpload);

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
