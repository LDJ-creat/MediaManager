/// <reference path="./node-shims.d.ts" />

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  loadEnvFile,
  loadWorkspaceSecretFile,
  mergeEnvRecords,
  WECHAT_API_ENV,
} from '@dsmlll/media-manager-platform-common';

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

const results: CheckResult[] = [];

function getSkillRootEnvPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, '..', '.env');
}

function log(label: string, ok: boolean, detail: string): void {
  results.push({ name: label, ok, detail });
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} ${label}: ${detail}`);
}

async function checkBun(): Promise<void> {
  const result = spawnSync('npx', ['-y', 'bun', '--version'], { stdio: 'pipe', timeout: 30_000 });
  if (result.status === 0) {
    log('Bun runtime', true, `v${result.stdout?.toString().trim()}`);
  } else {
    log('Bun runtime', false, 'Cannot run bun. Install: brew install oven-sh/bun/bun (macOS) or npm install -g bun');
  }
}

async function checkApiCredentials(): Promise<void> {
  const workspaceEnv = loadWorkspaceSecretFile(WECHAT_API_ENV);
  const skillRootEnv = loadEnvFile(getSkillRootEnvPath());
  const merged = mergeEnvRecords(skillRootEnv, workspaceEnv);
  const appId = process.env.WECHAT_APP_ID || merged.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET || merged.WECHAT_APP_SECRET;

  if (appId && appSecret) {
    let detail = 'Found in environment variables';
    if (!process.env.WECHAT_APP_ID && workspaceEnv.WECHAT_APP_ID) {
      const secretsDir = process.env.MEDIA_SECRETS_DIR?.trim();
      detail = secretsDir
        ? `Found in ${path.join(secretsDir, WECHAT_API_ENV)}`
        : 'Found in workspace secrets';
    } else if (!process.env.WECHAT_APP_ID && skillRootEnv.WECHAT_APP_ID) {
      detail = `Found in ${getSkillRootEnvPath()}`;
    }
    log('API credentials', true, detail);
    return;
  }

  log(
    'API credentials',
    false,
    'Not found. Run `media setup` or `media wechat config api`, or set WECHAT_APP_ID / WECHAT_APP_SECRET'
  );
}

async function main(): Promise<void> {
  console.log('=== baoyu-post-to-wechat (API-only): Environment Check ===\n');

  await checkBun();
  await checkApiCredentials();

  console.log('\n--- Summary ---');
  const failed = results.filter((r) => !r.ok);
  if (failed.length === 0) {
    console.log('All checks passed. Ready to publish drafts via WeChat API.');
  } else {
    console.log(`${failed.length} issue(s) found:`);
    for (const f of failed) {
      console.log(`  ❌ ${f.name}: ${f.detail}`);
    }
    process.exit(1);
  }
}

await main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
