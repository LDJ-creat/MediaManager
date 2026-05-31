import assert from "node:assert/strict";
import { test } from "node:test";
import { parseArgs, runWorkspaceSet } from "../src/dispatch.js";
import {
  clearIsolatedGlobalConfig,
  createIsolatedTestRoot,
  useIsolatedGlobalConfig,
} from "../../core/tests/isolated-global-config.js";
import { readGlobalConfig } from "@dsmlll/media-manager-core";
import path from "node:path";

test("parseArgs splits command, flags, and positional", () => {
  const parsed = parseArgs(["news", "fetch", "--preview", "--hours", "24", "extra"]);
  assert.deepEqual(parsed.command, ["news", "fetch", "extra"]);
  assert.equal(parsed.flags.preview, true);
  assert.equal(parsed.flags.hours, "24");
  assert.deepEqual(parsed.positional, []);
});

test("parseArgs boolean flag without value", () => {
  const parsed = parseArgs(["setup", "--interactive"]);
  assert.deepEqual(parsed.command, ["setup"]);
  assert.equal(parsed.flags.interactive, true);
});

test("parseArgs puts workspace set path in command[2]", () => {
  const parsed = parseArgs(["workspace", "set", "C:\\MediaManager-Workspace"]);
  assert.deepEqual(parsed.command, ["workspace", "set", "C:\\MediaManager-Workspace"]);
  assert.deepEqual(parsed.positional, []);
});

test("runWorkspaceSet accepts path from command[2]", () => {
  const tmpRoot = createIsolatedTestRoot("mm-cli-ws-set-");
  useIsolatedGlobalConfig(tmpRoot);
  try {
    const ws = path.join(tmpRoot, "my-workspace");
    const code = runWorkspaceSet({}, [], ws);
    assert.equal(code, 0);
    const global = readGlobalConfig();
    assert.equal(global?.workspace, path.resolve(ws));
  } finally {
    clearIsolatedGlobalConfig();
  }
});
