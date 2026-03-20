import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, RefreshCw, Search, Bookmark, BookmarkCheck, ExternalLink,
  Globe, Flag, Clock, X, Zap, WifiOff, ChevronLeft, Share2, Info
} from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/PageTransition';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';
import { NewsArticle, NewsMode, NewsCategory, FeedStore, FeedState } from '@/types/news';
import { NEWS_CATEGORIES, FEED_REGISTRY } from '@/lib/news/sources';
import { 
  fetchFeedItems, getFeedKey, searchArticles, 
  isBreakingNews, formatTimeAgo 
} from '@/lib/news/engine';
import { 
  getBookmarks, addBookmark, removeBookmark,
  getSelectedMode, setSelectedMode, getSelectedCategory, setSelectedCategory,
  getCachedNews, setCachedNews
} from '@/lib/news/cache';

// Initial state for a single feed
const initialFeedState: FeedState = {
  items: [],
  isLoading: false,
  isRefreshing: false,
  error: null,
  fromCache: false,
  hasLoadedOnce: false,
  lastUpdated: 0
};

export default function NewsPortal() {
  const navigate = useNavigate();
  
  // 1. Core State
  const [mode, setMode] = useState<NewsMode>(() => getSelectedMode());
  const [category, setCategory] = useState<NewsCategory>(() => getSelectedCategory());
  const [feedStore, setFeedStore] = useState<FeedStore>({});
  
  // 2. UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(() => new Set(getBookmarks().map(b => b.articleId)));
  const [showDebug, setShowDebug] = useState(false);

  // Active Key helper
  const activeKey = getFeedKey(mode, category);
  const currentFeed = feedStore[activeKey] || { ...initialFeedState };

  // Ref for aborting previous fetches
  const abortControllers = useRef<Record<string, AbortController>>({});

  // 3. News Loading Logic (SWR)
  const refreshNews = useCallback(async (isManual = false) => {
    const key = activeKey;
    const sources = FEED_REGISTRY[mode][category];

    if (!sources || sources.length === 0) return;

    // Abort existing fetch for this SPECIFIC key if any
    if (abortControllers.current[key]) {
      abortControllers.current[key].abort();
    }
    const controller = new AbortController();
    abortControllers.current[key] = controller;

    // Set refreshing state
    setFeedStore(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || initialFeedState),
        isRefreshing: true,
        isLoading: !(prev[key]?.items?.length > 0)
      }
    }));

    try {
      const startTime = Date.now();
      
      const handleIncrementalArticles = (newItems: NewsArticle[]) => {
        if (controller.signal.aborted) return;
        setFeedStore(prev => {
          const currentItems = prev[key]?.items || [];
          const combined = [...currentItems, ...newItems];
          
          // Deduplicate
          const seen = new Set<string>();
          const deduplicated = combined.filter(art => {
            const id = (art.title + art.url).toLowerCase().replace(/\s/g, '');
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
          
          // Sort
          const sorted = deduplicated.sort((a, b) => 
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
          );

          return {
            ...prev,
            [key]: {
              ...(prev[key] || initialFeedState),
              items: sorted,
              isLoading: false,
              isRefreshing: true, // Still refreshing other sources
              fromCache: false,
              hasLoadedOnce: true,
              lastUpdated: Date.now()
            }
          };
        });
      };

      const finalItems = await fetchFeedItems(sources, mode, category, { 
        signal: controller.signal,
        forceFresh: isManual,
        onArticles: handleIncrementalArticles
      });
      
      if (controller.signal.aborted) return;

      setFeedStore(prev => ({
        ...prev,
        [key]: {
          items: finalItems,
          isLoading: false,
          isRefreshing: false,
          error: finalItems.length === 0 ? 'No articles found for this category.' : null,
          fromCache: false,
          hasLoadedOnce: true,
          lastUpdated: Date.now()
        }
      }));

      // Update Local Cache
      if (finalItems.length > 0) {
        setCachedNews(mode, category, finalItems);
      }

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      
      setFeedStore(prev => ({
        ...prev,
        [key]: {
          ...(prev[key] || initialFeedState),
          isLoading: false,
          isRefreshing: false,
          error: (prev[key]?.items?.length ?? 0) > 0 ? null : 'Failed to fetch latest news.'
        }
      }));
    }
  }, [mode, category, activeKey]);

  // Initial Load & SWR
  useEffect(() => {
    const key = activeKey;
    
    // 1. Check if we already have it in store
    if (feedStore[key]?.hasLoadedOnce) {
      // If it's been more than 5 mins, background refresh
      const fiveMins = 5 * 60 * 1000;
      if (Date.now() - feedStore[key].lastUpdated > fiveMins) {
        refreshNews();
      }
      return;
    }

    // 2. Try Cache first
    const cached = getCachedNews(mode, category);
    if (cached && cached.items.length > 0) {
      setFeedStore(prev => ({
        ...prev,
        [key]: {
          ...initialFeedState,
          items: cached.items,
          fromCache: true,
          hasLoadedOnce: true,
          lastUpdated: cached.fetchedAt
        }
      }));
      // Background refresh immediately for "stale" hits
      refreshNews();
    } else {
      // No cache, full fetch
      refreshNews();
    }
  }, [activeKey, refreshNews]);

  // 4. Tab Handlers
  const handleModeChange = (newMode: NewsMode) => {
    setMode(newMode);
    setSelectedMode(newMode);
    
    // Auto-adjust category if needed
    const cats = NEWS_CATEGORIES.filter(c => c.modes.includes(newMode));
    if (!cats.find(c => c.value === category)) {
      setCategory('top');
      setSelectedCategory('top');
    }
  };

  const handleCategoryChange = (newCat: NewsCategory) => {
    setCategory(newCat);
    setSelectedCategory(newCat);
  };

  const handleBookmarkToggle = (article: NewsArticle) => {
    if (bookmarkIds.has(article.id)) {
      removeBookmark(article.id);
      setBookmarkIds(prev => { const s = new Set(prev); s.delete(article.id); return s; });
      toast.success('Removed from saved');
    } else {
      addBookmark(article);
      setBookmarkIds(prev => new Set(prev).add(article.id));
      toast.success('Article saved');
    }
  };

  const handleShare = async (article: NewsArticle) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: article.title, url: article.url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(article.url);
      toast.success('Link copied to clipboard');
    }
  };

  // 5. Computed Lists
  const filteredCategories = useMemo(() =>
    NEWS_CATEGORIES.filter(c => c.modes.includes(mode)),
    [mode]
  );

  const displayArticles = useMemo(() => {
    if (showBookmarks) {
      const bm = getBookmarks();
      return searchQuery ? searchArticles(bm.map(b => b.article), searchQuery) : bm.map(b => b.article);
    }
    return searchQuery ? searchArticles(currentFeed.items, searchQuery) : currentFeed.items;
  }, [currentFeed.items, searchQuery, showBookmarks, bookmarkIds]);

  // Pull to refresh
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientY - touchStartY.current;
    if (diff > 80 && !currentFeed.isLoading && !currentFeed.isRefreshing && window.scrollY < 10) {
      refreshNews(true);
    }
  };

  return (
    <PageTransition>
      <div className="px-4 pt-12 pb-24 space-y-4 min-h-screen" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <PageOnboardingTooltips pageId="news" />

        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => navigate(-1)} className="text-muted-foreground p-1"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-xl sm:text-2xl font-bold font-display truncate">News Portal</h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowDebug(!showDebug)} className="p-2 rounded-xl text-muted-foreground/40"><Info size={16} /></button>
            <button onClick={() => setShowSearch(!showSearch)} className={`p-2 rounded-xl ${showSearch ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}>
              <Search size={18} />
            </button>
            <button onClick={() => { setShowBookmarks(!showBookmarks); setSearchQuery(''); }}
              className={`p-2 rounded-xl ${showBookmarks ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}>
              <Bookmark size={18} />
            </button>
            <button onClick={() => refreshNews(true)} disabled={currentFeed.isRefreshing}
              className={`p-2 rounded-xl text-muted-foreground ${currentFeed.isRefreshing ? 'animate-spin' : ''}`}>
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Debug Log */}
        <AnimatePresence>
          {showDebug && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <div className="glass rounded-xl p-3 text-[10px] font-mono space-y-1 text-muted-foreground border-primary/20 bg-primary/5">
                <div>KEY: {activeKey}</div>
                <div>CACHE: {currentFeed.fromCache ? 'HIT' : 'MISS'}</div>
                <div>L-ONCE: {String(currentFeed.hasLoadedOnce)}</div>
                <div>UPDATED: {new Date(currentFeed.lastUpdated).toLocaleTimeString()}</div>
                <div>ITEMS: {currentFeed.items.length}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <AnimatePresence>
          {showSearch && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search current view..." autoFocus
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-muted/30 border border-border/30 text-sm outline-none focus:border-primary/50" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <X size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Controls */}
        {!showBookmarks && (
          <>
            <div className="flex gap-2">
              <button 
                onClick={() => handleModeChange('international')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all ${mode === 'international' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-2 ring-primary/20' : 'glass hover:bg-muted/10 text-muted-foreground'}`}
              >
                <Globe size={16} />
                International
              </button>
              <button 
                onClick={() => handleModeChange('national')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all ${mode === 'national' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-2 ring-primary/20' : 'glass hover:bg-muted/10 text-muted-foreground'}`}
              >
                <Flag size={16} />
                Bangladesh
              </button>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {filteredCategories.map(cat => (
                <button key={cat.value} onClick={() => handleCategoryChange(cat.value as NewsCategory)}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all ${category === cat.value ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-muted/30 text-muted-foreground'}`}>
                  {cat.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Article Counter / Status */}
        {currentFeed.items.length > 0 && !showBookmarks && (
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60">
              {mode} headlines
            </span>
            <span className="text-[10px] text-muted-foreground/60 bg-muted/30 px-2 py-0.5 rounded-full">
              {currentFeed.fromCache ? 'Cached' : 'Live'} · {currentFeed.items.length} items
            </span>
          </div>
        )}

        {/* Error State */}
        {currentFeed.error && !currentFeed.isLoading && currentFeed.items.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center space-y-3">
            <div className="text-3xl">⚠️</div>
            <p className="text-sm text-muted-foreground">{currentFeed.error}</p>
            <button onClick={() => refreshNews(true)} className="text-xs font-bold text-primary px-4 py-2 rounded-lg bg-primary/10">Retry</button>
          </div>
        )}

        {/* Offline Label */}
        {currentFeed.fromCache && !navigator.onLine && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-[10px] font-bold">
            <WifiOff size={12} />
            SHOWING SAVED HEADLINES
          </div>
        )}

        {/* Loading Shells */}
        {currentFeed.isLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass rounded-2xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted/50 rounded w-1/4" />
                    <div className="h-4 bg-muted/50 rounded w-full" />
                    <div className="h-4 bg-muted/50 rounded w-3/4" />
                  </div>
                  <div className="w-16 h-16 bg-muted/50 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : displayArticles.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">{showBookmarks ? '📑' : '📰'}</div>
            <p className="text-muted-foreground text-sm font-medium">
              {showBookmarks ? 'No saved articles yet' : 'No news available for this section'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            {displayArticles.map((article, idx) => {
              const isExpanded = expandedArticleId === article.id;
              return (
              <motion.div key={article.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.02, 0.4) }}>
                <div className={`glass rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${isExpanded ? 'ring-1 ring-primary/40 bg-primary/5 shadow-lg' : 'hover:bg-muted/10'}`}>
                  <button onClick={() => setExpandedArticleId(isExpanded ? null : article.id)} className="w-full text-left p-4">
                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80 font-bold uppercase tracking-tight">
                          {isBreakingNews(article) && (
                            <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-sm flex items-center gap-0.5 flex-shrink-0">
                              <Zap size={8} fill="currentColor" /> LIVE
                            </span>
                          )}
                          <span className="truncate">{article.sourceName}</span>
                          <span className="text-muted-foreground/30">•</span>
                          <span className="flex items-center gap-1"><Clock size={10} />{formatTimeAgo(article.publishedAt)}</span>
                        </div>
                        <h3 className={`text-[14px] font-bold leading-tight ${isExpanded ? '' : 'line-clamp-2'}`}>{article.title}</h3>
                        {!isExpanded && article.summary && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-normal">{article.summary}</p>
                        )}
                      </div>
                      {article.imageUrl && !isExpanded && (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted/20 border border-border/10">
                          <img src={article.imageUrl} alt="" className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
                        </div>
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-4">
                          {article.imageUrl && (
                            <div className="rounded-xl overflow-hidden aspect-video border border-border/10">
                              <img src={article.imageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div 
                            className="text-foreground/90 text-sm leading-relaxed whitespace-pre-line px-1"
                          >
                            {article.summary}
                          </div>
                          <div className="flex gap-2 pt-2">
                            <a href={article.url} target="_blank" rel="noopener noreferrer"
                              className="w-12 h-12 flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                              <ExternalLink size={20} />
                            </a>
                            <button onClick={() => setExpandedArticleId(null)}
                              className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground font-bold text-xs hover:bg-muted/80 transition-colors">
                              Close Article
                            </button>
                            <button onClick={() => handleShare(article)}
                              className="w-12 h-12 flex items-center justify-center rounded-xl glass text-muted-foreground">
                              <Share2 size={18} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center gap-1 px-4 pb-3">
                    <button onClick={(e) => { e.stopPropagation(); handleBookmarkToggle(article); }} className="p-1.5 rounded-xl hover:bg-muted/30 text-muted-foreground">
                      {bookmarkIds.has(article.id) ? <BookmarkCheck size={16} className="text-primary" /> : <Bookmark size={16} />}
                    </button>
                    {!isExpanded && (
                      <button onClick={(e) => { e.stopPropagation(); handleShare(article); }} className="p-1.5 rounded-xl hover:bg-muted/30 text-muted-foreground">
                        <Share2 size={16} />
                      </button>
                    )}
                    {!isExpanded && (
                      <a href={article.url} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/5 text-primary text-[10px] font-bold ml-auto border border-primary/10">
                        OPEN SOURCE <ChevronLeft size={10} className="rotate-180" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
