import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

function ensureDirSync(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function defaultOutputPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, "..", ".auth", "storageState.json");
}

function parseOutputPath(args: string[]): string {
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--output" && args[i + 1]) {
      return path.resolve(process.cwd(), args[i + 1]);
    }
  }
  return defaultOutputPath();
}

async function main(): Promise<void> {
  const outputPath = parseOutputPath(process.argv.slice(2));
  ensureDirSync(path.dirname(outputPath));

  const browser = await chromium.launch({
    headless: false,
    channel: "chromium",
  });
  const context = await browser.newContext({
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();

  await page.goto("https://mp.csdn.net/", { waitUntil: "domcontentloaded", timeout: 60_000 });

  console.log("A browser window has been opened.");
  console.log("1. Log in to CSDN creator center in that window.");
  console.log("2. Open the editor page or analytics page and confirm real data is visible.");
  console.log("3. Return here and press Enter to save storageState.json.");
  console.log(`Target file: ${outputPath}`);

  const rl = readline.createInterface({ input, output });
  await rl.question("");
  rl.close();

  await context.storageState({ path: outputPath });
  await browser.close();

  console.log(`Saved storage state to: ${outputPath}`);
  console.log("Next step:");
  console.log(`npx tsx check-login.ts --page both --state \"${outputPath}\"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});