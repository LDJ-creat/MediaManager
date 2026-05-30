import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));

export const SKILL_ROOT = path.resolve(SCRIPTS_DIR, "..");
export const DATA_DIR = path.join(SKILL_ROOT, "data");
export const SOURCES_FILE = path.join(SKILL_ROOT, "references", "sources.json");
export const SEEN_URLS_FILE = path.join(DATA_DIR, "seen_urls.json");
export const LATEST_ARTICLES_FILE = path.join(DATA_DIR, "latest_articles.json");
export const SELECTED_URLS_FILE = path.join(DATA_DIR, "selected_urls.json");
export const DIGESTS_DIR = path.join(DATA_DIR, "digests");
