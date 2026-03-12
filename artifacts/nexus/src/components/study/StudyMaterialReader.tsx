import { useState, useRef, useEffect, useCallback } from 'react';
import { StudyMaterial, StudyNote, StudyHighlight, HighlightColor } from '@/types';
import { getStudyFile, type StudyFileData } from '@/lib/studyStorage';
import { ArrowLeft, Sun, Moon, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, FileText, StickyNote, Download, Check, Highlighter, X, ZoomIn, ZoomOut, Sparkles, RotateCw } from 'lucide-react';

import AISummarizer from '@/components/AISummarizer';
import { makeStudyPageTextFn } from '@/lib/extractText';
import RotateIcon from './RotateIcon';
import KiraStudyBuddy from './KiraStudyBuddy';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const HIGHLIGHT_COLORS: { value: HighlightColor; bg: string; label: string }[] = [
  { value: 'yellow', bg: 'rgba(255,235,59,0.4)', label: '🟡 Yellow' },
  { value: 'green', bg: 'rgba(76,175,80,0.35)', label: '🟢 Green' },
  { value: 'blue', bg: 'rgba(66,165,245,0.35)', label: '🔵 Blue' },
  { value: 'pink', bg: 'rgba(233,30,99,0.3)', label: '🩷 Pink' },
  { value: 'orange', bg: 'rgba(255,152,0,0.4)', label: '🟠 Orange' },
];

function getHighlightBg(color: HighlightColor) {
  return HIGHLIGHT_COLORS.find(c => c.value === color)?.bg || 'rgba(255,235,59,0.4)';
}

// Split text into pages
function paginateText(text: string, charsPerPage = 2000): string[] {
  if (!text) return ['No content available.'];
  const pages: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= charsPerPage) { pages.push(remaining.trim()); break; }
    let cut = remaining.lastIndexOf('\n\n', charsPerPage);
    if (cut < charsPerPage * 0.5) cut = remaining.lastIndexOf('\n', charsPerPage);
    if (cut < charsPerPage * 0.3) cut = remaining.lastIndexOf(' ', charsPerPage);
    if (cut <= 0) cut = charsPerPage;
    pages.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  return pages.length ? pages : ['No content available.'];
}

// Render text with highlights applied
function HighlightedText({ text, highlights, darkMode }: { text: string; highlights: StudyHighlight[]; darkMode: boolean }) {
  if (!highlights.length) return <span>{text}</span>;

  // Find all occurrences of highlighted text and mark them
  interface Mark { start: number; end: number; color: HighlightColor }
  const marks: Mark[] = [];
  for (const h of highlights) {
    let idx = 0;
    while ((idx = text.indexOf(h.text, idx)) !== -1) {
      marks.push({ start: idx, end: idx + h.text.length, color: h.color });
      idx += h.text.length;
    }
  }
  marks.sort((a, b) => a.start - b.start);

  // Merge overlapping
  const merged: Mark[] = [];
  for (const m of marks) {
    if (merged.length && m.start <= merged[merged.length - 1].end) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, m.end);
    } else {
      merged.push({ ...m });
    }
  }

  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of merged) {
    if (m.start > last) parts.push(<span key={`t${last}`}>{text.slice(last, m.start)}</span>);
    parts.push(
      <mark key={`h${m.start}`} style={{ background: getHighlightBg(m.color), borderRadius: 2, padding: '0 1px', color: darkMode ? '#1a1a1a' : 'inherit' }}>
        {text.slice(m.start, m.end)}
      </mark>
    );
    last = m.end;
  }
  if (last < text.length) parts.push(<span key={`t${last}`}>{text.slice(last)}</span>);
  return <>{parts}</>;
}

// PDF page renderer
function PdfPageRenderer({ pdfData, pageNum, darkMode }: { pdfData: string; pageNum: number; darkMode: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      setLoading(true);
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
        let binary: string;
        try { binary = atob(pdfData); } catch { setLoading(false); return; }
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const pdf = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
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
      } catch { setLoading(false); }
    };
    render();
    return () => { cancelled = true; };
  }, [pdfData, pageNum]);

  return (
    <div className="flex justify-center">
      {loading && <div className="absolute inset-0 flex items-center justify-center z-10"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}
      <canvas ref={canvasRef} className="max-w-full rounded-lg" style={{ filter: darkMode ? 'invert(1) hue-rotate(180deg)' : undefined }} />
    </div>
  );
}

// PPTX Slide Viewer - fills container width on mobile
function PptxSlideViewer({ slides, pageNum, darkMode }: { slides: string[]; pageNum: number; darkMode: boolean }) {
  const src = slides[pageNum - 1];
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 960, h: 540 });

  useEffect(() => {
    const updateDims = () => {
      const el = containerRef.current;
      if (!el) return;
      const parentW = el.clientWidth;
      // Fill full width, maintain 16:9
      const w = parentW;
      const h = Math.round(w * (9 / 16));
      setDims({ w, h });
    };
    updateDims();
    window.addEventListener('resize', updateDims);
    const t = setTimeout(updateDims, 50);
    return () => { window.removeEventListener('resize', updateDims); clearTimeout(t); };
  }, [pageNum]);

  if (!src) return <p className="text-center opacity-50">Slide not available.</p>;

  return (
    <div ref={containerRef} className="w-full flex items-center justify-center">
      <div
        className="relative overflow-hidden rounded-xl w-full"
        style={{
          maxWidth: dims.w,
          aspectRatio: '16/9',
          boxShadow: darkMode
            ? '0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)'
            : '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <img
          src={src}
          alt={`Slide ${pageNum}`}
          className="block w-full h-full object-contain"
          style={{
            filter: darkMode ? 'invert(0.85) hue-rotate(180deg)' : undefined,
          }}
        />
      </div>
    </div>
  );
}

// Highlight color picker popup
function HighlightPicker({ onSelect, onCancel, position }: { onSelect: (c: HighlightColor) => void; onCancel: () => void; position: { x: number; y: number } }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed z-[200] rounded-xl shadow-lg border border-border p-2 flex gap-1.5 items-center"
      style={{ top: position.y, left: position.x, background: 'hsl(var(--card))' }}
    >
      {HIGHLIGHT_COLORS.map(c => (
        <button key={c.value} onClick={() => onSelect(c.value)} className="w-7 h-7 rounded-full border-2 border-transparent hover:border-foreground/30 transition-colors" style={{ background: c.bg }} title={c.label} />
      ))}
      <button onClick={onCancel} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-secondary">
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

interface Props {
  material: StudyMaterial;
  onBack: () => void;
  onPageUpdate?: (page: number) => void;
  timerOverlay?: React.ReactNode;
  notes: StudyNote[];
  onSaveNote: (note: StudyNote) => void;
  sessionId: string;
  highlights: StudyHighlight[];
  onSaveHighlight: (h: StudyHighlight) => void;
  onDeleteHighlight: (id: string) => void;
}

export default function StudyMaterialReader({ material, onBack, onPageUpdate, timerOverlay, notes, onSaveNote, sessionId, highlights, onSaveHighlight, onDeleteHighlight }: Props) {
  const [currentPage, setCurrentPage] = useState(material.currentPage || 1);
  const [darkMode, setDarkMode] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [fileData, setFileData] = useState<StudyFileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);
  const [showFooter, setShowFooter] = useState(true);
  const [showHighlightPicker, setShowHighlightPicker] = useState<{ x: number; y: number; text: string } | null>(null);
  const [showHighlightsList, setShowHighlightsList] = useState(false);
  const [landscapeMode, setLandscapeMode] = useState(false);
  const [landscapeControlsVisible, setLandscapeControlsVisible] = useState(true);
  const landscapeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readerContainerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartRef = useRef<number | null>(null);
  const pinchZoomStartRef = useRef<number>(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getStudyFile(material.id);
        if (!cancelled) setFileData(data);
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [material.id]);

  const saveCurrentNote = useCallback(() => {
    if (!noteContent.trim()) return;
    const title = noteTitle.trim() || `Notes - ${material.name} - ${new Date().toLocaleDateString()}`;
    const now = new Date().toISOString();
    const note: StudyNote = {
      id: activeNoteId || crypto.randomUUID(),
      sessionId,
      materialId: material.id,
      title,
      content: noteContent,
      createdAt: activeNoteId ? (notes.find(n => n.id === activeNoteId)?.createdAt || now) : now,
      updatedAt: now,
    };
    onSaveNote(note);
    if (!activeNoteId) setActiveNoteId(note.id);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }, [noteContent, noteTitle, activeNoteId, material, sessionId, notes, onSaveNote]);

  // Auto-save every 10 seconds
  useEffect(() => {
    if (!noteContent.trim()) return;
    const t = setInterval(saveCurrentNote, 10000);
    return () => clearInterval(t);
  }, [saveCurrentNote, noteContent]);

  const downloadNotes = () => {
    if (!noteContent.trim()) return;
    const title = noteTitle.trim() || `Notes - ${material.name}`;
    const blob = new Blob([noteContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${title}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const isPdf = material.fileType === 'pdf';
  const isPptx = material.fileType === 'pptx' || material.fileType === 'ppt';
  const textPages = !isPdf && !isPptx && fileData?.content ? paginateText(fileData.content) : null;
  const effectiveTotal = isPdf ? (material.totalPages || 1) : isPptx ? (fileData?.pptxSlides?.length || 1) : (textPages?.length || 1);

  const pageHighlights = highlights.filter(h => h.materialId === material.id && h.page === currentPage);
  const allMaterialHighlights = highlights.filter(h => h.materialId === material.id);

  const goToPage = useCallback((p: number) => {
    const clamped = Math.max(1, Math.min(p, effectiveTotal));
    setCurrentPage(clamped);
    onPageUpdate?.(clamped);
  }, [effectiveTotal, onPageUpdate]);

  // Touch swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goToPage(currentPage + 1);
      else goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToPage(currentPage + 1);
      if (e.key === 'ArrowLeft') goToPage(currentPage - 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentPage, goToPage]);

  // Handle text selection for highlighting
  const handleTextSelect = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) return;
    const text = sel.toString().trim();
    if (text.length < 2) return;
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setShowHighlightPicker({
      x: Math.min(rect.left, window.innerWidth - 220),
      y: Math.max(rect.top - 44, 8),
      text,
    });
  }, []);

  const addHighlight = (color: HighlightColor) => {
    if (!showHighlightPicker) return;
    const h: StudyHighlight = {
      id: crypto.randomUUID(),
      materialId: material.id,
      page: currentPage,
      text: showHighlightPicker.text,
      color,
      createdAt: new Date().toISOString(),
    };
    onSaveHighlight(h);
    setShowHighlightPicker(null);
    window.getSelection()?.removeAllRanges();
  };

  const bgColor = darkMode ? 'hsl(0, 0%, 8%)' : 'hsl(40, 30%, 96%)';
  const textColor = darkMode ? 'hsl(40, 20%, 85%)' : 'hsl(0, 0%, 12%)';
  const mutedColor = darkMode ? 'hsl(40, 10%, 55%)' : 'hsl(0, 0%, 40%)';
  const borderCol = darkMode ? 'hsl(0,0%,25%)' : 'hsl(0,0%,70%)';




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

  const toggleLandscape = async () => {
    if (!landscapeMode) {
      try {
        await readerContainerRef.current?.requestFullscreen?.();
        await (screen.orientation as any)?.lock?.('landscape');
      } catch {
        // Fallback to CSS rotation
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
      <PageOnboardingTooltips pageId="study-reader" />
      {/* Header - auto-hides in landscape */}
      <div className={cn(
        "flex items-center gap-1.5 px-3 py-2 border-b shrink-0 transition-all duration-300",
        landscapeMode && !landscapeControlsVisible && "opacity-0 pointer-events-none h-0 py-0 overflow-hidden border-0"
      )} style={{ borderColor: borderCol, color: textColor }}>
        <button onClick={() => { saveCurrentNote(); onBack(); }} className="p-1.5 rounded-lg hover:bg-black/10"><ArrowLeft className="w-4 h-4" /></button>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold truncate block">{material.name}</span>
          <span className="text-[10px]" style={{ color: mutedColor }}>{material.fileType.toUpperCase()} • {material.category}</span>
        </div>
        {timerOverlay}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            data-tour="reader-rotate"
            onClick={toggleLandscape}
            className={`p-1.5 rounded-lg transition-colors ${landscapeMode ? 'bg-primary/20 text-primary' : 'hover:bg-black/10'}`}
            style={!landscapeMode ? { color: mutedColor } : undefined}
            title="Auto Rotate"
          >
            <RotateIcon active={landscapeMode} size={16} />
          </button>
          <button data-tour="reader-notes" onClick={() => setShowNotes(!showNotes)} className={`p-1.5 rounded-lg transition-colors flex flex-col items-center gap-0.5 ${showNotes ? 'bg-primary/20 text-primary' : 'hover:bg-black/10'}`} style={!showNotes ? { color: mutedColor } : undefined} title="Notes">
            <StickyNote className="w-4 h-4" />
            <span className="text-[8px] font-medium leading-none">Note</span>
          </button>
        </div>
        <span className="text-[10px] font-mono shrink-0" style={{ color: mutedColor }}>{currentPage}/{effectiveTotal}</span>
      </div>

      {/* Highlight color picker */}
      <AnimatePresence>
        {showHighlightPicker && (
          <HighlightPicker
            position={{ x: showHighlightPicker.x, y: showHighlightPicker.y }}
            onSelect={addHighlight}
            onCancel={() => { setShowHighlightPicker(null); window.getSelection()?.removeAllRanges(); }}
          />
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content + optional notes split */}
        <div className={`flex-1 flex ${showNotes ? 'flex-col' : 'flex-col'} overflow-hidden`}>
          {/* Reader content */}
          <div
            ref={contentRef}
            onTouchStart={(e) => {
              if (e.touches.length === 2) {
                const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                pinchStartRef.current = dist;
                pinchZoomStartRef.current = zoom;
              } else {
                handleTouchStart(e);
              }
            }}
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
              setTimeout(handleTextSelect, 200);
            }}
            onMouseUp={handleTextSelect}
            onWheel={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                setZoom(z => Math.min(5, Math.max(0.5, Math.round((z + (e.deltaY < 0 ? 0.1 : -0.1)) * 20) / 20)));
              }
            }}
            className={cn(
              showNotes ? 'h-1/2' : 'flex-1',
              'overflow-auto px-4 py-6 relative'
            )}
            style={{ filter: `brightness(${brightness / 100})`, userSelect: 'text', touchAction: 'pan-y' }}
            onClick={toggleLandscapeControls}
          >
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', minHeight: '100%' }}>
              {loading ? (
                <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
              ) : isPdf && fileData?.pdfData ? (
                <PdfPageRenderer pdfData={fileData.pdfData} pageNum={currentPage} darkMode={darkMode} />
              ) : isPptx && fileData?.pptxSlides ? (
                <PptxSlideViewer slides={fileData.pptxSlides} pageNum={currentPage} darkMode={darkMode} />
              ) : textPages ? (
                <div className="max-w-lg mx-auto">
                  <p className="text-sm leading-7 whitespace-pre-wrap" style={{ fontFamily: "'Georgia', serif" }}>
                    <HighlightedText text={textPages[currentPage - 1] || 'No content available.'} highlights={pageHighlights} darkMode={darkMode} />
                  </p>
                </div>
              ) : (
                <div className="max-w-lg mx-auto text-center py-12 opacity-50">
                  <FileText className="w-10 h-10 mx-auto mb-3" />
                  <p className="text-sm">No readable content for this material.</p>
                </div>
              )}
            </div>

            {/* Page highlights list */}
            {pageHighlights.length > 0 && !showHighlightsList && (
              <div className="mt-4 max-w-lg mx-auto">
                <p className="text-[10px] text-center opacity-40">{pageHighlights.length} highlight{pageHighlights.length > 1 ? 's' : ''} on this page</p>
              </div>
            )}
          </div>

          {/* Notes panel */}
          <AnimatePresence>
            {showNotes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: '50%', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t flex flex-col overflow-hidden"
                style={{ borderColor: darkMode ? 'hsl(0,0%,20%)' : 'hsl(0,0%,85%)', background: bgColor }}
              >
                <div className="px-3 py-2 flex items-center gap-2 border-b shrink-0 flex-wrap" style={{ borderColor: darkMode ? 'hsl(0,0%,20%)' : 'hsl(0,0%,85%)' }}>
                  <Input
                    value={noteTitle}
                    onChange={e => setNoteTitle(e.target.value)}
                    placeholder={`Notes - ${material.name}`}
                    className="text-xs h-7 bg-transparent border flex-1 min-w-[120px]"
                    style={{ borderColor: darkMode ? 'hsl(0,0%,30%)' : 'hsl(0,0%,75%)', color: darkMode ? '#e5e5e5' : '#1a1a1a' }}
                  />
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Button size="sm" className="h-7 text-[11px] px-3 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow-sm" onClick={saveCurrentNote}>
                      💾 Save
                    </Button>
                    <button onClick={downloadNotes} className="h-7 px-2.5 rounded-md flex items-center gap-1 text-[11px] font-semibold transition-colors shrink-0" style={{ background: darkMode ? 'hsl(0,0%,20%)' : 'hsl(0,0%,88%)', color: darkMode ? '#e5e5e5' : '#1a1a1a' }} title="Download notes">
                      <Download className="w-3.5 h-3.5" />
                      <span>DL</span>
                    </button>
                  </div>
                  {noteSaved && (
                    <span className="text-[10px] text-green-500 flex items-center gap-0.5"><Check className="w-3 h-3" /> Saved</span>
                  )}
                </div>
                <Textarea
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  placeholder="Take notes while reading... (auto-saves every 10s)"
                  className="flex-1 resize-none border-0 rounded-none text-sm focus-visible:ring-0 bg-transparent text-foreground"
                  style={{ color: textColor }}
                />


              </motion.div>
            )}
          </AnimatePresence>

          {/* Highlights list panel */}
          <AnimatePresence>
            {showHighlightsList && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: showNotes ? '30%' : '40%', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t flex flex-col overflow-hidden"
                style={{ borderColor: darkMode ? 'hsl(0,0%,20%)' : 'hsl(0,0%,85%)', background: bgColor }}
              >
                <div className="px-3 py-2 flex items-center justify-between border-b shrink-0" style={{ borderColor: darkMode ? 'hsl(0,0%,20%)' : 'hsl(0,0%,85%)' }}>
                  <span className="text-xs font-semibold flex items-center gap-1"><Highlighter className="w-3 h-3" /> Highlights ({allMaterialHighlights.length})</span>
                  <button onClick={() => setShowHighlightsList(false)} className="p-1 rounded hover:bg-black/10"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
                  {allMaterialHighlights.length === 0 ? (
                    <p className="text-[10px] text-center opacity-40 py-4">Select text to highlight it with different colors</p>
                  ) : (
                    allMaterialHighlights.map(h => (
                      <div key={h.id} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: getHighlightBg(h.color) }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-relaxed" style={{ color: darkMode ? '#1a1a1a' : 'inherit' }}>"{h.text}"</p>
                          <p className="text-[9px] opacity-50 mt-0.5" style={{ color: darkMode ? '#333' : 'inherit' }}>Page {h.page} • {new Date(h.createdAt).toLocaleDateString()}</p>
                        </div>
                        <button onClick={() => { goToPage(h.page); }} className="text-[9px] px-1.5 py-0.5 rounded bg-black/10 shrink-0" style={{ color: darkMode ? '#333' : 'inherit' }}>Go</button>
                        <button onClick={() => onDeleteHighlight(h.id)} className="text-[9px] px-1.5 py-0.5 rounded bg-black/10 shrink-0 hover:bg-red-500/20" style={{ color: darkMode ? '#333' : 'inherit' }}>×</button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer controls */}
      <AnimatePresence>
        {showFooter && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t px-3 py-2 space-y-1.5 shrink-0 overflow-hidden"
            style={{ borderColor: borderCol, background: bgColor, color: textColor }}
          >
            {/* Hide controls button */}
            <div className="flex justify-end mb-1">
              <button onClick={() => setShowFooter(false)} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg hover:bg-black/10 transition-colors" style={{ color: mutedColor }}>
                <ChevronDown className="w-3 h-3" /> Hide
              </button>
            </div>
            {/* Zoom + brightness row */}
            <div className="flex items-center gap-2">
              <button onClick={() => setDarkMode(!darkMode)} className="p-1.5 rounded-lg shrink-0" style={{ background: darkMode ? 'hsl(0,0%,20%)' : 'hsl(0,0%,88%)', color: textColor }}>
                {darkMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>
              <Sun className="w-3 h-3 shrink-0" style={{ color: mutedColor }} />
              <Slider value={[brightness]} onValueChange={v => setBrightness(v[0])} min={30} max={150} step={5} className="flex-1" />
              <span className="text-[10px] font-mono w-7 text-right shrink-0" style={{ color: mutedColor }}>{brightness}%</span>
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
            {/* Page nav row */}
            <div className="flex items-center justify-between">
              <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} className="p-2 rounded-lg disabled:opacity-20 hover:bg-black/10" style={{ color: textColor }}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: mutedColor }}>Page</span>
                <input type="number" value={currentPage} onChange={e => goToPage(parseInt(e.target.value) || 1)} min={1} max={effectiveTotal} className="w-12 text-center text-sm font-mono bg-transparent border rounded px-1 py-0.5" style={{ borderColor: borderCol, color: textColor }} />
                <span className="text-xs" style={{ color: mutedColor }}>of {effectiveTotal}</span>
              </div>
              <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= effectiveTotal} className="p-2 rounded-lg disabled:opacity-20 hover:bg-black/10" style={{ color: textColor }}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed footer toggle - shows when footer is hidden */}
      {!showFooter && (
        <button
          onClick={() => setShowFooter(true)}
          className="flex items-center justify-center gap-1.5 py-1.5 px-4 border-t shrink-0 w-full hover:bg-black/5 transition-colors"
          style={{ borderColor: borderCol, background: bgColor, color: mutedColor }}
        >
          <ChevronUp className="w-3.5 h-3.5" />
          <span className="text-[10px] font-medium">Show Controls</span>
        </button>
      )}

      {/* AI Summarizer in reader */}
      <div data-tour="reader-ai" className="contents">
        <AISummarizer
          documentId={material.id}
          documentName={material.name}
          getPageText={makeStudyPageTextFn(material.id, material.fileType)}
          totalPages={effectiveTotal}
          isInReader
          landscapeMode={landscapeMode}
        />
      </div>

      {/* Study Buddy chatbot */}
      <div data-tour="study-buddy-fab" className="contents">
        <KiraStudyBuddy
          landscapeMode={landscapeMode}
          materialName={material.name}
          materialContext={
            textPages ? (textPages[currentPage - 1] || '') :
              isPptx && fileData?.pptxSlides ? `Slide ${currentPage} of ${fileData.pptxSlides.length}` :
                isPdf ? `PDF page ${currentPage} of ${material.totalPages || '?'}` : ''
          }
        />
      </div>
    </motion.div>
  );
}
