import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { XHS_PUBLISH_NOTE_URL, loadSkillConfig, resolveAuthFile } from "./common.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cdpUrl = process.argv[2] ?? "http://127.0.0.1:9222";

async function main(): Promise<void> {
  const config = loadSkillConfig();
  const authFile = resolveAuthFile(
    undefined,
    path.resolve(__dirname, "../.auth/storageState.json"),
    config,
  );
  const state = JSON.parse(fs.readFileSync(authFile.path, "utf-8")) as {
    cookies: Array<Record<string, unknown>>;
    origins?: Array<{ origin: string; localStorage?: Array<{ name: string; value: string }> }>;
  };

  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0];
  if (!context) throw new Error("No CDP context");

  await context.addCookies(
    state.cookies.map((cookie) => ({
      name: String(cookie.name),
      value: String(cookie.value),
      domain: String(cookie.domain),
      path: String(cookie.path ?? "/"),
      expires: typeof cookie.expires === "number" ? cookie.expires : -1,
      httpOnly: Boolean(cookie.httpOnly),
      secure: Boolean(cookie.secure),
      sameSite: (cookie.sameSite as "Strict" | "Lax" | "None") ?? "Lax",
    })),
  );

  for (const origin of state.origins ?? []) {
    if (!origin.localStorage?.length) continue;
    const setupPage = await context.newPage();
    await setupPage.goto(origin.origin, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await setupPage.evaluate(
      `(items) => { for (var i = 0; i < items.length; i++) localStorage.setItem(items[i].name, items[i].value); }`,
      origin.localStorage,
    );
    await setupPage.close();
  }

  const page = await context.newPage();
  await page.goto(XHS_PUBLISH_NOTE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  console.log("url after goto:", page.url());
  await page.waitForTimeout(8000);

  let uploadInput = page.locator('input[type="file"][accept*="image"]').first();
  if ((await uploadInput.count()) === 0) {
    uploadInput = page.locator("div[class^='upload-content'] input[class='upload-input']").first();
  }
  if ((await uploadInput.count()) === 0) {
    const snap = path.resolve(__dirname, "../test-output/cdp-failure.png");
    fs.mkdirSync(path.dirname(snap), { recursive: true });
    await page.screenshot({ path: snap, fullPage: true });
    console.log("screenshot:", snap);
    console.log(
      "login box:",
      await page.locator("div[class*='login-box']").count(),
    );
    throw new Error("Upload input not found on CDP page");
  }
  await uploadInput.setInputFiles(path.resolve(__dirname, "../test-fixtures/test.png"));
  await page.locator('input[placeholder*="填写标题"]').first().waitFor({ state: "visible", timeout: 60_000 });
  await page.waitForTimeout(8000);

  const info = await page.evaluate(`(() => {
    var host = document.querySelector("xhs-publish-btn");
    return {
      hostInnerLen: host ? host.innerHTML.length : -1,
      publishBtn: !!document.querySelector("button.ce-btn.bg-red"),
      draftBtn: !!document.querySelector("button.ce-btn.white"),
      publishTexts: Array.from(document.querySelectorAll("button")).map(function(b){ return (b.textContent||"").trim(); }).filter(function(t){ return t === "发布" || t === "暂存离开"; }),
    };
  })()`);

  console.log("after upload (CDP real Chrome):", JSON.stringify(info, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
