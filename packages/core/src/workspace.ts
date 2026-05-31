import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { GlobalConfig, WorkspaceConfig, WorkspacePaths } from "./types.js";
import { CLI_VERSION, GLOBAL_CONFIG_VERSION, WORKSPACE_CONFIG_VERSION, WORKSPACE_LAYOUT } from "./types.js";
import { findRepoRoot } from "./repo-root.js";
import { ensureGuidanceLayout, seedGuidanceTemplates } from "./guidance-seed.js";

const WORKSPACE_GITIGNORE_LINES = [".media-manager/secrets/", ".media-manager/auth/"];

export function ensureWorkspaceGitignore(workspace: string): void {
  const gitignorePath = path.join(path.resolve(workspace), ".gitignore");
  const needed = WORKSPACE_GITIGNORE_LINES.filter((line) => {
    if (!fs.existsSync(gitignorePath)) return true;
    const content = fs.readFileSync(gitignorePath, "utf8");
    return !content.split(/\r?\n/).some((existing) => existing.trim() === line);
  });
  if (needed.length === 0) return;

  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, `${needed.join("\n")}\n`, "utf8");
    return;
  }

  const prefix = fs.readFileSync(gitignorePath, "utf8").endsWith("\n") ? "" : "\n";
  fs.appendFileSync(gitignorePath, `${prefix}${needed.join("\n")}\n`, "utf8");
}

export function getGlobalConfigDir(): string {
  return path.join(os.homedir(), ".media-manager");
}

export function getGlobalConfigPath(): string {
  return path.join(getGlobalConfigDir(), "config.json");
}

export function getDefaultWorkspacePath(): string {
  return path.join(os.homedir(), "Documents", "MediaManager-Workspace");
}

export function readGlobalConfig(): GlobalConfig | null {
  const configPath = getGlobalConfigPath();
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8")) as GlobalConfig;
  } catch {
    return null;
  }
}

export function writeGlobalConfig(workspace: string): GlobalConfig {
  const dir = getGlobalConfigDir();
  fs.mkdirSync(dir, { recursive: true });
  const config: GlobalConfig = {
    version: GLOBAL_CONFIG_VERSION,
    workspace: path.resolve(workspace),
    initializedAt: new Date().toISOString(),
    cliVersion: CLI_VERSION,
  };
  fs.writeFileSync(getGlobalConfigPath(), JSON.stringify(config, null, 2), "utf8");
  return config;
}

export function readWorkspaceConfig(workspace: string): WorkspaceConfig | null {
  const configPath = path.join(path.resolve(workspace), ".media-manager", "config.json");
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8")) as WorkspaceConfig;
  } catch {
    return null;
  }
}

export function writeWorkspaceConfig(workspace: string): WorkspaceConfig {
  const root = path.resolve(workspace);
  const mediaDir = path.join(root, ".media-manager");
  fs.mkdirSync(mediaDir, { recursive: true });
  const config: WorkspaceConfig = {
    version: WORKSPACE_CONFIG_VERSION,
    layout: WORKSPACE_LAYOUT,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(mediaDir, "config.json"), JSON.stringify(config, null, 2), "utf8");
  return config;
}

export function resolveWorkspacePaths(workspace: string): WorkspacePaths {
  const root = path.resolve(workspace);
  const mediaManagerDir = path.join(root, ".media-manager");
  return {
    workspace: root,
    outputDir: path.join(root, "output"),
    guidanceDir: path.join(root, "guidance"),
    analysisDir: path.join(root, "output", "analysis"),
    mediaManagerDir,
    newsDataDir: path.join(mediaManagerDir, "data", "news"),
    authDir: path.join(mediaManagerDir, "auth"),
    secretsDir: path.join(mediaManagerDir, "secrets"),
    analyticsDir: (platform: string) => path.join(mediaManagerDir, "data", "analytics", platform),
    authPlatformDir: (platform: string) => path.join(mediaManagerDir, "auth", platform),
    articleDir: (slug: string) => path.join(root, "output", slug),
  };
}

export function ensureWorkspaceLayout(workspace: string): WorkspacePaths {
  const paths = resolveWorkspacePaths(workspace);
  fs.mkdirSync(paths.outputDir, { recursive: true });
  fs.mkdirSync(paths.guidanceDir, { recursive: true });
  ensureGuidanceLayout(paths.guidanceDir);
  seedGuidanceTemplates(paths.guidanceDir, paths.workspace);
  fs.mkdirSync(paths.analysisDir, { recursive: true });
  fs.mkdirSync(paths.newsDataDir, { recursive: true });
  fs.mkdirSync(paths.authDir, { recursive: true });
  fs.mkdirSync(paths.secretsDir, { recursive: true });
  ensureWorkspaceGitignore(workspace);
  writeWorkspaceConfig(workspace);
  return paths;
}

export function findWorkspaceConfigUpwards(startDir: string = process.cwd()): string | null {
  let current = path.resolve(startDir);
  for (;;) {
    const configPath = path.join(current, ".media-manager", "config.json");
    if (fs.existsSync(configPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(configPath, "utf8")) as WorkspaceConfig;
        if (raw.layout) return current;
      } catch {
        /* continue */
      }
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export interface ResolveWorkspaceOptions {
  explicit?: string;
  cwd?: string;
}

export function resolveWorkspace(options: ResolveWorkspaceOptions = {}): string {
  const cwd = options.cwd ?? process.cwd();

  if (options.explicit) {
    return path.resolve(options.explicit);
  }

  if (process.env.MEDIA_WORKSPACE) {
    return path.resolve(process.env.MEDIA_WORKSPACE);
  }

  const globalConfig = readGlobalConfig();
  if (globalConfig?.workspace) {
    return path.resolve(globalConfig.workspace);
  }

  const fromCwd = findWorkspaceConfigUpwards(cwd);
  if (fromCwd) return fromCwd;

  const repoRoot = findRepoRoot(cwd);
  if (repoRoot) return repoRoot;

  throw new Error(
    "MediaManager workspace is not configured. Run `media setup` or set MEDIA_WORKSPACE."
  );
}

export function setupWorkspace(workspacePath: string): { global: GlobalConfig; paths: WorkspacePaths } {
  const resolved = path.resolve(workspacePath);
  const global = writeGlobalConfig(resolved);
  const paths = ensureWorkspaceLayout(resolved);
  return { global, paths };
}
