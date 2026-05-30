export type PageType = "content" | "follower" | "both";

export type ConcretePageType = "content" | "follower";

export type AuthFileKind = "cookie" | "storage-state";

export type PostMode = "draft";

export interface AuthFileRef {
  kind: AuthFileKind;
  path: string;
}

export interface FetchCliOptions {
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
  file?: string;
  title?: string;
  cover?: string;
  tags: string[];
  column?: string;
  cookiePath?: string;
  statePath?: string;
  headless: boolean;
  timeoutMs: number;
  mode: PostMode;
  visibility?: string;
}

export interface SkillConfig {
  defaultPage: PageType;
  defaultOutputDir: string;
  defaultPostMode: PostMode;
  defaultTags: string[];
  defaultColumn?: string;
  defaultVisibility?: string;
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
  meta?: Record<string, unknown>;
  payload: unknown;
}

export interface CrawlResult {
  pageType: ConcretePageType;
  targetUrl: string;
  finalUrl: string;
  pageTitle?: string;
  bodyPreview?: string;
  responses: CapturedResponse[];
  fallbackState?: unknown;
}

export interface ArticleTrendRow {
  date: string;
  displayCount: number;
  viewCount: number;
  diggCount: number;
  commentCount: number;
  collectCount: number;
  shareCount: number;
}

export interface ArticleNormalizedRecord {
  articleId: string;
  articleUrl: string;
  title: string;
  briefContent?: string;
  publishTime?: string;
  displayCount: number;
  viewCount: number;
  diggCount: number;
  commentCount: number;
  collectCount: number;
  shareCount: number;
  recent7Days: ArticleTrendRow[];
  sourceUrls: string[];
}

export interface ContentOverview {
  articleCount?: number;
  displayCount?: number;
  viewCount?: number;
  diggCount?: number;
  commentCount?: number;
  collectCount?: number;
}

export interface ContentNormalizedData {
  overview?: ContentOverview;
  articles: ArticleNormalizedRecord[];
}

export interface FollowerDateRow {
  date: string;
  totalFollowers?: number;
  activeFollowers?: number;
  netFollowers: number;
  newFollowers: number;
  lostFollowers: number;
}

export interface FollowerNormalizedData {
  totalFollowers?: number;
  activeFollowers?: number;
  netFollowers?: number;
  newFollowers?: number;
  lostFollowers?: number;
  dateRows: FollowerDateRow[];
  distribution?: Record<string, unknown>;
}

export interface NormalizedAnalytics {
  content?: ContentNormalizedData;
  follower?: FollowerNormalizedData;
}

export interface FetchOutput {
  generatedAt: string;
  page: PageType;
  start?: string;
  end?: string;
  outputDir: string;
  rawDir?: string;
  normalized: NormalizedAnalytics;
}

export interface FrontmatterArticle {
  title?: string;
  tags?: string[] | string;
  cover?: string;
  coverImage?: string;
  featureImage?: string;
  image?: string;
  column?: string;
  visibility?: string;
}

export interface ArticleInput {
  filePath: string;
  content: string;
  frontmatter: FrontmatterArticle;
  title: string;
  tags: string[];
  cover?: string;
  column?: string;
  visibility?: string;
}

export interface PublishResult {
  mode: PostMode;
  title: string;
  articleUrl?: string;
  articleId?: string;
  editorUrl: string;
  appliedTags: string[];
  appliedColumn?: string;
  appliedCover?: string;
  visibility?: string;
  message: string;
  warnings?: string[];
}