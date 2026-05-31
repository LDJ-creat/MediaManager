import fs from "node:fs";
import path from "node:path";
import { readGlobalConfig } from "@dsmlll/media-manager-core";
import { isMediaManagerSkillInstalled } from "./skills.js";
import { printStep, ui } from "./ui.js";

export const SETUP_PLATFORMS = [
  { key: "wechat", label: "微信公众号" },
  { key: "csdn", label: "CSDN" },
  { key: "juejin", label: "掘金" },
  { key: "xhs", label: "小红书" },
] as const;

export interface PlatformAuthStatus {
  key: string;
  label: string;
  configured: boolean;
  authPath: string;
}

export function getConfiguredWorkspace(): string | null {
  const global = readGlobalConfig();
  if (!global?.workspace) return null;
  const resolved = path.resolve(global.workspace);
  return fs.existsSync(resolved) ? resolved : global.workspace;
}

export function getPlatformAuthStatuses(workspace: string): PlatformAuthStatus[] {
  return SETUP_PLATFORMS.map(({ key, label }) => {
    const authPath = path.join(workspace, ".media-manager", "auth", key);
    const configured = ["storageState.json", "cookies.json"].some((file) =>
      fs.existsSync(path.join(authPath, file))
    );
    return { key, label, configured, authPath };
  });
}

export function printSetupStatusSummary(): {
  workspace: string | null;
  skillsInstalled: boolean;
  authStatuses: PlatformAuthStatus[];
} {
  const workspace = getConfiguredWorkspace();
  const skillsInstalled = isMediaManagerSkillInstalled();
  const authStatuses = workspace ? getPlatformAuthStatuses(workspace) : [];

  console.log("");
  printStep(ui.cyan("▸"), "当前配置摘要", workspace ? ui.dim("检测到已有 setup") : ui.dim("首次配置"));

  if (workspace) {
    console.log(`  ${ui.dim("工作区")}  ${ui.blue(workspace)}`);
  } else {
    console.log(`  ${ui.dim("工作区")}  ${ui.yellow("未配置")}`);
  }

  if (workspace) {
    const authLine = authStatuses
      .map((s) => `${s.label} ${s.configured ? ui.green("✓") : ui.dim("—")}`)
      .join("  ");
    console.log(`  ${ui.dim("凭证")}    ${authLine}`);
  }

  console.log(
    `  ${ui.dim("Skills")}  ${skillsInstalled ? ui.green("已安装") : ui.yellow("未安装")}`
  );
  console.log("");

  return { workspace, skillsInstalled, authStatuses };
}
