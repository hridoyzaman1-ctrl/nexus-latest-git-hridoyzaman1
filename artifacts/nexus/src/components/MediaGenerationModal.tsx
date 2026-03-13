import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Headphones, Video, FileText, Mic, Play, Square, Pause, RotateCcw,
  Download, X, Sparkles, ChevronDown, ChevronUp, Settings2, Library,
  Loader2, BookOpen, CheckCircle2, AlertCircle, Clock, Music2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getLimits, buildScriptForMode, sanitiseAIScript, estimateSpeechSeconds, countWords, truncateToWordLimit,
  TTSController, getAvailableVoices, getDefaultVoice, isVideoSupported,
  recordVideoScenes, renderSceneToCanvas,
  type MediaMode, type SourceModule,
} from '@/lib/contentMediaEngine';
import { BGM_TRACKS } from '@/lib/bgmEngine';
import { chatWithStudioAI } from '@/lib/longcat';
import {
  saveMediaItem, saveVideoBlob, getVideoBlob, getMediaItem,
  type GeneratedMediaItem, type VideoScene,
} from '@/lib/mediaStorage';
import { useNavigate } from 'react-router-dom';

interface MediaGenerationModalProps {
  open: boolean;
  onClose: () => void;
  sourceModule: SourceModule;
  sourceId: string;
  sourceName: string;
  /** Returns raw text for the given page range. For non-paginated sources, params are ignored. */
  getSourceText: (fromPage: number, toPage: number) => Promise<string>;
  /** Pass > 0 to show page range picker (books / study). Default 0 = no pagination. */
  totalPages?: number;
  /** Starting mode. Defaults to 'summary'. */
  initialMode?: MediaMode;
  /** Script/TTS language: 'en' (default) or 'bn' (Bangla). */
  language?: string;
  /** Pre-generated AI script — skips extraction + generation, goes straight to recording/done. */
  preGeneratedScript?: string;
  /** Pre-selected BGM track id (from parent video creator). Defaults to 'none'. */
  initialBgmId?: string;
}

const MODE_INFO: Record<MediaMode, { label: string; desc: string; icon: typeof Headphones; color: string }> = {
  summary:  { label: 'Summary',   desc: 'Concise key-point overview',    icon: FileText,  color: 'hsl(199,89%,48%)' },
  explainer:{ label: 'Explainer', desc: 'Structured concept walkthrough', icon: BookOpen,  color: 'hsl(245,58%,62%)' },
  podcast:  { label: 'Podcast',   desc: 'Conversational deep-dive',      icon: Mic,       color: 'hsl(340,82%,52%)' },
  video:    { label: 'Video',     desc: 'Scene-by-scene visual slides',   icon: Video,     color: 'hsl(291,64%,42%)' },
};

type GenStage = 'idle' | 'extracting' | 'generating' | 'recording' | 'done' | 'error';

export default function MediaGenerationModal({
  open, onClose, sourceModule, sourceId, sourceName,
  getSourceText, totalPages = 0, initialMode = 'summary', language = 'en',
  preGeneratedScript, initialBgmId = 'none',
}: MediaGenerationModalProps) {
  const navigate = useNavigate();

  const [mode, setMode] = useState<MediaMode>(initialMode);
  const [selectedBgm, setSelectedBgm] = useState<string>(initialBgmId);
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(() => totalPages > 0 ? Math.min(totalPages, 20) : 1);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState('');
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);

  const [stage, setStage] = useState<GenStage>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');

  const [script, setScript] = useState('');
  const [scenes, setScenes] = useState<VideoScene[]>([]);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  const [hasVideoBlob, setHasVideoBlob] = useState(false);

  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ttsChunk, setTtsChunk] = useState(0);
  const [ttsTotalChunks, setTtsTotalChunks] = useState(0);
  const ttsRef = useRef<TTSController | null>(null);

  // Estimated recording time (set once scenes are built — video mode only)
  const [estimatedRecordingSecs, setEstimatedRecordingSecs] = useState(0);

  // Single recording canvas — always in DOM, shown/hidden by stage
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Preview canvas for done-state scene browsing
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const cancelSignal = useRef({ cancelled: false });
  const [currentScene, setCurrentScene] = useState(0);

  // Studio tip banner — dismissed once via close button or swipe
  const TIP_KEY = 'mindflow_studio_gen_tip_dismissed';
  const isStudioModule = sourceModule === 'audio-studio' || sourceModule === 'video-studio';
  const [showTip, setShowTip] = useState(() =>
    isStudioModule && localStorage.getItem(TIP_KEY) !== '1'
  );
  const tipTouchStart = useRef<number | null>(null);
  const dismissTip = useCallback(() => {
    localStorage.setItem(TIP_KEY, '1');
    setShowTip(false);
  }, []);

  // Load voices on open
  useEffect(() => {
    if (!open) return;
    const loadVoices = () => {
      const v = getAvailableVoices();
      if (v.length > 0) {
        setVoices(v);
        if (!selectedVoiceUri) {
          const langCode = language === 'bn' ? 'bn' : 'en';
          const def = getDefaultVoice(langCode) ?? getDefaultVoice('en');
          if (def) setSelectedVoiceUri(def.voiceURI);
        }
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-cap page range when mode or totalPages changes
  useEffect(() => {
    if (totalPages > 0) {
      const maxPg = getLimits(sourceModule, mode).maxPages;
      setFromPage(1);
      setToPage(Math.min(totalPages, maxPg));
    }
  }, [mode, totalPages, sourceModule]);

  // Keyboard close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-draw preview canvas when currentScene changes (done + video mode)
  useEffect(() => {
    if (stage === 'done' && scenes.length > 0 && previewCanvasRef.current) {
      const scene = scenes[currentScene] ?? scenes[0];
      previewCanvasRef.current.width = 480;
      previewCanvasRef.current.height = 270;
      renderSceneToCanvas(previewCanvasRef.current, scene);
    }
  }, [stage, currentScene, scenes]);

  const isBusy = stage === 'extracting' || stage === 'generating' || stage === 'recording';

  const resetState = useCallback(() => {
    ttsRef.current?.stop();
    cancelSignal.current = { cancelled: true };
    setStage('idle');
    setScript('');
    setScenes([]);
    setSavedItemId(null);
    setHasVideoBlob(false);
    setPlaying(false);
    setPaused(false);
    setTtsChunk(0);
    setTtsTotalChunks(0);
    setCurrentScene(0);
    setProgress(0);
    setProgressLabel('');
    setErrorMsg('');
    setEstimatedRecordingSecs(0);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceUri) ?? null;

  // Auto-start when pre-generated script is provided
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (open && preGeneratedScript && !autoStartedRef.current && stage === 'idle') {
      autoStartedRef.current = true;
      setTimeout(() => handleGenerate(), 80);
    }
    if (!open) autoStartedRef.current = false;
  }, [open, preGeneratedScript, stage]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = useCallback(async () => {
    // Reset generation state, create fresh cancel signal
    cancelSignal.current = { cancelled: false };
    ttsRef.current?.stop();
    setPlaying(false);
    setPaused(false);
    setTtsChunk(0);
    setTtsTotalChunks(0);
    setStage('extracting');
    setProgress(10);
    setProgressLabel('Extracting content…');
    setScript('');
    setScenes([]);
    setSavedItemId(null);
    setHasVideoBlob(false);
    setErrorMsg('');

    try {
      const limits = getLimits(sourceModule, mode);

      let generatedScript = '';
      let generatedScenes: VideoScene[] | undefined;

      // ── Fast path: pre-generated script from studio ──────────────────────
      if (preGeneratedScript) {
        setStage('generating');
        setProgress(55);
        setProgressLabel('Using your pre-generated script…');
        await new Promise(r => setTimeout(r, 60));
        if (cancelSignal.current.cancelled) return;

        generatedScript = preGeneratedScript;

        // For video mode, build visual scenes from source text
        if (mode === 'video') {
          setProgressLabel('Building video scenes…');
          const rawText = await getSourceText(1, 1);
          const truncated = truncateToWordLimit(rawText || generatedScript, limits.maxWords);
          const { scenes: localScenes } = buildScriptForMode(truncated, sourceName, mode, language);
          generatedScenes = localScenes;
          setProgress(72);
        } else {
          setProgress(80);
        }
      } else {
        // ── Normal path: extract + generate ───────────────────────────────
        setStage('extracting');
        setProgress(10);
        setProgressLabel('Extracting content…');

        let rawText = '';
        if (totalPages > 0) {
          const effectiveTo = Math.min(toPage, fromPage + limits.maxPages - 1);
          rawText = await getSourceText(fromPage, effectiveTo);
        } else {
          rawText = await getSourceText(1, 1);
        }

        if (cancelSignal.current.cancelled) return;

        if (!rawText || rawText.trim().length < 20) {
          throw new Error('Not enough content found. Try selecting more pages or adding more content.');
        }

        const truncated = truncateToWordLimit(rawText, limits.maxWords);
        const words = countWords(truncated);

        setStage('generating');
        setProgress(35);
        setProgressLabel(`Preparing ${mode} script…`);

        await new Promise(r => setTimeout(r, 0));
        if (cancelSignal.current.cancelled) return;

        if (isStudioModule) {
          const modePrompts: Record<MediaMode, string> = {
            summary:  'Write a concise spoken summary covering all key points. 2-3 minutes when read aloud.',
            explainer:'Write a clear spoken explainer walking through the main concepts. 4-5 minutes when read aloud.',
            podcast:  'Write an engaging conversational podcast episode about this content. Sound natural and enthusiastic. 6-8 minutes when read aloud.',
            video:    'Write flowing spoken narration for a video presentation covering the main ideas. 3-4 minutes when read aloud.',
          };
          const langInstruction = language === 'bn'
            ? '\nIMPORTANT: Write ENTIRELY in Bangla (বাংলা). Every single word must be in Bangla script.'
            : '';
          const prompt = `You are a professional audio script writer.\n\nSTRICT RULES:\n- Write ONLY the exact words that will be spoken aloud\n- Do NOT include any titles, file names, document names, or subject headings\n- Do NOT write "Here is your script", "Script:", or any preamble whatsoever\n- Do NOT use markdown, asterisks, bullet symbols, or any formatting characters\n- Do NOT include stage directions like [music], [pause], or [applause]\n- Start immediately with the spoken content — no introduction about what you are about to write\n- ${modePrompts[mode]}${langInstruction}\n\nCONTENT TO PROCESS:\n${truncated}`;

          try {
            setProgress(45);
            setProgressLabel('AI is reading and scripting your content…');
            const aiRaw = await chatWithStudioAI(
              [{ role: 'user', content: prompt }],
              { maxTokens: 2000 }
            );
            if (cancelSignal.current.cancelled) return;
            generatedScript = sanitiseAIScript(aiRaw);
            setProgress(72);
            setProgressLabel('AI script ready — finalising…');
          } catch {
            setProgressLabel('Building script locally…');
            const result = buildScriptForMode(truncated, sourceName, mode, language);
            generatedScript = result.script;
            generatedScenes = result.scenes;
          }
          if (mode === 'video') {
            const { scenes: localScenes } = buildScriptForMode(truncated, sourceName, mode, language);
            generatedScenes = localScenes;
          }
        } else {
          setProgressLabel(`Building ${mode} script (${words.toLocaleString()} words)…`);
          setProgress(40);
          await new Promise(r => setTimeout(r, 0));
          if (cancelSignal.current.cancelled) return;
          const result = buildScriptForMode(truncated, sourceName, mode, language);
          generatedScript = result.script;
          generatedScenes = result.scenes;
        }
      }

      if (!generatedScript || generatedScript.trim().length < 20) {
        throw new Error('Could not generate a script. Please try a different page range or mode.');
      }

      setScript(generatedScript);
      if (generatedScenes) {
        setScenes(generatedScenes);
        // Compute real recording estimate from actual scene durations
        const totalSecs = generatedScenes.reduce((sum, s) => sum + s.duration, 0) + 3;
        setEstimatedRecordingSecs(totalSecs);
      }

      const estSecs = estimateSpeechSeconds(generatedScript);
      const id = `media_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const item: GeneratedMediaItem = {
        id,
        title: `${MODE_INFO[mode].label}: ${sourceName}`,
        sourceModule,
        sourceId,
        sourceName,
        mode,
        script: generatedScript,
        language: selectedVoice?.lang ?? 'en-US',
        voiceName: selectedVoice?.name ?? '',
        voiceRate: rate,
        voicePitch: pitch,
        scenes: generatedScenes,
        estimatedDuration: estSecs,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        wordCount: countWords(generatedScript),
        hasVideoBlob: false,
      };

      // Video recording
      if (mode === 'video' && generatedScenes && generatedScenes.length > 0 && isVideoSupported()) {
        setStage('recording');
        setProgress(60);
        setProgressLabel('Recording video scenes…');
        await new Promise(r => setTimeout(r, 50)); // let React commit stage=recording so canvas appears

        const canvas = canvasRef.current;
        if (canvas && !cancelSignal.current.cancelled) {
          canvas.width = 480;
          canvas.height = 270;
          try {
            const result = await recordVideoScenes(
              canvas,
              generatedScenes,
              (sceneIdx, total) => {
                setCurrentScene(sceneIdx);
                setProgress(60 + Math.round((sceneIdx / total) * 35));
                setProgressLabel(`Recording scene ${sceneIdx + 1} of ${total}…`);
              },
              cancelSignal.current,
              selectedBgm,
            );
            if (!cancelSignal.current.cancelled) {
              await saveVideoBlob(id, result.blob);
              item.hasVideoBlob = true;
              item.videoMimeType = result.mimeType;
              setHasVideoBlob(true);
            }
          } catch (e) {
            // Video failed — still save as audio
            console.warn('Video recording failed, saving as audio-only:', e);
          }
        }
      }

      if (cancelSignal.current.cancelled) return;

      saveMediaItem(item);
      setSavedItemId(id);
      setCurrentScene(0);
      setStage('done');
      setProgress(100);
      setProgressLabel('Ready!');
      toast.success(`${MODE_INFO[mode].label} generated & saved to Media Library`);

    } catch (e: unknown) {
      if (cancelSignal.current.cancelled) return;
      const msg = e instanceof Error ? e.message : 'Generation failed. Please try again.';
      setErrorMsg(msg);
      setStage('error');
    }
  }, [sourceModule, mode, totalPages, fromPage, toPage, getSourceText, sourceName, sourceId, selectedVoice, rate, pitch, language, isStudioModule, preGeneratedScript]);

  // TTS controls
  const handlePlay = useCallback(() => {
    if (!script) return;
    if (paused && ttsRef.current) {
      ttsRef.current.resume();
      setPlaying(true);
      setPaused(false);
      return;
    }
    ttsRef.current?.stop();
    const ctrl = new TTSController({
      voice: selectedVoice,
      rate,
      pitch,
      lang: selectedVoice?.lang ?? 'en-US',
      onChunkStart: (idx, total) => {
        setTtsChunk(idx + 1);
        setTtsTotalChunks(total);
        // Sync video scene to narration position
        if (mode === 'video' && scenes.length > 0) {
          const ratio = total > 1 ? idx / (total - 1) : 0;
          const sceneIdx = Math.min(Math.floor(ratio * scenes.length), scenes.length - 1);
          setCurrentScene(sceneIdx);
        }
      },
      onEnd: () => {
        setPlaying(false);
        setPaused(false);
        setTtsChunk(0);
        setTtsTotalChunks(0);
        if (mode === 'video' && scenes.length > 0) setCurrentScene(scenes.length - 1);
      },
      onError: (msg) => { toast.error(msg); setPlaying(false); },
    });
    ttsRef.current = ctrl;
    ctrl.start(script);
    setPlaying(true);
    setPaused(false);
  }, [script, paused, selectedVoice, rate, pitch, mode, scenes]);

  const handlePause = useCallback(() => {
    ttsRef.current?.pause();
    setPaused(true);
    setPlaying(false);
  }, []);

  const handleStop = useCallback(() => {
    ttsRef.current?.stop();
    setPlaying(false);
    setPaused(false);
    setTtsChunk(0);
    setTtsTotalChunks(0);
  }, []);

  const handleDownloadScript = useCallback(() => {
    if (!script) return;
    const blob = new Blob([`${MODE_INFO[mode].label}: ${sourceName}\n${'='.repeat(60)}\n\n${script}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sourceName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}_${mode}_script.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [script, mode, sourceName]);

  const handleDownloadVideo = useCallback(async () => {
    if (!savedItemId) return;
    const meta = getMediaItem(savedItemId);
    const blob = await getVideoBlob(savedItemId, meta?.videoMimeType ?? 'video/webm');
    if (!blob) { toast.error('Video file not found in storage'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = (meta?.videoMimeType ?? 'video/webm').includes('mp4') ? 'mp4' : 'webm';
    a.download = `${sourceName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}_video.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [savedItemId, sourceName]);

  const limits = getLimits(sourceModule, mode);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60]"
            onClick={isBusy ? undefined : handleClose}
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 34 }}
            className="fixed bottom-0 left-0 right-0 z-[60] bg-background border-t border-border rounded-t-3xl max-h-[92vh] overflow-y-auto"
          >
            {/* Recording canvas — always in DOM so captureStream works */}
            <canvas
              ref={canvasRef}
              width={480} height={270}
              style={{ display: stage === 'recording' ? 'block' : 'none' }}
              className="w-full rounded-xl"
            />

            <div className="p-4 space-y-4 pb-12">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <h2 className="font-bold text-base font-display">Generate Media</h2>
                  <p className="text-[11px] text-muted-foreground truncate">{sourceName}</p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-xl hover:bg-secondary transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode selector */}
              <div className="grid grid-cols-4 gap-1">
                {(Object.keys(MODE_INFO) as MediaMode[]).map(m => {
                  const info = MODE_INFO[m];
                  const Icon = info.icon;
                  const active = mode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => { if (!isBusy) setMode(m); }}
                      disabled={isBusy}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-2xl border transition-all text-center min-w-0',
                        active ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-border hover:bg-secondary/50',
                        'disabled:opacity-40 disabled:cursor-not-allowed'
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? info.color : undefined }} />
                      <span className={cn('text-[9px] font-semibold leading-tight', active ? 'text-primary' : 'text-muted-foreground')}>
                        {info.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Mode description */}
              <p className="text-[11px] text-muted-foreground bg-secondary/30 rounded-xl px-3 py-2 leading-relaxed">
                {MODE_INFO[mode].desc}
                {' · '}up to {limits.maxPages === 999 ? 'all' : limits.maxPages} pages
                {' · '}~{Math.round(limits.maxAudioSeconds / 60)} min audio
                {mode === 'video' ? ` · ${limits.maxVideoSeconds}s video` : ''}
              </p>

              {/* Page range picker (paginated sources only) */}
              {totalPages > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-muted-foreground font-medium">Pages</span>
                  <input
                    type="number" min={1} max={totalPages} value={fromPage}
                    onChange={e => {
                      const v = Math.max(1, Math.min(Number(e.target.value), toPage));
                      setFromPage(v);
                    }}
                    disabled={isBusy}
                    className="w-16 text-[11px] bg-secondary/40 rounded-lg px-2 py-1 border border-border/40 text-center disabled:opacity-50"
                  />
                  <span className="text-[11px] text-muted-foreground">to</span>
                  <input
                    type="number" min={fromPage} max={totalPages} value={toPage}
                    onChange={e => {
                      const v = Math.max(fromPage, Math.min(Number(e.target.value), totalPages));
                      setToPage(v);
                    }}
                    disabled={isBusy}
                    className="w-16 text-[11px] bg-secondary/40 rounded-lg px-2 py-1 border border-border/40 text-center disabled:opacity-50"
                  />
                  <span className="text-[11px] text-muted-foreground">/ {totalPages}</span>
                </div>
              )}

              {/* Voice settings toggle */}
              <button
                onClick={() => setShowVoiceSettings(v => !v)}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors select-none"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Voice settings
                {showVoiceSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <AnimatePresence>
                {showVoiceSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Voice</label>
                      {voices.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground italic">Loading voices… (your browser may need a moment)</p>
                      ) : (
                        <select
                          value={selectedVoiceUri}
                          onChange={e => setSelectedVoiceUri(e.target.value)}
                          className="w-full text-[11px] bg-secondary/40 rounded-xl px-2 py-1.5 border border-border/40"
                        >
                          {language === 'bn' ? (
                            <>
                              {voices.filter(v => v.lang.startsWith('bn')).length > 0 && (
                                <optgroup label="বাংলা (Bangla)">
                                  {voices.filter(v => v.lang.startsWith('bn')).map(v => (
                                    <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                                  ))}
                                </optgroup>
                              )}
                              <optgroup label="English">
                                {voices.filter(v => v.lang.startsWith('en')).map(v => (
                                  <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                                ))}
                              </optgroup>
                              {voices.filter(v => !v.lang.startsWith('bn') && !v.lang.startsWith('en')).length > 0 && (
                                <optgroup label="Other Languages">
                                  {voices.filter(v => !v.lang.startsWith('bn') && !v.lang.startsWith('en')).slice(0, 20).map(v => (
                                    <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                                  ))}
                                </optgroup>
                              )}
                            </>
                          ) : (
                            <>
                              <optgroup label="English">
                                {voices.filter(v => v.lang.startsWith('en')).map(v => (
                                  <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                                ))}
                              </optgroup>
                              {voices.filter(v => !v.lang.startsWith('en')).length > 0 && (
                                <optgroup label="Other Languages">
                                  {voices.filter(v => !v.lang.startsWith('en')).slice(0, 30).map(v => (
                                    <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                                  ))}
                                </optgroup>
                              )}
                            </>
                          )}
                        </select>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Speed: {rate.toFixed(1)}×</label>
                        <input type="range" min={0.5} max={2} step={0.1} value={rate}
                          onChange={e => setRate(Number(e.target.value))}
                          className="w-full accent-primary" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Pitch: {pitch.toFixed(1)}</label>
                        <input type="range" min={0.5} max={2} step={0.1} value={pitch}
                          onChange={e => setPitch(Number(e.target.value))}
                          className="w-full accent-primary" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Studio tip banner — closeable by button or swipe */}
              <AnimatePresence>
                {showTip && (stage === 'idle' || stage === 'error') && (
                  <motion.div
                    key="studio-tip"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    onTouchStart={e => { tipTouchStart.current = e.touches[0].clientY; }}
                    onTouchEnd={e => {
                      if (tipTouchStart.current !== null && Math.abs(tipTouchStart.current - e.changedTouches[0].clientY) > 40) {
                        dismissTip();
                      }
                      tipTouchStart.current = null;
                    }}
                    className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25"
                  >
                    <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                    <p className="text-[11px] leading-relaxed flex-1 text-amber-300">
                      <span className="font-semibold">Best results tip:</span> For uploaded files, generating an AI{' '}
                      <span className="font-semibold">Summary</span>, <span className="font-semibold">Explainer</span>, or{' '}
                      <span className="font-semibold">Podcast</span> first — then creating audio from that output — gives the most accurate and natural-sounding audio.
                      Swipe or tap ✕ to dismiss.
                    </p>
                    <button
                      onClick={dismissTip}
                      className="p-0.5 rounded-lg hover:bg-amber-500/20 transition-colors flex-shrink-0 text-amber-400"
                      aria-label="Dismiss tip"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Background Music picker — Video mode only */}
              {mode === 'video' && (stage === 'idle' || stage === 'error') && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Music2 className="w-3 h-3" /> Background Music
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {BGM_TRACKS.map(track => (
                      <button
                        key={track.id}
                        onClick={() => setSelectedBgm(track.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                          selectedBgm === track.id
                            ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200'
                            : 'border-white/10 text-muted-foreground hover:border-white/20'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-medium leading-none">{track.name}</p>
                          <p className="text-[9px] mt-0.5 opacity-70">{track.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {selectedBgm !== 'none' && (
                    <p className="text-[9px] text-indigo-400/60 mt-1.5 px-0.5">
                      BGM fades in at start and out 3 s before end — narration stays on top
                    </p>
                  )}
                </div>
              )}

              {/* Generate button (idle / error state) */}
              {(stage === 'idle' || stage === 'error') && (
                <div className="space-y-1.5">
                  <Button onClick={handleGenerate} className="w-full rounded-2xl h-11 font-semibold gap-2">
                    <Sparkles className="w-4 h-4" />
                    Generate {MODE_INFO[mode].label}
                  </Button>
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    {mode === 'video'
                      ? 'Est. 30–60 sec for video recording'
                      : `Est. ~5 sec prep · up to ~${Math.round(limits.maxAudioSeconds / 60)} min audio`}
                  </div>
                </div>
              )}

              {/* Error message */}
              {stage === 'error' && errorMsg && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Progress (extracting / generating / recording) */}
              {isBusy && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                    <span className="text-sm text-muted-foreground truncate">{progressLabel}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="bg-primary h-2 rounded-full"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground text-center">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    {stage === 'recording'
                      ? estimatedRecordingSecs > 0
                        ? `Recording video — est. ~${estimatedRecordingSecs} sec total · please keep this screen open`
                        : 'Recording video to your browser — please keep this screen open'
                      : stage === 'generating'
                      ? 'Building script — almost done…'
                      : 'Reading your content…'}
                  </div>
                  <Button
                    variant="ghost" size="sm" className="w-full rounded-xl text-xs text-muted-foreground"
                    onClick={() => {
                      cancelSignal.current.cancelled = true;
                      ttsRef.current?.stop();
                      window.speechSynthesis.cancel();
                      setStage('idle');
                      setProgressLabel('');
                      setProgress(0);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {/* Done — playback + actions */}
              {stage === 'done' && script && (
                <div className="space-y-3">
                  {/* Success banner */}
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {MODE_INFO[mode].label} ready ·{' '}
                      ~{Math.round(estimateSpeechSeconds(script) / 60)} min ·{' '}
                      {countWords(script).toLocaleString()} words
                    </span>
                  </div>

                  {/* Audio narration controls (all modes) */}
                  <div className="glass rounded-2xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {playing
                          ? `Playing… ${ttsChunk > 0 && ttsTotalChunks > 0 ? `(${ttsChunk}/${ttsTotalChunks})` : ''}`
                          : paused ? 'Paused' : 'Audio Narration'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">Web Speech TTS</span>
                    </div>

                    {/* Progress track */}
                    {(playing || paused) && ttsTotalChunks > 0 && (
                      <div className="w-full bg-secondary rounded-full h-1">
                        <div
                          className="bg-primary h-1 rounded-full transition-all"
                          style={{ width: `${(ttsChunk / ttsTotalChunks) * 100}%` }}
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      {!playing ? (
                        <Button size="sm" onClick={handlePlay} className="flex-1 rounded-xl h-9 gap-1.5">
                          <Play className="w-3.5 h-3.5" />
                          {paused ? 'Resume' : 'Play Audio'}
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={handlePause} className="flex-1 rounded-xl h-9 gap-1.5">
                          <Pause className="w-3.5 h-3.5" /> Pause
                        </Button>
                      )}
                      {(playing || paused) && (
                        <Button size="sm" variant="ghost" onClick={handleStop} className="rounded-xl h-9 w-9 p-0" title="Stop">
                          <Square className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost"
                        onClick={() => { handleStop(); setTimeout(handlePlay, 120); }}
                        className="rounded-xl h-9 w-9 p-0" title="Restart from beginning"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Video preview (video mode) */}
                  {mode === 'video' && scenes.length > 0 && (
                    <div className="space-y-2">
                      <div className="rounded-xl overflow-hidden border border-border/30 bg-black" style={{ aspectRatio: '16/9' }}>
                        <canvas
                          ref={previewCanvasRef}
                          width={480} height={270}
                          className="w-full"
                          style={{ display: 'block' }}
                        />
                      </div>
                      {/* Scene thumbnails */}
                      <div className="flex gap-1 overflow-x-auto pb-1">
                        {scenes.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentScene(i)}
                            className={cn(
                              'flex-shrink-0 text-[9px] px-2 py-1 rounded-lg border transition-all',
                              i === currentScene
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border/30 text-muted-foreground hover:border-border'
                            )}
                            title={s.heading}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Script preview */}
                  <details className="group">
                    <summary className="cursor-pointer text-[11px] text-muted-foreground list-none flex items-center gap-1 select-none">
                      <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                      View script ({countWords(script).toLocaleString()} words)
                    </summary>
                    <div className="mt-2 max-h-40 overflow-y-auto text-[11px] text-muted-foreground leading-relaxed bg-secondary/30 rounded-xl p-3 whitespace-pre-wrap">
                      {script}
                    </div>
                  </details>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" size="sm" className="rounded-xl h-9 text-xs gap-1.5" onClick={handleDownloadScript}>
                      <Download className="w-3.5 h-3.5" /> Script (.txt)
                    </Button>
                    {mode === 'video' && hasVideoBlob && (
                      <Button variant="secondary" size="sm" className="rounded-xl h-9 text-xs gap-1.5" onClick={handleDownloadVideo}>
                        <Download className="w-3.5 h-3.5" /> Video (.webm)
                      </Button>
                    )}
                    <Button
                      variant="secondary" size="sm" className="rounded-xl h-9 text-xs gap-1.5"
                      onClick={() => { handleClose(); navigate('/media-library'); }}
                    >
                      <Library className="w-3.5 h-3.5" /> Media Library
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-xl h-9 text-xs gap-1.5" onClick={resetState}>
                      <RotateCcw className="w-3.5 h-3.5" /> Generate New
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
