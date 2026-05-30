import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  assertPositiveLimit,
  ensureDirSync,
  loadSkillConfig,
  nowStamp,
  parseFetchCliArgs,
  printFetchUsage,
  resolveAuthFile,
  resolveOutputDir,
} from "./common.js";
import { buildAnalyticsReport, dedupeCrawlResults } from "./normalize.js";
import { crawlNoteAnalytics, detectLoginIssue } from "./xhs-scraper.js";
import type { FetchOutput } from "./types.js";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printFetchUsage("fetch-analytics.ts");
    return;
  }

  const config = loadSkillConfig();
  const options = parseFetchCliArgs(argv, config);
  assertPositiveLimit(options.limit);

  const authFile = resolveAuthFile(options.cookiePath, options.statePath, config);
  const outputDir = resolveOutputDir(options.outputDir);
  ensureDirSync(outputDir);

  const records = await crawlNoteAnalytics({
    authFile,
    limit: options.limit,
    timeoutMs: options.timeoutMs,
    headless: options.headless,
  });

  const loginIssue = detectLoginIssue(records);
  if (loginIssue) {
    throw new Error(loginIssue);
  }

  const dedupedRecords = dedupeCrawlResults(records);
  const report = buildAnalyticsReport(dedupedRecords, options.limit);
  const stamp = nowStamp();

  let rawDir: string | undefined;
  if (options.saveRaw) {
    rawDir = path.join(outputDir, `raw-${stamp}`);
    ensureDirSync(rawDir);
    for (const record of dedupedRecords) {
      fs.writeFileSync(
        path.join(rawDir, `${record.pageType}.json`),
        JSON.stringify(record, null, 2),
        "utf-8",
      );
    }
  }

  const output: FetchOutput = {
    generatedAt: new Date().toISOString(),
    limit: options.limit,
    outputDir,
    rawDir,
    report,
  };

  const jsonPath = path.join(outputDir, `xhs-analytics-${stamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2), "utf-8");

  if (options.probeOnly) {
    console.log("Probe mode enabled: capture pipeline verified.");
  }

  if (rawDir) {
    console.log(`[OK] raw records saved: ${rawDir}`);
  }

  console.log(`[OK] output json: ${jsonPath}`);
  console.log(`[OK] fetched notes: ${report.notes.length}/${options.limit}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
