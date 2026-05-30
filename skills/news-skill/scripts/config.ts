import fs from "node:fs";
import type { Category, Params, RssSource, SourcesConfig } from "./types.js";
import { SOURCES_FILE } from "./paths.js";

const PARAM_TYPES: Record<keyof Required<Params>, "int" | "float"> = {
  TOP_PICKS_COUNT: "int",
  MAX_PER_SOURCE: "int",
  GLOBAL_MAX: "int",
  TIME_WINDOW_HOURS: "int",
  DEDUP_RETENTION_DAYS: "int",
  BASE_THRESHOLD: "float",
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "AI前沿", display_name: "AI 前沿", icon: "🤖" },
  { id: "开发与工程", display_name: "开发与工程", icon: "🛠️" },
  { id: "大厂动态", display_name: "大厂动态", icon: "🏭" },
  { id: "产品与行业", display_name: "产品与行业", icon: "📦" },
];

function error(message: string): never {
  console.error(`[ERROR] sources.json: ${message}`);
  throw new Error(message);
}

function validateSources(sources: unknown, categoryIds: Set<string>): RssSource[] {
  if (!Array.isArray(sources)) {
    error('"sources" 必须是数组');
  }
  if (sources.length === 0) {
    error('"sources" 不能为空');
  }

  const validated: RssSource[] = [];
  for (let i = 0; i < sources.length; i++) {
    const prefix = `sources[${i}]`;
    const source = sources[i];
    if (typeof source !== "object" || source === null) {
      error(`${prefix} 必须是对象`);
    }

    const record = source as Record<string, unknown>;
    const name = record.name;
    const url = record.url;
    if (typeof name !== "string" || !name.trim()) {
      error(`${prefix} 缺少必填字段 "name"`);
    }
    if (typeof url !== "string" || !url.trim()) {
      error(`${prefix} 缺少必填字段 "url"`);
    }

    let sourceHint = record.source_hint ?? "";
    if (sourceHint === null) {
      sourceHint = "";
    }
    if (typeof sourceHint !== "string") {
      error(`${prefix} "source_hint" 必须是字符串`);
    }

    const weight = record.weight ?? 1.0;
    if (typeof weight !== "number" || Number.isNaN(weight)) {
      error(`${prefix} "weight" 必须是数字`);
    }

    if (categoryIds.size > 0 && sourceHint && !categoryIds.has(sourceHint)) {
      console.error(
        `[WARN] ${prefix} source_hint "${sourceHint}" 不在 categories 定义中`,
      );
    }

    validated.push({
      name: name.trim(),
      url: url.trim(),
      source_hint: sourceHint,
      weight: Number(weight),
    });
  }

  return validated;
}

function validateParams(params: unknown): Params {
  if (typeof params !== "object" || params === null || Array.isArray(params)) {
    error('"params" 必须是对象');
  }

  const record = params as Record<string, unknown>;
  const validated: Params = {};

  for (const [key, expectedType] of Object.entries(PARAM_TYPES) as Array<
    [keyof Required<Params>, "int" | "float"]
  >) {
    if (!(key in record)) {
      continue;
    }
    const value = record[key];
    if (expectedType === "int") {
      if (typeof value === "boolean") {
        error(`params.${key} 必须是整数`);
      }
      if (typeof value !== "number" || !Number.isInteger(value)) {
        error(`params.${key} 必须是整数`);
      }
      validated[key] = value;
    } else {
      if (typeof value !== "number" || Number.isNaN(value)) {
        error(`params.${key} 必须是数字`);
      }
      validated[key] = value;
    }
  }

  return validated;
}

function validateCategories(categories: unknown): Category[] {
  if (categories === undefined || categories === null) {
    return DEFAULT_CATEGORIES.map((category) => ({ ...category }));
  }
  if (!Array.isArray(categories)) {
    error('"categories" 必须是数组');
  }
  if (categories.length === 0) {
    error('"categories" 不能为空');
  }

  const validated: Category[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < categories.length; i++) {
    const prefix = `categories[${i}]`;
    const category = categories[i];
    if (typeof category !== "object" || category === null) {
      error(`${prefix} 必须是对象`);
    }

    const record = category as Record<string, unknown>;
    const id = record.id;
    const displayName = record.display_name;
    const icon = record.icon;

    if (typeof id !== "string" || !id.trim()) {
      error(`${prefix} 缺少必填字段 "id"`);
    }
    if (typeof displayName !== "string" || !displayName.trim()) {
      error(`${prefix} 缺少必填字段 "display_name"`);
    }
    if (typeof icon !== "string" || !icon.trim()) {
      error(`${prefix} 缺少必填字段 "icon"`);
    }

    const trimmedId = id.trim();
    if (seenIds.has(trimmedId)) {
      error(`${prefix} id "${trimmedId}" 重复`);
    }
    seenIds.add(trimmedId);

    validated.push({
      id: trimmedId,
      display_name: displayName.trim(),
      icon: icon.trim(),
    });
  }

  return validated;
}

export function loadConfig(sourcesFile: string = SOURCES_FILE): SourcesConfig {
  if (!fs.existsSync(sourcesFile)) {
    error(`配置文件不存在: ${sourcesFile}`);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(sourcesFile, "utf-8"));
  } catch (exc) {
    error(`JSON 格式错误: ${exc}`);
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    error("根节点必须是 JSON 对象");
  }

  const record = raw as Record<string, unknown>;
  const categories = validateCategories(record.categories);
  const categoryIds = new Set(categories.map((category) => category.id));
  const sources = validateSources(record.sources, categoryIds);
  const params = validateParams(record.params ?? {});

  return {
    version: typeof record.version === "number" ? record.version : 1,
    sources,
    params,
    categories,
  };
}

export function loadSourcesConfig(
  sourcesFile: string = SOURCES_FILE,
): [RssSource[], Params] {
  const config = loadConfig(sourcesFile);
  return [config.sources, config.params];
}
