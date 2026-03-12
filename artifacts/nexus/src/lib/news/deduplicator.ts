import { NewsArticle } from '@/types/news';

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(a: string, b: string): number {
  const wordsA = new Set(normalizeTitle(a).split(' '));
  const wordsB = new Set(normalizeTitle(b).split(' '));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  wordsA.forEach(w => { if (wordsB.has(w)) intersection++; });
  return (2 * intersection) / (wordsA.size + wordsB.size);
}

export function deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Map<string, NewsArticle>();
  const result: NewsArticle[] = [];

  for (const article of articles) {
    const urlKey = article.url.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();

    if (seen.has(urlKey)) continue;

    let isDuplicate = false;
    for (const existing of result) {
      if (similarity(article.title, existing.title) > 0.7) {
        const timeDiffMs = Math.abs(new Date(article.publishedAt).getTime() - new Date(existing.publishedAt).getTime());
        if (timeDiffMs < 24 * 60 * 60 * 1000) {
          isDuplicate = true;
          break;
        }
      }
    }

    if (!isDuplicate) {
      seen.set(urlKey, article);
      result.push(article);
    }
  }

  return result;
}
