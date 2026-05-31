import { spawn, spawnSync, type SpawnOptions, type SpawnSyncOptions } from "node:child_process";
import path from "node:path";

/** Resolve CLI shim on Windows (npx.cmd) without shell:true + args (Node DEP0180). */
export function resolveCliCommand(command: string): string {
  if (process.platform !== "win32") return command;
  if (command.includes(path.sep) || /\.(exe|cmd|bat)$/i.test(command)) return command;
  return `${command}.cmd`;
}

export function spawnCommandSync(
  command: string,
  args: string[],
  options: SpawnSyncOptions = {}
): ReturnType<typeof spawnSync> {
  return spawnSync(resolveCliCommand(command), args, { ...options, shell: false });
}

export function spawnCommand(
  command: string,
  args: string[],
  options: SpawnOptions = {}
): ReturnType<typeof spawn> {
  return spawn(resolveCliCommand(command), args, { ...options, shell: false });
}
