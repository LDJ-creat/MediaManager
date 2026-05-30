import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { filterSeen, markAsSeen } from "../scripts/dedup.js";
import type { RawArticle } from "../scripts/types.js";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function makeItem(url: string): RawArticle {
  return {
    id: "testid01",
    title: "Test",
    summary: "summary",
    url,
    pub_date: "",
    source: "TestSource",
    source_hint: "",
    source_weight: 1,
  };
}

function testFilterSeen(): void {
  console.log("=== 测试 filterSeen ===");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "news-skill-dedup-"));
  const seenFile = path.join(tmpDir, "seen_urls.json");

  fs.writeFileSync(
    seenFile,
    JSON.stringify({
      "2026-05-29": ["https://seen.example/a"],
    }),
    "utf-8",
  );

  const items = [
    makeItem("https://seen.example/a"),
    makeItem("https://new.example/b"),
  ];
  const filtered = filterSeen(items, seenFile);

  assert(filtered.length === 1, "应过滤已收录 URL");
  assert(filtered[0].url === "https://new.example/b", "应保留未见过的 URL");

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log("filterSeen 通过");
}

function testMarkAsSeen(): void {
  console.log("\n=== 测试 markAsSeen ===");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "news-skill-dedup-"));
  const seenFile = path.join(tmpDir, "seen_urls.json");

  markAsSeen(
    ["https://new.example/1", "https://new.example/2"],
    seenFile,
    7,
    "2026-05-30",
  );
  markAsSeen(["https://new.example/2"], seenFile, 7, "2026-05-30");

  const data = JSON.parse(fs.readFileSync(seenFile, "utf-8")) as Record<
    string,
    string[]
  >;
  assert(Array.isArray(data["2026-05-30"]), "应写入指定日期键");
  assert(data["2026-05-30"].length === 2, "同日重复 URL 应合并去重");

  fs.writeFileSync(
    seenFile,
    JSON.stringify({
      "2020-01-01": ["https://old.example/legacy"],
      "2026-05-30": ["https://new.example/1"],
    }),
    "utf-8",
  );
  markAsSeen(["https://new.example/3"], seenFile, 7, "2026-05-30");

  const cleaned = JSON.parse(fs.readFileSync(seenFile, "utf-8")) as Record<
    string,
    string[]
  >;
  assert(!("2020-01-01" in cleaned), "应清理超过 retention 的旧记录");
  assert(cleaned["2026-05-30"].includes("https://new.example/3"), "应追加新 URL");

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log("markAsSeen 通过");
}

function main(): void {
  testFilterSeen();
  testMarkAsSeen();
  console.log("\ndedup 验证通过！");
}

main();
