import fs from "node:fs";
import { loadSourcesConfig } from "./config.js";
import { markAsSeen } from "./dedup.js";
import { SEEN_URLS_FILE, SELECTED_URLS_FILE } from "./paths.js";

function parseArgs(argv: string[]): { date?: string; status: boolean } {
  const options = {
    date: undefined as string | undefined,
    status: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--status") {
      options.status = true;
    } else if (arg === "--date") {
      options.date = argv[i + 1];
      i += 1;
    }
  }

  return options;
}

function showStatus(): void {
  try {
    const data = JSON.parse(
      fs.readFileSync(SEEN_URLS_FILE, "utf-8"),
    ) as Record<string, string[]>;
    console.log(`去重记录共 ${Object.keys(data).length} 天：`);
    for (const [day, urls] of Object.entries(data).sort(
      ([a], [b]) => b.localeCompare(a),
    )) {
      console.log(`  ${day}: ${urls.length} 条 URL`);
    }
  } catch {
    console.log("尚无去重记录（seen_urls.json 不存在或为空）");
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (args.status) {
    showStatus();
    return;
  }

  let urls: unknown;
  try {
    urls = JSON.parse(fs.readFileSync(SELECTED_URLS_FILE, "utf-8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.error(`[ERROR] 未找到 ${SELECTED_URLS_FILE}`);
      console.error(
        "请确保 LLM 已将本次纳入日报的文章 URL 写入此文件（JSON 数组格式）",
      );
      process.exit(1);
    }
    console.error(`[ERROR] ${SELECTED_URLS_FILE} 格式错误: ${error}`);
    process.exit(1);
  }

  if (!Array.isArray(urls)) {
    console.error("[ERROR] selected_urls.json 必须是 JSON 数组");
    process.exit(1);
  }

  const [, params] = loadSourcesConfig();
  const retentionDays = params.DEDUP_RETENTION_DAYS ?? 7;
  const today = args.date ?? new Date().toISOString().slice(0, 10);

  markAsSeen(urls as string[], SEEN_URLS_FILE, retentionDays, today);
  console.log(
    `✅ 已记录 ${urls.length} 条 URL（${today}），自动清理 ${retentionDays} 天前的旧记录`,
  );
}

main();
