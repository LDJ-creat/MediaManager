import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (process.env.MEDIA_MANAGER_SKIP_SETUP === "1") {
  process.exit(0);
}

if (!process.stdin.isTTY) {
  process.exit(0);
}

// Only prompt on global npm install (best-effort heuristic)
const mainScript = path.join(__dirname, "main.js");
const result = spawnSync(process.execPath, [mainScript, "setup", "--interactive"], {
  stdio: "inherit",
});

process.exit(result.status ?? 0);
