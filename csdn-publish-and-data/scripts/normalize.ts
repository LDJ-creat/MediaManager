import { normalizeDate } from "./common.js";
import type {
  CapturedResponse,
  CrawlResult,
  AnalyticsReport,
  ArticleAnalyticsReport,
  ArticleDailyStats,
  ArticleQualityScore,
  CreatorOverview,
} from "./types.js";

function uniqueResponses(responses: CapturedResponse[]): CapturedResponse[] {
  const seen = new Set<string>();
  const output: CapturedResponse[] = [];

  for (const response of responses) {
    const key = `${response.url}::${JSON.stringify(response.payload)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(response);
  }

  return output;
}

export function dedupeCrawlResults(results: CrawlResult[]): CrawlResult[] {
  return results.map((result) => ({
    ...result,
    responses: uniqueResponses(result.responses),
  }));
}

function getNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim())) return Number(value);
  return undefined;
}

function normalizeAnyDate(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    const length = String(Math.trunc(value)).length;
    if (length === 13) {
      return new Date(value).toISOString().slice(0, 10);
    }
    if (length === 10) {
      return new Date(value * 1000).toISOString().slice(0, 10);
    }
    return normalizeDate(String(Math.trunc(value)));
  }
  if (typeof value === "string" && value.trim()) {
    return normalizeDate(value);
  }
  return undefined;
}

function extractOverview(results: CrawlResult[]): CreatorOverview {
  for (const result of results) {
    for (const response of result.responses) {
      if (!response.url.includes("/blog-statistics")) continue;
      const payload = response.payload as {
        data?: Array<{
          enName?: string;
          num?: number;
        }>;
      } | undefined;
      const rows = payload?.data;
      if (!Array.isArray(rows)) continue;

      const overview: CreatorOverview = {};
      for (const row of rows) {
        const key = row.enName;
        const value = getNumber(row.num);
        if (!key || value === undefined) continue;
        if (key === "article") overview.articleCount = value;
        if (key === "exposure") overview.exposuresCount = value;
        if (key === "digg") overview.diggCount = value;
        if (key === "comment") overview.commentCount = value;
        if (key === "view") overview.viewCount = value;
        if (key === "score") overview.score = value;
        if (key === "quality") overview.averageQuality = value;
        if (key === "collect") overview.collectCount = value;
      }
      return overview;
    }
  }

  return {};
}

function getRange(results: CrawlResult[]): { start: string; end: string } {
  for (const result of results) {
    for (const response of result.responses) {
      if (!response.url.includes("/single-article-statistics")) continue;
      const url = new URL(response.url);
      const start = url.searchParams.get("start");
      const end = url.searchParams.get("end");
      if (!start || !end) continue;
      return {
        start: normalizeAnyDate(Number(start)) ?? normalizeDate(start) ?? start,
        end: normalizeAnyDate(Number(end)) ?? normalizeDate(end) ?? end,
      };
    }
  }

  return { start: "", end: "" };
}

function extractArticleList(results: CrawlResult[]): ArticleAnalyticsReport[] {
  for (const result of results) {
    for (const response of result.responses) {
      if (!response.url.includes("/single-article-list")) continue;
      const payload = response.payload as { data?: { list?: Array<Record<string, unknown>> } } | undefined;
      const list = payload?.data?.list;
      if (!Array.isArray(list)) continue;
      const recentArticles: Array<ArticleAnalyticsReport | undefined> = list
        .map((item) => {
          const articleId = item.articleId;
          const title = item.title;
          if ((typeof articleId !== "string" && typeof articleId !== "number") || typeof title !== "string") {
            return undefined;
          }
          return {
            articleId: String(articleId),
            title,
            url: typeof item.url === "string" ? item.url : undefined,
            summary: {
              publishTime: typeof item.postTime === "string" ? item.postTime : normalizeAnyDate(item.createTime),
              exposuresCount: getNumber(item.exposuresCount),
              viewCount: getNumber(item.viewCount),
              commentCount: getNumber(item.commentCount),
              favoriteCount: getNumber(item.favoriteCount),
              fansCount: getNumber(item.fansCount),
              diggCount: getNumber(item.diggCount),
            },
            recent7Days: [],
          } satisfies ArticleAnalyticsReport;
        });
      return recentArticles.filter((item): item is ArticleAnalyticsReport => item !== undefined);
    }
  }

  return [];
}

function extractArticleStatistics(results: CrawlResult[], articleId: string): ArticleDailyStats[] {
  for (const result of results) {
    for (const response of result.responses) {
      if (!response.url.includes("/single-article-statistics")) continue;
      if (!response.url.includes(`articleId=${articleId}`)) continue;
      const payload = response.payload as {
        data?: {
          list?: Array<Record<string, unknown>>;
        };
      } | undefined;
      const rows = payload?.data?.list;
      if (!Array.isArray(rows)) continue;
      const dailyStats: Array<ArticleDailyStats | undefined> = rows
        .map((row) => {
          const date = normalizeAnyDate(row.pdate ?? row.date);
          if (!date) return undefined;
          return {
            date,
            exposuresCount: getNumber(row.exposuresCount),
            viewCount: getNumber(row.viewCount),
            commentCount: getNumber(row.commentCount),
            diggCount: getNumber(row.diggCount),
            favoriteCount: getNumber(row.favoriteCount),
            fansCount: getNumber(row.fansCount),
          } satisfies ArticleDailyStats;
        });
      return dailyStats
        .filter((item): item is ArticleDailyStats => item !== undefined)
        .sort((left, right) => left.date.localeCompare(right.date));
    }
  }

  return [];
}

function extractQualityScores(results: CrawlResult[], articleId: string): ArticleQualityScore[] {
  for (const result of results) {
    for (const response of result.responses) {
      if (!response.url.includes("/quality-score-list")) continue;
      if (!response.url.includes(`articleId=${articleId}`)) continue;
      const payload = response.payload as { data?: Array<Record<string, unknown>> } | undefined;
      const rows = payload?.data;
      if (!Array.isArray(rows)) continue;
      return rows
        .map((row) => ({
          score: getNumber(row.score),
          version: typeof row.version === "string" ? row.version : undefined,
          createAt: typeof row.createAt === "string" ? row.createAt : undefined,
        }))
        .sort((left, right) => (right.createAt ?? "").localeCompare(left.createAt ?? ""));
    }
  }

  return [];
}

export function buildAnalyticsReport(results: CrawlResult[]): AnalyticsReport {
  const articles = extractArticleList(results).slice(0, 5).map((article) => ({
    ...article,
    recent7Days: extractArticleStatistics(results, article.articleId),
    summary: {
      ...article.summary,
      qualityScore: extractQualityScores(results, article.articleId)[0],
    },
  }));

  return {
    range: getRange(results),
    overview: extractOverview(results),
    articles,
  };
}
