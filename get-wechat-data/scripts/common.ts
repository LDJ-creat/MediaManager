import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import type { AuthFileRef, CliOptions, PageType, SkillConfig } from "./types";

const DEFAULT_CONFIG: SkillConfig = {
  defaultPage: "both",
  defaultToken: undefined,
  defaultOutputDir: "./wechat-data-output",
  defaultSaveRaw: true,
  defaultTimeoutMs: 30_000,
  cookieFileName: "cookies.json",
  storageStateFileName: "storageState.json",
};

const CONTENT_ANALYSIS_BASE_URL = "https://mp.weixin.qq.com/misc/appmsganalysis?action=report&type=daily_v2&lang=zh_CN";
const USER_ANALYSIS_BASE_URL = "https://mp.weixin.qq.com/misc/useranalysis?lang=zh_CN";

function appendToken(url: string, token?: string): string {
  if (!token) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

export function getContentAnalysisUrl(token?: string): string {
  return appendToken(CONTENT_ANALYSIS_BASE_URL, token);
}

export function getUserAnalysisUrl(token?: string): string {
  return appendToken(USER_ANALYSIS_BASE_URL, token);
}

function parseBool(input: string): boolean {
  return ["1", "true", "yes", "on"].includes(input.trim().toLowerCase());
}

function parseNumber(input: string, fallback: number): number {
  const n = Number(input);
  return Number.isFinite(n) && n > 0 ? n : fallback;
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
    if (["content", "user", "both"].includes(normalized)) {
      config.defaultPage = normalized;
    }
  }

  if (parsed.default_output_dir) {
    config.defaultOutputDir = parsed.default_output_dir;
  }

  if (parsed.default_token) {
    config.defaultToken = parsed.default_token;
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

export function parseCliArgs(args: string[], config: SkillConfig): CliOptions {
  const options: CliOptions = {
    page: config.defaultPage,
    token: config.defaultToken,
    outputDir: config.defaultOutputDir,
    cookiePath: undefined,
    saveRaw: config.defaultSaveRaw,
    probeOnly: false,
    headless: true,
    timeoutMs: config.defaultTimeoutMs,
    proxyServer: undefined,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === "--page" && next) {
      const page = next.toLowerCase();
      if (page === "content" || page === "user" || page === "both") options.page = page;
      i += 1;
      continue;
    }

    if (arg === "--token" && next) {
      options.token = next;
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

    if (arg === "--proxy" && next) {
      options.proxyServer = next;
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
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }
  return trimmed;
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

export function printUsage(scriptName: string): void {
  console.log(`Usage: npx tsx ${scriptName} [options]\n` +
    "Options:\n" +
    "  --page <content|user|both>  Select analysis page(s)\n" +
    "  --token <value>             WeChat backend token from the analytics URL\n" +
    "  --start <YYYY-MM-DD>        Optional start date filter\n" +
    "  --end <YYYY-MM-DD>          Optional end date filter\n" +
    "  --output <dir>              Output directory\n" +
    "  --cookie <path>             Cookie JSON file path\n" +
    "  --state <path>              Playwright storageState JSON path\n" +
    "  --proxy <server>            Proxy server for Playwright (e.g. socks5://127.0.0.1:7897)\n" +
    "  --save-raw / --no-save-raw  Save raw captured payloads\n" +
    "  --probe                     Probe login and capture capability only\n" +
    "  --headful                   Run browser with GUI (default headless)\n" +
    "  --timeout <ms>              Page wait timeout in milliseconds");
}

function resolveExplicitFile(explicitPath: string | undefined, label: string): string | null {
  if (!explicitPath) return null;
  const abs = path.resolve(process.cwd(), explicitPath);
  if (!fs.existsSync(abs)) {
    throw new Error(`${label} not found: ${abs}`);
  }
  return abs;
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
