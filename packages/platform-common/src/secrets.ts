import fs from "node:fs";
import path from "node:path";
import { loadEnvFile, serializeEnvFile } from "./env-file.js";

function resolveWorkspaceFromEnv(): string | null {
  const value = process.env.MEDIA_WORKSPACE?.trim();
  return value ? path.resolve(value) : null;
}

export const WECHAT_API_ENV = "wechat-api.env";
export const IMAGE_GEN_ENV = "image-gen.env";

export const WECHAT_APP_ID_KEY = "WECHAT_APP_ID";
export const WECHAT_APP_SECRET_KEY = "WECHAT_APP_SECRET";

export type ImageGenProvider = "google" | "openai" | "openrouter" | "dashscope" | "replicate" | "atlascloud";

export const IMAGE_GEN_PROVIDER_KEYS: Record<ImageGenProvider, string[]> = {
  google: ["GOOGLE_API_KEY", "GEMINI_API_KEY"],
  openai: ["OPENAI_API_KEY"],
  openrouter: ["OPENROUTER_API_KEY"],
  dashscope: ["DASHSCOPE_API_KEY"],
  replicate: ["REPLICATE_API_TOKEN"],
  atlascloud: ["ATLASCLOUD_API_KEY"],
};

/** Built-in defaults aligned with baoyu-image-gen provider modules. */
export const IMAGE_GEN_DEFAULT_MODELS: Record<ImageGenProvider, string> = {
  google: "gemini-3-pro-image-preview",
  openai: "gpt-image-1.5",
  openrouter: "google/gemini-3.1-flash-image-preview",
  dashscope: "qwen-image-2.0-pro",
  replicate: "google/nano-banana-pro",
  atlascloud: "google/nano-banana-2/text-to-image",
};

export const IMAGE_GEN_MODEL_ENV_KEYS: Record<ImageGenProvider, string> = {
  google: "GOOGLE_IMAGE_MODEL",
  openai: "OPENAI_IMAGE_MODEL",
  openrouter: "OPENROUTER_IMAGE_MODEL",
  dashscope: "DASHSCOPE_IMAGE_MODEL",
  replicate: "REPLICATE_IMAGE_MODEL",
  atlascloud: "ATLASCLOUD_IMAGE_MODEL",
};

export function getImageGenDefaultModel(
  provider: ImageGenProvider,
  env: Record<string, string | undefined> = {}
): string {
  const envKey = IMAGE_GEN_MODEL_ENV_KEYS[provider];
  const fromFile = env[envKey]?.trim();
  const fromProcess = process.env[envKey]?.trim();
  return fromFile || fromProcess || IMAGE_GEN_DEFAULT_MODELS[provider];
}

export interface WechatApiStatus {
  configured: boolean;
  path: string;
}

export interface ImageGenStatus {
  configured: boolean;
  provider: ImageGenProvider | null;
  missingKeys: string[];
  envPath: string;
  extendPath: string | null;
}

export function resolveSecretsDir(workspace?: string | null): string {
  const fromEnv = process.env.MEDIA_SECRETS_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);

  const ws = workspace ?? resolveWorkspaceFromEnv();
  if (ws) {
    return path.join(path.resolve(ws), ".media-manager", "secrets");
  }

  throw new Error(
    "Secrets directory requires MEDIA_WORKSPACE or MEDIA_SECRETS_DIR to be set."
  );
}

export function resolveWorkspaceSecretsDirFromEnv(): string | null {
  try {
    return resolveSecretsDir();
  } catch {
    return null;
  }
}

export function ensureSecretsDir(secretsDir: string): void {
  fs.mkdirSync(secretsDir, { recursive: true, mode: 0o700 });
  if (process.platform !== "win32") {
    try {
      fs.chmodSync(secretsDir, 0o700);
    } catch {
      /* best effort */
    }
  }
}

export function loadWorkspaceSecretFile(fileName: string): Record<string, string> {
  const secretsDir = resolveWorkspaceSecretsDirFromEnv();
  if (!secretsDir) return {};
  return loadEnvFile(path.join(secretsDir, fileName));
}

export { loadEnvFile, mergeEnvRecords } from "./env-file.js";

export function loadWorkspaceSecrets(
  workspace: string,
  fileNames?: string[]
): Record<string, string> {
  const secretsDir = resolveSecretsDir(workspace);
  if (!fs.existsSync(secretsDir)) return {};
  if (fileNames && fileNames.length === 0) return {};

  const allowAll = !fileNames;
  const allowed = allowAll ? null : new Set(fileNames);

  const merged: Record<string, string> = {};
  const files = fs
    .readdirSync(secretsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".env"))
    .map((entry) => entry.name)
    .filter((name) => allowAll || allowed!.has(name))
    .sort();

  for (const file of files) {
    Object.assign(merged, loadEnvFile(path.join(secretsDir, file)));
  }
  return merged;
}

export function mergeSecretsIntoEnv(
  secrets: Record<string, string>,
  target: Record<string, string | undefined> = process.env
): void {
  for (const [key, value] of Object.entries(secrets)) {
    if (!target[key]) target[key] = value;
  }
}

export function writeSecretsFile(
  workspace: string,
  fileName: string,
  values: Record<string, string>
): string {
  const secretsDir = resolveSecretsDir(workspace);
  ensureSecretsDir(secretsDir);
  const filePath = path.join(secretsDir, fileName);

  const existing = loadEnvFile(filePath);
  const merged = { ...existing, ...values };

  fs.writeFileSync(filePath, serializeEnvFile(merged), { encoding: "utf8", mode: 0o600 });

  if (process.platform !== "win32") {
    try {
      fs.chmodSync(filePath, 0o600);
    } catch {
      /* best effort */
    }
  }

  return filePath;
}

export function buildImageGenSecretValues(
  provider: ImageGenProvider,
  apiKey: string
): Record<string, string> {
  if (provider === "google") {
    return {
      GOOGLE_API_KEY: apiKey,
      GEMINI_API_KEY: apiKey,
    };
  }
  const envKey = IMAGE_GEN_PROVIDER_KEYS[provider][0]!;
  return { [envKey]: apiKey };
}

export function getWechatApiEnvPath(workspace: string): string {
  return path.join(resolveSecretsDir(workspace), WECHAT_API_ENV);
}

export function getWechatApiStatus(workspace: string): WechatApiStatus {
  const envPath = getWechatApiEnvPath(workspace);
  const fromFile = loadEnvFile(envPath);
  const appId = process.env[WECHAT_APP_ID_KEY] || fromFile[WECHAT_APP_ID_KEY];
  const appSecret = process.env[WECHAT_APP_SECRET_KEY] || fromFile[WECHAT_APP_SECRET_KEY];
  return {
    configured: !!(appId?.trim() && appSecret?.trim()),
    path: envPath,
  };
}

export function resolveImageGenExtendPath(workspace: string): string {
  return path.join(workspace, ".config", "baoyu-image-gen", "EXTEND.md");
}

export function parseExtendDefaultProvider(content: string): ImageGenProvider | null {
  const yamlMatch = content.match(/^---\s*\n([\s\S]*?)\n---/m);
  const body = yamlMatch ? yamlMatch[1]! : content;
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^default_provider:\s*(.+)$/i);
    if (!match) continue;
    const raw = match[1]!.trim().replace(/['"]/g, "");
    if (!raw || raw === "null") return null;
    if (raw in IMAGE_GEN_PROVIDER_KEYS) return raw as ImageGenProvider;
  }
  return null;
}

export function getImageGenEnvPath(workspace: string): string {
  return path.join(resolveSecretsDir(workspace), IMAGE_GEN_ENV);
}

export function providerHasRequiredKeys(
  provider: ImageGenProvider,
  env: Record<string, string>
): { ok: boolean; missingKeys: string[] } {
  const keys = IMAGE_GEN_PROVIDER_KEYS[provider];
  if (provider === "google") {
    const hasKey = keys.some((key) => !!env[key]?.trim());
    return hasKey ? { ok: true, missingKeys: [] } : { ok: false, missingKeys: keys };
  }
  const missing = keys.filter((key) => !env[key]?.trim());
  return missing.length === 0 ? { ok: true, missingKeys: [] } : { ok: false, missingKeys: missing };
}

export function getImageGenStatus(workspace: string): ImageGenStatus {
  const envPath = getImageGenEnvPath(workspace);
  const fromFile = loadEnvFile(envPath);
  const extendPath = resolveImageGenExtendPath(workspace);
  let provider: ImageGenProvider | null = null;

  if (fs.existsSync(extendPath)) {
    provider = parseExtendDefaultProvider(fs.readFileSync(extendPath, "utf8"));
  }

  const env = { ...fromFile };
  for (const key of Object.values(IMAGE_GEN_PROVIDER_KEYS).flat()) {
    if (process.env[key]) env[key] = process.env[key]!;
  }

  const providersToCheck: ImageGenProvider[] = provider
    ? [provider]
    : (Object.keys(IMAGE_GEN_PROVIDER_KEYS) as ImageGenProvider[]);

  for (const candidate of providersToCheck) {
    const check = providerHasRequiredKeys(candidate, env);
    if (check.ok) {
      return {
        configured: true,
        provider: candidate,
        missingKeys: [],
        envPath,
        extendPath: fs.existsSync(extendPath) ? extendPath : null,
      };
    }
    if (provider === candidate) {
      return {
        configured: false,
        provider: candidate,
        missingKeys: check.missingKeys,
        envPath,
        extendPath: fs.existsSync(extendPath) ? extendPath : null,
      };
    }
  }

  return {
    configured: false,
    provider,
    missingKeys: provider ? IMAGE_GEN_PROVIDER_KEYS[provider] : [],
    envPath,
    extendPath: fs.existsSync(extendPath) ? extendPath : null,
  };
}

export function writeImageGenExtendProvider(
  workspace: string,
  provider: ImageGenProvider
): string {
  return writeImageGenExtendConfig(workspace, provider);
}

function formatYamlModelValue(model: string | null): string {
  if (model === null) return "null";
  if (/^[a-zA-Z0-9/._-]+$/.test(model)) return model;
  return `"${model.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function buildImageGenExtendContent(
  provider: ImageGenProvider,
  modelByProvider: Partial<Record<ImageGenProvider, string | null>> = {}
): string {
  const lines = [
    "---",
    "version: 1",
    `default_provider: ${provider}`,
    "default_quality: null",
    "default_aspect_ratio: null",
    "default_image_size: null",
    "default_model:",
  ];
  for (const p of Object.keys(IMAGE_GEN_PROVIDER_KEYS) as ImageGenProvider[]) {
    const val = modelByProvider[p] ?? null;
    lines.push(`  ${p}: ${formatYamlModelValue(val)}`);
  }
  lines.push("---", "");
  return lines.join("\n");
}

function parseDefaultModelsFromExtend(
  content: string
): Partial<Record<ImageGenProvider, string | null>> {
  const yamlMatch = content.match(/^---\s*\n([\s\S]*?)\n---/m);
  const body = yamlMatch ? yamlMatch[1]! : content;
  const out: Partial<Record<ImageGenProvider, string | null>> = {};
  let inDefaultModel = false;

  for (const line of body.split("\n")) {
    if (/^default_model:\s*$/i.test(line.trim())) {
      inDefaultModel = true;
      continue;
    }
    if (!inDefaultModel) continue;

    const match = line.match(/^  ([a-z]+):\s*(.+)$/i);
    if (!match) {
      if (line.trim() && !line.startsWith(" ")) inDefaultModel = false;
      continue;
    }

    const key = match[1] as ImageGenProvider;
    if (!(key in IMAGE_GEN_PROVIDER_KEYS)) continue;
    const raw = match[2]!.trim();
    out[key] = raw === "null" ? null : raw.replace(/^['"]|['"]$/g, "");
  }

  return out;
}

export function parseExtendDefaultModel(
  content: string,
  provider: ImageGenProvider
): string | null {
  const value = parseDefaultModelsFromExtend(content)[provider];
  return value ?? null;
}

export function resolveImageGenEffectiveModel(
  provider: ImageGenProvider,
  extendContent: string | null,
  env: Record<string, string | undefined> = {}
): { configured: string | null; effective: string } {
  const configured =
    extendContent === null ? null : parseExtendDefaultModel(extendContent, provider);
  return {
    configured,
    effective: configured ?? getImageGenDefaultModel(provider, env),
  };
}

function updateExtendBodyProvider(body: string, provider: ImageGenProvider): string {
  if (/^default_provider:/m.test(body)) {
    return body.replace(/^default_provider:.*$/m, `default_provider: ${provider}`);
  }
  return `${body.trimEnd()}\ndefault_provider: ${provider}\n`;
}

function updateExtendBodyModel(
  body: string,
  provider: ImageGenProvider,
  model: string | null
): string {
  const modelLine = `  ${provider}: ${formatYamlModelValue(model)}`;
  if (/^default_model:/m.test(body)) {
    const providerLine = new RegExp(`^  ${provider}:.*$`, "m");
    if (providerLine.test(body)) {
      return body.replace(providerLine, modelLine);
    }
    return body.replace(/^default_model:\s*$/m, `default_model:\n${modelLine}`);
  }

  return `${body.trimEnd()}\ndefault_model:\n${modelLine}\n  google: null\n  openai: null\n  openrouter: null\n  dashscope: null\n  replicate: null\n  atlascloud: null\n`;
}

export interface WriteImageGenExtendOptions {
  /** Explicit model for selected provider; null clears override (runtime uses built-in default). */
  model?: string | null;
}

export function writeImageGenExtendConfig(
  workspace: string,
  provider: ImageGenProvider,
  options: WriteImageGenExtendOptions = {}
): string {
  const extendDir = path.join(workspace, ".config", "baoyu-image-gen");
  fs.mkdirSync(extendDir, { recursive: true });
  const extendPath = path.join(extendDir, "EXTEND.md");

  const modelOverride =
    options.model === undefined ? undefined : options.model?.trim() || null;

  if (!fs.existsSync(extendPath)) {
    const modelByProvider: Partial<Record<ImageGenProvider, string | null>> = {};
    if (modelOverride !== undefined) {
      modelByProvider[provider] = modelOverride;
    }
    fs.writeFileSync(extendPath, buildImageGenExtendContent(provider, modelByProvider), "utf8");
    return extendPath;
  }

  const content = fs.readFileSync(extendPath, "utf8");
  const yamlMatch = content.match(/^---\s*\n([\s\S]*?)\n---/m);
  if (!yamlMatch) {
    const modelByProvider: Partial<Record<ImageGenProvider, string | null>> = {};
    if (modelOverride !== undefined) modelByProvider[provider] = modelOverride;
    fs.writeFileSync(extendPath, buildImageGenExtendContent(provider, modelByProvider), "utf8");
    return extendPath;
  }

  let body = updateExtendBodyProvider(yamlMatch[1]!, provider);
  if (modelOverride !== undefined) {
    body = updateExtendBodyModel(body, provider, modelOverride);
  }
  const updated = content.replace(yamlMatch[0], `---\n${body.trimEnd()}\n---`);
  fs.writeFileSync(extendPath, updated, "utf8");
  return extendPath;
}

export async function verifyWechatApiCredentials(
  appId: string,
  appSecret: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status} from WeChat token API` };
    }
    const data = (await res.json()) as { access_token?: string; errcode?: number; errmsg?: string };
    if (data.access_token) return { ok: true };
    const code = data.errcode ?? 0;
    const msg = data.errmsg ?? "unknown error";
    if (code === 40164 || /ip/i.test(msg)) {
      return {
        ok: false,
        message: `IP 白名单限制 (${code}: ${msg})。请在公众号后台添加本机公网 IP，参考 https://developers.weixin.qq.com/doc/subscription/guide/dev/api/`,
      };
    }
    if (code === 40013 || code === 40125 || code === 40001) {
      return {
        ok: false,
        message: `AppID 或 AppSecret 无效 (${code}: ${msg})。请检查凭证是否正确。`,
      };
    }
    return { ok: false, message: `WeChat API error ${code}: ${msg}` };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
