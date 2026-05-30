/// <reference path="./node-shims.d.ts" />

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

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
  let found = false;

  // Check runtime environment first
  if (process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET) {
    log('API credentials', true, 'Found in environment variables');
    found = true;
  }

  // Then check <skillRoot>/.env (parent directory of this script)
  const skillRootEnv = getSkillRootEnvPath();
  if (!found && fs.existsSync(skillRootEnv)) {
    const content = fs.readFileSync(skillRootEnv, 'utf8');
    if (content.includes('WECHAT_APP_ID')) {
      log('API credentials', true, `Found in ${skillRootEnv}`);
      found = true;
    }
  }

  if (!found) {
    log('API credentials', false, 'Not found. Set WECHAT_APP_ID and WECHAT_APP_SECRET in environment variables or in <skillRoot>/.env');
  }
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
