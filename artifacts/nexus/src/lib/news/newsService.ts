import { NewsArticle, NewsMode, NewsCategory } from '@/types/news';
import { getCachedNews, setCachedNews, isCacheValid } from './cache';
import { NEWS_SOURCES } from './sources';
import { deduplicateArticles } from './deduplicator';

const PROXIES = [
  'https://api.allorigins.win/get?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest='
];

let lastFetchTime = 0;
const DEBOUNCE_MS = 2000;

function extractText(xml: string, tag: string): string {
  const cdataMatch = xml.match(new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`));
  if (cdataMatch) return cdataMatch[1].trim();
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].replace(/<[^>]+>/g, '').trim() : '';
}

function extractImage(itemXml: string): string | null {
  const mediaThumbnail = itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/);
  if (mediaThumbnail) return mediaThumbnail[1];
  const mediaContent = itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/);
  if (mediaContent) return mediaContent[1];
  const enclosure = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image/);
  if (enclosure) return enclosure[1];
  const contentEncoded = itemXml.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/);
  if (contentEncoded) {
    const imgInContent = contentEncoded[1].match(/<img[^>]+src=["']([^"']+)["']/);
    if (imgInContent) return imgInContent[1];
  }
  const imgTag = itemXml.match(/<img[^>]+src=["']([^"']+)["']/);
  if (imgTag) return imgTag[1];
  return null;
}

function parseRSSItems(xml: string, sourceName: string, category: string, region: string, language: string): NewsArticle[] {
  const articles: NewsArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractText(itemXml, 'title');
    const link = extractText(itemXml, 'link');
    const pubDate = extractText(itemXml, 'pubDate');
    const description = extractText(itemXml, 'description');
    const imageUrl = extractImage(itemXml);
    if (title && link) {
      const id = `news_${Math.abs(title.length + link.length).toString(36)}_${Date.now().toString(36)}`;
      articles.push({
        id,
        title,
        url: link,
        source: sourceName,
        publishedAt: (() => {
          if (!pubDate) return new Date().toISOString();
          const t = Date.parse(pubDate);
          return isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
        })(),
        summary: description,
        imageUrl,
        category: category as NewsCategory,
        region,
        language
      });
    }
  }
  return articles;
}

async function fetchWithProxy(baseUrl: string, feedUrl: string, signal?: AbortSignal): Promise<string> {
  const url = `${baseUrl}${encodeURIComponent(feedUrl)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Proxy ${baseUrl} failed`);
  
  if (baseUrl.includes('allorigins')) {
    const data = await res.json();
    return data.contents;
  }
  return await res.text();
}

async function fetchFeed(source: any, signal?: AbortSignal): Promise<NewsArticle[]> {
  try {
    // Try direct fetch with short timeout
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    const combinedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    
    try {
      const res = await fetch(source.feedUrl, { 
        headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
        signal: combinedSignal
      });
      clearTimeout(id);
      if (res.ok) {
        const xml = await res.text();
        return parseRSSItems(xml, source.name, source.category, source.region, source.language);
      }
    } catch (err) {
      clearTimeout(id);
    }

    // Try all proxies in parallel - win with the first one that returns valid XML
    const proxyResults = await Promise.any(
      PROXIES.map(proxy => fetchWithProxy(proxy, source.feedUrl, signal))
    );

    if (proxyResults) {
      return parseRSSItems(proxyResults, source.name, source.category, source.region, source.language);
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.warn(`All fetch attempts failed for ${source.name}`);
    }
  }
  return [];
}

export async function fetchNews(mode: NewsMode, category: NewsCategory, signal?: AbortSignal): Promise<{
  articles: NewsArticle[];
  fromCache: boolean;
  error?: string;
}> {
  const now = Date.now();
  const cached = getCachedNews(mode, category);

  // Return cache if valid
  if (isCacheValid(cached)) {
    return { articles: cached!.articles, fromCache: true };
  }

  // If offline, return cache immediately if available
  if (typeof navigator !== 'undefined' && !navigator.onLine && cached) {
    return { articles: cached.articles, fromCache: true, error: 'Offline: showing saved headlines.' };
  }

  if (now - lastFetchTime < DEBOUNCE_MS && cached) {
    return { articles: cached.articles, fromCache: true };
  }

  try {
    lastFetchTime = now;
    
    // Select sources
    let sources = NEWS_SOURCES.filter(s => s.mode === mode);
    if (category !== 'top') {
      const catSources = sources.filter(s => s.category === category);
      if (catSources.length > 0) sources = catSources;
    }

    // Limit to 12 random sources per request to avoid overwhelming but ensure coverage
    if (sources.length > 12) {
      sources = sources.sort(() => Math.random() - 0.5).slice(0, 12);
    }

    const feedResults = await Promise.allSettled(sources.map(s => fetchFeed(s, signal)));
    let allArticles: NewsArticle[] = [];

    for (const result of feedResults) {
      if (result.status === 'fulfilled') {
        allArticles = [...allArticles, ...result.value];
      }
    }

    if (allArticles.length === 0) {
      if (signal?.aborted) throw new Error('AbortError');
      throw new Error('No news articles found');
    }

    const deduplicated = deduplicateArticles(allArticles);
    const sorted = deduplicated.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    ).slice(0, 60);

    setCachedNews(mode, category, sorted);

    return { articles: sorted, fromCache: false };
  } catch (err: any) {
    if (err.message === 'AbortError') throw err;
    
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
      error: 'Unable to load live news. Please check your connection.',
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
