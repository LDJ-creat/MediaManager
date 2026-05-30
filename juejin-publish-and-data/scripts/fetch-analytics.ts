import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  assertDateRange,
  ensureDirSync,
  loadSkillConfig,
  nowStamp,
  parseFetchCliArgs,
  printFetchUsage,
  resolveAuthFile,
} from "./common";
import { crawlAnalytics, detectLoginIssue } from "./juejin-scraper";
import { buildNormalizedAnalytics, dedupeCrawlResults } from "./normalize";
import type {
  ArticleTrendRow,
  ConcretePageType,
  FetchOutput,
  FollowerDateRow,
  NormalizedAnalytics,
} from "./types";

function resolvePages(page: "content" | "follower" | "both"): ConcretePageType[] {
  if (page === "both") return ["content", "follower"];
  return [page];
}

function inDateRange(date: string | undefined, start?: string, end?: string): boolean {
  if (!date) return true;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function filterArticleTrendRows(items: ArticleTrendRow[], start?: string, end?: string): ArticleTrendRow[] {
  return items.filter((item) => inDateRange(item.date, start, end));
}

function filterFollowerRows(items: FollowerDateRow[], start?: string, end?: string): FollowerDateRow[] {
  return items.filter((item) => inDateRange(item.date, start, end));
}

function filterNormalized(normalized: NormalizedAnalytics, start?: string, end?: string): NormalizedAnalytics {
  return {
    content: normalized.content
      ? {
          ...normalized.content,
          articles: normalized.content.articles.map((item) => ({
            ...item,
            recent7Days: filterArticleTrendRows(item.recent7Days, start, end),
          })),
        }
      : undefined,
    follower: normalized.follower
      ? {
          ...normalized.follower,
          dateRows: filterFollowerRows(normalized.follower.dateRows, start, end),
        }
      : undefined,
  };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printFetchUsage("fetch-analytics.ts");
    return;
  }

  const config = loadSkillConfig();
  const options = parseFetchCliArgs(argv, config);
  assertDateRange(options.start, options.end);

  const authFile = resolveAuthFile(options.cookiePath, options.statePath, config);
  const pageTypes = resolvePages(options.page);
  const outputDir = path.resolve(process.cwd(), options.outputDir);
  ensureDirSync(outputDir);

  const records = await crawlAnalytics({
    authFile,
    pageTypes,
    timeoutMs: options.timeoutMs,
    headless: options.headless,
  });

  const loginIssue = detectLoginIssue(records);
  if (loginIssue) {
    throw new Error(loginIssue);
  }

  const dedupedRecords = dedupeCrawlResults(records);
  const normalized = filterNormalized(buildNormalizedAnalytics(dedupedRecords), options.start, options.end);

  const stamp = nowStamp();
  let rawDir: string | undefined;
  if (options.saveRaw) {
    rawDir = path.join(outputDir, `raw-${stamp}`);
    ensureDirSync(rawDir);
    for (const record of dedupedRecords) {
      fs.writeFileSync(path.join(rawDir, `${record.pageType}.json`), JSON.stringify(record, null, 2), "utf-8");
    }
  }

  const output: FetchOutput = {
    generatedAt: new Date().toISOString(),
    page: options.page,
    start: options.start,
    end: options.end,
    outputDir,
    rawDir,
    normalized,
  };

  const jsonPath = path.join(outputDir, `juejin-analytics-${stamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2), "utf-8");

  if (options.probeOnly) {
    console.log("Probe mode enabled: capture pipeline verified.");
  }

  if (rawDir) {
    console.log(`[OK] raw records saved: ${rawDir}`);
  }
  console.log(`[OK] output json: ${jsonPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});