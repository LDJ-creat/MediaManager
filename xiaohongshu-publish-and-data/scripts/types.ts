export type PostMode = "publish";

export type AuthFileKind = "cookie" | "storage-state";

export interface AuthFileRef {
  kind: AuthFileKind;
  path: string;
}

export interface SkillConfig {
  defaultOutputDir: string;
  defaultTags: string[];
  defaultTimeoutMs: number;
  cookieFileName: string;
  storageStateFileName: string;
}

export interface PostCliOptions {
  filePath?: string;
  imagePaths: string[];
  outputDir: string;
  cookiePath?: string;
  statePath?: string;
  headless: boolean;
  timeoutMs: number;
  title?: string;
  note?: string;
  tags: string[];
  draft: boolean;
  publishRequested: boolean;
  cdpUrl?: string;
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

export interface NoteFrontmatter {
  title?: string;
  note?: string;
  tags?: string[] | string;
  images?: string[] | string;
}

export interface NoteInput {
  filePath?: string;
  title: string;
  note: string;
  tags: string[];
  imagePaths: string[];
}

export interface CapturedResponse {
  url: string;
  status: number;
  payload: unknown;
}

export interface PublishRequest {
  note: NoteInput;
  authFile?: AuthFileRef;
  headless: boolean;
  timeoutMs: number;
  cdpUrl?: string;
}

export interface PublishResult {
  generatedAt: string;
  mode: PostMode;
  title: string;
  note: string;
  tags: string[];
  imagePaths: string[];
  finalUrl: string;
  success: boolean;
  message?: string;
  warnings: string[];
  capturedResponses: CapturedResponse[];
  screenshotPath?: string;
}

export interface LoginCheckResult {
  valid: boolean;
  finalUrl: string;
  message: string;
}
