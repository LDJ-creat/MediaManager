import { formatTimestamp, normalizeDate } from "./common";
import type {
  ArticleNormalizedRecord,
  ArticleTrendRow,
  CapturedResponse,
  ContentNormalizedData,
  ContentOverview,
  CrawlResult,
  FollowerDateRow,
  FollowerNormalizedData,
  NormalizedAnalytics,
} from "./types";

function uniqueResponses(responses: CapturedResponse[]): CapturedResponse[] {
  const seen = new Set<string>();
  const out: CapturedResponse[] = [];

  for (const response of responses) {
    const key = `${response.url}::${JSON.stringify(response.meta ?? null)}::${JSON.stringify(response.payload)}`;
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

function walkNode(node: unknown, visit: (value: unknown) => void): void {
  visit(node);
  if (Array.isArray(node)) {
    for (const item of node) walkNode(item, visit);
    return;
  }
  if (node && typeof node === "object") {
    for (const value of Object.values(node as Record<string, unknown>)) {
      walkNode(value, visit);
    }
  }
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[,_\s]/g, "");
    const num = Number(normalized);
    if (Number.isFinite(num)) return num;
  }
  return undefined;
}

function toDateString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return normalizeDate(value);
  if (typeof value === "number" && value > 0) {
    if (value > 1_000_000_000_000) return new Date(value).toISOString().slice(0, 10);
    if (value > 1_000_000_000) return new Date(value * 1000).toISOString().slice(0, 10);
    return normalizeDate(String(value));
  }
  return undefined;
}

function getString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function getNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = toNumber(obj[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function getObject(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return undefined;
}

function toArticleUrl(articleId: string): string {
  return `https://juejin.cn/post/${articleId}`;
}

function extractContentOverview(result: CrawlResult): ContentOverview | undefined {
  let overview: ContentOverview | undefined;

  for (const response of result.responses) {
    if (!response.url.includes("/author_center/data/card")) continue;
    walkNode(response.payload, (value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return;
      const item = value as Record<string, unknown>;
      const datas = getObject(item, ["datas"]);
      if (!datas) return;

      const articleCount = getNumber(getObject(datas, ["all_article"]) ?? {}, ["cnt"]);
      const displayCount = getNumber(getObject(datas, ["all_article_display"]) ?? {}, ["cnt"]);
      const viewCount = getNumber(getObject(datas, ["all_article_view"]) ?? {}, ["cnt"]);
      const diggCount = getNumber(getObject(datas, ["all_article_digg"]) ?? {}, ["cnt"]);
      const commentCount = getNumber(getObject(datas, ["all_article_comment"]) ?? {}, ["cnt"]);
      const collectCount = getNumber(getObject(datas, ["all_article_collect"]) ?? {}, ["cnt"]);

      if ([articleCount, displayCount, viewCount, diggCount, commentCount, collectCount].every((metric) => metric === undefined)) {
        return;
      }

      overview = {
        articleCount,
        displayCount,
        viewCount,
        diggCount,
        commentCount,
        collectCount,
      };
    });
  }

  return overview;
}

interface ArticleAccumulator {
  record: ArticleNormalizedRecord;
  publishEpoch?: number;
}

function resolvePublishEpoch(obj: Record<string, unknown>): number | undefined {
  return getNumber(obj, ["publish_time", "publishTime", "ctime", "mtime", "unixdate"]);
}

function buildArticleRecord(item: Record<string, unknown>, sourceUrl: string): ArticleAccumulator | undefined {
  const articleInfo = getObject(item, ["article_info"]) ?? item;
  const articleId = getString(articleInfo, ["article_id", "articleId", "id", "item_id"]);
  const title = getString(articleInfo, ["title", "article_title", "articleTitle"]);
  if (!articleId || !title) return undefined;

  return {
    publishEpoch: resolvePublishEpoch(articleInfo),
    record: {
      articleId,
      articleUrl: toArticleUrl(articleId),
      title,
      briefContent: getString(articleInfo, ["brief_content", "briefContent"]),
      publishTime: formatTimestamp(articleInfo.publish_time ?? articleInfo.publishTime ?? articleInfo.ctime ?? articleInfo.mtime),
      displayCount: getNumber(articleInfo, ["display_count", "displayCount"]) ?? 0,
      viewCount: getNumber(articleInfo, ["view_count", "viewCount", "pv"]) ?? 0,
      diggCount: getNumber(articleInfo, ["digg_count", "diggCount"]) ?? 0,
      commentCount: getNumber(articleInfo, ["comment_count", "commentCount"]) ?? 0,
      collectCount: getNumber(articleInfo, ["collect_count", "collectCount"]) ?? 0,
      shareCount: getNumber(articleInfo, ["share_count", "shareCount"]) ?? 0,
      recent7Days: [],
      sourceUrls: [sourceUrl],
    },
  };
}

function extractArticleRecords(result: CrawlResult): ArticleAccumulator[] {
  const articles = new Map<string, ArticleAccumulator>();
  const containers = result.responses.map((response) => ({ node: response.payload, sourceUrl: response.url }));
  if (result.fallbackState !== undefined) {
    containers.push({ node: result.fallbackState, sourceUrl: `${result.targetUrl}#fallback-state` });
  }

  for (const container of containers) {
    walkNode(container.node, (value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return;
      const built = buildArticleRecord(value as Record<string, unknown>, container.sourceUrl);
      if (!built) return;

      const existing = articles.get(built.record.articleId);
      if (!existing) {
        articles.set(built.record.articleId, built);
        return;
      }

      existing.publishEpoch = Math.max(existing.publishEpoch ?? 0, built.publishEpoch ?? 0) || existing.publishEpoch || built.publishEpoch;
      existing.record.briefContent = existing.record.briefContent || built.record.briefContent;
      existing.record.publishTime = existing.record.publishTime || built.record.publishTime;
      existing.record.displayCount = Math.max(existing.record.displayCount, built.record.displayCount);
      existing.record.viewCount = Math.max(existing.record.viewCount, built.record.viewCount);
      existing.record.diggCount = Math.max(existing.record.diggCount, built.record.diggCount);
      existing.record.commentCount = Math.max(existing.record.commentCount, built.record.commentCount);
      existing.record.collectCount = Math.max(existing.record.collectCount, built.record.collectCount);
      existing.record.shareCount = Math.max(existing.record.shareCount, built.record.shareCount);
      if (!existing.record.sourceUrls.includes(container.sourceUrl)) {
        existing.record.sourceUrls.push(container.sourceUrl);
      }
    });
  }

  return [...articles.values()].sort((left, right) => {
    const leftEpoch = left.publishEpoch ?? 0;
    const rightEpoch = right.publishEpoch ?? 0;
    return rightEpoch - leftEpoch || right.record.viewCount - left.record.viewCount;
  });
}

function mergeTrendRows(rows: ArticleTrendRow[]): ArticleTrendRow[] {
  const byDate = new Map<string, ArticleTrendRow>();
  for (const row of rows) {
    const existing = byDate.get(row.date);
    if (!existing) {
      byDate.set(row.date, row);
      continue;
    }
    byDate.set(row.date, {
      date: row.date,
      displayCount: Math.max(existing.displayCount, row.displayCount),
      viewCount: Math.max(existing.viewCount, row.viewCount),
      diggCount: Math.max(existing.diggCount, row.diggCount),
      commentCount: Math.max(existing.commentCount, row.commentCount),
      collectCount: Math.max(existing.collectCount, row.collectCount),
      shareCount: Math.max(existing.shareCount, row.shareCount),
    });
  }
  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}

function readTrendSeries(datas: Record<string, unknown>, key: string): Array<Record<string, unknown>> {
  const value = datas[key];
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : [];
}

function buildArticleTrendRowsFromPayload(payload: unknown): ArticleTrendRow[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const data = getObject(root, ["data"]);
  const datas = data ? getObject(data, ["datas"]) : undefined;
  if (!datas) return [];

  const byDate = new Map<string, ArticleTrendRow>();
  const assign = (key: string, setter: (row: ArticleTrendRow, value: number) => void) => {
    for (const item of readTrendSeries(datas, key)) {
      const date = toDateString(item.date ?? item.day ?? item.unixdate);
      if (!date) continue;
      const cnt = toNumber(item.cnt) ?? 0;
      const current = byDate.get(date) ?? {
        date,
        displayCount: 0,
        viewCount: 0,
        diggCount: 0,
        commentCount: 0,
        collectCount: 0,
        shareCount: 0,
      };
      setter(current, cnt);
      byDate.set(date, current);
    }
  };

  assign("incr_article_display", (row, value) => {
    row.displayCount = value;
  });
  assign("incr_article_view", (row, value) => {
    row.viewCount = value;
  });
  assign("incr_article_digg", (row, value) => {
    row.diggCount = value;
  });
  assign("incr_article_comment", (row, value) => {
    row.commentCount = value;
  });
  assign("incr_article_collect", (row, value) => {
    row.collectCount = value;
  });

  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}

function attachArticleTrends(result: CrawlResult, articles: ArticleAccumulator[]): ArticleNormalizedRecord[] {
  const recentArticles = articles.slice(0, 5).map((item) => ({ ...item.record }));
  const trendResponses = result.responses
    .filter((response) => response.url.includes("/author_center/data/trend") && typeof response.meta?.detailIndex === "number")
    .sort((left, right) => Number(left.meta?.detailIndex) - Number(right.meta?.detailIndex));

  for (const response of trendResponses) {
    const detailIndex = Number(response.meta?.detailIndex);
    if (!Number.isInteger(detailIndex) || detailIndex < 0 || detailIndex >= recentArticles.length) continue;
    recentArticles[detailIndex].recent7Days = mergeTrendRows([
      ...recentArticles[detailIndex].recent7Days,
      ...buildArticleTrendRowsFromPayload(response.payload),
    ]);
    if (!recentArticles[detailIndex].sourceUrls.includes(response.url)) {
      recentArticles[detailIndex].sourceUrls.push(response.url);
    }
  }

  return recentArticles;
}

function extractContentData(result: CrawlResult): ContentNormalizedData {
  const articles = extractArticleRecords(result);
  return {
    overview: extractContentOverview(result),
    articles: attachArticleTrends(result, articles),
  };
}

function maybeDistributionObject(item: Record<string, unknown>): boolean {
  const keys = Object.keys(item).map((key) => key.toLowerCase());
  return keys.some((key) => key.includes("distribution") || key.includes("gender") || key.includes("city") || key.includes("device"));
}

function extractFollowerData(result: CrawlResult): FollowerNormalizedData | undefined {
  const dateRows = new Map<string, FollowerDateRow>();
  let totalFollowers: number | undefined;
  let activeFollowers: number | undefined;
  let newFollowers: number | undefined;
  let lostFollowers: number | undefined;
  let netFollowers: number | undefined;
  let distribution: Record<string, unknown> | undefined;

  const updateRow = (date: string, patch: Partial<FollowerDateRow>) => {
    const current = dateRows.get(date) ?? {
      date,
      totalFollowers: undefined,
      activeFollowers: undefined,
      netFollowers: 0,
      newFollowers: 0,
      lostFollowers: 0,
    };
    dateRows.set(date, {
      ...current,
      ...patch,
      totalFollowers: patch.totalFollowers ?? current.totalFollowers,
      activeFollowers: patch.activeFollowers ?? current.activeFollowers,
      netFollowers: patch.netFollowers ?? current.netFollowers,
      newFollowers: patch.newFollowers ?? current.newFollowers,
      lostFollowers: patch.lostFollowers ?? current.lostFollowers,
    });
  };

  for (const response of result.responses) {
    if (response.url.includes("/follow/followers_by_page")) {
      walkNode(response.payload, (value) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) return;
        const item = value as Record<string, unknown>;
        if (!distribution && maybeDistributionObject(item)) {
          distribution = item;
        }
      });
    }

    if (!response.url.includes("/author_center/data/trend")) continue;
    const root = response.payload as Record<string, unknown>;
    const data = getObject(root, ["data"]);
    const datas = data ? getObject(data, ["datas"]) : undefined;
    if (!datas) continue;

    for (const item of readTrendSeries(datas, "all_follower")) {
      const date = toDateString(item.date ?? item.unixdate);
      if (!date) continue;
      const cnt = toNumber(item.cnt);
      if (cnt !== undefined) {
        totalFollowers = cnt;
        updateRow(date, { totalFollowers: cnt });
      }
    }

    for (const item of readTrendSeries(datas, "incr_active_follower")) {
      const date = toDateString(item.date ?? item.unixdate);
      if (!date) continue;
      const cnt = toNumber(item.cnt);
      if (cnt !== undefined) {
        activeFollowers = cnt;
        updateRow(date, { activeFollowers: cnt });
      }
    }

    for (const item of readTrendSeries(datas, "incr_do_follower")) {
      const date = toDateString(item.date ?? item.unixdate);
      if (!date) continue;
      const cnt = toNumber(item.cnt);
      if (cnt !== undefined) {
        newFollowers = cnt;
        updateRow(date, { newFollowers: cnt });
      }
    }

    for (const item of readTrendSeries(datas, "incr_undo_follower")) {
      const date = toDateString(item.date ?? item.unixdate);
      if (!date) continue;
      const cnt = toNumber(item.cnt);
      if (cnt !== undefined) {
        lostFollowers = cnt;
        updateRow(date, { lostFollowers: cnt });
      }
    }

    for (const item of readTrendSeries(datas, "incr_follower")) {
      const date = toDateString(item.date ?? item.unixdate);
      if (!date) continue;
      const cnt = toNumber(item.cnt);
      if (cnt !== undefined) {
        netFollowers = cnt;
        updateRow(date, { netFollowers: cnt });
      }
    }
  }

  const rows = [...dateRows.values()].sort((left, right) => left.date.localeCompare(right.date));
  if (rows.length === 0 && totalFollowers === undefined && !distribution) {
    return undefined;
  }

  const lastRow = rows[rows.length - 1];
  return {
    totalFollowers: totalFollowers ?? lastRow?.totalFollowers,
    activeFollowers: activeFollowers ?? lastRow?.activeFollowers,
    netFollowers: netFollowers ?? lastRow?.netFollowers,
    newFollowers: newFollowers ?? lastRow?.newFollowers,
    lostFollowers: lostFollowers ?? lastRow?.lostFollowers,
    dateRows: rows,
    distribution,
  };
}

export function buildNormalizedAnalytics(results: CrawlResult[]): NormalizedAnalytics {
  const normalized: NormalizedAnalytics = {};

  const content = results.find((item) => item.pageType === "content");
  if (content) {
    normalized.content = extractContentData(content);
  }

  const follower = results.find((item) => item.pageType === "follower");
  if (follower) {
    normalized.follower = extractFollowerData(follower);
  }

  return normalized;
}