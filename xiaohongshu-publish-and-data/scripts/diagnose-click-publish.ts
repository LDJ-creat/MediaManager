import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { loadNoteInput, loadSkillConfig, parsePostCliArgs, resolveAuthFile } from "./common.js";
import {
  canFindPublishButtonViaCdp,
  clickPublishViaAccessibility,
  clickPublishViaCdp,
  clickPublishViaHostLocator,
} from "./publish-button.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cdpUrl = process.argv[2] ?? "http://127.0.0.1:9222";

async function main(): Promise<void> {
  const config = loadSkillConfig();
  const note = loadNoteInput(
    parsePostCliArgs(["--file", path.resolve(__dirname, "../test-fixtures/note.md")], config),
  );
  const authFile = resolveAuthFile(
    undefined,
    path.resolve(__dirname, "../.auth/storageState.json"),
    config,
  );
  const state = JSON.parse(
    await import("node:fs").then((fs) =>
      fs.promises.readFile(authFile.path, "utf-8"),
    ),
  );

  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0];
  await context.addCookies(state.cookies);
  const page = await context.newPage();

  await page.goto(
    "https://creator.xiaohongshu.com/publish/publish?from=homepage&target=image",
    { waitUntil: "domcontentloaded", timeout: 60_000 },
  );
  await page.waitForTimeout(3000);

  const uploadInput = page.locator('input[type="file"]').first();
  await uploadInput.setInputFiles(note.imagePaths);
  await page.locator('input[placeholder*="填写标题"]').first().waitFor({ state: "visible" });
  await page.locator('input[placeholder*="填写标题"]').first().fill(note.title);

  const desc = page.locator(".ProseMirror").first();
  await desc.click();
  await page.keyboard.type(note.note, { delay: 20 });
  await page.waitForTimeout(1000);

  console.log("canFindPublishButtonViaCdp:", await canFindPublishButtonViaCdp(page));

  const client = await page.context().newCDPSession(page);
  await client.send("Accessibility.enable");
  const { nodes } = await client.send("Accessibility.getFullAXTree");
  const buttons = nodes.filter((n) => n.role?.value === "button");
  console.log(
    "AX buttons:",
    buttons.map((n) => n.name?.value).filter(Boolean),
  );

  page.on("response", (r) => {
    if (r.request().method() === "POST" && r.url().includes("edith.xiaohongshu.com")) {
      console.log("POST:", r.status(), r.url());
    }
  });

  console.log("\nTrying accessibility click...");
  const ax = await clickPublishViaAccessibility(page);
  console.log("accessibility result:", ax);
  await page.waitForTimeout(5000);
  console.log("url after accessibility:", page.url());

  if (!page.url().includes("success")) {
    console.log("\nTrying CDP click...");
    const cdp = await clickPublishViaCdp(page);
    console.log("cdp result:", cdp);
    await page.waitForTimeout(5000);
    console.log("url after cdp:", page.url());
  }

  if (!page.url().includes("success")) {
    console.log("\nTrying host locator click...");
    const host = await clickPublishViaHostLocator(page);
    console.log("host result:", host);
    await page.waitForTimeout(5000);
    console.log("url after host:", page.url());
  }

  await browser.close();
}

main().catch(console.error);
