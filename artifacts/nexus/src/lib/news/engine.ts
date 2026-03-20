import { NewsArticle, NewsMode, NewsCategory, NewsSource } from '@/types/news';
import { parseFeed } from './parser';
import { getCachedNews, setCachedNews } from './cache';

// Public CORS proxies as a safety layer for browser environments.
// If the app runs in a native aggregate (like Capacitor) these may not be needed.
const PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://wrapper.jason-it.com/?url='
];

export interface FetchOptions {
  signal?: AbortSignal;
  forceFresh?: boolean;
  onArticles?: (articles: NewsArticle[]) => void;
}

export async function fetchFeedItems(
  sources: NewsSource[],
  mainCategory: NewsMode,
  subCategory: NewsCategory,
  options: FetchOptions = {}
): Promise<NewsArticle[]> {
  const { signal, forceFresh } = options;
  
  const fetchPromises = sources.map(async (source) => {
    try {
      // Add a 6s timeout per source to prevent one slow source from hanging the whole portal
      const sourceTimeout = new Promise<string | null>((_, reject) => 
        setTimeout(() => reject(new Error('Source timeout')), 6000)
      );
      
      const xml = await Promise.race([
        fetchWithRetry(source.feedUrl, signal, forceFresh),
        sourceTimeout
      ]);
      
      if (!xml) return [];
      const sourceArticles = parseFeed(xml, source.name, mainCategory, subCategory);
      
      // Notify caller incrementally
      if (sourceArticles.length > 0 && options.onArticles) {
        options.onArticles(sourceArticles);
      }
      
      return sourceArticles;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.warn(`Failed to fetch ${source.name}:`, err);
      }
      return [];
    }
  });

  const results = await Promise.allSettled(fetchPromises);
  let allArticles: NewsArticle[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allArticles = [...allArticles, ...result.value];
    }
  }

  // Deduplicate by title/url
  const seen = new Set<string>();
  const deduplicated = allArticles.filter(art => {
    const key = (art.title + art.url).toLowerCase().replace(/\s/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort newest first
  return deduplicated.sort((a, b) => 
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  ).slice(0, 80);
}

async function fetchWithRetry(url: string, signal?: AbortSignal, forceFresh?: boolean): Promise<string | null> {
  const cacheBust = forceFresh ? `&f=${Date.now()}` : '';
  const fullUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}${cacheBust}`;
  
  // Create all racing promises
  const allAttempts: Promise<string>[] = [];

  // 1. Direct fetch promise
  allAttempts.push((async () => {
    const res = await fetch(fullUrl, { 
      signal, 
      headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' } 
    });
    if (!res.ok) throw new Error('Direct failed');
    const txt = await res.text();
    if (txt.trim().length < 50) throw new Error('Empty response');
    return txt;
  })());

  // 2. Proxy promises
  PROXIES.forEach(proxy => {
    allAttempts.push((async () => {
      const proxiedUrl = `${proxy}${encodeURIComponent(fullUrl)}`;
      const res = await fetch(proxiedUrl, { signal });
      if (!res.ok) throw new Error('Proxy failed');
      
      const txt = await res.text();
      if (!txt || txt.trim().length < 50) throw new Error('Invalid proxy response');
      return txt;
    })());
  });

  try {
    // Race them all! First one to finish (and not throw) wins.
    return await Promise.any(allAttempts);
  } catch (e) {
    return null;
  }
}

export function getFeedKey(main: NewsMode, sub: NewsCategory): string {
  return `${main}::${sub}`;
}

export function searchArticles(articles: NewsArticle[], query: string): NewsArticle[] {
  if (!query.trim()) return articles;
  const q = query.toLowerCase();
  return articles.filter(a =>
    a.title.toLowerCase().includes(q) ||
    a.summary.toLowerCase().includes(q) ||
    a.sourceName.toLowerCase().includes(q)
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
