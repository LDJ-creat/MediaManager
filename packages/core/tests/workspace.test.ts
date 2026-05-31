import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ensureWorkspaceLayout,
  getDefaultWorkspacePath,
  isGuidanceLayoutReady,
  readGlobalConfig,
  resolveWorkspace,
  setupWorkspace,
  writeGlobalConfig,
} from "../src/index.js";

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mm-core-test-"));

function testResolveWorkspaceFromExplicit() {
  const ws = path.join(tmpRoot, "explicit-ws");
  fs.mkdirSync(ws, { recursive: true });
  fs.mkdirSync(path.join(ws, ".media-manager"), { recursive: true });
  fs.writeFileSync(
    path.join(ws, ".media-manager", "config.json"),
    JSON.stringify({ version: 1, layout: "v1", createdAt: new Date().toISOString() })
  );
  assert.equal(resolveWorkspace({ explicit: ws }), path.resolve(ws));
}

function testSetupWorkspace() {
  const ws = path.join(tmpRoot, "setup-ws");
  const { paths } = setupWorkspace(ws);
  assert.equal(fs.existsSync(paths.outputDir), true);
  assert.equal(fs.existsSync(paths.newsDataDir), true);
  assert.equal(fs.existsSync(paths.secretsDir), true);
  assert.equal(fs.existsSync(path.join(ws, ".gitignore")), true);
  const gitignore = fs.readFileSync(path.join(ws, ".gitignore"), "utf8");
  assert.ok(gitignore.includes(".media-manager/secrets/"));
  assert.equal(isGuidanceLayoutReady(paths.guidanceDir), true);
  assert.equal(fs.existsSync(path.join(paths.guidanceDir, "writing", "longform.md")), true);
  assert.equal(fs.existsSync(path.join(paths.guidanceDir, "publishing", "platform", "wechat.md")), true);
  const global = readGlobalConfig();
  assert.ok(global);
  assert.equal(global!.workspace, path.resolve(ws));
}

function testDefaultWorkspacePath() {
  const def = getDefaultWorkspacePath();
  assert.ok(def.includes("MediaManager-Workspace"));
}

import { findRepoRoot } from "../src/repo-root.js";

function testFindRepoRoot() {
  const repo = path.join(tmpRoot, "fake-repo");
  fs.mkdirSync(path.join(repo, ".media-manager"), { recursive: true });
  fs.writeFileSync(path.join(repo, ".media-manager", "repo-marker.json"), "{}");
  assert.equal(findRepoRoot(repo), path.resolve(repo));
}

function testGlobalConfigOverridesRepoCwd() {
  const globalWs = path.join(tmpRoot, "global-ws");
  setupWorkspace(globalWs);
  const fakeRepoCwd = path.join(tmpRoot, "fake-repo-cwd");
  fs.mkdirSync(path.join(fakeRepoCwd, ".media-manager"), { recursive: true });
  fs.writeFileSync(
    path.join(fakeRepoCwd, ".media-manager", "config.json"),
    JSON.stringify({ version: 1, layout: "v1", createdAt: new Date().toISOString() })
  );
  fs.writeFileSync(path.join(fakeRepoCwd, ".media-manager", "repo-marker.json"), "{}");
  assert.equal(resolveWorkspace({ cwd: fakeRepoCwd }), path.resolve(globalWs));
}

function run() {
  testResolveWorkspaceFromExplicit();
  testSetupWorkspace();
  testDefaultWorkspacePath();
  testFindRepoRoot();
  testGlobalConfigOverridesRepoCwd();
  console.log("core tests passed");
}

run();
