import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import type {
  AuthFileRef,
  NoteFrontmatter,
  NoteInput,
  PostCliOptions,
  SkillConfig,
} from "./types.js";

export const XHS_LOGIN_URL = "https://creator.xiaohongshu.com/login";
export const XHS_PUBLISH_NOTE_URL =
  "https://creator.xiaohongshu.com/publish/publish?from=homepage&target=image";
export const XHS_CREATOR_HOME_URL = "https://creator.xiaohongshu.com/";

const DEFAULT_CONFIG: SkillConfig = {
  defaultOutputDir: "./xhs-output",
  defaultTags: [],
  defaultTimeoutMs: 60_000,
  cookieFileName: "cookies.json",
  storageStateFileName: "storageState.json",
};

const TITLE_MAX_LENGTH = 20;

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

function toFrontmatter(input: unknown): NoteFrontmatter {
  if (!input || typeof input !== "object") {
    return {};
  }
  return input as NoteFrontmatter;
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return parseList(value);
  }
  return [];
}

function deriveTitle(body: string, fallbackFileName: string): string {
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) {
      return trimmed.replace(/^#+\s*/, "").trim();
    }
    return trimmed.slice(0, TITLE_MAX_LENGTH);
  }
  return fallbackFileName.slice(0, TITLE_MAX_LENGTH);
}

function deriveNote(body: string): string {
  let finalBody = body.trim();
  const headingRegex = /^\s*#\s+(.+)$/m;
  const match = finalBody.match(headingRegex);
  if (match) {
    finalBody = finalBody.replace(match[0], "").trim();
  }
  return finalBody;
}

function resolveImagePaths(rawPaths: string[], baseDir: string): string[] {
  const resolved = rawPaths.map((item) => {
    const absolutePath = path.isAbsolute(item)
      ? item
      : path.resolve(baseDir, item);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Image file not found: ${absolutePath}`);
    }
    return absolutePath;
  });
  if (resolved.length === 0) {
    throw new Error("At least one image is required");
  }
  return resolved;
}

export function truncateTitle(title: string): { title: string; truncated: boolean } {
  const trimmed = title.trim();
  if (trimmed.length <= TITLE_MAX_LENGTH) {
    return { title: trimmed, truncated: false };
  }
  return { title: trimmed.slice(0, TITLE_MAX_LENGTH), truncated: true };
}

export function loadSkillConfig(): SkillConfig {
  const config: SkillConfig = { ...DEFAULT_CONFIG };
  const extendFile = findSkillExtendFile();
  if (!extendFile) return config;

  const parsed = parseKeyValueMarkdown(fs.readFileSync(extendFile, "utf-8"));

  if (parsed.default_output_dir) {
    config.defaultOutputDir = parsed.default_output_dir;
  }
  if (parsed.default_tags) {
    config.defaultTags = parseList(parsed.default_tags);
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

export function parsePostCliArgs(args: string[], config: SkillConfig): PostCliOptions {
  const options: PostCliOptions = {
    filePath: undefined,
    imagePaths: [],
    outputDir: config.defaultOutputDir,
    cookiePath: undefined,
    statePath: undefined,
    headless: true,
    timeoutMs: config.defaultTimeoutMs,
    title: undefined,
    note: undefined,
    tags: [...config.defaultTags],
    draft: false,
    publishRequested: true,
    cdpUrl: process.env.XHS_CDP_URL,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === "--file" && next) {
      options.filePath = next;
      i += 1;
      continue;
    }
    if (arg === "--images" && next) {
      i += 1;
      while (i < args.length && !args[i].startsWith("--")) {
        options.imagePaths.push(args[i]);
        i += 1;
      }
      i -= 1;
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
    if (arg === "--note" && next) {
      options.note = next;
      i += 1;
      continue;
    }
    if (arg === "--tags" && next) {
      options.tags = parseList(next);
      i += 1;
      continue;
    }
    if (arg === "--draft") {
      options.draft = true;
      options.publishRequested = false;
      continue;
    }
    if (arg === "--publish") {
      options.publishRequested = true;
      options.draft = false;
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
      continue;
    }
    if (arg === "--cdp-url" && next) {
      options.cdpUrl = next;
      i += 1;
      continue;
    }
  }

  if (!options.filePath && options.imagePaths.length === 0) {
    throw new Error("Provide --file <note.md> or --images <path...>");
  }

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

export function resolveOptionalAuthFile(
  explicitCookiePath: string | undefined,
  explicitStatePath: string | undefined,
  config: SkillConfig,
): AuthFileRef | undefined {
  try {
    return resolveAuthFile(explicitCookiePath, explicitStatePath, config);
  } catch {
    return undefined;
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
    "No auth state found. Provide --state, --cookie, or create .auth/storageState.json"
  );
}

export function loadNoteInput(cli: PostCliOptions): NoteInput {
  const warnings: string[] = [];

  if (cli.filePath) {
    const absolutePath = path.resolve(process.cwd(), cli.filePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Markdown file not found: ${absolutePath}`);
    }

    const content = fs.readFileSync(absolutePath, "utf-8");
    const parsed = matter(content);
    const frontmatter = toFrontmatter(parsed.data);
    const baseDir = path.dirname(absolutePath);
    const fallbackFileName = path.parse(absolutePath).name;

    const titleRaw = cli.title?.trim()
      || frontmatter.title?.trim()
      || deriveTitle(parsed.content, fallbackFileName);
    const { title, truncated } = truncateTitle(titleRaw);
    if (truncated) {
      warnings.push(`Title truncated to ${TITLE_MAX_LENGTH} characters for Xiaohongshu.`);
    }

    const noteRaw = cli.note?.trim()
      || frontmatter.note?.trim()
      || deriveNote(parsed.content);
    let note = noteRaw;
    if (!note.trim()) {
      note = title;
      warnings.push("Note body empty; using title as default description.");
    }

    const tags = cli.tags.length > 0
      ? cli.tags
      : normalizeStringList(frontmatter.tags);

    const imagePathsRaw = cli.imagePaths.length > 0
      ? cli.imagePaths
      : normalizeStringList(frontmatter.images);

    const imagePaths = resolveImagePaths(imagePathsRaw, baseDir);

    const input: NoteInput = {
      filePath: absolutePath,
      title,
      note,
      tags,
      imagePaths,
    };

    if (warnings.length > 0) {
      (input as NoteInput & { _warnings?: string[] })._warnings = warnings;
    }

    return input;
  }

  if (!cli.title?.trim()) {
    throw new Error("Missing required --title when --file is not provided");
  }

  const { title, truncated } = truncateTitle(cli.title);
  if (truncated) {
    warnings.push(`Title truncated to ${TITLE_MAX_LENGTH} characters for Xiaohongshu.`);
  }

  let note = cli.note?.trim() ?? "";
  if (!note) {
    note = title;
    warnings.push("Note body empty; using title as default description.");
  }

  const imagePaths = resolveImagePaths(cli.imagePaths, process.cwd());
  const input: NoteInput = {
    title,
    note,
    tags: cli.tags,
    imagePaths,
  };

  if (warnings.length > 0) {
    (input as NoteInput & { _warnings?: string[] })._warnings = warnings;
  }

  return input;
}

export function collectInputWarnings(note: NoteInput): string[] {
  return (note as NoteInput & { _warnings?: string[] })._warnings ?? [];
}

export function printPostUsage(scriptName: string): void {
  console.log(
    `Usage: npx tsx ${scriptName} (--file <note.md> | --images <path...>) --cdp-url <url> [options]\n\n` +
      "Required:\n" +
      "  --cdp-url <url>                 Attach to logged-in Chrome (e.g. http://127.0.0.1:9222)\n\n" +
      "Options:\n" +
      "  --file <note.md>                Markdown note with frontmatter\n" +
      "  --images <path...>              Image paths (required without --file)\n" +
      "  --title <value>                 Note title (max 20 chars)\n" +
      "  --note <value>                  Note body / description\n" +
      "  --tags <a,b,c>                  Comma-separated topic tags\n" +
      "  --publish                       Publish immediately (default)\n" +
      "  --draft                         Ignored with warning; draft save is not supported\n" +
      "  --output <dir>                  Output directory for result summary\n" +
      "  --timeout <ms>                  Timeout in milliseconds\n\n" +
      "Environment: XHS_CDP_URL can replace --cdp-url",
  );
}

export function printLoginUsage(scriptName: string): void {
  console.log(
    `Usage: npx tsx ${scriptName} [options]\n\n` +
      "Options:\n" +
      "  --state <path>                  Playwright storageState JSON path\n" +
      "  --cookie <path>                 Cookie JSON file path\n" +
      "  --headful                       Run browser with GUI\n" +
      "  --timeout <ms>                  Timeout in milliseconds",
  );
}

export function parseLoginCliArgs(
  args: string[],
  config: SkillConfig,
): Pick<PostCliOptions, "cookiePath" | "statePath" | "headless" | "timeoutMs"> {
  const options = {
    cookiePath: undefined as string | undefined,
    statePath: undefined as string | undefined,
    headless: true,
    timeoutMs: config.defaultTimeoutMs,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];
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

  return options;
}

export { resolveOptionalFile, parseBool };
