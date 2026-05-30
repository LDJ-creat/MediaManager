export type PageType = "content" | "user" | "both";

export type ConcretePageType = "content" | "user";

export type AuthFileKind = "cookie" | "storage-state";

export interface AuthFileRef {
  kind: AuthFileKind;
  path: string;
}

export interface CliOptions {
  page: PageType;
  token?: string;
  start?: string;
  end?: string;
  outputDir: string;
  cookiePath?: string;
  statePath?: string;
  proxyServer?: string;
  saveRaw: boolean;
  probeOnly: boolean;
  headless: boolean;
  timeoutMs: number;
}

export interface SkillConfig {
  defaultPage: PageType;
  defaultToken?: string;
  defaultOutputDir: string;
  defaultSaveRaw: boolean;
  defaultTimeoutMs: number;
  cookieFileName: string;
  storageStateFileName: string;
}

export interface CookieFileEntry {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expires?: number;
  expirationDate?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export interface StorageStateFile {
  cookies: CookieFileEntry[];
  origins?: Array<{
    origin: string;
    localStorage?: Array<{
      name: string;
      value: string;
    }>;
  }>;
}

export interface CapturedResponse {
  pageType: ConcretePageType;
  url: string;
  status: number;
  contentType: string;
  capturedAt: string;
  payload: unknown;
}

export interface MetricPoint {
  pageType: ConcretePageType;
  date: string;
  metric: string;
  value: number;
  sourceUrl: string;
}

export interface ContentSummary {
  read: number;
  like: number;
  share: number;
  collection: number;
  comment: number;
}

export interface UserSummary {
  newUser: number;
  cancelUser: number;
  netgainUser: number;
  cumulateUser: number;
}

export interface ContentTrendPoint {
  date: string;
  readUv: number;
  shareUv: number;
  sourceUv?: number;
  collectionUv?: number;
  massPv?: number;
}

export interface ContentArticleItem {
  title: string;
  refDate: string;
  totalReadUv: number;
  readUvRatio?: number;
}

export interface UserDailyItem {
  date: string;
  newUser: number;
  cancelUser: number;
  netgainUser: number;
  cumulateUser: number;
}

export interface ContentNormalizedData {
  summary?: ContentSummary;
  dailyTotals: ContentTrendPoint[];
  articles: ContentArticleItem[];
}

export interface UserNormalizedData {
  summary?: UserSummary;
  dailyTotals: UserDailyItem[];
}

export interface NormalizedAnalytics {
  content?: ContentNormalizedData;
  user?: UserNormalizedData;
}

export interface CrawlResult {
  pageType: ConcretePageType;
  targetUrl: string;
  finalUrl: string;
  resolvedToken?: string;
  pageTitle?: string;
  bodyPreview?: string;
  responses: CapturedResponse[];
  fallbackState?: unknown;
}

export interface FetchOutput {
  generatedAt: string;
  page: PageType;
  start?: string;
  end?: string;
  outputDir: string;
  records: CrawlResult[];
  metrics: MetricPoint[];
  normalized: NormalizedAnalytics;
}
