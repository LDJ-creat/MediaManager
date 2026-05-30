import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  getEntryUrl,
  getSummaryRaw,
  truncateSummary,
} from "../scripts/fetcher-helpers.js";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function testSummaryPriority(): void {
  console.log("=== 测试摘要字段优先级 ===");

  assert(
    getSummaryRaw({ summary: "from-summary", description: "from-desc" }) ===
      "from-summary",
    "应优先使用 summary",
  );

  assert(
    getSummaryRaw({ description: "from-desc", content: "from-content" }) ===
      "from-desc",
    "无 summary 时应使用 description",
  );

  assert(
    getSummaryRaw({ content: "from-content-string" }) === "from-content-string",
    "无 summary/description 时应使用 content 字符串",
  );

  assert(
    getSummaryRaw({
      content: [{ value: "<p>from-atom-value</p>" }],
    }) === "<p>from-atom-value</p>",
    "应支持 Atom content[0].value",
  );

  assert(
    getSummaryRaw({
      content: [{ _: "from-atom-underscore" }],
    }) === "from-atom-underscore",
    "应支持 Atom content[0]._",
  );

  assert(
    truncateSummary("<p>Hello   <b>world</b></p>", 300) === "Hello world",
    "应去除 HTML 并折叠空白",
  );

  assert(
    truncateSummary("x".repeat(301), 300).endsWith("…"),
    "超长摘要应截断并追加省略号",
  );

  console.log("摘要优先级与截断逻辑通过");
}

function testEntryUrl(): void {
  console.log("\n=== 测试 URL 回退 ===");

  assert(
    getEntryUrl({ link: "https://a.com/1" }) === "https://a.com/1",
    "应优先使用 link",
  );
  assert(
    getEntryUrl({ guid: "https://a.com/guid" }) === "https://a.com/guid",
    "无 link 时应使用 guid",
  );
  assert(
    getEntryUrl({ id: "https://a.com/id" }) === "https://a.com/id",
    "无 link/guid 时应使用 id",
  );
  assert(getEntryUrl({}) === "", "无可用字段时应返回空字符串");

  console.log("URL 回退逻辑通过");
}

function main(): void {
  testSummaryPriority();
  testEntryUrl();
  console.log("\nfetcher-helpers 验证通过！");
}

main();
