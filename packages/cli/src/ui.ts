const NO_COLOR =
  process.env.NO_COLOR !== undefined ||
  process.env.TERM === "dumb" ||
  !process.stdout.isTTY;

/** Strip ANSI escape codes for width calculation. */
export function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

/** Terminal display width (CJK and other wide chars count as 2). */
export function visibleWidth(text: string): number {
  let width = 0;
  for (const char of stripAnsi(text)) {
    width += char.charCodeAt(0) > 0xff ? 2 : 1;
  }
  return width;
}

/** Pad plain text to a fixed display width. */
export function padDisplay(text: string, width: number): string {
  const pad = Math.max(0, width - visibleWidth(text));
  return text + " ".repeat(pad);
}

/** Standard label column width for setup / config summaries. */
export const SUMMARY_LABEL_WIDTH = 10;

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
  blue: (t: string) => wrap("94", t),
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
  if (detail) {
    console.log(`${head}  ${ui.dim("·")}  ${detail}`);
  } else {
    console.log(head);
  }
}

/** Two-column summary row: fixed-width dim label + value. */
export function printLabelRow(
  label: string,
  value: string,
  labelWidth = SUMMARY_LABEL_WIDTH
): void {
  console.log(`  ${ui.dim(padDisplay(label, labelWidth))}  ${value}`);
}

export function formatDoctorLine(ok: boolean, fatal: boolean, msg: string): string {
  if (ok) return `${ui.green("✓")} ${msg}`;
  if (fatal) return `${ui.red("✗")} ${msg}`;
  return `${ui.yellow("⚠")} ${msg}`;
}
