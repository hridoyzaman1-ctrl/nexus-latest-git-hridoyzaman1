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
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  imageUrl: string | null;
  summary: string;
  category: NewsCategory;
  language: string;
  region: string;
}

export interface NewsSource {
  name: string;
  feedUrl: string;
  mode: NewsMode;
  category: NewsCategory;
  language: string;
  region: string;
}

export interface NewsCache {
  articles: NewsArticle[];
  fetchedAt: number;
  mode: NewsMode;
  category: NewsCategory;
}

export interface NewsBookmark {
  articleId: string;
  article: NewsArticle;
  savedAt: string;
}
