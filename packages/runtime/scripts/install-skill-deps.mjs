import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runtimeRoot = path.join(__dirname, "..");
const skillsDir = path.join(runtimeRoot, "skills");
const platformCommonDir = path.join(runtimeRoot, "..", "platform-common");

function patchPlatformCommonDep(scriptsPkgPath) {
  if (!fs.existsSync(scriptsPkgPath)) return;
  const scriptsDir = path.dirname(scriptsPkgPath);
  const pkg = JSON.parse(fs.readFileSync(scriptsPkgPath, "utf8"));
  if (!pkg.dependencies?.["@dsmlll/media-manager-platform-common"]) return;

  const rel = path
    .relative(scriptsDir, platformCommonDir)
    .split(path.sep)
    .join("/");
  pkg.dependencies["@dsmlll/media-manager-platform-common"] = `file:${rel}`;
  fs.writeFileSync(scriptsPkgPath, JSON.stringify(pkg, null, 2), "utf8");
}

if (!fs.existsSync(skillsDir)) {
  process.exit(0);
}

for (const skill of fs.readdirSync(skillsDir, { withFileTypes: true })) {
  if (!skill.isDirectory()) continue;
  const scriptsPkg = path.join(skillsDir, skill.name, "scripts", "package.json");
  if (!fs.existsSync(scriptsPkg)) continue;
  patchPlatformCommonDep(scriptsPkg);
  const scriptsDir = path.dirname(scriptsPkg);
  if (fs.existsSync(path.join(scriptsDir, "node_modules", "@dsmlll", "media-manager-platform-common"))) {
    continue;
  }
  console.log(`Installing ${skill.name} script dependencies...`);
  spawnSync("npm", ["install", "--omit=dev"], { cwd: scriptsDir, stdio: "inherit", shell: true });
}
