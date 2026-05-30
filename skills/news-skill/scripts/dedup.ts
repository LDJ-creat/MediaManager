import fs from "node:fs";
import path from "node:path";
import type { RawArticle, SeenUrlsData } from "./types.js";

function load(seenFile: string): SeenUrlsData {
  if (!fs.existsSync(seenFile)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(seenFile, "utf-8")) as SeenUrlsData;
  } catch {
    return {};
  }
}

function save(data: SeenUrlsData, seenFile: string): void {
  fs.mkdirSync(path.dirname(seenFile), { recursive: true });
  fs.writeFileSync(seenFile, JSON.stringify(data, null, 2), "utf-8");
}

export function filterSeen(items: RawArticle[], seenFile: string): RawArticle[] {
  const seenData = load(seenFile);
  const allSeenUrls = new Set<string>();
  for (const urls of Object.values(seenData)) {
    for (const url of urls) {
      allSeenUrls.add(url);
    }
  }

  const before = items.length;
  const filtered = items.filter((item) => !allSeenUrls.has(item.url));
  const after = filtered.length;

  if (before - after > 0) {
    console.error(
      `[INFO] 跨天去重：过滤掉 ${before - after} 条已收录文章，剩余 ${after} 条`,
    );
  }
  return filtered;
}

export function markAsSeen(
  urls: string[],
  seenFile: string,
  retentionDays: number = 7,
  today?: string,
): void {
  if (urls.length === 0) {
    return;
  }

  const todayStr = today ?? new Date().toISOString().slice(0, 10);
  const seenData = load(seenFile);

  const existing = new Set(seenData[todayStr] ?? []);
  for (const url of urls) {
    existing.add(url);
  }
  seenData[todayStr] = [...existing];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const cleaned: SeenUrlsData = {};
  for (const [day, dayUrls] of Object.entries(seenData)) {
    if (day >= cutoffIso) {
      cleaned[day] = dayUrls;
    }
  }

  save(cleaned, seenFile);
  console.error(`[INFO] 已记录 ${urls.length} 条 URL 到去重文件（${todayStr}）`);
}
