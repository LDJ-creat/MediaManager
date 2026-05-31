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
import type {
  ArticleInput,
  AuthFileRef,
  CapturedResponse,
  ConcretePageType,
  CookieFileEntry,
  CoverUploadResult,
  CrawlResult,
  PageFallbackState,
  PublishRequest,
  PublishResult,
  StorageStateFile,
} from "./types.js";

const CREATOR_HOME_URL = "https://mp.csdn.net/";
const EDITOR_URL = "https://editor.csdn.net/md/?not_checkout=1&spm=1015.2103.3001.8066";
const ANALYTICS_URL = "https://mp.csdn.net/mp_blog/analysis/article/single";
const MANAGE_URL = "https://mp.csdn.net/mp_blog/manage/article?spm=1011.2415.3001.10336";

const PAGE_URLS: Record<ConcretePageType, string> = {
  analytics: ANALYTICS_URL,
  manage: MANAGE_URL,
};

const CAPTURE_KEYWORDS: Record<ConcretePageType, string[]> = {
  analytics: ["analysis", "article", "trend", "stat", "overview", "data"],
  manage: ["manage", "article", "list", "status", "search", "blog"],
};

const LOGIN_HINTS = ["微信登录", "验证码登录", "登录可享更多权益", "扫一扫，快速登录", "passport.csdn.net"];

type StorageState = Exclude<BrowserContextOptions["storageState"], string | undefined>;

interface CrawlOptions {
  authFile: AuthFileRef;
  pageTypes: ConcretePageType[];
  start?: string;
  end?: string;
  timeoutMs: number;
  headless: boolean;
}

interface AnalyticsRange {
  start: string;
  end: string;
  startTimestamp: number;
  endTimestamp: number;
}

interface RecentArticleRef {
  articleId: string;
}

interface SessionInfo {
  finalUrl: string;
  pageTitle: string;
  bodyPreview: string;
}

function normalizeCookie(input: CookieFileEntry): Cookie {
  return {
    name: input.name,
    value: input.value,
    domain: input.domain,
    path: input.path ?? "/",
    expires: typeof input.expires === "number"
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
      expires: typeof cookie.expires === "number"
        ? cookie.expires
        : typeof cookie.expirationDate === "number"
          ? cookie.expirationDate
          : -1,
      httpOnly: Boolean(cookie.httpOnly),
      secure: Boolean(cookie.secure),
      sameSite: cookie.sameSite ?? "Lax",
    })),
    origins: state.origins?.map((origin) => ({
      origin: origin.origin,
      localStorage: origin.localStorage ?? [],
    })) ?? [],
  };
}

async function createAuthenticatedContext(authFile: AuthFileRef, headless: boolean): Promise<{ browser: Awaited<ReturnType<typeof chromium.launch>>; context: BrowserContext }> {
  const browser = await chromium.launch({ headless });
  const contextOptions: BrowserContextOptions = {
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    viewport: { width: 1440, height: 960 },
  };

  const context = authFile.kind === "storage-state"
    ? await browser.newContext({
      ...contextOptions,
      storageState: loadStorageStateFile(authFile.path),
    })
    : await browser.newContext(contextOptions);

  if (authFile.kind === "cookie") {
    await context.addCookies(loadCookieFile(authFile.path));
  }

  return { browser, context };
}

async function safePageText(page: Page, selector: string): Promise<string> {
  return page.locator(selector).innerText().then((value) => value.slice(0, 1500)).catch(() => "");
}

async function snapshotFallbackState(page: Page): Promise<PageFallbackState | undefined> {
  return page.evaluate(() => {
    const normalize = (value: string): string => value.replace(/\s+/g, " ").trim();
    const visibleText = (element: Element): string => normalize((element.textContent ?? "").trim());

    const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4"))
      .map((element) => visibleText(element))
      .filter(Boolean)
      .slice(0, 20);

    const tables = Array.from(document.querySelectorAll("table"))
      .map((table) => {
        const headerCells = Array.from(table.querySelectorAll("thead th, tr th"))
          .map((element) => visibleText(element))
          .filter(Boolean);
        const rows = Array.from(table.querySelectorAll("tbody tr"))
          .map((row) => Array.from(row.querySelectorAll("td"))
            .map((cell) => visibleText(cell))
            .filter((value) => value.length > 0))
          .filter((row) => row.length > 0)
          .slice(0, 100);

        return { headers: headerCells, rows };
      })
      .filter((item) => item.headers.length > 0 || item.rows.length > 0)
      .slice(0, 10);

    const cards = Array.from(document.querySelectorAll("div, li, span, p"))
      .map((element) => visibleText(element))
      .filter((text) => text.length >= 2 && text.length <= 40 && /\d/.test(text))
      .slice(0, 200)
      .map((text) => ({ text }));

    return headings.length > 0 || tables.length > 0 || cards.length > 0
      ? { headings, tables, cards }
      : undefined;
  }).catch(() => undefined);
}

function shouldCapture(response: Response, pageType: ConcretePageType): boolean {
  const url = response.url().toLowerCase();
  const requestType = response.request().resourceType();
  if (requestType !== "xhr" && requestType !== "fetch") return false;
  if (!url.includes("csdn.net")) return false;
  return CAPTURE_KEYWORDS[pageType].some((item) => url.includes(item));
}

async function safeParseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers()["content-type"] || "";
  if (contentType.includes("application/json") || contentType.includes("text/json")) {
    try {
      return await response.json();
    } catch {
      try {
        return { parseError: "response.json failed", fallbackText: await response.text() };
      } catch (error) {
        return {
          parseError: "response body unavailable",
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  }

  let text = "";
  try {
    text = await response.text();
  } catch (error) {
    return {
      parseError: "response body unavailable",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

async function collectSessionInfo(authFile: AuthFileRef, headless: boolean, timeoutMs: number): Promise<SessionInfo> {
  const { browser, context } = await createAuthenticatedContext(authFile, headless);
  const page = await context.newPage();

  await page.goto(CREATOR_HOME_URL, { waitUntil: "domcontentloaded", timeout: timeoutMs });
  await page.waitForLoadState("networkidle", { timeout: timeoutMs }).catch(() => undefined);

  const finalUrl = page.url();
  const pageTitle = await page.title().catch(() => "");
  const bodyPreview = await safePageText(page, "body");

  await context.close();
  await browser.close();

  return { finalUrl, pageTitle, bodyPreview };
}

function formatShanghaiDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
  }).format(date);
}

export function resolveAnalyticsRange(start?: string, end?: string): AnalyticsRange {
  if (start && end) {
    return {
      start,
      end,
      startTimestamp: Math.floor(new Date(`${start}T00:00:00+08:00`).getTime() / 1_000),
      endTimestamp: Math.floor(new Date(`${end}T23:59:59+08:00`).getTime() / 1_000),
    };
  }

  const now = Date.now();
  const startDate = new Date(now - 7 * 86_400_000);
  const endDate = new Date(now - 86_400_000);
  return {
    start: formatShanghaiDate(startDate),
    end: formatShanghaiDate(endDate),
    startTimestamp: Math.floor(startDate.getTime() / 1_000),
    endTimestamp: Math.floor(endDate.getTime() / 1_000),
  };
}

function extractRecentArticlesFromResponses(responses: CapturedResponse[]): RecentArticleRef[] {
  for (let index = responses.length - 1; index >= 0; index -= 1) {
    const response = responses[index];
    if (!response.url.includes("/single-article-list")) continue;
    const payload = response.payload as {
      data?: {
        list?: Array<Record<string, unknown>>;
      };
    } | undefined;
    const list = payload?.data?.list;
    if (!Array.isArray(list)) continue;
    const recentArticles: Array<RecentArticleRef | undefined> = list
      .map((item) => {
        const articleId = item.articleId;
        if (typeof articleId !== "string" && typeof articleId !== "number") {
          return undefined;
        }
        return {
          articleId: String(articleId),
        } satisfies RecentArticleRef;
      });
    return recentArticles.filter((item): item is RecentArticleRef => item !== undefined);
  }

  return [];
}

async function captureRecentArticleDetails(page: Page, responses: CapturedResponse[], _range: AnalyticsRange): Promise<void> {
  const recentArticles = extractRecentArticlesFromResponses(responses).slice(0, 5);
  for (const [index, article] of recentArticles.entries()) {
    const waitForStatistics = page.waitForResponse((response) => {
      return response.url().includes("/single-article-statistics")
        && response.url().includes(`articleId=${article.articleId}`)
        && response.ok();
    }, { timeout: 15_000 }).catch(() => undefined);

    const waitForQualityScore = page.waitForResponse((response) => {
      return response.url().includes("/quality-score-list")
        && response.url().includes(`articleId=${article.articleId}`)
        && response.ok();
    }, { timeout: 15_000 }).catch(() => undefined);

    await page.locator(".btn-single-operate").nth(index).click({ timeout: 5_000 });
    await Promise.all([waitForStatistics, waitForQualityScore]);
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

    const closeButton = page.locator(".article-drawer .el-icon-close").first();
    if (await ensureVisible(closeButton)) {
      await closeButton.click({ timeout: 2_000 }).catch(() => undefined);
    await page.waitForTimeout(300);
    }
  }
}


async function crawlSinglePage(pageType: ConcretePageType, authFile: AuthFileRef, timeoutMs: number, headless: boolean, range: AnalyticsRange): Promise<CrawlResult> {
  const { browser, context } = await createAuthenticatedContext(authFile, headless);
  const page = await context.newPage();
  const responses: CapturedResponse[] = [];

  page.on("response", async (response) => {
    if (!shouldCapture(response, pageType)) return;
    const payload = await safeParseResponse(response);
    responses.push({
      pageType,
      url: response.url(),
      status: response.status(),
      contentType: response.headers()["content-type"] || "",
      capturedAt: new Date().toISOString(),
      payload,
    });
  });

  await page.goto(PAGE_URLS[pageType], { waitUntil: "domcontentloaded", timeout: timeoutMs });
  await page.waitForLoadState("networkidle", { timeout: timeoutMs }).catch(() => undefined);

  if (pageType === "analytics") {
    await captureRecentArticleDetails(page, responses, range);
    await page.waitForLoadState("networkidle", { timeout: timeoutMs }).catch(() => undefined);
  }

  const finalUrl = page.url();
  const pageTitle = await page.title().catch(() => "");
  const bodyPreview = await safePageText(page, "body");
  const fallbackState = await snapshotFallbackState(page);

  await context.close();
  await browser.close();

  return {
    pageType,
    targetUrl: PAGE_URLS[pageType],
    finalUrl,
    pageTitle,
    bodyPreview,
    responses,
    fallbackState,
  };
}

export async function inspectCreatorSession(authFile: AuthFileRef, headless: boolean, timeoutMs: number): Promise<SessionInfo> {
  return collectSessionInfo(authFile, headless, timeoutMs);
}

export function detectLoginIssue(items: Array<Pick<CrawlResult, "finalUrl" | "pageTitle" | "bodyPreview">>): string | null {
  for (const item of items) {
    const haystack = `${item.finalUrl}\n${item.pageTitle ?? ""}\n${item.bodyPreview ?? ""}`;
    if (item.finalUrl.includes("passport.csdn.net") || LOGIN_HINTS.some((hint) => haystack.includes(hint))) {
      return `Detected login page or expired auth state: ${item.finalUrl}`;
    }
  }
  return null;
}

export async function crawlAnalytics(options: CrawlOptions): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const range = resolveAnalyticsRange(options.start, options.end);
  for (const pageType of options.pageTypes) {
    results.push(await crawlSinglePage(pageType, options.authFile, options.timeoutMs, options.headless, range));
  }
  return results;
}

async function ensureVisible(locator: Locator): Promise<boolean> {
  try {
    return await locator.isVisible();
  } catch {
    return false;
  }
}

async function fillLocator(locator: Locator, value: string): Promise<boolean> {
  if (!(await ensureVisible(locator))) return false;
  try {
    await locator.click({ timeout: 1_000 });
  } catch {
    return false;
  }

  try {
    await locator.fill(value, { timeout: 1_500 });
    return true;
  } catch {
    try {
      await locator.evaluate((element, text) => {
        const node = element as any;
        if (typeof node.focus === "function") node.focus();
        if ("value" in node) {
          node.value = text;
          node.dispatchEvent(new Event("input", { bubbles: true }));
          node.dispatchEvent(new Event("change", { bubbles: true }));
          return;
        }
        if (node.isContentEditable) {
          node.textContent = text;
          node.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }, value);
      return true;
    } catch {
      return false;
    }
  }
}

async function typeInEditor(page: Page, content: string): Promise<boolean> {
  const markdownEditor = page.locator("pre.editor__inner[contenteditable='true']").first();
  if (await ensureVisible(markdownEditor)) {
    try {
      await markdownEditor.click({ timeout: 1_500 });
      await page.keyboard.press("Control+A").catch(() => undefined);
      await page.keyboard.press("Backspace").catch(() => undefined);
      await page.keyboard.insertText(content);
      return true;
    } catch {
      try {
        await markdownEditor.evaluate((element, text) => {
          element.textContent = text;
          element.dispatchEvent(new InputEvent("input", { bubbles: true, data: text, inputType: "insertText" }));
        }, content);
        return true;
      } catch {
        // Fall through to other editor strategies.
      }
    }
  }

  const ckeditorFrame = page.locator("iframe.cke_wysiwyg_frame").first();
  if (await ensureVisible(ckeditorFrame)) {
    try {
      const frame = await ckeditorFrame.elementHandle();
      const contentFrame = await frame?.contentFrame();
      const body = contentFrame?.locator("body[contenteditable='true']").first();
      if (body && await ensureVisible(body)) {
        await body.click({ timeout: 1_500 });
        await body.evaluate((element) => {
          element.innerHTML = "";
        });
        await page.keyboard.press("Control+A").catch(() => undefined);
        await page.keyboard.insertText(content);
        return true;
      }
    } catch {
      // Fall through to other editor strategies.
    }
  }

  const selectors = [
    ".monaco-editor textarea",
    ".CodeMirror textarea",
    ".cm-editor textarea",
    ".cm-content[contenteditable='true']",
    "textarea[data-testid='markdown-editor']",
    "textarea[placeholder*='Markdown']",
    "textarea",
    "[contenteditable='true']",
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (!(await ensureVisible(locator))) continue;
    try {
      await locator.click({ timeout: 1_500 });
      await page.keyboard.press("Control+A").catch(() => undefined);
      await page.keyboard.insertText(content);
      return true;
    } catch {
      if (await fillLocator(locator, content)) {
        return true;
      }
    }
  }

  return false;
}

async function clickButtonByPattern(page: Page, patterns: RegExp[]): Promise<boolean> {
  for (const pattern of patterns) {
    const button = page.getByRole("button", { name: pattern }).first();
    if (await ensureVisible(button)) {
      await button.click({ timeout: 5000 }).catch(async () => {
        await button.click({ force: true, timeout: 2000 }).catch(async () => {
          await button.evaluate(b => (b as HTMLElement).click());
        });
      });
      return true;
    }

    const textTarget = page.locator("button, a, span, div").filter({ hasText: pattern }).first();
    if (await ensureVisible(textTarget)) {
      await textTarget.click({ timeout: 5000 }).catch(async () => {
        await textTarget.click({ force: true, timeout: 2000 }).catch(async () => {
          await textTarget.evaluate(b => (b as HTMLElement).click());
        });
      });
      return true;
    }
  }
  return false;
}

async function fillTitle(page: Page, value: string): Promise<boolean> {
  // 新版编辑器默认展示 .article-bar__title-display，真实 input 为 display:none，需先点击激活。
  await page.waitForSelector(
    "input.article-bar__title, input.article-bar__title--input, .article-bar__title-display, #txtTitle, textarea#txtTitle, input[placeholder*='标题'], textarea[placeholder*='标题'], textarea.input__title",
    { timeout: 15_000 }
  ).catch(() => undefined);

  const titleInput = page.locator("input.article-bar__title, input.article-bar__title--input").first();
  if (!(await titleInput.isVisible().catch(() => false))) {
    const titleDisplay = page.locator(".article-bar__title-display").first();
    if (await ensureVisible(titleDisplay)) {
      await titleDisplay.click({ timeout: 3_000 }).catch(() => undefined);
    } else {
      await page.locator(".layout__panel--articletitle-bar, .article-bar").first().click({ force: true, timeout: 3_000 }).catch(() => undefined);
    }
    await page.waitForTimeout(500);
  }

  const selectors = [
    "input.article-bar__title",
    "input.article-bar__title--input",
    "#txtTitle",
    "textarea#txtTitle",
    "input[placeholder*='请输入文章标题']",
    "textarea[placeholder*='请输入文章标题']",
    "textarea[placeholder*='文章标题']",
    "textarea.input__title",
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (!(await locator.count())) continue;
    if (await fillLocator(locator, value)) {
      return true;
    }
    const filled = await locator.evaluate((element, text) => {
      const node = element as HTMLInputElement;
      node.style.display = "block";
      node.style.visibility = "visible";
      node.value = text;
      node.dispatchEvent(new Event("input", { bubbles: true }));
      node.dispatchEvent(new Event("change", { bubbles: true }));
      return node.value === text;
    }, value).catch(() => false);
    if (filled) {
      return true;
    }
  }

  return fillByKeywords(page, ["请输入文章标题", "文章标题", "标题"], value);
}

async function fillByKeywords(page: Page, keywords: string[], value: string): Promise<boolean> {
  const selectors: string[] = [];
  for (const keyword of keywords) {
    selectors.push(
      `input[placeholder*='${keyword}']`,
      `textarea[placeholder*='${keyword}']`,
      `[contenteditable='true'][data-placeholder*='${keyword}']`,
      `[contenteditable='true'][placeholder*='${keyword}']`,
      `[role='textbox'][aria-label*='${keyword}']`,
      `input[aria-label*='${keyword}']`,
    );
  }

  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await fillLocator(locator, value)) {
      return true;
    }
  }

  return false;
}

async function chooseCategory(page: Page, category: string): Promise<boolean> {
  const selectors = [
    "input[placeholder*='分类']",
    "[role='combobox'][aria-label*='分类']",
    "input[placeholder*='频道']",
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (!(await ensureVisible(locator))) continue;
    try {
      await locator.click({ timeout: 1_000 });
      await locator.fill(category, { timeout: 1_000 }).catch(async () => {
        await page.keyboard.insertText(category);
      });
      const option = page.locator("li, div[role='option'], .option, .dropdown-item").filter({ hasText: new RegExp(category) }).first();
      if (await ensureVisible(option)) {
        await option.click({ timeout: 1_000 });
      } else {
        await page.keyboard.press("Enter").catch(() => undefined);
      }
      return true;
    } catch {
      continue;
    }
  }

  return false;
}

function looksSuccessful(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const source = payload as Record<string, unknown>;
  if (source.success === true) return true;
  if (source.code === 0 || source.code === 200) return true;
  if (typeof source.msg === "string" && /成功/.test(source.msg)) return true;
  if (typeof source.message === "string" && /成功/.test(source.message)) return true;
  return false;
}

function isDraftSaveUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes("/blog-console-api/v1/postedit/savearticle")
    || lower.includes("/blog-console-api/v3/mdeditor/savearticle");
}

function isDraftSavePayload(payload: unknown): payload is Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const source = payload as Record<string, unknown>;
  if (source.code !== 200) return false;
  const data = source.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const record = data as Record<string, unknown>;
  const articleId = record.article_id ?? record.articleId ?? record.id;
  // 注意：草稿保存接口有时不会返回 articleUrl（或返回在其它响应里），仅凭 articleId 也应视为保存成功。
  return (typeof articleId === "number" || typeof articleId === "string");
}

async function closePublishDialogIfNeeded(page: Page, dialog: Locator): Promise<void> {
  // 尽量在草稿保存后退出弹窗，避免 UI 不弹 toast 时“看起来卡住”。
  const closeCandidates = [
    dialog.locator("button[aria-label*='关闭'], button[aria-label*='close']").first(),
    dialog.locator(".el-dialog__headerbtn, .el_mcm-dialog__headerbtn").first(),
    dialog.locator(".el-dialog__close, .el_mcm-dialog__close").first(),
    dialog.locator("button").filter({ hasText: /^×$/ }).first(),
  ];

  for (const candidate of closeCandidates) {
    if (await ensureVisible(candidate)) {
      await candidate.click({ timeout: 2_000 }).catch(() => undefined);
      await page.waitForTimeout(200);
      return;
    }
  }

  await page.keyboard.press("Escape").catch(() => undefined);
  await page.waitForTimeout(200);
}

function walkNode(node: unknown, visit: (value: unknown) => void): void {
  visit(node);
  if (Array.isArray(node)) {
    for (const item of node) {
      walkNode(item, visit);
    }
    return;
  }
  if (node && typeof node === "object") {
    for (const value of Object.values(node as Record<string, unknown>)) {
      walkNode(value, visit);
    }
  }
}

function extractPublishInfo(responses: Array<{ url: string; status: number; payload: unknown }>): { articleId?: string; articleUrl?: string; message?: string; success: boolean } {
  let articleId: string | undefined;
  let articleUrl: string | undefined;
  let message: string | undefined;
  let success = false;

  const isValidId = (value: unknown): value is string | number => {
    if (typeof value === "number") return Number.isFinite(value) && value > 0;
    if (typeof value === "string") return value.trim() !== "" && value.trim() !== "0";
    return false;
  };

  for (const response of responses) {
    if (isDraftSaveUrl(response.url) && isDraftSavePayload(response.payload)) {
      const data = response.payload.data as Record<string, unknown>;
      articleId = String(data.article_id ?? data.articleId ?? data.id);
      articleUrl = String(data.url ?? data.articleUrl);
      message = typeof response.payload.msg === "string"
        ? response.payload.msg
        : typeof response.payload.message === "string"
          ? response.payload.message
          : message;
      success = true;
      continue;
    }

    if (looksSuccessful(response.payload)) {
      success = true;
    }
    walkNode(response.payload, (value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return;
      const source = value as Record<string, unknown>;
      if (!articleId) {
        const candidate = source.articleId ?? source.article_id ?? source.blogId ?? source.id;
        if (isValidId(candidate)) {
          articleId = String(candidate);
        }
      }
      if (!articleUrl) {
        const candidate = source.articleUrl ?? source.url ?? source.link;
        if (typeof candidate === "string" && /^https?:\/\//.test(candidate)) {
          articleUrl = candidate;
        }
      }
      if (!message) {
        const candidate = source.msg ?? source.message;
        if (typeof candidate === "string" && candidate.trim()) {
          message = candidate.trim();
        }
      }
    });
  }

  return { articleId, articleUrl, message, success };
}

async function maybeFillMetadata(page: Page, article: ArticleInput, warnings: string[]): Promise<void> {
  console.log(`[Metadata] Starting metadata fill...`);
  const isMarkdownEditor = page.url().includes("editor.csdn.net/md");

  if (article.summary) {
    if (isMarkdownEditor) {
      warnings.push("Markdown 编辑器页未提供摘要输入框，摘要需要在后续手动发布流程中补充。");
    } else {
      const filledSummary = await fillByKeywords(page, ["摘要", "简介", "描述"], article.summary);
      if (!filledSummary) {
        warnings.push("未定位到摘要输入框，摘要可能需要手动补充。");
      }
    }
  }

  if (article.category) {
    if (isMarkdownEditor) {
      warnings.push(`Markdown 编辑器页未提供分类选择器，分类 ${article.category} 需要在后续手动发布流程中补充。`);
    } else {
      const filledCategory = await chooseCategory(page, article.category);
      if (!filledCategory) {
        warnings.push(`未定位到分类选择器，分类 ${article.category} 可能需要手动补充。`);
      }
    }
  }
}

async function dismissEditorOverlays(page: Page): Promise<void> {
  const introButton = page.getByRole("button", { name: /我知道了/ }).first();
  if (await ensureVisible(introButton)) {
    await introButton.click({ timeout: 1_000 }).catch(() => undefined);
    await page.waitForTimeout(300);
  }

  const sideCloseButton = page.locator(".side-title__button_close").first();
  if (await ensureVisible(sideCloseButton)) {
    await sideCloseButton.click({ timeout: 1_000 }).catch(() => undefined);
  }
}

function isDraftRelatedUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return ["draft", "save", "article", "blog"].some((token) => lower.includes(token));
}

async function findDraftSuccessText(page: Page): Promise<string | undefined> {
  const successTexts = ["草稿保存成功", "保存成功"];
  for (const text of successTexts) {
    const locator = page.getByText(text).first();
    if (await ensureVisible(locator)) {
      return text;
    }
  }
  return undefined;
}

async function submitDraft(page: Page, timeoutMs: number): Promise<{ success: boolean; message?: string }> {
  const clicked = await clickButtonByPattern(page, [/^保存草稿$/, /保存草稿/, /^草稿$/]);
  if (!clicked) {
    throw new Error("Draft button not found. Try running with --headful and inspect the current editor layout.");
  }

  const responseMatched = await page.waitForResponse(async (response) => {
    if (!isDraftSaveUrl(response.url())) return false;
    if (!response.ok()) return false;
    const payload = await safeParseResponse(response);
    return isDraftSavePayload(payload);
  }, { timeout: Math.min(timeoutMs, 15_000) }).then(() => true).catch(() => false);

  await page.waitForLoadState("networkidle", { timeout: timeoutMs }).catch(() => undefined);
  await page.waitForTimeout(1_500);
  const message = await findDraftSuccessText(page);

  return {
    success: responseMatched,
    message,
  };
}

async function openPublishDialog(page: Page): Promise<boolean> {
  const selectors = [
    "button:has-text('发布文章')",
    ".article-bar__publish button",
    ".article-bar__publish",
  ];

  for (const selector of selectors) {
    const candidate = page.locator(selector).last();
    if (await ensureVisible(candidate)) {
      try {
        await candidate.click({ timeout: 5000 }).catch(async (err) => {
          console.warn(`[Dialog] Normal click on publish button failed, trying force/JS click: ${err.message}`);
          await candidate.click({ force: true, timeout: 2000 }).catch(async () => {
            await candidate.evaluate(b => (b as HTMLElement).click());
          });
        });
        return true;
      } catch (e) {
        console.warn(`[Dialog] Failed to click publish button selector ${selector}:`, e);
      }
    }
  }

  const byRole = page.getByRole("button", { name: /^发布文章$/ }).last();
  if (await ensureVisible(byRole)) {
    try {
      await byRole.click({ timeout: 5000 });
      return true;
    } catch (e) {
      console.warn(`[Dialog] Failed to click publish button by role:`, e);
    }
  }

  return clickButtonByPattern(page, [/^发布文章$/, /发布文章/]);
}

async function waitForPublishDialog(page: Page, timeoutMs: number): Promise<Locator | null> {
  const candidates: Locator[] = [
    page.locator(".modal").filter({ hasText: /发布文章|保存为草稿|文章标签|添加封面/ }).first(),
    page.getByRole("dialog").filter({ hasText: /发布文章|保存为草稿|文章标签|添加封面/ }).first(),
    page.locator(".el-dialog").filter({ hasText: /发布文章|保存为草稿|文章标签|添加封面/ }).first(),
    page.locator(".ant-modal").filter({ hasText: /发布文章|保存为草稿|文章标签|添加封面/ }).first(),
    page.locator("div[role='dialog']").filter({ hasText: /发布文章|保存为草稿|文章标签|添加封面/ }).first(),
  ];

  const deadline = Date.now() + Math.min(timeoutMs, 12_000);
  while (Date.now() < deadline) {
    for (const locator of candidates) {
      if (await ensureVisible(locator)) {
        return locator;
      }
    }

    // 有些版本不是标准 dialog，而是页面内的发布面板。
    const panelSignals = [
      page.getByRole("button", { name: /保存为草稿/ }).first(),
      page.getByText(/文章标签/).first(),
      page.getByText(/分类专栏/).first(),
    ];
    const signalReady = await Promise.all(panelSignals.map((loc) => ensureVisible(loc)));
    if (signalReady.filter(Boolean).length >= 2) {
      return page.locator("body");
    }

    await page.waitForTimeout(200);
  }

  return null;
}

async function tryFillPublishDialogSummary(dialog: Locator, summary: string | undefined): Promise<boolean> {
  if (!summary) return false;
  const candidates = [
    dialog.locator("textarea[placeholder*='摘要']").first(),
    dialog.locator("textarea[placeholder*='简介']").first(),
    dialog.locator("textarea[placeholder*='描述']").first(),
    dialog.getByRole("textbox", { name: /摘要|简介|描述/ }).first(),
  ];
  for (const locator of candidates) {
    if (await fillLocator(locator, summary)) {
      return true;
    }
  }
  return false;
}

async function trySetPublishDialogOriginalFlag(dialog: Locator, original: boolean | undefined): Promise<boolean> {
  if (original === undefined) return false;
  const label = original ? /原创/ : /转载/;
  const radio = dialog.getByRole("radio", { name: label }).first();
  if (await ensureVisible(radio)) {
    await radio.click({ timeout: 1_500 }).catch(() => undefined);
    return true;
  }
  const fallback = dialog.locator("label, span, div").filter({ hasText: label }).first();
  if (await ensureVisible(fallback)) {
    await fallback.click({ timeout: 1_500 }).catch(() => undefined);
    return true;
  }
  return false;
}

async function tryFillPublishDialogCategory(page: Page, dialog: Locator, category: string | undefined, warnings: string[]): Promise<boolean> {
  const inputs = [
    dialog.locator("div:has-text('分类专栏') input").first(),
    dialog.locator("div:has-text('分类') input").first(),
    dialog.locator("input[placeholder*='分类']").first(),
    dialog.locator("input[placeholder*='专栏']").first(),
    dialog.locator("[role='combobox']").filter({ hasText: /分类|专栏/ }).first(),
    dialog.getByRole("combobox", { name: /分类|专栏/ }).first(),
  ];

  let input: Locator | null = null;
  for (const candidate of inputs) {
    if (await ensureVisible(candidate)) {
      input = candidate;
      break;
    }
  }

  // 有些 UI 不是 input，而是“+ 新建分类专栏”旁边的下拉。
  if (!input) {
    const area = dialog.locator("div, span, label").filter({ hasText: /分类专栏/ }).first();
    if (await ensureVisible(area)) {
      await area.click({ timeout: 1_500 }).catch(() => undefined);
    }
    for (const candidate of inputs) {
      if (await ensureVisible(candidate)) {
        input = candidate;
        break;
      }
    }
  }

  if (!input) {
    if (category) {
      warnings.push(`未定位到分类专栏选择器，分类 ${category} 可能需要手动补充。`);
    }
    return false;
  }

  try {
    await input.click({ timeout: 1_500 });
  } catch {
    // ignore
  }

  const pickFirstOption = async (): Promise<boolean> => {
    // 先尝试通过键盘选中第一个下拉项（很多 combobox/选择器更稳定）
    await page.keyboard.press("ArrowDown").catch(() => undefined);
    await page.keyboard.press("Enter").catch(() => undefined);
    await page.waitForTimeout(150);

    const option = dialog.locator(
      ".el-select-dropdown__item, li[role='option'], div[role='option'], .ant-select-item-option"
    ).first();
    if (await ensureVisible(option)) {
      await option.click({ timeout: 1_500 }).catch(() => undefined);
      return true;
    }

    const globalOption = page.locator(
      ".el-select-dropdown__item, li[role='option'], div[role='option'], .ant-select-item-option"
    ).first();
    if (await ensureVisible(globalOption)) {
      await globalOption.click({ timeout: 1_500 }).catch(() => undefined);
      return true;
    }

    return false;
  };

  if (!category) {
    const picked = await pickFirstOption();
    if (!picked) {
      const requiredHint = await dialog.locator("*").count().catch(() => 0);
      if (requiredHint > 0) {
        warnings.push("未提供 --category 且未能自动选择分类专栏；如果弹窗提示必填，请手动选择后再提交。"
        );
      }
    }
    return picked;
  }

  try {
    await input.fill(category, { timeout: 1_500 }).catch(async () => {
      await page.keyboard.insertText(category);
    });
    const option = page.locator(
      ".el-select-dropdown__item, li[role='option'], div[role='option'], .ant-select-item-option"
    ).filter({ hasText: new RegExp(category) }).first();

    if (await ensureVisible(option)) {
      await option.click({ timeout: 1_500 }).catch(() => undefined);
      return true;
    }

    await page.keyboard.press("Enter").catch(() => undefined);
    return true;
  } catch {
    warnings.push(`分类专栏 ${category} 选择失败，可能需要手动补充。`);
    return false;
  }
}

async function findTagInput(dialog: Locator): Promise<Locator | null> {
  const visibleAndEditable = async (candidate: Locator): Promise<boolean> => {
    if (!(await ensureVisible(candidate))) return false;
    // 不用 locator.isEditable()：它会走 Playwright action timeout（默认 30s），误命中时会让流程“假卡住”。
    return candidate.evaluate((el) => {
      const input = el as HTMLInputElement;
      if (input.disabled) return false;
      if (input.readOnly) return false;
      const style = window.getComputedStyle(input);
      if (style.display === "none" || style.visibility === "hidden") return false;
      const ariaDisabled = input.getAttribute("aria-disabled");
      if (ariaDisabled && ariaDisabled !== "false") return false;
      return true;
    }).catch(() => false);
  };

  const candidates = [
    // 1) “标签”选择器弹窗：输入框提示 Enter 可添加自定义标签（最可靠）
    dialog.locator("input[placeholder*='Enter']").first(),

    // 2) 发布面板的文章标签区域（尽量限制在标签区，避免误命中“创作声明（无声明）”等无关输入框）
    dialog.locator(".mark_selection_box input").first(),
    dialog.locator("div:has-text('文章标签') .mark_selection_box input").first(),
    dialog.locator("div:has-text('文章标签') input").first(),
    dialog.locator("input[placeholder*='文章标签']").first(),
  ];
  for (const candidate of candidates) {
    if (await visibleAndEditable(candidate)) return candidate;
  }
  return null;
}

async function ensureTagEditorOpen(page: Page, dialog: Locator): Promise<void> {
  const addButtons = [
    dialog.getByRole("button", { name: /添加文章标签/ }).first(),
    dialog.getByRole("button", { name: /^\+$/ }).first(),
    dialog.locator("button, a, span, div").filter({ hasText: /添加文章标签/ }).first(),
  ];

  for (const button of addButtons) {
    if (await ensureVisible(button)) {
      await button.click({ timeout: 1_500 }).catch(() => undefined);
      await page.waitForTimeout(200);
      return;
    }
  }

  // 回退：很多版本是点击“文章标签”区域后才展开输入框（不一定有明显的 + / 添加按钮）。
  const tagAreas = [
    dialog.locator(".mark_selection_box").first(),
    dialog.locator(".mark_selection, .mark_selection_title_el_tag").first(),
    dialog.locator("div:has-text('文章标签')").first(),
  ];
  for (const area of tagAreas) {
    if (await ensureVisible(area)) {
      await area.click({ timeout: 1_500 }).catch(() => undefined);
      await page.waitForTimeout(200);
      const input = await findTagInput(dialog);
      if (input) return;
    }
  }
}

async function findTagEditorScope(page: Page, publishScope: Locator): Promise<Locator> {
  // 某些版本点击“添加文章标签”会打开二级弹窗，需要在弹窗里选完再“确定”。
  // 新版可能是“标签”选择器弹窗（输入框提示 Enter 可添加自定义标签），右上角 X 关闭。
  const tagPicker = page.getByRole("dialog")
    .filter({ has: page.locator("input[placeholder*='Enter']") })
    .first();
  if (await ensureVisible(tagPicker)) return tagPicker;

  const overlay = page.getByRole("dialog")
    .filter({ hasText: /文章标签/ })
    .filter({ has: page.getByRole("button", { name: /确定|完成|确认/ }) })
    .first();
  if (await ensureVisible(overlay)) return overlay;
  return publishScope;
}

async function maybeConfirmTagSelection(scope: Locator): Promise<void> {
  const confirm = scope.getByRole("button", { name: /确定|完成|确认/ }).last();
  if (await ensureVisible(confirm)) {
    await confirm.click({ timeout: 2_000 }).catch(() => undefined);
  }
}

async function closeTagEditorIfNeeded(page: Page, scope: Locator, publishScope: Locator): Promise<void> {
  if (scope === publishScope) return;

  // 1) 有“确定/完成/确认”按钮的弹窗
  const confirm = scope.getByRole("button", { name: /确定|完成|确认/ }).last();
  if (await ensureVisible(confirm)) {
    await confirm.click({ timeout: 2_000 }).catch(() => undefined);
    await page.waitForTimeout(200);
    return;
  }

  // 2) 只有右上角 X 的“标签”选择器弹窗
  const closeCandidates = [
    scope.locator("button[aria-label*='关闭'], button[aria-label*='close']").first(),
    scope.locator(".el-dialog__headerbtn, .el_mcm-dialog__headerbtn").first(),
    scope.locator(".el-dialog__close, .el_mcm-dialog__close").first(),
    scope.locator("button").filter({ hasText: /^×$/ }).first(),
  ];
  for (const candidate of closeCandidates) {
    if (await ensureVisible(candidate)) {
      await candidate.click({ timeout: 2_000 }).catch(() => undefined);
      await page.waitForTimeout(200);
      return;
    }
  }

  // 最后兜底：Esc
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.waitForTimeout(200);
}

async function tryClickTagChip(dialog: Locator, tag: string): Promise<boolean> {
  const pattern = new RegExp(`^${tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
  const candidate = dialog.locator("button, a, li, span, div, label").filter({ hasText: pattern }).first();
  if (await ensureVisible(candidate)) {
    await candidate.click({ timeout: 1_500 }).catch(() => undefined);
    return true;
  }
  return false;
}

function parseCsdnTagsValue(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  // 有些情况下可能是 JSON 字符串或逗号分隔字符串。
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch {
      // ignore
    }
  }
  return trimmed
    .split(/[\s,，;；]+/g)
    .map((t) => t.trim())
    .filter(Boolean);
}

async function getPersistedTagsFromDialog(dialog: Locator): Promise<Set<string> | null> {
  const raw = await readHiddenInputValue(dialog, "tags");
  if (raw === undefined) return null;
  const tags = parseCsdnTagsValue(raw);
  return new Set(tags);
}

async function isTagSelected(publishDialog: Locator, tag: string, extraScope?: Locator): Promise<boolean> {
  // 选中后的 tag 文案往往会带“×/关闭”图标，严格的空白边界会误判。
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(escaped);

  const containers: Locator[] = [];
  const mainContainer = publishDialog.locator("div:has-text('文章标签'), .mark_selection, .mark_selection_title_el_tag").first();
  if (await ensureVisible(mainContainer)) containers.push(mainContainer);
  containers.push(publishDialog);
  if (extraScope && extraScope !== publishDialog) containers.push(extraScope);

  for (const container of containers) {
    const chip = container.locator("span, div, a, button").filter({ hasText: pattern }).first();
    if (await ensureVisible(chip)) return true;
  }

  // 真正提交一般会读取隐藏字段 name=tags；这是“是否回写/落库”的更可靠信号。
  const persisted = await getPersistedTagsFromDialog(publishDialog);
  if (persisted && persisted.has(tag)) return true;

  return false;
}

async function findTagSuggestionOption(page: Page, tag: string): Promise<Locator | null> {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}$`);
  const candidates = [
    // CSDN 当前版本使用 el_mcm 前缀（Element Plus 定制版）
    page.locator(".el_mcm-autocomplete-suggestion li").filter({ hasText: pattern }).first(),
    page.locator(".el_mcm-autocomplete-suggestion__list li").filter({ hasText: pattern }).first(),
    page.locator(".el_mcm-scrollbar__view li[role='option']").filter({ hasText: pattern }).first(),
    page.locator(".el_mcm-scrollbar__view li").filter({ hasText: pattern }).first(),
    page.locator(".el_mcm-select-dropdown__item").filter({ hasText: pattern }).first(),
    page.locator(".el-select-dropdown__item").filter({ hasText: pattern }).first(),
    page.locator(".el-autocomplete-suggestion li").filter({ hasText: pattern }).first(),
    page.locator(".ant-select-item-option").filter({ hasText: pattern }).first(),
    page.locator("li[role='option'], div[role='option']").filter({ hasText: pattern }).first(),
  ];
  for (const candidate of candidates) {
    if (await ensureVisible(candidate)) return candidate;
  }

  // 回退：很多时候候选项会带前后空白或附加信息，允许包含匹配。
  const fuzzy = new RegExp(escaped);
  const fuzzyCandidates = [
    page.locator(".el_mcm-autocomplete-suggestion li").filter({ hasText: fuzzy }).first(),
    page.locator(".el_mcm-autocomplete-suggestion__list li").filter({ hasText: fuzzy }).first(),
    page.locator(".el-autocomplete-suggestion li").filter({ hasText: fuzzy }).first(),
    page.locator(".ant-select-item-option").filter({ hasText: fuzzy }).first(),
    page.locator("li[role='option'], div[role='option']").filter({ hasText: fuzzy }).first(),
  ];
  for (const candidate of fuzzyCandidates) {
    if (await ensureVisible(candidate)) return candidate;
  }

  return null;
}

async function waitForTagSuggestionOption(page: Page, tag: string, timeoutMs: number): Promise<Locator | null> {
  const deadline = Date.now() + Math.min(timeoutMs, 2_000);
  while (Date.now() < deadline) {
    const option = await findTagSuggestionOption(page, tag);
    if (option) return option;
    await page.waitForTimeout(100).catch(() => undefined);
  }
  return null;
}

async function readHiddenInputValue(scope: Locator, name: string): Promise<string | undefined> {
  const input = scope.locator(`input[type='hidden'][name='${name}']`).first();
  if (!(await ensureVisible(input))) return undefined;
  const value = await input.evaluate((el) => (el as HTMLInputElement).value).catch(() => "");
  return value ?? undefined;
}

async function tryFillPublishDialogTags(page: Page, dialog: Locator, tags: string[], warnings: string[]): Promise<void> {
  if (tags.length === 0) return;

  const normalizedRequested = tags.map((t) => t.trim()).filter(Boolean);
  if (normalizedRequested.length === 0) return;

  let scope: Locator = dialog;
  let input = await findTagInput(scope);
  if (!input) {
    await ensureTagEditorOpen(page, dialog);
    scope = await findTagEditorScope(page, dialog);
    await page.waitForTimeout(200);
    input = await findTagInput(scope);
  }

  if (!input) {
    // 某些版本的 UI 是直接点“推荐标签/标签 chip”完成选择。
    let pickedAny = false;
    for (const tag of tags) {
      const trimmed = tag.trim();
      if (!trimmed) continue;
      const picked = await tryClickTagChip(dialog, trimmed);
      pickedAny = pickedAny || picked;
    }
    if (!pickedAny) {
      warnings.push(`未定位到文章标签输入框，已跳过自动选择标签：${tags.join(", ")}`);
    }
    return;
  }

  for (const tag of normalizedRequested) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    try {
      if (await isTagSelected(dialog, trimmed, scope)) {
        continue;
      }

      // 选中一个标签后，标签编辑区域可能自动收起；每次都确保输入框仍可用。
      if (!input || !(await ensureVisible(input))) {
        await ensureTagEditorOpen(page, dialog);
        scope = await findTagEditorScope(page, dialog);
        await page.waitForTimeout(200);
        input = await findTagInput(scope);
      }

      // 优先：在标签编辑区域内直接点击可见的推荐/候选项。
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const directOption = scope.locator("button, .tag__btn-tag, .el-tag, li, span")
        .filter({ hasText: new RegExp(escaped, "i") })
        .first();
      if (await ensureVisible(directOption)) {
        await directOption.click({ timeout: 1_500 }).catch(() => undefined);
        await page.waitForTimeout(200);
        if (await isTagSelected(dialog, trimmed, scope)) {
          continue;
        }
      }

      if (!input) {
        throw new Error("tag input not found");
      }

      // 再次确认：避免误命中“无声明”等不可编辑 input 导致长时间卡住。
      if (!(await input.isEditable({ timeout: 1_000 }).catch(() => false))) {
        throw new Error("tag input not editable");
      }

      await input.click({ timeout: 1_000 }).catch(() => undefined);
      await input.fill("", { timeout: 2_000 }).catch(() => undefined);
      await input.fill(trimmed, { timeout: 2_000 }).catch(async () => {
        await page.keyboard.insertText(trimmed);
      });

      // 优先点击精确匹配的建议项，其次回退为 Enter 生成 tag chip。
      const option = await waitForTagSuggestionOption(page, trimmed, 1_200);
      if (option) {
        await option.click({ timeout: 1_500 }).catch(() => undefined);

        // 某些 UI 点击候选项后仍需 Enter 才会生成/确认选中。
        await page.waitForTimeout(150);
        if (!(await isTagSelected(dialog, trimmed, scope))) {
          await page.keyboard.press("Enter").catch(() => undefined);
        }
      } else {
        // 自定义标签：无候选项时，必须 Enter 才会真正添加。
        await page.keyboard.press("Enter").catch(() => undefined);
        await page.waitForTimeout(150);

        // 若仍未生成 chip，再回退到“下选第一项 + Enter”。
        if (!(await isTagSelected(dialog, trimmed, scope))) {
          await page.keyboard.press("ArrowDown").catch(() => undefined);
          await page.keyboard.press("Enter").catch(() => undefined);
        }
      }

      await page.waitForTimeout(200);

      // 最后验证：如果仍没生成 chip，再尝试点击推荐 chip。
      if (!(await isTagSelected(dialog, trimmed, scope))) {
        await tryClickTagChip(dialog, trimmed);
        await page.waitForTimeout(150);
      }

      if (!(await isTagSelected(dialog, trimmed, scope))) {
        warnings.push(`标签 ${trimmed} 未确认被选中（UI/隐藏字段均未检测到），可能需要手动补充。`);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      warnings.push(`标签 ${trimmed} 选择失败，可能需要手动补充。（${detail}）`);
    }
  }

  // 如果标签是在二级弹窗里操作的，通常还需要点一次“确定/完成”回写到发布面板。
  if (scope !== dialog) {
    await closeTagEditorIfNeeded(page, scope, dialog).catch(() => undefined);
    await page.waitForTimeout(300);
  }

  // 额外硬校验：CSDN 发布面板通常有隐藏字段 name=tags，真正提交时会读取它。
  // 若缺失/为空/缺少部分标签，做一次补救重试（只重试缺失项，且只重试一次）。
  const persistedBeforeRetry = await getPersistedTagsFromDialog(dialog);
  if (persistedBeforeRetry && persistedBeforeRetry.size === 0) {
    warnings.push("已尝试选择文章标签，但发布面板的隐藏字段 tags 仍为空；草稿可能不会保存标签。");
  }

  const missing = persistedBeforeRetry
    ? normalizedRequested.filter((t) => !persistedBeforeRetry.has(t))
    : [];

  if (missing.length > 0) {
    await ensureTagEditorOpen(page, dialog);
    const retryScope = await findTagEditorScope(page, dialog);
    await page.waitForTimeout(200);
    const retryInput = await findTagInput(retryScope);

    if (retryInput) {
      for (const tag of missing) {
        if (!(await retryInput.isEditable({ timeout: 1_000 }).catch(() => false))) {
          warnings.push("标签输入框不可编辑（可能误命中只读字段），已跳过缺失标签的自动重试。"
          );
          break;
        }
        await retryInput.click({ timeout: 1_000 }).catch(() => undefined);
        await retryInput.fill("", { timeout: 2_000 }).catch(() => undefined);
        await retryInput.fill(tag, { timeout: 2_000 }).catch(async () => {
          await page.keyboard.insertText(tag);
        });

        const option = await waitForTagSuggestionOption(page, tag, 1_200);
        if (option) {
          await option.click({ timeout: 5000 }).catch(() => undefined);
        } else {
          await page.keyboard.press("Enter").catch(() => undefined);
        }

        await page.waitForTimeout(200);
      }

      if (retryScope !== dialog) {
        await closeTagEditorIfNeeded(page, retryScope, dialog).catch(() => undefined);
        await page.waitForTimeout(400);
      }
    }

    const persistedAfterRetry = await getPersistedTagsFromDialog(dialog);
    if (persistedAfterRetry) {
      const stillMissing = normalizedRequested.filter((t) => !persistedAfterRetry.has(t));
      for (const tag of stillMissing) {
        warnings.push(`标签 ${tag} 未写入隐藏字段 tags（当前值：${Array.from(persistedAfterRetry).join(", ") || "<empty>"}），草稿可能不会保存该标签。`);
      }
    }
  }
}

async function getCoverPreviewUrl(dialog: Locator): Promise<string | null> {
  const previewImg = dialog.locator(".container-coverimage-box img.preview").first();
  if (!(await previewImg.count())) return null;
  const src = (await previewImg.getAttribute("src").catch(() => null))?.trim() ?? "";
  if (/csdnimg\.cn\/direct\//i.test(src)) return src;
  return null;
}

async function waitForCoverCropDialog(page: Page, timeoutMs = 15_000): Promise<boolean> {
  const cropWrap = page.locator(".container-coverimage-box .vue-image-crop-upload .vicp-wrap, .vue-image-crop-upload .vicp-wrap").first();
  await cropWrap.waitFor({ state: "visible", timeout: timeoutMs }).catch(() => undefined);
  return ensureVisible(cropWrap);
}

async function confirmCoverCropDialog(page: Page): Promise<boolean> {
  const confirmBtn = page
    .locator(".vue-image-crop-upload .vicp-operate-btn, .container-coverimage-box .vicp-operate-btn")
    .filter({ hasText: /^确认上传$/ })
    .first();

  if (!(await ensureVisible(confirmBtn))) {
    return false;
  }

  await confirmBtn.click({ timeout: 3_000 }).catch(async () => {
    await confirmBtn.evaluate((el) => (el as HTMLElement).click());
  });

  const cropWrap = page.locator(".vue-image-crop-upload .vicp-wrap").first();
  await cropWrap.waitFor({ state: "hidden", timeout: 12_000 }).catch(() => undefined);
  await page.waitForTimeout(400);
  return !(await ensureVisible(cropWrap));
}

async function dismissCoverCropOverlay(page: Page): Promise<void> {
  const cropWrap = page.locator(".vue-image-crop-upload .vicp-wrap").first();
  if (!(await ensureVisible(cropWrap))) return;

  const confirmed = await confirmCoverCropDialog(page);
  if (confirmed) return;

  const closeBtn = page.locator(".vue-image-crop-upload .vicp-close").first();
  if (await ensureVisible(closeBtn)) {
    await closeBtn.click({ timeout: 1_500 }).catch(() => undefined);
    await page.waitForTimeout(300);
  }
}

async function waitForCoverPreview(page: Page, dialog: Locator, timeoutMs: number): Promise<string | null> {
  const deadline = Date.now() + Math.min(timeoutMs, 15_000);
  while (Date.now() < deadline) {
    const coverUrl = await getCoverPreviewUrl(dialog);
    if (coverUrl) return coverUrl;
    await page.waitForTimeout(250).catch(() => undefined);
  }
  return null;
}

async function dismissBlockingModals(page: Page): Promise<void> {
  await dismissCoverCropOverlay(page);
}

async function tryUploadPublishDialogCover(
  page: Page,
  dialog: Locator,
  coverPath: string | undefined,
  warnings: string[],
): Promise<CoverUploadResult> {
  if (!coverPath) return { applied: false };

  const input = dialog.locator(
    ".cover-upload-box input[type='file'], .container-coverimage-box input[type='file'], .el-upload input[type='file']",
  ).first();
  const hasInput = await input.count().then((count) => count > 0).catch(() => false);
  if (!hasInput) {
    warnings.push(`未定位到封面上传控件，已跳过封面上传：${coverPath}`);
    return { applied: false };
  }

  try {
    const existingUrl = await getCoverPreviewUrl(dialog);
    if (existingUrl) {
      return { applied: true, coverUrl: existingUrl };
    }

    await input.setInputFiles(coverPath);
    await waitForCoverCropDialog(page);

    const confirmed = await confirmCoverCropDialog(page);
    if (!confirmed) {
      warnings.push("封面上传裁剪框未成功确认，已尝试关闭遮挡层。");
      await dismissCoverCropOverlay(page);
    }

    const coverUrl = await waitForCoverPreview(page, dialog, 12_000);
    if (!coverUrl) {
      warnings.push("封面上传已执行，但未检测到有效的封面预览 URL；请在草稿中手动确认封面。");
      return { applied: false };
    }

    return { applied: true, coverUrl };
  } catch (error) {
    warnings.push(`封面上传失败：${error instanceof Error ? error.message : String(error)}`);
    await dismissCoverCropOverlay(page).catch(() => undefined);
    return { applied: false };
  }
}

async function clickDialogSubmit(
  page: Page,
  dialog: Locator,
): Promise<{ clicked: boolean; detail?: string }> {
  const patterns = [/^保存为草稿$/, /保存为草稿/, /^保存草稿$/, /保存草稿/, /保存到草稿箱/, /草稿箱/];

  const describeLocator = async (locator: Locator): Promise<string> => {
    const text = await locator.evaluate((el) => {
      const value = (el as HTMLElement).innerText
        || (el as HTMLElement).textContent
        || (el as HTMLInputElement).value
        || "";
      return String(value).trim();
    }).catch(() => "");
    const tag = await locator.evaluate((el) => (el as HTMLElement).tagName.toLowerCase()).catch(() => "");
    const aria = await locator.getAttribute("aria-label").catch(() => null);
    const cls = await locator.getAttribute("class").catch(() => null);
    return [tag || "node", text ? `text=${JSON.stringify(text)}` : undefined, aria ? `aria=${JSON.stringify(aria)}` : undefined, cls ? `class=${JSON.stringify(cls)}` : undefined]
      .filter(Boolean)
      .join(" ");
  };

  const clickFirstVisible = async (candidate: Locator): Promise<{ ok: boolean; clickedText?: string }> => {
    const count = await candidate.count().catch(() => 0);
    const limit = Math.min(count, 20);
    for (let i = 0; i < limit; i += 1) {
      const item = candidate.nth(i);
      if (!(await ensureVisible(item))) continue;
      try {
        await item.click({ timeout: 2_000 });
        return { ok: true, clickedText: await describeLocator(item) };
      } catch {
        try {
          await item.click({ force: true, timeout: 1_500 });
          return { ok: true, clickedText: await describeLocator(item) };
        } catch {
          // try next
        }
      }
    }
    return { ok: false };
  };

  const prioritizedSelectors = [
    dialog.locator(".modal__button-bar button").filter({ hasText: /^保存为草稿$|^保存草稿$/ }),
    page.locator(".modal__button-bar button").filter({ hasText: /^保存为草稿$|^保存草稿$/ }),
    dialog.locator(".el-dialog__footer button, .dialog-footer button").filter({ hasText: /保存为草稿|保存草稿/ }),
    page.locator(".el-dialog__footer button, .dialog-footer button").filter({ hasText: /保存为草稿|保存草稿/ }),
    dialog.locator("button").filter({ hasText: /^保存为草稿$|^保存草稿$/ }),
    page.locator("button").filter({ hasText: /^保存为草稿$|^保存草稿$/ }),
  ];

  for (const candidate of prioritizedSelectors) {
    const result = await clickFirstVisible(candidate).catch(() => ({ ok: false, clickedText: undefined }));
    if (result.ok) {
      return { clicked: true, detail: `priority ${result.clickedText ?? ""}`.trim() };
    }
  }

  const scopes: Array<{ name: string; scope: Locator | Page }> = [
    { name: "dialog", scope: dialog },
    { name: "page", scope: page },
  ];

  for (const { name, scope } of scopes) {
    for (const pattern of patterns) {
      const button = scope.getByRole("button", { name: pattern });
      const result = await clickFirstVisible(button).catch(() => ({ ok: false, clickedText: undefined }));
      if (result.ok) {
        return { clicked: true, detail: `scope=${name} byRole pattern=${pattern} ${result.clickedText ?? ""}`.trim() };
      }
    }

    for (const pattern of patterns) {
      const textTarget = scope.locator("button, a").filter({ hasText: pattern });
      const result = await clickFirstVisible(textTarget).catch(() => ({ ok: false, clickedText: undefined }));
      if (result.ok) {
        return { clicked: true, detail: `scope=${name} byText pattern=${pattern} ${result.clickedText ?? ""}`.trim() };
      }
    }
  }

  return { clicked: false };
}

async function findDraftSuccessToastText(page: Page): Promise<string | undefined> {
  const successTexts = ["草稿保存成功", "保存成功"];
  for (const text of successTexts) {
    const locator = page.getByText(text).first();
    if (await ensureVisible(locator)) {
      return text;
    }
  }
  return undefined;
}

async function submitViaPublishDialog(
  page: Page,
  request: PublishRequest,
  warnings: string[],
  capturedResponses: Array<{ url: string; status: number; payload: unknown }>,
): Promise<{ success: boolean; message?: string; coverApplied?: boolean; coverUrl?: string }> {
  console.log(`[Submit] Opening publish dialog...`);
  const opened = await openPublishDialog(page);
  if (!opened) {
    console.warn(`[Submit] Failed to open publish dialog, falling back to draft button.`);
    warnings.push("未定位到右下角发布按钮，回退到编辑器页的“保存草稿”按钮。标签/封面未自动处理。");
    return submitDraft(page, request.timeoutMs);
  }

  console.log(`[Submit] Waiting for publish dialog...`);
  const dialog = await waitForPublishDialog(page, request.timeoutMs);
  if (!dialog) {
    console.warn(`[Submit] Publish dialog didn't appear, falling back to draft button.`);
    warnings.push("发布弹窗未弹出，回退到编辑器页的“保存草稿”按钮。标签/封面未自动处理。");
    return submitDraft(page, request.timeoutMs);
  }

  await tryFillPublishDialogSummary(dialog, request.article.summary).catch(() => undefined);
  await trySetPublishDialogOriginalFlag(dialog, request.article.original).catch(() => undefined);
  await tryFillPublishDialogCategory(page, dialog, request.article.category, warnings).catch(() => undefined);
  await tryFillPublishDialogTags(page, dialog, request.article.tags, warnings);
  const coverPath = request.coverPath ?? request.article.coverPath;
  const coverResult = await tryUploadPublishDialogCover(page, dialog, coverPath, warnings);
  if (coverResult.applied && coverResult.coverUrl) {
    warnings.push(`封面已上传：${coverResult.coverUrl}`);
  }
  await dismissBlockingModals(page);

  // 先挂 waitForResponse 再点击，避免响应过快导致漏捕。
  const responseStartIndex = capturedResponses.length;
  const responsePromise = page.waitForResponse(async (response) => {
    const url = response.url();
    if (!response.ok()) return false;
    // 草稿：保存可能走 saveArticle，但不一定返回 url/toast。
    if (!isDraftSaveUrl(url)) return false;
    const payload = await safeParseResponse(response);
    return isDraftSavePayload(payload) || looksSuccessful(payload);
  }, { timeout: Math.min(request.timeoutMs, 20_000) }).then(() => true).catch(() => false);

  const clickResult = await clickDialogSubmit(page, dialog);
  if (!clickResult.clicked) {
    throw new Error("Draft submit button not found in publish dialog.");
  }

  warnings.push(`已点击“保存草稿”按钮：${clickResult.detail ?? "<unknown>"}`);

  const responseMatched = await responsePromise;

  // 给 UI/请求一点回写时间；某些版本不会出现 toast，也不会自动关闭弹窗。
  await page.waitForTimeout(800);
  await page.waitForLoadState("networkidle", { timeout: Math.min(request.timeoutMs, 8_000) }).catch(() => undefined);
  await page.waitForTimeout(600);
  const message = await findDraftSuccessToastText(page);

  // 回退成功判定：如果接口没被准确捕获，但已经能从响应里抽到 articleId，也视为成功。
  const info = extractPublishInfo(capturedResponses);
  const urlHasArticleId = /[?&]articleId=\d+/.test(page.url());

  const postClickResponses = capturedResponses.slice(responseStartIndex);
  const sawDraftNetwork = postClickResponses.some((r) => isDraftSaveUrl(r.url) || isDraftRelatedUrl(r.url));

  // 草稿模式特殊兜底：有些账号/版本点击“保存为草稿”不会弹提示，也可能不触发可捕获的保存响应，
  // 但标签/封面等会在面板字段回写且最终落库。此时用“字段回写”作为成功信号，避免误判失败/卡住。
  const requestedTags = request.article.tags.map((t) => t.trim()).filter(Boolean);
  // 有些版本没有 hidden input[name=tags]，因此优先用“可见标签 chip”判断是否已回写。
  const tagsOk = requestedTags.length === 0
    ? true
    : (await Promise.all(requestedTags.map((t) => isTagSelected(dialog, t)))).every(Boolean);

  // 仅凭“标签 chip 可见”可能会出现误判（例如其实没点到保存按钮），因此要求至少观察到一次保存/草稿相关网络活动。
  const persistedFallbackOk = Boolean(tagsOk && sawDraftNetwork);
  if (persistedFallbackOk && !responseMatched && !message && !info.articleId && !urlHasArticleId) {
    warnings.push("未捕获到明确的草稿保存接口响应/成功提示，已基于发布面板字段回写（标签/封面）判定为成功。若草稿箱未出现，请手动确认或重试。");
  }

  const success = responseMatched || Boolean(message) || Boolean(info.articleId) || urlHasArticleId || persistedFallbackOk;

  if (!success) {
    warnings.push("首次保存未确认成功，关闭遮挡弹窗后重试保存草稿。");
    await dismissBlockingModals(page);
    const retryClick = await clickDialogSubmit(page, dialog);
    if (retryClick.clicked) {
      warnings.push(`已重试点击“保存草稿”按钮：${retryClick.detail ?? "<unknown>"}`);
      await page.waitForTimeout(1_200);
      await page.waitForLoadState("networkidle", { timeout: Math.min(request.timeoutMs, 8_000) }).catch(() => undefined);
      const retryMessage = await findDraftSuccessToastText(page);
      const retryInfo = extractPublishInfo(capturedResponses);
      const retryUrlHasArticleId = /[?&]articleId=\d+/.test(page.url());
      const retryResponseMatched = capturedResponses.slice(responseStartIndex).some((r) => isDraftSaveUrl(r.url) && isDraftSavePayload(r.payload));
      if (retryResponseMatched || retryMessage || retryInfo.articleId || retryUrlHasArticleId) {
        return {
          success: true,
          message: retryMessage ?? "草稿保存成功",
          coverApplied: coverResult.applied,
          coverUrl: coverResult.coverUrl,
        };
      }
    }
  }

  if (success) {
    await closePublishDialogIfNeeded(page, dialog).catch(() => undefined);
  }

  return {
    success,
    message,
    coverApplied: coverResult.applied,
    coverUrl: coverResult.coverUrl,
  };
}

async function openCsdnImageUploadDialog(page: Page): Promise<boolean> {
  if (await page.locator("div.uploadPicture input[type='file']").count()) {
    return true;
  }

  const iconButtons = page
    .locator(".navigation-bar__inner--edit-pagedownButtons .navigation-bar__button.button")
    .filter({ hasNotText: /列表|代码块|格式|插入|历史|更多/ });

  const count = await iconButtons.count();
  for (let i = 0; i < count; i++) {
    await iconButtons.nth(i).click({ timeout: 2_000 }).catch(() => undefined);
    await page.waitForTimeout(600);
    if (await page.locator("div.uploadPicture input[type='file']").count()) {
      return true;
    }
    await page.keyboard.press("Escape").catch(() => undefined);
    await page.waitForTimeout(200);
  }

  return false;
}

function imageMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  if (ext === ".bmp") return "image/bmp";
  return "image/png";
}

async function uploadImageViaEditorDrop(page: Page, filePath: string): Promise<void> {
  const buffer = fs.readFileSync(filePath);
  const mimeType = imageMimeType(filePath);
  const fileName = path.basename(filePath);

  await page.locator("pre.editor__inner").first().click({ timeout: 2_000 }).catch(() => undefined);
  await page.evaluate(({ b64, name, mimeType: mime }) => {
    const editorEl = document.querySelector("pre.editor__inner") as HTMLElement | null;
    if (!editorEl) return;
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const file = new File([bytes], name, { type: mime });
    const dt = new DataTransfer();
    dt.items.add(file);
    for (const type of ["dragenter", "dragover", "drop"] as const) {
      editorEl.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
    }
  }, { b64: buffer.toString("base64"), name: fileName, mimeType });
}

async function waitForUploadedImageUrl(
  page: Page,
  markdownEditor: Locator,
  latestUrl: { value: string | null },
  maxAttempts = 120,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    if (latestUrl.value) {
      return latestUrl.value;
    }

    try {
      if (await markdownEditor.count() > 0) {
        const editorText = await markdownEditor.innerText();
        const urlMatch = editorText.match(/https?:\/\/(?:i-blog|img-blog)\.csdnimg\.cn\/direct\/[a-zA-Z0-9_\.]+/);
        if (urlMatch) {
          return urlMatch[0];
        }
      }
    } catch {
      // ignore transient editor read errors
    }

    await page.waitForTimeout(500);
  }

  return "";
}

async function uploadImagesInMarkdown(
  page: Page,
  markdown: string,
  baseDir: string,
  warnings: string[]
): Promise<string> {
  console.log(`[CSDN Scraper] Entering uploadImagesInMarkdown. Body length: ${markdown.length}`);
  const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
  let match;
  let finalMarkdown = markdown;

  const localImages: Array<{ full: string; alt: string; localPath: string }> = [];
  while ((match = imgRegex.exec(markdown)) !== null) {
    const [full, alt, localPath] = match;
    if (!localPath.startsWith("http") && !localPath.startsWith("data:")) {
      localImages.push({ full, alt, localPath });
    }
  }

  if (localImages.length === 0) return markdown;

  console.log(`[CSDN Image Upload] Found ${localImages.length} local images to process.`);

  const markdownEditor = page.locator("pre.editor__inner[contenteditable='true'], .vditor-reset, #vditor").first();

  const latestUrl = { value: null as string | null };
  const onResponse = async (resp: Response) => {
    try {
      const url = resp.url();
      const urlLower = url.toLowerCase();

      if (urlLower.includes("img-home.csdnimg.cn")) {
        return;
      }

      const isRelated = urlLower.includes("csdn.net") || urlLower.includes("csdnimg.cn") || urlLower.includes("myhuaweicloud.com");
      const isUpload = urlLower.includes("upload") || urlLower.includes("direct") || urlLower.includes("kyc") || urlLower.includes("myhuaweicloud.com");

      if (isUpload && isRelated && resp.status() >= 200 && resp.status() < 300) {
        const text = await resp.text().catch(() => "");

        try {
          const json = JSON.parse(text) as Record<string, unknown>;
          const data = json?.data as Record<string, unknown> | string | undefined;
          let remoteUrl =
            (data && typeof data === "object" ? (data.imageUrl || data.url || data.direct_url) : undefined)
            || json?.imageUrl
            || json?.url
            || (typeof data === "string" && data.startsWith("http") ? data : undefined);

          if (typeof remoteUrl === "string" && remoteUrl.includes("csdnimg.cn") && !remoteUrl.includes("img-home.csdnimg.cn")) {
            latestUrl.value = remoteUrl;
            return;
          }
        } catch {
          // Not JSON, fallback to regex below.
        }

        const nativeMatch = text.match(/https?:\/\/i-blog\.csdnimg\.cn\/direct\/[a-zA-Z0-9_\.]+/);
        if (nativeMatch) {
          latestUrl.value = nativeMatch[0];
          return;
        }

        const fallbackMatch = text.match(/https?:\/\/[a-z0-9-]+\.csdnimg\.cn\/[^\s"'}@\)]+/);
        if (fallbackMatch && !fallbackMatch[0].includes("img-home.csdnimg.cn")) {
          latestUrl.value = fallbackMatch[0];
        }
      }
    } catch {
      // Ignore parsing errors
    }
  };
  page.on("response", onResponse);

  try {
    for (const item of localImages) {
      const resolvedPath = path.isAbsolute(item.localPath)
        ? item.localPath
        : path.resolve(baseDir, item.localPath);

      if (!fs.existsSync(resolvedPath)) {
        console.warn(`[CSDN Image Upload] File not found: ${resolvedPath}`);
        warnings.push(`CSDN: 图片文件不存在: ${item.localPath}`);
        continue;
      }

      console.log(`[CSDN Image Upload] Processing: ${item.localPath}`);
      latestUrl.value = null;

      try {
        const dialogOpened = await openCsdnImageUploadDialog(page);
        if (dialogOpened) {
          const fileInput = page.locator("div.uploadPicture input[type='file']").first();
          await fileInput.setInputFiles(resolvedPath);
          console.log(`[CSDN Image Upload] File set via upload dialog for ${item.localPath}...`);
        } else {
          console.log(`[CSDN Image Upload] Upload dialog unavailable, trying drag-drop for ${item.localPath}...`);
          await uploadImageViaEditorDrop(page, resolvedPath);
        }
      } catch (err) {
        console.warn(`[CSDN Image Upload] Dialog upload failed for ${item.localPath}: ${(err as Error).message}`);
        try {
          await uploadImageViaEditorDrop(page, resolvedPath);
          console.log(`[CSDN Image Upload] Drag-drop fallback triggered for ${item.localPath}`);
        } catch (dropErr) {
          console.warn(`[CSDN Image Upload] Drag-drop failed for ${item.localPath}: ${(dropErr as Error).message}`);
        }
      }

      const remoteUrl = await waitForUploadedImageUrl(page, markdownEditor, latestUrl);

      if (remoteUrl) {
        console.log(`[CSDN Image Upload] SUCCESS: ${item.localPath} -> ${remoteUrl}`);
        const replacement = `![${item.alt || "在这里插入图片描述"}](${remoteUrl}#pic_center)`;
        finalMarkdown = finalMarkdown.split(item.full).join(replacement);

        await page.keyboard.press("Escape").catch(() => undefined);
        if (await markdownEditor.count() > 0) {
          await markdownEditor.click().catch(() => undefined);
          await page.keyboard.press("Control+A").catch(() => undefined);
          await page.keyboard.press("Backspace").catch(() => undefined);
          await page.waitForTimeout(500);
        }
      } else {
        console.warn(`[CSDN Image Upload] Timeout for ${item.localPath}`);
        warnings.push(`CSDN: 图片上传超时: ${item.localPath}`);
      }
    }
  } catch (e) {
    console.warn(`[CSDN Image Upload] Critical Error:`, e);
    warnings.push(`CSDN: 图片上传过程发生错误: ${(e as Error).message}`);
  } finally {
    page.off("response", onResponse);
  }

  return finalMarkdown;
}

export async function publishArticle(request: PublishRequest): Promise<PublishResult> {
  console.log(`[CSDN Scraper] Starting publishArticle for: ${request.article.title}`);
  const { browser, context } = await createAuthenticatedContext(request.authFile, request.headless);
  const page = await context.newPage();
  const capturedResponses: Array<{ url: string; status: number; payload: unknown }> = [];
  const warnings: string[] = [];

  page.setDefaultTimeout(request.timeoutMs);
  page.setDefaultNavigationTimeout(request.timeoutMs);

  page.on("response", async (response) => {
    const url = response.url().toLowerCase();
    const isRelated = url.includes("csdn.net") || url.includes("csdnimg.cn") || url.includes("myhuaweicloud.com");
    if (!isRelated) return;
    const requestType = response.request().resourceType();
    if (!["xhr", "fetch"].includes(requestType)) return;

    capturedResponses.push({
      url: response.url(),
      status: response.status(),
      payload: await safeParseResponse(response),
    });
  });

  try {
    await page.goto(EDITOR_URL, { waitUntil: "domcontentloaded", timeout: request.timeoutMs });
    await page.waitForLoadState("networkidle", { timeout: request.timeoutMs }).catch(() => undefined);
    await dismissEditorOverlays(page);

    const titleFilled = await fillTitle(page, request.article.title || "");
    if (!titleFilled) throw new Error("Title input not found in CSDN editor.");
    
    // Clear the editor to ensure it's empty before image uploads (avoid default template interference)
    const markdownEditor = page.locator("pre.editor__inner[contenteditable='true'], .vditor-reset, #vditor").first();
    if (await markdownEditor.count() > 0) {
      await markdownEditor.click().catch(() => {});
      await page.keyboard.press("Control+A").catch(() => {});
      await page.keyboard.press("Backspace").catch(() => {});
      await page.waitForTimeout(500);
    }
    
    const baseDir = path.dirname(request.article.filePath);
    const finalBody = await uploadImagesInMarkdown(page, request.article.body, baseDir, warnings);

    const bodyFilled = await typeInEditor(page, finalBody);
    if (!bodyFilled) throw new Error("Markdown editor input not found in CSDN editor.");

    await maybeFillMetadata(page, request.article, warnings);
    const submitResult = await submitViaPublishDialog(page, request, warnings, capturedResponses);

    const info = extractPublishInfo(capturedResponses);
    const finalUrl = page.url();

    return {
      generatedAt: new Date().toISOString(),
      mode: "draft",
      title: request.article.title || "",
      summary: request.article.summary,
      category: request.article.category,
      tags: request.article.tags,
      original: request.article.original,
      coverPath: request.article.coverPath,
      coverApplied: submitResult.coverApplied,
      coverUrl: submitResult.coverUrl,
      finalUrl,
      articleId: info.articleId,
      articleUrl: info.articleUrl,
      success: submitResult.success,
      message: submitResult.message || (submitResult.success ? "草稿保存成功" : "未检测到明确的草稿保存请求或成功提示"),
      warnings,
      capturedResponses,
    };
  } finally {
    await Promise.race([context.close(), page.waitForTimeout(3000)]).catch(() => undefined);
    await Promise.race([browser.close(), page.waitForTimeout(3000)]).catch(() => undefined);
  }
}
