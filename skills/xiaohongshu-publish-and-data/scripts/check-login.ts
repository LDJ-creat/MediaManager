import process from "node:process";
import {
  loadSkillConfig,
  parseLoginCliArgs,
  printLoginUsage,
  resolveAuthFile,
} from "./common.js";
import { checkLoginSession } from "./xhs-scraper.js";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printLoginUsage("check-login.ts");
    return;
  }

  const config = loadSkillConfig();
  const options = parseLoginCliArgs(argv, config);
  const authFile = resolveAuthFile(options.cookiePath, options.statePath, config);
  const result = await checkLoginSession(authFile, options.headless, options.timeoutMs);

  if (!result.valid) {
    console.error(`[FAIL] ${result.message}`);
    console.error(`[FAIL] final url: ${result.finalUrl}`);
    process.exitCode = 2;
    return;
  }

  console.log(`[OK] ${result.message}`);
  console.log(`[OK] final url: ${result.finalUrl}`);
  console.log("Login check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
