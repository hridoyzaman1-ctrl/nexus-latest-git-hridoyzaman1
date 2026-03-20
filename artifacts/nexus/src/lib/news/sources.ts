import { NewsSource, NewsMode, NewsCategory } from '@/types/news';

export const FEED_REGISTRY: Record<NewsMode, Record<NewsCategory, NewsSource[]>> = {
  international: {
    top: [
      { name: 'Reuters', feedUrl: 'https://feeds.reuters.com/reuters/topNews' },
      { name: 'BBC Top', feedUrl: 'https://feeds.bbci.co.uk/news/rss.xml' },
      { name: 'CNN Top', feedUrl: 'http://rss.cnn.com/rss/edition.rss' },
      { name: 'NPR News', feedUrl: 'https://feeds.npr.org/1001/rss.xml' }
    ],
    world: [
      { name: 'Reuters World', feedUrl: 'https://feeds.reuters.com/Reuters/worldNews' },
      { name: 'Al Jazeera', feedUrl: 'https://www.aljazeera.com/xml/rss/all.xml' },
      { name: 'BBC World', feedUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
      { name: 'CNN World', feedUrl: 'http://rss.cnn.com/rss/edition_world.rss' },
      { name: 'The Guardian World', feedUrl: 'https://www.theguardian.com/world/rss' }
    ],
    politics: [
      { name: 'The Guardian Politics', feedUrl: 'https://www.theguardian.com/politics/rss' },
      { name: 'NPR Politics', feedUrl: 'https://feeds.npr.org/1014/rss.xml' }
    ],
    business: [
      { name: 'Reuters Business', feedUrl: 'https://feeds.reuters.com/reuters/businessNews' },
      { name: 'BBC Business', feedUrl: 'https://feeds.bbci.co.uk/news/business/rss.xml' }
    ],
    technology: [
      { name: 'Reuters Technology', feedUrl: 'https://feeds.reuters.com/reuters/technologyNews' },
      { name: 'BBC Technology', feedUrl: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
      { name: 'CNN Technology', feedUrl: 'http://rss.cnn.com/rss/edition_technology.rss' },
      { name: 'The Guardian Tech', feedUrl: 'https://www.theguardian.com/uk/technology/rss' }
    ],
    sports: [
      { name: 'Reuters Sports', feedUrl: 'https://feeds.reuters.com/reuters/sportsNews' },
      { name: 'BBC Sports', feedUrl: 'https://feeds.bbci.co.uk/sport/rss.xml' },
      { name: 'CNN Sports', feedUrl: 'http://rss.cnn.com/rss/edition_sport.rss' }
    ],
    entertainment: [
      { name: 'Reuters Entertainment', feedUrl: 'https://feeds.reuters.com/reuters/entertainment' },
      { name: 'BBC Entertainment', feedUrl: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml' },
      { name: 'CNN Entertainment', feedUrl: 'http://rss.cnn.com/rss/edition_entertainment.rss' }
    ],
    health: [
      { name: 'Reuters Health', feedUrl: 'https://feeds.reuters.com/reuters/healthNews' },
      { name: 'BBC Health', feedUrl: 'https://feeds.bbci.co.uk/news/health/rss.xml' }
    ],
    bangladesh: [] // Fallback/empty
  },
  national: {
    top: [
      { name: 'BBC Bangladesh', feedUrl: 'https://feeds.bbci.co.uk/news/world/asia/bangladesh/rss.xml' },
      { name: 'BDNews24', feedUrl: 'https://bdnews24.com/?widgetName=rssfeed&widgetId=1150&getXmlFeed=true' },
      { name: 'The Daily Star', feedUrl: 'https://www.thedailystar.net/rss.xml' },
      { name: 'Prothom Alo', feedUrl: 'https://en.prothomalo.com/feed' },
      { name: 'Dhaka Tribune', feedUrl: 'https://www.dhakatribune.com/feed' }
    ],
    politics: [
      { name: 'Prothom Alo Politics', feedUrl: 'https://en.prothomalo.com/feed/politics' },
      { name: 'Dhaka Tribune Politics', feedUrl: 'https://www.dhakatribune.com/feed/politics' }
    ],
    world: [
      { name: 'The Daily Star World', feedUrl: 'https://www.thedailystar.net/news/world/rss.xml' },
      { name: 'Dhaka Tribune World', feedUrl: 'https://www.dhakatribune.com/feed/world' }
    ],
    business: [
      { name: 'The Business Standard', feedUrl: 'https://www.tbsnews.net/business/rss.xml' },
      { name: 'Prothom Alo Business', feedUrl: 'https://en.prothomalo.com/feed/business' }
    ],
    technology: [
      { name: 'The Daily Star Tech', feedUrl: 'https://www.thedailystar.net/tech-startup/rss.xml' },
      { name: 'TBS Tech', feedUrl: 'https://www.tbsnews.net/technology/rss.xml' }
    ],
    sports: [
      { name: 'Dhaka Tribune Sports', feedUrl: 'https://www.dhakatribune.com/feed/sports' },
      { name: 'The Daily Star Sports', feedUrl: 'https://www.thedailystar.net/sports/rss.xml' }
    ],
    entertainment: [
      { name: 'Daily Star Entertainment', feedUrl: 'https://www.thedailystar.net/entertainment/rss.xml' }
    ],
    health: [],
    bangladesh: []
  }
};

export const NEWS_CATEGORIES: { value: NewsCategory; label: string; modes: NewsMode[] }[] = [
  { value: 'top', label: 'Top', modes: ['international', 'national'] },
  { value: 'politics', label: 'Politics', modes: ['international', 'national'] },
  { value: 'world', label: 'World', modes: ['international', 'national'] },
  { value: 'business', label: 'Business', modes: ['international', 'national'] },
  { value: 'technology', label: 'Technology', modes: ['international', 'national'] },
  { value: 'sports', label: 'Sports', modes: ['international', 'national'] },
  { value: 'entertainment', label: 'Entertainment', modes: ['international', 'national'] },
  { value: 'health', label: 'Health', modes: ['international'] },
];
