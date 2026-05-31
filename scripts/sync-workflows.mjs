import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const workflowDir = path.join(
  repoRoot,
  "skills",
  "media-manager",
  "references",
  "workflows",
);
const manifestPath = path.join(workflowDir, "_sync.manifest.json");

/** @typedef {{ id: string; description: string }} WorkflowManifestEntry */

/** @returns {Map<string, WorkflowManifestEntry>} */
function loadManifest() {
  const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const map = new Map();
  for (const entry of raw.workflows) {
    map.set(entry.id, entry);
  }
  return map;
}

function listWorkflowSources() {
  return fs
    .readdirSync(workflowDir)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
    .map((name) => name.replace(/\.md$/, ""))
    .sort();
}

/**
 * Rewrite paths that assume skills/.../workflows/ as cwd.
 * Mirror dirs (.agents/workflows, .cursor/commands, …) sit two levels below repo root.
 */
function rewriteForMirror(content) {
  let text = content;
  text = text.replace(
    /\]\(\.\.\/platform-families\.md\)/g,
    "](../../skills/media-manager/references/platform-families.md)",
  );
  text = text.replace(
    /\]\(\.\.\/orchestration\.md([^)]*)\)/g,
    "](../../skills/media-manager/references/orchestration.md$1)",
  );
  text = text.replace(/`skills\//g, "`../../skills/");
  text = text.replace(/\]\(skills\//g, "](../../skills/");
  return text;
}

function withFrontmatter(description, body) {
  return `---\ndescription: ${description}\n---\n\n${body}`;
}

const manifest = loadManifest();
const workflowIds = listWorkflowSources();

/** @type {Array<{ label: string; dir: string; filename: (id: string) => string; format: Function }>} */
const targets = [
  {
    label: ".agents/workflows",
    dir: path.join(repoRoot, ".agents", "workflows"),
    filename: (id) => `${id}.md`,
    format: (_id, body) => body,
  },
  {
    label: ".cursor/commands",
    dir: path.join(repoRoot, ".cursor", "commands"),
    filename: (id) => `${id}.md`,
    format: (_id, body, meta) => withFrontmatter(meta.description, body),
  },
  {
    label: ".claude/commands",
    dir: path.join(repoRoot, ".claude", "commands"),
    filename: (id) => `${id}.md`,
    format: (_id, body, meta) => withFrontmatter(meta.description, body),
  },
  {
    label: ".github/instructions",
    dir: path.join(repoRoot, ".github", "instructions"),
    filename: (id) => `${id}.instructions.md`,
    format: (_id, body, meta) => withFrontmatter(meta.description, body),
  },
];

console.log(`Syncing workflows from ${workflowDir}`);

for (const id of workflowIds) {
  const meta = manifest.get(id);
  if (!meta) {
    console.warn(`  skip ${id}.md — no entry in _sync.manifest.json`);
    continue;
  }

  const sourcePath = path.join(workflowDir, `${id}.md`);
  const raw = fs.readFileSync(sourcePath, "utf8");
  const body = rewriteForMirror(raw);

  for (const target of targets) {
    fs.mkdirSync(target.dir, { recursive: true });
    const filename = target.filename(id);
    const out = target.format(id, body, meta);
    fs.writeFileSync(path.join(target.dir, filename), out, "utf8");
    console.log(`  -> ${target.label}/${filename}`);
  }
}

console.log("Workflow mirrors synced.");
