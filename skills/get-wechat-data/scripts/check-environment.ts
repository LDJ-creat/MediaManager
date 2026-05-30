import { chromium } from "playwright";

function printOk(message: string): void {
  console.log(`[OK] ${message}`);
}

function printFail(message: string): void {
  console.error(`[FAIL] ${message}`);
}

async function main(): Promise<void> {
  let failed = false;

  try {
    const executable = chromium.executablePath();
    if (!executable) {
      throw new Error("Chromium executable path is empty");
    }
    printOk(`Playwright Chromium executable: ${executable}`);
  } catch (error) {
    failed = true;
    printFail(`Playwright Chromium unavailable: ${(error as Error).message}`);
  }

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent("<html><body>ok</body></html>");
    await browser.close();
    printOk("Headless Chromium launch succeeded");
  } catch (error) {
    failed = true;
    printFail(`Headless Chromium launch failed: ${(error as Error).message}`);
    printFail("Ubuntu server may need extra libraries. See references/ubuntu/headless-setup.md");
  }

  if (failed) {
    process.exitCode = 1;
    return;
  }

  console.log("Environment check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
