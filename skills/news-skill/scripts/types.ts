export interface RawArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  pub_date: string;
  source: string;
  source_hint: string;
  source_weight: number;
}

export interface RssSource {
  name: string;
  url: string;
  source_hint: string;
  weight: number;
}

export interface Category {
  id: string;
  display_name: string;
  icon: string;
}

export interface Params {
  TOP_PICKS_COUNT?: number;
  MAX_PER_SOURCE?: number;
  GLOBAL_MAX?: number;
  TIME_WINDOW_HOURS?: number;
  DEDUP_RETENTION_DAYS?: number;
  BASE_THRESHOLD?: number;
}

export interface SourcesConfig {
  version: number;
  sources: RssSource[];
  params: Params;
  categories: Category[];
}

export interface AnalyzedArticle extends RawArticle {
  score?: number;
  category?: string;
  chinese_title?: string;
  summary_zh?: string;
}

export type SeenUrlsData = Record<string, string[]>;
