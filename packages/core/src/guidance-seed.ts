import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findMonorepoRoot, findRepoRoot } from "./repo-root.js";

const RUNTIME_GUIDANCE_REL = path.join(
  "skills",
  "media-manager",
  "references",
  "guidance",
);

const SKILL_GUIDANCE_REL = path.join("skills", "media-manager", "references", "guidance");

/** Subdirs created by ensureGuidanceLayout; doctor checks layout only, not individual .md files. */
const GUIDANCE_LAYOUT_SUBDIRS = [
  "topic-selection",
  "topic-selection/platform",
  "writing",
  "writing/platform",
  "publishing",
  "publishing/platform",
  "analytics",
  "analytics/platform",
] as const;

function isDirectory(entry: fs.Dirent): boolean {
  return entry.isDirectory();
}

function isSeedableFile(entry: fs.Dirent): boolean {
  return entry.isFile() && entry.name !== ".gitkeep";
}

function pushUnique(dirs: string[], candidate: string | null | undefined): void {
  if (!candidate || !fs.existsSync(candidate)) return;
  const resolved = path.resolve(candidate);
  if (!dirs.includes(resolved)) dirs.push(resolved);
}

function resolveRuntimeGuidanceDir(startDir: string): string | null {
  let current = path.resolve(startDir);
  for (;;) {
    const runtimeGuidance = path.join(
      current,
      "node_modules",
      "@dsmlll",
      "media-manager-runtime",
      RUNTIME_GUIDANCE_REL,
    );
    if (fs.existsSync(runtimeGuidance)) return runtimeGuidance;

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function resolveSkillGuidanceDir(startDir: string): string | null {
  const monorepo = findMonorepoRoot(startDir);
  if (monorepo) {
    const skillGuidance = path.join(monorepo, SKILL_GUIDANCE_REL);
    if (fs.existsSync(skillGuidance)) return skillGuidance;
  }

  const repo = findRepoRoot(startDir);
  if (repo) {
    const skillGuidance = path.join(repo, SKILL_GUIDANCE_REL);
    if (fs.existsSync(skillGuidance)) return skillGuidance;
  }

  const coreDir = path.dirname(fileURLToPath(import.meta.url));
  const fromCoreMonorepo = findMonorepoRoot(coreDir);
  if (fromCoreMonorepo) {
    const skillGuidance = path.join(fromCoreMonorepo, SKILL_GUIDANCE_REL);
    if (fs.existsSync(skillGuidance)) return skillGuidance;
  }

  return null;
}

/**
 * Ordered template sources (missing files only). Never reads workspace guidance/ as templates.
 * Canonical: skills/media-manager/references/guidance/ (committed) → seeded into workspace guidance/.
 */
export function resolveGuidanceTemplateDirs(startDir: string = process.cwd()): string[] {
  const dirs: string[] = [];

  const explicit = process.env.MEDIA_GUIDANCE_TEMPLATES;
  if (explicit) pushUnique(dirs, explicit);

  pushUnique(dirs, resolveRuntimeGuidanceDir(startDir));
  pushUnique(dirs, resolveSkillGuidanceDir(startDir));

  return dirs;
}

/** @deprecated Prefer resolveGuidanceTemplateDirs; returns primary canonical dir if any. */
export function resolveGuidanceTemplateDir(startDir: string = process.cwd()): string | null {
  const dirs = resolveGuidanceTemplateDirs(startDir);
  return (
    dirs.find((d) => d.replace(/\\/g, "/").includes(SKILL_GUIDANCE_REL.replace(/\\/g, "/")))
    ?? dirs.at(-1)
    ?? null
  );
}

function copyMissingFiles(sourceDir: string, destDir: string): number {
  let copied = 0;
  fs.mkdirSync(destDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (entry.name === "WORKSPACE-README.md") continue;

    const sourcePath = path.join(sourceDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (isDirectory(entry)) {
      copied += copyMissingFiles(sourcePath, destPath);
      continue;
    }

    if (!isSeedableFile(entry)) continue;
    if (fs.existsSync(destPath)) continue;

    fs.copyFileSync(sourcePath, destPath);
    copied += 1;
  }

  return copied;
}

function seedWorkspaceReadme(sourceDir: string, guidanceDir: string): number {
  const workspaceReadme = path.join(sourceDir, "WORKSPACE-README.md");
  const destReadme = path.join(guidanceDir, "README.md");
  if (!fs.existsSync(workspaceReadme) || fs.existsSync(destReadme)) return 0;
  fs.copyFileSync(workspaceReadme, destReadme);
  return 1;
}

export function seedGuidanceTemplates(
  guidanceDir: string,
  startDir: string = process.cwd(),
): { seeded: number; templateDirs: string[] } {
  const templateDirs = resolveGuidanceTemplateDirs(startDir);
  if (templateDirs.length === 0) {
    return { seeded: 0, templateDirs: [] };
  }

  let seeded = 0;
  for (const templateDir of templateDirs) {
    seeded += copyMissingFiles(templateDir, guidanceDir);
    seeded += seedWorkspaceReadme(templateDir, guidanceDir);
  }

  return { seeded, templateDirs };
}

export function ensureGuidanceLayout(guidanceDir: string): void {
  fs.mkdirSync(guidanceDir, { recursive: true });
  for (const rel of GUIDANCE_LAYOUT_SUBDIRS) {
    fs.mkdirSync(path.join(guidanceDir, rel), { recursive: true });
  }
}

/** Doctor: guidance skeleton exists. Individual .md templates are optional (seed fills missing only). */
export function isGuidanceLayoutReady(guidanceDir: string): boolean {
  if (!fs.existsSync(guidanceDir)) return false;
  return GUIDANCE_LAYOUT_SUBDIRS.every((rel) =>
    fs.existsSync(path.join(guidanceDir, rel)),
  );
}
