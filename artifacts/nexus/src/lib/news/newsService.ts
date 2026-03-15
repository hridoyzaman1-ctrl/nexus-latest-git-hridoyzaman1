import { NewsArticle, NewsMode, NewsCategory } from '@/types/news';
import { getCachedNews, setCachedNews, isCacheValid } from './cache';

const API_BASE = '/api/news';

let lastFetchTime = 0;
const DEBOUNCE_MS = 3000;

export async function fetchNews(mode: NewsMode, category: NewsCategory): Promise<{
  articles: NewsArticle[];
  fromCache: boolean;
  error?: string;
}> {
  const now = Date.now();
  const cached = getCachedNews(mode, category);

  // If offline, return cache immediately if available
  if (typeof navigator !== 'undefined' && !navigator.onLine && cached) {
    return { articles: cached.articles, fromCache: true, error: 'Offline: showing saved headlines.' };
  }

  if (now - lastFetchTime < DEBOUNCE_MS) {
    if (cached) return { articles: cached.articles, fromCache: true };
  }

  if (isCacheValid(cached)) {
    return { articles: cached!.articles, fromCache: true };
  }

  try {
    lastFetchTime = now;
    const url = `${API_BASE}?mode=${mode}&category=${category}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const articles: NewsArticle[] = data.articles || [];

    setCachedNews(mode, category, articles);

    return { articles, fromCache: false };
  } catch (err: any) {
    if (cached) {
      return {
        articles: cached.articles,
        fromCache: true,
        error: 'Showing last loaded news due to connection issue.',
      };
    }
    return {
      articles: [],
      fromCache: false,
      error: 'Unable to load news. Please check your connection and try again.',
    };
  }
}

export function searchArticles(articles: NewsArticle[], query: string): NewsArticle[] {
  if (!query.trim()) return articles;
  const q = query.toLowerCase();
  return articles.filter(a =>
    a.title.toLowerCase().includes(q) ||
    a.summary.toLowerCase().includes(q) ||
    a.source.toLowerCase().includes(q)
  );
}

export function isBreakingNews(article: NewsArticle): boolean {
  const ageMs = Date.now() - new Date(article.publishedAt).getTime();
  return ageMs < 60 * 60 * 1000;
}

export function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
