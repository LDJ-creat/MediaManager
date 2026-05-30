import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import type {
  ArticleInput,
  AuthFileRef,
  FetchCliOptions,
  FrontmatterArticle,
  PageType,
  PostCliOptions,
  SkillConfig,
} from "./types";

const DEFAULT_CONFIG: SkillConfig = {
  defaultPage: "both",
  defaultOutputDir: "./juejin-data-output",
  defaultPostMode: "draft",
  defaultTags: [],
  defaultColumn: undefined,
  defaultVisibility: undefined,
  defaultSaveRaw: true,
  defaultTimeoutMs: 45_000,
  cookieFileName: "cookies.json",
  storageStateFileName: "storageState.json",
};

export const JUEJIN_CREATOR_CONTENT_URL = "https://juejin.cn/creator/data/content/article/single";
export const JUEJIN_CREATOR_FOLLOWER_URL = "https://juejin.cn/creator/data/follower/data";
export const JUEJIN_CREATOR_HOME_URL = "https://juejin.cn/creator/content";
export const JUEJIN_EDITOR_URL = "https://juejin.cn/editor/drafts/new?v=2";

function parseBool(input: string): boolean {
  return ["1", "true", "yes", "on"].includes(input.trim().toLowerCase());
}

function parseNumber(input: string, fallback: number): number {
  const n = Number(input);
  return Number.isFinite(n) && n > 0 ? n : fallback;
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

export function loadSkillConfig(): SkillConfig {
  const config: SkillConfig = { ...DEFAULT_CONFIG };
  const extendFile = findSkillExtendFile();
  if (!extendFile) return config;

  const parsed = parseKeyValueMarkdown(fs.readFileSync(extendFile, "utf-8"));
  if (parsed.default_page) {
    const normalized = parsed.default_page.toLowerCase() as PageType;
    if (["content", "follower", "both"].includes(normalized)) {
      config.defaultPage = normalized;
    }
  }
  if (parsed.default_output_dir) {
    config.defaultOutputDir = parsed.default_output_dir;
  }
  if (parsed.default_post_mode) {
    const mode = parsed.default_post_mode.toLowerCase();
    if (mode === "draft") {
      config.defaultPostMode = mode;
    }
  }
  if (parsed.default_tags) {
    config.defaultTags = parseList(parsed.default_tags);
  }
  if (parsed.default_column) {
    config.defaultColumn = parsed.default_column;
  }
  if (parsed.default_visibility) {
    config.defaultVisibility = parsed.default_visibility;
  }
  if (parsed.default_save_raw) {
    config.defaultSaveRaw = parseBool(parsed.default_save_raw);
  }
  if (parsed.default_timeout_ms) {
    config.defaultTimeoutMs = parseNumber(parsed.default_timeout_ms, DEFAULT_CONFIG.defaultTimeoutMs);
  }
  if (parsed.cookie_file_name) {
    config.cookieFileName = parsed.cookie_file_name;
  }
  if (parsed.storage_state_file_name) {
    config.storageStateFileName = parsed.storage_state_file_name;
  }
  return config;
}

export function parseFetchCliArgs(args: string[], config: SkillConfig): FetchCliOptions {
  const options: FetchCliOptions = {
    page: config.defaultPage,
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
      const page = next.toLowerCase();
      if (page === "content" || page === "follower" || page === "both") options.page = page;
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
    if (arg === "--cookie" && next) {
      options.cookiePath = next;
      i += 1;
      continue;
    }
    if (arg === "--state" && next) {
      options.statePath = next;
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
      continue;
    }
  }

  return options;
}

export function parsePostCliArgs(args: string[], config: SkillConfig): PostCliOptions {
  const options: PostCliOptions = {
    file: undefined,
    title: undefined,
    cover: undefined,
    tags: [...config.defaultTags],
    column: config.defaultColumn,
    cookiePath: undefined,
    statePath: undefined,
    headless: true,
    timeoutMs: config.defaultTimeoutMs,
    mode: config.defaultPostMode,
    visibility: config.defaultVisibility,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === "--file" && next) {
      options.file = next;
      i += 1;
      continue;
    }
    if (arg === "--title" && next) {
      options.title = next;
      i += 1;
      continue;
    }
    if (arg === "--cover" && next) {
      options.cover = next;
      i += 1;
      continue;
    }
    if (arg === "--tags" && next) {
      options.tags = parseList(next);
      i += 1;
      continue;
    }
    if (arg === "--column" && next) {
      options.column = next;
      i += 1;
      continue;
    }
    if (arg === "--visibility" && next) {
      options.visibility = next;
      i += 1;
      continue;
    }
    if (arg === "--cookie" && next) {
      options.cookiePath = next;
      i += 1;
      continue;
    }
    if (arg === "--state" && next) {
      options.statePath = next;
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
      continue;
    }
    if (arg === "--draft") {
      options.mode = "draft";
      continue;
    }
  }

  return options;
}

export function ensureDirSync(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function normalizeDate(dateLike: string): string {
  const trimmed = dateLike.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) return trimmed.replaceAll("/", "-");
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }
  return trimmed;
}

export function formatTimestamp(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (/^\d+$/.test(trimmed)) {
      return formatTimestamp(Number(trimmed));
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return trimmed;
    return parsed.toLocaleString("zh-CN", { hour12: false });
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    const ts = value > 1_000_000_000_000 ? value : value > 1_000_000_000 ? value * 1000 : undefined;
    if (!ts) return String(value);
    return new Date(ts).toLocaleString("zh-CN", { hour12: false });
  }

  return undefined;
}

export function assertDateRange(start?: string, end?: string): void {
  if (!start && !end) return;
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

function resolveExplicitPath(input: string): string {
  return path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);
}

export function resolveAuthFile(cookiePath: string | undefined, statePath: string | undefined, config: SkillConfig): AuthFileRef {
  if (statePath) {
    const resolved = resolveExplicitPath(statePath);
    if (!fs.existsSync(resolved)) throw new Error(`Storage state file not found: ${resolved}`);
    return { kind: "storage-state", path: resolved };
  }
  if (cookiePath) {
    const resolved = resolveExplicitPath(cookiePath);
    if (!fs.existsSync(resolved)) throw new Error(`Cookie file not found: ${resolved}`);
    return { kind: "cookie", path: resolved };
  }

  const defaultState = getDefaultAuthFilePath(config.storageStateFileName);
  if (fs.existsSync(defaultState)) return { kind: "storage-state", path: defaultState };

  const defaultCookie = getDefaultAuthFilePath(config.cookieFileName);
  if (fs.existsSync(defaultCookie)) return { kind: "cookie", path: defaultCookie };

  throw new Error(
    "No auth file found. Provide --state/--cookie or place storageState.json under .auth/",
  );
}

function firstHeading(content: string): string | undefined {
  const match = content.match(/^#\s+(.+)$/m) || content.match(/^##\s+(.+)$/m);
  return match?.[1]?.trim();
}

function normalizeFrontmatter(data: Record<string, unknown>): FrontmatterArticle {
  return {
    title: typeof data.title === "string" ? data.title : undefined,
    tags: Array.isArray(data.tags)
      ? data.tags.filter((item): item is string => typeof item === "string")
      : typeof data.tags === "string"
        ? data.tags
        : undefined,
    cover: typeof data.cover === "string" ? data.cover : undefined,
    coverImage: typeof data.coverImage === "string" ? data.coverImage : undefined,
    featureImage: typeof data.featureImage === "string" ? data.featureImage : undefined,
    image: typeof data.image === "string" ? data.image : undefined,
    column: typeof data.column === "string" ? data.column : undefined,
    visibility: typeof data.visibility === "string" ? data.visibility : undefined,
  };
}

export function readArticleInput(filePath: string, options: PostCliOptions): ArticleInput {
  const resolvedPath = resolveExplicitPath(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Article file not found: ${resolvedPath}`);
  }

  const raw = fs.readFileSync(resolvedPath, "utf-8");
  const parsed = matter(raw);
  const frontmatter = normalizeFrontmatter((parsed.data ?? {}) as Record<string, unknown>);
  const title = options.title?.trim() || frontmatter.title?.trim() || firstHeading(parsed.content)?.trim();
  if (!title) {
    throw new Error("Unable to resolve article title. Provide --title or add frontmatter title / first heading.");
  }

  const cover = options.cover || frontmatter.cover || frontmatter.coverImage || frontmatter.featureImage || frontmatter.image;
  const frontmatterTags = Array.isArray(frontmatter.tags)
    ? frontmatter.tags
    : typeof frontmatter.tags === "string"
      ? parseList(frontmatter.tags)
      : [];
  const tags = options.tags.length > 0 ? options.tags : frontmatterTags;

  let finalContent = parsed.content.trim();
  const headingRegex = /^\s*#\s+(.+)$/m;
  const match = finalContent.match(headingRegex);
  if (match && match[1].trim() === title) {
    finalContent = finalContent.replace(match[0], "").trim();
  }

  return {
    filePath: resolvedPath,
    content: finalContent,
    frontmatter,
    title,
    tags,
    cover,
    column: options.column || frontmatter.column,
    visibility: options.visibility || frontmatter.visibility,
  };
}

export function extractArticleIdFromUrl(url: string): string | undefined {
  const match = url.match(/\/(post|article|draft|drafts)\/(\d+)/);
  return match?.[2];
}

export function printFetchUsage(scriptName: string): void {
  console.log(`Usage: npx tsx ${scriptName} [options]\n` +
    "Options:\n" +
    "  --page <content|follower|both>  Select creator data page(s)\n" +
    "  --start <YYYY-MM-DD>            Optional start date filter\n" +
    "  --end <YYYY-MM-DD>              Optional end date filter\n" +
    "  --output <dir>                  Output directory\n" +
    "  --cookie <path>                 Cookie JSON file path\n" +
    "  --state <path>                  Playwright storageState JSON path\n" +
    "  --save-raw / --no-save-raw      Save raw captured payloads\n" +
    "  --probe                         Probe login and response capture only\n" +
    "  --headful                       Run browser with GUI\n" +
    "  --timeout <ms>                  Browser timeout in milliseconds\n");
}

export function printPostUsage(scriptName: string): void {
  console.log(`Usage: npx tsx ${scriptName} --file <article.md> [options]\n` +
    "Options:\n" +
    "  --title <value>                 Override title\n" +
    "  --cover <path>                  Cover image file path\n" +
    "  --tags <tag1,tag2>              Comma-separated tags\n" +
    "  --column <value>                Column / collection name\n" +
    "  --visibility <value>            Visibility hint text\n" +
    "  --draft                         Save draft only (default)\n" +
    "  --cookie <path>                 Cookie JSON file path\n" +
    "  --state <path>                  Playwright storageState JSON path\n" +
    "  --headful                       Run browser with GUI\n" +
    "  --timeout <ms>                  Browser timeout in milliseconds\n");
}