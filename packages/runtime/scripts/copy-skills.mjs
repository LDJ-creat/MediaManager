import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const srcSkills = path.join(repoRoot, "skills");
const destSkills = path.join(__dirname, "..", "skills");

const SKIP_DIRS = new Set([
  "node_modules",
  ".auth",
  ".chrome-cdp-profile",
  "data",
  "output",
  "test-output",
  "test-output-archive",
  "test-fixtures",
  "csdn-output",
  "juejin-data-output",
  "wechat-data-output",
  "xhs-output",
]);

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`skip missing skills source: ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

copyDir(srcSkills, destSkills);
console.log(`runtime skills copied to ${destSkills}`);
