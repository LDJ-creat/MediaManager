import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ensureWorkspaceLayout,
  getDefaultWorkspacePath,
  readGlobalConfig,
  resolveWorkspace,
  setupWorkspace,
  writeGlobalConfig,
} from "../src/workspace.js";

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

function run() {
  testResolveWorkspaceFromExplicit();
  testSetupWorkspace();
  testDefaultWorkspacePath();
  testFindRepoRoot();
  console.log("core tests passed");
}

run();
