export type NewsMode = 'international' | 'national';

export type NewsCategory =
  | 'top'
  | 'world'
  | 'politics'
  | 'business'
  | 'technology'
  | 'sports'
  | 'entertainment'
  | 'health'
  | 'bangladesh';

export interface NewsArticle {
  id: string; // generated locally
  title: string;
  sourceName: string;
  publishedAt: string;
  url: string; // original article link
  link: string; // alias for url for various parsers
  imageUrl: string | null;
  summary: string;
  mainCategory: NewsMode;
  subCategory: NewsCategory;
}

export interface FeedState {
  items: NewsArticle[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  fromCache: boolean;
  hasLoadedOnce: boolean;
  lastUpdated: number;
}

export type FeedStore = Record<string, FeedState>;

export interface NewsSource {
  name: string;
  feedUrl: string;
}

export interface NewsCache {
  items: NewsArticle[];
  fetchedAt: number;
}

export interface NewsBookmark {
  articleId: string;
  article: NewsArticle;
  savedAt: string;
}
