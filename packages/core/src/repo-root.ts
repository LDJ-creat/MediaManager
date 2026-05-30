import fs from "node:fs";
import path from "node:path";

export function findRepoRoot(startDir: string = process.cwd()): string | null {
  let current = path.resolve(startDir);
  for (;;) {
    if (fs.existsSync(path.join(current, ".media-manager", "repo-marker.json"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function findMonorepoRoot(startDir: string = process.cwd()): string | null {
  let current = path.resolve(startDir);
  for (;;) {
    if (fs.existsSync(path.join(current, "package.json"))) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(current, "package.json"), "utf8")) as {
          name?: string;
          workspaces?: string[];
        };
        if (pkg.name === "media-manager-monorepo" || pkg.workspaces?.includes("packages/*")) {
          return current;
        }
      } catch {
        /* continue */
      }
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function resolveSkillsDir(startDir: string = process.cwd()): string {
  const repo = findMonorepoRoot(startDir) ?? findRepoRoot(startDir);
  if (repo) {
    return path.join(repo, "skills");
  }
  throw new Error("Cannot locate MediaManager skills directory. Install @media-manager/cli or run from repo.");
}

export function resolveRuntimeSkillPath(skillName: string, relativeScript: string, startDir?: string): string {
  const skillsDir = resolveSkillsDir(startDir);
  return path.join(skillsDir, skillName, relativeScript);
}
