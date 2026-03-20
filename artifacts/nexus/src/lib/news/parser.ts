import { NewsArticle, NewsMode, NewsCategory } from '@/types/news';

export function parseFeed(xml: string, sourceName: string, mainCategory: NewsMode, subCategory: NewsCategory): NewsArticle[] {
  const articles: NewsArticle[] = [];
  
  // Try RSS first
  if (xml.includes('<item>')) {
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const title = extractText(itemXml, 'title');
      const link = extractText(itemXml, 'link');
      const pubDate = extractText(itemXml, 'pubDate') || extractText(itemXml, 'dc:date');
      const description = extractText(itemXml, 'description');
      const imageUrl = extractImage(itemXml);
      
      if (title && link) {
        articles.push(createArticle({
          title, link, sourceName, pubDate, description, imageUrl, mainCategory, subCategory
        }));
      }
    }
  } 
  // Then try Atom
  else if (xml.includes('<entry>')) {
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entryXml = match[1];
      const title = extractText(entryXml, 'title');
      const link = extractAtomLink(entryXml);
      const pubDate = extractText(entryXml, 'updated') || extractText(entryXml, 'published');
      const summary = extractText(entryXml, 'summary') || extractText(entryXml, 'content');
      const imageUrl = extractImage(entryXml);

      if (title && link) {
        articles.push(createArticle({
          title, link, sourceName, pubDate, description: summary, imageUrl, mainCategory, subCategory
        }));
      }
    }
  }

  return articles;
}

function extractText(xml: string, tag: string): string {
  // Handle CDATA and basic tags
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const simpleRegex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const simpleMatch = xml.match(simpleRegex);
  if (simpleMatch) {
    return simpleMatch[1].replace(/<[^>]+>/g, '').replace(/&lt;[^&]+&gt;/g, '').trim();
  }
  return '';
}

function extractAtomLink(entryXml: string): string {
  const linkMatch = entryXml.match(/<link[^>]+href=["']([^"']+)["']/i);
  return linkMatch ? linkMatch[1] : '';
}

function extractImage(itemXml: string): string | null {
  // 1. Media:thumbnail or media:content
  const mediaMatch = itemXml.match(/<media:(?:thumbnail|content)[^>]+url=["']([^"']+)["']/i);
  if (mediaMatch) return mediaMatch[1];

  // 2. Enclosure
  const enclosureMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image/i);
  if (enclosureMatch) return enclosureMatch[1];

  // 3. Img tag in description or content
  const imgMatch = itemXml.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];

  return null;
}

function createArticle(params: {
  title: string;
  link: string;
  sourceName: string;
  pubDate: string;
  description: string;
  imageUrl: string | null;
  mainCategory: NewsMode;
  subCategory: NewsCategory;
}): NewsArticle {
  const { title, link, sourceName, pubDate, description, imageUrl, mainCategory, subCategory } = params;
  
  // Clean title/description from escaped HTML if any remains
  const cleanTitle = title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  const cleanSummary = description.slice(0, 300).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

  return {
    id: `art_${Math.abs(hashString(title + link))}_${Date.now().toString(36)}`,
    title: cleanTitle,
    url: link,
    link: link,
    sourceName,
    publishedAt: parseDate(pubDate),
    summary: cleanSummary,
    imageUrl,
    mainCategory,
    subCategory
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return h;
}

function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  
  // Try standard parsing
  let t = Date.parse(dateStr);
  if (!isNaN(t)) return new Date(t).toISOString();

  // Try custom cleaning for common RSS issues
  const cleaned = dateStr.trim()
    .replace(/ (GMT|UTC)$/, '') // Remove zone names that sometimes confuse Date.parse
    .replace(/(\+|-)\d{4}$/, ''); // Remove simple offsets

  t = Date.parse(cleaned);
  return isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
}
