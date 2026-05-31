const NO_COLOR =
  process.env.NO_COLOR !== undefined ||
  process.env.TERM === "dumb" ||
  !process.stdout.isTTY;

function wrap(code: string, text: string): string {
  if (NO_COLOR) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

export const ui = {
  bold: (t: string) => wrap("1", t),
  dim: (t: string) => wrap("2", t),
  cyan: (t: string) => wrap("36", t),
  green: (t: string) => wrap("32", t),
  yellow: (t: string) => wrap("33", t),
  blue: (t: string) => wrap("34", t),
  magenta: (t: string) => wrap("35", t),
  red: (t: string) => wrap("31", t),
};

export function printBanner(): void {
  const lines = [
    "",
    ui.bold(ui.cyan("  MediaManager")),
    ui.dim("  自媒体内容工作区 · CLI"),
    "",
  ];
  console.log(lines.join("\n"));
}

export function printStep(icon: string, label: string, detail?: string): void {
  const head = `${icon} ${ui.bold(label)}`;
  console.log(detail ? `${head}\n   ${ui.dim(detail)}` : head);
}

export function formatDoctorLine(ok: boolean, fatal: boolean, msg: string): string {
  if (ok) return `${ui.green("✓")} ${msg}`;
  if (fatal) return `${ui.red("✗")} ${msg}`;
  return `${ui.yellow("⚠")} ${msg}`;
}
