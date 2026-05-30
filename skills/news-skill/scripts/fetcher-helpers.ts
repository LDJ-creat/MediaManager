import type Parser from "rss-parser";

type AtomContentPart = { value?: string; _?: string };

type FeedEntry = Omit<Parser.Item, "content"> & {
  id?: string;
  description?: string;
  updated?: string;
  content?: string | AtomContentPart[];
};

export function truncateSummary(text: string, maxChars: number = 300): string {
  let clean = (text || "").replace(/<[^>]+>/g, "");
  clean = clean.replace(/\s+/g, " ").trim();
  if (clean.length > maxChars) {
    clean = `${clean.slice(0, maxChars)}…`;
  }
  return clean;
}

export function getEntryUrl(entry: FeedEntry): string {
  return entry.link || entry.guid || entry.id || "";
}

function getContentValue(content: FeedEntry["content"]): string {
  if (!content) {
    return "";
  }
  if (typeof content === "string") {
    return content;
  }
  if (content.length === 0) {
    return "";
  }
  const first = content[0];
  return first.value ?? first._ ?? "";
}

/** 与 Python feedparser 一致：summary → description → content[0].value */
export function getSummaryRaw(entry: FeedEntry): string {
  if (entry.summary) {
    return entry.summary;
  }
  if (entry.description) {
    return entry.description;
  }
  return getContentValue(entry.content);
}

export function parsePubDate(entry: FeedEntry): Date | null {
  const candidates = [entry.isoDate, entry.pubDate, entry.updated];
  for (const raw of candidates) {
    if (!raw) {
      continue;
    }
    const dt = new Date(raw);
    if (!Number.isNaN(dt.getTime())) {
      return dt;
    }
  }
  return null;
}
