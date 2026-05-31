import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  WECHAT_API_ENV,
  IMAGE_GEN_ENV,
  buildImageGenSecretValues,
  getImageGenDefaultModel,
  getImageGenStatus,
  getWechatApiStatus,
  loadEnvFile,
  loadWorkspaceSecrets,
  mergeSecretsIntoEnv,
  parseExtendDefaultModel,
  resolveImageGenEffectiveModel,
  resolveSecretsDir,
  writeImageGenExtendConfig,
  writeImageGenExtendProvider,
  writeSecretsFile,
} from "../src/secrets.js";

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mm-pc-secrets-"));

test.afterEach(() => {
  delete process.env.MEDIA_WORKSPACE;
  delete process.env.GOOGLE_API_KEY;
  delete process.env.GEMINI_API_KEY;
});

test("loadEnvFile parses comments and quoted values", () => {
  const file = path.join(tmpRoot, "sample.env");
  fs.writeFileSync(file, '# comment\nFOO=bar\nBAZ="qux"\n', "utf8");
  assert.deepEqual(loadEnvFile(file), { FOO: "bar", BAZ: "qux" });
});

test("writeSecretsFile merges and loadWorkspaceSecrets combines env files", () => {
  const ws = path.join(tmpRoot, "ws-merge");
  process.env.MEDIA_WORKSPACE = ws;
  writeSecretsFile(ws, WECHAT_API_ENV, {
    WECHAT_APP_ID: "id1",
    WECHAT_APP_SECRET: "secret1",
  });
  writeSecretsFile(ws, IMAGE_GEN_ENV, { GOOGLE_API_KEY: "gkey" });

  const merged = loadWorkspaceSecrets(ws);
  assert.equal(merged.WECHAT_APP_ID, "id1");
  assert.equal(merged.GOOGLE_API_KEY, "gkey");
  assert.equal(resolveSecretsDir(ws), path.join(ws, ".media-manager", "secrets"));
});

test("loadWorkspaceSecrets filters by file name", () => {
  const ws = path.join(tmpRoot, "ws-filter");
  writeSecretsFile(ws, WECHAT_API_ENV, {
    WECHAT_APP_ID: "id1",
    WECHAT_APP_SECRET: "secret1",
  });
  writeSecretsFile(ws, IMAGE_GEN_ENV, { GOOGLE_API_KEY: "gkey" });

  const wechatOnly = loadWorkspaceSecrets(ws, [WECHAT_API_ENV]);
  assert.equal(wechatOnly.WECHAT_APP_ID, "id1");
  assert.equal(wechatOnly.GOOGLE_API_KEY, undefined);

  const none = loadWorkspaceSecrets(ws, []);
  assert.deepEqual(none, {});
});

test("writeSecretsFile escapes special characters", () => {
  const ws = path.join(tmpRoot, "ws-escape");
  const filePath = writeSecretsFile(ws, WECHAT_API_ENV, {
    WECHAT_APP_SECRET: "sec=ret#1",
  });
  const raw = fs.readFileSync(filePath, "utf8");
  assert.match(raw, /WECHAT_APP_SECRET="sec=ret#1"/);
  assert.equal(loadEnvFile(filePath).WECHAT_APP_SECRET, "sec=ret#1");
});

test("mergeSecretsIntoEnv does not override existing env", () => {
  const target: Record<string, string | undefined> = { FOO: "existing" };
  mergeSecretsIntoEnv({ FOO: "new", BAR: "added" }, target);
  assert.equal(target.FOO, "existing");
  assert.equal(target.BAR, "added");
});

test("buildImageGenSecretValues writes both Google aliases", () => {
  assert.deepEqual(buildImageGenSecretValues("google", "key-123"), {
    GOOGLE_API_KEY: "key-123",
    GEMINI_API_KEY: "key-123",
  });
});

test("getWechatApiStatus detects configured credentials", () => {
  const ws = path.join(tmpRoot, "ws-wechat");
  writeSecretsFile(ws, WECHAT_API_ENV, {
    WECHAT_APP_ID: "wx123",
    WECHAT_APP_SECRET: "sec456",
  });
  const status = getWechatApiStatus(ws);
  assert.equal(status.configured, true);
  assert.ok(status.path.endsWith(WECHAT_API_ENV));
});

test("getImageGenDefaultModel returns built-in default per provider", () => {
  assert.equal(getImageGenDefaultModel("google"), "gemini-3-pro-image-preview");
  assert.equal(getImageGenDefaultModel("dashscope"), "qwen-image-2.0-pro");
  assert.equal(getImageGenDefaultModel("openrouter"), "google/gemini-3.1-flash-image-preview");
});

test("writeImageGenExtendConfig stores custom default_model for provider", () => {
  const ws = path.join(tmpRoot, "ws-image-model");
  const extendPath = writeImageGenExtendConfig(ws, "google", {
    model: "gemini-3.1-flash-image-preview",
  });
  const content = fs.readFileSync(extendPath, "utf8");
  assert.match(content, /default_provider: google/);
  assert.match(content, /google: gemini-3.1-flash-image-preview/);
  assert.equal(parseExtendDefaultModel(content, "google"), "gemini-3.1-flash-image-preview");
});

test("writeImageGenExtendConfig clears model override when model is null", () => {
  const ws = path.join(tmpRoot, "ws-image-model-clear");
  writeImageGenExtendConfig(ws, "google", { model: "custom-model" });
  const extendPath = writeImageGenExtendConfig(ws, "google", { model: null });
  const content = fs.readFileSync(extendPath, "utf8");
  assert.match(content, /google: null/);
  const resolved = resolveImageGenEffectiveModel("google", content);
  assert.equal(resolved.configured, null);
  assert.equal(resolved.effective, "gemini-3-pro-image-preview");
});

test("getImageGenStatus uses EXTEND default_provider", () => {
  const ws = path.join(tmpRoot, "ws-image");
  writeImageGenExtendProvider(ws, "google");
  writeSecretsFile(ws, IMAGE_GEN_ENV, buildImageGenSecretValues("google", "google-key"));
  const status = getImageGenStatus(ws);
  assert.equal(status.configured, true);
  assert.equal(status.provider, "google");
});

test("getImageGenStatus accepts GEMINI_API_KEY only", () => {
  const ws = path.join(tmpRoot, "ws-gemini");
  writeImageGenExtendProvider(ws, "google");
  writeSecretsFile(ws, IMAGE_GEN_ENV, { GEMINI_API_KEY: "gemini-key" });
  const status = getImageGenStatus(ws);
  assert.equal(status.configured, true);
  assert.equal(status.provider, "google");
});

if (process.platform !== "win32") {
  test("ensureSecretsDir creates directory with 0700 permissions", () => {
    const ws = path.join(tmpRoot, "ws-perms");
    writeSecretsFile(ws, WECHAT_API_ENV, { WECHAT_APP_ID: "id", WECHAT_APP_SECRET: "sec" });
    const dirMode = fs.statSync(resolveSecretsDir(ws)).mode & 0o777;
    const fileMode = fs.statSync(path.join(resolveSecretsDir(ws), WECHAT_API_ENV)).mode & 0o777;
    assert.equal(dirMode, 0o700);
    assert.equal(fileMode, 0o600);
  });
}
