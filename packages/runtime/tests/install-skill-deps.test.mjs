import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { resolvePlatformCommonDir } from "../scripts/install-skill-deps.mjs";

test("resolvePlatformCommonDir prefers npm scoped folder name", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mm-runtime-deps-"));
  const scoped = path.join(tmpRoot, "@dsmlll", "media-manager-platform-common");
  const monorepo = path.join(tmpRoot, "platform-common");
  fs.mkdirSync(scoped, { recursive: true });
  fs.mkdirSync(monorepo, { recursive: true });
  fs.writeFileSync(path.join(scoped, "package.json"), "{}", "utf8");
  fs.writeFileSync(path.join(monorepo, "package.json"), "{}", "utf8");

  const runtimeRoot = path.join(tmpRoot, "@dsmlll", "media-manager-runtime");
  fs.mkdirSync(runtimeRoot, { recursive: true });

  assert.equal(resolvePlatformCommonDir(runtimeRoot), scoped);
});

test("resolvePlatformCommonDir falls back to monorepo folder name", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mm-runtime-deps-"));
  const monorepo = path.join(tmpRoot, "packages", "platform-common");
  fs.mkdirSync(monorepo, { recursive: true });
  fs.writeFileSync(path.join(monorepo, "package.json"), "{}", "utf8");

  const runtimeRoot = path.join(tmpRoot, "packages", "runtime");
  fs.mkdirSync(runtimeRoot, { recursive: true });

  assert.equal(resolvePlatformCommonDir(runtimeRoot), monorepo);
});
