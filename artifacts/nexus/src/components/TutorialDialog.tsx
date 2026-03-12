import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { tutorialSections, TutorialSection } from '@/lib/tutorialData';
import { ChevronLeft, ChevronRight, X, BookOpen, Search, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TutorialDialog({ open, onOpenChange }: TutorialDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTOC, setShowTOC] = useState(false);
  const isSearching = searchQuery.trim().length > 0;

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = searchQuery.toLowerCase();
    return tutorialSections.flatMap(section =>
      section.items
        .filter(item => item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q))
        .map(item => ({ ...item, sectionTitle: section.title, sectionIcon: section.icon, sectionId: section.id }))
    );
  }, [searchQuery, isSearching]);

  // Also filter full sections that match by title
  const matchingSections = useMemo(() => {
    if (!isSearching) return [];
    const q = searchQuery.toLowerCase();
    return tutorialSections.filter(s => s.title.toLowerCase().includes(q));
  }, [searchQuery, isSearching]);

  const section = tutorialSections[currentIndex];
  const total = tutorialSections.length;

  const goTo = (idx: number) => {
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
    setSearchQuery('');
    setShowTOC(false);
  };

  const next = () => { if (currentIndex < total - 1) goTo(currentIndex + 1); };
  const prev = () => { if (currentIndex > 0) goTo(currentIndex - 1); };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => { setCurrentIndex(0); setDirection(0); setSearchQuery(''); setShowTOC(false); }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[420px] w-[95vw] p-0 gap-0 rounded-2xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 space-y-2.5">
          <DialogHeader className="flex flex-row items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-5 h-5 text-primary" />
              App Tutorial
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-xs mt-1">
            {isSearching
              ? `${searchResults.length + matchingSections.length} result${searchResults.length + matchingSections.length !== 1 ? 's' : ''} found`
              : showTOC
                ? 'Browse all sections'
                : `${currentIndex + 1} of ${total} — ${section.title}`}
          </DialogDescription>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search features..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-secondary rounded-xl pl-8 pr-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary/40"
            />
            {isSearching && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Progress dots + TOC toggle — hide when searching */}
          {!isSearching && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1 overflow-x-auto pb-1 flex-1">
                {!showTOC && tutorialSections.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => goTo(i)}
                    className={`shrink-0 h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-6 bg-primary' : i < currentIndex ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-muted-foreground/20'
                      }`}
                  />
                ))}
              </div>
              <button
                onClick={() => setShowTOC(!showTOC)}
                className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${showTOC ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground'}`}
                title="Table of Contents"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[55vh]">
          {isSearching ? (
            <div className="px-5 pb-4 space-y-2.5">
              {matchingSections.map(s => (
                <button
                  key={s.id}
                  onClick={() => goTo(tutorialSections.indexOf(s))}
                  className="w-full text-left bg-primary/10 rounded-xl p-3 hover:bg-primary/15 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{s.icon}</span>
                    <p className="text-sm font-semibold">{s.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.items.length} features — tap to view</p>
                </button>
              ))}
              {searchResults.map((item, i) => (
                <button
                  key={`${item.sectionId}-${i}`}
                  onClick={() => goTo(tutorialSections.findIndex(s => s.id === item.sectionId))}
                  className="w-full text-left bg-secondary/60 rounded-xl p-3 space-y-1 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{item.sectionIcon}</span>
                    <span className="text-[10px] text-muted-foreground">{item.sectionTitle}</span>
                  </div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </button>
              ))}
              {searchResults.length === 0 && matchingSections.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No results for "{searchQuery}"</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Try different keywords</p>
                </div>
              )}
            </div>
          ) : showTOC ? (
            <div className="px-5 pb-4 space-y-1.5">
              {tutorialSections.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${i === currentIndex ? 'bg-primary/15 ring-1 ring-primary/30' : 'hover:bg-secondary/80'
                    }`}
                >
                  <span className="text-lg shrink-0">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{s.title}</p>
                    <p className="text-[10px] text-muted-foreground">{s.items.length} features</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={section.id}
                custom={direction}
                initial={{ opacity: 0, x: direction * 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -60 }}
                transition={{ duration: 0.2 }}
                className="px-5 pb-4"
              >
                <SectionContent section={section} />
              </motion.div>
            </AnimatePresence>
          )}
        </ScrollArea>

        {/* Footer nav — hide when searching */}
        {!isSearching && (
          <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={prev} disabled={currentIndex === 0} className="gap-1 text-xs">
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            {currentIndex === total - 1 ? (
              <Button size="sm" onClick={handleClose} className="gap-1 text-xs">Got it! 🎉</Button>
            ) : (
              <Button size="sm" onClick={next} className="gap-1 text-xs">Next <ChevronRight className="w-4 h-4" /></Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog >
  );
}

function SectionContent({ section }: { section: TutorialSection }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="text-3xl">{section.icon}</span>
        <h3 className="text-lg font-bold font-display">{section.title}</h3>
      </div>
      <div className="space-y-2.5">
        {section.items.map((item, i) => (
          <div key={i} className="bg-secondary/60 rounded-xl p-3 space-y-1">
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
