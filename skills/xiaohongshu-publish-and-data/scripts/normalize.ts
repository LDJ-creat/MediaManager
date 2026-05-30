import type {
  AnalyticsCapturedResponse,
  AnalyticsReport,
  CrawlResult,
  NoteAnalyticsOverview,
  NoteAnalyticsRecord,
  NoteMetricsSummary,
  NormalizedAnalytics,
} from "./types.js";

const NOTE_LIST_API_PATH = "/api/galaxy/v2/creator/note/user/posted";

interface PostedNoteRecord {
  id?: string;
  display_title?: string;
  time?: string;
  type?: string;
  sticky?: boolean;
  view_count?: number;
  comments_count?: number;
  likes?: number;
  collected_count?: number;
  shared_count?: number;
  xsec_token?: string;
  xsec_source?: string;
}

interface PostedNotesPayload {
  data?: {
    notes?: PostedNoteRecord[];
    page?: number;
  };
}

function uniqueResponses(responses: AnalyticsCapturedResponse[]): AnalyticsCapturedResponse[] {
  const seen = new Set<string>();
  const output: AnalyticsCapturedResponse[] = [];

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
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    return Number(value);
  }
  return undefined;
}

function buildNoteUrl(note: PostedNoteRecord): string | undefined {
  if (!note.id) return undefined;
  const base = `https://www.xiaohongshu.com/explore/${note.id}`;
  const params = new URLSearchParams();
  if (note.xsec_token) params.set("xsec_token", note.xsec_token);
  if (note.xsec_source) params.set("xsec_source", note.xsec_source);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

function extractPostedNotes(results: CrawlResult[], limit: number): PostedNoteRecord[] {
  const notes: PostedNoteRecord[] = [];
  const seenIds = new Set<string>();

  for (const result of results) {
    for (const response of result.responses) {
      if (!response.url.includes(NOTE_LIST_API_PATH)) continue;
      const payload = response.payload as PostedNotesPayload | undefined;
      const list = payload?.data?.notes;
      if (!Array.isArray(list)) continue;

      for (const note of list) {
        if (!note?.id || seenIds.has(note.id)) continue;
        seenIds.add(note.id);
        notes.push(note);
        if (notes.length >= limit) return notes;
      }
    }
  }

  return notes;
}

function toMetrics(note: PostedNoteRecord): NoteMetricsSummary {
  return {
    viewCount: getNumber(note.view_count),
    commentCount: getNumber(note.comments_count),
    likeCount: getNumber(note.likes),
    collectCount: getNumber(note.collected_count),
    shareCount: getNumber(note.shared_count),
  };
}

function sumMetric(notes: NoteAnalyticsRecord[], key: keyof NoteMetricsSummary): number | undefined {
  let total = 0;
  let hasValue = false;
  for (const note of notes) {
    const value = note.metrics[key];
    if (value === undefined) continue;
    total += value;
    hasValue = true;
  }
  return hasValue ? total : undefined;
}

function toNoteRecord(note: PostedNoteRecord): NoteAnalyticsRecord | undefined {
  if (!note.id || !note.display_title) return undefined;
  const url = buildNoteUrl(note);
  if (!url) return undefined;

  return {
    noteId: note.id,
    title: note.display_title,
    url,
    publishTime: typeof note.time === "string" && note.time.trim() ? note.time.trim() : undefined,
    noteType: note.type,
    sticky: Boolean(note.sticky),
    metrics: toMetrics(note),
  };
}

export function buildNormalizedAnalytics(results: CrawlResult[], limit: number): NormalizedAnalytics {
  const rawNotes = extractPostedNotes(results, limit);
  const notes = rawNotes
    .map((note) => toNoteRecord(note))
    .filter((note): note is NoteAnalyticsRecord => note !== undefined);

  const overview: NoteAnalyticsOverview = {
    noteCount: notes.length,
    viewCount: sumMetric(notes, "viewCount"),
    commentCount: sumMetric(notes, "commentCount"),
    likeCount: sumMetric(notes, "likeCount"),
    collectCount: sumMetric(notes, "collectCount"),
    shareCount: sumMetric(notes, "shareCount"),
  };

  return { overview, notes };
}

export function buildAnalyticsReport(results: CrawlResult[], limit: number): AnalyticsReport {
  const normalized = buildNormalizedAnalytics(results, limit);
  return {
    overview: normalized.overview,
    notes: normalized.notes,
    limit,
  };
}
