export type PageType = "analytics" | "manage" | "both";

export type ConcretePageType = "analytics" | "manage";

export type PostMode = "draft";

export type AuthFileKind = "cookie" | "storage-state";

export interface AuthFileRef {
  kind: AuthFileKind;
  path: string;
}

export interface SkillConfig {
  defaultOutputDir: string;
  defaultCategories: string[];
  defaultTags: string[];
  defaultOriginalFlag: boolean;
  defaultSaveRaw: boolean;
  defaultTimeoutMs: number;
  cookieFileName: string;
  storageStateFileName: string;
}

export interface AnalyticsCliOptions {
  page: PageType;
  start?: string;
  end?: string;
  outputDir: string;
  cookiePath?: string;
  statePath?: string;
  saveRaw: boolean;
  probeOnly: boolean;
  headless: boolean;
  timeoutMs: number;
}

export interface PostCliOptions {
  filePath: string;
  outputDir: string;
  cookiePath?: string;
  statePath?: string;
  headless: boolean;
  timeoutMs: number;
  title?: string;
  summary?: string;
  category?: string;
  tags: string[];
  original?: boolean;
  coverPath?: string;
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

export interface ArticleFrontmatter {
  title?: string;
  summary?: string;
  abstract?: string;
  excerpt?: string;
  category?: string;
  categories?: string[] | string;
  tags?: string[] | string;
  original?: boolean | string;
}

export interface ArticleInput {
  filePath: string;
  content: string;
  body: string;
  title?: string;
  summary?: string;
  category?: string;
  tags: string[];
  original?: boolean;
  coverPath?: string;
}

export interface CapturedResponse {
  pageType: ConcretePageType;
  url: string;
  status: number;
  contentType: string;
  capturedAt: string;
  payload: unknown;
}

export interface FallbackTable {
  headers: string[];
  rows: string[][];
}

export interface FallbackCard {
  text: string;
}

export interface PageFallbackState {
  headings: string[];
  tables: FallbackTable[];
  cards: FallbackCard[];
}

export interface CrawlResult {
  pageType: ConcretePageType;
  targetUrl: string;
  finalUrl: string;
  pageTitle?: string;
  bodyPreview?: string;
  responses: CapturedResponse[];
  fallbackState?: PageFallbackState;
}

export interface CreatorOverview {
  articleCount?: number;
  exposuresCount?: number;
  diggCount?: number;
  commentCount?: number;
  viewCount?: number;
  score?: number;
  averageQuality?: number;
  collectCount?: number;
}

export interface ArticleDailyStats {
  date: string;
  exposuresCount?: number;
  viewCount?: number;
  commentCount?: number;
  diggCount?: number;
  favoriteCount?: number;
  fansCount?: number;
}

export interface ArticleQualityScore {
  score?: number;
  version?: string;
  createAt?: string;
}

export interface ArticleSummary {
  publishTime?: string;
  exposuresCount?: number;
  viewCount?: number;
  commentCount?: number;
  diggCount?: number;
  favoriteCount?: number;
  fansCount?: number;
  qualityScore?: ArticleQualityScore;
}

export interface ArticleAnalyticsReport {
  articleId: string;
  title: string;
  url?: string;
  summary: ArticleSummary;
  recent7Days: ArticleDailyStats[];
}

export interface AnalyticsReport {
  range: {
    start: string;
    end: string;
  };
  overview: CreatorOverview;
  articles: ArticleAnalyticsReport[];
}

export interface FetchOutput {
  generatedAt: string;
  report: AnalyticsReport;
}

export interface PublishRequest {
  article: ArticleInput;
  authFile: AuthFileRef;
  headless: boolean;
  timeoutMs: number;
  coverPath?: string;
}

export interface PublishResult {
  generatedAt: string;
  mode: PostMode;
  title: string;
  summary?: string;
  category?: string;
  tags: string[];
  original?: boolean;
  finalUrl: string;
  articleId?: string;
  articleUrl?: string;
  success: boolean;
  message?: string;
  warnings: string[];
  capturedResponses: Array<{
    url: string;
    status: number;
    payload: unknown;
  }>;
  coverPath?: string;
}