import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runtimeRoot = path.join(__dirname, "..");
const skillsDir = path.join(runtimeRoot, "skills");

/** npm scope folder name vs monorepo directory name (`packages/platform-common`). */
export function resolvePlatformCommonDir(runtimeRootDir) {
  const candidates = [
    path.join(runtimeRootDir, "..", "media-manager-platform-common"),
    path.join(runtimeRootDir, "..", "platform-common"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
  }
  return null;
}

function isPlatformCommonInstalled(scriptsDir) {
  const installed = path.join(scriptsDir, "node_modules", "@dsmlll", "media-manager-platform-common");
  return (
    fs.existsSync(path.join(installed, "package.json")) &&
    fs.existsSync(path.join(installed, "dist", "index.js"))
  );
}

function patchPlatformCommonDep(scriptsPkgPath, platformCommonDir) {
  if (!fs.existsSync(scriptsPkgPath)) return;
  const scriptsDir = path.dirname(scriptsPkgPath);
  const pkg = JSON.parse(fs.readFileSync(scriptsPkgPath, "utf8"));
  if (!pkg.dependencies?.["@dsmlll/media-manager-platform-common"]) return;

  if (platformCommonDir) {
    const rel = path
      .relative(scriptsDir, platformCommonDir)
      .split(path.sep)
      .join("/");
    pkg.dependencies["@dsmlll/media-manager-platform-common"] = `file:${rel}`;
  }

  fs.writeFileSync(scriptsPkgPath, JSON.stringify(pkg, null, 2), "utf8");
}

const platformCommonDir = resolvePlatformCommonDir(runtimeRoot);

function main() {
  if (!fs.existsSync(skillsDir)) {
    return;
  }

  for (const skill of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    const scriptsPkg = path.join(skillsDir, skill.name, "scripts", "package.json");
    if (!fs.existsSync(scriptsPkg)) continue;
    patchPlatformCommonDep(scriptsPkg, platformCommonDir);
    const scriptsDir = path.dirname(scriptsPkg);
    if (isPlatformCommonInstalled(scriptsDir)) {
      continue;
    }
    console.log(`Installing ${skill.name} script dependencies...`);
    const result = spawnSync("npm", ["install", "--omit=dev"], {
      cwd: scriptsDir,
      stdio: "inherit",
      shell: true,
    });
    if (result.status !== 0) {
      console.error(`Failed to install ${skill.name} script dependencies (exit ${result.status ?? "unknown"})`);
      process.exit(result.status ?? 1);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
