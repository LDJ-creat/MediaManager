import assert from "node:assert/strict";
import { test } from "node:test";
import { needsWindowsCmdWrapper } from "../src/spawn.js";

test("Windows bare CLI commands should use cmd.exe wrapper", () => {
  if (process.platform !== "win32") return;
  assert.equal(needsWindowsCmdWrapper("npx"), true);
  assert.equal(needsWindowsCmdWrapper("npm"), true);
  assert.equal(needsWindowsCmdWrapper("notepad.exe"), false);
  assert.equal(needsWindowsCmdWrapper("C:\\tools\\tsx.exe"), false);
});

test("non-Windows never wraps commands", () => {
  if (process.platform === "win32") return;
  assert.equal(needsWindowsCmdWrapper("npx"), false);
});
