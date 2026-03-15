import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Library, Search, Trash2, Filter, Video, Headphones,
  Mic, FileText, BookOpen, StickyNote, GraduationCap, Presentation, RefreshCw, Film,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getAllMediaItems, deleteMediaItem, deleteAllMedia, type GeneratedMediaItem } from '@/lib/mediaStorage';
import MediaPlayer from '@/components/MediaPlayer';

type FilterMode = 'all' | 'summary' | 'explainer' | 'video';
type FilterModule = 'all' | 'books' | 'notes' | 'study' | 'presentations' | 'coach' | 'audio-studio' | 'video-studio';

const MODE_LABELS: Record<string, string> = {
  summary: 'Summary', explainer: 'Explainer', video: 'Video',
};
const MODULE_LABELS: Record<string, string> = {
  books: 'Books', notes: 'Notes', study: 'Study', presentations: 'Presentations', coach: 'Coach',
  'audio-studio': 'Audio Studio', 'video-studio': 'Video Studio',
};
const MODULE_ICONS: Record<string, typeof BookOpen> = {
  books: BookOpen, notes: StickyNote, study: GraduationCap, presentations: Presentation, coach: Video,
  'audio-studio': Headphones, 'video-studio': Film,
};
const MODE_ICONS: Record<string, typeof Headphones> = {
  summary: FileText, explainer: Headphones, video: Video,
};
const MODE_COLORS: Record<string, string> = {
  summary: 'hsl(199,89%,48%)', explainer: 'hsl(245,58%,62%)', video: 'hsl(291,64%,42%)',
};

export default function MediaLibrary() {
  const navigate = useNavigate();
  const [items, setItems] = useState<GeneratedMediaItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [filterModule, setFilterModule] = useState<FilterModule>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const load = useCallback(() => setItems(getAllMediaItems()), []);
  useEffect(load, [load]);

  const handleDelete = useCallback((id: string) => {
    deleteMediaItem(id);
    setItems(prev => prev.filter(x => x.id !== id));
    setExpandedId(prev => prev === id ? null : prev);
    toast.success('Media deleted');
  }, []);

  const handleDeleteAll = useCallback(() => {
    if (!confirmClearAll) {
      setConfirmClearAll(true);
      setTimeout(() => setConfirmClearAll(false), 4000);
      return;
    }
    deleteAllMedia();
    setItems([]);
    setExpandedId(null);
    setConfirmClearAll(false);
    toast.success('All media cleared');
  }, [confirmClearAll]);

  const filtered = items.filter(item => {
    if (filterMode !== 'all' && item.mode !== filterMode) return false;
    if (filterModule !== 'all' && item.sourceModule !== filterModule) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.sourceName.toLowerCase().includes(q) ||
        item.script.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group by source module
  const grouped = filtered.reduce<Record<string, GeneratedMediaItem[]>>((acc, item) => {
    const key = item.sourceModule;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const totalDuration = items.reduce((acc, x) => acc + (x.estimatedDuration ?? 0), 0);
  const hasActiveFilters = filterMode !== 'all' || filterModule !== 'all' || search !== '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-background"
    >
      <div className="px-4 pt-12 pb-28 space-y-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3" data-tour="media-library-header">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold font-display flex items-center gap-2">
              <Library className="w-5 h-5 text-primary" /> Media Library
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {items.length} item{items.length !== 1 ? 's' : ''}
              {totalDuration > 0 && ` · ~${Math.round(totalDuration / 60)} min total`}
            </p>
          </div>
          <button
            onClick={load}
            className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {items.length > 0 && (
            <Button
              variant="ghost" size="sm"
              className={cn(
                'rounded-xl h-8 text-xs transition-all',
                confirmClearAll ? 'text-white bg-destructive hover:bg-destructive/90' : 'text-destructive'
              )}
              onClick={handleDeleteAll}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              {confirmClearAll ? 'Confirm?' : 'Clear All'}
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, source, or script…"
            className="w-full bg-secondary/40 rounded-2xl pl-9 pr-3 py-2.5 text-sm border border-border/30 outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(v => !v)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
          {hasActiveFilters && !search && (
            <span className="text-[9px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">active</span>
          )}
        </button>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="space-y-2 overflow-hidden"
              data-tour="media-library-filters"
            >
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Mode</p>
                <div className="flex gap-1.5 flex-wrap">
                  {(['all', 'summary', 'explainer', 'video'] as FilterMode[]).map(m => {
                    const Icon = m === 'all' ? Library : MODE_ICONS[m];
                    return (
                      <button
                        key={m}
                        onClick={() => setFilterMode(m)}
                        className={cn(
                          'flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] border transition-all',
                          filterMode === m ? 'border-primary bg-primary/10 text-primary' : 'border-border/40 text-muted-foreground hover:border-border'
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {m === 'all' ? 'All modes' : MODE_LABELS[m]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Source</p>
                <div className="flex gap-1.5 flex-wrap">
                  {(['all', 'books', 'notes', 'study', 'presentations', 'coach', 'audio-studio', 'video-studio'] as FilterModule[]).map(m => {
                    const Icon = m === 'all' ? Library : MODULE_ICONS[m];
                    return (
                      <button
                        key={m}
                        onClick={() => setFilterModule(m)}
                        className={cn(
                          'flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] border transition-all',
                          filterModule === m ? 'border-primary bg-primary/10 text-primary' : 'border-border/40 text-muted-foreground hover:border-border'
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {m === 'all' ? 'All sources' : MODULE_LABELS[m]}
                      </button>
                    );
                  })}
                </div>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={() => { setFilterMode('all'); setFilterModule('all'); setSearch(''); }}
                  className="text-[11px] text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats bar */}
        {items.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {(['summary', 'explainer', 'video'] as const).map(m => {
              const count = items.filter(x => x.mode === m).length;
              const Icon = MODE_ICONS[m];
              return (
                <button
                  key={m}
                  onClick={() => setFilterMode(filterMode === m ? 'all' : m)}
                  className={cn(
                    'flex flex-col items-center gap-0.5 p-2 rounded-2xl border transition-all',
                    filterMode === m ? 'border-primary bg-primary/10' : 'border-border/30 hover:border-border/60',
                    count === 0 && 'opacity-40'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: MODE_COLORS[m] }} />
                  <span className="text-[11px] font-bold">{count}</span>
                  <span className="text-[9px] text-muted-foreground">{MODE_LABELS[m]}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
              <Library className="w-8 h-8 text-primary/50" />
            </div>
            <p className="font-semibold text-lg">
              {items.length === 0 ? 'No media yet' : 'No results'}
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">
              {items.length === 0
                ? 'Generate audio or video from Books, Notes, Study, Presentations — or upload any file in Audio Studio or Video Studio.'
                : 'Try adjusting your search or filters.'}
            </p>
            {items.length === 0 && (
              <div className="flex gap-2 mt-4 flex-wrap justify-center">
                {([['Books', '/books'], ['Notes', '/notes'], ['Study', '/study'], ['Presentations', '/presentations'], ['Audio Studio', '/audio-studio'], ['Video Studio', '/video-studio']] as const).map(([label, path]) => (
                  <Button key={path} variant="secondary" size="sm" className="rounded-xl text-xs" onClick={() => navigate(path)}>
                    {label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Grouped items */}
        {Object.entries(grouped).map(([moduleKey, moduleItems]) => {
          const Icon = MODULE_ICONS[moduleKey] ?? Library;
          return (
            <div key={moduleKey} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {MODULE_LABELS[moduleKey] ?? moduleKey} ({moduleItems.length})
                </span>
              </div>

              {moduleItems.map(item => (
                <div key={item.id}>
                  {expandedId === item.id ? (
                    <div className="space-y-1" data-tour="media-library-player">
                      <MediaPlayer
                        item={item}
                        onDelete={id => { handleDelete(id); }}
                      />
                      <button
                        onClick={() => setExpandedId(null)}
                        className="w-full text-[10px] text-muted-foreground text-center py-1 hover:text-foreground transition-colors"
                      >
                        ↑ Collapse
                      </button>
                    </div>
                  ) : (
                    <motion.div
                      layout
                      className="glass rounded-2xl px-3 py-2.5 cursor-pointer hover:bg-secondary/40 transition-colors"
                      onClick={() => setExpandedId(item.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${MODE_COLORS[item.mode]}20` }}
                        >
                          {(() => {
                            const Icon2 = MODE_ICONS[item.mode] ?? Headphones;
                            return <Icon2 className="w-3.5 h-3.5" style={{ color: MODE_COLORS[item.mode] }} />;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium truncate">{item.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {MODE_LABELS[item.mode] ?? item.mode} · {item.sourceName} · ~{Math.round((item.estimatedDuration ?? 0) / 60)}m · {item.wordCount?.toLocaleString()} words
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          <button
                            className="p-1 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                            onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
