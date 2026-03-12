import type { VercelRequest, VercelResponse } from '@vercel/node';

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  imageUrl: string | null;
}

interface NewsSource {
  name: string;
  feedUrl: string;
  mode: string;
  category: string;
  language: string;
  region: string;
}

const NEWS_SOURCES: NewsSource[] = [
  { name: 'Reuters', feedUrl: 'https://feeds.reuters.com/reuters/topNews', mode: 'international', category: 'top', language: 'en', region: 'global' },
  { name: 'Reuters World', feedUrl: 'https://feeds.reuters.com/Reuters/worldNews', mode: 'international', category: 'world', language: 'en', region: 'global' },
  { name: 'Reuters Business', feedUrl: 'https://feeds.reuters.com/reuters/businessNews', mode: 'international', category: 'business', language: 'en', region: 'global' },
  { name: 'Reuters Technology', feedUrl: 'https://feeds.reuters.com/reuters/technologyNews', mode: 'international', category: 'technology', language: 'en', region: 'global' },
  { name: 'Reuters Sports', feedUrl: 'https://feeds.reuters.com/reuters/sportsNews', mode: 'international', category: 'sports', language: 'en', region: 'global' },
  { name: 'Reuters Health', feedUrl: 'https://feeds.reuters.com/reuters/healthNews', mode: 'international', category: 'health', language: 'en', region: 'global' },
  { name: 'Reuters Entertainment', feedUrl: 'https://feeds.reuters.com/reuters/entertainment', mode: 'international', category: 'entertainment', language: 'en', region: 'global' },
  { name: 'Al Jazeera', feedUrl: 'https://www.aljazeera.com/xml/rss/all.xml', mode: 'international', category: 'world', language: 'en', region: 'global' },
  { name: 'BBC World', feedUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml', mode: 'international', category: 'world', language: 'en', region: 'global' },
  { name: 'BBC Top', feedUrl: 'https://feeds.bbci.co.uk/news/rss.xml', mode: 'international', category: 'top', language: 'en', region: 'global' },
  { name: 'BBC Technology', feedUrl: 'https://feeds.bbci.co.uk/news/technology/rss.xml', mode: 'international', category: 'technology', language: 'en', region: 'global' },
  { name: 'BBC Business', feedUrl: 'https://feeds.bbci.co.uk/news/business/rss.xml', mode: 'international', category: 'business', language: 'en', region: 'global' },
  { name: 'BBC Sports', feedUrl: 'https://feeds.bbci.co.uk/sport/rss.xml', mode: 'international', category: 'sports', language: 'en', region: 'global' },
  { name: 'BBC Entertainment', feedUrl: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', mode: 'international', category: 'entertainment', language: 'en', region: 'global' },
  { name: 'BBC Health', feedUrl: 'https://feeds.bbci.co.uk/news/health/rss.xml', mode: 'international', category: 'health', language: 'en', region: 'global' },
  { name: 'CNN Top', feedUrl: 'http://rss.cnn.com/rss/edition.rss', mode: 'international', category: 'top', language: 'en', region: 'global' },
  { name: 'CNN World', feedUrl: 'http://rss.cnn.com/rss/edition_world.rss', mode: 'international', category: 'world', language: 'en', region: 'global' },
  { name: 'CNN Technology', feedUrl: 'http://rss.cnn.com/rss/edition_technology.rss', mode: 'international', category: 'technology', language: 'en', region: 'global' },
  { name: 'CNN Entertainment', feedUrl: 'http://rss.cnn.com/rss/edition_entertainment.rss', mode: 'international', category: 'entertainment', language: 'en', region: 'global' },
  { name: 'CNN Sports', feedUrl: 'http://rss.cnn.com/rss/edition_sport.rss', mode: 'international', category: 'sports', language: 'en', region: 'global' },
  { name: 'The Guardian World', feedUrl: 'https://www.theguardian.com/world/rss', mode: 'international', category: 'world', language: 'en', region: 'global' },
  { name: 'The Guardian Politics', feedUrl: 'https://www.theguardian.com/politics/rss', mode: 'international', category: 'politics', language: 'en', region: 'global' },
  { name: 'The Guardian Technology', feedUrl: 'https://www.theguardian.com/uk/technology/rss', mode: 'international', category: 'technology', language: 'en', region: 'global' },
  { name: 'NPR News', feedUrl: 'https://feeds.npr.org/1001/rss.xml', mode: 'international', category: 'top', language: 'en', region: 'global' },
  { name: 'NPR Politics', feedUrl: 'https://feeds.npr.org/1014/rss.xml', mode: 'international', category: 'politics', language: 'en', region: 'global' },
  { name: 'The Daily Star', feedUrl: 'https://www.thedailystar.net/frontpage/rss.xml', mode: 'national', category: 'top', language: 'en', region: 'bangladesh' },
  { name: 'The Daily Star Bangladesh', feedUrl: 'https://www.thedailystar.net/country/rss.xml', mode: 'national', category: 'bangladesh', language: 'en', region: 'bangladesh' },
  { name: 'The Daily Star Business', feedUrl: 'https://www.thedailystar.net/business/rss.xml', mode: 'national', category: 'business', language: 'en', region: 'bangladesh' },
  { name: 'The Daily Star Sports', feedUrl: 'https://www.thedailystar.net/sports/rss.xml', mode: 'national', category: 'sports', language: 'en', region: 'bangladesh' },
  { name: 'The Daily Star Tech', feedUrl: 'https://www.thedailystar.net/tech-startup/rss.xml', mode: 'national', category: 'technology', language: 'en', region: 'bangladesh' },
  { name: 'The Daily Star Entertainment', feedUrl: 'https://www.thedailystar.net/entertainment/rss.xml', mode: 'national', category: 'entertainment', language: 'en', region: 'bangladesh' },
  { name: 'bdnews24', feedUrl: 'https://bdnews24.com/feed', mode: 'national', category: 'top', language: 'en', region: 'bangladesh' },
  { name: 'Dhaka Tribune', feedUrl: 'https://www.dhakatribune.com/feed', mode: 'national', category: 'top', language: 'en', region: 'bangladesh' },
  { name: 'Prothom Alo English', feedUrl: 'https://en.prothomalo.com/feed', mode: 'national', category: 'top', language: 'en', region: 'bangladesh' },
  { name: 'The Business Standard BD', feedUrl: 'https://www.tbsnews.net/feed', mode: 'national', category: 'business', language: 'en', region: 'bangladesh' },
  { name: 'New Age BD', feedUrl: 'https://www.newagebd.net/rss.xml', mode: 'national', category: 'top', language: 'en', region: 'bangladesh' },
  { name: 'The Financial Express BD', feedUrl: 'https://thefinancialexpress.com.bd/feed', mode: 'national', category: 'business', language: 'en', region: 'bangladesh' },
];

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
  const imgTag = itemXml.match(/<img[^>]+src=["']([^"']+)["']/);
  if (imgTag) return imgTag[1];
  return null;
}

function parseRSSItems(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
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
      let safePubDate = pubDate;
      if (pubDate) {
        const parsed = Date.parse(pubDate);
        if (isNaN(parsed)) safePubDate = '';
      }
      items.push({ title, link, pubDate: safePubDate, description: description.substring(0, 300), imageUrl });
    }
  }
  return items;
}

async function fetchFeed(source: NewsSource, timeout = 8000): Promise<RSSItem[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(source.feedUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'MindFlow News Aggregator/1.0' },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSSItems(xml);
  } catch {
    return [];
  }
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function titleSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeTitle(a).split(' '));
  const wordsB = new Set(normalizeTitle(b).split(' '));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  wordsA.forEach(w => { if (wordsB.has(w)) intersection++; });
  return (2 * intersection) / (wordsA.size + wordsB.size);
}

function generateId(title: string, url: string): string {
  let hash = 0;
  const str = title + url;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return `news_${Math.abs(hash).toString(36)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const mode = (req.query.mode as string) || 'international';
  const category = (req.query.category as string) || 'top';

  let sources = NEWS_SOURCES.filter(s => s.mode === mode);
  if (category !== 'top') {
    const catSources = sources.filter(s => s.category === category);
    if (catSources.length > 0) sources = catSources;
  }

  if (sources.length > 8) {
    sources = sources.sort(() => Math.random() - 0.5).slice(0, 8);
  }

  try {
    const feedResults = await Promise.allSettled(
      sources.map(s => fetchFeed(s).then(items => ({ source: s, items })))
    );

    const allArticles: Array<{
      id: string;
      title: string;
      source: string;
      publishedAt: string;
      url: string;
      imageUrl: string | null;
      summary: string;
      category: string;
      language: string;
      region: string;
    }> = [];

    for (const result of feedResults) {
      if (result.status !== 'fulfilled') continue;
      const { source, items } = result.value;
      for (const item of items) {
        allArticles.push({
          id: generateId(item.title, item.link),
          title: item.title,
          source: source.name,
          publishedAt: (() => {
            if (!item.pubDate) return new Date().toISOString();
            const t = Date.parse(item.pubDate);
            return isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
          })(),
          url: item.link,
          imageUrl: item.imageUrl,
          summary: item.description,
          category: source.category,
          language: source.language,
          region: source.region,
        });
      }
    }

    const deduplicated: typeof allArticles = [];
    const seenUrls = new Set<string>();
    for (const article of allArticles) {
      const urlKey = article.url.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
      if (seenUrls.has(urlKey)) continue;
      let isDup = false;
      for (const existing of deduplicated) {
        if (titleSimilarity(article.title, existing.title) > 0.7) {
          isDup = true;
          break;
        }
      }
      if (!isDup) {
        seenUrls.add(urlKey);
        deduplicated.push(article);
      }
    }

    deduplicated.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return res.status(200).json({
      articles: deduplicated.slice(0, 60),
      fetchedAt: Date.now(),
      mode,
      category,
      sourceCount: sources.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch news', message: err?.message || 'Unknown error' });
  }
}
