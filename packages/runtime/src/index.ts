import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findMonorepoRoot } from "@dsmlll/media-manager-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getBundledSkillsDir(): string {
  const repo =
    findMonorepoRoot(process.cwd()) ??
    findMonorepoRoot(path.join(__dirname, "..", "..", ".."));
  if (repo) {
    const repoSkills = path.join(repo, "skills");
    if (fs.existsSync(repoSkills)) return repoSkills;
  }

  const bundled = path.join(__dirname, "..", "skills");
  if (fs.existsSync(bundled)) return bundled;

  throw new Error("MediaManager skills directory not found.");
}

export function resolveSkillScript(skillName: string, scriptRelative: string): string {
  return path.join(getBundledSkillsDir(), skillName, scriptRelative);
}
