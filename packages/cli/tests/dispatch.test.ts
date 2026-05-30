import assert from "node:assert/strict";
import { test } from "node:test";
import { parseArgs } from "../src/dispatch.js";

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
