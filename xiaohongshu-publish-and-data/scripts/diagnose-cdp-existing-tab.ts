import { chromium } from "playwright";

const cdpUrl = process.argv[2] ?? "http://127.0.0.1:9222";

async function main(): Promise<void> {
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0];
  if (!context) throw new Error("No CDP context");

  console.log("open pages:", context.pages().map((p) => p.url()));

  for (const page of context.pages()) {
    if (!page.url().includes("creator.xiaohongshu.com/publish")) continue;
    const info = await page.evaluate(`(() => {
      var host = document.querySelector("xhs-publish-btn");
      return {
        url: location.href,
        hostInnerLen: host ? host.innerHTML.length : -1,
        publishBtn: !!document.querySelector("button.ce-btn.bg-red"),
        draftBtn: !!document.querySelector("button.ce-btn.white"),
      };
    })()`);
    console.log("existing publish tab:", JSON.stringify(info, null, 2));
  }

  await browser.close();
}

main().catch(console.error);
