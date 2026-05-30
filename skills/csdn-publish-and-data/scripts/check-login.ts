import process from "node:process";
import { loadSkillConfig, parseAnalyticsCliArgs, printAnalyticsUsage, resolveAuthFile } from "./common.js";
import { crawlAnalytics, detectLoginIssue, inspectCreatorSession } from "./csdn-scraper.js";
import type { ConcretePageType } from "./types.js";

function resolvePages(page: "analytics" | "manage" | "both"): ConcretePageType[] {
  if (page === "both") return ["analytics", "manage"];
  return [page];
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printAnalyticsUsage("check-login.ts");
    return;
  }

  const config = loadSkillConfig();
  const options = parseAnalyticsCliArgs(argv, config);
  const authFile = resolveAuthFile(options.cookiePath, options.statePath, config);
  const session = await inspectCreatorSession(authFile, options.headless, options.timeoutMs);
  const loginIssue = detectLoginIssue([{ finalUrl: session.finalUrl, pageTitle: session.pageTitle, bodyPreview: session.bodyPreview }]);

  if (loginIssue) {
    console.error(`[FAIL] ${loginIssue}`);
    process.exitCode = 2;
    return;
  }

  const records = await crawlAnalytics({
    authFile,
    pageTypes: resolvePages(options.page),
    timeoutMs: options.timeoutMs,
    headless: options.headless,
  });

  for (const record of records) {
    console.log(`[OK] ${record.pageType} page reachable: ${record.finalUrl}`);
    console.log(`[OK] ${record.pageType} captured responses: ${record.responses.length}`);
  }

  console.log("Login check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});