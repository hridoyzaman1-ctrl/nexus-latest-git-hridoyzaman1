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
  getLimits, buildScriptForMode, sanitiseAIScript, estimateSpeechSeconds, countWords, truncateToWordLimit, trimToLastSentence,
  TTSController, getAvailableVoices, getDefaultVoice, isVideoSupported,
  recordVideoScenes, renderSceneToCanvas,
  type MediaMode, type SourceModule,
} from '@/lib/contentMediaEngine';
import { BGM_TRACKS, previewBgmTrack, BGM_VOLUME } from '@/lib/bgmEngine';
import { chatWithMediaGenAI } from '@/lib/longcat';
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
  /**
   * Optional custom canvas renderer for video mode. When provided it is called
   * instead of the generic VideoScene renderer for every animation frame.
   * Signature: (canvas, sceneIndex, progress 0..1) => void
   * Use this to render the actual presentation slide design instead of the
   * generic coloured card template.
   */
  customVideoRenderFn?: (canvas: HTMLCanvasElement, sceneIdx: number, progress: number) => void;
}

/**
 * Split a narration script into N equal text segments (one per slide/scene).
 * Sentences are distributed evenly so each slide gets a proportional portion
 * of the full narration — preserving sentence boundaries throughout.
 */
function splitScriptIntoNParts(script: string, n: number): string[] {
  if (n <= 0) return [script];
  if (n === 1) return [script];
  const sentences = script
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?।])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  if (sentences.length === 0) return Array.from({ length: n }, () => '');
  const perPart = Math.max(1, Math.ceil(sentences.length / n));
  return Array.from({ length: n }, (_, i) => {
    const start = i * perPart;
    const end = Math.min(start + perPart, sentences.length);
    return sentences.slice(start, end).join(' ');
  });
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
  preGeneratedScript, initialBgmId = 'none', customVideoRenderFn,
}: MediaGenerationModalProps) {
  const navigate = useNavigate();

  const [mode, setMode] = useState<MediaMode>(initialMode);
  const [selectedBgm, setSelectedBgm] = useState<string>(initialBgmId);
  const [bgmVolume, setBgmVolume] = useState(BGM_VOLUME);
  const [narrationVolume, setNarrationVolume] = useState(1.0);
  const [bgmPreviewing, setBgmPreviewing] = useState<string | null>(null);
  const bgmPreviewRef = useRef<{ stop: () => void } | null>(null);
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

  // ── Video-from-Script (VFS) — secondary video generation from an already-generated script ──
  const [vfsBusy, setVfsBusy] = useState(false);
  const [vfsProgress, setVfsProgress] = useState(0);
  const [vfsLabel, setVfsLabel] = useState('');
  const [vfsBgm, setVfsBgm] = useState('none');
  const [vfsDone, setVfsDone] = useState(false);

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
      previewCanvasRef.current.width = 1280;
      previewCanvasRef.current.height = 720;
      if (customVideoRenderFn) {
        customVideoRenderFn(previewCanvasRef.current, currentScene, 1);
      } else {
        const scene = scenes[currentScene] ?? scenes[0];
        renderSceneToCanvas(previewCanvasRef.current, scene);
      }
    }
  }, [stage, currentScene, scenes, customVideoRenderFn]);

  const isBusy = stage === 'extracting' || stage === 'generating' || stage === 'recording';

  const stopBgmPreview = useCallback(() => {
    bgmPreviewRef.current?.stop();
    bgmPreviewRef.current = null;
    setBgmPreviewing(null);
  }, []);

  const resetState = useCallback(() => {
    ttsRef.current?.stop();
    cancelSignal.current = { cancelled: true };
    stopBgmPreview();
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
    setVfsBusy(false);
    setVfsProgress(0);
    setVfsLabel('');
    setVfsDone(false);
  }, [stopBgmPreview]);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceUri) ?? null;

  // Stop all audio/TTS on unmount (user navigated away without closing the modal)
  useEffect(() => {
    return () => {
      ttsRef.current?.stop();
      cancelSignal.current = { cancelled: true };
      bgmPreviewRef.current?.stop();
      bgmPreviewRef.current = null;
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    };
  }, []);

  // Also stop TTS + BGM preview whenever the modal is closed (open → false)
  useEffect(() => {
    if (!open) {
      ttsRef.current?.stop();
      bgmPreviewRef.current?.stop();
      bgmPreviewRef.current = null;
      setBgmPreviewing(null);
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    }
  }, [open]);

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
      let generatedSceneScripts: string[] | undefined;

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
          const { scenes: localScenes, sceneScripts: localSS } = buildScriptForMode(truncated, sourceName, mode, language);
          generatedScenes = localScenes;
          generatedSceneScripts = localSS;
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
            summary:  'Write a concise spoken summary of 300–400 words. Cover all main points in continuous natural prose — no bullet points, no heading or section labels.',
            explainer:'Write a clear spoken explainer of 500–650 words. Walk through key concepts in continuous natural prose — no section labels, no numbered steps.',
            podcast:  'Write an engaging conversational monologue of 700–850 words. Sound natural and enthusiastic — no topic headers, just flowing conversation.',
            video:    'Write flowing spoken narration of 400–500 words. Flow naturally through the main ideas — no section labels, no spoken headings, just continuous prose.',
          };
          const langInstruction = language === 'bn'
            ? '\nIMPORTANT: Write ENTIRELY in Bangla (বাংলা). Every single word must be in Bangla script.'
            : '';
          const prompt = `You are a professional spoken-word script writer. Your output will be read by a text-to-speech engine — every character you write will be spoken aloud.

ABSOLUTE RULES — violating any of these will make the output unusable:
- Output ONLY the words to be spoken. Nothing else.
- Do NOT write any title, filename, document name, subject heading, or section label (no "Introduction", "Summary", "Key Points", "Conclusion", "Section 1", "Part 1", or similar).
- Do NOT open with any preamble, greeting, or meta-commentary ("Here is your script", "In this summary", "Today we will explore", "Welcome", "Hello", "Hi there", "In this video", etc.).
- Do NOT close with any sign-off, outro, or call-to-action ("Thanks for listening", "That's a wrap", "Subscribe", "Hope you enjoyed", etc.).
- Do NOT use markdown, asterisks (**bold**), bullet symbols (•, -, *), numbered lists (1. 2. 3.), or any other formatting characters.
- Do NOT include stage directions, sound cues, or parenthetical notes ([music], [pause], (upbeat tone), etc.).
- Do NOT repeat or echo the source title or filename anywhere in the output.
- The very first word of your output must be substantive spoken content — a fact, concept, or sentence from the material itself.
- Your output MUST end with a complete, properly punctuated sentence. The very last character must be a sentence terminator — a period, exclamation mark, question mark, or language-appropriate equivalent (e.g. । for Bangla). Never cut off mid-sentence, mid-word, or mid-thought. If you are running short on space, wrap up your current thought with one final concluding sentence and stop.
- ${modePrompts[mode]}${langInstruction}

CONTENT TO PROCESS:
${truncated}`;

          // Bangla and other non-Latin scripts consume 4–6× more tokens per word
          // than English. We multiply the budget so the full script is generated.
          const isBangla = language === 'bn';
          const maxTokensByMode: Record<MediaMode, number> = isBangla ? {
            summary: 3500, explainer: 6000, podcast: 7500, video: 5000,
          } : {
            summary: 900, explainer: 1400, podcast: 1800, video: 1100,
          };

          try {
            setProgress(45);
            setProgressLabel('AI is reading and scripting your content…');
            const aiRaw = await chatWithMediaGenAI(
              [{ role: 'user', content: prompt }],
              { maxTokens: maxTokensByMode[mode] }
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
            generatedSceneScripts = result.sceneScripts;
          }
          if (mode === 'video') {
            const { scenes: localScenes, sceneScripts: localSS } = buildScriptForMode(truncated, sourceName, mode, language);
            generatedScenes = localScenes;
            generatedSceneScripts = localSS;
          }
        } else {
          setProgressLabel(`Building ${mode} script (${words.toLocaleString()} words)…`);
          setProgress(40);
          await new Promise(r => setTimeout(r, 0));
          if (cancelSignal.current.cancelled) return;
          const result = buildScriptForMode(truncated, sourceName, mode, language);
          generatedScript = result.script;
          generatedScenes = result.scenes;
          generatedSceneScripts = result.sceneScripts;
        }
      }

      if (!generatedScript || generatedScript.trim().length < 20) {
        throw new Error('Could not generate a script. Please try a different page range or mode.');
      }

      // ── Presentation video: match scenes exactly to slides ───────────────
      // When a custom canvas renderer is provided (presentation video mode),
      // the scene count MUST equal the slide count so idx → slide[idx] is 1-to-1.
      // Split the full narration script evenly — one segment per slide.
      if (mode === 'video' && customVideoRenderFn && totalPages > 0) {
        const slideCount = totalPages;
        const parts = splitScriptIntoNParts(generatedScript, slideCount);
        generatedScenes = parts.map((part, i) => ({
          type: 'keypoint' as VideoScene['type'],
          heading: `Slide ${i + 1}`,
          body: part.slice(0, 220),
          duration: Math.max(4, Math.ceil(part.split(/\s+/).filter(Boolean).length / 130 * 60)),
        }));
        generatedSceneScripts = parts;
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
          canvas.width = 1280;
          canvas.height = 720;
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
              generatedSceneScripts,
              customVideoRenderFn,
              bgmVolume,
              {
                voice: selectedVoice ?? undefined,
                rate,
                pitch
              }
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
  }, [sourceModule, mode, totalPages, fromPage, toPage, getSourceText, sourceName, sourceId, selectedVoice, rate, pitch, language, isStudioModule, preGeneratedScript, selectedBgm, bgmVolume, customVideoRenderFn]);

  // ── Generate video from an already-produced script (VFS path) ────────────────────────────────
  const handleGenerateVideoFromScript = useCallback(async () => {
    if (!script || !savedItemId) return;
    cancelSignal.current = { cancelled: false };
    setVfsBusy(true);
    setVfsProgress(5);
    setVfsLabel('Building video scenes from script…');
    setCurrentScene(0);

    try {
      let vScenes: VideoScene[];
      let vSS: string[] | undefined;

      if (customVideoRenderFn && totalPages > 0) {
        // Presentation video: one scene per slide, script split evenly
        const parts = splitScriptIntoNParts(script, totalPages);
        vScenes = parts.map((part, i) => ({
          type: 'keypoint' as VideoScene['type'],
          heading: `Slide ${i + 1}`,
          body: part.slice(0, 220),
          duration: Math.max(4, Math.ceil(part.split(/\s+/).filter(Boolean).length / 130 * 60)),
        }));
        vSS = parts;
      } else {
        const result2 = buildScriptForMode(script, sourceName, 'video', language);
        vScenes = result2.scenes ?? [];
        vSS = result2.sceneScripts;
      }

      if (!vScenes || vScenes.length === 0) throw new Error('Could not build scenes from this script.');

      setScenes(vScenes);
      const totalSecs = vScenes.reduce((s, sc) => s + sc.duration, 0) + 3;
      setEstimatedRecordingSecs(totalSecs);
      setVfsProgress(20);
      setVfsLabel('Scenes ready — starting recording…');
      await new Promise(r => setTimeout(r, 80)); // let React show canvas
      if (cancelSignal.current.cancelled) return;

      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Recording canvas not available.');
      canvas.width = 1280;
      canvas.height = 720;

      const result = await recordVideoScenes(
        canvas,
        vScenes,
        (sceneIdx, total) => {
          setCurrentScene(sceneIdx);
          setVfsProgress(20 + Math.round((sceneIdx / total) * 75));
          setVfsLabel(`Recording scene ${sceneIdx + 1} of ${total}…`);
        },
        cancelSignal.current,
        vfsBgm,
        vSS,
        customVideoRenderFn,
        bgmVolume,
        {
          voice: selectedVoice ?? undefined,
          rate,
          pitch
        }
      );

      if (!cancelSignal.current.cancelled) {
        await saveVideoBlob(savedItemId, result.blob);
        const existingItem = getMediaItem(savedItemId);
        if (existingItem) {
          saveMediaItem({ ...existingItem, hasVideoBlob: true, videoMimeType: result.mimeType, scenes: vScenes });
        }
        setHasVideoBlob(true);
        setVfsDone(true);
        setVfsProgress(100);
        setVfsLabel('Video saved!');
        toast.success('Video saved to Media Library');
      }
    } catch (e: unknown) {
      if (!cancelSignal.current.cancelled) {
        const msg = e instanceof Error ? e.message : 'Video recording failed. Please try again.';
        toast.error(msg);
        setVfsLabel('');
      }
    } finally {
      setVfsBusy(false);
    }
  }, [script, savedItemId, sourceName, language, vfsBgm, bgmVolume, customVideoRenderFn, totalPages]);

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
              width={1280} height={720}
              style={{ display: (stage === 'recording' || vfsBusy) ? 'block' : 'none' }}
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
                {' · '}~{Math.round(limits.maxAudioSeconds / 60)} min audio
                {mode === 'video' ? ` · up to ${limits.maxVideoSeconds}s video` : ''}
              </p>

              {/* Page range picker (paginated sources only) */}
              {totalPages > 0 && (() => {
                const maxPg = limits.maxPages === 999 ? totalPages : limits.maxPages;
                const spanPages = toPage - fromPage + 1;
                const needsBlocks = totalPages > maxPg;
                const blockCount = Math.ceil(totalPages / maxPg);
                const shownBlocks = Math.min(blockCount, 10);
                const presetBlocks = Array.from({ length: shownBlocks }, (_, bi) => {
                  const start = bi * maxPg + 1;
                  const end = Math.min(start + maxPg - 1, totalPages);
                  return { start, end, label: `${start}–${end}` };
                });
                const activePreset = presetBlocks.find(b => b.start === fromPage && b.end === toPage);
                return (
                  <div className="space-y-2.5 bg-secondary/20 rounded-2xl p-3 border border-border/30">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold">Page Range</span>
                      <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full shrink-0">
                        Max {maxPg} pages · {limits.maxWords.toLocaleString()} words
                      </span>
                    </div>

                    {/* Preset block buttons */}
                    {needsBlocks && (
                      <div className="flex gap-1 flex-wrap">
                        {presetBlocks.map(({ start, end, label }) => {
                          const isActive = fromPage === start && toPage === end;
                          return (
                            <button
                              key={start}
                              disabled={isBusy}
                              onClick={() => { setFromPage(start); setToPage(end); }}
                              className={cn(
                                'text-[10px] px-2 py-0.5 rounded-full border transition-all',
                                isActive
                                  ? 'bg-primary border-primary text-primary-foreground font-semibold'
                                  : 'border-border/60 bg-secondary/40 text-muted-foreground hover:border-primary/50 hover:text-foreground',
                                'disabled:opacity-40 disabled:cursor-not-allowed'
                              )}
                            >
                              {label}
                            </button>
                          );
                        })}
                        {blockCount > 10 && (
                          <span className="text-[10px] text-muted-foreground self-center">+{blockCount - 10} more (use inputs below)</span>
                        )}
                      </div>
                    )}

                    {/* Manual from / to inputs */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">From pg</span>
                      <input
                        type="number" min={1} max={totalPages} value={fromPage}
                        onChange={e => {
                          const v = Math.max(1, Math.min(Number(e.target.value), totalPages));
                          setFromPage(v);
                          setToPage(prev => Math.max(v, Math.min(prev, v + maxPg - 1, totalPages)));
                        }}
                        disabled={isBusy}
                        className="w-14 text-[11px] bg-secondary/40 rounded-lg px-2 py-1 border border-border/40 text-center disabled:opacity-50"
                      />
                      <span className="text-[10px] text-muted-foreground">to</span>
                      <input
                        type="number" min={fromPage} max={Math.min(totalPages, fromPage + maxPg - 1)} value={toPage}
                        onChange={e => {
                          const maxTo = Math.min(totalPages, fromPage + maxPg - 1);
                          const v = Math.max(fromPage, Math.min(Number(e.target.value), maxTo));
                          setToPage(v);
                        }}
                        disabled={isBusy}
                        className="w-14 text-[11px] bg-secondary/40 rounded-lg px-2 py-1 border border-border/40 text-center disabled:opacity-50"
                      />
                      <span className="text-[10px] text-muted-foreground">/ {totalPages}</span>
                      <span className={cn(
                        'text-[10px] ml-auto font-medium',
                        spanPages >= maxPg ? 'text-amber-400' : 'text-muted-foreground'
                      )}>
                        {spanPages} pg{spanPages !== 1 ? 's' : ''}{spanPages >= maxPg ? ' (max)' : ''}
                      </span>
                    </div>

                    {/* Info line */}
                    <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                      Pages {fromPage}–{toPage} will be processed
                      {!activePreset && needsBlocks ? ' · tap a range above for quick selection' : ''}
                      {spanPages >= maxPg ? ` · at the limit for ${MODE_INFO[mode].label} mode` : ''}
                    </p>
                  </div>
                );
              })()}

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
                <div className="space-y-2.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Music2 className="w-3 h-3" /> Background Music
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {BGM_TRACKS.map(track => {
                      const isSelected = selectedBgm === track.id;
                      const isPreviewing = bgmPreviewing === track.id;
                      return (
                        <button
                          key={track.id}
                          onClick={async () => {
                            setSelectedBgm(track.id);
                            stopBgmPreview();
                            if (track.id !== 'none') {
                              setBgmPreviewing(track.id);
                              const handle = await previewBgmTrack(track.id, 7, bgmVolume);
                              bgmPreviewRef.current = handle;
                              setTimeout(() => setBgmPreviewing(null), 7500);
                            }
                          }}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200'
                              : 'border-white/10 text-muted-foreground hover:border-white/20'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium leading-none flex items-center gap-1">
                              {track.name}
                              {isPreviewing && <span className="text-[8px] text-indigo-300 animate-pulse">♪</span>}
                            </p>
                            <p className="text-[9px] mt-0.5 opacity-70">{track.description}</p>
                          </div>
                          {track.id !== 'none' && (
                            <Play className="w-3 h-3 opacity-40 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Volume controls */}
                  <div className="space-y-2 bg-secondary/20 rounded-xl p-3 border border-border/20">
                    <p className="text-[10px] font-semibold text-muted-foreground">Volume Mix</p>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-muted-foreground">Narration</label>
                        <span className="text-[10px] text-foreground font-medium">{Math.round(narrationVolume * 100)}%</span>
                      </div>
                      <input
                        type="range" min={0.1} max={1} step={0.05} value={narrationVolume}
                        onChange={e => setNarrationVolume(Number(e.target.value))}
                        className="w-full accent-primary h-1.5"
                      />
                    </div>
                    {selectedBgm !== 'none' && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] text-muted-foreground">BGM</label>
                          <span className="text-[10px] text-foreground font-medium">{Math.round(bgmVolume * 100)}%</span>
                        </div>
                        <input
                          type="range" min={0.05} max={0.9} step={0.05} value={bgmVolume}
                          onChange={e => setBgmVolume(Number(e.target.value))}
                          className="w-full accent-indigo-400 h-1.5"
                        />
                      </div>
                    )}
                  </div>

                  {selectedBgm !== 'none' && (
                    <p className="text-[9px] text-indigo-400/60 px-0.5">
                      Click any track to hear a 7-second preview · BGM fades in at start and out before end
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

                  {/* ── Generate Video from Script (non-video modes only) ──────────────── */}
                  {mode !== 'video' && isVideoSupported() && (
                    <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-3 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        <span className="text-sm font-semibold text-purple-300">Also Generate Video</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Turn your AI-generated {MODE_INFO[mode].label.toLowerCase()} into a visual video with slides and background music.
                      </p>

                      {/* BGM picker — only when idle (not yet recording or done) */}
                      {!vfsBusy && !vfsDone && (
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Music2 className="w-3 h-3" /> Background Music
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {BGM_TRACKS.map(track => (
                              <button
                                key={track.id}
                                onClick={() => setVfsBgm(track.id)}
                                className={cn(
                                  'flex items-start gap-2 p-2 rounded-xl border text-left transition-all',
                                  vfsBgm === track.id
                                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-200'
                                    : 'border-white/10 text-muted-foreground hover:border-white/20'
                                )}
                              >
                                <div>
                                  <p className="text-[11px] font-medium leading-none">{track.name}</p>
                                  <p className="text-[9px] mt-0.5 opacity-70">{track.description}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recording progress */}
                      {vfsBusy && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400 flex-shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">{vfsLabel}</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                            <motion.div
                              className="bg-purple-500 h-1.5 rounded-full"
                              animate={{ width: `${vfsProgress}%` }}
                              transition={{ duration: 0.4 }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            {estimatedRecordingSecs > 0
                              ? `Est. ~${estimatedRecordingSecs}s total · keep this screen open`
                              : 'Recording — please keep this screen open'}
                          </p>
                          <Button
                            variant="ghost" size="sm" className="w-full rounded-xl text-xs text-muted-foreground h-8"
                            onClick={() => { cancelSignal.current.cancelled = true; setVfsBusy(false); setVfsLabel(''); setVfsProgress(0); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}

                      {/* Success state */}
                      {vfsDone && !vfsBusy && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-emerald-400 text-xs">
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                            <span>Video saved to Media Library!</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <Button variant="secondary" size="sm" className="rounded-xl h-8 text-xs gap-1.5" onClick={handleDownloadVideo}>
                              <Download className="w-3 h-3" /> Download Video
                            </Button>
                            <Button
                              variant="ghost" size="sm" className="rounded-xl h-8 text-xs gap-1.5"
                              onClick={() => { setVfsDone(false); setVfsProgress(0); setVfsLabel(''); setScenes([]); }}
                            >
                              <RotateCcw className="w-3 h-3" /> Re-record
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Record button */}
                      {!vfsBusy && !vfsDone && (
                        <Button
                          onClick={handleGenerateVideoFromScript}
                          className="w-full rounded-2xl h-10 font-semibold gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Video className="w-4 h-4" />
                          Record Video from Script
                        </Button>
                      )}
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
                    {(mode === 'video' || vfsDone) && hasVideoBlob && (
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
