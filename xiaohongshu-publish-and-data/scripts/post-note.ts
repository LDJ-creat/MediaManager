import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  collectInputWarnings,
  ensureDirSync,
  loadNoteInput,
  loadSkillConfig,
  nowStamp,
  parsePostCliArgs,
  printPostUsage,
  resolveOptionalAuthFile,
} from "./common.js";
import { publishNote } from "./xhs-scraper.js";
import type { PublishResult } from "./types.js";

function toMarkdown(result: PublishResult): string {
  return [
    "# Xiaohongshu Post Result",
    "",
    `- Generated: ${result.generatedAt}`,
    `- Mode: ${result.mode}`,
    `- Title: ${result.title}`,
    `- Success: ${result.success}`,
    `- Message: ${result.message ?? "-"}`,
    `- Final URL: ${result.finalUrl}`,
    `- Images: ${result.imagePaths.join(", ") || "-"}`,
    `- Tags: ${result.tags.join(", ") || "-"}`,
    "",
    "## Note Preview",
    result.note.slice(0, 500) + (result.note.length > 500 ? "..." : ""),
    "",
    "## Warnings",
    ...(result.warnings.length > 0 ? result.warnings.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Captured Responses",
    "| status | url |",
    "|---|---|",
    ...(result.capturedResponses.length > 0
      ? result.capturedResponses.map(
          (item) => `| ${item.status} | ${item.url.replaceAll("|", "\\|")} |`,
        )
      : ["| - | - |"]),
    ...(result.screenshotPath ? ["", `Screenshot: ${result.screenshotPath}`] : []),
  ].join("\n");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printPostUsage("post-note.ts");
    return;
  }

  const config = loadSkillConfig();
  const options = parsePostCliArgs(argv, config);

  if (options.draft) {
    console.warn("[WARN] --draft is ignored: Xiaohongshu drafts are browser-local; this skill publishes directly.");
  }

  if (!options.cdpUrl) {
    throw new Error(
      "--cdp-url is required. Start logged-in Chrome with --remote-debugging-port=9222, then pass --cdp-url http://127.0.0.1:9222",
    );
  }

  const note = loadNoteInput(options);
  const inputWarnings = collectInputWarnings(note);
  const authFile = resolveOptionalAuthFile(options.cookiePath, options.statePath, config);

  const result = await publishNote({
    note,
    authFile,
    headless: options.headless,
    timeoutMs: options.timeoutMs,
    cdpUrl: options.cdpUrl,
  });

  result.warnings.unshift(...inputWarnings);

  const outputDir = path.resolve(process.cwd(), options.outputDir);
  ensureDirSync(outputDir);
  const stamp = nowStamp();
  const jsonPath = path.join(outputDir, `xhs-post-result-${stamp}.json`);
  const mdPath = path.join(outputDir, `xhs-post-result-${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), "utf-8");
  fs.writeFileSync(mdPath, toMarkdown(result), "utf-8");

  console.log(`[OK] output json: ${jsonPath}`);
  console.log(`[OK] output markdown: ${mdPath}`);
  console.log(`[OK] success: ${result.success}`);
  if (result.message) {
    console.log(`[OK] message: ${result.message}`);
  }

  if (!result.success) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
