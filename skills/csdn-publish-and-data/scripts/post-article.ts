import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  ensureDirSync,
  loadArticleInput,
  loadSkillConfig,
  nowStamp,
  parsePostCliArgs,
  printPostUsage,
  resolveAuthFile,
} from "./common.js";
import { publishArticle } from "./csdn-scraper.js";

function toMarkdown(result: Awaited<ReturnType<typeof publishArticle>>): string {
  return [
    "# CSDN Post Result",
    "",
    `- Generated: ${result.generatedAt}`,
    `- Mode: ${result.mode}`,
    `- Title: ${result.title}`,
    `- Success: ${result.success}`,
    `- Message: ${result.message ?? "-"}`,
    `- Final URL: ${result.finalUrl}`,
    `- Article ID: ${result.articleId ?? "-"}`,
    `- Article URL: ${result.articleUrl ?? "-"}`,
    `- Category: ${result.category ?? "-"}`,
    `- Tags: ${result.tags.join(", ") || "-"}`,
    `- Original: ${result.original === undefined ? "-" : String(result.original)}`,
    "",
    "## Warnings",
    ...(result.warnings.length > 0 ? result.warnings.map((item: string) => `- ${item}`) : ["- none"]),
    "",
    "## Captured Responses",
    "| status | url |",
    "|---|---|",
    ...(result.capturedResponses.length > 0
      ? result.capturedResponses.map((item: { status: number; url: string }) => `| ${item.status} | ${item.url.replaceAll("|", "\\|")} |`)
      : ["| - | - |"]),
  ].join("\n");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printPostUsage("post-article.ts");
    return;
  }

  const config = loadSkillConfig();
  const options = parsePostCliArgs(argv, config);
  const authFile = resolveAuthFile(options.cookiePath, options.statePath, config);
  const article = loadArticleInput(options.filePath, options);
  const result = await publishArticle({
    article,
    authFile,
    headless: options.headless,
    timeoutMs: options.timeoutMs,
    coverPath: options.coverPath,
  });

  const outputDir = path.resolve(process.cwd(), options.outputDir);
  ensureDirSync(outputDir);
  const stamp = nowStamp();
  const jsonPath = path.join(outputDir, `csdn-post-result-${stamp}.json`);
  const mdPath = path.join(outputDir, `csdn-post-result-${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), "utf-8");
  fs.writeFileSync(mdPath, toMarkdown(result), "utf-8");

  console.log(`[OK] output json: ${jsonPath}`);
  console.log(`[OK] output markdown: ${mdPath}`);
  console.log(`[OK] success: ${result.success}`);
  if (result.articleUrl) {
    console.log(`[OK] article url: ${result.articleUrl}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});