import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  formatEnvLine,
  loadEnvFile,
  parseEnvFileContent,
  unescapeEnvValue,
} from "../src/env-file.js";

test("formatEnvLine quotes values with special characters", () => {
  assert.equal(formatEnvLine("KEY", "plain"), "KEY=plain");
  assert.equal(formatEnvLine("SECRET", "a=b"), 'SECRET="a=b"');
  assert.equal(formatEnvLine("SECRET", 'say "hi"'), 'SECRET="say \\"hi\\""');
  assert.equal(formatEnvLine("SECRET", "line1\nline2"), 'SECRET="line1\\nline2"');
});

test("parseEnvFileContent reads quoted and escaped values", () => {
  const parsed = parseEnvFileContent('FOO=bar\nSECRET="a=b"\nNOTE="line1\\nline2"\n');
  assert.equal(parsed.FOO, "bar");
  assert.equal(parsed.SECRET, "a=b");
  assert.equal(parsed.NOTE, "line1\nline2");
});

test("unescapeEnvValue handles common escapes", () => {
  assert.equal(unescapeEnvValue("a\\nb", '"'), "a\nb");
  assert.equal(unescapeEnvValue("a\\tb", '"'), "a\tb");
});

test("loadEnvFile roundtrip preserves special characters", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mm-env-file-"));
  const file = path.join(dir, "roundtrip.env");
  fs.writeFileSync(file, `${formatEnvLine("WECHAT_APP_SECRET", "sec=ret#1")}\n`, "utf8");
  assert.deepEqual(loadEnvFile(file), { WECHAT_APP_SECRET: "sec=ret#1" });
});
