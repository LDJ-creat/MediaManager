import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import {
  ensureWorkspaceLayout,
  findMonorepoRoot,
  getDefaultWorkspacePath,
  readGlobalConfig,
  resolveWorkspace,
  setupWorkspace,
} from "@media-manager/core";
import { resolveSkillScript } from "@media-manager/runtime";

export interface ParsedArgs {
  command: string[];
  flags: Record<string, string | boolean>;
  positional: string[];
}

export function parseArgs(argv: string[]): ParsedArgs {
  const command: string[] = [];
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  let i = 0;
  while (i < argv.length) {
    const token = argv[i]!;
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        flags[key] = true;
        i += 1;
      } else {
        flags[key] = next;
        i += 2;
      }
      continue;
    }
    if (token.startsWith("-") && token.length === 2) {
      const key = token.slice(1);
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) {
        flags[key] = true;
        i += 1;
      } else {
        flags[key] = next;
        i += 2;
      }
      continue;
    }
    if (command.length < 3) command.push(token);
    else positional.push(token);
    i += 1;
  }
  return { command, flags, positional };
}

export function getWorkspace(flags: Record<string, string | boolean>): string {
  const explicit = typeof flags.workspace === "string" ? flags.workspace : undefined;
  return resolveWorkspace({ explicit });
}

export function spawnInWorkspace(
  workspace: string,
  command: string,
  args: string[],
  extraEnv: Record<string, string> = {}
): number {
  const env = {
    ...process.env,
    MEDIA_WORKSPACE: workspace,
    ...extraEnv,
  };
  const result = spawnSync(command, args, {
    cwd: workspace,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return result.status ?? 1;
}

export function spawnTsxScript(
  workspace: string,
  skillName: string,
  scriptRelative: string,
  args: string[] = [],
  extraEnv: Record<string, string> = {}
): number {
  const scriptPath = resolveSkillScript(skillName, scriptRelative);
  if (!fs.existsSync(scriptPath)) {
    console.error(`Script not found: ${scriptPath}`);
    return 1;
  }
  return spawnInWorkspace(workspace, "npx", ["tsx", scriptPath, ...args], extraEnv);
}

export function spawnBunScript(
  workspace: string,
  skillName: string,
  scriptRelative: string,
  args: string[] = [],
  extraEnv: Record<string, string> = {}
): number {
  const scriptPath = resolveSkillScript(skillName, scriptRelative);
  if (!fs.existsSync(scriptPath)) {
    console.error(`Script not found: ${scriptPath}`);
    return 1;
  }
  const bun = process.platform === "win32" ? "bun.exe" : "bun";
  const hasBun = spawnSync(bun, ["--version"], { stdio: "ignore" }).status === 0;
  if (hasBun) {
    return spawnInWorkspace(workspace, bun, [scriptPath, ...args], extraEnv);
  }
  return spawnInWorkspace(workspace, "npx", ["-y", "bun", scriptPath, ...args], extraEnv);
}

export async function promptSetupInteractive(): Promise<string> {
  const defaultPath = getDefaultWorkspacePath();
  console.log("\nMediaManager 工作区用于存放文章、配图、日报、复盘报告和 guidance。\n");
  console.log(`默认工作区路径：\n  ${defaultPath}\n`);
  console.log("直接回车使用默认路径，或输入自定义路径后回车：");

  if (!process.stdin.isTTY) {
    console.log(`\n非交互环境，使用默认路径: ${defaultPath}`);
    return defaultPath;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => {
    rl.question("> ", (value) => {
      rl.close();
      resolve(value.trim());
    });
  });
  return answer || defaultPath;
}

export async function runSetup(flags: Record<string, string | boolean>): Promise<number> {
  const workspacePath =
    typeof flags.workspace === "string"
      ? flags.workspace
      : flags.interactive
        ? await promptSetupInteractive()
        : getDefaultWorkspacePath();

  const { paths } = setupWorkspace(workspacePath);
  console.log(`\n工作区已初始化: ${paths.workspace}`);
  console.log(`全局配置: ~/.media-manager/config.json`);
  console.log("\n建议下一步:");
  console.log("  npx skills add LDJ-creat/MediaManager --skill media-manager -g -y");
  console.log("  media doctor");
  return 0;
}

export function runWorkspaceShow(flags: Record<string, string | boolean>): number {
  try {
    const ws = getWorkspace(flags);
    const paths = ensureWorkspaceLayout(ws);
    console.log(JSON.stringify({ workspace: ws, paths }, null, 2));
    return 0;
  } catch (err) {
    console.error(String(err));
    return 1;
  }
}

export function runWorkspaceSet(flags: Record<string, string | boolean>, positional: string[]): number {
  const target = typeof flags.workspace === "string" ? flags.workspace : positional[0];
  if (!target) {
    console.error("Usage: media workspace set <path>");
    return 1;
  }
  setupWorkspace(target);
  console.log(`Workspace set to ${path.resolve(target)}`);
  return 0;
}

export function runInit(flags: Record<string, string | boolean>, positional: string[]): number {
  const target = typeof flags.workspace === "string" ? flags.workspace : positional[0];
  if (target) {
    setupWorkspace(target);
  } else {
    const global = readGlobalConfig();
    if (!global) {
      console.error("No workspace configured. Run `media setup --interactive`.");
      return 1;
    }
    ensureWorkspaceLayout(global.workspace);
  }

  if (flags["with-cursor"]) {
    const ws = target ? path.resolve(target) : readGlobalConfig()!.workspace;
    writeCursorCommands(ws);
    console.log(`Cursor commands written to ${path.join(ws, ".cursor", "commands")}`);
  }
  return 0;
}

function writeCursorCommands(workspace: string) {
  const commandsDir = path.join(workspace, ".cursor", "commands");
  fs.mkdirSync(commandsDir, { recursive: true });
  const repoRoot = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..", "..");
  const workflowDir = path.join(repoRoot, "skills", "media-manager", "references", "workflows");
  for (const name of ["daily-digest.md", "write-and-publish.md", "analyze-operation.md"]) {
    const src = path.join(workflowDir, name);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(commandsDir, name));
    }
  }
}

function commandOk(command: string, args: string[]): boolean {
  return spawnSync(command, args, { stdio: "ignore", shell: true }).status === 0;
}

function platformAuthEnv(workspace: string, platformKey: string): Record<string, string> {
  return {
    MEDIA_AUTH_DIR: path.join(workspace, ".media-manager", "auth", platformKey),
  };
}

const AUTH_EXPORT_HINT: Record<string, string> = {
  wechat: "media wechat auth export",
  csdn: "media csdn auth export",
  juejin: "media juejin auth export",
  xhs: "media xhs auth export",
};

function spawnTsxScriptAsync(
  workspace: string,
  skillName: string,
  scriptRelative: string,
  args: string[] = [],
  extraEnv: Record<string, string> = {}
): Promise<number> {
  const scriptPath = resolveSkillScript(skillName, scriptRelative);
  if (!fs.existsSync(scriptPath)) {
    console.error(`Script not found: ${scriptPath}`);
    return Promise.resolve(1);
  }
  const env = {
    ...process.env,
    MEDIA_WORKSPACE: workspace,
    ...extraEnv,
  };
  return new Promise((resolve) => {
    const child = spawn("npx", ["tsx", scriptPath, ...args], {
      cwd: workspace,
      env,
      stdio: "inherit",
      shell: true,
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

export function runDoctor(): number {
  let code = 0;
  const check = (ok: boolean, msg: string, fatal = false) => {
    console.log(`${ok ? "✓" : fatal ? "✗" : "⚠"} ${msg}`);
    if (!ok && fatal) code = 1;
  };

  const nodeOk = process.version.localeCompare("v20", undefined, { numeric: true }) >= 0;
  check(nodeOk, `Node ${process.version}`, !nodeOk);

  let workspace: string | null = null;
  try {
    workspace = resolveWorkspace({});
    check(fs.existsSync(workspace), `Workspace: ${workspace}`);
    try {
      fs.accessSync(workspace, fs.constants.W_OK);
      check(true, "Workspace writable");
    } catch {
      check(false, "Workspace not writable", true);
    }

    const paths = ensureWorkspaceLayout(workspace);
    check(fs.existsSync(paths.outputDir), "output/ skeleton");
    check(fs.existsSync(paths.guidanceDir), "guidance/ skeleton");
    check(fs.existsSync(paths.newsDataDir), ".media-manager/data/news/ skeleton");
  } catch {
    check(false, "Workspace not configured — run `media setup`", true);
  }

  check(commandOk("npx", ["--version"]), "npx available");
  check(
    commandOk("bun", ["--version"]) || commandOk("npx", ["-y", "bun", "--version"]),
    "Bun available (wechat/image-gen)"
  );
  check(
    commandOk("npx", ["playwright", "--version"]),
    "Playwright CLI available — run `npx playwright install chromium` if platform scripts fail"
  );

  try {
    resolveSkillScript("news-skill", "scripts/fetch-rss.ts");
    check(true, "Runtime skills bundle/resolution OK");
  } catch {
    check(false, "Runtime skills not found — run npm run build in repo");
  }

  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  const skillPaths = [
    path.join(home, ".cursor", "skills", "media-manager", "SKILL.md"),
    path.join(home, ".claude", "skills", "media-manager", "SKILL.md"),
  ];
  if (!skillPaths.some((p) => fs.existsSync(p))) {
    check(false, "media-manager skill not installed globally — run `media skill install --minimal`");
  } else {
    check(true, "media-manager skill installed");
  }

  if (workspace) {
    for (const [key, label] of [
      ["wechat", "WeChat"],
      ["csdn", "CSDN"],
      ["juejin", "Juejin"],
      ["xhs", "Xiaohongshu"],
    ] as const) {
      const authDir = path.join(workspace, ".media-manager", "auth", key);
      const hasAuth =
        fs.existsSync(path.join(authDir, "storageState.json")) ||
        fs.existsSync(path.join(authDir, "cookies.json"));
      check(
        hasAuth,
        `${label} auth (${hasAuth ? authDir : `missing — run ${AUTH_EXPORT_HINT[key]}`})`
      );
    }
  }

  return code;
}

export function runNewsFetch(workspace: string, flags: Record<string, string | boolean>): number {
  const args: string[] = ["--data-dir", path.join(workspace, ".media-manager", "data", "news")];
  if (typeof flags.hours === "string") args.push("--hours", flags.hours);
  if (flags.preview) args.push("--preview");
  if (flags["skip-dedup"]) args.push("--skip-dedup");
  return spawnTsxScript(workspace, "news-skill", "scripts/fetch-rss.ts", args);
}

export function runNewsMarkSeen(workspace: string, flags: Record<string, string | boolean>): number {
  const args: string[] = ["--data-dir", path.join(workspace, ".media-manager", "data", "news")];
  if (typeof flags.date === "string") args.push("--date", flags.date);
  if (flags.status) args.push("--status");
  return spawnTsxScript(workspace, "news-skill", "scripts/mark-seen.ts", args);
}

export function runPlatformPost(
  workspace: string,
  skill: string,
  platformKey: string,
  script: string,
  flags: Record<string, string | boolean>,
  positional: string[]
): number {
  const args: string[] = [];
  const file = typeof flags.file === "string" ? flags.file : positional[0];
  if (file) args.push("--file", file);
  if (flags.draft) args.push("--draft");
  if (typeof flags.state === "string") args.push("--state", flags.state);
  if (typeof flags.output === "string") args.push("--output", flags.output);
  return spawnTsxScript(workspace, skill, script, args, {
    MEDIA_ANALYTICS_DIR: path.join(workspace, ".media-manager", "data", "analytics", platformKey),
    ...platformAuthEnv(workspace, platformKey),
  });
}

export function runAnalyticsFetch(
  workspace: string,
  skill: string,
  platformKey: string,
  flags: Record<string, string | boolean>
): number {
  const outDir = path.join(workspace, ".media-manager", "data", "analytics", platformKey);
  fs.mkdirSync(outDir, { recursive: true });
  const args = ["--output", typeof flags.output === "string" ? flags.output : outDir];
  if (typeof flags.state === "string") args.push("--state", flags.state);
  return spawnTsxScript(workspace, skill, "scripts/fetch-analytics.ts", args, {
    MEDIA_ANALYTICS_DIR: outDir,
    MEDIA_AUTH_DIR: path.join(workspace, ".media-manager", "auth", platformKey),
  });
}

export async function runAnalyticsFetchAll(
  workspace: string,
  flags: Record<string, string | boolean>
): Promise<number> {
  const platforms =
    typeof flags.platform === "string"
      ? flags.platform.split(",")
      : ["wechat", "csdn", "juejin", "xhs"];
  const mapping: Record<string, { skill: string; key: string }> = {
    wechat: { skill: "get-wechat-data", key: "wechat" },
    csdn: { skill: "csdn-publish-and-data", key: "csdn" },
    juejin: { skill: "juejin-publish-and-data", key: "juejin" },
    xhs: { skill: "xiaohongshu-publish-and-data", key: "xhs" },
  };

  const date =
    typeof flags.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(flags.date)
      ? flags.date
      : new Date().toISOString().slice(0, 10);
  const analysisDir = path.join(workspace, "output", "analysis", date);
  fs.mkdirSync(analysisDir, { recursive: true });

  const tasks = platforms
    .map((p) => p.trim())
    .filter((p) => mapping[p])
    .map(async (p) => {
      const entry = mapping[p]!;
      console.log(`\n--- Fetching ${p} ---`);
      const outDir = path.join(workspace, ".media-manager", "data", "analytics", entry.key);
      fs.mkdirSync(outDir, { recursive: true });
      const args = ["--output", typeof flags.output === "string" ? flags.output : outDir];
      if (typeof flags.state === "string") args.push("--state", flags.state);
      const status = await spawnTsxScriptAsync(workspace, entry.skill, "scripts/fetch-analytics.ts", args, {
        MEDIA_ANALYTICS_DIR: outDir,
        MEDIA_AUTH_DIR: path.join(workspace, ".media-manager", "auth", entry.key),
      });
      return { platform: p, key: entry.key, outDir, status };
    });

  const results = await Promise.all(tasks);
  const manifest = {
    generatedAt: new Date().toISOString(),
    workspace,
    analysisDir,
    platforms: results.map((r) => ({
      platform: r.platform,
      analyticsDir: r.outDir,
      exitCode: r.status,
    })),
  };
  fs.writeFileSync(path.join(analysisDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  const code = results.some((r) => r.status !== 0) ? 1 : 0;
  console.log(`\nAnalytics manifest: ${path.join(analysisDir, "manifest.json")}`);
  console.log(`Per-platform data: $WORKSPACE/.media-manager/data/analytics/{platform}/`);
  return code;
}

export function runSkillInstall(flags: Record<string, string | boolean>): number {
  const minimal = flags.minimal === true;
  const target = typeof flags.target === "string" ? flags.target : "all";
  const agents =
    target === "cursor"
      ? ["cursor"]
      : target === "claude"
        ? ["claude-code"]
        : ["cursor", "claude-code"];

  const args = [
    "skills",
    "add",
    "LDJ-creat/MediaManager",
    "--skill",
    minimal ? "media-manager" : "*",
    "-g",
    "-y",
    ...agents.flatMap((a) => ["-a", a]),
  ];
  if (!minimal) args.push("--all");

  const status = spawnSync("npx", args, { stdio: "inherit", shell: true }).status ?? 1;
  if (status !== 0) return status;

  if (!minimal) {
    const repoRoot = findMonorepoRoot(path.dirname(fileURLToPath(import.meta.url)));
    const syncScript = repoRoot
      ? path.join(repoRoot, process.platform === "win32" ? "sync-skills.ps1" : "sync-skills.sh")
      : null;
    if (syncScript && fs.existsSync(syncScript)) {
      if (process.platform === "win32") {
        spawnSync("powershell", ["-ExecutionPolicy", "Bypass", "-File", syncScript], { stdio: "inherit" });
      } else {
        spawnSync("bash", [syncScript], { stdio: "inherit" });
      }
    }
  }
  return 0;
}

export async function dispatch(argv: string[]): Promise<number> {
  const { command, flags, positional } = parseArgs(argv);
  const [c0, c1, c2] = command;

  if (!c0 || c0 === "help" || flags.help) {
    printHelp();
    return 0;
  }

  if (c0 === "setup") return runSetup({ ...flags, interactive: flags.interactive ?? true });
  if (c0 === "workspace" && c1 === "show") return runWorkspaceShow(flags);
  if (c0 === "workspace" && c1 === "set") return runWorkspaceSet(flags, positional);
  if (c0 === "init") return runInit(flags, positional);
  if (c0 === "doctor") return runDoctor();
  if (c0 === "skill" && c1 === "install") return runSkillInstall(flags);

  let workspace: string;
  try {
    workspace = getWorkspace(flags);
    process.env.MEDIA_WORKSPACE = workspace;
  } catch {
    if (process.stdin.isTTY && !process.env.MEDIA_MANAGER_SKIP_SETUP) {
      await runSetup({ interactive: true });
      workspace = getWorkspace(flags);
      process.env.MEDIA_WORKSPACE = workspace;
    } else {
      console.error("Workspace not configured. Run `media setup`.");
      return 1;
    }
  }

  if (c0 === "news" && c1 === "fetch") return runNewsFetch(workspace, flags);
  if (c0 === "news" && c1 === "mark-seen") return runNewsMarkSeen(workspace, flags);

  if (c0 === "wechat" && c1 === "post") {
    return spawnBunScript(workspace, "post-to-wechat", "scripts/wechat-api.ts", positional);
  }
  if (c0 === "wechat" && c1 === "check-env") {
    return spawnBunScript(workspace, "post-to-wechat", "scripts/check-permissions.ts", positional);
  }
  if (c0 === "wechat" && c1 === "analytics" && c2 === "fetch") {
    return runAnalyticsFetch(workspace, "get-wechat-data", "wechat", flags);
  }
  if (c0 === "wechat" && c1 === "auth" && c2 === "export") {
    return spawnTsxScript(workspace, "get-wechat-data", "scripts/export-storage-state.ts", positional, platformAuthEnv(workspace, "wechat"));
  }
  if (c0 === "wechat" && c1 === "auth" && c2 === "check") {
    return spawnTsxScript(workspace, "get-wechat-data", "scripts/check-login.ts", positional, platformAuthEnv(workspace, "wechat"));
  }

  if (c0 === "csdn" && c1 === "post") {
    return runPlatformPost(workspace, "csdn-publish-and-data", "csdn", "scripts/post-article.ts", flags, positional);
  }
  if (c0 === "csdn" && c1 === "analytics" && c2 === "fetch") {
    return runAnalyticsFetch(workspace, "csdn-publish-and-data", "csdn", flags);
  }
  if (c0 === "csdn" && c1 === "auth" && c2 === "export") {
    return spawnTsxScript(workspace, "csdn-publish-and-data", "scripts/export-storage-state.ts", positional, platformAuthEnv(workspace, "csdn"));
  }
  if (c0 === "csdn" && c1 === "auth" && c2 === "check") {
    return spawnTsxScript(workspace, "csdn-publish-and-data", "scripts/check-login.ts", positional, platformAuthEnv(workspace, "csdn"));
  }

  if (c0 === "juejin" && c1 === "post") {
    return runPlatformPost(workspace, "juejin-publish-and-data", "juejin", "scripts/post-article.ts", flags, positional);
  }
  if (c0 === "juejin" && c1 === "analytics" && c2 === "fetch") {
    return runAnalyticsFetch(workspace, "juejin-publish-and-data", "juejin", flags);
  }
  if (c0 === "juejin" && c1 === "auth" && c2 === "export") {
    return spawnTsxScript(workspace, "juejin-publish-and-data", "scripts/export-storage-state.ts", positional, platformAuthEnv(workspace, "juejin"));
  }
  if (c0 === "juejin" && c1 === "auth" && c2 === "check") {
    return spawnTsxScript(workspace, "juejin-publish-and-data", "scripts/check-login.ts", positional, platformAuthEnv(workspace, "juejin"));
  }

  if (c0 === "xhs" && c1 === "post-note") {
    return runPlatformPost(workspace, "xiaohongshu-publish-and-data", "xhs", "scripts/post-note.ts", flags, positional);
  }
  if (c0 === "xhs" && c1 === "analytics" && c2 === "fetch") {
    return runAnalyticsFetch(workspace, "xiaohongshu-publish-and-data", "xhs", flags);
  }
  if (c0 === "xhs" && c1 === "auth" && c2 === "export") {
    return spawnTsxScript(workspace, "xiaohongshu-publish-and-data", "scripts/export-storage-state.ts", positional, platformAuthEnv(workspace, "xhs"));
  }
  if (c0 === "xhs" && c1 === "auth" && c2 === "check") {
    return spawnTsxScript(workspace, "xiaohongshu-publish-and-data", "scripts/check-login.ts", positional, platformAuthEnv(workspace, "xhs"));
  }

  if (c0 === "image" && c1 === "gen") {
    const args = [...positional];
    if (typeof flags.prompt === "string") args.push("--prompt", flags.prompt);
    if (typeof flags.image === "string") args.push("--image", flags.image);
    return spawnBunScript(workspace, "baoyu-image-gen", "scripts/main.ts", args);
  }

  if (c0 === "analytics" && c1 === "fetch" && (c2 === "all" || flags.all)) {
    return runAnalyticsFetchAll(workspace, flags);
  }

  console.error(`Unknown command: ${command.join(" ")}`);
  printHelp();
  return 1;
}

function printHelp() {
  console.log(`MediaManager CLI (media) v0.1.0

Setup:
  media setup [--interactive] [--workspace <path>]
  media workspace show|set <path>
  media init [path] [--with-cursor]
  media doctor
  media skill install [--minimal] [--target cursor|claude|all]

News:
  media news fetch [--hours N] [--preview] [--skip-dedup]
  media news mark-seen [--date YYYY-MM-DD] [--status]

Platforms:
  media wechat post ...
  media wechat check-env
  media wechat analytics fetch
  media wechat auth export|check
  media csdn post --file <path> [--draft]
  media csdn analytics fetch
  media csdn auth export|check
  media juejin post --file <path> [--draft]
  media juejin analytics fetch
  media juejin auth export|check
  media xhs post-note --file <path> ...
  media xhs analytics fetch
  media xhs auth export|check
  media image gen --prompt "..." --image out.png
  media analytics fetch --all [--platform wechat,csdn,juejin,xhs] [--date YYYY-MM-DD]

Global flags:
  --workspace <path>   Override workspace (else MEDIA_WORKSPACE or ~/.media-manager/config.json)
`);
}
