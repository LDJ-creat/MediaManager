import process from "node:process";
import {
  assertDateRange,
  loadSkillConfig,
  parseCliArgs,
  printUsage,
  resolveAuthFile,
} from "./common";
import { crawlAnalytics, detectLoginIssue } from "./wechat-scraper";
import type { ConcretePageType } from "./types";

function resolvePages(page: "content" | "user" | "both"): ConcretePageType[] {
  if (page === "both") return ["content", "user"];
  return [page];
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage("check-login.ts");
    return;
  }

  const config = loadSkillConfig();
  const options = parseCliArgs(argv, config);
  assertDateRange(options.start, options.end);

  const authFile = resolveAuthFile(options.cookiePath, options.statePath, config);
  const pageTypes = resolvePages(options.page);

  const results = await crawlAnalytics({
    authFile,
    pageTypes,
    token: options.token,
    timeoutMs: options.timeoutMs,
    headless: options.headless,
    proxyServer: options.proxyServer,
  });

  const loginIssue = detectLoginIssue(results);
  if (loginIssue) {
    console.error(`[FAIL] ${loginIssue}`);
    process.exitCode = 2;
    return;
  }

  for (const result of results) {
    console.log(`[OK] ${result.pageType} page reachable: ${result.finalUrl}`);
    console.log(`[OK] ${result.pageType} captured responses: ${result.responses.length}`);
  }

  console.log("Login check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
