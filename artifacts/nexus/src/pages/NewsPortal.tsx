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
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(() => new Set(getBookmarks().map(b => b.articleId)));

  const loadNews = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const result = await fetchNews(mode, category);
    setArticles(result.articles);
    setFromCache(result.fromCache);
    if (result.error) setError(result.error);

    setLoading(false);
    setRefreshing(false);
  }, [mode, category]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

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

  if (selectedArticle) {
    return (
      <PageTransition>
        <div className="px-4 pt-12 pb-24 space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedArticle(null)} className="text-muted-foreground"><ChevronLeft className="w-5 h-5" /></button>
            <h1 className="text-lg font-bold font-display truncate flex-1">{selectedArticle.source}</h1>
            <button onClick={() => handleBookmarkToggle(selectedArticle)} className="text-muted-foreground">
              {bookmarkIds.has(selectedArticle.id) ? <BookmarkCheck className="w-5 h-5 text-primary" /> : <Bookmark className="w-5 h-5" />}
            </button>
            <button onClick={() => handleShare(selectedArticle)} className="text-muted-foreground"><Share2 className="w-5 h-5" /></button>
          </div>

          {selectedArticle.imageUrl && (
            <div className="rounded-2xl overflow-hidden">
              <img src={selectedArticle.imageUrl} alt="" className="w-full h-48 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isBreakingNews(selectedArticle) && (
                <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Zap size={10} />BREAKING</span>
              )}
              <span>{selectedArticle.source}</span>
              <span>·</span>
              <span>{formatTimeAgo(selectedArticle.publishedAt)}</span>
            </div>
            <h2 className="text-xl font-bold leading-tight">{selectedArticle.title}</h2>
            {selectedArticle.summary && (
              <p className="text-muted-foreground text-sm leading-relaxed">{selectedArticle.summary}</p>
            )}
            <a href={selectedArticle.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary/20 text-primary font-semibold text-sm hover:bg-primary/30 transition-colors">
              <ExternalLink size={16} /> Read Full Article
            </a>
          </div>
        </div>
      </PageTransition>
    );
  }

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
              <button onClick={() => handleModeChange('international')}
                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${mode === 'international' ? 'bg-primary text-primary-foreground shadow-lg' : 'glass'}`}>
                <Globe size={14} className="sm:w-4 sm:h-4 flex-shrink-0" /> International
              </button>
              <button onClick={() => handleModeChange('national')}
                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${mode === 'national' ? 'bg-primary text-primary-foreground shadow-lg' : 'glass'}`}>
                <Flag size={14} className="sm:w-4 sm:h-4 flex-shrink-0" /> Bangladesh
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

        {fromCache && !error && !loading && (
          <div className="text-xs text-muted-foreground text-center">Showing cached news · Pull down to refresh</div>
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
            {displayArticles.map((article, idx) => (
              <motion.div key={article.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}>
                <div className="glass rounded-2xl overflow-hidden hover:bg-muted/10 transition-colors">
                  <button onClick={() => setSelectedArticle(article)} className="w-full text-left p-4">
                    <div className="flex gap-2.5 sm:gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground">
                          {isBreakingNews(article) && (
                            <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 text-[10px] flex-shrink-0">
                              <Zap size={8} />BREAKING
                            </span>
                          )}
                          <span className="font-medium truncate">{article.source}</span>
                        </div>
                        <h3 className="text-sm font-semibold leading-snug line-clamp-3">{article.title}</h3>
                        {article.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed hidden sm:block">{article.summary}</p>
                        )}
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
                          <Clock size={10} />
                          <span>{formatTimeAgo(article.publishedAt)}</span>
                        </div>
                      </div>
                      {article.imageUrl && (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted/30">
                          <img src={article.imageUrl} alt="" className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
                        </div>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-1 px-4 pb-3 -mt-1">
                    <button onClick={() => handleBookmarkToggle(article)} className="p-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground">
                      {bookmarkIds.has(article.id) ? <BookmarkCheck size={14} className="text-primary" /> : <Bookmark size={14} />}
                    </button>
                    <button onClick={() => handleShare(article)} className="p-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground">
                      <Share2 size={14} />
                    </button>
                    <a href={article.url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground ml-auto">
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
