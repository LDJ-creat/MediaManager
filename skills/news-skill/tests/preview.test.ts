import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig, loadSourcesConfig } from "../scripts/config.js";
import { fetchAll } from "../scripts/fetcher.js";
import { resolveSourcesFile, workspaceSourcesFile, SOURCES_FILE } from "../scripts/paths.js";

function testResolveSourcesFile(): void {
  console.log("\n=== 测试工作区 RSS 源路径 ===");
  const tmpWs = fs.mkdtempSync(path.join(os.tmpdir(), "news-ws-"));
  const custom = workspaceSourcesFile(tmpWs);
  fs.mkdirSync(path.dirname(custom), { recursive: true });
  fs.copyFileSync(SOURCES_FILE, custom);

  const prev = process.env.MEDIA_WORKSPACE;
  process.env.MEDIA_WORKSPACE = tmpWs;
  try {
    const resolved = resolveSourcesFile([]);
    if (resolved !== path.resolve(custom)) {
      throw new Error(`期望工作区 sources.json，实际 ${resolved}`);
    }
    console.log(`工作区覆盖: ${resolved}`);
  } finally {
    if (prev === undefined) delete process.env.MEDIA_WORKSPACE;
    else process.env.MEDIA_WORKSPACE = prev;
    fs.rmSync(tmpWs, { recursive: true, force: true });
  }

  delete process.env.MEDIA_WORKSPACE;
  const fallback = resolveSourcesFile([]);
  if (fallback !== SOURCES_FILE) {
    throw new Error(`无工作区配置时应回退 bundled，实际 ${fallback}`);
  }
  console.log(`默认回退: ${fallback}`);
}

function testLoadConfig(): void {
  console.log("=== 测试配置加载 ===");
  const config = loadConfig();
  const [sources, params] = loadSourcesConfig();

  if (sources.length !== 11) {
    throw new Error(`期望 11 个 RSS 源，实际 ${sources.length}`);
  }
  if (config.categories.length !== 4) {
    throw new Error("期望 4 个板块定义");
  }

  const expectedParams = new Set([
    "TOP_PICKS_COUNT",
    "MAX_PER_SOURCE",
    "GLOBAL_MAX",
    "TIME_WINDOW_HOURS",
    "DEDUP_RETENTION_DAYS",
    "BASE_THRESHOLD",
  ]);
  for (const key of expectedParams) {
    if (!(key in params)) {
      throw new Error(`缺少参数: ${key}`);
    }
  }

  console.log(`RSS源数量: ${sources.length}`);
  for (const source of sources) {
    console.log(
      `  [${source.name}] hint=${source.source_hint} weight=${source.weight}`,
    );
  }
  console.log(`\n全局参数: ${JSON.stringify(params)}`);
  console.log(`板块数量: ${config.categories.length}`);
}

function testInvalidConfig(): void {
  console.log("\n=== 测试无效配置校验 ===");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "news-skill-test-"));
  const tmpPath = path.join(tmpDir, "sources.json");
  fs.writeFileSync(
    tmpPath,
    JSON.stringify({ sources: [{ name: "Bad" }] }),
    "utf-8",
  );

  try {
    loadConfig(tmpPath);
    throw new Error("无效配置应抛出 Error");
  } catch (error) {
    const message = String(error);
    if (!message.toLowerCase().includes("url") && !message.includes("缺少")) {
      throw error;
    }
    console.log(`校验通过，捕获错误: ${message}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function testFetch(): Promise<void> {
  console.log("\n=== 测试RSS抓取（2个源）===");
  const sources = [
    {
      name: "GitHub",
      url: "https://github.blog/feed/",
      source_hint: "开发与工程",
      weight: 1.1,
    },
    {
      name: "Karpathy",
      url: "https://api.xgo.ing/rss/user/edf707b5c0b248579085f66d7a3c5524",
      source_hint: "AI前沿",
      weight: 1.2,
    },
  ];
  const items = await fetchAll(sources, 48, 5, 20);
  console.log(`获取条目数: ${items.length}`);
  for (const item of items.slice(0, 3)) {
    console.log(`  [${item.source}] ${item.title.slice(0, 60)}`);
    console.log(`    url[:70]: ${item.url.slice(0, 70)}`);
    console.log(`    summary[:80]: ${item.summary.slice(0, 80)}`);
  }
}

async function main(): Promise<void> {
  testLoadConfig();
  testInvalidConfig();
  testResolveSourcesFile();
  await testFetch();
  console.log("\n所有验证通过！");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
