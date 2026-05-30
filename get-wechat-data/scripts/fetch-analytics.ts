import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  assertDateRange,
  ensureDirSync,
  loadSkillConfig,
  nowStamp,
  parseCliArgs,
  printUsage,
  resolveAuthFile,
} from "./common";
import { buildCuratedMetrics, buildNormalizedAnalytics, dedupeCrawlResults } from "./normalize";
import { crawlAnalytics, detectLoginIssue, filterMetricsByDate } from "./wechat-scraper";
import type {
  ConcretePageType,
  ContentArticleItem,
  ContentTrendPoint,
  FetchOutput,
  NormalizedAnalytics,
  UserDailyItem,
} from "./types";

function resolvePages(page: "content" | "user" | "both"): ConcretePageType[] {
  if (page === "both") return ["content", "user"];
  return [page];
}

function inDateRange(date: string, start?: string, end?: string): boolean {
  if (date === "summary") return true;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function filterContentDailyTotals(items: ContentTrendPoint[], start?: string, end?: string): ContentTrendPoint[] {
  const filtered = items.filter((item) => inDateRange(item.date, start, end));
  const firstNonZeroIndex = filtered.findIndex((item) => (
    item.readUv > 0 ||
    item.shareUv > 0 ||
    (item.collectionUv ?? 0) > 0 ||
    (item.massPv ?? 0) > 0 ||
    (item.sourceUv ?? 0) > 0
  ));
  return firstNonZeroIndex >= 0 ? filtered.slice(firstNonZeroIndex) : filtered;
}

function filterContentArticles(items: ContentArticleItem[], start?: string, end?: string): ContentArticleItem[] {
  return items.filter((item) => inDateRange(item.refDate, start, end));
}

function filterUserDailyTotals(items: UserDailyItem[], start?: string, end?: string): UserDailyItem[] {
  return items.filter((item) => inDateRange(item.date, start, end));
}

function filterNormalized(normalized: NormalizedAnalytics, start?: string, end?: string): NormalizedAnalytics {
  return {
    content: normalized.content
      ? {
          summary: normalized.content.summary,
          dailyTotals: filterContentDailyTotals(normalized.content.dailyTotals, start, end),
          articles: filterContentArticles(normalized.content.articles, start, end),
        }
      : undefined,
    user: normalized.user
      ? {
          summary: normalized.user.summary,
          dailyTotals: filterUserDailyTotals(normalized.user.dailyTotals, start, end),
        }
      : undefined,
  };
}

function renderContentSummary(output: FetchOutput): string[] {
  const summary = output.normalized.content?.summary;
  if (!summary) return ["## Content Summary", "- none", ""];

  return [
    "## Content Summary",
    `- Read: ${summary.read}`,
    `- Like: ${summary.like}`,
    `- Share: ${summary.share}`,
    `- Collection: ${summary.collection}`,
    `- Comment: ${summary.comment}`,
    "",
  ];
}

function renderUserSummary(output: FetchOutput): string[] {
  const summary = output.normalized.user?.summary;
  if (!summary) return ["## User Summary", "- none", ""];

  return [
    "## User Summary",
    `- New User: ${summary.newUser}`,
    `- Cancel User: ${summary.cancelUser}`,
    `- Netgain User: ${summary.netgainUser}`,
    `- Cumulate User: ${summary.cumulateUser}`,
    "",
  ];
}

function renderContentTrend(output: FetchOutput): string[] {
  const rows = output.normalized.content?.dailyTotals ?? [];
  return [
    "## Content Daily Trend",
    "| date | read_uv | share_uv | collection_uv | mass_pv |",
    "|---|---|---|---|---|",
    ...(rows.length > 0
      ? rows.map((item) => `| ${item.date} | ${item.readUv} | ${item.shareUv} | ${item.collectionUv ?? 0} | ${item.massPv ?? 0} |`)
      : ["| - | - | - | - | - |"]),
    "",
  ];
}

function renderUserTrend(output: FetchOutput): string[] {
  const rows = output.normalized.user?.dailyTotals ?? [];
  return [
    "## User Daily Trend",
    "| date | new_user | cancel_user | netgain_user | cumulate_user |",
    "|---|---|---|---|---|",
    ...(rows.length > 0
      ? rows.map((item) => `| ${item.date} | ${item.newUser} | ${item.cancelUser} | ${item.netgainUser} | ${item.cumulateUser} |`)
      : ["| - | - | - | - | - |"]),
    "",
  ];
}

function renderContentArticles(output: FetchOutput): string[] {
  const rows = output.normalized.content?.articles ?? [];
  return [
    "## Content Articles",
    "| ref_date | title | total_read_uv | read_uv_ratio |",
    "|---|---|---|---|",
    ...(rows.length > 0
      ? rows.map((item) => `| ${item.refDate} | ${item.title.replaceAll("|", "\\|")} | ${item.totalReadUv} | ${item.readUvRatio !== undefined ? `${(item.readUvRatio * 100).toFixed(2)}%` : "-"} |`)
      : ["| - | - | - | - |"]),
    "",
  ];
}

function toMarkdown(output: FetchOutput): string {
  const byPage = output.records.map((record) => {
    const metricCount = output.metrics.filter((m) => m.pageType === record.pageType).length;
    return `- ${record.pageType}: responses=${record.responses.length}, metrics=${metricCount}, finalUrl=${record.finalUrl}`;
  }).join("\n");

  const topMetrics = output.metrics.slice(0, 20)
    .map((m) => `| ${m.pageType} | ${m.date} | ${m.metric} | ${m.value} |`)
    .join("\n");

  return [
    "# WeChat Analytics Fetch Report",
    "",
    `- Generated: ${output.generatedAt}`,
    `- Page scope: ${output.page}`,
    `- Date range: ${output.start ?? "-"} ~ ${output.end ?? "-"}`,
    `- Output dir: ${output.outputDir}`,
    `- Record count: ${output.records.length}`,
    `- Metric count: ${output.metrics.length}`,
    "",
    "## Page Summary",
    byPage || "- none",
    "",
    ...renderContentSummary(output),
    ...renderUserSummary(output),
    ...renderContentTrend(output),
    ...renderUserTrend(output),
    ...renderContentArticles(output),
    "## Curated Metrics (first 20)",
    "| page | date | metric | value |",
    "|---|---|---|---|",
    topMetrics || "| - | - | - | - |",
    "",
    "## Notes",
    "- Data source priority: network responses > fallback window state.",
    "- If metric count is low, verify cookie validity and page permissions.",
  ].join("\n");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage("fetch-analytics.ts");
    return;
  }

  const config = loadSkillConfig();
  const options = parseCliArgs(argv, config);
  assertDateRange(options.start, options.end);

  const authFile = resolveAuthFile(options.cookiePath, options.statePath, config);
  const pageTypes = resolvePages(options.page);
  const outputDir = path.resolve(process.cwd(), options.outputDir);
  ensureDirSync(outputDir);

  const records = await crawlAnalytics({
    authFile,
    pageTypes,
    token: options.token,
    timeoutMs: options.timeoutMs,
    headless: options.headless,
    proxyServer: options.proxyServer,
  });

  const loginIssue = detectLoginIssue(records);
  if (loginIssue) {
    throw new Error(loginIssue);
  }

  const dedupedRecords = dedupeCrawlResults(records);
  const normalized = filterNormalized(buildNormalizedAnalytics(dedupedRecords), options.start, options.end);
  const metrics = filterMetricsByDate(buildCuratedMetrics(normalized), options.start, options.end);

  const output: FetchOutput = {
    generatedAt: new Date().toISOString(),
    page: options.page,
    start: options.start,
    end: options.end,
    outputDir,
    records: dedupedRecords,
    metrics,
    normalized,
  };

  const stamp = nowStamp();
  const jsonPath = path.join(outputDir, `wechat-analytics-${stamp}.json`);
  const mdPath = path.join(outputDir, `wechat-analytics-${stamp}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2), "utf-8");
  fs.writeFileSync(mdPath, toMarkdown(output), "utf-8");

  if (options.saveRaw) {
    const rawDir = path.join(outputDir, `raw-${stamp}`);
    ensureDirSync(rawDir);
    for (const record of dedupedRecords) {
      const file = path.join(rawDir, `${record.pageType}.json`);
      fs.writeFileSync(file, JSON.stringify(record, null, 2), "utf-8");
    }
    console.log(`[OK] raw records saved: ${rawDir}`);
  }

  if (options.probeOnly) {
    console.log("Probe mode enabled: capture pipeline verified.");
  }

  console.log(`[OK] output json: ${jsonPath}`);
  console.log(`[OK] output markdown: ${mdPath}`);
  console.log(`[OK] metrics: ${metrics.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
