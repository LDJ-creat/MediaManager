import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findMonorepoRoot } from "@dsmlll/media-manager-core";
import { getBundledSkillsDir } from "@dsmlll/media-manager-runtime";
import { spawnCommandSync } from "./spawn.js";
import { ui, printStep } from "./ui.js";

export interface SkillsAddResult {
  code: number;
  outputTail?: string;
}

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
  if (target === "codex") return ["codex"];
  if (target === "all") return ["cursor", "claude-code", "codex"];
  return ["cursor", "claude-code", "codex"];
}

export const SKILL_TARGET_OPTIONS = ["cursor", "claude", "codex", "all"] as const;
export const SKILL_TARGET_DEFAULT = "all";

function runMonorepoSyncIfPresent(): void {
  const repoRoot = findMonorepoRoot(path.dirname(fileURLToPath(import.meta.url)));
  if (!repoRoot) return;
  const syncScript = path.join(
    repoRoot,
    process.platform === "win32" ? "sync-skills.ps1" : "sync-skills.sh"
  );
  if (!fs.existsSync(syncScript)) return;
  if (process.platform === "win32") {
    spawnCommandSync("powershell", ["-ExecutionPolicy", "Bypass", "-File", syncScript], { stdio: "inherit" });
  } else {
    spawnCommandSync("bash", [syncScript], { stdio: "inherit" });
  }
}

function tailOutput(text: string | null | undefined, max = 600): string | undefined {
  if (!text?.trim()) return undefined;
  const trimmed = text.trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(-max);
}

function inferSkillsFailureHint(tail?: string): string {
  const lower = (tail ?? "").toLowerCase();
  if (
    /network|timeout|etimedout|econnrefused|enotfound|fetch failed|git clone|could not resolve|unable to access/i.test(
      lower
    )
  ) {
    return "可能由网络超时或 GitHub 连接失败导致";
  }
  return "安装过程出错";
}

export function printSkillsInstallFailureHint(outputTail?: string): void {
  const hint = inferSkillsFailureHint(outputTail);
  printStep(ui.yellow("⚠"), "Skills 安装未完成", hint);
  if (outputTail) {
    console.log(`\n  ${ui.dim("最近输出：")}`);
    for (const line of outputTail.split(/\r?\n/).slice(-4)) {
      if (line.trim()) console.log(`  ${ui.dim(line.trim())}`);
    }
  }
  console.log(`\n  ${ui.dim("请检查网络后重试：")}`);
  console.log(`  ${ui.blue("media skill install")}  ${ui.dim("— 重新安装")}`);
  console.log(`  ${ui.blue("media skill update")}   ${ui.dim("— 从远程更新")}`);
}

export function runSkillsAdd(flags: Record<string, string | boolean> = {}): SkillsAddResult {
  let target = typeof flags.target === "string" ? flags.target : SKILL_TARGET_DEFAULT;
  if (!SKILL_TARGET_OPTIONS.includes(target as (typeof SKILL_TARGET_OPTIONS)[number])) {
    console.warn(`${ui.yellow("⚠")} 未知 --target "${target}"，使用默认值 ${SKILL_TARGET_DEFAULT}`);
    target = SKILL_TARGET_DEFAULT;
  }
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

  const result = spawnCommandSync("npx", args, {
    stdio: silent ? "pipe" : "inherit",
    encoding: silent ? "utf8" : undefined,
  });
  const code = result.status ?? 1;
  if (code !== 0) {
    const outputTail = silent
      ? tailOutput(`${result.stderr ?? ""}\n${result.stdout ?? ""}`)
      : undefined;
    if (!silent) {
      printSkillsInstallFailureHint(outputTail);
    }
    return { code, outputTail };
  }

  runMonorepoSyncIfPresent();
  return { code: 0 };
}

export function runSkillsUpdate(flags: Record<string, string | boolean> = {}): SkillsAddResult {
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
