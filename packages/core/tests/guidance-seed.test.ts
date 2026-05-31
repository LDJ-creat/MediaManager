import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ensureGuidanceLayout,
  isGuidanceLayoutReady,
  resolveGuidanceTemplateDirs,
  seedGuidanceTemplates,
} from "../src/guidance-seed.js";

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mm-guidance-seed-"));

function testResolveTemplateDirsIncludesSkillBundle() {
  const dirs = resolveGuidanceTemplateDirs(process.cwd());
  const hasSkill = dirs.some((d) =>
    d.replace(/\\/g, "/").includes("skills/media-manager/references/guidance"),
  );
  assert.ok(hasSkill, "expected skill guidance bundle in template dirs");
}

function testSeedFromEmptyWorkspaceUsesSkillBundle() {
  const ws = path.join(tmpRoot, "empty-ws");
  const guidanceDir = path.join(ws, "guidance");
  fs.mkdirSync(guidanceDir, { recursive: true });

  const result = seedGuidanceTemplates(guidanceDir, process.cwd());
  assert.ok(result.templateDirs.length > 0);
  assert.ok(result.seeded > 0, "expected files copied into empty guidance dir");
  assert.ok(
    fs.existsSync(path.join(guidanceDir, "writing", "longform.md")),
    "seed should copy template files when available",
  );
}

function testSeedDoesNotOverwriteExisting() {
  const ws = path.join(tmpRoot, "custom-ws");
  const guidanceDir = path.join(ws, "guidance");
  fs.mkdirSync(path.join(guidanceDir, "writing"), { recursive: true });
  const custom = "# Custom longform\n";
  fs.writeFileSync(path.join(guidanceDir, "writing", "longform.md"), custom, "utf8");

  seedGuidanceTemplates(guidanceDir, process.cwd());
  assert.equal(fs.readFileSync(path.join(guidanceDir, "writing", "longform.md"), "utf8"), custom);
}

function testTemplateDirsNeverUseWorkspaceGuidance() {
  const fakeRepo = path.join(tmpRoot, "fake-repo-root");
  const workspaceGuidance = path.join(fakeRepo, "guidance");
  fs.mkdirSync(path.join(workspaceGuidance, "writing"), { recursive: true });
  fs.writeFileSync(
    path.join(workspaceGuidance, "writing", "longform.md"),
    "# Personal only — must not be template source\n",
    "utf8",
  );

  const dirs = resolveGuidanceTemplateDirs(fakeRepo);
  const resolvedWorkspace = path.resolve(workspaceGuidance);
  assert.ok(
    !dirs.some((d) => path.resolve(d) === resolvedWorkspace),
    "workspace guidance/ must never be a template source",
  );
  assert.ok(
    dirs.some((d) => d.replace(/\\/g, "/").includes("skills/media-manager/references/guidance")),
    "expected canonical skill bundle in template dirs",
  );
}

function testLayoutReadyWithoutMdFiles() {
  const ws = path.join(tmpRoot, "layout-only");
  const guidanceDir = path.join(ws, "guidance");
  ensureGuidanceLayout(guidanceDir);
  assert.equal(isGuidanceLayoutReady(guidanceDir), true);
  assert.equal(fs.existsSync(path.join(guidanceDir, "writing", "longform.md")), false);
}

function testExplicitTemplateDir() {
  const ws = path.join(tmpRoot, "explicit-ws");
  const guidanceDir = path.join(ws, "guidance");
  const customTemplate = path.join(ws, "custom-templates");
  fs.mkdirSync(path.join(customTemplate, "writing"), { recursive: true });
  fs.writeFileSync(path.join(customTemplate, "writing", "longform.md"), "# From env\n", "utf8");

  const prev = process.env.MEDIA_GUIDANCE_TEMPLATES;
  process.env.MEDIA_GUIDANCE_TEMPLATES = customTemplate;
  try {
    seedGuidanceTemplates(guidanceDir, ws);
    assert.equal(
      fs.readFileSync(path.join(guidanceDir, "writing", "longform.md"), "utf8"),
      "# From env\n",
    );
  } finally {
    if (prev === undefined) delete process.env.MEDIA_GUIDANCE_TEMPLATES;
    else process.env.MEDIA_GUIDANCE_TEMPLATES = prev;
  }
}

function run() {
  testResolveTemplateDirsIncludesSkillBundle();
  testSeedFromEmptyWorkspaceUsesSkillBundle();
  testSeedDoesNotOverwriteExisting();
  testTemplateDirsNeverUseWorkspaceGuidance();
  testLayoutReadyWithoutMdFiles();
  testExplicitTemplateDir();
  console.log("guidance-seed tests passed");
}

run();
