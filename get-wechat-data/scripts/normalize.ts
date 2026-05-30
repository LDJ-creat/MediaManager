import { normalizeDate } from "./common";
import type {
  CapturedResponse,
  ContentArticleItem,
  ContentNormalizedData,
  ContentSummary,
  ContentTrendPoint,
  CrawlResult,
  MetricPoint,
  NormalizedAnalytics,
  UserDailyItem,
  UserNormalizedData,
  UserSummary,
} from "./types";

function uniqueResponses(responses: CapturedResponse[]): CapturedResponse[] {
  const seen = new Set<string>();
  const out: CapturedResponse[] = [];

  for (const response of responses) {
    const key = `${response.url}::${JSON.stringify(response.payload)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(response);
  }

  return out;
}

export function dedupeCrawlResults(results: CrawlResult[]): CrawlResult[] {
  return results.map((result) => ({
    ...result,
    responses: uniqueResponses(result.responses),
  }));
}

function toYmdFromUnixSeconds(value: number): string {
  const date = new Date(value * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeAnyDate(value: string | number): string {
  if (typeof value === "number") {
    if (value > 1_000_000_000) return toYmdFromUnixSeconds(value);
    return normalizeDate(String(value));
  }

  const trimmed = value.trim();
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
    return trimmed.replaceAll("/", "-");
  }
  return normalizeDate(trimmed);
}

function parseContentSummary(bodyPreview?: string): ContentSummary | undefined {
  if (!bodyPreview) return undefined;

  const start = bodyPreview.indexOf("数据时间");
  const end = bodyPreview.indexOf("流量分析");
  const section = start >= 0 && end > start ? bodyPreview.slice(start, end) : bodyPreview;
  const values = section
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => /^\d+$/.test(item))
    .map((item) => Number(item));

  if (values.length < 5) return undefined;

  return {
    read: values[0],
    like: values[1],
    share: values[2],
    collection: values[3],
    comment: values[4],
  };
}

function parseUserSummary(bodyPreview?: string): UserSummary | undefined {
  if (!bodyPreview) return undefined;

  const pattern = /新关注人数\s+(\d+)[\s\S]*?取消关注人数\s+(\d+)[\s\S]*?净增关注人数\s+(\d+)[\s\S]*?累计关注人数\s+(\d+)/;
  const match = bodyPreview.match(pattern);
  if (!match) return undefined;

  return {
    newUser: Number(match[1]),
    cancelUser: Number(match[2]),
    netgainUser: Number(match[3]),
    cumulateUser: Number(match[4]),
  };
}

function findContentTrendPayload(result: CrawlResult): Record<string, unknown> | undefined {
  const response = result.responses.find((item) => item.url.includes("action=get_article_stat_tendency_and_source"));
  return response?.payload && typeof response.payload === "object" ? response.payload as Record<string, unknown> : undefined;
}

function findContentArticlePayload(result: CrawlResult): Record<string, unknown> | undefined {
  const response = result.responses.find((item) => item.url.includes("action=get_article_list"));
  return response?.payload && typeof response.payload === "object" ? response.payload as Record<string, unknown> : undefined;
}

function findUserCategoryPayload(result: CrawlResult): Record<string, unknown> | undefined {
  const response = result.responses.find((item) => item.url.includes("/misc/useranalysis?"));
  return response?.payload && typeof response.payload === "object" ? response.payload as Record<string, unknown> : undefined;
}

function extractContentDailyTotals(result: CrawlResult): ContentTrendPoint[] {
  const payload = findContentTrendPayload(result);
  const tendency = payload?.all_article_stat_tendency as { list?: Array<Record<string, unknown>> } | undefined;
  const list = Array.isArray(tendency?.list) ? tendency.list : [];

  return list
    .filter((item) => Number(item.scene) === 9999)
    .map((item) => ({
      date: normalizeAnyDate(Number(item.date)),
      readUv: Number(item.read_uv ?? 0),
      shareUv: Number(item.share_uv ?? 0),
      sourceUv: Number(item.source_uv ?? 0),
      collectionUv: Number(item.collection_uv ?? 0),
      massPv: Number(item.mass_pv ?? 0),
    }));
}

function extractContentArticles(result: CrawlResult): ContentArticleItem[] {
  const payload = findContentArticlePayload(result);
  const articleList = payload?.article_list as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(articleList)) return [];

  const seen = new Set<string>();
  const out: ContentArticleItem[] = [];
  for (const item of articleList) {
    const title = String(item.title ?? "").trim();
    const refDate = normalizeAnyDate(String(item.ref_date ?? ""));
    const totalReadUv = Number(item.total_read_uv ?? 0);
    const key = `${title}::${refDate}`;
    if (!title || seen.has(key)) continue;
    seen.add(key);
    out.push({
      title,
      refDate,
      totalReadUv,
      readUvRatio: typeof item.read_uv_ratio === "number" ? Number(item.read_uv_ratio) : undefined,
    });
  }

  return out;
}

function extractUserDailyTotals(result: CrawlResult): UserDailyItem[] {
  const payload = findUserCategoryPayload(result);
  const categoryList = payload?.category_list as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(categoryList)) return [];

  const overall = categoryList.find((item) => Number(item.user_source) === 99999999) ?? categoryList[0];
  const list = Array.isArray(overall?.list) ? overall.list as Array<Record<string, unknown>> : [];

  return list.map((item) => ({
    date: normalizeAnyDate(String(item.date ?? "")),
    newUser: Number(item.new_user ?? 0),
    cancelUser: Number(item.cancel_user ?? 0),
    netgainUser: Number(item.netgain_user ?? 0),
    cumulateUser: Number(item.cumulate_user ?? 0),
  }));
}

export function buildNormalizedAnalytics(results: CrawlResult[]): NormalizedAnalytics {
  const normalized: NormalizedAnalytics = {};

  const content = results.find((item) => item.pageType === "content");
  if (content) {
    const value: ContentNormalizedData = {
      summary: parseContentSummary(content.bodyPreview),
      dailyTotals: extractContentDailyTotals(content),
      articles: extractContentArticles(content),
    };
    normalized.content = value;
  }

  const user = results.find((item) => item.pageType === "user");
  if (user) {
    const dailyTotals = extractUserDailyTotals(user);
    const value: UserNormalizedData = {
      summary: parseUserSummary(user.bodyPreview) ?? (dailyTotals.length > 0
        ? {
            newUser: dailyTotals[dailyTotals.length - 1].newUser,
            cancelUser: dailyTotals[dailyTotals.length - 1].cancelUser,
            netgainUser: dailyTotals[dailyTotals.length - 1].netgainUser,
            cumulateUser: dailyTotals[dailyTotals.length - 1].cumulateUser,
          }
        : undefined),
      dailyTotals,
    };
    normalized.user = value;
  }

  return normalized;
}

export function buildCuratedMetrics(normalized: NormalizedAnalytics): MetricPoint[] {
  const metrics: MetricPoint[] = [];

  if (normalized.content?.summary) {
    const summary = normalized.content.summary;
    metrics.push(
      { pageType: "content", date: "summary", metric: "summary.read", value: summary.read, sourceUrl: "page-body" },
      { pageType: "content", date: "summary", metric: "summary.like", value: summary.like, sourceUrl: "page-body" },
      { pageType: "content", date: "summary", metric: "summary.share", value: summary.share, sourceUrl: "page-body" },
      { pageType: "content", date: "summary", metric: "summary.collection", value: summary.collection, sourceUrl: "page-body" },
      { pageType: "content", date: "summary", metric: "summary.comment", value: summary.comment, sourceUrl: "page-body" },
    );
  }

  if (normalized.user?.summary) {
    const summary = normalized.user.summary;
    metrics.push(
      { pageType: "user", date: "summary", metric: "summary.new_user", value: summary.newUser, sourceUrl: "page-body" },
      { pageType: "user", date: "summary", metric: "summary.cancel_user", value: summary.cancelUser, sourceUrl: "page-body" },
      { pageType: "user", date: "summary", metric: "summary.netgain_user", value: summary.netgainUser, sourceUrl: "page-body" },
      { pageType: "user", date: "summary", metric: "summary.cumulate_user", value: summary.cumulateUser, sourceUrl: "page-body" },
    );
  }

  for (const item of normalized.content?.dailyTotals ?? []) {
    metrics.push(
      { pageType: "content", date: item.date, metric: "daily.read_uv", value: item.readUv, sourceUrl: "content-trend" },
      { pageType: "content", date: item.date, metric: "daily.share_uv", value: item.shareUv, sourceUrl: "content-trend" },
      { pageType: "content", date: item.date, metric: "daily.collection_uv", value: item.collectionUv ?? 0, sourceUrl: "content-trend" },
      { pageType: "content", date: item.date, metric: "daily.mass_pv", value: item.massPv ?? 0, sourceUrl: "content-trend" },
    );
  }

  for (const item of normalized.user?.dailyTotals ?? []) {
    metrics.push(
      { pageType: "user", date: item.date, metric: "daily.new_user", value: item.newUser, sourceUrl: "user-trend" },
      { pageType: "user", date: item.date, metric: "daily.cancel_user", value: item.cancelUser, sourceUrl: "user-trend" },
      { pageType: "user", date: item.date, metric: "daily.netgain_user", value: item.netgainUser, sourceUrl: "user-trend" },
      { pageType: "user", date: item.date, metric: "daily.cumulate_user", value: item.cumulateUser, sourceUrl: "user-trend" },
    );
  }

  return metrics;
}
