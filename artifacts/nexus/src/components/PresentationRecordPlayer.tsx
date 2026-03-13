/**
 * PresentationRecordPlayer
 * Split-screen presenter view for the Presentation Maker module.
 * • Top half  — live slide display (keyboard/swipe nav)
 * • Bottom half — teleprompter (speaker notes / all-slide script, auto-scroll)
 * • Header — recording controls: mic button, live timer, stop, save
 * • Timing tab — custom per-slide duration editor (alternative to recording)
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Mic, MicOff, Square, ChevronLeft, ChevronRight,
  ScrollText, Clock, Check, Save, Trash2, RotateCcw, Play,
  AlignLeft, Zap, AlertCircle, Loader2, X,
} from 'lucide-react';
import type { Presentation } from '@/types/presentation';
import { getTheme } from '@/lib/presentationThemes';
import { renderTextWithBreaks } from '@/lib/presentationRenderer';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';
import { getTextAreaWidth } from '@/lib/slideEngine';
import { savePresentation } from '@/lib/presentationStorage';
import { savePresentationAudio, getPresentationAudio, deletePresentationAudio } from '@/lib/presentationAudioStorage';
import { toast } from 'sonner';

const fmtTime = (s: number) => {
  const m = Math.floor(Math.abs(s) / 60);
  const sec = Math.floor(Math.abs(s) % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const fmtMs = (ms: number) => fmtTime(ms / 1000);

interface Props {
  presentation: Presentation;
  onClose: () => void;
  onSaved?: (updated: Presentation) => void;
}

type Tab = 'teleprompter' | 'timing';

export default function PresentationRecordPlayer({ presentation, onClose, onSaved }: Props) {
  const slides = presentation.slides;
  const theme = getTheme(presentation.themeId);

  // ── Slide navigation ─────────────────────────────────────────────────────
  const [slideIdx, setSlideIdx] = useState(0);
  const currentSlide = slides[slideIdx];

  // ── Slide scale for 800×450 canvas ───────────────────────────────────────
  const [slideScale, setSlideScale] = useState(1);
  const slideContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const update = () => {
      const el = slideContainerRef.current;
      if (!el) return;
      const w = el.clientWidth - 16;
      const h = el.clientHeight - 16;
      setSlideScale(Math.min(w / 800, h / 450, 1.2));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ── Recording state ──────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [isSaving, setIsSaving] = useState(false);
  const [hasExistingRecording, setHasExistingRecording] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordStartRef = useRef<number>(0);
  const slideStartTimesRef = useRef<number[]>([]); // ms from recording start for each slide
  const pendingBlobRef = useRef<Blob | null>(null);
  const pendingTimingsRef = useRef<number[]>([]);
  const micMimeRef = useRef<string>('audio/webm');

  useEffect(() => {
    // Check if a recording already exists for this presentation
    getPresentationAudio(presentation.id).then(b => setHasExistingRecording(!!b)).catch(() => {});
  }, [presentation.id]);

  // ── Custom per-slide timings (seconds each) ──────────────────────────────
  const initTimings = () =>
    (presentation.slideTimings && presentation.slideTimings.length === slides.length)
      ? presentation.slideTimings.map(ms => ms / 1000)
      : slides.map(() => 30);

  const [customTimings, setCustomTimings] = useState<number[]>(initTimings);

  // ── Active tab ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('teleprompter');

  // ── Teleprompter auto-scroll ──────────────────────────────────────────────
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1.5); // px/frame
  const teleRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noteRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (autoScroll && teleRef.current) {
      autoScrollRef.current = setInterval(() => {
        if (teleRef.current) teleRef.current.scrollTop += scrollSpeed;
      }, 30);
    } else {
      if (autoScrollRef.current) { clearInterval(autoScrollRef.current); autoScrollRef.current = null; }
    }
    return () => { if (autoScrollRef.current) clearInterval(autoScrollRef.current); };
  }, [autoScroll, scrollSpeed]);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goToPrev();
      else if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goToNext(); }
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }); // no deps — uses latest slideIdx via closure in goToNext/Prev

  // ── Slide change helpers that also capture recording timestamps ───────────
  const recordSlideChange = useCallback((newIdx: number) => {
    if (isRecording) {
      const elapsed = Date.now() - recordStartRef.current;
      slideStartTimesRef.current[newIdx] = elapsed;
    }
    setSlideIdx(newIdx);
    // Scroll teleprompter to current slide notes
    setTimeout(() => {
      noteRefs.current[newIdx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, [isRecording]);

  const goToNext = useCallback(() => {
    if (slideIdx < slides.length - 1) recordSlideChange(slideIdx + 1);
  }, [slideIdx, slides.length, recordSlideChange]);

  const goToPrev = useCallback(() => {
    if (slideIdx > 0) recordSlideChange(slideIdx - 1);
  }, [slideIdx, recordSlideChange]);

  // ── Touch swipe ──────────────────────────────────────────────────────────
  const touchX = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.targetTouches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = touchX.current - e.changedTouches[0].clientX;
    if (dx > 50) goToNext();
    else if (dx < -50) goToPrev();
  };

  // ── Recording controls ───────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';
      micMimeRef.current = mime.split(';')[0]; // e.g. 'audio/webm'

      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorderRef.current = mr;

      recordStartRef.current = Date.now();
      slideStartTimesRef.current = new Array(slides.length).fill(-1);
      slideStartTimesRef.current[slideIdx] = 0;

      mr.start(200);
      setIsRecording(true);
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - recordStartRef.current) / 1000));
      }, 500);
    } catch {
      toast.error('Microphone access denied. Please allow microphone permission.');
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const totalMs = Date.now() - recordStartRef.current;
    const starts = slideStartTimesRef.current;

    // Compute raw per-slide durations based on captured timestamps
    const rawTimings: number[] = slides.map((_, i) => {
      if (starts[i] < 0) return 0; // slide was never visited → will be distributed proportionally
      // Find the start time of the next VISITED slide (in slide order)
      const nextVisitedStart = starts.slice(i + 1).find(t => t >= 0);
      return nextVisitedStart !== undefined ? nextVisitedStart - starts[i] : totalMs - starts[i];
    });

    // Give unvisited slides an equal share of any remaining time
    const visitedCount = rawTimings.filter(t => t > 0).length;
    const visitedTotal = rawTimings.reduce((a, b) => a + b, 0);
    const unvisitedShare = visitedCount < slides.length && visitedTotal < totalMs
      ? (totalMs - visitedTotal) / (slides.length - visitedCount)
      : Math.max(1000, totalMs / slides.length); // fallback if all visited but sum differs

    const withDefaults = rawTimings.map(t => t > 0 ? t : unvisitedShare);

    // Normalize so the sum equals totalMs exactly (ensures 1:1 sync with the audio blob)
    const sum = withDefaults.reduce((a, b) => a + b, 0);
    const timings = sum > 0
      ? withDefaults.map(t => Math.round(t * totalMs / sum))
      : slides.map(() => Math.round(totalMs / slides.length));

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: micMimeRef.current });
      pendingBlobRef.current = blob;
      pendingTimingsRef.current = timings;
      setShowSavePrompt(true);
    };
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    setIsRecording(false);
  };

  const saveRecording = async () => {
    if (!pendingBlobRef.current) return;
    setIsSaving(true);
    try {
      await savePresentationAudio(presentation.id, pendingBlobRef.current);
      const updated: Presentation = {
        ...presentation,
        slideTimings: pendingTimingsRef.current,
        recordedAudioMime: micMimeRef.current,
        recordedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      savePresentation(updated);
      setHasExistingRecording(true);
      setShowSavePrompt(false);
      pendingBlobRef.current = null;
      onSaved?.(updated);
      toast.success('Narration saved! You can now use it when generating video.');
    } catch {
      toast.error('Could not save narration. Storage may be full.');
    } finally {
      setIsSaving(false);
    }
  };

  const discardRecording = () => {
    pendingBlobRef.current = null;
    setShowSavePrompt(false);
    setElapsed(0);
  };

  const deleteRecording = async () => {
    await deletePresentationAudio(presentation.id);
    const updated: Presentation = {
      ...presentation,
      slideTimings: undefined,
      recordedAudioMime: undefined,
      recordedAt: undefined,
      updatedAt: new Date().toISOString(),
    };
    savePresentation(updated);
    setHasExistingRecording(false);
    onSaved?.(updated);
    toast.success('Recording deleted.');
  };

  const saveCustomTimings = () => {
    const timingsMs = customTimings.map(s => Math.max(1, s) * 1000);
    const updated: Presentation = {
      ...presentation,
      slideTimings: timingsMs,
      updatedAt: new Date().toISOString(),
    };
    savePresentation(updated);
    onSaved?.(updated);
    toast.success('Slide timings saved.');
  };

  // ── Slide rendering (mirrors PresentationViewer) ─────────────────────────
  const ts = currentSlide?.textStyle || {};
  const titleStyle: React.CSSProperties = {
    color: ts.titleColor || `#${theme.titleColor}`,
    fontWeight: (ts.titleBold === 'bold' || !ts.titleBold) ? 'bold' : 'normal',
    fontStyle: ts.titleItalic === 'italic' ? 'italic' : 'normal',
    textAlign: (ts.titleAlign as any) || 'left',
    fontFamily: ts.titleFontFamily || theme.titleFont,
    fontSize: ts.titleFontSize ? `${Math.min(ts.titleFontSize * 0.45, 18) * 1.5}px` : '24px',
    marginBottom: '10px',
  };
  const bodyStyle: React.CSSProperties = {
    color: ts.bodyColor || `#${theme.bodyColor}`,
    fontWeight: ts.bodyBold === 'bold' ? 'bold' : 'normal',
    fontStyle: ts.bodyItalic === 'italic' ? 'italic' : 'normal',
    textAlign: (ts.bodyAlign as any) || 'left',
    fontFamily: ts.bodyFontFamily || theme.bodyFont,
    fontSize: ts.bodyFontSize ? `${ts.bodyFontSize * 1.2}px` : '18px',
  };
  const bulletStyle: React.CSSProperties = {
    ...bodyStyle,
    color: ts.bulletColor || ts.bodyColor || `#${theme.bodyColor}`,
    fontSize: ts.bulletFontSize ? `${ts.bulletFontSize * 1.2}px` : '18px',
  };
  const accentColor = ts.accentColor || `#${theme.accentColor}`;
  const textWidthPct = currentSlide ? getTextAreaWidth(currentSlide.layout, currentSlide.images || []) : 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex flex-col bg-black overflow-hidden"
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div data-tour="record-header" className="flex items-center gap-2 px-3 py-2 bg-black/90 border-b border-white/10 z-20 shrink-0">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">{presentation.settings.title}</p>
          <p className="text-[10px] text-white/50">
            Slide {slideIdx + 1}/{slides.length}
            {hasExistingRecording && <span className="ml-2 text-emerald-400">• Narration saved</span>}
          </p>
        </div>

        {/* Recording timer */}
        {isRecording && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/20 border border-red-500/30">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono text-red-400">{fmtTime(elapsed)}</span>
          </div>
        )}

        {/* Mic / Stop button */}
        {!isRecording ? (
          <button
            data-tour="record-btn"
            onClick={startRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-medium"
          >
            <Mic className="w-3.5 h-3.5" />
            {hasExistingRecording ? 'Re-record' : 'Record'}
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors text-xs font-medium"
          >
            <Square className="w-3 h-3 fill-current" />
            Stop
          </button>
        )}
      </div>

      {/* ── Slide display (top 55%) ──────────────────────────────────────────── */}
      <div
        ref={slideContainerRef}
        className="flex items-center justify-center bg-black shrink-0"
        style={{ height: '52%' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {currentSlide ? (
          <div
            className="relative overflow-hidden"
            style={{
              width: '800px',
              height: '450px',
              transform: `scale(${slideScale})`,
              transformOrigin: 'center center',
              backgroundColor: `#${theme.bgColor}`,
            }}
          >
            <div className="p-8 w-full h-full relative" style={{ boxSizing: 'border-box' }}>
              <div className="relative z-[1]"
                style={{ maxWidth: textWidthPct < 100 ? `${textWidthPct}%` : undefined, height: '100%' }}>
                <p style={titleStyle}>{renderTextWithBreaks(currentSlide.title)}</p>
                {currentSlide.subtitle && (
                  <p className="opacity-70 mb-4" style={{ ...bodyStyle, fontSize: '16px' }}>
                    {renderTextWithBreaks(currentSlide.subtitle)}
                  </p>
                )}
                {currentSlide.bullets && currentSlide.bullets.length > 0 && (
                  <ul className="space-y-2 mt-4">
                    {currentSlide.bullets.map((b, i) => (
                      <li key={i} className="opacity-90 flex items-start gap-2" style={bulletStyle}>
                        <span className="mt-1">&#8226;</span>
                        <span>{renderTextWithBreaks(b)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {currentSlide.body && (
                  <p className="mt-3 opacity-85 leading-relaxed" style={bodyStyle}>
                    {renderTextWithBreaks(currentSlide.body)}
                  </p>
                )}
                {currentSlide.statement && (
                  <p className="mt-8 opacity-90" style={{ ...titleStyle, fontSize: '32px', lineHeight: '1.4' }}>
                    {renderTextWithBreaks(currentSlide.statement)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-white/40 text-xs">No slides</p>
        )}

        {/* Side nav arrows */}
        <button
          data-tour="record-slide-nav"
          onClick={goToPrev}
          disabled={slideIdx === 0}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center disabled:opacity-20 transition-all z-10"
          style={{ top: '26%' }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={goToNext}
          disabled={slideIdx === slides.length - 1}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center disabled:opacity-20 transition-all z-10"
          style={{ top: '26%' }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Bottom panel (teleprompter / timing tabs) ─────────────────────── */}
      <div className="flex-1 flex flex-col border-t border-white/10 min-h-0 bg-[#0a0a0f]">
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-3 pt-2 pb-1 shrink-0">
          <button
            data-tour="record-teleprompter-tab"
            onClick={() => setActiveTab('teleprompter')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${activeTab === 'teleprompter' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-white/40 hover:text-white/70'}`}
          >
            <ScrollText className="w-3 h-3" /> Teleprompter
          </button>
          <button
            data-tour="record-timing-tab"
            onClick={() => setActiveTab('timing')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${activeTab === 'timing' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-white/40 hover:text-white/70'}`}
          >
            <Clock className="w-3 h-3" /> Slide Timing
          </button>

          {/* Auto-scroll controls (teleprompter tab only) */}
          {activeTab === 'teleprompter' && (
            <div data-tour="record-autoscroll" className="ml-auto flex items-center gap-2">
              {autoScroll && (
                <input
                  type="range" min={0.5} max={4} step={0.25}
                  value={scrollSpeed}
                  onChange={e => setScrollSpeed(Number(e.target.value))}
                  className="w-14 h-1 accent-violet-500"
                  title="Scroll speed"
                />
              )}
              <button
                onClick={() => setAutoScroll(a => !a)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors border ${autoScroll ? 'bg-violet-500/20 text-violet-300 border-violet-500/30' : 'text-white/40 border-white/10 hover:text-white/70'}`}
              >
                <Zap className="w-3 h-3" /> Auto
              </button>
            </div>
          )}

          {/* Save timing button (timing tab) */}
          {activeTab === 'timing' && (
            <button
              onClick={saveCustomTimings}
              className="ml-auto flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 transition-colors"
            >
              <Save className="w-3 h-3" /> Save
            </button>
          )}
        </div>

        {/* ── Teleprompter content ─────────────────────────────────────────── */}
        {activeTab === 'teleprompter' && (
          <div ref={teleRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-4 text-white/80">
            {slides.map((slide, i) => (
              <div
                key={slide.id}
                ref={el => { noteRefs.current[i] = el; }}
                className={`rounded-xl p-3 border transition-all ${i === slideIdx ? 'bg-violet-500/15 border-violet-500/40' : 'bg-white/[0.03] border-white/5'}`}
              >
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${i === slideIdx ? 'text-violet-400' : 'text-white/30'}`}>
                  Slide {i + 1}: {slide.title}
                </p>
                <p className="text-sm leading-relaxed text-white/75">
                  {slide.speakerNotes
                    ? slide.speakerNotes
                    : slide.body
                    ? slide.body
                    : slide.bullets && slide.bullets.length > 0
                    ? slide.bullets.join(' ')
                    : <em className="text-white/30 text-xs">No speaker notes for this slide.</em>}
                </p>
              </div>
            ))}
            <div className="h-8" />
          </div>
        )}

        {/* ── Custom timing content ───────────────────────────────────────── */}
        {activeTab === 'timing' && (
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            <p className="text-[10px] text-white/40 px-1 mb-2">
              Set how many seconds each slide appears in the generated video (max 600s = 10 min per slide).
            </p>
            {slides.map((slide, i) => (
              <div key={slide.id} className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
                <span className="text-[10px] text-white/40 w-4 shrink-0">{i + 1}</span>
                <p className="flex-1 text-xs text-white/70 truncate">{slide.title || `Slide ${i + 1}`}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={600}
                    value={customTimings[i]}
                    onChange={e => {
                      const v = Math.min(600, Math.max(1, Number(e.target.value) || 1));
                      setCustomTimings(prev => { const n = [...prev]; n[i] = v; return n; });
                    }}
                    className="w-14 text-xs text-center bg-white/5 border border-white/15 rounded-lg px-1.5 py-1 text-white focus:outline-none focus:border-violet-500/50"
                  />
                  <span className="text-[10px] text-white/40">sec</span>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 px-1 pt-1">
              <p className="text-[10px] text-white/40">
                Total: {fmtTime(customTimings.reduce((a, b) => a + b, 0))}
              </p>
              <button
                onClick={() => setCustomTimings(slides.map(() => 30))}
                className="text-[10px] text-white/40 hover:text-white/70 underline transition-colors"
              >
                Reset all to 30s
              </button>
            </div>
            {hasExistingRecording && (
              <button
                onClick={deleteRecording}
                className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Delete saved narration recording
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Save recording prompt ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSavePrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-end justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              className="w-full max-w-lg bg-[#13131f] border border-white/10 rounded-t-3xl p-5 space-y-4"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Mic className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Recording complete</h3>
                  <p className="text-[10px] text-white/50">Duration: {fmtTime(elapsed)}</p>
                </div>
              </div>

              <div className="space-y-1 text-xs text-white/60">
                <p>Slide timings captured:</p>
                <div className="space-y-0.5 max-h-32 overflow-y-auto">
                  {pendingTimingsRef.current.map((ms, i) => (
                    <div key={i} className="flex justify-between px-2 py-0.5 bg-white/5 rounded">
                      <span className="truncate flex-1">Slide {i + 1}: {slides[i]?.title || ''}</span>
                      <span className="text-white/40 ml-2 font-mono">{fmtMs(ms)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={discardRecording}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs text-white/50 hover:border-white/20 transition-all"
                >
                  Discard
                </button>
                <button
                  onClick={saveRecording}
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Narration
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* First-visit spotlight tutorial for the record player */}
      <PageOnboardingTooltips pageId="pres-record-player" />
    </motion.div>
  );
}
