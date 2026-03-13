import { useState, useRef, useEffect, useCallback } from 'react';
import { exampleBooks } from '@/lib/examples';
import { logError } from '@/lib/logger';
import { useLocalStorage, isDemoMode } from '@/hooks/useLocalStorage';
import { Book, BookBookmark } from '@/types';
import { saveBookFile, getBookFile, deleteBookFile, type BookFileData } from '@/lib/bookStorage';
import { ArrowLeft, Plus, X, Trash2, Upload, BookOpen, Sun, Moon, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Pencil, Check, FileText, Bookmark, BookmarkCheck, List, MessageSquare, ZoomIn, ZoomOut, Sparkles, StickyNote, Download, Headphones } from 'lucide-react';
import MediaGenerationModal from '@/components/MediaGenerationModal';
import RotateIcon from '@/components/study/RotateIcon';
import AISummarizer from '@/components/AISummarizer';
import SavedNotesAndSummaries from '@/components/SavedNotesAndSummaries';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';
import { makeBookPageTextFn } from '@/lib/extractText';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';

const statusColors = { unread: 'hsl(199, 89%, 48%)', reading: 'hsl(38, 92%, 50%)', read: 'hsl(152, 69%, 45%)' };

// Split text into pages of ~2000 chars respecting paragraph boundaries
function paginateText(text: string, charsPerPage = 2000): string[] {
  if (!text) return ['No content available.'];
  const pages: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= charsPerPage) {
      pages.push(remaining.trim());
      break;
    }
    let cut = remaining.lastIndexOf('\n\n', charsPerPage);
    if (cut < charsPerPage * 0.5) cut = remaining.lastIndexOf('\n', charsPerPage);
    if (cut < charsPerPage * 0.3) cut = remaining.lastIndexOf(' ', charsPerPage);
    if (cut <= 0) cut = charsPerPage;
    pages.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  return pages.length ? pages : ['No content available.'];
}

// ── PDF Renderer Component ──
function PdfPageRenderer({ pdfData, pdfUrl, pageNum, brightness, darkMode }: { pdfData?: string; pdfUrl?: string; pageNum: number; brightness: number; darkMode: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      setLoading(true);
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        let pdf;
        if (pdfUrl) {
          // Load directly from URL (for default/bundled books)
          pdf = await pdfjsLib.getDocument({ url: pdfUrl }).promise;
        } else if (pdfData && pdfData.length >= 10) {
          let binary: string;
          try {
            binary = atob(pdfData);
          } catch {
            logError('PDF base64 data is corrupted');
            setLoading(false);
            return;
          }
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          pdf = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
        } else {
          logError('No PDF data or URL provided');
          setLoading(false);
          return;
        }

        if (cancelled) return;
        const page = await pdf.getPage(pageNum);
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        const containerWidth = canvas.parentElement?.clientWidth || 360;
        const viewport = page.getViewport({ scale: 1 });
        const scale = (containerWidth * 2) / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        canvas.style.width = `${scaledViewport.width / 2}px`;
        canvas.style.height = `${scaledViewport.height / 2}px`;

        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
        setLoading(false);
      } catch (err) {
        logError('PDF render error', err);
        setLoading(false);
      }
    };
    render();
    return () => { cancelled = true; };
  }, [pdfData, pdfUrl, pageNum]);

  return (
    <div className="flex justify-center">
      {loading && <div className="absolute inset-0 flex items-center justify-center z-10"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}
      <canvas
        ref={canvasRef}
        className="max-w-full rounded-lg"
        style={{
          filter: `brightness(${brightness / 100})${darkMode ? ' invert(1) hue-rotate(180deg)' : ''}`,
        }}
      />
    </div>
  );
}

// Bookmark color config
const bookmarkColors: Record<BookBookmark['color'], string> = {
  yellow: 'hsl(48, 96%, 53%)',
  green: 'hsl(152, 69%, 45%)',
  blue: 'hsl(199, 89%, 48%)',
  pink: 'hsl(340, 82%, 60%)',
};

// ── Book Reader Component ──
function BookReader({ book, onBack, onUpdate }: { book: Book; onBack: () => void; onUpdate: (b: Book) => void }) {
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(book.currentPage || 1);
  const [darkMode, setDarkMode] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(book.title);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [addingBookmark, setAddingBookmark] = useState(false);
  const [bmNote, setBmNote] = useState('');
  const [bmColor, setBmColor] = useState<BookBookmark['color']>('yellow');
  const [zoom, setZoom] = useState(1);
  const totalPages = book.totalPages || 1;
  const pinchStartRef = useRef<number | null>(null);
  const pinchZoomStartRef = useRef<number>(1);

  // Load file data from IndexedDB
  const [fileData, setFileData] = useState<BookFileData | null>(null);
  const [loadingFile, setLoadingFile] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [landscapeMode, setLandscapeMode] = useState(false);
  const [showFooter, setShowFooter] = useState(true);
  const [landscapeControlsVisible, setLandscapeControlsVisible] = useState(true);
  const landscapeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readerContainerRef = useRef<HTMLDivElement>(null);

  // Track current session's note ID (so auto-save updates the same note within one session)
  const [activeBookNoteId, setActiveBookNoteId] = useState<string | null>(null);

  const saveNote = useCallback(() => {
    if (!noteContent.trim()) return;
    const savedNotes = JSON.parse(localStorage.getItem('mindflow_study_notes') || '[]');
    const title = noteTitle.trim() || `Notes - ${book.title} - ${new Date().toLocaleDateString()}`;
    const now = new Date().toISOString();

    // Within the same session, update the same note; otherwise create new
    const noteId = activeBookNoteId || crypto.randomUUID();
    const existingIdx = activeBookNoteId ? savedNotes.findIndex((n: any) => n.id === activeBookNoteId) : -1;
    const note = {
      id: noteId,
      sessionId: 'books-session',
      materialId: book.id,
      title,
      content: noteContent,
      createdAt: existingIdx >= 0 ? savedNotes[existingIdx].createdAt : now,
      updatedAt: now,
    };

    if (existingIdx >= 0) savedNotes[existingIdx] = note;
    else savedNotes.push(note);

    localStorage.setItem('mindflow_study_notes', JSON.stringify(savedNotes));
    if (!activeBookNoteId) setActiveBookNoteId(noteId);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }, [book.id, book.title, noteContent, noteTitle, activeBookNoteId]);

  const downloadNotes = () => {
    if (!noteContent.trim()) return;
    const blob = new Blob([noteContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${noteTitle || 'Notes'}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!noteContent.trim()) return;
    const t = setInterval(saveNote, 10000);
    return () => clearInterval(t);
  }, [noteContent, noteTitle, saveNote]);

  const resetLandscapeTimer = useCallback(() => {
    if (landscapeTimerRef.current) clearTimeout(landscapeTimerRef.current);
    setLandscapeControlsVisible(true);
    landscapeTimerRef.current = setTimeout(() => setLandscapeControlsVisible(false), 3500);
  }, []);

  useEffect(() => {
    if (landscapeMode) resetLandscapeTimer();
    else { setLandscapeControlsVisible(true); if (landscapeTimerRef.current) clearTimeout(landscapeTimerRef.current); }
    return () => { if (landscapeTimerRef.current) clearTimeout(landscapeTimerRef.current); };
  }, [landscapeMode, resetLandscapeTimer]);

  const toggleLandscapeControls = () => {
    if (!landscapeMode) return;
    if (landscapeControlsVisible) {
      setLandscapeControlsVisible(false);
      if (landscapeTimerRef.current) clearTimeout(landscapeTimerRef.current);
    } else {
      resetLandscapeTimer();
    }
  };

  const toggleAutoRotate = async () => {
    if (!landscapeMode) {
      try {
        await readerContainerRef.current?.requestFullscreen?.();
        await (screen.orientation as any)?.lock?.('landscape');
      } catch {
        // Orientation lock not supported – use CSS rotation fallback
      }
      setLandscapeMode(true);
    } else {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        screen.orientation?.unlock?.();
      } catch { }
      setLandscapeMode(false);
    }
  };
  const toggleFooter = () => setShowFooter(!showFooter);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // For URL-based PDFs (default books), no IndexedDB data needed
        if (book.pdfUrl) {
          // Auto-detect total pages from PDF
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
          const pdf = await pdfjsLib.getDocument({ url: book.pdfUrl }).promise;
          if (!cancelled) {
            onUpdate({ ...book, totalPages: pdf.numPages });
            setFileData(null); // No file data needed, pdfUrl handles it
          }
        } else {
          const data = await getBookFile(book.id);
          if (!cancelled) {
            if (!data && (book.content || book.pdfData)) {
              setFileData({ content: book.content, pdfData: book.pdfData });
            } else {
              setFileData(data);
            }
          }
        }
      } catch {
        if (!cancelled) setFileData({ content: book.content, pdfData: book.pdfData });
      }
      if (!cancelled) setLoadingFile(false);
    })();
    return () => { cancelled = true; };
  }, [book.id, book.pdfUrl]);

  const bookmarks = book.bookmarks || [];
  const currentPageBookmark = bookmarks.find(bm => bm.page === currentPage);

  const textPages = book.fileType !== 'pdf' && fileData?.content ? paginateText(fileData.content) : null;
  const effectiveTotal = book.fileType === 'pdf' ? totalPages : (textPages?.length || 1);

  const goToPage = useCallback((p: number) => {
    const clamped = Math.max(1, Math.min(p, effectiveTotal));
    setCurrentPage(clamped);
    onUpdate({ ...book, currentPage: clamped, status: clamped === effectiveTotal ? 'read' : 'reading' });
  }, [effectiveTotal, book, onUpdate]);

  const addBookmark = () => {
    if (currentPageBookmark) {
      toast('This page is already bookmarked');
      return;
    }
    const bm: BookBookmark = {
      id: crypto.randomUUID(),
      page: currentPage,
      note: bmNote.trim(),
      color: bmColor,
      createdAt: new Date().toISOString(),
    };
    onUpdate({ ...book, bookmarks: [...bookmarks, bm].sort((a, b) => a.page - b.page) });
    setBmNote('');
    setAddingBookmark(false);
    toast.success(`Bookmarked page ${currentPage}`);
  };

  const removeBookmark = (id: string) => {
    onUpdate({ ...book, bookmarks: bookmarks.filter(bm => bm.id !== id) });
    toast('Bookmark removed');
  };

  const saveTitle = () => {
    if (titleDraft.trim()) {
      onUpdate({ ...book, title: titleDraft.trim() });
      setEditingTitle(false);
    }
  };

  // keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goToPage(currentPage + 1);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goToPage(currentPage - 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentPage, goToPage]);

  // Touch swipe for page turning
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      pinchStartRef.current = dist;
      pinchZoomStartRef.current = zoom;
    } else {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, [zoom]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    // Only trigger if horizontal swipe is dominant and > 60px
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goToPage(currentPage + 1); // swipe left = next
      else goToPage(currentPage - 1); // swipe right = prev
    }
  }, [currentPage, goToPage]);

  const bgColor = darkMode ? 'hsl(0, 0%, 8%)' : 'hsl(40, 30%, 96%)';
  const textColor = darkMode ? 'hsl(40, 20%, 85%)' : 'hsl(0, 0%, 12%)';
  const mutedColor = darkMode ? 'hsl(40, 10%, 55%)' : 'hsl(0, 0%, 40%)';
  const borderCol = darkMode ? 'hsl(0,0%,25%)' : 'hsl(0,0%,70%)';

  return (
    <motion.div
      ref={readerContainerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "fixed inset-0 z-[100] flex flex-col",
        landscapeMode && !document.fullscreenElement && "landscape-css-rotate"
      )}
      style={{
        background: bgColor, color: textColor,
        ...(landscapeMode && !document.fullscreenElement ? {
          width: '100vh', height: '100vw',
          position: 'fixed' as const, top: '50%', left: '50%',
          marginTop: '-50vw', marginLeft: '-50vh',
          transform: 'rotate(90deg)', transformOrigin: 'center',
          zIndex: 200,
        } : {})
      }}
    >
      <PageOnboardingTooltips pageId="books-reader" />
      {/* Header - auto-hides in landscape */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 border-b transition-all duration-300",
        landscapeMode && !landscapeControlsVisible && "opacity-0 pointer-events-none h-0 py-0 overflow-hidden border-0"
      )} style={{ borderColor: darkMode ? 'hsl(0,0%,20%)' : 'hsl(0,0%,85%)', color: textColor }}>
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-foreground/10">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-1">
              <input
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveTitle()}
                className="text-sm font-semibold bg-transparent border-b-2 outline-none flex-1 min-w-0"
                style={{ borderColor: 'hsl(262, 83%, 58%)' }}
                autoFocus
              />
              <button onClick={saveTitle} className="p-1"><Check className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold truncate">{book.title}</span>
              <button onClick={() => { setTitleDraft(book.title); setEditingTitle(true); }} className="p-0.5 opacity-50 hover:opacity-100">
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
          <p className="text-[10px]" style={{ color: mutedColor }}>{book.author}</p>
        </div>

        {/* Bookmark toggle for current page */}
        <button
          data-tour="reader-bookmark"
          onClick={() => {
            if (currentPageBookmark) {
              removeBookmark(currentPageBookmark.id);
            } else {
              setAddingBookmark(!addingBookmark);
              setShowBookmarks(false);
            }
          }}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: currentPageBookmark ? bookmarkColors[currentPageBookmark.color] : undefined }}
          title={currentPageBookmark ? 'Remove bookmark' : 'Bookmark this page'}
        >
          {currentPageBookmark ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>

        {/* Bookmarks list toggle */}
        <button
          onClick={() => { setShowBookmarks(!showBookmarks); setAddingBookmark(false); }}
          className="p-1.5 rounded-lg transition-colors relative"
          style={{ color: showBookmarks ? 'hsl(245, 58%, 62%)' : undefined }}
          title="View bookmarks"
        >
          <List className="w-4 h-4" />
          {bookmarks.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center text-white" style={{ background: 'hsl(245, 58%, 62%)' }}>
              {bookmarks.length}
            </span>
          )}
        </button>

        <span className="text-[10px] font-mono shrink-0" style={{ color: mutedColor }}>{currentPage}/{effectiveTotal}</span>

        <div className="flex items-center gap-1 border-l pl-2" style={{ borderColor: borderCol, color: textColor }}>
          <button
            data-tour="reader-rotate"
            onClick={toggleAutoRotate}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              landscapeMode ? "bg-primary/20 text-primary" : "hover:bg-black/10"
            )}
            style={!landscapeMode ? { color: mutedColor } : undefined}
            title="Auto Rotate"
          >
            <RotateIcon active={landscapeMode} size={16} />
          </button>
          <button
            data-tour="reader-notes"
            onClick={() => setShowNotes(!showNotes)}
            className={cn(
              "p-1.5 rounded-lg transition-colors flex flex-col items-center gap-0.5",
              showNotes ? "bg-primary/20 text-primary" : "hover:bg-black/10"
            )}
            style={!showNotes ? { color: mutedColor } : undefined}
            title="Notes"
          >
            <StickyNote className="w-4 h-4" />
            <span className="text-[8px] font-medium leading-none">Note</span>
          </button>
        </div>
      </div>

      {/* Add bookmark panel */}
      <AnimatePresence>
        {addingBookmark && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b"
            style={{ borderColor: darkMode ? 'hsl(0,0%,20%)' : 'hsl(0,0%,85%)', background: darkMode ? 'hsl(0,0%,12%)' : 'hsl(40,30%,92%)' }}
          >
            <div className="px-3 py-2.5 space-y-2">
              <p className="text-[10px] font-semibold opacity-60 uppercase tracking-wider">Bookmark Page {currentPage}</p>
              <div className="flex gap-1.5">
                {(Object.keys(bookmarkColors) as BookBookmark['color'][]).map(c => (
                  <button
                    key={c}
                    onClick={() => setBmColor(c)}
                    className="w-6 h-6 rounded-full transition-transform"
                    style={{
                      background: bookmarkColors[c],
                      transform: bmColor === c ? 'scale(1.25)' : 'scale(1)',
                      boxShadow: bmColor === c ? `0 0 0 2px ${bgColor}, 0 0 0 4px ${bookmarkColors[c]}` : 'none',
                    }}
                  />
                ))}
              </div>
              <input
                value={bmNote}
                onChange={e => setBmNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addBookmark()}
                placeholder="Add a note (optional)…"
                className="w-full text-xs bg-transparent border rounded-lg px-2.5 py-1.5 outline-none text-foreground"
                style={{ borderColor: darkMode ? 'hsl(0,0%,28%)' : 'hsl(0,0%,78%)' }}
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={addBookmark} className="flex-1 text-xs font-medium py-1.5 rounded-lg text-white" style={{ background: bookmarkColors[bmColor] }}>
                  Save Bookmark
                </button>
                <button onClick={() => setAddingBookmark(false)} className="text-xs px-3 py-1.5 rounded-lg opacity-60 hover:opacity-100">
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bookmarks list panel */}
      <AnimatePresence>
        {showBookmarks && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b max-h-[40vh] overflow-y-auto"
            style={{ borderColor: darkMode ? 'hsl(0,0%,20%)' : 'hsl(0,0%,85%)', background: darkMode ? 'hsl(0,0%,12%)' : 'hsl(40,30%,92%)' }}
          >
            <div className="px-3 py-2.5 space-y-1.5">
              <p className="text-[10px] font-semibold opacity-60 uppercase tracking-wider">
                Bookmarks ({bookmarks.length})
              </p>
              {bookmarks.length === 0 ? (
                <p className="text-xs opacity-40 py-3 text-center">No bookmarks yet. Tap the bookmark icon to add one.</p>
              ) : (
                bookmarks.map(bm => (
                  <motion.button
                    key={bm.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => {
                      goToPage(bm.page);
                      setShowBookmarks(false);
                    }}
                    className="w-full text-left flex items-start gap-2.5 p-2 rounded-lg transition-colors hover:bg-foreground/5 group"
                  >
                    <div className="w-1 h-full min-h-[24px] rounded-full shrink-0 mt-0.5" style={{ background: bookmarkColors[bm.color] }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold">Page {bm.page}</span>
                        {bm.page === currentPage && (
                          <span className="text-[8px] px-1 py-0.5 rounded-full font-bold" style={{ background: bookmarkColors[bm.color] + '30', color: bookmarkColors[bm.color] }}>
                            HERE
                          </span>
                        )}
                      </div>
                      {bm.note && (
                        <p className="text-[10px] opacity-60 truncate flex items-center gap-1 mt-0.5">
                          <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                          {bm.note}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); removeBookmark(bm.id); }}
                      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-0.5 shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        <div
          ref={contentRef}
          onTouchStart={handleTouchStart}
          onTouchMove={(e) => {
            if (e.touches.length === 2 && pinchStartRef.current !== null) {
              const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
              const newZoom = Math.min(5, Math.max(0.5, pinchZoomStartRef.current * (dist / pinchStartRef.current)));
              setZoom(Math.round(newZoom * 20) / 20);
            }
          }}
          onTouchEnd={(e) => {
            if (pinchStartRef.current !== null) { pinchStartRef.current = null; return; }
            handleTouchEnd(e);
          }}
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              setZoom(z => Math.min(5, Math.max(0.5, Math.round((z + (e.deltaY < 0 ? 0.1 : -0.1)) * 20) / 20)));
            }
          }}
          className="flex-1 overflow-auto px-4 py-6 relative select-none"
          style={{ touchAction: 'pan-y', background: bgColor }}
          onClick={toggleLandscapeControls}
        >

          {/* Bookmark indicator on current page */}
          {currentPageBookmark && (
            <div className="absolute top-0 right-6 w-5 h-8 rounded-b-sm shadow-md z-10"
              style={{ background: bookmarkColors[currentPageBookmark.color] }}
              title={currentPageBookmark.note || `Bookmarked page ${currentPage}`}
            />
          )}

          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', minHeight: '100%', filter: `brightness(${brightness / 100})` }}>
            {loadingFile ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : book.fileType === 'pdf' && (fileData?.pdfData || book.pdfUrl) ? (
              <PdfPageRenderer pdfData={fileData?.pdfData} pdfUrl={book.pdfUrl} pageNum={currentPage} brightness={100} darkMode={darkMode} />
            ) : fileData?.content ? (
              <div className="max-w-lg mx-auto">
                <p className="text-sm leading-7 whitespace-pre-wrap" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                  {textPages?.[currentPage - 1] || 'No content available.'}
                </p>
              </div>
            ) : (
              <div className="max-w-lg mx-auto text-center py-12 opacity-50">
                <FileText className="w-10 h-10 mx-auto mb-3" />
                <p className="text-sm">No readable content for this book.</p>
                <p className="text-xs mt-1">The file data may have been lost or corrupted.</p>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showNotes && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: '45%', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t flex flex-col overflow-hidden bg-background"
              style={{ borderColor: darkMode ? 'hsl(0,0%,20%)' : 'hsl(0,0%,85%)' }}
            >
              <div className="px-3 py-2 flex items-center gap-2 border-b shrink-0" style={{ borderColor: darkMode ? 'hsl(0,0%,20%)' : 'hsl(0,0%,85%)' }}>
                <Input
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  placeholder="Note Title"
                  className="text-xs h-7 bg-transparent border flex-1 text-foreground"
                  style={{ borderColor: darkMode ? 'hsl(0,0%,30%)' : 'hsl(0,0%,75%)' }}
                />
                <Button size="sm" className="h-7 text-[11px] px-3 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow-sm" onClick={saveNote}>
                  💾 Save
                </Button>
                <button onClick={downloadNotes} className="h-7 px-2.5 rounded-md flex items-center gap-1 text-[11px] font-semibold transition-colors" style={{ background: darkMode ? 'hsl(0,0%,20%)' : 'hsl(0,0%,88%)', color: darkMode ? '#e5e5e5' : '#1a1a1a' }} title="Download notes">
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                {noteSaved && (
                  <span className="text-[10px] text-green-500 flex items-center gap-0.5"><Check className="w-3 h-3" /> Saved</span>
                )}
              </div>
              <Textarea
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                placeholder="Take notes while reading... (auto-saves every 10s)"
                className="flex-1 resize-none border-0 rounded-none text-sm focus-visible:ring-0 bg-transparent text-foreground p-3"
              />

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Summarizer in reader */}
      <div data-tour="reader-ai" className="contents">
        <AISummarizer
          documentId={book.id}
          documentName={book.title}
          getPageText={makeBookPageTextFn(book.id, book.fileType, book.pdfUrl)}
          totalPages={effectiveTotal}
          isInReader
        />
      </div>

      {/* Media generation button in reader */}
      <div className="px-3 py-1 shrink-0">
        <button
          onClick={() => setMediaModalOpen(true)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors px-2.5 py-1.5 rounded-xl hover:bg-primary/10 w-full justify-center border border-dashed border-border/40"
        >
          <Headphones className="w-3.5 h-3.5" />
          Generate Audio / Video
        </button>
      </div>
      {mediaModalOpen && (
        <MediaGenerationModal
          open
          onClose={() => setMediaModalOpen(false)}
          sourceModule="books"
          sourceId={book.id}
          sourceName={book.title}
          getSourceText={makeBookPageTextFn(book.id, book.fileType, book.pdfUrl)}
          totalPages={effectiveTotal}
        />
      )}

      {/* Controls footer */}
      <AnimatePresence>
        {showFooter && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t px-3 py-2 space-y-2 shrink-0 overflow-hidden"
            style={{ borderColor: darkMode ? 'hsl(0,0%,20%)' : 'hsl(0,0%,85%)', background: bgColor, color: textColor }}
          >
            {/* Hide controls button */}
            <div className="flex justify-end mb-1">
              <button onClick={toggleFooter} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg hover:bg-black/10 transition-colors" style={{ color: mutedColor }}>
                <ChevronDown className="w-3 h-3" /> Hide
              </button>
            </div>
            {/* Brightness + Dark mode */}
            <div className="flex items-center gap-3">
              <button onClick={() => setDarkMode(!darkMode)} className="p-1.5 rounded-lg transition-colors" style={{ background: darkMode ? 'hsl(0,0%,20%)' : 'hsl(0,0%,88%)', color: textColor }}>
                {darkMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>
              <Sun className="w-3 h-3" style={{ color: mutedColor }} />
              <Slider
                value={[brightness]}
                onValueChange={v => setBrightness(v[0])}
                min={30}
                max={150}
                step={5}
                className="flex-1"
              />
              <span className="text-[10px] font-mono w-7 text-right" style={{ color: mutedColor }}>{brightness}%</span>
              <div className="border-l pl-2 flex items-center gap-1 shrink-0" style={{ borderColor: borderCol, color: textColor }}>
                <button onClick={() => setZoom(z => Math.max(0.5, Math.round((z - 0.1) * 20) / 20))} className="p-1 rounded hover:bg-black/10" style={{ color: mutedColor }} title="Zoom out">
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setZoom(1)} className="text-[10px] font-mono px-1 min-w-[32px] text-center" style={{ color: mutedColor }} title="Reset zoom">
                  {Math.round(zoom * 100)}%
                </button>
                <button onClick={() => setZoom(z => Math.min(5, Math.round((z + 0.1) * 20) / 20))} className="p-1 rounded hover:bg-black/10" style={{ color: mutedColor }} title="Zoom in">
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Page navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-2 rounded-lg disabled:opacity-20 hover:bg-black/10"
                style={{ color: textColor }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: mutedColor }}>Page</span>
                <input
                  type="number"
                  value={currentPage}
                  onChange={e => goToPage(parseInt(e.target.value) || 1)}
                  min={1}
                  max={effectiveTotal}
                  className="w-12 text-center text-sm font-mono bg-transparent border rounded px-1 py-0.5"
                  style={{ borderColor: borderCol, color: textColor }}
                />
                <span className="text-xs" style={{ color: mutedColor }}>of {effectiveTotal}</span>
              </div>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= effectiveTotal}
                className="p-2 rounded-lg disabled:opacity-20 hover:bg-black/10"
                style={{ color: textColor }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed footer toggle - shows when footer is hidden */}
      {!showFooter && (
        <button
          onClick={toggleFooter}
          className="flex items-center justify-center gap-1.5 py-1.5 px-4 border-t shrink-0 w-full hover:bg-black/5 transition-colors"
          style={{ borderColor: borderCol, background: bgColor, color: mutedColor }}
        >
          <ChevronUp className="w-3.5 h-3.5" />
          <span className="text-[10px] font-medium">Show Controls</span>
        </button>
      )}
    </motion.div>
  );
}

// ── Main Books Page ──
export default function Books() {
  const navigate = useNavigate();
  const [hasInit] = useLocalStorage('books_init', false);
  const [books, setBooks] = useLocalStorage<Book[]>('books', []);
  const [, setInit] = useLocalStorage('books_init', true);
  const [readingBookId, setReadingBookId] = useState<string | null>(null);
  const [mediaModalBookId, setMediaModalBookId] = useState<string | null>(null);

  // Read saved notes from localStorage for card-view display
  const [bookNotes, setBookNotes] = useState<{ id: string; materialId: string; title: string; content: string; updatedAt: string }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('mindflow_study_notes') || '[]');
    } catch { return []; }
  });

  // Refresh book notes when returning from reader
  useEffect(() => {
    if (!readingBookId) {
      try {
        setBookNotes(JSON.parse(localStorage.getItem('mindflow_study_notes') || '[]'));
      } catch { setBookNotes([]); }
    }
  }, [readingBookId]);

  const deleteBookNote = useCallback((noteId: string) => {
    const current = JSON.parse(localStorage.getItem('mindflow_study_notes') || '[]');
    const updated = current.filter((n: any) => n.id !== noteId);
    localStorage.setItem('mindflow_study_notes', JSON.stringify(updated));
    setBookNotes(updated);
  }, []);

  if (!hasInit) setInit(true);

  useEffect(() => {
    if (localStorage.getItem('mindflow_books_v2_seeded')) return;
    const validUrls = exampleBooks.map(b => b.pdfUrl).filter(Boolean);
    setBooks(prev => {
      const cleaned = prev.filter(b => !b.isDefault || validUrls.includes(b.pdfUrl));
      const toAdd = exampleBooks.filter(eb => !cleaned.some(b => b.pdfUrl === eb.pdfUrl));
      return [...cleaned, ...toAdd];
    });
    localStorage.removeItem('mindflow_deletedDefaultBooks');
    localStorage.setItem('mindflow_books_cleaned_v1', '1');
    localStorage.setItem('mindflow_books_v2_seeded', '1');
  }, []);

  const readingBook = books.find(b => b.id === readingBookId) || null;

  const importFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.replace(/\.[^.]+$/, '');

    if (file.size > 150 * 1024 * 1024) {
      toast.error('File too large (max 150MB)');
      e.target.value = '';
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext !== 'txt' && ext !== 'pdf' && ext !== 'epub') {
      toast.error(`".${ext}" is not supported. Please import PDF, EPUB, or TXT files.`);
      e.target.value = '';
      return;
    }

    try {
      if (ext === 'txt') {
        const text = await file.text();
        if (!text.trim()) {
          toast.error('File is empty');
          e.target.value = '';
          return;
        }
        const pages = paginateText(text);
        const bookId = crypto.randomUUID();
        await saveBookFile(bookId, { content: text });
        const newBook: Book = {
          id: bookId, title: name, author: 'Unknown', status: 'unread',
          currentPage: 1, totalPages: pages.length, fileType: 'txt',
          createdAt: new Date().toISOString(),
        };
        setBooks(prev => [newBook, ...prev]);
        toast.success(`Imported "${name}" — ${pages.length} pages`);
      } else if (ext === 'epub') {
        toast.loading('Processing EPUB…');
        try {
          const ePub = (await import('epubjs')).default;
          const arrayBuffer = await file.arrayBuffer();
          const book = ePub(arrayBuffer as any);
          await book.ready;

          const metadata = await book.loaded.metadata;
          const epubTitle = metadata?.title || name;
          const epubAuthor = metadata?.creator || 'Unknown';

          const spine = book.spine as any;
          const chapters: string[] = [];

          if (spine && spine.each) {
            const spineItems: any[] = [];
            spine.each((item: any) => spineItems.push(item));

            for (const item of spineItems) {
              try {
                const doc = await book.load(item.href);
                if (doc instanceof Document) {
                  const text = doc.body?.textContent || '';
                  if (text.trim()) chapters.push(text.trim());
                } else if (typeof doc === 'string') {
                  const parser = new DOMParser();
                  const parsed = parser.parseFromString(doc, 'text/html');
                  const text = parsed.body?.textContent || '';
                  if (text.trim()) chapters.push(text.trim());
                }
              } catch {
                // Skip unreadable chapters
              }
            }
          }

          const fullText = chapters.join('\n\n--- Chapter ---\n\n');
          if (!fullText.trim()) {
            toast.dismiss();
            toast.error('Could not extract text from this EPUB.');
            e.target.value = '';
            return;
          }

          const pages = paginateText(fullText);
          const bookId = crypto.randomUUID();
          await saveBookFile(bookId, { content: fullText });
          const newBook: Book = {
            id: bookId, title: epubTitle, author: epubAuthor, status: 'unread',
            currentPage: 1, totalPages: pages.length, fileType: 'epub',
            createdAt: new Date().toISOString(),
          };
          setBooks(prev => [newBook, ...prev]);
          toast.dismiss();
          toast.success(`Imported "${epubTitle}" — ${pages.length} pages`);

          book.destroy();
        } catch (epubErr) {
          toast.dismiss();
          toast.error('Failed to parse EPUB. The file may be corrupted.');
          logError('EPUB error', epubErr);
        }
      } else {
        toast.loading('Processing PDF…');
        const arrayBuffer = await file.arrayBuffer();
        const bufferCopy = arrayBuffer.slice(0);
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;

        const bytes = new Uint8Array(bufferCopy);
        const chunkSize = 8192;
        let base64 = '';
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
          base64 += String.fromCharCode(...chunk);
        }
        base64 = btoa(base64);

        const bookId = crypto.randomUUID();
        await saveBookFile(bookId, { pdfData: base64 });
        const newBook: Book = {
          id: bookId, title: name, author: 'Unknown', status: 'unread',
          currentPage: 1, totalPages: numPages, fileType: 'pdf',
          createdAt: new Date().toISOString(),
        };
        setBooks(prev => [newBook, ...prev]);
        toast.dismiss();
        toast.success(`Imported "${name}" — ${numPages} pages`);
      }
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to import file. The file may be corrupted.');
      logError('Book import error', err);
    }
    e.target.value = '';
  };

  const updateBook = useCallback((updated: Book) => {
    setBooks(prev => prev.map(b => b.id === updated.id ? updated : b));
  }, [setBooks]);

  if (readingBook) {
    return <BookReader book={readingBook} onBack={() => setReadingBookId(null)} onUpdate={updateBook} />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="px-4 pt-12 pb-24 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display flex-1">Books</h1>
        <label className={cn("cursor-pointer text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-foreground/5 rounded-lg", isDemoMode && "opacity-50 pointer-events-none")}>
          <Plus className="w-5 h-5" />
          <input type="file" accept=".txt,.pdf,.epub" className="hidden" onChange={importFile} disabled={isDemoMode} />
        </label>
      </div>

      <div className="space-y-3 pb-8">
        {books.length === 0 && (
          <EmptyState
            icon={BookOpen}
            title="No books yet"
            description="Import a PDF or EPUB to start reading."
          />
        )}
        {books.map(book => (
          <motion.div key={book.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: books.indexOf(book) * 0.04 }} className="glass rounded-2xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold truncate">{book.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: statusColors[book.status] + '22', color: statusColors[book.status] }}>{book.status}</span>
                  {book.fileType && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary flex items-center gap-0.5">
                      <FileText className="w-2.5 h-2.5" />
                      {book.fileType.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{book.author}</p>
                {book.totalPages > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Page {book.currentPage || 0}/{book.totalPages}
                  </p>
                )}
              </div>
              <div className="flex gap-1.5 items-center">
                {(book.fileType || book.pdfUrl) && book.totalPages > 0 && !isDemoMode && (
                  <AISummarizer
                    documentId={book.id}
                    documentName={book.title}
                    getPageText={makeBookPageTextFn(book.id, book.fileType, book.pdfUrl)}
                    totalPages={book.totalPages}
                  />
                )}
                <button
                  onClick={() => setMediaModalBookId(book.id)}
                  className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-lg"
                  title="Generate Audio / Video"
                >
                  <Headphones className="w-4 h-4" />
                </button>
                {(book.fileType || book.pdfUrl) && (
                  <button onClick={() => setReadingBookId(book.id)} className="text-muted-foreground hover:text-primary transition-colors" title="Read">
                    <BookOpen className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => {
                  deleteBookFile(book.id).catch(() => { });
                  setBooks(prev => prev.filter(b => b.id !== book.id));
                }} className="text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-1 mt-2">
              {(['unread', 'reading', 'read'] as const).map(s => (
                <button key={s} onClick={() => setBooks(prev => prev.map(b => b.id === book.id ? { ...b, status: s } : b))}
                  className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${book.status === s ? '' : 'bg-secondary text-muted-foreground'}`}
                  style={book.status === s ? { background: statusColors[s] + '22', color: statusColors[s] } : {}}>
                  {s}
                </button>
              ))}
            </div>
            {(book.fileType || book.pdfUrl) && book.totalPages > 0 && (
              <SavedNotesAndSummaries
                documentId={book.id}
                notes={bookNotes.filter(n => n.materialId === book.id).map(n => ({ id: n.id, title: n.title, content: n.content, updatedAt: n.updatedAt }))}
                onDeleteNote={deleteBookNote}
              />
            )}
          </motion.div>
        ))}
      </div>
      {mediaModalBookId && (() => {
        const mb = books.find(b => b.id === mediaModalBookId);
        if (!mb) return null;
        return (
          <MediaGenerationModal
            open
            onClose={() => setMediaModalBookId(null)}
            sourceModule="books"
            sourceId={mb.id}
            sourceName={mb.title}
            getSourceText={makeBookPageTextFn(mb.id, mb.fileType, mb.pdfUrl)}
            totalPages={mb.totalPages}
          />
        );
      })()}
    </motion.div>
  );
}
