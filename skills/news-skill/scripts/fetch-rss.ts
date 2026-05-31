import fs from "node:fs";
import { loadSourcesConfig } from "./config.js";
import { filterSeen } from "./dedup.js";
import { fetchAll } from "./fetcher.js";
import { ensureDataDir, getDataPaths, resolveSourcesFile } from "./paths.js";

function parseArgs(argv: string[]): {
  hours?: number;
  preview: boolean;
  skipDedup: boolean;
} {
  const options = {
    hours: undefined as number | undefined,
    preview: false,
    skipDedup: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--preview") {
      options.preview = true;
    } else if (arg === "--skip-dedup") {
      options.skipDedup = true;
    } else if (arg === "--hours") {
      const value = Number(argv[i + 1]);
      if (!Number.isInteger(value)) {
        console.error("[ERROR] --hours 需要一个整数参数");
        process.exit(1);
      }
      options.hours = value;
      i += 1;
    }
  }

  return options;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const { DATA_DIR, LATEST_ARTICLES_FILE, SEEN_URLS_FILE } = getDataPaths(argv);
  const sourcesFile = resolveSourcesFile(argv);
  const [sources, params] = loadSourcesConfig(sourcesFile);

  console.error(`[INFO] RSS 配置: ${sourcesFile}`);
  const timeWindow = args.hours ?? params.TIME_WINDOW_HOURS ?? 48;
  const maxPerSource = params.MAX_PER_SOURCE ?? 5;
  const globalMax = params.GLOBAL_MAX ?? 40;

  console.error(
    `[INFO] 加载 ${sources.length} 个 RSS 源，时间窗口 ${timeWindow}h`,
  );

  let items = await fetchAll(sources, timeWindow, maxPerSource, globalMax);

  if (!args.skipDedup) {
    items = filterSeen(items, SEEN_URLS_FILE);
  }

  if (args.preview) {
    console.error(`\n📊 预览结果：共 ${items.length} 条文章（去重后）`);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.error(
        `  ${String(i + 1).padStart(2, " ")}. [${item.source}] ${item.title.slice(0, 65)}`,
      );
    }
    return;
  }

  ensureDataDir(DATA_DIR);
  fs.writeFileSync(
    LATEST_ARTICLES_FILE,
    JSON.stringify(items, null, 2),
    "utf-8",
  );

  console.error(
    `[INFO] ${items.length} 条文章已保存到 ${LATEST_ARTICLES_FILE}`,
  );
  console.error("[INFO] 正在输出 JSON...");

  process.stdout.write(`${JSON.stringify(items, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`[ERROR] ${error}`);
  process.exit(1);
});
