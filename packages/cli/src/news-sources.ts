import fs from "node:fs";
import path from "node:path";
import { getBundledSkillsDir } from "@dsmlll/media-manager-runtime";
import { spawnCommandSync } from "./spawn.js";
import { ui } from "./ui.js";

export function getWorkspaceSourcesPath(workspace: string): string {
  return path.join(path.resolve(workspace), ".media-manager", "news", "sources.json");
}

export function getBundledSourcesPath(): string {
  return path.join(getBundledSkillsDir(), "news-skill", "references", "sources.json");
}

export function ensureWorkspaceSources(workspace: string): { path: string; created: boolean } {
  const target = getWorkspaceSourcesPath(workspace);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const created = !fs.existsSync(target);
  if (created) {
    const bundled = getBundledSourcesPath();
    if (!fs.existsSync(bundled)) {
      throw new Error(`默认 RSS 配置不存在: ${bundled}`);
    }
    fs.copyFileSync(bundled, target);
  }
  return { path: target, created };
}

function openInEditor(filePath: string): number {
  const editor = process.env.EDITOR?.trim() || process.env.VISUAL?.trim();
  if (editor) {
    const parts = editor.split(/\s+/);
    const cmd = parts[0]!;
    const args = [...parts.slice(1), filePath];
    return spawnCommandSync(cmd, args, { stdio: "inherit" }).status ?? 1;
  }

  if (process.platform === "win32") {
    const code = spawnCommandSync("code", ["--wait", filePath], { stdio: "inherit" });
    if (!code.error && (code.status ?? 1) === 0) return 0;
    spawnCommandSync("notepad.exe", [filePath], { stdio: "inherit" });
    console.log(`\n${ui.dim("已在记事本中打开，保存后关闭即可。")}`);
    return 0;
  }

  for (const [cmd, args] of [
    ["code", ["--wait", filePath]],
    ["nano", [filePath]],
    ["vi", [filePath]],
  ] as const) {
    const result = spawnCommandSync(cmd, [...args], { stdio: "inherit" });
    if (result.error && "code" in result.error && result.error.code === "ENOENT") continue;
    return result.status ?? 1;
  }

  console.log(`\n${ui.dim("未找到编辑器，请手动编辑:")}\n  ${ui.blue(filePath)}`);
  return 0;
}

export function runNewsSourcesEdit(workspace: string): number {
  try {
    const { path: sourcesPath, created } = ensureWorkspaceSources(workspace);
    console.log("");
    if (created) {
      console.log(`${ui.green("✓")} 已从默认 RSS 源复制到工作区配置文件`);
    } else {
      console.log(`${ui.dim("▸")} 打开已有 RSS 源配置`);
    }
    console.log(`  ${ui.blue(sourcesPath)}`);
    console.log(`  ${ui.dim("修改后运行")} ${ui.blue("media news fetch")} ${ui.dim("即可生效")}\n`);
    return openInEditor(sourcesPath);
  } catch (err) {
    console.error(String(err));
    return 1;
  }
}
