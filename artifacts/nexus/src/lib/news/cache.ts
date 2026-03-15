import { NewsArticle, NewsMode, NewsCategory, NewsCache, NewsBookmark } from '@/types/news';

const CACHE_PREFIX = 'newsCache_v5_';
const BOOKMARK_KEY = 'newsBookmarks';
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes for lightning fast updates

function getCacheKey(mode: NewsMode, category: NewsCategory): string {
  // Use mode + category in key to prevent regional data leakage
  return `${CACHE_PREFIX}${mode}_${category}`;
}

export function getCachedNews(mode: NewsMode, category: NewsCategory): NewsCache | null {
  try {
    const raw = localStorage.getItem(getCacheKey(mode, category));
    if (!raw) return null;
    const cache: NewsCache = JSON.parse(raw);
    return cache;
  } catch {
    return null;
  }
}

export function isCacheValid(cache: NewsCache | null): boolean {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < CACHE_TTL;
}

export function setCachedNews(mode: NewsMode, category: NewsCategory, articles: NewsArticle[]): void {
  try {
    const cache: NewsCache = {
      articles,
      fetchedAt: Date.now(),
      mode,
      category,
    };
    localStorage.setItem(getCacheKey(mode, category), JSON.stringify(cache));
  } catch {
  }
}

export function getBookmarks(): NewsBookmark[] {
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addBookmark(article: NewsArticle): void {
  const bookmarks = getBookmarks();
  if (bookmarks.some(b => b.articleId === article.id)) return;
  bookmarks.unshift({
    articleId: article.id,
    article,
    savedAt: new Date().toISOString(),
  });
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
}

export function removeBookmark(articleId: string): void {
  const bookmarks = getBookmarks().filter(b => b.articleId !== articleId);
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
}

export function isBookmarked(articleId: string): boolean {
  return getBookmarks().some(b => b.articleId === articleId);
}

export function getSelectedMode(): NewsMode {
  try {
    return (localStorage.getItem('newsSelectedMode') as NewsMode) || 'international';
  } catch {
    return 'international';
  }
}

export function setSelectedMode(mode: NewsMode): void {
  localStorage.setItem('newsSelectedMode', mode);
}

export function getSelectedCategory(): NewsCategory {
  try {
    return (localStorage.getItem('newsSelectedCategory') as NewsCategory) || 'top';
  } catch {
    return 'top';
  }
}

export function setSelectedCategory(category: NewsCategory): void {
  localStorage.setItem('newsSelectedCategory', category);
}
