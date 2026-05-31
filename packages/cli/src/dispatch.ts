import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  IMAGE_GEN_ENV,
  loadWorkspaceSecrets,
  mergeSecretsIntoEnv,
  resolveSecretsDir,
  WECHAT_API_ENV,
  getImageGenStatus,
  getWechatApiStatus,
} from "@dsmlll/media-manager-platform-common";
import {
  ensureWorkspaceLayout,
  getDefaultWorkspacePath,
  isGuidanceLayoutReady,
  resolveWorkspace,
  setupWorkspace,
} from "@dsmlll/media-manager-core";
import {
  isMediaManagerSkillInstalled,
  printSkillsInstallFailureHint,
  runSkillsAdd,
  runSkillsUninstall,
  runSkillsUpdate,
} from "./skills.js";
import { resolveSkillScript } from "@dsmlll/media-manager-runtime";
import { printConfigShow } from "./config-commands.js";
import { promptLine } from "./prompt.js";
import { getConfiguredWorkspace, getPlatformAuthStatuses, printSetupStatusSummary } from "./setup-status.js";
import { promptApiSecretsSetup, promptImageGenSetup, promptWechatApiSetup } from "./setup-secrets.js";
import { runNewsSourcesEdit } from "./news-sources.js";
import { spawnCommand, spawnCommandSync } from "./spawn.js";
import { formatDoctorLine, printBanner, printStep, ui } from "./ui.js";

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

export function buildWorkspaceSpawnEnv(
  workspace: string,
  extraEnv: Record<string, string> = {},
  secretFiles: string[] = []
): Record<string, string> {
  const env: Record<string, string> = {
    ...process.env,
    MEDIA_WORKSPACE: workspace,
    MEDIA_SECRETS_DIR: resolveSecretsDir(workspace),
    ...extraEnv,
  };
  if (secretFiles.length > 0) {
    const secrets = loadWorkspaceSecrets(workspace, secretFiles);
    mergeSecretsIntoEnv(secrets, env);
  }
  return env;
}

export function spawnInWorkspace(
  workspace: string,
  command: string,
  args: string[],
  extraEnv: Record<string, string> = {},
  secretFiles: string[] = []
): number {
  const env = buildWorkspaceSpawnEnv(workspace, extraEnv, secretFiles);
  const result = spawnCommandSync(command, args, {
    cwd: workspace,
    env,
    stdio: "inherit",
  });
  return result.status ?? 1;
}

export function spawnTsxScript(
  workspace: string,
  skillName: string,
  scriptRelative: string,
  args: string[] = [],
  extraEnv: Record<string, string> = {},
  secretFiles: string[] = []
): number {
  const scriptPath = resolveSkillScript(skillName, scriptRelative);
  if (!fs.existsSync(scriptPath)) {
    console.error(`Script not found: ${scriptPath}`);
    return 1;
  }
  return spawnInWorkspace(workspace, "npx", ["tsx", scriptPath, ...args], extraEnv, secretFiles);
}

export function spawnBunScript(
  workspace: string,
  skillName: string,
  scriptRelative: string,
  args: string[] = [],
  extraEnv: Record<string, string> = {},
  secretFiles: string[] = []
): number {
  const scriptPath = resolveSkillScript(skillName, scriptRelative);
  if (!fs.existsSync(scriptPath)) {
    console.error(`Script not found: ${scriptPath}`);
    return 1;
  }
  const bun = process.platform === "win32" ? "bun.exe" : "bun";
  const hasBun = spawnSync(bun, ["--version"], { stdio: "ignore" }).status === 0;
  if (hasBun) {
    return spawnInWorkspace(workspace, bun, [scriptPath, ...args], extraEnv, secretFiles);
  }
  return spawnInWorkspace(workspace, "npx", ["-y", "bun", scriptPath, ...args], extraEnv, secretFiles);
}

export async function promptSetupInteractive(): Promise<string> {
  printBanner();
  const existing = getConfiguredWorkspace();
  printSetupStatusSummary();

  printStep(ui.cyan("▸"), "工作区", "存放文章、配图、日报、复盘报告和 guidance");

  if (existing) {
    console.log(`\n  ${ui.dim("当前路径")}\n  ${ui.blue(existing)}\n`);
    console.log(ui.dim("直接回车保持当前路径，或输入新路径后回车：\n"));
  } else {
    const defaultPath = getDefaultWorkspacePath();
    console.log(`\n  ${ui.dim("默认路径")}\n  ${ui.blue(defaultPath)}\n`);
    console.log(ui.dim("直接回车使用默认路径，或输入自定义路径后回车：\n"));
  }

  if (!process.stdin.isTTY) {
    const fallback = existing ?? getDefaultWorkspacePath();
    console.log(`${ui.dim("非交互环境，使用路径:")} ${fallback}`);
    return fallback;
  }

  const answer = await promptLine(`${ui.cyan(">")} `);
  if (answer) return answer;
  return existing ?? getDefaultWorkspacePath();
}

const PLATFORM_AUTH_SETUP = [
  { key: "wechat", label: "微信公众号", skill: "get-wechat-data" },
  { key: "csdn", label: "CSDN", skill: "csdn-publish-and-data" },
  { key: "juejin", label: "掘金", skill: "juejin-publish-and-data" },
  { key: "xhs", label: "小红书", skill: "xiaohongshu-publish-and-data" },
] as const;

export async function promptPlatformAuthSetup(workspace: string): Promise<void> {
  if (!process.stdin.isTTY || process.env.MEDIA_MANAGER_SKIP_AUTH_SETUP === "1") return;

  const statuses = getPlatformAuthStatuses(workspace);

  console.log("");
  printStep(ui.magenta("▸"), "平台登录凭证", "可选；跳过后仍可用 media <platform> auth export 配置");
  for (const s of statuses) {
    const mark = s.configured ? ui.green("✓ 已配置") : ui.dim("— 未配置");
    console.log(`  ${ui.bold(s.label)}  ${mark}`);
  }
  console.log(ui.dim("\n  已配置平台默认跳过；未配置平台询问是否立即配置\n"));

  for (const { key, label, skill } of PLATFORM_AUTH_SETUP) {
    const status = statuses.find((s) => s.key === key)!;
    let yes: boolean;
    if (status.configured) {
      const answer = await promptLine(`  ${ui.bold(label)} — 重新配置？${ui.dim("[y/N]")} `);
      yes = answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
      if (!yes) {
        console.log(`  ${ui.dim("保持")} ${label}`);
        continue;
      }
    } else {
      const answer = await promptLine(`  ${ui.bold(label)} — 现在配置？${ui.dim("[y/N]")} `);
      yes = answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
      if (!yes) {
        console.log(`  ${ui.dim("跳过")} ${label}`);
        continue;
      }
    }
    console.log(`\n  ${ui.cyan("→")} 正在打开浏览器，请完成 ${label} 登录…\n`);
    const code = spawnTsxScript(
      workspace,
      skill,
      "scripts/export-storage-state.ts",
      [],
      platformAuthEnv(workspace, key)
    );
    if (code === 0) {
      console.log(`  ${ui.green("✓")} ${label} 凭证已保存至 ${ui.blue(platformAuthEnv(workspace, key).MEDIA_AUTH_DIR!)}\n`);
    } else {
      console.log(`  ${ui.yellow("⚠")} ${label} 配置未完成，可稍后运行 ${ui.blue(AUTH_EXPORT_HINT[key])}\n`);
    }
  }
}

async function shouldInstallSkills(flags: Record<string, string | boolean>): Promise<boolean> {
  if (flags["skip-skills"] === true || process.env.MEDIA_MANAGER_SKIP_SKILLS === "1") return false;
  if (flags["force-skills"] === true) return true;
  if (!isMediaManagerSkillInstalled()) return true;
  if (!process.stdin.isTTY) return false;
  const answer = await promptLine(`  ${ui.dim("Skills 已安装")} — 是否更新？${ui.dim("[y/N]")} `);
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

export async function runSetup(flags: Record<string, string | boolean>): Promise<number> {
  const interactive = flags.interactive !== false && flags["skip-auth"] !== true;
  const workspacePath =
    typeof flags.workspace === "string"
      ? flags.workspace
      : interactive
        ? await promptSetupInteractive()
        : getDefaultWorkspacePath();

  const { paths } = setupWorkspace(workspacePath);

  console.log("");
  printStep(ui.green("✓"), "工作区已就绪", paths.workspace);
  console.log(`  ${ui.dim("全局配置")}  ~/.media-manager/config.json`);

  if (interactive && process.stdin.isTTY && flags["skip-auth"] !== true) {
    await promptPlatformAuthSetup(paths.workspace);
  }

  if (flags["skip-secrets"] !== true) {
    await promptApiSecretsSetup(paths.workspace, flags);
  }

  const installSkills = await shouldInstallSkills(flags);
  if (installSkills) {
    console.log("");
    printStep(ui.cyan("▸"), "正在安装 Skills", ui.dim("首次可能需要几分钟"));
    const skillResult = runSkillsAdd({ silent: true, target: typeof flags.target === "string" ? flags.target : "all" });
    if (skillResult.code === 0) {
      printStep(ui.green("✓"), "Skills 安装成功", "");
    } else {
      printSkillsInstallFailureHint(skillResult.outputTail);
    }
  } else if (
    isMediaManagerSkillInstalled() &&
    flags["skip-skills"] !== true &&
    process.env.MEDIA_MANAGER_SKIP_SKILLS !== "1"
  ) {
    console.log("");
    printStep(ui.dim("▸"), "Skills", ui.dim("已安装，跳过（可用 media skill update 更新）"));
  }

  console.log("");
  printStep(ui.cyan("▸"), "建议下一步");
  console.log(`  ${ui.blue("media doctor")}`);
  console.log("");
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

function commandOk(command: string, args: string[]): boolean {
  return spawnCommandSync(command, args, { stdio: "ignore" }).status === 0;
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

const PLATFORM_DOCTOR = [
  { key: "wechat", label: "WeChat", skill: "get-wechat-data" },
  { key: "csdn", label: "CSDN", skill: "csdn-publish-and-data" },
  { key: "juejin", label: "Juejin", skill: "juejin-publish-and-data" },
  { key: "xhs", label: "Xiaohongshu", skill: "xiaohongshu-publish-and-data" },
] as const;

function checkPlatformAuth(
  workspace: string,
  key: string,
  label: string,
  skill: string,
  check: (ok: boolean, msg: string, fatal?: boolean) => void
): void {
  const authDir = path.join(workspace, ".media-manager", "auth", key);
  for (const file of ["storageState.json", "cookies.json"] as const) {
    const p = path.join(authDir, file);
    if (fs.existsSync(p)) {
      check(true, `${label} auth (${p})`);
      return;
    }
  }
  try {
    const script = resolveSkillScript(skill, "scripts/export-storage-state.ts");
    const skillRoot = path.resolve(path.dirname(script), "..");
    const legacy = path.join(skillRoot, ".auth", "storageState.json");
    if (fs.existsSync(legacy)) {
      check(
        false,
        `${label} auth (legacy path ${legacy} — re-run ${AUTH_EXPORT_HINT[key]} to save under workspace)`
      );
      return;
    }
  } catch {
    /* runtime bundle missing */
  }
  check(false, `${label} auth (missing — run ${AUTH_EXPORT_HINT[key]})`);
}

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
  const env = buildWorkspaceSpawnEnv(workspace, extraEnv, []);
  return new Promise((resolve) => {
    const child = spawnCommand("npx", ["tsx", scriptPath, ...args], {
      cwd: workspace,
      env,
      stdio: "inherit",
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

export function runDoctor(): number {
  let code = 0;
  const check = (ok: boolean, msg: string, fatal = false) => {
    console.log(formatDoctorLine(ok, fatal, msg));
    if (!ok && fatal) code = 1;
  };

  console.log("");
  printStep(ui.cyan("▸"), "MediaManager 健康检查", "");
  console.log("");

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
    check(isGuidanceLayoutReady(paths.guidanceDir), "guidance/ layout");
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

  if (!isMediaManagerSkillInstalled()) {
    check(false, "Skills 未安装 — 运行 `media skill install` 或 `media setup`");
  } else {
    check(true, "Skills 已安装");
  }

  if (workspace) {
    for (const { key, label, skill } of PLATFORM_DOCTOR) {
      checkPlatformAuth(workspace, key, label, skill, check);
    }

    const wechatApi = getWechatApiStatus(workspace);
    check(
      wechatApi.configured,
      `WeChat API credentials (${wechatApi.path}${wechatApi.configured ? "" : " — run media setup or media wechat config api"})`
    );

    const imageGen = getImageGenStatus(workspace);
    check(
      imageGen.configured,
      `Image gen API key (${imageGen.envPath}${imageGen.configured ? "" : ` — missing ${imageGen.missingKeys.join(", ") || "keys"}; run media setup or media image-gen config`})`
    );
  }

  console.log("");
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
  const result = runSkillsAdd(flags);
  if (result.code === 0) {
    console.log(`\n${ui.green("✓")} Skills 安装成功`);
  }
  return result.code;
}

export function runSkillUpdate(flags: Record<string, string | boolean>): number {
  console.log(ui.cyan("正在从远程仓库更新 Skills…"));
  const result = runSkillsUpdate(flags);
  if (result.code === 0) {
    console.log(`\n${ui.green("✓")} Skills 更新成功`);
  }
  return result.code;
}

export function runSkillUninstall(flags: Record<string, string | boolean>): number {
  return runSkillsUninstall(flags);
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
  if (c0 === "doctor") return runDoctor();
  if (c0 === "config" && c1 === "show") {
    try {
      const ws = getWorkspace(flags);
      printConfigShow(ws, flags.json === true);
      return 0;
    } catch (err) {
      console.error(String(err));
      return 1;
    }
  }
  if (c0 === "skill" && c1 === "install") return runSkillInstall(flags);
  if (c0 === "skill" && c1 === "update") return runSkillUpdate(flags);
  if (c0 === "skill" && c1 === "uninstall") return runSkillUninstall(flags);

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
  if (c0 === "news" && c1 === "sources" && c2 === "edit") return runNewsSourcesEdit(workspace);

  if (c0 === "wechat" && c1 === "config" && c2 === "api") {
    if (!process.stdin.isTTY) {
      console.error("Usage: media wechat config api (requires interactive terminal)");
      return 1;
    }
    await promptWechatApiSetup(workspace);
    return 0;
  }
  if (c0 === "wechat" && c1 === "post") {
    return spawnBunScript(
      workspace,
      "post-to-wechat",
      "scripts/wechat-api.ts",
      positional,
      {},
      [WECHAT_API_ENV]
    );
  }
  if (c0 === "wechat" && c1 === "check-env") {
    return spawnBunScript(
      workspace,
      "post-to-wechat",
      "scripts/check-permissions.ts",
      positional,
      {},
      [WECHAT_API_ENV]
    );
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

  if (c0 === "image-gen" && c1 === "config") {
    if (!process.stdin.isTTY) {
      console.error("Usage: media image-gen config (requires interactive terminal)");
      return 1;
    }
    await promptImageGenSetup(workspace);
    return 0;
  }

  if (c0 === "image" && c1 === "gen") {
    const args = [...positional];
    if (typeof flags.prompt === "string") args.push("--prompt", flags.prompt);
    if (typeof flags.image === "string") args.push("--image", flags.image);
    return spawnBunScript(
      workspace,
      "baoyu-image-gen",
      "scripts/main.ts",
      args,
      {},
      [IMAGE_GEN_ENV]
    );
  }

  if (c0 === "analytics" && c1 === "fetch" && (c2 === "all" || flags.all)) {
    return runAnalyticsFetchAll(workspace, flags);
  }

  console.error(`Unknown command: ${command.join(" ")}`);
  printHelp();
  return 1;
}

function getCliVersion(): string {
  try {
    const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json");
    return (JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { version: string }).version;
  } catch {
    return "unknown";
  }
}

function printHelp() {
  console.log(`MediaManager CLI (media) v${getCliVersion()}

Setup:
  media setup [--interactive] [--workspace <path>] [--skip-auth] [--skip-secrets] [--skip-skills] [--force-skills]
  media workspace show|set <path>
  media doctor
  media config show [--json]
  media skill install [--target cursor|claude|codex|all]  (default: all)
  media skill update [--target cursor|claude|codex|all]  (default: all)
  media skill uninstall

News:
  media news fetch [--hours N] [--preview] [--skip-dedup]
  media news mark-seen [--date YYYY-MM-DD] [--status]
  media news sources edit          编辑工作区 RSS 源（首次自动复制默认配置）

Platforms:
  media wechat post ...
  media wechat check-env
  media wechat config api
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
  media image-gen config
  media analytics fetch --all [--platform wechat,csdn,juejin,xhs] [--date YYYY-MM-DD]

Global flags:
  --workspace <path>   Override workspace (else MEDIA_WORKSPACE or ~/.media-manager/config.json)
`);
}
