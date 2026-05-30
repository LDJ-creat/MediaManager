import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import type {
  AnalyticsCliOptions,
  ArticleFrontmatter,
  ArticleInput,
  AuthFileRef,
  PageType,
  PostCliOptions,
  SkillConfig,
} from "./types.js";

const DEFAULT_CONFIG: SkillConfig = {
  defaultOutputDir: "./csdn-output",
  defaultCategories: [],
  defaultTags: [],
  defaultOriginalFlag: true,
  defaultSaveRaw: true,
  defaultTimeoutMs: 30_000,
  cookieFileName: "cookies.json",
  storageStateFileName: "storageState.json",
};

function parseBool(input: string): boolean {
  return ["1", "true", "yes", "on"].includes(input.trim().toLowerCase());
}

function parseNumber(input: string, fallback: number): number {
  const value = Number(input);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseList(input: string): string[] {
  return input
    .split(/[;,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseKeyValueMarkdown(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (!key || !value) continue;
    out[key] = value;
  }
  return out;
}

function getSkillRootDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, "..");
}

function getSkillAuthDir(): string {
  return path.join(getSkillRootDir(), ".auth");
}

function getDefaultAuthFilePath(fileName: string): string {
  return path.join(getSkillAuthDir(), fileName);
}

function findSkillExtendFile(): string | null {
  const skillRoot = getSkillRootDir();
  const candidates = [
    path.join(skillRoot, ".config", "EXTEND.md"),
    path.join(skillRoot, "EXTEND.md"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function resolveExplicitFile(explicitPath: string | undefined, label: string): string | null {
  if (!explicitPath) return null;
  const absolutePath = path.resolve(process.cwd(), explicitPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`${label} not found: ${absolutePath}`);
  }
  return absolutePath;
}

function resolveOptionalFile(explicitPath: string | undefined, label: string): string | undefined {
  if (!explicitPath) return undefined;
  return resolveExplicitFile(explicitPath, label) ?? undefined;
}

function toFrontmatter(input: unknown): ArticleFrontmatter {
  if (!input || typeof input !== "object") {
    return {};
  }
  return input as ArticleFrontmatter;
}

function normalizeOriginal(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "原创"].includes(normalized)) return true;
  if (["0", "false", "no", "转载"].includes(normalized)) return false;
  return undefined;
}

function deriveTitle(body: string, fallbackFileName: string): string {
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) {
      return trimmed.replace(/^#+\s*/, "").trim();
    }
    return trimmed.slice(0, 80);
  }
  return fallbackFileName;
}

function deriveSummary(body: string): string | undefined {
  const clean = body
    .replace(/^#+\s*/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[[^\]]+\]\([^)]*\)/g, "$1")
    .replace(/[*_>`~-]/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

  if (!clean) return undefined;
  return clean.slice(0, 140);
}

export function loadSkillConfig(): SkillConfig {
  const config: SkillConfig = { ...DEFAULT_CONFIG };
  const extendFile = findSkillExtendFile();
  if (!extendFile) return config;

  const parsed = parseKeyValueMarkdown(fs.readFileSync(extendFile, "utf-8"));

  if (parsed.default_output_dir) {
    config.defaultOutputDir = parsed.default_output_dir;
  }
  if (parsed.default_categories) {
    config.defaultCategories = parseList(parsed.default_categories);
  }
  if (parsed.default_tags) {
    config.defaultTags = parseList(parsed.default_tags);
  }
  if (parsed.default_original_flag) {
    config.defaultOriginalFlag = parseBool(parsed.default_original_flag);
  }
  if (parsed.default_save_raw) {
    config.defaultSaveRaw = parseBool(parsed.default_save_raw);
  }
  if (parsed.default_timeout_ms) {
    config.defaultTimeoutMs = parseNumber(parsed.default_timeout_ms, config.defaultTimeoutMs);
  }
  if (parsed.cookie_file_name) {
    config.cookieFileName = parsed.cookie_file_name;
  }
  if (parsed.storage_state_file_name) {
    config.storageStateFileName = parsed.storage_state_file_name;
  }

  return config;
}

export function parseAnalyticsCliArgs(args: string[], config: SkillConfig): AnalyticsCliOptions {
  const options: AnalyticsCliOptions = {
    page: "both",
    outputDir: config.defaultOutputDir,
    cookiePath: undefined,
    statePath: undefined,
    saveRaw: config.defaultSaveRaw,
    probeOnly: false,
    headless: true,
    timeoutMs: config.defaultTimeoutMs,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === "--page" && next) {
      const value = next.toLowerCase() as PageType;
      if (value === "analytics" || value === "manage" || value === "both") {
        options.page = value;
      }
      i += 1;
      continue;
    }
    if (arg === "--start" && next) {
      options.start = next;
      i += 1;
      continue;
    }
    if (arg === "--end" && next) {
      options.end = next;
      i += 1;
      continue;
    }
    if (arg === "--output" && next) {
      options.outputDir = next;
      i += 1;
      continue;
    }
    if (arg === "--state" && next) {
      options.statePath = next;
      i += 1;
      continue;
    }
    if (arg === "--cookie" && next) {
      options.cookiePath = next;
      i += 1;
      continue;
    }
    if (arg === "--save-raw") {
      options.saveRaw = true;
      continue;
    }
    if (arg === "--no-save-raw") {
      options.saveRaw = false;
      continue;
    }
    if (arg === "--probe") {
      options.probeOnly = true;
      continue;
    }
    if (arg === "--headful") {
      options.headless = false;
      continue;
    }
    if (arg === "--timeout" && next) {
      options.timeoutMs = parseNumber(next, config.defaultTimeoutMs);
      i += 1;
    }
  }

  return options;
}

export function parsePostCliArgs(args: string[], config: SkillConfig): PostCliOptions {
  const options: PostCliOptions = {
    filePath: "",
    outputDir: config.defaultOutputDir,
    cookiePath: undefined,
    statePath: undefined,
    headless: true,
    timeoutMs: config.defaultTimeoutMs,
    title: undefined,
    summary: undefined,
    category: config.defaultCategories[0],
    tags: [...config.defaultTags],
    original: config.defaultOriginalFlag,
    coverPath: undefined,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === "--file" && next) {
      options.filePath = next;
      i += 1;
      continue;
    }
    if (arg === "--output" && next) {
      options.outputDir = next;
      i += 1;
      continue;
    }
    if (arg === "--title" && next) {
      options.title = next;
      i += 1;
      continue;
    }
    if (arg === "--summary" && next) {
      options.summary = next;
      i += 1;
      continue;
    }
    if (arg === "--category" && next) {
      options.category = next.trim();
      i += 1;
      continue;
    }
    if (arg === "--tags" && next) {
      options.tags = parseList(next);
      i += 1;
      continue;
    }
    if (arg === "--original") {
      options.original = true;
      continue;
    }
    if (arg === "--repost") {
      options.original = false;
      continue;
    }
    if (arg === "--draft") {
      // Backward compatible no-op: draft is the only supported mode.
      continue;
    }
    if (arg === "--publish") {
      throw new Error("Publishing is disabled: this skill only supports saving to draft.");
    }
    if (arg === "--cover" && next) {
      options.coverPath = next;
      i += 1;
      continue;
    }
    if (arg === "--state" && next) {
      options.statePath = next;
      i += 1;
      continue;
    }
    if (arg === "--cookie" && next) {
      options.cookiePath = next;
      i += 1;
      continue;
    }
    if (arg === "--headful") {
      options.headless = false;
      continue;
    }
    if (arg === "--timeout" && next) {
      options.timeoutMs = parseNumber(next, config.defaultTimeoutMs);
      i += 1;
    }
  }

  if (!options.filePath) {
    throw new Error("Missing required --file <markdown-path>");
  }

  options.coverPath = resolveOptionalFile(options.coverPath, "Cover image")
    ?? options.coverPath;

  return options;
}

export function ensureDirSync(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function nowStamp(): string {
  const d = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function normalizeDate(dateLike: string): string {
  const trimmed = dateLike.trim();
  if (!trimmed) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
    return trimmed.replaceAll("/", "-");
  }
  return trimmed;
}

export function assertDateRange(start?: string, end?: string): void {
  if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    throw new Error(`Invalid --start format: ${start}, expected YYYY-MM-DD`);
  }
  if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new Error(`Invalid --end format: ${end}, expected YYYY-MM-DD`);
  }
  if (start && end && start > end) {
    throw new Error("Invalid date range: --start cannot be later than --end");
  }
}

export function resolveAuthFile(
  explicitCookiePath: string | undefined,
  explicitStatePath: string | undefined,
  config: SkillConfig,
): AuthFileRef {
  const explicitState = resolveExplicitFile(explicitStatePath, "Storage state file");
  if (explicitState) {
    return { kind: "storage-state", path: explicitState };
  }

  const explicitCookie = resolveExplicitFile(explicitCookiePath, "Cookie file");
  if (explicitCookie) {
    return { kind: "cookie", path: explicitCookie };
  }

  const defaultState = getDefaultAuthFilePath(config.storageStateFileName);
  if (fs.existsSync(defaultState)) {
    return { kind: "storage-state", path: defaultState };
  }

  const defaultCookie = getDefaultAuthFilePath(config.cookieFileName);
  if (fs.existsSync(defaultCookie)) {
    return { kind: "cookie", path: defaultCookie };
  }

  throw new Error(
    "No auth state found. Provide --state with a Playwright storageState.json, or --cookie with cookies.json, or create one at .auth/storageState.json"
  );
}

export function loadArticleInput(filePath: string, cli: Pick<PostCliOptions, "title" | "summary" | "category" | "tags" | "original" | "coverPath">): ArticleInput {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Markdown file not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, "utf-8");
  const parsed = matter(content);
  const frontmatter = toFrontmatter(parsed.data);
  const normalizedCategory = Array.isArray(frontmatter.categories)
    ? frontmatter.categories[0]
    : typeof frontmatter.categories === "string"
      ? frontmatter.categories
      : frontmatter.category;
  const fallbackFileName = path.parse(absolutePath).name;
  const title = cli.title?.trim() || frontmatter.title?.trim() || deriveTitle(parsed.content, fallbackFileName);
  const summary = cli.summary?.trim() || frontmatter.summary?.trim() || frontmatter.abstract?.trim() || frontmatter.excerpt?.trim() || deriveSummary(parsed.content);
  const category = cli.category?.trim() || normalizedCategory?.trim();
  const tags = cli.tags.length > 0
    ? cli.tags
    : Array.isArray(frontmatter.tags)
      ? frontmatter.tags.map((item) => String(item).trim()).filter(Boolean)
      : typeof frontmatter.tags === "string"
        ? parseList(frontmatter.tags)
        : [];
  const original = cli.original ?? normalizeOriginal(frontmatter.original);
  let coverPath = cli.coverPath;
  if (!coverPath) {
    const coverRegex = /<!--\s*cover_path:\s*(.*?)\s*-->/;
    const cmMatch = parsed.content.match(coverRegex);
    if (cmMatch) {
      coverPath = cmMatch[1].trim();
    }
  }

  let finalBody = parsed.content.trim();
  const headingRegex = /^\s*#\s+(.+)$/m;
  const match = finalBody.match(headingRegex);
  if (match && match[1].trim() === title) {
    finalBody = finalBody.replace(match[0], "").trim();
  }

  return {
    filePath: absolutePath,
    content,
    body: finalBody,
    title,
    summary,
    category,
    tags,
    original,
    coverPath: coverPath ? path.resolve(path.dirname(absolutePath), coverPath) : undefined,
  };
}

export function printAnalyticsUsage(scriptName: string): void {
  console.log(`Usage: npx tsx ${scriptName} [options]\n` +
    "Options:\n" +
    "  --page <analytics|manage|both>  Select creator page(s)\n" +
    "  --start <YYYY-MM-DD>            Optional start date filter\n" +
    "  --end <YYYY-MM-DD>              Optional end date filter\n" +
    "  --output <dir>                  Output directory\n" +
    "  --state <path>                  Playwright storageState JSON path\n" +
    "  --cookie <path>                 Cookie JSON file path\n" +
    "  --save-raw / --no-save-raw      Save raw captured payloads\n" +
    "  --probe                         Probe login and capture only\n" +
    "  --headful                       Run browser with GUI\n" +
    "  --timeout <ms>                  Timeout in milliseconds");
}

export function printPostUsage(scriptName: string): void {
  console.log(`Usage: npx tsx ${scriptName} --file <article.md> [options]\n` +
    "Options:\n" +
    "  --title <value>                 Override article title\n" +
    "  --summary <value>               Override article summary\n" +
    "  --category <value>              Article category\n" +
    "  --tags <a,b,c>                  Comma-separated tags\n" +
    "  --cover <path>                  Optional cover image file path\n" +
    "  --original                      Mark as original\n" +
    "  --repost                        Mark as repost\n" +
    "  (always saves to draft)\n" +
    "  --output <dir>                  Output directory for result summary\n" +
    "  --state <path>                  Playwright storageState JSON path\n" +
    "  --cookie <path>                 Cookie JSON file path\n" +
    "  --headful                       Run browser with GUI\n" +
    "  --timeout <ms>                  Timeout in milliseconds");
}