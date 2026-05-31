import fs from "node:fs";

const ENV_VALUE_UNQUOTED = /^[\w@./+-]+$/;

export function unescapeEnvValue(value: string, quote: '"' | "'"): string {
  if (quote === "'") return value;
  return value.replace(/\\(.)/g, (_, ch: string) => {
    if (ch === "n") return "\n";
    if (ch === "r") return "\r";
    if (ch === "t") return "\t";
    return ch;
  });
}

export function formatEnvValue(value: string): string {
  if (ENV_VALUE_UNQUOTED.test(value)) return value;
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
  return `"${escaped}"`;
}

export function formatEnvLine(key: string, value: string): string {
  return `${key}=${formatEnvValue(value)}`;
}

export function serializeEnvFile(entries: Record<string, string>): string {
  return `${Object.entries(entries)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => formatEnvLine(key, value))
    .join("\n")}\n`;
}

export function parseEnvLine(rawLine: string): { key: string; value: string } | null {
  let line = rawLine.trim();
  if (!line || line.startsWith("#")) return null;
  if (line.startsWith("export ")) line = line.slice("export ".length).trim();

  const eqIdx = line.indexOf("=");
  if (eqIdx <= 0) return null;

  const key = line.slice(0, eqIdx).trim();
  let value = line.slice(eqIdx + 1).trim();
  if (!key) return null;

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    const quote = value[0] as '"' | "'";
    value = unescapeEnvValue(value.slice(1, -1), quote);
  }

  return { key, value };
}

export function parseEnvFileContent(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const parsed = parseEnvLine(line);
    if (parsed) env[parsed.key] = parsed.value;
  }
  return env;
}

export function loadEnvFile(envPath: string): Record<string, string> {
  if (!fs.existsSync(envPath)) return {};
  return parseEnvFileContent(fs.readFileSync(envPath, "utf-8"));
}

export function mergeEnvRecords(...records: Record<string, string>[]): Record<string, string> {
  return Object.assign({}, ...records);
}
