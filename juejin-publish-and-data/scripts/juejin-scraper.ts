import fs from "node:fs";
import path from "node:path";
import type { BrowserContext, BrowserContextOptions, Cookie, Locator, Page, Response } from "playwright";
import { chromium } from "playwright";
import {
  extractArticleIdFromUrl,
  JUEJIN_CREATOR_CONTENT_URL,
  JUEJIN_CREATOR_FOLLOWER_URL,
  JUEJIN_CREATOR_HOME_URL,
  JUEJIN_EDITOR_URL,
  normalizeDate,
} from "./common";
import type {
  ArticleInput,
  AuthFileRef,
  CapturedResponse,
  ConcretePageType,
  CookieFileEntry,
  CrawlResult,
  PostMode,
  PublishResult,
  StorageStateFile,
} from "./types";

interface CrawlOptions {
  authFile: AuthFileRef;
  pageTypes: ConcretePageType[];
  timeoutMs: number;
  headless: boolean;
}

interface PublishOptions {
  authFile: AuthFileRef;
  article: ArticleInput;
  timeoutMs: number;
  headless: boolean;
  mode: PostMode;
}

type NormalizedStorageState = Exclude<BrowserContextOptions["storageState"], string | undefined>;

const PAGE_URLS: Record<ConcretePageType, string> = {
  content: JUEJIN_CREATOR_CONTENT_URL,
  follower: JUEJIN_CREATOR_FOLLOWER_URL,
};

const PAGE_KEYWORDS: Record<ConcretePageType, string[]> = {
  content: ["article", "content", "single", "stat", "trend", "overview", "dashboard"],
  follower: ["follower", "follow", "fans", "distribution", "trend", "summary"],
};

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

function loadStorageStateFile(storageStatePath: string): NormalizedStorageState {
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

async function createContext(authFile: AuthFileRef, headless: boolean): Promise<{ browser: Awaited<ReturnType<typeof chromium.launch>>; context: BrowserContext }> {
  const browser = await chromium.launch({ headless });
  const contextOptions: BrowserContextOptions = {
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    viewport: { width: 1440, height: 960 },
  };

  const context = authFile.kind === "storage-state"
    ? await browser.newContext({ ...contextOptions, storageState: loadStorageStateFile(authFile.path) })
    : await browser.newContext(contextOptions);

  if (authFile.kind === "cookie") {
    await context.addCookies(loadCookieFile(authFile.path));
  }

  return { browser, context };
}

function shouldCapture(response: Response, pageType: ConcretePageType): boolean {
  const requestType = response.request().resourceType();
  if (requestType !== "xhr" && requestType !== "fetch") return false;

  const url = response.url().toLowerCase();
  if (!url.includes("juejin.cn")) return false;
  return PAGE_KEYWORDS[pageType].some((keyword) => url.includes(keyword));
}

async function safeParseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers()["content-type"] || "";
  if (contentType.includes("application/json") || contentType.includes("text/json")) {
    try {
      return await response.json();
    } catch {
      return { parseError: "response.json failed", fallbackText: await response.text() };
    }
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

async function snapshotFallbackState(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const win = window as unknown as Record<string, unknown>;
    const subset: Record<string, unknown> = {};
    for (const key of Object.keys(win)) {
      const lower = key.toLowerCase();
      if (
        lower.includes("state") ||
        lower.includes("follower") ||
        lower.includes("follow") ||
        lower.includes("article") ||
        lower.includes("trend") ||
        lower.includes("dashboard")
      ) {
        subset[key] = win[key];
      }
    }
    return subset;
  }).catch(() => undefined);
}

async function crawlSinglePage(
  pageType: ConcretePageType,
  authFile: AuthFileRef,
  timeoutMs: number,
  headless: boolean,
): Promise<CrawlResult> {
  const { browser, context } = await createContext(authFile, headless);
  const page = await context.newPage();
  const responses: CapturedResponse[] = [];

  page.on("response", async (response: Response) => {
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

  const targetUrl = PAGE_URLS[pageType];
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
  await page.waitForLoadState("networkidle", { timeout: timeoutMs }).catch(() => undefined);
  await page.waitForTimeout(2_000);

  if (pageType === "content") {
    await captureContentDetailTrends(page, responses, timeoutMs);
  }

  const result: CrawlResult = {
    pageType,
    targetUrl,
    finalUrl: page.url(),
    pageTitle: await page.title().catch(() => ""),
    bodyPreview: await page.locator("body").innerText().then((text) => text.slice(0, 2_000)).catch(() => ""),
    responses,
    fallbackState: await snapshotFallbackState(page),
  };

  await context.close();
  await browser.close();
  return result;
}

async function captureContentDetailTrends(page: Page, responses: CapturedResponse[], timeoutMs: number): Promise<void> {
  const detailButtons = page.getByRole("button", { name: /详情/ });
  const total = await detailButtons.count().catch(() => 0);
  const limit = Math.min(total, 5);

  for (let index = 0; index < limit; index += 1) {
    const button = detailButtons.nth(index);
    if (!await button.isVisible().catch(() => false)) continue;

    const beforeCount = responses.length;

    await button.scrollIntoViewIfNeeded().catch(() => undefined);
    await button.click().catch(() => undefined);
    await page.waitForTimeout(Math.min(timeoutMs, 1_500));

    const newResponses = responses.slice(beforeCount);
    for (const response of newResponses) {
      if (!response.url.includes("/author_center/data/trend")) continue;
      response.meta = {
        ...(response.meta ?? {}),
        detailIndex: index,
      };
    }

    const closeButton = await firstVisible([
      page.getByRole("button", { name: /关闭|收起|返回/ }),
      page.locator(".arco-drawer-close-btn").first(),
      page.locator(".arco-modal-close-btn").first(),
      page.locator("[class*='close']").first(),
    ]);

    if (closeButton) {
      await closeButton.click().catch(() => undefined);
    } else {
      await page.keyboard.press("Escape").catch(() => undefined);
    }

    await page.waitForTimeout(600);
  }
}

export async function crawlAnalytics(options: CrawlOptions): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  for (const pageType of options.pageTypes) {
    results.push(await crawlSinglePage(pageType, options.authFile, options.timeoutMs, options.headless));
  }
  return results;
}

export function detectLoginIssue(results: CrawlResult[]): string | undefined {
  for (const result of results) {
    const finalUrl = result.finalUrl.toLowerCase();
    const body = (result.bodyPreview || "").toLowerCase();
    if (finalUrl.includes("login") || finalUrl.includes("passport")) {
      return `Page ${result.pageType} redirected to login: ${result.finalUrl}`;
    }
    if (body.includes("登录") || body.includes("扫码登录") || body.includes("注册登录")) {
      return `Page ${result.pageType} appears to require login`;
    }
  }
  return undefined;
}

async function firstVisible(locators: Locator[]): Promise<Locator | null> {
  for (const locator of locators) {
    if (await locator.count() > 0 && await locator.first().isVisible().catch(() => false)) {
      return locator.first();
    }
  }
  return null;
}

async function fillTitle(page: Page, title: string): Promise<void> {
  const locator = await firstVisible([
    page.getByPlaceholder(/标题/),
    page.locator('input[placeholder*="标题"]'),
    page.locator('textarea[placeholder*="标题"]'),
    page.locator('[contenteditable="true"]').filter({ hasText: /^$/ }).first(),
  ]);
  if (!locator) throw new Error("Unable to locate title input in Juejin editor");
  await locator.click();
  await locator.fill("").catch(() => undefined);
  await locator.press("Control+A").catch(() => undefined);
  await locator.type(title, { delay: 10 });
}

async function fillBody(page: Page, content: string): Promise<void> {
  const codeMirror = page.locator(".CodeMirror").first();
  if (await codeMirror.count() > 0 && await codeMirror.isVisible().catch(() => false)) {
    const applied = await codeMirror.evaluate((element, nextContent) => {
      const host = element as HTMLElement & {
        CodeMirror?: {
          setValue: (value: string) => void;
          focus: () => void;
        };
      };
      if (!host.CodeMirror) return false;
      host.CodeMirror.setValue(String(nextContent));
      host.CodeMirror.focus();
      return true;
    }, content).catch(() => false);

    if (applied) {
      return;
    }

    await codeMirror.click().catch(() => undefined);
    const mirrorTextarea = page.locator(".CodeMirror textarea").first();
    if (await mirrorTextarea.count() > 0) {
      await mirrorTextarea.click().catch(() => undefined);
      await page.keyboard.press("Control+A").catch(() => undefined);
      await page.keyboard.insertText(content);
      return;
    }
  }

  const locator = await firstVisible([
    page.locator('textarea[data-testid="markdown-editor"]'),
    page.locator("textarea").filter({ hasNotText: /标题/ }).first(),
    page.locator('.ProseMirror[contenteditable="true"]'),
    page.locator('[contenteditable="true"]').nth(1),
  ]);
  if (!locator) throw new Error("Unable to locate article body editor in Juejin editor");

  try {
    await locator.fill(content);
    return;
  } catch {
    await locator.click();
    await locator.press("Control+A").catch(() => undefined);
    await page.keyboard.insertText(content);
  }
}

async function chooseSuggestion(page: Page, input: Locator, value: string, timeoutMs: number): Promise<boolean> {
  await input.click();
  await input.fill("").catch(() => undefined);
  await input.type(value, { delay: 20 });
  const suggestion = page.getByText(value, { exact: false }).first();
  if (await suggestion.isVisible({ timeout: Math.min(timeoutMs, 3_000) }).catch(() => false)) {
    await suggestion.click().catch(() => undefined);
    return true;
  }
  await page.keyboard.press("Enter").catch(() => undefined);
  return true;
}

async function applyTags(page: Page, tags: string[], timeoutMs: number): Promise<string[]> {
  if (tags.length === 0) return [];
  const indexedInput = page.locator("input.byte-select__input").first();
  if (await indexedInput.count() > 0 && await indexedInput.isVisible().catch(() => false)) {
    const applied: string[] = [];
    for (const tag of tags.slice(0, 5)) {
      if (await chooseSuggestion(page, indexedInput, tag, timeoutMs)) {
        applied.push(tag);
      }
    }
    if (applied.length > 0) return applied;
  }

  const trigger = await firstVisible([
    page.getByText(/标签/),
    page.getByRole("button", { name: /标签/ }),
    page.locator('input[placeholder*="标签"]'),
  ]);
  if (!trigger) return [];

  const applied: string[] = [];
  if ((await trigger.evaluate((element) => element.tagName)).toLowerCase() !== "input") {
    await trigger.click().catch(() => undefined);
  }

  const input = await firstVisible([
    page.locator('input[placeholder*="标签"]'),
    page.locator('input[placeholder*="添加标签"]'),
    page.locator('input[type="text"]').last(),
  ]);
  if (!input) return applied;

  for (const tag of tags.slice(0, 5)) {
    if (await chooseSuggestion(page, input, tag, timeoutMs)) {
      applied.push(tag);
    }
  }
  return applied;
}

async function applyColumn(page: Page, column: string | undefined, timeoutMs: number): Promise<string | undefined> {
  if (!column) return undefined;
  const indexedInput = page.locator("input.byte-select__input").nth(1);
  if (await indexedInput.count() > 0 && await indexedInput.isVisible().catch(() => false)) {
    await chooseSuggestion(page, indexedInput, column, timeoutMs);
    return column;
  }

  const trigger = await firstVisible([
    page.getByText(/专栏/),
    page.getByRole("button", { name: /专栏/ }),
    page.locator('input[placeholder*="专栏"]'),
  ]);
  if (!trigger) return undefined;
  if ((await trigger.evaluate((element) => element.tagName)).toLowerCase() !== "input") {
    await trigger.click().catch(() => undefined);
  }
  const input = await firstVisible([
    page.locator('input[placeholder*="专栏"]'),
    page.locator('input[placeholder*="搜索专栏"]'),
    page.locator('input[type="text"]').last(),
  ]);
  if (!input) return undefined;
  await chooseSuggestion(page, input, column, timeoutMs);
  return column;
}

async function applyCover(page: Page, coverPath: string | undefined): Promise<string | undefined> {
  if (!coverPath) return undefined;
  const input = page.locator('input[type="file"]').first();
  if (await input.count() === 0) return undefined;
  await input.setInputFiles(coverPath).catch(() => undefined);
  return coverPath;
}

async function applyVisibility(page: Page, visibility: string | undefined): Promise<string | undefined> {
  if (!visibility) return undefined;
  const trigger = await firstVisible([
    page.getByText(/可见性|权限|访问范围/),
    page.getByRole("button", { name: /可见性|权限|访问范围/ }),
  ]);
  if (!trigger) return undefined;
  await trigger.click().catch(() => undefined);
  const option = page.getByText(visibility, { exact: false }).first();
  if (await option.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await option.click().catch(() => undefined);
    return visibility;
  }
  return undefined;
}

async function clickSaveDraft(page: Page, timeoutMs: number): Promise<boolean> {
  const button = await firstVisible([
    page.getByRole("button", { name: /保存草稿|草稿/ }),
    page.getByText(/保存草稿|草稿/),
  ]);
  if (!button) return false;
  await button.click();
  await page.waitForTimeout(Math.min(timeoutMs, 3_000));
  return true;
}

async function uploadImagesInMarkdown(
  page: Page,
  markdown: string,
  baseDir: string,
  timeoutMs: number
): Promise<{ markdown: string; warnings: string[] }> {
  const warnings: string[] = [];
  let updatedMarkdown = markdown;
  
  const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const matches = [...markdown.matchAll(imgRegex)];
  
  if (matches.length === 0) {
    return { markdown, warnings };
  }

  const uploadedUrls = new Map<string, string>();
  const fileInput = page.locator("input[type='file'][accept*='image'], input[type='file']").first();
  const hasInput = await fileInput.count().then(c => c > 0).catch(() => false);
  
  if (!hasInput) {
    warnings.push("未定位到图片上传控件，无法上传本地图片。");
    return { markdown, warnings };
  }

  for (const match of matches) {
    const [fullMatch, altText, localPath] = match;
    
    if (localPath.startsWith("http://") || localPath.startsWith("https://") || localPath.startsWith("data:")) {
      continue;
    }
    
    const resolvedPath = path.resolve(baseDir, localPath);
    if (!fs.existsSync(resolvedPath)) {
      warnings.push(`本地图片不存在，跳过上传: ${resolvedPath}`);
      continue;
    }

    if (uploadedUrls.has(resolvedPath)) {
      const remoteUrl = uploadedUrls.get(resolvedPath)!;
      updatedMarkdown = updatedMarkdown.replace(fullMatch, `![${altText}](${remoteUrl})`);
      continue;
    }

    try {
      const responsePromise = page.waitForResponse(async (res) => {
        if (res.request().method() !== "POST") return false;
        const url = res.url();
        if (url.includes("bytedanceapi.com") || (url.includes("upload") && url.includes("image"))) {
          try {
            const json = await res.json();
            if (json.Result && Array.isArray(json.Result.Results) && json.Result.Results[0]?.Uri) {
              return true;
            }
          } catch(e) { }
        }
        return false;
      }, { timeout: Math.min(timeoutMs, 15_000) });

      await fileInput.setInputFiles(resolvedPath);
      
      const response = await responsePromise;
      const json = await response.json();
      const uri = json.Result.Results[0].Uri;
      const remoteUrl = `https://p3-juejin.byteimg.com/${uri}~tplv-k3u1n-jj-mark:0:0:0:0:q75.image`;
      
      uploadedUrls.set(resolvedPath, remoteUrl);
      updatedMarkdown = updatedMarkdown.replace(fullMatch, `![${altText}](${remoteUrl})`);
      
      await page.waitForTimeout(500);

    } catch (e) {
      warnings.push(`图片上传失败 ${localPath}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { markdown: updatedMarkdown, warnings };
}

export async function postArticle(options: PublishOptions): Promise<PublishResult> {
  const { browser, context } = await createContext(options.authFile, options.headless);
  const page = await context.newPage();

  await page.goto(JUEJIN_EDITOR_URL, { waitUntil: "domcontentloaded", timeout: options.timeoutMs });
  await page.waitForLoadState("networkidle", { timeout: options.timeoutMs }).catch(() => undefined);
  await page.waitForTimeout(2_000);

  if (page.url().toLowerCase().includes("login") || page.url().toLowerCase().includes("passport")) {
    await context.close();
    await browser.close();
    throw new Error(`Editor redirected to login: ${page.url()}`);
  }

  await fillTitle(page, options.article.title);
  
  const baseDir = path.dirname(options.article.filePath);
  const { markdown: updatedContent, warnings } = await uploadImagesInMarkdown(
    page,
    options.article.content,
    baseDir,
    options.timeoutMs
  );
  
  await fillBody(page, updatedContent);
  const appliedTags = await applyTags(page, options.article.tags, options.timeoutMs);
  const appliedColumn = await applyColumn(page, options.article.column, options.timeoutMs);
  const appliedCover = await applyCover(page, options.article.cover);
  const appliedVisibility = await applyVisibility(page, options.article.visibility);

  const ok = await clickSaveDraft(page, options.timeoutMs);
  if (!ok) {
    await context.close();
    await browser.close();
    throw new Error("Save-draft action was not confirmed in the editor UI");
  }

  await page.waitForTimeout(2_000);
  const articleUrl = page.url() === JUEJIN_EDITOR_URL ? undefined : page.url();
  const result: PublishResult = {
    mode: "draft",
    title: options.article.title,
    articleUrl,
    articleId: articleUrl ? extractArticleIdFromUrl(articleUrl) : undefined,
    editorUrl: page.url(),
    appliedTags,
    appliedColumn,
    appliedCover,
    visibility: appliedVisibility,
    message: "Draft flow completed",
    warnings: warnings.length > 0 ? warnings : undefined,
  };

  await context.close();
  await browser.close();
  return result;
}

export async function verifyCreatorHome(authFile: AuthFileRef, timeoutMs: number, headless: boolean) {
  const { browser, context } = await createContext(authFile, headless);
  const page = await context.newPage();
  await page.goto(JUEJIN_CREATOR_HOME_URL, { waitUntil: "domcontentloaded", timeout: timeoutMs });
  await page.waitForLoadState("networkidle", { timeout: timeoutMs }).catch(() => undefined);
  const summary = {
    finalUrl: page.url(),
    title: await page.title().catch(() => ""),
    bodyPreview: await page.locator("body").innerText().then((text) => text.slice(0, 1500)).catch(() => ""),
  };
  await context.close();
  await browser.close();
  return summary;
}