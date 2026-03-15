import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, RefreshCw, Search, Bookmark, BookmarkCheck, ExternalLink,
  Globe, Flag, Clock, X, Zap, WifiOff, ChevronLeft, Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/PageTransition';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';
import { NewsArticle, NewsMode, NewsCategory } from '@/types/news';
import { NEWS_CATEGORIES } from '@/lib/news/sources';
import { fetchNews, searchArticles, isBreakingNews, formatTimeAgo } from '@/lib/news/newsService';
import {
  getBookmarks, addBookmark, removeBookmark, isBookmarked,
  getSelectedMode, setSelectedMode, getSelectedCategory, setSelectedCategory,
  getCachedNews, isCacheValid
} from '@/lib/news/cache';

export default function NewsPortal() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<NewsMode>(() => getSelectedMode());
  const [category, setCategory] = useState<NewsCategory>(() => getSelectedCategory());
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(() => new Set(getBookmarks().map(b => b.articleId)));

  const loadNews = useCallback(async (isRefresh = false, signal?: AbortSignal) => {
    // 1. Clear previous errors and indicate loading
    setError(null);

    // 2. Check for cache first for instant UI update
    const cached = getCachedNews(mode, category);
    if (cached && !isRefresh) {
      setArticles(cached.articles);
      setFromCache(true);
      setLoading(false);
      // Determine if we need a background refresh (Strict SWR)
      if (isCacheValid(cached)) return;
    } else if (!isRefresh) {
      // If no valid cache, show skeletons
      setLoading(true);
      setArticles([]); 
    }

    if (isRefresh) setRefreshing(true);

    try {
      const result = await fetchNews(mode, category, signal, isRefresh || !isCacheValid(cached));
      
      // Update UI with fresh results
      if (!signal?.aborted) {
        setArticles(result.articles);
        setFromCache(result.fromCache);
        if (result.error && !result.articles.length) {
          setError(result.error);
        }
      }
    } catch (err: any) {
      if (err.message === 'AbortError' || signal?.aborted) return;
      if (!articles.length) {
        setError('Unable to load live news. Please check your connection.');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [mode, category]); // Removed articles.length to fix the dependency loop

  useEffect(() => {
    const controller = new AbortController();
    loadNews(false, controller.signal);
    return () => controller.abort();
  }, [loadNews]);

  // Remove the "fromCache" message if it's annoying - the user hates it.
  // We'll only show error messages if we have NO articles.


  const handleModeChange = (newMode: NewsMode) => {
    setMode(newMode);
    setSelectedMode(newMode);
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

  const filteredCategories = useMemo(() =>
    NEWS_CATEGORIES.filter(c => c.modes.includes(mode)),
    [mode]
  );

  const displayArticles = useMemo(() => {
    if (showBookmarks) {
      const bm = getBookmarks();
      return searchQuery ? searchArticles(bm.map(b => b.article), searchQuery) : bm.map(b => b.article);
    }
    return searchQuery ? searchArticles(articles, searchQuery) : articles;
  }, [articles, searchQuery, showBookmarks, bookmarkIds]);

  const touchStartY = { current: 0 };
  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientY - touchStartY.current;
    if (diff > 80 && !loading && !refreshing && window.scrollY < 10) {
      loadNews(true);
    }
  };

  return (
    <PageTransition>
      <div className="px-4 pt-12 pb-24 space-y-4" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <PageOnboardingTooltips pageId="news" />

        <div data-tour="news-header" className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => navigate(-1)} className="text-muted-foreground flex-shrink-0"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-xl sm:text-2xl font-bold font-display truncate">News Portal</h1>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setShowSearch(!showSearch)} className={`p-2 rounded-xl transition-colors ${showSearch ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}>
              <Search size={18} />
            </button>
            <button onClick={() => { setShowBookmarks(!showBookmarks); setSearchQuery(''); }}
              className={`p-2 rounded-xl transition-colors ${showBookmarks ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}>
              <Bookmark size={18} />
            </button>
            <button onClick={() => loadNews(true)} disabled={refreshing}
              className={`p-2 rounded-xl text-muted-foreground transition-colors ${refreshing ? 'animate-spin' : ''}`}>
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showSearch && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search headlines..." autoFocus
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

        {!showBookmarks && (
          <>
            <div data-tour="news-mode" className="flex gap-2">
              <button 
                onClick={() => handleModeChange('international')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all ${mode === 'international' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-2 ring-primary/20' : 'glass hover:bg-muted/10 text-muted-foreground'}`}
              >
                <Globe size={16} className={mode === 'international' ? 'animate-pulse' : ''} />
                International
              </button>
              <button 
                onClick={() => handleModeChange('national')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all ${mode === 'national' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-2 ring-primary/20' : 'glass hover:bg-muted/10 text-muted-foreground'}`}
              >
                <Flag size={16} className={mode === 'national' ? 'animate-pulse' : ''} />
                Bangladesh
              </button>
            </div>

            <div data-tour="news-categories" className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {filteredCategories.map(cat => (
                <button key={cat.value} onClick={() => handleCategoryChange(cat.value as NewsCategory)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${category === cat.value ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'}`}>
                  {cat.label}
                </button>
              ))}
            </div>
          </>
        )}

        {showBookmarks && (
          <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2">
            <BookmarkCheck size={16} className="text-primary" />
            <span className="text-sm font-semibold">Saved Articles</span>
            <span className="text-xs text-muted-foreground ml-auto">{getBookmarks().length} saved</span>
          </div>
        )}

        {error && (
          <div className="glass rounded-xl px-4 py-3 flex items-center gap-2 text-amber-400 text-xs">
            <WifiOff size={14} />
            <span>{error}</span>
          </div>
        )}

        {refreshing && (
          <div className="flex justify-center py-2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass rounded-2xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted/50 rounded w-1/4" />
                    <div className="h-4 bg-muted/50 rounded w-full" />
                    <div className="h-4 bg-muted/50 rounded w-3/4" />
                    <div className="h-3 bg-muted/50 rounded w-1/3" />
                  </div>
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted/50 rounded-xl flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        ) : displayArticles.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">{showBookmarks ? '📑' : '📰'}</div>
            <p className="text-muted-foreground text-sm">
              {showBookmarks ? 'No saved articles yet' : searchQuery ? 'No articles match your search' : 'No news available right now'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayArticles.map((article, idx) => {
              const isExpanded = expandedArticleId === article.id;
              return (
              <motion.div key={article.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}>
                <div className={`glass rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-1 ring-primary/30' : 'hover:bg-muted/10'}`}>
                  <button onClick={() => setExpandedArticleId(isExpanded ? null : article.id)} className="w-full text-left p-4">
                    <div className="flex gap-2.5 sm:gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground">
                          {isBreakingNews(article) && (
                            <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 text-[10px] flex-shrink-0">
                              <Zap size={8} />BREAKING
                            </span>
                          )}
                          <span className="font-medium truncate">{article.source}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Clock size={10} />{formatTimeAgo(article.publishedAt)}</span>
                        </div>
                        <h3 className={`text-sm font-semibold leading-snug ${isExpanded ? '' : 'line-clamp-3'}`}>{article.title}</h3>
                        {!isExpanded && article.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed hidden sm:block">{article.summary}</p>
                        )}
                      </div>
                      {article.imageUrl && !isExpanded && (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted/30">
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
                            <div className="rounded-xl overflow-hidden">
                              <img src={article.imageUrl} alt="" className="w-full h-40 object-cover" />
                            </div>
                          )}
                          <div 
                            className="text-foreground/90 text-sm leading-relaxed prose prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: article.summary || '' }}
                          />
                          <div className="flex gap-2">
                            <a href={article.url} target="_blank" rel="noopener noreferrer"
                              className="w-12 h-12 flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                              <ExternalLink size={20} />
                            </a>
                            <button onClick={() => setExpandedArticleId(null)}
                              className="flex-1 py-2.5 rounded-xl bg-secondary/50 text-secondary-foreground font-bold text-xs hover:bg-secondary transition-colors">
                              Close
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center gap-1 px-4 pb-3 -mt-1">
                    <button onClick={(e) => { e.stopPropagation(); handleBookmarkToggle(article); }} className="p-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground">
                      {bookmarkIds.has(article.id) ? <BookmarkCheck size={14} className="text-primary" /> : <Bookmark size={14} />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleShare(article); }} className="p-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground">
                      <Share2 size={14} />
                    </button>
                    {!isExpanded && (
                      <a href={article.url} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground ml-auto" title="Open Full News">
                        <ExternalLink size={14} />
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
