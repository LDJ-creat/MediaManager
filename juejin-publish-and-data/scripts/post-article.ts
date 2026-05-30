import process from "node:process";
import {
  loadSkillConfig,
  parsePostCliArgs,
  printPostUsage,
  readArticleInput,
  resolveAuthFile,
} from "./common";
import { postArticle } from "./juejin-scraper";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printPostUsage("post-article.ts");
    return;
  }

  if (argv.includes("--publish")) {
    console.warn("[WARN] --publish is ignored. This script only saves drafts.");
  }

  const config = loadSkillConfig();
  const options = parsePostCliArgs(argv, config);
  if (!options.file) {
    throw new Error("Missing required --file <article.md>");
  }

  const authFile = resolveAuthFile(options.cookiePath, options.statePath, config);
  const article = readArticleInput(options.file, options);
  const result = await postArticle({
    authFile,
    article,
    timeoutMs: options.timeoutMs,
    headless: options.headless,
    mode: options.mode,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});