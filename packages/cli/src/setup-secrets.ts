import {
  buildImageGenSecretValues,
  getImageGenStatus,
  getWechatApiStatus,
  IMAGE_GEN_ENV,
  type ImageGenProvider,
  verifyWechatApiCredentials,
  WECHAT_API_ENV,
  WECHAT_APP_ID_KEY,
  WECHAT_APP_SECRET_KEY,
  writeImageGenExtendProvider,
  writeSecretsFile,
} from "@dsmlll/media-manager-platform-common";
import { promptLine, promptSecretLine } from "./prompt.js";
import { printStep, ui } from "./ui.js";

const WECHAT_API_DOCS_URL = "https://developers.weixin.qq.com/doc/subscription/guide/dev/api/";

const IMAGE_GEN_PROVIDERS: { key: ImageGenProvider; label: string; hint: string }[] = [
  { key: "google", label: "Google (Gemini)", hint: "GOOGLE_API_KEY 或 GEMINI_API_KEY" },
  { key: "dashscope", label: "DashScope (阿里云)", hint: "DASHSCOPE_API_KEY" },
  { key: "openai", label: "OpenAI", hint: "OPENAI_API_KEY" },
  { key: "openrouter", label: "OpenRouter", hint: "OPENROUTER_API_KEY" },
  { key: "replicate", label: "Replicate", hint: "REPLICATE_API_TOKEN" },
];

export function shouldSkipSecretsSetup(flags: Record<string, string | boolean>): boolean {
  return (
    flags["skip-secrets"] === true ||
    process.env.MEDIA_MANAGER_SKIP_SECRETS_SETUP === "1" ||
    !process.stdin.isTTY
  );
}

export async function promptWechatApiSetup(workspace: string): Promise<void> {
  const status = getWechatApiStatus(workspace);

  console.log("");
  printStep(
    ui.magenta("▸"),
    "微信公众号 API 密钥",
    "用于草稿箱发布（与上方浏览器登录凭证不同）"
  );
  console.log(`  ${ui.dim("浏览器登录")}  ${ui.blue(".media-manager/auth/wechat/")}  ${ui.dim("→ 运营数据")}`);
  console.log(`  ${ui.dim("API 密钥")}    ${ui.blue(".media-manager/secrets/wechat-api.env")}  ${ui.dim("→ 文章发布")}`);
  console.log("");
  console.log(`  ${ui.dim("获取 AppID / AppSecret、配置 IP 白名单：")}`);
  console.log(`  ${ui.blue(WECHAT_API_DOCS_URL)}`);
  console.log(`  ${ui.dim("若开启 IP 白名单，需将本机公网 IP 加入公众号后台白名单。")}`);
  console.log("");

  let yes: boolean;
  if (status.configured) {
    const answer = await promptLine(`  ${ui.bold("微信 API")} — 重新配置？${ui.dim("[y/N]")} `);
    yes = answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
    if (!yes) {
      console.log(`  ${ui.dim("保持")} 微信 API 配置`);
      return;
    }
  } else {
    const answer = await promptLine(`  ${ui.bold("微信 API")} — 现在配置？${ui.dim("[y/N]")} `);
    yes = answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
    if (!yes) {
      console.log(`  ${ui.dim("跳过")} 微信 API（可稍后运行 ${ui.blue("media wechat config api")}）`);
      return;
    }
  }

  const appId = await promptLine(`  ${ui.bold("AppID")} ${ui.dim("(WECHAT_APP_ID)")} `);
  if (!appId) {
    console.log(`  ${ui.yellow("⚠")} 未输入 AppID，跳过`);
    return;
  }
  const appSecret = await promptSecretLine(`  ${ui.bold("AppSecret")} ${ui.dim("(WECHAT_APP_SECRET)")} `);
  if (!appSecret) {
    console.log(`  ${ui.yellow("⚠")} 未输入 AppSecret，跳过`);
    return;
  }

  const savedPath = writeSecretsFile(workspace, WECHAT_API_ENV, {
    [WECHAT_APP_ID_KEY]: appId,
    [WECHAT_APP_SECRET_KEY]: appSecret,
  });
  console.log(`\n  ${ui.green("✓")} 已保存至 ${ui.blue(savedPath)}`);

  console.log(`  ${ui.dim("正在验证凭证…")}`);
  const verify = await verifyWechatApiCredentials(appId, appSecret);
  if (verify.ok) {
    console.log(`  ${ui.green("✓")} 微信 API 凭证验证通过\n`);
  } else {
    console.log(`  ${ui.yellow("⚠")} 验证未通过：${verify.message}`);
    console.log(`  ${ui.dim("凭证已保存，请修正后重试")} ${ui.blue("media wechat config api")}\n`);
  }
}

export async function promptImageGenSetup(workspace: string): Promise<void> {
  const status = getImageGenStatus(workspace);

  console.log("");
  printStep(ui.magenta("▸"), "图片生成 API 密钥", "用于文章配图（baoyu-image-gen）");
  console.log(`  ${ui.dim("密钥")}      ${ui.blue(".media-manager/secrets/image-gen.env")}`);
  console.log(`  ${ui.dim("偏好")}      ${ui.blue(".config/baoyu-image-gen/EXTEND.md")}`);
  console.log("");

  let yes: boolean;
  if (status.configured) {
    const answer = await promptLine(`  ${ui.bold("图片生成")} — 重新配置？${ui.dim("[y/N]")} `);
    yes = answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
    if (!yes) {
      console.log(`  ${ui.dim("保持")} 图片生成配置`);
      return;
    }
  } else {
    const answer = await promptLine(`  ${ui.bold("图片生成")} — 现在配置？${ui.dim("[y/N]")} `);
    yes = answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
    if (!yes) {
      console.log(`  ${ui.dim("跳过")} 图片生成（可稍后运行 ${ui.blue("media image-gen config")}）`);
      return;
    }
  }

  console.log(`\n  ${ui.dim("选择默认 Provider：")}`);
  IMAGE_GEN_PROVIDERS.forEach((p, i) => {
    console.log(`    ${ui.bold(String(i + 1))}. ${p.label}  ${ui.dim(`(${p.hint})`)}`);
  });

  const choice = await promptLine(`  ${ui.bold("Provider")} ${ui.dim("[1-5，默认 1]")} `);
  const index = choice ? Number.parseInt(choice, 10) - 1 : 0;
  const provider = IMAGE_GEN_PROVIDERS[index]?.key ?? "google";
  const providerMeta = IMAGE_GEN_PROVIDERS.find((p) => p.key === provider)!;

  const key = await promptSecretLine(`  ${ui.bold("API Key")} ${ui.dim(`(${providerMeta.hint})`)} `);
  if (!key) {
    console.log(`  ${ui.yellow("⚠")} 未输入 API Key，跳过`);
    return;
  }
  const values = buildImageGenSecretValues(provider, key);

  const envPath = writeSecretsFile(workspace, IMAGE_GEN_ENV, values);
  const extendPath = writeImageGenExtendProvider(workspace, provider);
  console.log(`\n  ${ui.green("✓")} API Key 已保存至 ${ui.blue(envPath)}`);
  console.log(`  ${ui.green("✓")} 默认 Provider 已写入 ${ui.blue(extendPath)} (${providerMeta.label})`);

  const updated = getImageGenStatus(workspace);
  if (updated.configured) {
    console.log(`  ${ui.green("✓")} 图片生成配置就绪\n`);
  } else {
    console.log(`  ${ui.yellow("⚠")} 配置不完整，缺少：${updated.missingKeys.join(", ")}\n`);
  }
}

export async function promptApiSecretsSetup(
  workspace: string,
  flags: Record<string, string | boolean>
): Promise<void> {
  if (shouldSkipSecretsSetup(flags)) return;
  await promptWechatApiSetup(workspace);
  await promptImageGenSetup(workspace);
}
