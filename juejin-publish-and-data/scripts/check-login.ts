import process from "node:process";
import {
  loadSkillConfig,
  parseFetchCliArgs,
  printFetchUsage,
  resolveAuthFile,
} from "./common";
import { crawlAnalytics, detectLoginIssue, verifyCreatorHome } from "./juejin-scraper";
import type { ConcretePageType } from "./types";

function resolvePages(page: "content" | "follower" | "both"): ConcretePageType[] {
  if (page === "both") return ["content", "follower"];
  return [page];
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printFetchUsage("check-login.ts");
    return;
  }

  const config = loadSkillConfig();
  const options = parseFetchCliArgs(argv, config);
  const authFile = resolveAuthFile(options.cookiePath, options.statePath, config);

  const home = await verifyCreatorHome(authFile, options.timeoutMs, options.headless);
  const baseIssue = detectLoginIssue([
    {
      pageType: "content",
      targetUrl: home.finalUrl,
      finalUrl: home.finalUrl,
      pageTitle: home.title,
      bodyPreview: home.bodyPreview,
      responses: [],
    },
  ]);
  if (baseIssue) {
    console.error(`[FAIL] ${baseIssue}`);
    process.exitCode = 2;
    return;
  }

  const pageTypes = resolvePages(options.page);
  const results = await crawlAnalytics({
    authFile,
    pageTypes,
    timeoutMs: options.timeoutMs,
    headless: options.headless,
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