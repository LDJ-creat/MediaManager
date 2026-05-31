import fs from "node:fs";
import path from "node:path";
import { getImageGenStatus, getWechatApiStatus } from "@dsmlll/media-manager-platform-common";
import { readGlobalConfig } from "@dsmlll/media-manager-core";
import { isMediaManagerSkillInstalled } from "./skills.js";
import { printLabelRow, printStep, ui } from "./ui.js";

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

function formatStatusList(items: { text: string; ok: boolean }[]): string {
  return items
    .map(({ text, ok }) => `${text} ${ok ? ui.green("✓") : ui.dim("—")}`)
    .join(`  ${ui.dim("·")}  `);
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
  printStep(
    ui.cyan("▸"),
    "当前配置摘要",
    workspace ? ui.dim("检测到已有 setup") : ui.dim("首次配置")
  );

  printLabelRow("工作区", workspace ? ui.blue(workspace) : ui.yellow("未配置"));

  if (workspace) {
    printLabelRow(
      "凭证",
      formatStatusList(authStatuses.map((s) => ({ text: s.label, ok: s.configured })))
    );

    const wechatApi = getWechatApiStatus(workspace);
    const imageGen = getImageGenStatus(workspace);
    printLabelRow(
      "API",
      formatStatusList([
        { text: "微信发布", ok: wechatApi.configured },
        { text: "图片生成", ok: imageGen.configured },
      ])
    );
  }

  printLabelRow("Skills", skillsInstalled ? ui.green("已安装") : ui.yellow("未安装"));
  console.log("");

  return { workspace, skillsInstalled, authStatuses };
}
