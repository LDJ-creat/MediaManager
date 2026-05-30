import fs from "node:fs";
import path from "node:path";
import type {
  BrowserContext,
  BrowserContextOptions,
  Cookie,
  Locator,
  Page,
  Response,
} from "playwright";
import { chromium } from "playwright";
import {
  XHS_CREATOR_HOME_URL,
  XHS_LOGIN_URL,
  XHS_PUBLISH_NOTE_URL,
} from "./common.js";
import {
  DEFAULT_IGNORE_DEFAULT_ARGS,
  DEFAULT_LAUNCH_ARGS,
  STEALTH_INIT_SCRIPT,
} from "./stealth-init.js";
import {
  canFindPublishButtonViaCdp,
  clickPublishWithStrategies,
  readPublishValidationMessage,
  waitForPublishHostReady,
  waitForPublishSuccess,
} from "./publish-button.js";
import type {
  AuthFileRef,
  CapturedResponse,
  CookieFileEntry,
  LoginCheckResult,
  NoteInput,
  PublishRequest,
  PublishResult,
  StorageStateFile,
} from "./types.js";

const XHS_LOGIN_BOX_SELECTOR = "div[class*='login-box']";
const XHS_PUBLISH_SUCCESS_URL_PATTERN = "**/publish/success?**";
const PUBLISH_RESPONSE_KEYWORDS = ["publish", "note", "post", "success"];

type StorageState = Exclude<BrowserContextOptions["storageState"], string | undefined>;

interface BrowserSession {
  browser: Awaited<ReturnType<typeof chromium.launch>> | null;
  context: BrowserContext;
  cdpAttached: boolean;
}

function normalizeCookie(input: CookieFileEntry): Cookie {
  return {
    name: input.name,
    value: input.value,
    domain: input.domain,
    path: input.path ?? "/",
    expires:
      typeof input.expires === "number"
        ? input.expires
        : typeof input.expirationDate === "number"
          ? input.expirationDate
          : -1,
    httpOnly: Boolean(input.httpOnly),
    secure: Boolean(input.secure),
    sameSite: input.sameSite ?? "Lax",
  };
}

function loadCookieFile(cookiePath: string): Cookie[] {
  const raw = fs.readFileSync(cookiePath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Cookie JSON must be an array of cookie objects");
  }

  const cookies: Cookie[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Partial<CookieFileEntry>;
    if (!candidate.name || !candidate.value || !candidate.domain) continue;
    cookies.push(normalizeCookie(candidate as CookieFileEntry));
  }

  if (cookies.length === 0) {
    throw new Error("No valid cookie entries found in cookie JSON");
  }

  return cookies;
}

function loadStorageStateFile(storageStatePath: string): StorageState {
  const raw = fs.readFileSync(storageStatePath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as StorageStateFile).cookies)) {
    throw new Error("Storage state JSON must be an object with a cookies array");
  }

  const state = parsed as StorageStateFile;
  return {
    cookies: state.cookies.map((cookie) => ({
      ...cookie,
      path: cookie.path ?? "/",
      expires:
        typeof cookie.expires === "number"
          ? cookie.expires
          : typeof cookie.expirationDate === "number"
            ? cookie.expirationDate
            : -1,
      httpOnly: Boolean(cookie.httpOnly),
      secure: Boolean(cookie.secure),
      sameSite: cookie.sameSite ?? "Lax",
    })),
    origins:
      state.origins?.map((origin) => ({
        origin: origin.origin,
        localStorage: origin.localStorage ?? [],
      })) ?? [],
  };
}

async function applyStorageStateOrigins(context: BrowserContext, state: StorageState): Promise<void> {
  for (const origin of state.origins ?? []) {
    if (!origin.localStorage?.length) continue;
    const page = await context.newPage();
    try {
      await page.goto(origin.origin, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.evaluate(
        (items: Array<{ name: string; value: string }>) => {
          for (const item of items) {
            localStorage.setItem(item.name, item.value);
          }
        },
        origin.localStorage,
      );
    } finally {
      await page.close();
    }
  }
}

async function createBrowserSession(
  authFile: AuthFileRef | undefined,
  headless: boolean,
  cdpUrl?: string,
): Promise<BrowserSession> {
  if (cdpUrl) {
    const browser = await chromium.connectOverCDP(cdpUrl);
    const context = browser.contexts()[0];
    if (!context) {
      throw new Error(`No browser context found via CDP: ${cdpUrl}`);
    }

    if (authFile?.kind === "cookie") {
      await context.addCookies(loadCookieFile(authFile.path));
    } else if (authFile?.kind === "storage-state") {
      const state = loadStorageStateFile(authFile.path);
      await context.addCookies(state.cookies);
      await applyStorageStateOrigins(context, state);
    }

    return { browser, context, cdpAttached: true };
  }

  if (!authFile) {
    throw new Error("Auth file is required unless --cdp-url is provided");
  }

  const browser = await chromium.launch({
    headless,
    channel: "chrome",
    ignoreDefaultArgs: DEFAULT_IGNORE_DEFAULT_ARGS,
    args: DEFAULT_LAUNCH_ARGS,
  });
  const contextOptions: BrowserContextOptions = {
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    viewport: { width: 1440, height: 960 },
    permissions: ["geolocation"],
    geolocation: { latitude: 31.2304, longitude: 121.4737 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  };

  const context =
    authFile.kind === "storage-state"
      ? await browser.newContext({
          ...contextOptions,
          storageState: loadStorageStateFile(authFile.path),
        })
      : await browser.newContext(contextOptions);

  await context.addInitScript(STEALTH_INIT_SCRIPT);

  if (authFile.kind === "cookie") {
    await context.addCookies(loadCookieFile(authFile.path));
  }

  return { browser, context, cdpAttached: false };
}

async function closeBrowserSession(session: BrowserSession): Promise<void> {
  if (session.cdpAttached) {
    await session.browser?.close();
    return;
  }
  await session.context.close();
  await session.browser?.close();
}

async function isLoginBoxVisible(page: Page): Promise<boolean> {
  const loginBox = page.locator(XHS_LOGIN_BOX_SELECTOR).first();
  if ((await loginBox.count()) === 0) {
    return false;
  }
  try {
    return await loginBox.isVisible();
  } catch {
    return false;
  }
}

export async function checkLoginSession(
  authFile: AuthFileRef | undefined,
  headless: boolean,
  timeoutMs: number,
  cdpUrl?: string,
): Promise<LoginCheckResult> {
  const session = await createBrowserSession(authFile, headless, cdpUrl);
  try {
    const page = await session.context.newPage();
    await page.goto(XHS_PUBLISH_NOTE_URL, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });
    await page.waitForTimeout(3000);

    if (page.url().startsWith(XHS_LOGIN_URL)) {
      return {
        valid: false,
        finalUrl: page.url(),
        message: "Redirected to login page; storage state is invalid or expired",
      };
    }

    if (await isLoginBoxVisible(page)) {
      return {
        valid: false,
        finalUrl: page.url(),
        message: "Login box is still visible on publish page",
      };
    }

    return {
      valid: true,
      finalUrl: page.url(),
      message: "Creator publish page is reachable with current auth state",
    };
  } finally {
    await closeBrowserSession(session);
  }
}

function isPublishResponse(url: string): boolean {
  const lower = url.toLowerCase();
  return PUBLISH_RESPONSE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

async function tryParseResponsePayload(response: Response): Promise<unknown> {
  try {
    const contentType = response.headers()["content-type"] ?? "";
    if (contentType.includes("json")) {
      return await response.json();
    }
    return await response.text();
  } catch {
    return null;
  }
}

async function fillTitle(page: Page, title: string): Promise<void> {
  const titleInput = page.locator('input[placeholder*="填写标题"]');
  await titleInput.fill(title);
}

async function fillDesc(page: Page, note: string): Promise<void> {
  if (!note.trim()) return;

  const desc = page.locator('p[data-placeholder*="输入正文描述"], .ProseMirror').first();
  await desc.click();
  await page.keyboard.press("Control+KeyA");
  await page.keyboard.press("Delete");
  await page.keyboard.type(note, { delay: 20 });
  await page.waitForTimeout(300);

  try {
    await page.waitForFunction(
      (minLength) => {
        const prose = document.querySelector(".ProseMirror");
        const proseText = (prose?.textContent ?? "").trim();
        if (proseText.length >= minLength) return true;

        const counterMatch = document.body.innerText.match(/(\d+)\/1000/);
        if (counterMatch && Number(counterMatch[1]) >= minLength) return true;

        const placeholder = document.querySelector('p[data-placeholder*="输入正文描述"]');
        const placeholderText = (placeholder?.textContent ?? "").trim();
        return placeholderText.length >= minLength;
      },
      Math.min(note.trim().length, 1),
      { timeout: 8000 },
    );
  } catch {
    const proseText = await page
      .locator(".ProseMirror")
      .first()
      .textContent()
      .catch(() => "");
    if ((proseText ?? "").trim().length >= 1) {
      return;
    }
    throw new Error("Failed to fill note description in ProseMirror editor");
  }
}

async function fillTags(page: Page, tags: string[], hasDesc: boolean): Promise<string[]> {
  const warnings: string[] = [];
  if (tags.length === 0) return warnings;

  if (!hasDesc) {
    const desc = page.locator('p[data-placeholder*="输入正文描述"]');
    await desc.click();
  }

  for (const tag of tags) {
    try {
      await page.keyboard.type(`#${tag}`, { delay: 30 });
      const topicContainer = page.locator("#creator-editor-topic-container");
      await topicContainer.waitFor({ state: "visible", timeout: 3000 });
      const firstItem = topicContainer.locator(".item").first();
      await firstItem.waitFor({ state: "visible", timeout: 2000 });
      await firstItem.click();
    } catch {
      warnings.push(`Failed to apply topic tag: ${tag}`);
    }
  }

  return warnings;
}

async function waitForPublishControlsReady(page: Page, timeoutMs: number): Promise<void> {
  const locatorCandidates = [
    page.getByRole("button", { name: /^发布$/ }),
    page.locator('button:has-text("发布")'),
    page.locator("xhs-publish-btn >> button.ce-btn.bg-red"),
    page.locator(".publish-page-publish-btn button.ce-btn.bg-red"),
  ];

  const locatorDeadline = Date.now() + Math.min(timeoutMs, 8000);
  while (Date.now() < locatorDeadline) {
    for (const candidate of locatorCandidates) {
      const button = candidate.first();
      if ((await button.count()) === 0) continue;
      try {
        await button.waitFor({ state: "visible", timeout: 1500 });
        await button.scrollIntoViewIfNeeded();
        return;
      } catch {
        continue;
      }
    }
    await page.waitForTimeout(400);
  }

  await waitForPublishHostReady(page, timeoutMs);

  if (await canFindPublishButtonViaCdp(page)) {
    return;
  }

  const host = page.locator('xhs-publish-btn[is-publish="true"]').first();
  const box = await host.boundingBox();
  if (box && box.width > 200) {
    return;
  }

  throw new Error(
    `Publish controls not ready within ${timeoutMs}ms (xhs-publish-btn host box: ${JSON.stringify(box)})`,
  );
}

async function clickPublish(page: Page, warnings: string[]): Promise<void> {
  const result = await clickPublishWithStrategies(page);
  if (!result.clicked || !result.method) {
    throw new Error("Could not click 发布 button with any strategy");
  }
  warnings.push(`Clicked 发布 via ${result.method}`);
}

async function submitPublish(
  page: Page,
  timeoutMs: number,
): Promise<{ success: boolean; message: string; warnings: string[] }> {
  const warnings: string[] = [];
  const perAttemptWaitMs = Math.min(Math.max(timeoutMs / 3, 15_000), 30_000);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await waitForPublishHostReady(page, 10_000);
      await clickPublish(page, warnings);

      const success = await waitForPublishSuccess(page, perAttemptWaitMs);
      if (success) {
        return {
          success: true,
          message: "Xiaohongshu note published successfully",
          warnings,
        };
      }

      warnings.push(`Publish attempt ${attempt} did not reach success page yet`);
      const validation = await readPublishValidationMessage(page);
      if (validation) {
        warnings.push(`Publish validation message: ${validation}`);
      }
    } catch (error) {
      warnings.push(
        `Publish attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (page.url().includes("/publish/success")) {
      return {
        success: true,
        message: "Xiaohongshu note published successfully",
        warnings,
      };
    }

    await page.waitForTimeout(800);
  }

  return {
    success: false,
    message: "Timed out waiting for publish success page after clicking 发布",
    warnings,
  };
}

async function waitForUploadReady(page: Page, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const titleContainer = page.locator('input[placeholder*="填写标题"]').first();
    try {
      await titleContainer.waitFor({ state: "visible", timeout: 2000 });
      return;
    } catch {
      await page.waitForTimeout(1000);
    }
  }
  throw new Error("Timed out waiting for image upload to finish");
}

async function findUploadInput(page: Page): Promise<Locator> {
  let uploadInput = page.locator('input[type="file"][accept*="image"]').first();
  if ((await uploadInput.count()) === 0) {
    uploadInput = page.locator("div[class^='upload-content'] input[class='upload-input']").first();
  }
  await uploadInput.waitFor({ state: "attached", timeout: 30_000 });
  return uploadInput;
}

async function uploadNoteContent(
  page: Page,
  note: NoteInput,
  timeoutMs: number,
  _capturedResponses: CapturedResponse[],
): Promise<{ warnings: string[]; finalUrl: string; success: boolean; message: string }> {
  const warnings: string[] = [];

  await page.goto(XHS_PUBLISH_NOTE_URL, {
    waitUntil: "domcontentloaded",
    timeout: timeoutMs,
  });
  await page.waitForURL(/publish\/publish/, { timeout: timeoutMs });

  if (page.url().startsWith(XHS_LOGIN_URL) || (await isLoginBoxVisible(page))) {
    throw new Error("Login required: publish page redirected to login or shows login box");
  }

  const uploadInput = await findUploadInput(page);
  await uploadInput.setInputFiles(note.imagePaths);
  await waitForUploadReady(page, timeoutMs);

  await fillTitle(page, note.title);
  await fillDesc(page, note.note);
  const tagWarnings = await fillTags(page, note.tags, Boolean(note.note.trim()));
  warnings.push(...tagWarnings);

  await page.waitForTimeout(500);
  await waitForPublishControlsReady(page, timeoutMs);

  const publishResult = await submitPublish(page, timeoutMs);
  warnings.push(...publishResult.warnings);

  return {
    warnings,
    finalUrl: page.url(),
    success: publishResult.success,
    message: publishResult.message,
  };
}

export async function publishNote(request: PublishRequest): Promise<PublishResult> {
  const warnings: string[] = [];
  const capturedResponses: CapturedResponse[] = [];
  let screenshotPath: string | undefined;
  let finalUrl = XHS_PUBLISH_NOTE_URL;

  if (!request.cdpUrl) {
    return {
      generatedAt: new Date().toISOString(),
      mode: "publish",
      title: request.note.title,
      note: request.note.note,
      tags: request.note.tags,
      imagePaths: request.note.imagePaths,
      finalUrl,
      success: false,
      message: "--cdp-url is required for publish",
      warnings,
      capturedResponses,
    };
  }

  warnings.push(`Using CDP browser at ${request.cdpUrl}`);

  const session = await createBrowserSession(
    request.authFile,
    request.headless,
    request.cdpUrl,
  );

  try {
    const page = await session.context.newPage();
    page.on("response", async (response) => {
      const url = response.url();
      if (!isPublishResponse(url)) return;
      capturedResponses.push({
        url,
        status: response.status(),
        payload: await tryParseResponsePayload(response),
      });
    });

    const uploadResult = await uploadNoteContent(
      page,
      request.note,
      request.timeoutMs,
      capturedResponses,
    );
    warnings.push(...uploadResult.warnings);
    finalUrl = uploadResult.finalUrl;

    if (!uploadResult.success) {
      let failureScreenshot: string | undefined;
      if (!request.headless || request.cdpUrl) {
        try {
          const outputDir = path.resolve(process.cwd(), "xhs-output");
          fs.mkdirSync(outputDir, { recursive: true });
          failureScreenshot = path.join(outputDir, `xhs-publish-failure-${Date.now()}.png`);
          await page.screenshot({ path: failureScreenshot, fullPage: true });
          warnings.push(`Failure screenshot saved: ${failureScreenshot}`);
        } catch {
          // ignore screenshot errors
        }
      }

      return {
        generatedAt: new Date().toISOString(),
        mode: "publish",
        title: request.note.title,
        note: request.note.note,
        tags: request.note.tags,
        imagePaths: request.note.imagePaths,
        finalUrl,
        success: false,
        message: uploadResult.message,
        warnings,
        capturedResponses,
        screenshotPath: failureScreenshot,
      };
    }

    if (request.authFile?.kind === "storage-state" && !session.cdpAttached) {
      await session.context.storageState({ path: request.authFile.path });
    }

    return {
      generatedAt: new Date().toISOString(),
      mode: "publish",
      title: request.note.title,
      note: request.note.note,
      tags: request.note.tags,
      imagePaths: request.note.imagePaths,
      finalUrl,
      success: true,
      message: "Xiaohongshu note published",
      warnings,
      capturedResponses,
    };
  } catch (error) {
    if (!request.headless || request.cdpUrl) {
      try {
        const page = session.context.pages().slice(-1)[0];
        if (page) {
          const outputDir = path.resolve(process.cwd(), "xhs-output");
          fs.mkdirSync(outputDir, { recursive: true });
          screenshotPath = path.join(outputDir, `xhs-publish-failure-${Date.now()}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          warnings.push(`Failure screenshot saved: ${screenshotPath}`);
        }
      } catch {
        // ignore screenshot errors
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      mode: "publish",
      title: request.note.title,
      note: request.note.note,
      tags: request.note.tags,
      imagePaths: request.note.imagePaths,
      finalUrl,
      success: false,
      message: error instanceof Error ? error.message : String(error),
      warnings,
      capturedResponses,
      screenshotPath,
    };
  } finally {
    await closeBrowserSession(session);
  }
}
