import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));

export const SKILL_ROOT = path.resolve(SCRIPTS_DIR, "..");
export const SOURCES_FILE = path.join(SKILL_ROOT, "references", "sources.json");

let _dataDir: string | null = null;

export function resolveDataDir(argv: string[] = process.argv.slice(2)): string {
  if (_dataDir) return _dataDir;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--data-dir" && argv[i + 1]) {
      _dataDir = path.resolve(argv[i + 1]);
      return _dataDir;
    }
  }

  const workspace = process.env.MEDIA_WORKSPACE?.trim();
  if (workspace) {
    _dataDir = path.join(path.resolve(workspace), ".media-manager", "data", "news");
    return _dataDir;
  }

  _dataDir = path.join(SKILL_ROOT, "data");
  return _dataDir;
}

export function getDataPaths(argv?: string[]) {
  const DATA_DIR = resolveDataDir(argv);
  return {
    DATA_DIR,
    SEEN_URLS_FILE: path.join(DATA_DIR, "seen_urls.json"),
    LATEST_ARTICLES_FILE: path.join(DATA_DIR, "latest_articles.json"),
    SELECTED_URLS_FILE: path.join(DATA_DIR, "selected_urls.json"),
    DIGESTS_DIR: path.join(DATA_DIR, "digests"),
  };
}

export function ensureDataDir(dataDir: string): void {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(path.join(dataDir, "digests"), { recursive: true });
}
