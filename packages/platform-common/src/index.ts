import fs from "node:fs";
import path from "node:path";

export function resolveWorkspaceFromEnv(): string | null {
  const value = process.env.MEDIA_WORKSPACE?.trim();
  return value ? path.resolve(value) : null;
}

export function ensureAuthDir(platform: string, skillRoot: string): string {
  const dir = resolveAuthDir(platform, skillRoot);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function resolveAuthDir(platform: string, skillRoot: string): string {
  const fromEnv = process.env.MEDIA_AUTH_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);

  const workspace = resolveWorkspaceFromEnv();
  if (workspace) {
    const platformAuth = path.join(workspace, ".media-manager", "auth", platform);
    if (fs.existsSync(platformAuth)) return platformAuth;
    const genericAuth = path.join(workspace, ".media-manager", "auth");
    if (fs.existsSync(genericAuth)) return genericAuth;
  }

  return path.join(skillRoot, ".auth");
}

export function resolveAnalyticsDir(platform: string, skillRoot: string, fallbackDir: string): string {
  const fromCli = process.env.MEDIA_ANALYTICS_DIR?.trim();
  if (fromCli) return path.resolve(fromCli);

  const workspace = resolveWorkspaceFromEnv();
  if (workspace) {
    return path.join(workspace, ".media-manager", "data", "analytics", platform);
  }

  const fromCwd = path.resolve(process.cwd(), fallbackDir);
  return fromCwd;
}

export function resolveStorageStatePath(
  platform: string,
  skillRoot: string,
  explicit?: string
): string | null {
  if (explicit) {
    const abs = path.resolve(process.cwd(), explicit);
    return fs.existsSync(abs) ? abs : null;
  }

  const authDir = resolveAuthDir(platform, skillRoot);
  const storage = path.join(authDir, "storageState.json");
  if (fs.existsSync(storage)) return storage;

  const cookies = path.join(authDir, "cookies.json");
  if (fs.existsSync(cookies)) return cookies;

  const legacy = path.join(skillRoot, ".auth", "storageState.json");
  if (fs.existsSync(legacy)) return legacy;

  const legacyCookies = path.join(skillRoot, ".auth", "cookies.json");
  if (fs.existsSync(legacyCookies)) return legacyCookies;

  return null;
}

export function parseKeyValueMarkdown(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key && value) out[key] = value;
  }
  return out;
}

export type AuthFileKind = "storage-state" | "cookie";

export interface AuthFileRef {
  kind: AuthFileKind;
  path: string;
}

export function resolveAuthFileRef(
  platform: string,
  skillRoot: string,
  options: {
    storageStateFileName?: string;
    cookieFileName?: string;
    explicitState?: string;
    explicitCookie?: string;
  } = {}
): AuthFileRef | null {
  const storageStateFileName = options.storageStateFileName ?? "storageState.json";
  const cookieFileName = options.cookieFileName ?? "cookies.json";

  if (options.explicitState) {
    const abs = path.resolve(process.cwd(), options.explicitState);
    return fs.existsSync(abs) ? { kind: "storage-state", path: abs } : null;
  }
  if (options.explicitCookie) {
    const abs = path.resolve(process.cwd(), options.explicitCookie);
    return fs.existsSync(abs) ? { kind: "cookie", path: abs } : null;
  }

  const authDir = resolveAuthDir(platform, skillRoot);
  const storage = path.join(authDir, storageStateFileName);
  if (fs.existsSync(storage)) return { kind: "storage-state", path: storage };

  const cookies = path.join(authDir, cookieFileName);
  if (fs.existsSync(cookies)) return { kind: "cookie", path: cookies };

  const legacyStorage = path.join(skillRoot, ".auth", storageStateFileName);
  if (fs.existsSync(legacyStorage)) return { kind: "storage-state", path: legacyStorage };

  const legacyCookies = path.join(skillRoot, ".auth", cookieFileName);
  if (fs.existsSync(legacyCookies)) return { kind: "cookie", path: legacyCookies };

  return null;
}

/** Default output for platform `auth export` scripts (respects MEDIA_AUTH_DIR). */
export function defaultStorageStateOutputPath(skillRoot: string): string {
  const authDir = process.env.MEDIA_AUTH_DIR?.trim();
  if (authDir) {
    return path.join(path.resolve(authDir), "storageState.json");
  }
  return path.join(skillRoot, ".auth", "storageState.json");
}

export function parseStorageStateOutputArg(
  args: string[],
  skillRoot: string,
  cwd = process.cwd()
): string {
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--output" && args[i + 1]) {
      return path.resolve(cwd, args[i + 1]!);
    }
  }
  return defaultStorageStateOutputPath(skillRoot);
}

export * from "./env-file.js";
export * from "./secrets.js";
