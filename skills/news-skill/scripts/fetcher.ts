import { createHash } from "node:crypto";
import Parser from "rss-parser";
import type { RawArticle, RssSource } from "./types.js";
import {
  getEntryUrl,
  getSummaryRaw,
  parsePubDate,
  truncateSummary,
} from "./fetcher-helpers.js";

const USER_AGENT =
  "Mozilla/5.0 (compatible; NewsSkillBot/1.0; +https://github.com)";

const parser = new Parser({
  headers: { "User-Agent": USER_AGENT },
});

function makeId(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 8);
}

async function fetchOne(
  source: RssSource,
  timeWindowHours: number,
  maxPerSource: number,
): Promise<RawArticle[]> {
  const cutoff = Date.now() - timeWindowHours * 60 * 60 * 1000;
  const results: RawArticle[] = [];

  try {
    const response = await fetch(source.url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      console.error(`[WARN] ${source.name} 返回 HTTP ${response.status}`);
      return [];
    }
    const content = await response.text();
    const feed = await parser.parseString(content);
    const seenUrls = new Set<string>();

    for (const entry of feed.items) {
      const url = getEntryUrl(entry);
      if (!url || seenUrls.has(url)) {
        continue;
      }

      const pubDt = parsePubDate(entry);
      if (pubDt && pubDt.getTime() < cutoff) {
        continue;
      }

      const summary = truncateSummary(getSummaryRaw(entry));

      results.push({
        id: makeId(url),
        title: (entry.title || "").trim(),
        summary,
        url,
        pub_date: pubDt ? pubDt.toISOString() : "",
        source: source.name,
        source_hint: source.source_hint ?? "",
        source_weight: source.weight ?? 1.0,
      });
      seenUrls.add(url);

      if (results.length >= maxPerSource) {
        break;
      }
    }
  } catch (error) {
    console.error(`[WARN] ${source.name} 抓取失败: ${error}`);
    return [];
  }

  console.error(`[INFO] ${source.name}: 获取 ${results.length} 条`);
  return results;
}

export async function fetchAll(
  sources: RssSource[],
  timeWindowHours: number = 48,
  maxPerSource: number = 5,
  globalMax: number = 40,
): Promise<RawArticle[]> {
  const allResults = await Promise.all(
    sources.map((source) => fetchOne(source, timeWindowHours, maxPerSource)),
  );

  const seenGlobal = new Set<string>();
  const merged: RawArticle[] = [];

  for (const items of allResults) {
    for (const item of items) {
      if (!seenGlobal.has(item.url)) {
        merged.push(item);
        seenGlobal.add(item.url);
      }
    }
  }

  merged.sort((a, b) => (b.pub_date || "").localeCompare(a.pub_date || ""));
  const limited = merged.slice(0, globalMax);

  console.error(`[INFO] 合计获取 ${limited.length} 条（全局去重后）`);
  return limited;
}
