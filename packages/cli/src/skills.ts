import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findMonorepoRoot } from "@dsmlll/media-manager-core";
import { getBundledSkillsDir } from "@dsmlll/media-manager-runtime";
import { ui } from "./ui.js";

export const SKILLS_REPO = "LDJ-creat/MediaManager";

/** Agent skill directories used by `npx skills add -g` (keep in sync with uninstall-skills.*). */
export const SKILL_AGENT_TARGET_DIRS = [
  ".cursor/skills",
  ".agents/skills",
  ".claude/skills",
  ".codex/skills",
  ".gemini/skills",
  ".copilot/skills",
  ".agent/skills",
  ".gemini/antigravity/skills",
] as const;

export function getSkillAgentTargetPaths(
  home = process.env.HOME ?? process.env.USERPROFILE ?? os.homedir()
): string[] {
  return SKILL_AGENT_TARGET_DIRS.map((rel) => path.join(home, ...rel.split("/")));
}

export function listMediaManagerSkillNames(): string[] {
  const skillsDir = getBundledSkillsDir();
  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(skillsDir, entry.name, "SKILL.md")))
    .map((entry) => entry.name)
    .sort();
}

function resolveSkillAgents(target: string): string[] {
  if (target === "cursor") return ["cursor"];
  if (target === "claude") return ["claude-code"];
  return ["cursor", "claude-code"];
}

function runMonorepoSyncIfPresent(): void {
  const repoRoot = findMonorepoRoot(path.dirname(fileURLToPath(import.meta.url)));
  if (!repoRoot) return;
  const syncScript = path.join(
    repoRoot,
    process.platform === "win32" ? "sync-skills.ps1" : "sync-skills.sh"
  );
  if (!fs.existsSync(syncScript)) return;
  if (process.platform === "win32") {
    spawnSync("powershell", ["-ExecutionPolicy", "Bypass", "-File", syncScript], { stdio: "inherit" });
  } else {
    spawnSync("bash", [syncScript], { stdio: "inherit" });
  }
}

export function runSkillsAdd(flags: Record<string, string | boolean> = {}): number {
  const target = typeof flags.target === "string" ? flags.target : "all";
  const silent = flags.silent === true;
  const agents = resolveSkillAgents(target);

  const args = [
    "skills",
    "add",
    SKILLS_REPO,
    "--skill",
    "*",
    "-g",
    "-y",
    "--all",
    ...agents.flatMap((a) => ["-a", a]),
  ];

  const result = spawnSync("npx", args, {
    stdio: silent ? "pipe" : "inherit",
    shell: true,
    encoding: silent ? "utf8" : undefined,
  });
  const status = result.status ?? 1;
  if (status !== 0) {
    if (silent && result.stderr) {
      console.error(result.stderr.slice(-500));
    }
    return status;
  }

  runMonorepoSyncIfPresent();
  return 0;
}

export function runSkillsUpdate(flags: Record<string, string | boolean> = {}): number {
  return runSkillsAdd(flags);
}

export function runSkillsUninstall(flags: Record<string, string | boolean> = {}): number {
  const silent = flags.silent === true;
  const names = listMediaManagerSkillNames();
  const extra = ["guidance"];
  const toRemove = [...names, ...extra];
  const targets = getSkillAgentTargetPaths();
  let removed = 0;

  for (const targetDir of targets) {
    if (!fs.existsSync(targetDir)) continue;
    for (const name of toRemove) {
      const dest = path.join(targetDir, name);
      if (!fs.existsSync(dest)) continue;
      try {
        fs.rmSync(dest, { recursive: true, force: true });
        removed += 1;
        if (!silent) {
          console.log(`${ui.dim("已移除")} ${dest}`);
        }
      } catch (err) {
        console.error(`${ui.yellow("⚠")} 无法删除 ${dest}: ${String(err)}`);
        return 1;
      }
    }
  }

  if (!silent) {
    if (removed > 0) {
      console.log(`\n${ui.green("✓")} Skills 已卸载（${removed} 项）`);
    } else {
      console.log(`\n${ui.dim("未发现已安装的 MediaManager Skills")}`);
    }
  }
  return 0;
}

export function isMediaManagerSkillInstalled(): boolean {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? os.homedir();
  const checks = [
    path.join(home, ".cursor", "skills", "media-manager", "SKILL.md"),
    path.join(home, ".agents", "skills", "media-manager", "SKILL.md"),
    path.join(home, ".claude", "skills", "media-manager", "SKILL.md"),
  ];
  return checks.some((p) => fs.existsSync(p));
}
