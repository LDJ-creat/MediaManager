import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  assertDateRange,
  ensureDirSync,
  loadSkillConfig,
  nowStamp,
  parseAnalyticsCliArgs,
  printAnalyticsUsage,
  resolveAuthFile,
} from "./common.js";
import { crawlAnalytics, detectLoginIssue, resolveAnalyticsRange } from "./csdn-scraper.js";
import { buildAnalyticsReport, dedupeCrawlResults } from "./normalize.js";
import type { ConcretePageType, FetchOutput } from "./types.js";

function resolvePages(page: "analytics" | "manage" | "both"): ConcretePageType[] {
  if (page === "both") return ["analytics", "manage"];
  return [page];
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printAnalyticsUsage("fetch-analytics.ts");
    return;
  }

  const config = loadSkillConfig();
  const options = parseAnalyticsCliArgs(argv, config);
  assertDateRange(options.start, options.end);

  const authFile = resolveAuthFile(options.cookiePath, options.statePath, config);
  const outputDir = path.resolve(process.cwd(), options.outputDir);
  ensureDirSync(outputDir);
  const range = resolveAnalyticsRange(options.start, options.end);
  const records = await crawlAnalytics({
    authFile,
    pageTypes: resolvePages(options.page),
    start: range.start,
    end: range.end,
    timeoutMs: options.timeoutMs,
    headless: options.headless,
  });

  const loginIssue = detectLoginIssue(records);
  if (loginIssue) {
    throw new Error(loginIssue);
  }

  const dedupedRecords = dedupeCrawlResults(records);
  const report = buildAnalyticsReport(dedupedRecords);
  const output: FetchOutput = {
    generatedAt: new Date().toISOString(),
    report,
  };

  const stamp = nowStamp();
  const jsonPath = path.join(outputDir, `csdn-analytics-${stamp}.json`);

  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2), "utf-8");

  if (options.saveRaw) {
    const rawDir = path.join(outputDir, `raw-${stamp}`);
    ensureDirSync(rawDir);
    for (const record of dedupedRecords) {
      fs.writeFileSync(path.join(rawDir, `${record.pageType}.json`), JSON.stringify(record, null, 2), "utf-8");
    }
    console.log(`[OK] raw records saved: ${rawDir}`);
  }

  if (options.probeOnly) {
    console.log("Probe mode enabled: capture pipeline verified.");
  }

  console.log(`[OK] output json: ${jsonPath}`);
  console.log(`[OK] selected articles: ${report.articles.length}/${report.overview.articleCount ?? report.articles.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});