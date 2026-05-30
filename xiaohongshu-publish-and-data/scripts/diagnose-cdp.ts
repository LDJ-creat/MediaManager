import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { XHS_PUBLISH_NOTE_URL } from "./common.js";
import { loadNoteInput, parsePostCliArgs, loadSkillConfig, resolveAuthFile } from "./common.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface DomNode {
  nodeName?: string;
  attributes?: Array<{ name: string; value: string }>;
  children?: DomNode[];
  shadowRoots?: DomNode[];
}

function walkButtons(node: DomNode | undefined, out: Array<Record<string, unknown>> = []) {
  if (!node) return out;
  if (node.nodeName === "BUTTON") {
    const attrs = Object.fromEntries((node.attributes ?? []).map((a) => [a.name, a.value]));
    out.push({ attrs, nodeName: node.nodeName });
  }
  for (const child of node.children ?? []) walkButtons(child, out);
  for (const shadow of node.shadowRoots ?? []) walkButtons(shadow, out);
  return out;
}

async function main() {
  const config = loadSkillConfig();
  const note = loadNoteInput(parsePostCliArgs(["--file", path.resolve(__dirname, "../test-fixtures/note.md")], config));
  const authFile = resolveAuthFile(undefined, path.resolve(__dirname, "../.auth/storageState.json"), config);

  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await (await browser.newContext({ storageState: authFile.path, viewport: { width: 1440, height: 960 } })).newPage();
  await page.goto(XHS_PUBLISH_NOTE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator('input[type="file"]').first().setInputFiles(note.imagePaths);
  await page.locator('input[placeholder*="填写标题"]').first().waitFor({ state: "visible" });
  await page.locator('input[placeholder*="填写标题"]').first().fill(note.title);
  await page.waitForTimeout(8000);

  const cdp = await page.context().newCDPSession(page);
  const doc = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
  const buttons = walkButtons(doc.root as DomNode).filter((b) => {
    const s = JSON.stringify(b);
    return /bg-red|white|发布|暂存/.test(s);
  });
  console.log("CDP pierced buttons:", JSON.stringify(buttons, null, 2));

  const hostBox = await page.locator("xhs-publish-btn").first().boundingBox();
  console.log("Host bbox:", hostBox);

  await browser.close();
}

main().catch(console.error);
