export const GLOBAL_CONFIG_VERSION = 1;
export const WORKSPACE_CONFIG_VERSION = 1;
export const WORKSPACE_LAYOUT = "v1";
export const CLI_VERSION = "0.1.4";

export interface GlobalConfig {
  version: number;
  workspace: string;
  initializedAt: string;
  cliVersion: string;
}

export interface WorkspaceConfig {
  version: number;
  layout: string;
  createdAt: string;
}

export interface WorkspacePaths {
  workspace: string;
  outputDir: string;
  guidanceDir: string;
  analysisDir: string;
  mediaManagerDir: string;
  newsDataDir: string;
  authDir: string;
  secretsDir: string;
  analyticsDir: (platform: string) => string;
  authPlatformDir: (platform: string) => string;
  articleDir: (slug: string) => string;
}
