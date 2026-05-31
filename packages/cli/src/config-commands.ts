import {
  getImageGenStatus,
  getWechatApiStatus,
} from "@dsmlll/media-manager-platform-common";
import { getPlatformAuthStatuses } from "./setup-status.js";
import { ui } from "./ui.js";

export interface ConfigShowResult {
  workspace: string;
  auth: Record<string, boolean>;
  api: {
    wechatPublish: { configured: boolean; path: string };
    imageGen: {
      configured: boolean;
      provider: string | null;
      envPath: string;
      extendPath: string | null;
      missingKeys: string[];
    };
  };
}

export function buildConfigShowResult(workspace: string): ConfigShowResult {
  const authStatuses = getPlatformAuthStatuses(workspace);
  const wechatApi = getWechatApiStatus(workspace);
  const imageGen = getImageGenStatus(workspace);

  const auth: Record<string, boolean> = {};
  for (const s of authStatuses) {
    auth[s.key] = s.configured;
  }

  return {
    workspace,
    auth,
    api: {
      wechatPublish: {
        configured: wechatApi.configured,
        path: wechatApi.path,
      },
      imageGen: {
        configured: imageGen.configured,
        provider: imageGen.provider,
        envPath: imageGen.envPath,
        extendPath: imageGen.extendPath,
        missingKeys: imageGen.missingKeys,
      },
    },
  };
}

export function printConfigShow(workspace: string, asJson: boolean): void {
  const result = buildConfigShowResult(workspace);
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log("");
  console.log(`${ui.bold("工作区")}  ${ui.blue(result.workspace)}`);
  console.log("");
  console.log(ui.bold("浏览器登录凭证"));
  for (const [key, configured] of Object.entries(result.auth)) {
    console.log(`  ${key.padEnd(8)} ${configured ? ui.green("✓ 已配置") : ui.dim("— 未配置")}`);
  }
  console.log("");
  console.log(ui.bold("API 密钥"));
  const wp = result.api.wechatPublish;
  console.log(
    `  微信发布   ${wp.configured ? ui.green("✓ 已配置") : ui.dim("— 未配置")}  ${ui.dim(wp.path)}`
  );
  const ig = result.api.imageGen;
  const igLabel = ig.provider ? ` (${ig.provider})` : "";
  console.log(
    `  图片生成   ${ig.configured ? ui.green("✓ 已配置") : ui.dim("— 未配置")}${igLabel}  ${ui.dim(ig.envPath)}`
  );
  if (!ig.configured && ig.missingKeys.length > 0) {
    console.log(`  ${ui.dim("缺少")}     ${ig.missingKeys.join(", ")}`);
  }
  console.log("");
}
