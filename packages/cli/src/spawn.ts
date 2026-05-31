import { spawn, spawnSync, type SpawnOptions, type SpawnSyncOptions } from "node:child_process";
import path from "node:path";

/** Resolve CLI shim on Windows (npx.cmd) without shell:true + args (Node DEP0180). */
export function resolveCliCommand(command: string): string {
  if (process.platform !== "win32") return command;
  if (command.includes(path.sep) || /\.(exe|cmd|bat)$/i.test(command)) return command;
  return `${command}.cmd`;
}

export function needsWindowsCmdWrapper(command: string): boolean {
  if (process.platform !== "win32") return false;
  if (command.includes(path.sep)) return false;
  if (/\.exe$/i.test(command)) return false;
  return true;
}

function spawnViaCmdExe(
  command: string,
  args: string[],
  options: SpawnSyncOptions
): ReturnType<typeof spawnSync> {
  const comspec = process.env.ComSpec ?? "cmd.exe";
  return spawnSync(comspec, ["/d", "/s", "/c", command, ...args], {
    ...options,
    shell: false,
  });
}

function spawnAsyncViaCmdExe(
  command: string,
  args: string[],
  options: SpawnOptions
): ReturnType<typeof spawn> {
  const comspec = process.env.ComSpec ?? "cmd.exe";
  return spawn(comspec, ["/d", "/s", "/c", command, ...args], {
    ...options,
    shell: false,
  });
}

export function spawnCommandSync(
  command: string,
  args: string[],
  options: SpawnSyncOptions = {}
): ReturnType<typeof spawnSync> {
  if (needsWindowsCmdWrapper(command)) {
    return spawnViaCmdExe(command, args, options);
  }
  return spawnSync(resolveCliCommand(command), args, { ...options, shell: false });
}

export function spawnCommand(
  command: string,
  args: string[],
  options: SpawnOptions = {}
): ReturnType<typeof spawn> {
  if (needsWindowsCmdWrapper(command)) {
    return spawnAsyncViaCmdExe(command, args, options);
  }
  return spawn(resolveCliCommand(command), args, { ...options, shell: false });
}

export function formatSpawnError(command: string, args: string[], error: NodeJS.ErrnoException): string {
  const detail = `${command} ${args.join(" ")}`.trim();
  if (error.code === "EINVAL" && process.platform === "win32") {
    return `无法启动命令（Windows spawn 失败）: ${detail}`;
  }
  return `无法启动命令: ${detail} (${error.message})`;
}
