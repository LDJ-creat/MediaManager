import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  buildSkillsRemoveArgs,
  pruneSkillLockForRepo,
  runFilesystemSkillCleanup,
  skillEntryExists,
  SKILLS_REPO,
} from "../src/skills.js";

test("buildSkillsRemoveArgs mirrors install agent targets", () => {
  assert.deepEqual(buildSkillsRemoveArgs(["media-manager", "news-skill"], ["cursor", "claude-code"]), [
    "skills",
    "remove",
    "media-manager",
    "news-skill",
    "-g",
    "-y",
    "-a",
    "cursor",
    "-a",
    "claude-code",
  ]);
});

test("skillEntryExists detects dangling junction entries", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "mm-skills-"));
  const canonical = path.join(home, ".agents", "skills", "media-manager");
  const junctionParent = path.join(home, ".claude", "skills");
  fs.mkdirSync(junctionParent, { recursive: true });
  fs.mkdirSync(canonical, { recursive: true });
  fs.writeFileSync(path.join(canonical, "SKILL.md"), "# test\n");

  const junction = path.join(junctionParent, "media-manager");
  fs.symlinkSync(canonical, junction, "junction");
  fs.rmSync(canonical, { recursive: true, force: true });

  assert.equal(fs.existsSync(junction), false);
  assert.equal(skillEntryExists(junction), true);
});

test("runFilesystemSkillCleanup removes dangling junctions", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "mm-skills-clean-"));
  const canonical = path.join(home, ".agents", "skills", "news-skill");
  const junctionParent = path.join(home, ".claude", "skills");
  fs.mkdirSync(junctionParent, { recursive: true });
  fs.mkdirSync(canonical, { recursive: true });

  const junction = path.join(junctionParent, "news-skill");
  fs.symlinkSync(canonical, junction, "junction");
  fs.rmSync(canonical, { recursive: true, force: true });

  const removed = runFilesystemSkillCleanup(["news-skill"], home);
  assert.equal(removed, 1);
  assert.equal(skillEntryExists(junction), false);
});

test("pruneSkillLockForRepo removes MediaManager entries only", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "mm-skills-lock-"));
  const agentsDir = path.join(home, ".agents");
  fs.mkdirSync(agentsDir, { recursive: true });
  fs.writeFileSync(
    path.join(agentsDir, ".skill-lock.json"),
    JSON.stringify(
      {
        version: 3,
        skills: {
          "media-manager": { source: SKILLS_REPO },
          "news-skill": { source: SKILLS_REPO },
          "other-skill": { source: "vercel-labs/agent-skills" },
        },
      },
      null,
      2
    ),
    "utf8"
  );

  const removed = pruneSkillLockForRepo(SKILLS_REPO, home);
  assert.deepEqual(removed, ["media-manager", "news-skill"]);

  const lock = JSON.parse(fs.readFileSync(path.join(agentsDir, ".skill-lock.json"), "utf8")) as {
    skills: Record<string, unknown>;
  };
  assert.deepEqual(Object.keys(lock.skills), ["other-skill"]);
});
