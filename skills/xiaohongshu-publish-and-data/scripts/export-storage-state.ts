import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { XHS_CREATOR_HOME_URL, XHS_PUBLISH_NOTE_URL } from "./common.js";
import { parseStorageStateOutputArg } from "@dsmlll/media-manager-platform-common";

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function ensureDirSync(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function parseOutputPath(args: string[]): string {
  return parseStorageStateOutputArg(args, skillRoot);
}

async function main(): Promise<void> {
  const outputPath = parseOutputPath(process.argv.slice(2));
  ensureDirSync(path.dirname(outputPath));

  const browser = await chromium.launch({
    headless: false,
    channel: "chrome",
  });
  const context = await browser.newContext({
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();
  await page.goto(XHS_CREATOR_HOME_URL, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  console.log("A browser window has been opened.");
  console.log("1. Log in to Xiaohongshu creator center in that window.");
  console.log(`2. Open ${XHS_PUBLISH_NOTE_URL} and confirm the image-note publish page loads.`);
  console.log("3. Return here and press Enter to save storageState.json.");
  console.log(`Target file: ${outputPath}`);

  const rl = readline.createInterface({ input, output });
  await rl.question("");
  rl.close();

  await context.storageState({ path: outputPath });
  await browser.close();

  console.log(`Saved storage state to: ${outputPath}`);
  console.log("Next step:");
  console.log(`npx tsx check-login.ts --state "${outputPath}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
