import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config.js";
import type { AnalyzedArticle } from "./types.js";
import { DIGESTS_DIR } from "./paths.js";

const DEFAULT_CATEGORY_DISPLAY: Record<string, [string, string]> = {
  AI前沿: ["AI 前沿", "🤖"],
  开发与工程: ["开发与工程", "🛠️"],
  大厂动态: ["大厂动态", "🏭"],
  产品与行业: ["产品与行业", "📦"],
};

const DEFAULT_CATEGORY_ORDER = ["AI前沿", "开发与工程", "大厂动态", "产品与行业"];

function loadCategoryDisplay(): [Record<string, [string, string]>, string[]] {
  try {
    const categories = loadConfig().categories;
    if (!categories.length) {
      return [{ ...DEFAULT_CATEGORY_DISPLAY }, [...DEFAULT_CATEGORY_ORDER]];
    }
    const display: Record<string, [string, string]> = {};
    for (const category of categories) {
      display[category.id] = [category.display_name, category.icon];
    }
    const order = categories.map((category) => category.id);
    return [display, order];
  } catch {
    return [{ ...DEFAULT_CATEGORY_DISPLAY }, [...DEFAULT_CATEGORY_ORDER]];
  }
}

function formatArticle(item: AnalyzedArticle, index?: number): string {
  const title = item.chinese_title || item.title || "（无标题）";
  const source = item.source || "";
  const score = item.score ?? 0;
  const summary = item.summary_zh || item.summary || "";
  const url = item.url || "#";

  const prefix = index !== undefined ? `### ${index}. ` : "### ";

  return [
    `${prefix}${title}`,
    `**来源**：${source} ｜ **评分**：${score.toFixed(1)}`,
    "",
    summary,
    "",
    `🔗 [阅读原文](${url})`,
  ].join("\n");
}

export function render(
  items: AnalyzedArticle[],
  threshold: number,
  topPicksCount: number = 3,
  reportDate?: string,
): string {
  const [categoryDisplay, categoryOrder] = loadCategoryDisplay();
  const today = reportDate ?? new Date().toISOString().slice(0, 10);
  const total = items.length;

  const sortedItems = [...items].sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0),
  );

  const lines: string[] = [
    `# 📰 每日科技资讯 · ${today}`,
    "",
    `> 📊 **今日概览**：筛选通过 **${total}** 条 ｜ 评分阈值 **${threshold.toFixed(1)}** 分`,
    "",
    "---",
    "",
    "## 💎 今日精选",
    "",
    "> 综合评分最高，强烈推荐阅读",
    "",
  ];

  const topPicks = sortedItems.slice(0, topPicksCount);
  for (let i = 0; i < topPicks.length; i++) {
    lines.push(formatArticle(topPicks[i], i + 1));
    lines.push("");
  }

  lines.push("---", "");

  const fallbackCategory =
    categoryOrder[categoryOrder.length - 1] ?? "产品与行业";
  const byCategory: Record<string, AnalyzedArticle[]> = {};
  for (const cat of categoryOrder) {
    byCategory[cat] = [];
  }

  for (const item of items) {
    let cat = item.category ?? fallbackCategory;
    if (!(cat in byCategory)) {
      cat = fallbackCategory;
    }
    byCategory[cat].push(item);
  }

  for (const catId of categoryOrder) {
    const catItems = byCategory[catId] ?? [];
    if (catItems.length === 0) {
      continue;
    }
    const [displayName, icon] = categoryDisplay[catId];
    lines.push(`## ${icon} ${displayName}`, "");

    catItems.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    for (const item of catItems) {
      lines.push(formatArticle(item));
      lines.push("");
    }
  }

  lines.push("---", "", `*由 news-skill 自动生成 · ${today}*`);

  return lines.join("\n");
}

export function save(
  markdown: string,
  outputDir: string = DIGESTS_DIR,
  reportDate?: string,
): string {
  const today = reportDate ?? new Date().toISOString().slice(0, 10);
  fs.mkdirSync(outputDir, { recursive: true });
  const filepath = path.join(outputDir, `${today}.md`);
  fs.writeFileSync(filepath, markdown, "utf-8");
  console.error(`[INFO] 日报已写入：${filepath}`);
  return filepath;
}
