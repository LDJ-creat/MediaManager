import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { XHS_PUBLISH_NOTE_URL } from "./common.js";
import { loadNoteInput, parsePostCliArgs, loadSkillConfig } from "./common.js";
import { DEFAULT_IGNORE_DEFAULT_ARGS, DEFAULT_LAUNCH_ARGS, STEALTH_INIT_SCRIPT } from "./stealth-init.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const profileDir = path.resolve(__dirname, "../.auth/chrome-profile-test");
  fs.mkdirSync(profileDir, { recursive: true });

  const config = loadSkillConfig();
  const note = loadNoteInput(parsePostCliArgs(["--file", path.resolve(__dirname, "../test-fixtures/note.md")], config));

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    channel: "chrome",
    ignoreDefaultArgs: DEFAULT_IGNORE_DEFAULT_ARGS,
    args: DEFAULT_LAUNCH_ARGS,
    viewport: { width: 1440, height: 960 },
    permissions: ["geolocation"],
    geolocation: { latitude: 31.2304, longitude: 121.4737 },
  });
  await context.addInitScript(STEALTH_INIT_SCRIPT);

  const storagePath = path.resolve(__dirname, "../.auth/storageState.json");
  if (fs.existsSync(storagePath)) {
    const state = JSON.parse(fs.readFileSync(storagePath, "utf-8")) as { cookies?: Array<{ name: string; value: string; domain: string; path?: string }> };
    if (state.cookies?.length) {
      await context.addCookies(
        state.cookies.map((c) => ({
          ...c,
          path: c.path ?? "/",
        })),
      );
    }
  }

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(XHS_PUBLISH_NOTE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });

  if (page.url().includes("/login")) {
    console.log("Need login in persistent profile - cannot auto-test hydration");
    await context.close();
    return;
  }

  await page.locator('input[type="file"]').first().setInputFiles(note.imagePaths);
  await page.locator('input[placeholder*="填写标题"]').first().waitFor({ state: "visible" });
  await page.locator('input[placeholder*="填写标题"]').first().fill(note.title);
  await page.waitForTimeout(10000);

  const probe = await page.evaluate(`({
    hostInner: (document.querySelector('xhs-publish-btn')||{}).innerHTML?.length || 0,
    publishBtn: !!document.querySelector('button.ce-btn.bg-red'),
    texts: Array.from(document.querySelectorAll('button')).map(b => (b.textContent||'').trim()).filter(t => /发布|暂存/.test(t)),
  })`);
  console.log("persistent profile:", probe);

  await context.close();
}

main();
