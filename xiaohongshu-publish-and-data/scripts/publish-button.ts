import type { CDPSession, Page } from "playwright";

const XHS_PUBLISH_HOST_SELECTOR = 'xhs-publish-btn[is-publish="true"]';

export type PublishClickMethod =
  | "accessibility-cdp"
  | "host-locator-position"
  | "cdp-mouse"
  | "cdp-element-click"
  | "host-coordinate"
  | "playwright-locator";

export interface PublishClickResult {
  clicked: boolean;
  method?: PublishClickMethod;
}

function parseDomAttributes(attrs: string[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!attrs) return out;
  for (let i = 0; i + 1 < attrs.length; i += 2) {
    out[attrs[i]] = attrs[i + 1];
  }
  return out;
}

async function resolveNodeText(client: CDPSession, nodeId: number): Promise<string> {
  try {
    const { object } = await client.send("DOM.resolveNode", { nodeId });
    const { result } = await client.send("Runtime.callFunctionOn", {
      objectId: object.objectId,
      functionDeclaration: `function() { return (this.textContent || "").trim(); }`,
      returnByValue: true,
    });
    return typeof result.value === "string" ? result.value : "";
  } catch {
    return "";
  }
}

async function findHostNodeId(
  client: CDPSession,
  nodeId: number,
): Promise<number | undefined> {
  const { node } = await client.send("DOM.describeNode", {
    nodeId,
    depth: 1,
    pierce: true,
  });

  const tag = (node.localName ?? node.nodeName ?? "").toLowerCase();
  if (tag === "xhs-publish-btn") {
    return nodeId;
  }

  for (const child of node.children ?? []) {
    const found = await findHostNodeId(client, child.nodeId);
    if (found) return found;
  }

  return undefined;
}

async function findPublishButtonUnderHost(
  client: CDPSession,
  hostNodeId: number,
): Promise<number | undefined> {
  let exactMatch: number | undefined;
  let fallbackMatch: number | undefined;

  async function walk(nodeId: number): Promise<void> {
    const { node } = await client.send("DOM.describeNode", {
      nodeId,
      depth: 1,
      pierce: true,
    });

    const tag = (node.localName ?? node.nodeName ?? "").toLowerCase();
    if (tag === "button") {
      const text = await resolveNodeText(client, nodeId);
      const attrs = parseDomAttributes(node.attributes);
      if (text === "发布") {
        exactMatch = nodeId;
        return;
      }
      if (!fallbackMatch && attrs.class?.includes("bg-red")) {
        fallbackMatch = nodeId;
      }
    }

    for (const child of node.children ?? []) {
      if (exactMatch) return;
      await walk(child.nodeId);
    }
  }

  await walk(hostNodeId);
  return exactMatch ?? fallbackMatch;
}

async function getNodeCenter(
  client: CDPSession,
  nodeId: number,
): Promise<{ x: number; y: number } | undefined> {
  const { model } = await client.send("DOM.getBoxModel", { nodeId });
  if (!model?.content || model.content.length < 8) return undefined;

  const xs = [model.content[0], model.content[2], model.content[4], model.content[6]];
  const ys = [model.content[1], model.content[3], model.content[5], model.content[7]];
  return {
    x: xs.reduce((sum, value) => sum + value, 0) / xs.length,
    y: ys.reduce((sum, value) => sum + value, 0) / ys.length,
  };
}

async function clickButtonNodeWithMouse(
  page: Page,
  client: CDPSession,
  nodeId: number,
): Promise<boolean> {
  await client.send("DOM.scrollIntoViewIfNeeded", { nodeId });
  await page.waitForTimeout(150);

  const center = await getNodeCenter(client, nodeId);
  if (!center) return false;

  await page.mouse.move(center.x, center.y);
  await page.waitForTimeout(80);
  await page.mouse.down();
  await page.waitForTimeout(50);
  await page.mouse.up();
  return true;
}

async function clickButtonNodeWithElementClick(
  client: CDPSession,
  nodeId: number,
): Promise<boolean> {
  try {
    const { object } = await client.send("DOM.resolveNode", { nodeId });
    await client.send("Runtime.callFunctionOn", {
      objectId: object.objectId,
      functionDeclaration: `function() {
        if (typeof this.focus === "function") this.focus();
        if (typeof this.click === "function") this.click();
      }`,
    });
    return true;
  } catch {
    return false;
  }
}

async function findScopedPublishButtonNodeId(page: Page): Promise<number | undefined> {
  const client = await page.context().newCDPSession(page);
  await client.send("DOM.enable");
  const { root } = await client.send("DOM.getDocument", { depth: -1, pierce: true });
  const hostNodeId = await findHostNodeId(client, root.nodeId);
  if (!hostNodeId) return undefined;
  return findPublishButtonUnderHost(client, hostNodeId);
}

async function clickNodeWithAccessibilityBackend(
  page: Page,
  client: CDPSession,
  backendNodeId: number,
): Promise<boolean> {
  try {
    const { object } = await client.send("DOM.resolveNode", { backendNodeId });
    await client.send("Runtime.callFunctionOn", {
      objectId: object.objectId,
      functionDeclaration: `function() {
        if (typeof this.focus === "function") this.focus();
        if (typeof this.click === "function") this.click();
      }`,
    });
    return true;
  } catch {
    try {
      const { model } = await client.send("DOM.getBoxModel", { backendNodeId });
      if (!model?.content || model.content.length < 8) return false;
      const xs = [model.content[0], model.content[2], model.content[4], model.content[6]];
      const ys = [model.content[1], model.content[3], model.content[5], model.content[7]];
      const x = xs.reduce((sum, value) => sum + value, 0) / xs.length;
      const y = ys.reduce((sum, value) => sum + value, 0) / ys.length;
      await page.mouse.move(x, y);
      await page.waitForTimeout(80);
      await page.mouse.down();
      await page.waitForTimeout(50);
      await page.mouse.up();
      return true;
    } catch {
      return false;
    }
  }
}

export async function clickPublishViaAccessibility(page: Page): Promise<PublishClickResult> {
  const client = await page.context().newCDPSession(page);
  await client.send("DOM.enable");
  await client.send("Accessibility.enable");

  const { nodes } = await client.send("Accessibility.getFullAXTree");
  const publishNodes = nodes.filter(
    (node) =>
      node.role?.value === "button" &&
      (node.name?.value === "发布" || node.name?.value?.includes("发布")),
  );

  for (const node of publishNodes) {
    if (!node.backendDOMNodeId) continue;
    if (await clickNodeWithAccessibilityBackend(page, client, node.backendDOMNodeId)) {
      return { clicked: true, method: "accessibility-cdp" };
    }
  }

  return { clicked: false };
}

export async function canFindPublishButtonViaCdp(page: Page): Promise<boolean> {
  const client = await page.context().newCDPSession(page);
  await client.send("Accessibility.enable");
  const { nodes } = await client.send("Accessibility.getFullAXTree");
  return nodes.some(
    (node) => node.role?.value === "button" && node.name?.value === "发布",
  );
}

export async function clickPublishViaCdp(page: Page): Promise<PublishClickResult> {
  const client = await page.context().newCDPSession(page);
  await client.send("DOM.enable");
  const { root } = await client.send("DOM.getDocument", { depth: -1, pierce: true });
  const hostNodeId = await findHostNodeId(client, root.nodeId);
  if (!hostNodeId) {
    return { clicked: false };
  }

  const buttonNodeId = await findPublishButtonUnderHost(client, hostNodeId);
  if (!buttonNodeId) {
    return { clicked: false };
  }

  if (await clickButtonNodeWithMouse(page, client, buttonNodeId)) {
    return { clicked: true, method: "cdp-mouse" };
  }

  if (await clickButtonNodeWithElementClick(client, buttonNodeId)) {
    return { clicked: true, method: "cdp-element-click" };
  }

  return { clicked: false };
}

export async function clickPublishViaHostLocator(page: Page): Promise<PublishClickResult> {
  const host = page.locator(XHS_PUBLISH_HOST_SELECTOR).first();
  await host.waitFor({ state: "visible" });
  await host.scrollIntoViewIfNeeded();

  const box = await host.boundingBox();
  if (!box || box.width < 80 || box.height < 20) {
    return { clicked: false };
  }

  const y = box.height / 2;
  for (const ratio of [0.78, 0.72, 0.85, 0.65]) {
    try {
      await host.click({
        position: { x: box.width * ratio, y },
        timeout: 3000,
      });
      return { clicked: true, method: "host-locator-position" };
    } catch {
      continue;
    }
  }

  return { clicked: false };
}

export async function clickPublishViaHostPosition(page: Page): Promise<PublishClickResult> {
  const host = page.locator(XHS_PUBLISH_HOST_SELECTOR).first();
  await host.waitFor({ state: "visible" });
  await host.scrollIntoViewIfNeeded();
  const box = await host.boundingBox();
  if (!box || box.width < 80) {
    return { clicked: false };
  }

  const x = box.x + box.width * 0.78;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.waitForTimeout(80);
  await page.mouse.down();
  await page.waitForTimeout(50);
  await page.mouse.up();
  return { clicked: true, method: "host-coordinate" };
}

export async function preparePageForPublishClick(page: Page): Promise<void> {
  await page.keyboard.press("Escape").catch(() => undefined);
  await page
    .locator('input[placeholder*="填写标题"]')
    .first()
    .click({ timeout: 2000 })
    .catch(() => undefined);
  await page.waitForTimeout(200);
}

export async function waitForPublishHostReady(page: Page, timeoutMs: number): Promise<void> {
  const host = page.locator(XHS_PUBLISH_HOST_SELECTOR).first();
  await host.waitFor({ state: "visible", timeout: timeoutMs });
  await host.scrollIntoViewIfNeeded();

  await page.waitForFunction(
    () => {
      const el = document.querySelector('xhs-publish-btn[is-publish="true"]');
      if (!el) return false;
      if (el.getAttribute("submit-disabled") === "true") return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 200 && rect.height > 30;
    },
    undefined,
    { timeout: timeoutMs },
  );
}

export async function waitForPublishSuccess(page: Page, timeoutMs: number): Promise<boolean> {
  const successUrlPattern = "**/publish/success?**";

  const result = await new Promise<boolean>((resolve) => {
    let pending = 3;
    let resolved = false;
    const finish = (ok: boolean) => {
      if (resolved) return;
      if (ok) {
        resolved = true;
        resolve(true);
        return;
      }
      pending -= 1;
      if (pending === 0) {
        resolved = true;
        resolve(page.url().includes("/publish/success"));
      }
    };

    page
      .waitForURL(successUrlPattern, { timeout: timeoutMs })
      .then(() => finish(true))
      .catch(() => finish(false));

    page
      .waitForResponse(
        (resp) => {
          const url = resp.url();
          const method = resp.request().method();
          return (
            method === "POST" &&
            url.includes("edith.xiaohongshu.com") &&
            /note|publish|post/i.test(url) &&
            resp.status() < 400
          );
        },
        { timeout: timeoutMs },
      )
      .then(() => finish(true))
      .catch(() => finish(false));

    page
      .getByText(/发布成功|笔记发布成功|提交成功/)
      .first()
      .waitFor({ state: "visible", timeout: timeoutMs })
      .then(() => finish(true))
      .catch(() => finish(false));
  });

  return result || page.url().includes("/publish/success");
}

export async function readPublishValidationMessage(page: Page): Promise<string | null> {
  const candidates = [
    page.getByText(/请输入正文|正文不能为空|请填写正文|笔记正文/),
    page.getByText(/请上传|图片不符合|发布失败|内容不符合/),
    page.locator(".d-message, .d-toast, [class*='toast'], [class*='message']").filter({
      hasText: /请|不能|失败|错误/,
    }),
  ];

  for (const candidate of candidates) {
    const item = candidate.first();
    try {
      await item.waitFor({ state: "visible", timeout: 1200 });
      const text = (await item.textContent())?.trim();
      if (text) return text;
    } catch {
      continue;
    }
  }

  return null;
}

export async function clickPublishWithStrategies(
  page: Page,
): Promise<{ clicked: boolean; method?: PublishClickMethod }> {
  await preparePageForPublishClick(page);

  const accessibilityResult = await clickPublishViaAccessibility(page);
  if (accessibilityResult.clicked) {
    return accessibilityResult;
  }

  const cdpResult = await clickPublishViaCdp(page);
  if (cdpResult.clicked) {
    return cdpResult;
  }

  const hostLocatorResult = await clickPublishViaHostLocator(page);
  if (hostLocatorResult.clicked) {
    return hostLocatorResult;
  }

  const hostResult = await clickPublishViaHostPosition(page);
  if (hostResult.clicked) {
    return hostResult;
  }

  const textButton = page.getByRole("button", { name: /^发布$/ }).first();
  if ((await textButton.count()) > 0) {
    await textButton.click({ timeout: 3000 });
    return { clicked: true, method: "playwright-locator" };
  }

  return { clicked: false };
}
