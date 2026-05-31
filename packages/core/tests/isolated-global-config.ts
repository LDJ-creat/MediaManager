import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Redirect ~/.media-manager reads/writes to a temp dir for the current process. */
export function useIsolatedGlobalConfig(parentDir: string): string {
  const configDir = path.join(parentDir, "global-config");
  fs.mkdirSync(configDir, { recursive: true });
  process.env.MEDIA_MANAGER_CONFIG_DIR = configDir;
  return configDir;
}

export function clearIsolatedGlobalConfig(): void {
  delete process.env.MEDIA_MANAGER_CONFIG_DIR;
}

export function createIsolatedTestRoot(prefix = "mm-core-test-"): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}
