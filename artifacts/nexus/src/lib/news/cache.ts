import { NewsArticle, NewsMode, NewsCategory, NewsCache, NewsBookmark } from '@/types/news';
import { getFeedKey } from './engine';

const CACHE_PREFIX = 'news_feed_v6_';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export function getCachedNews(mode: NewsMode, category: NewsCategory): NewsCache | null {
  try {
    const key = getFeedKey(mode, category);
    const data = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setCachedNews(mode: NewsMode, category: NewsCategory, items: NewsArticle[]): void {
  try {
    const key = getFeedKey(mode, category);
    const cache: NewsCache = {
      items,
      fetchedAt: Date.now()
    };
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to save news cache:', e);
  }
}

export function isCacheValid(cache: NewsCache | null): boolean {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < CACHE_TTL;
}

export function clearAllNewsCache(): void {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('news_feed_')) {
      localStorage.removeItem(key);
    }
  });
}

// Preference Helpers
export function getSelectedMode(): NewsMode {
  return (localStorage.getItem('news_selected_mode') as NewsMode) || 'international';
}

export function setSelectedMode(mode: NewsMode): void {
  localStorage.setItem('news_selected_mode', mode);
}

export function getSelectedCategory(): NewsCategory {
  return (localStorage.getItem('news_selected_category') as NewsCategory) || 'top';
}

export function setSelectedCategory(category: NewsCategory): void {
  localStorage.setItem('news_selected_category', category);
}

// Bookmarks
export function getBookmarks(): NewsBookmark[] {
  try {
    const data = localStorage.getItem('news_bookmarks');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addBookmark(article: NewsArticle): void {
  const bookmarks = getBookmarks();
  if (!bookmarks.find(b => b.articleId === article.id)) {
    bookmarks.push({
      articleId: article.id,
      article,
      savedAt: new Date().toISOString()
    });
    localStorage.setItem('news_bookmarks', JSON.stringify(bookmarks));
  }
}

export function removeBookmark(articleId: string): void {
  const bookmarks = getBookmarks().filter(b => b.articleId !== articleId);
  localStorage.setItem('news_bookmarks', JSON.stringify(bookmarks));
}
