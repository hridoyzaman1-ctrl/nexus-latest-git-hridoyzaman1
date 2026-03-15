import { useState, useCallback, useRef, useEffect } from 'react';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, FileText, Upload, Palette, Sparkles, Download, Trash2, Edit3,
  ChevronLeft, ChevronRight, Copy, LayoutGrid, List, ArrowLeft,
  FileType, SlidersHorizontal, Eye, RotateCcw,
  CheckCircle2, Loader2, Presentation as PresentationIcon, ImagePlus, X, Move, Maximize2,
  MessageSquare, BarChart3, Clock, RefreshCw,
  ChevronDown, ChevronUp, AlertTriangle, Type, Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  BookOpen, Play, Headphones, Film, Video, Mic, Music2
} from 'lucide-react';
import MediaGenerationModal from '@/components/MediaGenerationModal';
import { chatWithPresentationAI } from '@/lib/longcat';
import { sanitiseAIScript, buildVideoScenes, recordVideoWithUserAudio, isVideoSupported } from '@/lib/contentMediaEngine';
import { preloadSlideImages, renderPresentationSlideToCanvas } from '@/lib/presentationVideoEngine';
import { BGM_TRACKS } from '@/lib/bgmEngine';
import { saveVideoBlob, saveMediaItem } from '@/lib/mediaStorage';
import { getPresentationAudio, hasPresentationAudio } from '@/lib/presentationAudioStorage';
import { Button } from '@/components/ui/button';
import PresentationViewer from '@/components/PresentationViewer';
import { useLocalStorage, isDemoMode } from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/use-toast';
import type {
  Presentation as PresentationType,
  PresentationSettings,
  PresentationPurpose,
  PresentationTone,
  LayoutPreference,
  SourceType,
  SlideContent,
  SlideLayoutType,
  SlideImage,
  ImageFit,
  ChartConfig,
  TableConfig,
  TimelineConfig,
  KpiConfig,
  TextStyle,
} from '@/types/presentation';
import { FONT_FAMILIES, FONT_SIZES } from '@/types/presentation';
import { presentationThemes, getTheme, presentationPalettes, getPalette } from '@/lib/presentationThemes';
import {
  getAllPresentations,
  savePresentation,
  deletePresentation,
  duplicatePresentation,
  addStudyPresentationLink,
  getStudyPresentationLinks,
} from '@/lib/presentationStorage';
import { getLocalStorage } from '@/hooks/useLocalStorage';
import type { StudySession } from '@/types';
import { parsePlainText, parseDocx, parsePdf } from '@/lib/fileParsers';
import { buildSlideBlueprint, buildSlidesFromAI, validateDeck, generateImagePlaceholders, getTextAreaWidth } from '@/lib/slideEngine';
import { renderTextWithBreaks, renderSlidePreviewContent } from '@/lib/presentationRenderer';
import { generatePptx, downloadPptx } from '@/lib/pptxGenerator';
import {
  isPresentationAIAvailable,
  generatePresentationContent,
  regenerateFullDeck,
  regenerateSingleSlide,
  regenerateNotesOnly,
} from '@/lib/presentationAI';

type View = 'library' | 'create' | 'editor';

interface PresentationGeneratorProps {
  embedded?: boolean;
}

const purposes: { value: PresentationPurpose; label: string }[] = [
  { value: 'pitch', label: 'Pitch Deck' },
  { value: 'report', label: 'Report' },
  { value: 'academic', label: 'Academic' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'business', label: 'Business' },
  { value: 'educational', label: 'Educational' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'proposal', label: 'Proposal' },
];

const tones: { value: PresentationTone; label: string }[] = [
  { value: 'modern', label: 'Modern' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'bold', label: 'Bold' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'creative', label: 'Creative' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

const layoutPrefs: { value: LayoutPreference; label: string; desc: string }[] = [
  { value: 'text-heavy', label: 'Text Heavy', desc: 'More content per slide' },
  { value: 'balanced', label: 'Balanced', desc: 'Mix of text & visuals' },
  { value: 'visual-heavy', label: 'Visual Heavy', desc: 'Big statements & impact' },
];

const sourceTypes: { value: SourceType; label: string; icon: any; desc: string }[] = [
  { value: 'topic', label: 'Topic Only', icon: Sparkles, desc: 'Generate from a title' },
  { value: 'text', label: 'Paste Text', icon: FileText, desc: 'From notes or content' },
  { value: 'pdf', label: 'Upload PDF', icon: Upload, desc: 'Extract from PDF' },
  { value: 'docx', label: 'Upload DOCX', icon: FileType, desc: 'Extract from Word' },
  { value: 'txt', label: 'Upload TXT', icon: FileText, desc: 'Plain text file' },
];

const defaultSettings: PresentationSettings = {
  title: '',
  subtitle: '',
  purpose: 'business',
  targetAudience: '',
  slideCount: 10,
  tone: 'modern',
  themeId: 'modern-dark',
  layoutPreference: 'balanced',
  includeCover: true,
  includeAgenda: true,
  includeSummary: true,
  includeClosing: true,
  selectedPalette: undefined,
};

const layoutLabels: Record<SlideLayoutType, string> = {
  'cover': 'Cover',
  'agenda': 'Agenda',
  'section-divider': 'Section Divider',
  'title-bullets': 'Title + Bullets',
  'two-column': 'Two Column',
  'image-text': 'Image + Text',
  'big-statement': 'Big Statement',
  'comparison': 'Comparison',
  'summary': 'Summary',
  'closing': 'Closing',
  'chart': 'Chart',
  'table': 'Table',
  'timeline': 'Timeline',
  'kpi': 'KPI / Stats',
  'process': 'Process Flow',
  'problem-solution': 'Problem & Solution',
  'recommendations': 'Recommendations',
};

const fitOptions: { value: ImageFit; label: string }[] = [
  { value: 'cover', label: 'Cover (fill & crop)' },
  { value: 'contain', label: 'Contain (fit inside)' },
  { value: 'fill', label: 'Fill (stretch)' },
];

const regenStyles = [
  { value: 'formal', label: 'More Formal' },
  { value: 'concise', label: 'More Concise' },
  { value: 'visual', label: 'More Visual' },
  { value: 'academic', label: 'More Academic' },
  { value: 'casual', label: 'More Casual' },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PresentationGenerator({ embedded }: PresentationGeneratorProps) {
  const [view, setView] = useState<View>('library');
  const [presentations, setPresentations] = useState<PresentationType[]>([]);
  const [settings, setSettings] = useState<PresentationSettings>({ ...defaultSettings });
  const [sourceType, setSourceType] = useState<SourceType>('topic');
  const [sourceContent, setSourceContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState('');
  const [exporting, setExporting] = useState<string | null>(null);
  const [editingPresentation, setEditingPresentation] = useState<PresentationType | null>(null);
  const [editingSlideIdx, setEditingSlideIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [showTypography, setShowTypography] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetImageId, setUploadTargetImageId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenPanel, setShowRegenPanel] = useState(false);
  const [showNotesEditor, setShowNotesEditor] = useState(true);
  const [expandedEditorSection, setExpandedEditorSection] = useState<string | null>('content');
  const [editingTitle, setEditingTitle] = useState(false);
  const [dragState, setDragState] = useState<{
    targetId: string; 
    visualType: 'image' | 'chart' | 'table' | 'timeline' | 'kpi' | 'text';
    mode: 'move' | 'resize'; 
    startX: number; startY: number;
    origX: number; origY: number; origW: number; origH: number;
  } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [showStudyPlannerModal, setShowStudyPlannerModal] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [presentingSlideIdx, setPresentingSlideIdx] = useState(0);
  const [presenterScale, setPresenterScale] = useState(1);
  const [studyPlannerTargetId, setStudyPlannerTargetId] = useState<string | null>(null);
  const [mediaModalPresId, setMediaModalPresId] = useState<string | null>(null);
  const [videoPresId, setVideoPresId] = useState<string | null>(null);
  const [presVideoMode, setPresVideoMode] = useState<'video' | 'summary' | 'explainer' | 'podcast'>('video');
  const [presScriptSource, setPresScriptSource] = useState<'speaker-notes' | 'slide-words' | 'ai-script'>('slide-words');
  const [presAiScript, setPresAiScript] = useState<string | null>(null);
  const [presGeneratingScript, setPresGeneratingScript] = useState(false);
  const [presScriptError, setPresScriptError] = useState<string | null>(null);
  const [presVideoModalOpen, setPresVideoModalOpen] = useState(false);
  const [presVideoPreScript, setPresVideoPreScript] = useState<string | undefined>(undefined);
  const [presVideoLanguage, setPresVideoLanguage] = useState<'en' | 'bn'>('en');
  const [presNarrationMode, setPresNarrationMode] = useState<'ai-tts' | 'recording'>('ai-tts');
  const [presHasRecording, setPresHasRecording] = useState(false);
  const [presGenWithAudio, setPresGenWithAudio] = useState(false);
  const [presGenProgress, setPresGenProgress] = useState(0);
  const presGenCancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });
  const presImageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const mediaModalImageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  /** Per-slide timing (seconds) editable inline in the video creator — null = use stored slideTimings */
  const [presTimingOverride, setPresTimingOverride] = useState<number[] | null>(null);
  const [presTimingSource, setPresTimingSource] = useState<'recording' | 'custom' | 'default'>('default');
  const [presSelectedBgm, setPresSelectedBgm] = useState<string>('none');
  const { toast } = useToast();

  useEffect(() => {
    refreshList();
  }, []);

  const getStudySessions = (): StudySession[] => {
    return getLocalStorage<StudySession[]>('studySessions', []);
  };

  const handleAddToStudyPlanner = (presentationId: string) => {
    setStudyPlannerTargetId(presentationId);
    setShowStudyPlannerModal(true);
  };

  const handleLinkToSession = (sessionId: string) => {
    if (!studyPlannerTargetId) return;
    const links = getStudyPresentationLinks();
    const alreadyLinked = links.some(l => l.presentationId === studyPlannerTargetId && l.sessionId === sessionId);
    if (alreadyLinked) {
      toast({ title: 'Already linked', description: 'This presentation is already in that subject.' });
      setShowStudyPlannerModal(false);
      setStudyPlannerTargetId(null);
      return;
    }
    addStudyPresentationLink(studyPlannerTargetId, sessionId);
    toast({ title: 'Added to Study Planner', description: 'Presentation linked to subject successfully.' });
    setShowStudyPlannerModal(false);
    setStudyPlannerTargetId(null);
  };

  const refreshList = useCallback(async () => {
    const all = await getAllPresentations();
    setPresentations(all);
  }, []);

  const handleGenerate = async () => {
    if (!settings.title.trim()) {
      toast({ title: 'Title required', description: 'Please enter a presentation title.', variant: 'destructive' });
      return;
    }
    if (settings.slideCount < 3 || settings.slideCount > 40) {
      toast({ title: 'Invalid slide count', description: 'Choose between 3 and 40 slides.', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    setGeneratingStatus('Preparing...');

    try {
      let parsedContent = undefined;
      let finalSource = sourceContent;

      if (sourceType === 'text' && !sourceContent.trim()) {
        toast({ title: 'No content', description: 'Please paste some text content.', variant: 'destructive' });
        setGenerating(false);
        return;
      }

      if (sourceType === 'pdf' || sourceType === 'docx' || sourceType === 'txt') {
        if (!file) {
          toast({ title: 'No file', description: 'Please upload a file.', variant: 'destructive' });
          setGenerating(false);
          return;
        }
        if (file.size > 20 * 1024 * 1024) {
          toast({ title: 'File too large', description: 'Maximum file size is 20MB.', variant: 'destructive' });
          setGenerating(false);
          return;
        }

        setGeneratingStatus('Extracting content from file...');
        try {
          if (sourceType === 'pdf') {
            parsedContent = await parsePdf(file);
          } else if (sourceType === 'docx') {
            parsedContent = await parseDocx(file);
          } else {
            const text = await file.text();
            parsedContent = parsePlainText(text);
          }
          finalSource = parsedContent.rawText;
        } catch {
          toast({ title: 'File parsing failed', description: 'Could not extract content from the file.', variant: 'destructive' });
          setGenerating(false);
          return;
        }
      }

      if (sourceType === 'text') {
        parsedContent = parsePlainText(sourceContent);
      }

      let slides: SlideContent[];
      const aiAvailable = isPresentationAIAvailable() && !isDemoMode;

      if (aiAvailable) {
        setGeneratingStatus('AI is crafting your presentation...');
        try {
          const sectionNames = parsedContent?.sections?.map(s => s.heading).filter(Boolean);
          const aiResult = await generatePresentationContent(
            settings,
            finalSource || undefined,
            sectionNames
          );
          setGeneratingStatus('Building slides...');
          slides = buildSlidesFromAI(aiResult, settings.themeId);
        } catch (aiErr) {
          console.warn('AI generation failed, using fallback engine:', aiErr);
          setGeneratingStatus('Using fallback engine...');
          slides = buildSlideBlueprint(settings, sourceType, parsedContent);
          toast({ title: 'AI unavailable', description: 'Used built-in engine. You can regenerate with AI later.' });
        }
      } else {
        setGeneratingStatus('Building slides...');
        slides = buildSlideBlueprint(settings, sourceType, parsedContent);
      }

      const validation = validateDeck(slides);
      if (!validation.valid && validation.issues.length > 3) {
        toast({ title: 'Quality notice', description: `${validation.issues.length} issues detected. You can regenerate for better results.` });
      }

      const now = new Date().toISOString();
      const presentation: PresentationType = {
        id: crypto.randomUUID(),
        settings: { ...settings },
        sourceType,
        sourceContent: finalSource,
        slides,
        themeId: settings.themeId,
        slideCount: slides.length,
        createdAt: now,
        updatedAt: now,
      };

      await savePresentation(presentation);
      await refreshList();
      setEditingPresentation(presentation);
      setEditingSlideIdx(0);
      setView('editor');
      toast({ title: 'Presentation generated', description: `${slides.length} slides created${aiAvailable ? ' with AI' : ''}.` });
    } catch {
      toast({ title: 'Generation failed', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setGenerating(false);
      setGeneratingStatus('');
    }
  };

  const handleExport = async (pres: PresentationType) => {
    setExporting(pres.id);
    try {
      const blob = await generatePptx(pres.slides, pres.themeId, pres.settings.title);
      const safeName = pres.settings.title.replace(/[^a-zA-Z0-9 -]/g, '').trim() || 'presentation';
      downloadPptx(blob, safeName);
      toast({ title: 'Downloaded', description: `${safeName}.pptx has been saved.` });
    } catch {
      toast({ title: 'Export failed', description: 'Could not generate the PPTX file.', variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  };

  const handleDelete = async (id: string) => {
    await deletePresentation(id);
    await refreshList();
    if (editingPresentation?.id === id) {
      setEditingPresentation(null);
      setView('library');
    }
    toast({ title: 'Deleted', description: 'Presentation removed.' });
  };

  const handleDuplicate = async (id: string) => {
    const dup = await duplicatePresentation(id);
    if (dup) {
      await refreshList();
      toast({ title: 'Duplicated', description: 'A copy has been created.' });
    }
  };

  const extractPresText = (pres: PresentationType): string => {
    return pres.slides.map(s => {
      const parts: string[] = [];
      if (s.title) parts.push(s.title);
      if (s.subtitle) parts.push(s.subtitle);
      if (s.body) parts.push(s.body);
      if (s.bullets?.length) parts.push(s.bullets.join(' '));
      if (s.statement) parts.push(s.statement);
      if (s.leftColumn?.length) parts.push(s.leftColumn.join(' '));
      if (s.rightColumn?.length) parts.push(s.rightColumn.join(' '));
      if (s.agendaItems?.length) parts.push(s.agendaItems.join(' '));
      if (s.summaryPoints?.length) parts.push(s.summaryPoints.join(' '));
      if (s.speakerNotes) parts.push(s.speakerNotes);
      return parts.filter(Boolean).join('\n');
    }).filter(Boolean).join('\n\n');
  };

  const openVideoCreator = (pres: PresentationType) => {
    setVideoPresId(pres.id);
    setPresVideoMode('video');
    setPresScriptSource('slide-words');
    setPresAiScript(null);
    setPresScriptError(null);
    setPresVideoPreScript(undefined);
    setPresVideoModalOpen(false);
    setPresVideoLanguage('en');
    setPresNarrationMode('ai-tts');
    setPresGenWithAudio(false);
    setPresGenProgress(0);

    // Initialise editable per-slide timings from stored data (seconds)
    if (pres.slideTimings && pres.slideTimings.length === pres.slides.length) {
      setPresTimingOverride(pres.slideTimings.map(ms => Math.max(1, Math.round(ms / 1000))));
      setPresTimingSource(pres.recordedAt ? 'recording' : 'custom');
    } else {
      // Default: 5 s per slide
      setPresTimingOverride(pres.slides.map(() => 5));
      setPresTimingSource('default');
    }

    // Check if narration recording exists → switch default narration mode
    hasPresentationAudio(pres.id).then(has => {
      setPresHasRecording(has);
      if (has) setPresNarrationMode('recording');
    }).catch(() => setPresHasRecording(false));

    // Pre-load slide images eagerly so the canvas renderer has them ready
    // by the time video recording starts (AI TTS or user-audio paths).
    preloadSlideImages(pres.slides).then(cache => {
      presImageCacheRef.current = cache;
    });
  };

  /** Convert slide content → VideoScene objects with custom ms-based timings */
  const buildScenesFromSlides = (pres: PresentationType, timingsMs: number[]) => {
    // Map slide layout → VideoScene type for visual variety
    const layoutToType = (layout: string): 'title' | 'keypoint' | 'definition' | 'quote' | 'example' | 'recap' => {
      switch (layout) {
        case 'cover': return 'title';
        case 'closing': case 'summary': return 'recap';
        case 'big-statement': return 'quote';
        case 'comparison': case 'two-column': return 'example';
        case 'kpi': case 'chart': return 'definition';
        default: return 'keypoint';
      }
    };
    return pres.slides.map((slide, i) => {
      const bodyParts: string[] = [];
      if (slide.bullets?.length) bodyParts.push(slide.bullets.join('\n'));
      if (slide.body) bodyParts.push(slide.body);
      if (slide.statement) bodyParts.push(slide.statement);
      if (slide.summaryPoints?.length) bodyParts.push(slide.summaryPoints.join('\n'));
      if (slide.leftColumn?.length) bodyParts.push(slide.leftColumn.join('\n'));
      if (slide.rightColumn?.length) bodyParts.push(slide.rightColumn.join('\n'));
      // Use speaker notes as the primary body when available (richest text)
      const body = slide.speakerNotes?.trim()
        ? slide.speakerNotes
        : (bodyParts.join('\n').trim() || slide.subtitle || '');
      return {
        type: layoutToType(slide.layout),
        heading: slide.title || `Slide ${i + 1}`,
        body,
        duration: Math.max(1, (timingsMs[i] ?? 5000) / 1000),
      };
    });
  };

  /** Generate a video using the presentation's saved narration audio */
  const handleGenerateVideoWithRecording = async () => {
    const pres = presentations.find(p => p.id === videoPresId);
    if (!pres || pres.slides.length === 0) return;

    // Use the inline-editable timings from the video creator UI (presTimingOverride).
    // These are always present because openVideoCreator() always initialises them.
    // Fall back to stored slideTimings, then to a flat 5 s default.
    const timingsMs: number[] =
      (presTimingOverride && presTimingOverride.length === pres.slides.length)
        ? presTimingOverride.map(s => Math.max(1, s) * 1000)
        : (pres.slideTimings && pres.slideTimings.length === pres.slides.length)
          ? pres.slideTimings
          : pres.slides.map(() => 5000);

    setPresGenWithAudio(true);
    setPresGenProgress(0);
    presGenCancelRef.current = { cancelled: false };

    let scenes: ReturnType<typeof buildScenesFromSlides> = [];
    try {
      // Load audio blob
      const audioBlob = await getPresentationAudio(pres.id, pres.recordedAudioMime || 'audio/webm');
      if (!audioBlob || audioBlob.size === 0) {
        toast({ title: 'No recording found', description: 'Open the presentation in Viewer → tap Record to narrate first.', variant: 'destructive' });
        setPresGenWithAudio(false);
        return;
      }

      // Build canvas scenes from slide content with layout-aware types
      scenes = buildScenesFromSlides(pres, timingsMs);

      // Pre-load all slide images so the canvas renderer can draw them synchronously
      presImageCacheRef.current = await preloadSlideImages(pres.slides);
      const presTheme = getTheme(pres.themeId);

      // Custom renderer: draws the actual presentation slide (theme + images)
      // instead of the generic VideoScene coloured card.
      const customRenderFn = (
        c: HTMLCanvasElement,
        idx: number,
        prog: number,
      ) => {
        const slide = pres.slides[idx] ?? pres.slides[pres.slides.length - 1];
        renderPresentationSlideToCanvas(c, slide, presTheme, presImageCacheRef.current, prog);
      };

      // High-resolution canvas for premium video quality (720p)
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;

      const result = await recordVideoWithUserAudio(
        canvas,
        scenes,
        audioBlob,
        (idx, total) => setPresGenProgress(total > 0 ? idx / total : 0),
        presGenCancelRef.current,
        presSelectedBgm,
        customRenderFn,
      );

      if (presGenCancelRef.current.cancelled) {
        toast({ title: 'Cancelled', description: 'Video generation was cancelled.' });
        return;
      }

      // Progress: 100%
      setPresGenProgress(1);

      // Save to media library
      const id = crypto.randomUUID();
      await saveVideoBlob(id, result.blob);
      saveMediaItem({
        id,
        title: `${pres.settings.title} — My Narration`,
        sourceModule: 'presentations',
        sourceId: pres.id,
        sourceName: pres.settings.title || 'Presentation',
        mode: 'video',
        script: pres.slides.map(s => s.speakerNotes || s.title).join('\n\n'),
        language: 'en-US',
        voiceName: 'User Recording',
        voiceRate: 1,
        voicePitch: 1,
        scenes,
        estimatedDuration: result.durationSecs,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        wordCount: pres.slides.reduce((n, s) => n + ((s.speakerNotes || '').split(' ').length), 0),
        hasVideoBlob: true,
        videoMimeType: result.mimeType,
      });

      toast({ title: '🎬 Video ready!', description: 'Your narration video has been saved. Open Video Studio to watch it.' });
      setVideoPresId(null);
    } catch (e: any) {
      const msg = e?.message || 'Could not generate video.';
      toast({ title: 'Generation failed', description: msg, variant: 'destructive' });
    } finally {
      setPresGenWithAudio(false);
      setPresGenProgress(0);
    }
  };

  const handlePresGenerateAIScript = async () => {
    const pres = presentations.find(p => p.id === videoPresId);
    if (!pres) return;
    setPresGeneratingScript(true);
    setPresAiScript(null);
    setPresScriptError(null);
    const text = extractPresText(pres);
    const modeInstructions: Record<string, string> = {
      video: `Write flowing spoken narration for a visual presentation video (3-4 minutes when read aloud). Cover each slide topic naturally.`,
      summary: `Write a concise spoken summary (2-3 minutes). Hit the key points clearly and efficiently.`,
      explainer: `Write a structured spoken explainer (4-5 minutes). Walk through concepts step-by-step for clarity.`,
      podcast: `Write an engaging conversational podcast episode (6-8 minutes). Sound natural and add context.`,
    };
    const langNote = presVideoLanguage === 'bn' ? ' Write entirely in Bengali (বাংলা) script.' : '';
    const prompt = `You are a professional scriptwriter.\n\nPresentation title: "${pres.settings.title}"\nPurpose: ${pres.settings.purpose}\nSlides:\n\n${text}\n\n${modeInstructions[presVideoMode]}${langNote}\n\nWrite only the narration script. No stage directions, no slide numbers, no meta-commentary. Start immediately with the spoken content.\n\nCRITICAL: Your script MUST end with a complete, properly punctuated sentence. The very last character must be a period, exclamation mark, question mark, or (if writing in Bangla) a danda (।). Never cut off mid-sentence, mid-word, or mid-thought. If you are running short on space, add one final concluding sentence and stop.`;
    try {
      // Bangla needs ~5× more tokens per word than English (Unicode tokenization)
      const raw = await chatWithPresentationAI([{ role: 'user', content: prompt }], { maxTokens: presVideoLanguage === 'bn' ? 6000 : 1500 });
      setPresAiScript(sanitiseAIScript(raw));
    } catch {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      setPresScriptError(isOffline 
        ? 'Network unavailable. You can still generate video using visible slide words.'
        : 'AI generation failed. You can still generate video directly.');
    } finally {
      setPresGeneratingScript(false);
    }
  };

  const handlePresLaunchGeneration = (useAiScript?: boolean) => {
    const pres = presentations.find(p => p.id === videoPresId);
    if (!pres) return;

    let preScript: string | undefined;
    if (useAiScript && presAiScript) {
      // AI-generated script explicitly confirmed by user
      preScript = presAiScript;
    } else if (presScriptSource === 'speaker-notes') {
      // Use each slide's speaker notes (richest author-written text)
      preScript = pres.slides
        .map(s => s.speakerNotes?.trim())
        .filter(Boolean)
        .join('\n\n') || undefined;
    } else if (presScriptSource === 'slide-words') {
      // Use visible slide content: title + bullets + body
      preScript = pres.slides.map(s => {
        const parts: string[] = [];
        if (s.title) parts.push(s.title);
        if (s.subtitle) parts.push(s.subtitle);
        if (s.bullets?.length) parts.push(s.bullets.join('. '));
        if (s.body) parts.push(s.body);
        if (s.statement) parts.push(s.statement);
        if (s.leftColumn?.length) parts.push(s.leftColumn.join('. '));
        if (s.rightColumn?.length) parts.push(s.rightColumn.join('. '));
        if (s.agendaItems?.length) parts.push(s.agendaItems.join('. '));
        if (s.summaryPoints?.length) parts.push(s.summaryPoints.join('. '));
        return parts.filter(Boolean).join('. ');
      }).filter(Boolean).join('\n\n') || undefined;
    }
    // presScriptSource === 'ai-script' without useAiScript → let modal generate from AI

    setPresVideoPreScript(preScript);
    setPresVideoModalOpen(true);
  };

  const handleSaveEdits = () => {
    if (!editingPresentation) return;
    const updated = { ...editingPresentation, updatedAt: new Date().toISOString() };
    try {
      savePresentation(updated);
      setEditingPresentation(updated);
      refreshList();
      toast({ title: 'Saved', description: 'Changes saved successfully.' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message || 'Could not save. Storage may be full.', variant: 'destructive' });
    }
  };

  const handleRegenerateAll = async () => {
    if (!editingPresentation || !isPresentationAIAvailable() || isDemoMode) {
      handleRegenerateFallback();
      return;
    }
    setRegenerating(true);
    try {
      const aiResult = await regenerateFullDeck(editingPresentation.slides, editingPresentation.settings);
      const newSlides = buildSlidesFromAI(aiResult, editingPresentation.themeId);
      const updated = {
        ...editingPresentation,
        slides: newSlides,
        slideCount: newSlides.length,
        updatedAt: new Date().toISOString(),
      };
      savePresentation(updated);
      setEditingPresentation(updated);
      setEditingSlideIdx(0);
      refreshList();
      toast({ title: 'Regenerated', description: `${newSlides.length} slides regenerated with AI.` });
    } catch {
      handleRegenerateFallback();
    } finally {
      setRegenerating(false);
    }
  };

  const handleRegenerateFallback = () => {
    if (!editingPresentation) return;
    let parsedContent = undefined;
    if (editingPresentation.sourceContent) {
      parsedContent = parsePlainText(editingPresentation.sourceContent);
    }
    const newSlides = buildSlideBlueprint(editingPresentation.settings, editingPresentation.sourceType, parsedContent);
    const updated = {
      ...editingPresentation,
      slides: newSlides,
      slideCount: newSlides.length,
      updatedAt: new Date().toISOString(),
    };
    savePresentation(updated);
    setEditingPresentation(updated);
    setEditingSlideIdx(0);
    refreshList();
    toast({ title: 'Regenerated', description: `${newSlides.length} slides regenerated.` });
  };

  const handleRegenerateWithStyle = async (style: string) => {
    if (!editingPresentation || !isPresentationAIAvailable() || isDemoMode) {
      toast({ title: isDemoMode ? 'Demo mode' : 'AI unavailable', description: isDemoMode ? 'AI features are disabled in demo mode.' : 'Style regeneration requires AI.', variant: 'destructive' });
      return;
    }
    setRegenerating(true);
    try {
      const aiResult = await regenerateFullDeck(editingPresentation.slides, editingPresentation.settings, style);
      const newSlides = buildSlidesFromAI(aiResult, editingPresentation.themeId);
      const updated = {
        ...editingPresentation,
        slides: newSlides,
        slideCount: newSlides.length,
        updatedAt: new Date().toISOString(),
      };
      savePresentation(updated);
      setEditingPresentation(updated);
      setEditingSlideIdx(0);
      refreshList();
      toast({ title: 'Style applied', description: `Deck regenerated with ${style} style.` });
    } catch {
      toast({ title: 'Regeneration failed', description: 'Could not regenerate. Try again.', variant: 'destructive' });
    } finally {
      setRegenerating(false);
    }
  };

  const handleRegenerateCurrentSlide = async () => {
    if (!editingPresentation || !isPresentationAIAvailable() || isDemoMode) {
      toast({ title: isDemoMode ? 'Demo mode' : 'AI unavailable', description: isDemoMode ? 'AI features are disabled in demo mode.' : 'Slide regeneration requires AI.', variant: 'destructive' });
      return;
    }
    const currentSlide = editingPresentation.slides[editingSlideIdx];
    if (!currentSlide) return;
    setRegenerating(true);
    try {
      const context = {
        presentationTitle: editingPresentation.settings.title,
        prevSlideTitle: editingSlideIdx > 0 ? editingPresentation.slides[editingSlideIdx - 1].title : undefined,
        nextSlideTitle: editingSlideIdx < editingPresentation.slides.length - 1 ? editingPresentation.slides[editingSlideIdx + 1].title : undefined,
      };
      const aiSlide = await regenerateSingleSlide(currentSlide, context, editingPresentation.settings);
      const slideTypeMap: Record<string, SlideLayoutType> = {
        'cover': 'cover', 'agenda': 'agenda', 'section-divider': 'section-divider',
        'title-bullets': 'title-bullets', 'two-column': 'two-column', 'image-text': 'image-text',
        'big-statement': 'big-statement', 'comparison': 'comparison', 'summary': 'summary',
        'closing': 'closing', 'chart': 'chart', 'table': 'table', 'timeline': 'timeline',
        'kpi': 'kpi', 'process': 'process', 'problem-solution': 'problem-solution',
        'recommendations': 'recommendations',
      };
      const newLayout = slideTypeMap[aiSlide.slideType] || currentSlide.layout;
      const newSlides = [...editingPresentation.slides];
      const updatedSlide: SlideContent = {
        ...currentSlide,
        layout: newLayout,
        title: aiSlide.title || currentSlide.title,
        subtitle: aiSlide.subtitle || currentSlide.subtitle,
        bullets: aiSlide.bullets || currentSlide.bullets,
        speakerNotes: aiSlide.speakerNotes || currentSlide.speakerNotes,
        statement: aiSlide.keyTakeaway || currentSlide.statement,
      };
      if (aiSlide.chartSuggestion) {
        updatedSlide.chartConfig = {
          type: (aiSlide.chartSuggestion.type as ChartConfig['type']) || 'bar',
          title: aiSlide.chartSuggestion.title || '',
          labels: aiSlide.chartSuggestion.labels || [],
          datasets: aiSlide.chartSuggestion.datasets || [],
        };
      }
      if (aiSlide.tableSuggestion) {
        updatedSlide.tableConfig = {
          headers: aiSlide.tableSuggestion.headers || [],
          rows: aiSlide.tableSuggestion.rows || [],
        };
      }
      newSlides[editingSlideIdx] = updatedSlide;
      const updated = { ...editingPresentation, slides: newSlides, updatedAt: new Date().toISOString() };
      savePresentation(updated);
      setEditingPresentation(updated);
      refreshList();
      toast({ title: 'Slide regenerated', description: `Slide ${editingSlideIdx + 1} updated with AI.` });
    } catch {
      toast({ title: 'Regeneration failed', description: 'Could not regenerate slide. Try again.', variant: 'destructive' });
    } finally {
      setRegenerating(false);
    }
  };

  const handleRegenerateNotes = async () => {
    if (!editingPresentation || !isPresentationAIAvailable() || isDemoMode) {
      toast({ title: isDemoMode ? 'Demo mode' : 'AI unavailable', description: isDemoMode ? 'AI features are disabled in demo mode.' : 'Notes regeneration requires AI.', variant: 'destructive' });
      return;
    }
    setRegenerating(true);
    try {
      const notes = await regenerateNotesOnly(editingPresentation.slides, editingPresentation.settings);
      const newSlides = editingPresentation.slides.map((s, i) => ({
        ...s,
        speakerNotes: notes[i] || s.speakerNotes,
      }));
      const updated = { ...editingPresentation, slides: newSlides, updatedAt: new Date().toISOString() };
      savePresentation(updated);
      setEditingPresentation(updated);
      refreshList();
      toast({ title: 'Notes regenerated', description: 'Speaker notes updated for all slides.' });
    } catch {
      toast({ title: 'Regeneration failed', description: 'Could not regenerate notes. Try again.', variant: 'destructive' });
    } finally {
      setRegenerating(false);
    }
  };

  const updateSlide = (idx: number, updates: Partial<SlideContent>) => {
    if (!editingPresentation) return;
    const newSlides = [...editingPresentation.slides];
    newSlides[idx] = { ...newSlides[idx], ...updates };
    setEditingPresentation({ ...editingPresentation, slides: newSlides });
  };

  const addSlideAfter = (idx: number) => {
    if (!editingPresentation) return;
    const newSlide: SlideContent = {
      id: crypto.randomUUID(),
      layout: 'title-bullets',
      title: 'New Slide',
      bullets: [],
      speakerNotes: '',
    };
    const newSlides = [...editingPresentation.slides];
    newSlides.splice(idx + 1, 0, newSlide);
    setEditingPresentation({ ...editingPresentation, slides: newSlides, slideCount: newSlides.length });
    setEditingSlideIdx(idx + 1);
  };

  const deleteSlide = (idx: number) => {
    if (!editingPresentation || editingPresentation.slides.length <= 1) return;
    const newSlides = editingPresentation.slides.filter((_, i) => i !== idx);
    setEditingPresentation({ ...editingPresentation, slides: newSlides, slideCount: newSlides.length });
    if (editingSlideIdx >= newSlides.length) setEditingSlideIdx(newSlides.length - 1);
  };

  const moveSlide = (idx: number, direction: 'up' | 'down') => {
    if (!editingPresentation) return;
    const newSlides = [...editingPresentation.slides];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newSlides.length) return;
    [newSlides[idx], newSlides[targetIdx]] = [newSlides[targetIdx], newSlides[idx]];
    setEditingPresentation({ ...editingPresentation, slides: newSlides });
    setEditingSlideIdx(targetIdx);
  };

  const updateImage = (slideIdx: number, imageId: string, updates: Partial<SlideImage>) => {
    if (!editingPresentation) return;
    const newSlides = [...editingPresentation.slides];
    const slide = { ...newSlides[slideIdx] };
    slide.images = (slide.images || []).map(img =>
      img.id === imageId ? { ...img, ...updates } : img
    );
    newSlides[slideIdx] = slide;
    setEditingPresentation({ ...editingPresentation, slides: newSlides });
  };

  const removeImage = (slideIdx: number, imageId: string) => {
    if (!editingPresentation) return;
    const newSlides = [...editingPresentation.slides];
    const slide = { ...newSlides[slideIdx] };
    slide.images = (slide.images || []).filter(img => img.id !== imageId);
    newSlides[slideIdx] = slide;
    setEditingPresentation({ ...editingPresentation, slides: newSlides });
    if (editingImageId === imageId) setEditingImageId(null);
  };

  const addImageToSlide = (slideIdx: number) => {
    if (!editingPresentation) return;
    const newImg: SlideImage = {
      id: crypto.randomUUID(),
      dataUrl: '',
      label: 'New Image',
      x: 60, y: 15, width: 35, height: 70,
      fit: 'cover', opacity: 100, borderRadius: 0,
    };
    const newSlides = [...editingPresentation.slides];
    const slide = { ...newSlides[slideIdx] };
    slide.images = [...(slide.images || []), newImg];
    newSlides[slideIdx] = slide;
    setEditingPresentation({ ...editingPresentation, slides: newSlides });
    setEditingImageId(newImg.id);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !editingPresentation || !uploadTargetImageId) return;
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '')) {
      toast({ title: 'Invalid image', description: 'Please upload JPG, PNG, GIF, WebP, or SVG.', variant: 'destructive' });
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Maximum image size is 25MB.', variant: 'destructive' });
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(f);
      updateImage(editingSlideIdx, uploadTargetImageId, { dataUrl, label: f.name.replace(/\.[^.]+$/, '') });
    } catch {
      toast({ title: 'Upload failed', description: 'Could not read the image file.', variant: 'destructive' });
    }
    e.target.value = '';
    setUploadTargetImageId(null);
  };

  const triggerImageUpload = (imageId: string) => {
    setUploadTargetImageId(imageId);
    setTimeout(() => imageInputRef.current?.click(), 50);
  };

  const startDrag = (e: React.MouseEvent | React.TouchEvent, targetId: string, visualType: 'image' | 'chart' | 'table' | 'timeline' | 'kpi' | 'text', mode: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    const slide = editingPresentation?.slides[editingSlideIdx];
    if (!slide) return;

    let x = 0, y = 0, w = 40, h = 30; // Defaults

    if (visualType === 'image') {
      const img = slide.images?.find(i => i.id === targetId);
      if (!img) return;
      x = img.x; y = img.y; w = img.width; h = img.height;
      setEditingImageId(targetId);
    } else if (visualType === 'text') {
      x = slide.textX ?? 0;
      y = slide.textY ?? 0;
      w = slide.textWidth ?? getTextAreaWidth(slide.layout, slide.images || []);
      h = slide.textHeight ?? (!!(slide.chartConfig || slide.tableConfig || slide.timelineConfig || slide.kpiConfig) ? 52 : 100);
    } else {
      const config = visualType === 'chart' ? slide.chartConfig 
                   : visualType === 'table' ? slide.tableConfig
                   : visualType === 'timeline' ? slide.timelineConfig
                   : slide.kpiConfig;
      if (!config) return;
      x = config.x ?? 0; // Default X for visuals in editor
      y = config.y ?? 55; // Default Y for visuals in editor
      w = config.width ?? 100;
      h = config.height ?? 40;
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setDragState({
      targetId, visualType, mode, startX: clientX, startY: clientY,
      origX: x, origY: y, origW: w, origH: h,
    });
  };

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragState || !previewRef.current || !editingPresentation) return;
    e.preventDefault();
    const rect = previewRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dx = ((clientX - dragState.startX) / rect.width) * 100;
    const dy = ((clientY - dragState.startY) / rect.height) * 100;

    if (dragState.mode === 'move') {
      const maxX = Math.max(0, 100 - dragState.origW);
      const maxY = Math.max(0, 100 - dragState.origH);
      const newX = Math.round(Math.max(0, Math.min(maxX, dragState.origX + dx)));
      const newY = Math.round(Math.max(0, Math.min(maxY, dragState.origY + dy)));

      if (dragState.visualType === 'image') {
        updateImage(editingSlideIdx, dragState.targetId, { x: newX, y: newY });
      } else if (dragState.visualType === 'text') {
        updateSlide(editingSlideIdx, { textX: newX, textY: newY });
      } else {
        const key = `${dragState.visualType}Config` as keyof SlideContent;
        const currentConfig = editingPresentation.slides[editingSlideIdx][key] as any;
        updateSlide(editingSlideIdx, { [key]: { ...currentConfig, x: newX, y: newY } });
      }
    } else {
      const maxW = 100 - dragState.origX;
      const maxH = 100 - dragState.origY;
      const newW = Math.round(Math.max(5, Math.min(maxW, dragState.origW + dx)));
      const newH = Math.round(Math.max(5, Math.min(maxH, dragState.origH + dy)));

      if (dragState.visualType === 'image') {
        updateImage(editingSlideIdx, dragState.targetId, { width: newW, height: newH });
      } else if (dragState.visualType === 'text') {
        updateSlide(editingSlideIdx, { textWidth: newW, textHeight: newH });
      } else {
        const key = `${dragState.visualType}Config` as keyof SlideContent;
        const currentConfig = editingPresentation.slides[editingSlideIdx][key] as any;
        updateSlide(editingSlideIdx, { [key]: { ...currentConfig, width: newW, height: newH } });
      }
    }
  }, [dragState, editingPresentation, editingSlideIdx]);

  const handleDragEnd = useCallback(() => {
    setDragState(null);
  }, []);

  useEffect(() => {
    if (!dragState) return;
    const onMove = (e: MouseEvent | TouchEvent) => handleDragMove(e);
    const onEnd = () => handleDragEnd();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [dragState, handleDragMove, handleDragEnd]);

  useEffect(() => {
    if (view !== 'editor' || !editingPresentation) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (presenting) return; // PresentationViewer handles its own keyboard navigation

      if (e.key === 'ArrowLeft' && editingSlideIdx > 0) {
        setEditingSlideIdx(editingSlideIdx - 1);
        setEditingImageId(null);
      } else if (e.key === 'ArrowRight' && editingSlideIdx < editingPresentation.slides.length - 1) {
        setEditingSlideIdx(editingSlideIdx + 1);
        setEditingImageId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, editingPresentation, editingSlideIdx, presenting]);

  // Pre-load slide images for the general media modal (library card → media button)
  // so the custom canvas renderer has them ready when video recording starts.
  useEffect(() => {
    if (!mediaModalPresId) { mediaModalImageCacheRef.current = new Map(); return; }
    const mp = presentations.find(p => p.id === mediaModalPresId);
    if (!mp) return;
    preloadSlideImages(mp.slides).then(cache => { mediaModalImageCacheRef.current = cache; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaModalPresId]);



  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (sourceType === 'pdf' && ext !== 'pdf') {
      toast({ title: 'Invalid file', description: 'Please upload a PDF file.', variant: 'destructive' });
      return;
    }
    if (sourceType === 'docx') {
      if (ext === 'doc') {
        toast({ title: 'Unsupported format', description: 'Please convert your .doc file to .docx format and try again.', variant: 'destructive' });
        return;
      }
      if (ext !== 'docx') {
        toast({ title: 'Invalid file', description: 'Please upload a .docx file.', variant: 'destructive' });
        return;
      }
    }
    if (sourceType === 'txt' && ext !== 'txt') {
      toast({ title: 'Invalid file', description: 'Please upload a .txt file.', variant: 'destructive' });
      return;
    }
    setFile(f);
  };

  const resetForm = () => {
    setSettings({ ...defaultSettings });
    setSourceType('topic');
    setSourceContent('');
    setFile(null);
    setStep(0);
  };



  const renderLibrary = () => (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={embedded ? 'space-y-4' : 'px-4 pt-12 pb-24'}>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold font-display" data-testid="text-presentations-title" data-tour="generator-header">Presentations</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-toggle-view-mode"
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </button>
          <Button
            size="sm"
            onClick={() => { resetForm(); setView('create'); }}
            className="rounded-xl gap-1.5"
            data-testid="button-new-presentation"
            data-tour="generator-create"
          >
            <Plus className="w-4 h-4" /> New
          </Button>
        </div>
      </div>

      {presentations.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-16 px-4 text-center glass rounded-2xl border-dashed border-2 border-border/50"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <PresentationIcon className="w-8 h-8 text-primary/50" />
          </div>
          <h3 className="text-lg font-semibold mb-1" data-testid="text-no-presentations">No presentations yet</h3>
          <p className="text-sm text-muted-foreground max-w-[250px] mb-6">Create your first presentation from a topic, notes, PDF, or Word document.</p>
          <Button onClick={() => { resetForm(); setView('create'); }} size="sm" className="rounded-xl" data-testid="button-create-first-presentation">
            <Plus className="w-4 h-4 mr-1" /> Create Presentation
          </Button>
        </motion.div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-3' : 'flex flex-col gap-3'}>
          <AnimatePresence>
            {presentations.map((pres, i) => {
              const theme = getTheme(pres.themeId);
              return (
                <motion.div
                  key={pres.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass rounded-2xl overflow-hidden"
                  data-testid={`card-presentation-${pres.id}`}
                >
                  <div className="h-2 w-full" style={{ background: theme.preview }} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm truncate" data-testid={`text-title-${pres.id}`}>{pres.settings.title}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium">{theme.name}</span>
                          <span className="text-[10px] text-muted-foreground">{pres.slideCount} slides</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(pres.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-3">
                      <Button size="sm" variant="secondary" className="rounded-lg text-xs h-8 px-2 flex-1" data-testid={`button-edit-${pres.id}`}
                        onClick={() => { setEditingPresentation(pres); setEditingSlideIdx(0); setView('editor'); }}>
                        <Edit3 className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="secondary" className="rounded-lg text-xs h-8 px-2 flex-1 bg-primary/20 text-primary hover:bg-primary/30" data-testid={`button-present-${pres.id}`}
                        onClick={() => { setEditingPresentation(pres); setPresentingSlideIdx(0); setPresenting(true); setView('editor'); }}>
                        <Play className="w-3 h-3 mr-1" /> Play
                      </Button>
                      <Button size="sm" variant="secondary" className="rounded-lg text-[10px] sm:text-xs h-8 px-1.5 flex-1" disabled={exporting === pres.id}
                        data-testid={`button-export-${pres.id}`} onClick={() => handleExport(pres)}>
                        {exporting === pres.id ? <Loader2 className="w-3 h-3 mr-0.5 animate-spin" /> : <Download className="w-3 h-3 mr-0.5" />}
                        PPTX
                      </Button>
                      <Button size="sm" variant="ghost" className="rounded-lg text-xs h-8 w-8 p-0 flex-shrink-0" data-testid={`button-add-study-${pres.id}`}
                        onClick={() => handleAddToStudyPlanner(pres.id)} title="Add to Study Planner">
                        <BookOpen className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="rounded-lg text-xs h-8 w-8 p-0 flex-shrink-0"
                        onClick={() => setMediaModalPresId(pres.id)} title="Generate Audio">
                        <Headphones className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="rounded-lg text-xs h-8 w-8 p-0 flex-shrink-0 text-violet-400 hover:text-violet-300"
                        onClick={() => openVideoCreator(pres)} title="Create Video in Video Studio"
                        data-tour="generator-create-video">
                        <Film className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="rounded-lg text-xs h-8 w-8 p-0 flex-shrink-0" data-testid={`button-duplicate-${pres.id}`}
                        onClick={() => handleDuplicate(pres.id)}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="rounded-lg text-xs h-8 w-8 p-0 text-destructive flex-shrink-0"
                        data-testid={`button-delete-${pres.id}`} onClick={() => handleDelete(pres.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );

  const renderCreateForm = () => {
    const steps = [
      { label: 'Source', icon: FileText },
      { label: 'Details', icon: SlidersHorizontal },
      { label: 'Theme', icon: Palette },
      { label: 'Review', icon: Eye },
    ];

    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={embedded ? 'space-y-4' : 'px-4 pt-12 pb-24'}>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('library')} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back-to-library">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold font-display">New Presentation</h1>
        </div>

        <div className="flex items-center justify-between mb-6 px-2">
          {steps.map((s, i) => (
            <button key={i} onClick={() => setStep(i)} className="flex flex-col items-center gap-1" data-testid={`button-step-${i}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all text-xs font-semibold ${i === step ? 'bg-primary text-primary-foreground' :
                i < step ? 'bg-primary/20 text-primary' :
                  'bg-secondary text-muted-foreground'
                }`}>
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : <s.icon className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-[10px] font-medium ${i === step ? 'text-primary' : 'text-muted-foreground'}`}>{s.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Content Source</label>
                <div className="grid grid-cols-1 gap-2">
                  {sourceTypes.map(st => (
                    <button key={st.value} onClick={() => { setSourceType(st.value); setFile(null); setSourceContent(''); }}
                      data-testid={`button-source-${st.value}`}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${sourceType === st.value ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/30'
                        }`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${sourceType === st.value ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
                        }`}>
                        <st.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{st.label}</p>
                        <p className="text-[11px] text-muted-foreground">{st.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {sourceType === 'text' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Paste your content</label>
                  <textarea value={sourceContent} onChange={e => setSourceContent(e.target.value)}
                    placeholder="Paste your notes, text, or content here..."
                    data-testid="input-source-text"
                    className="w-full h-32 bg-secondary/30 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border/50"
                  />
                </div>
              )}

              {(sourceType === 'pdf' || sourceType === 'docx' || sourceType === 'txt') && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Upload {sourceType.toUpperCase()} file</label>
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border/50 rounded-xl cursor-pointer hover:border-primary/40 transition-colors" data-testid="input-file-upload">
                    {file ? (
                      <div className="text-center">
                        <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
                        <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Tap to select file</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">Max 20MB</p>
                      </div>
                    )}
                    <input type="file" className="hidden" accept={sourceType === 'pdf' ? '.pdf' : sourceType === 'docx' ? '.docx' : '.txt'} onChange={handleFileUpload} />
                  </label>
                </div>
              )}
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title *</label>
                <input value={settings.title} onChange={e => setSettings(s => ({ ...s, title: e.target.value }))}
                  placeholder="Presentation title" data-testid="input-title"
                  className="w-full bg-secondary/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border/50" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subtitle</label>
                <input value={settings.subtitle} onChange={e => setSettings(s => ({ ...s, subtitle: e.target.value }))}
                  placeholder="Optional subtitle" data-testid="input-subtitle"
                  className="w-full bg-secondary/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border/50" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Target Audience</label>
                <input value={settings.targetAudience} onChange={e => setSettings(s => ({ ...s, targetAudience: e.target.value }))}
                  placeholder="e.g., Investors, Students, Team" data-testid="input-audience"
                  className="w-full bg-secondary/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border/50" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Purpose</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {purposes.map(p => (
                    <button key={p.value} onClick={() => setSettings(s => ({ ...s, purpose: p.value }))}
                      data-testid={`button-purpose-${p.value}`}
                      className={`px-2 py-2 rounded-lg text-[11px] font-medium transition-all ${settings.purpose === p.value ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                        }`}>{p.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Number of Slides: {settings.slideCount}</label>
                <input type="range" min={3} max={40} value={settings.slideCount}
                  onChange={e => setSettings(s => ({ ...s, slideCount: parseInt(e.target.value) }))}
                  className="w-full accent-primary" data-testid="input-slide-count" />
                <div className="flex justify-between text-[10px] text-muted-foreground"><span>3</span><span>20</span><span>40</span></div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Style / Tone</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {tones.map(t => (
                    <button key={t.value} onClick={() => setSettings(s => ({ ...s, tone: t.value }))}
                      data-testid={`button-tone-${t.value}`}
                      className={`px-2 py-2 rounded-lg text-[11px] font-medium transition-all ${settings.tone === t.value ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                        }`}>{t.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Layout Preference</label>
                <div className="grid grid-cols-3 gap-2">
                  {layoutPrefs.map(lp => (
                    <button key={lp.value} onClick={() => setSettings(s => ({ ...s, layoutPreference: lp.value }))}
                      data-testid={`button-layout-${lp.value}`}
                      className={`p-2.5 rounded-xl text-center border transition-all ${settings.layoutPreference === lp.value ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/30'
                        }`}>
                      <p className="text-[11px] font-medium">{lp.label}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{lp.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'includeCover', label: 'Cover Slide' },
                  { key: 'includeAgenda', label: 'Agenda Slide' },
                  { key: 'includeSummary', label: 'Summary Slide' },
                  { key: 'includeClosing', label: 'Thank You Slide' },
                ].map(opt => (
                  <button key={opt.key}
                    onClick={() => setSettings(s => ({ ...s, [opt.key]: !s[opt.key as keyof PresentationSettings] }))}
                    data-testid={`button-toggle-${opt.key}`}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${settings[opt.key as keyof PresentationSettings] ? 'border-primary/50 bg-primary/5' : 'border-border/50'
                      }`}>
                    <div className={`w-4 h-4 rounded flex items-center justify-center ${settings[opt.key as keyof PresentationSettings] ? 'bg-primary' : 'bg-secondary'
                      }`}>
                      {settings[opt.key as keyof PresentationSettings] && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="text-[11px] font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block" data-tour="generator-themes">Choose Theme</label>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {presentationThemes.map(theme => (
                    <button key={theme.id} onClick={() => setSettings(s => ({ ...s, themeId: theme.id }))}
                      data-testid={`button-theme-${theme.id}`}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${settings.themeId === theme.id ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/30'
                        }`}>
                      <div className="w-12 h-12 rounded-lg flex-shrink-0" style={{ background: theme.preview }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{theme.name}</p>
                        <p className="text-[11px] text-muted-foreground">{theme.description}</p>
                      </div>
                      {settings.themeId === theme.id && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Color Palette (Optional)</label>
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
                  <button onClick={() => setSettings(s => ({ ...s, selectedPalette: undefined }))}
                    data-testid="button-palette-none"
                    className={`p-2 rounded-xl border text-center transition-all ${!settings.selectedPalette ? 'border-primary bg-primary/5' : 'border-border/50'
                      }`}>
                    <span className="text-[11px] font-medium">Theme Default</span>
                  </button>
                  {presentationPalettes.map(pal => (
                    <button key={pal.id} onClick={() => setSettings(s => ({ ...s, selectedPalette: pal.id }))}
                      data-testid={`button-palette-${pal.id}`}
                      className={`p-2 rounded-xl border transition-all text-left ${settings.selectedPalette === pal.id ? 'border-primary bg-primary/5' : 'border-border/50'
                        }`}>
                      <div className="flex gap-0.5 mb-1">
                        {[pal.primary, pal.secondary, pal.accent].map((c, i) => (
                          <div key={i} className="w-4 h-4 rounded" style={{ backgroundColor: c.startsWith('#') ? c : `#${c}` }} />
                        ))}
                      </div>
                      <p className="text-[10px] font-medium truncate">{pal.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="glass rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-semibold">Review Your Settings</h3>
                <div className="space-y-2 text-[12px]">
                  <div className="flex justify-between"><span className="text-muted-foreground">Title</span><span className="font-medium truncate ml-4 max-w-[60%] text-right">{settings.title || '(not set)'}</span></div>
                  {settings.subtitle && <div className="flex justify-between"><span className="text-muted-foreground">Subtitle</span><span className="font-medium truncate ml-4 max-w-[60%] text-right">{settings.subtitle}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span className="font-medium capitalize">{sourceType}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Purpose</span><span className="font-medium capitalize">{settings.purpose}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Slides</span><span className="font-medium">{settings.slideCount}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tone</span><span className="font-medium capitalize">{settings.tone}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Theme</span><span className="font-medium">{getTheme(settings.themeId).name}</span></div>
                  {settings.selectedPalette && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Palette</span><span className="font-medium">{getPalette(settings.selectedPalette)?.name || 'Default'}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-muted-foreground">Layout</span><span className="font-medium capitalize">{settings.layoutPreference}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Special Slides</span>
                    <span className="font-medium text-right">
                      {[settings.includeCover && 'Cover', settings.includeAgenda && 'Agenda', settings.includeSummary && 'Summary', settings.includeClosing && 'Closing'].filter(Boolean).join(', ') || 'None'}
                    </span>
                  </div>
                </div>

                {isDemoMode ? (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[11px] text-amber-500 font-medium">AI disabled in demo mode — using fallback engine</span>
                  </div>
                ) : isPresentationAIAvailable() && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] text-primary font-medium">AI-powered generation enabled</span>
                  </div>
                )}
              </div>

              <Button className="w-full rounded-xl h-12 text-sm font-semibold gap-2"
                onClick={handleGenerate} disabled={generating} data-testid="button-generate-presentation" data-tour="generator-ai">
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {generatingStatus || 'Generating...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Presentation
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mt-6">
          <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0} data-testid="button-prev-step">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < 3 && (
            <Button size="sm" className="rounded-xl" onClick={() => setStep(s => Math.min(3, s + 1))} data-testid="button-next-step">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </motion.div>
    );
  };

  const renderChartEditor = (slide: SlideContent) => {
    if (!slide.chartConfig) return null;
    const chart = slide.chartConfig;
    return (
      <div className="space-y-2">
        <div>
          <label className="text-[10px] text-muted-foreground mb-0.5 block">Chart Type</label>
          <div className="flex gap-1">
            {(['bar', 'line', 'pie', 'donut'] as const).map(t => (
              <button key={t} onClick={() => updateSlide(editingSlideIdx, { chartConfig: { ...chart, type: t } })}
                data-testid={`button-chart-type-${t}`}
                className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all ${chart.type === t ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'
                  }`}>{t}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-0.5 block">Chart Title</label>
          <input value={chart.title}
            onChange={e => updateSlide(editingSlideIdx, { chartConfig: { ...chart, title: e.target.value } })}
            data-testid="input-chart-title"
            className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-xs border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-0.5 block">Labels (comma-separated)</label>
          <input value={chart.labels.join(', ')}
            onChange={e => updateSlide(editingSlideIdx, { chartConfig: { ...chart, labels: e.target.value.split(',').map(s => s.trim()) } })}
            data-testid="input-chart-labels"
            className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-xs border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        {chart.datasets.map((ds, di) => (
          <div key={di}>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Dataset {di + 1}: {ds.label} (values comma-separated)</label>
            <input value={ds.values.join(', ')}
              onChange={e => {
                const newDs = [...chart.datasets];
                newDs[di] = { ...ds, values: e.target.value.split(',').map(v => parseFloat(v.trim()) || 0) };
                updateSlide(editingSlideIdx, { chartConfig: { ...chart, datasets: newDs } });
              }}
              data-testid={`input-chart-values-${di}`}
              className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-xs border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        ))}
      </div>
    );
  };

  const renderTableEditor = (slide: SlideContent) => {
    if (!slide.tableConfig) return null;
    const tbl = slide.tableConfig;
    
    const setCell = (rowIdx: number, colIdx: number, val: string) => {
      const newRows = [...tbl.rows];
      newRows[rowIdx] = [...newRows[rowIdx]];
      newRows[rowIdx][colIdx] = val;
      updateSlide(editingSlideIdx, { tableConfig: { ...tbl, rows: newRows } });
    };

    const setHeader = (colIdx: number, val: string) => {
      const newHeaders = [...tbl.headers];
      newHeaders[colIdx] = val;
      updateSlide(editingSlideIdx, { tableConfig: { ...tbl, headers: newHeaders } });
    };

    const addRow = () => {
      const newRows = [...tbl.rows, Array(tbl.headers.length).fill('')];
      updateSlide(editingSlideIdx, { tableConfig: { ...tbl, rows: newRows } });
    };

    const removeRow = (idx: number) => {
      if (tbl.rows.length <= 1) return;
      const newRows = tbl.rows.filter((_, i) => i !== idx);
      updateSlide(editingSlideIdx, { tableConfig: { ...tbl, rows: newRows } });
    };

    const addCol = () => {
      const newHeaders = [...tbl.headers, `Col ${tbl.headers.length + 1}`];
      const newRows = tbl.rows.map(r => [...r, '']);
      updateSlide(editingSlideIdx, { tableConfig: { ...tbl, headers: newHeaders, rows: newRows } });
    };

    const removeCol = (idx: number) => {
      if (tbl.headers.length <= 1) return;
      const newHeaders = tbl.headers.filter((_, i) => i !== idx);
      const newRows = tbl.rows.map(r => r.filter((_, i) => i !== idx));
      updateSlide(editingSlideIdx, { tableConfig: { ...tbl, headers: newHeaders, rows: newRows } });
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-muted-foreground font-semibold">Grid Editor</label>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={addCol} className="h-6 text-[9px] px-1.5">+ Col</Button>
            <Button variant="outline" size="sm" onClick={addRow} className="h-6 text-[9px] px-1.5">+ Row</Button>
          </div>
        </div>
        
        <div className="overflow-x-auto border border-border/30 rounded-lg">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-secondary/50">
                {tbl.headers.map((h, i) => (
                  <th key={i} className="p-1 border-b border-border/30 font-bold min-w-[60px]">
                    <div className="flex flex-col gap-1">
                      <input 
                        value={h} 
                        onChange={e => setHeader(i, e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 text-center font-bold p-0"
                      />
                      <button onClick={() => removeCol(i)} className="text-[8px] text-red-400 hover:text-red-500">del</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tbl.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/10">
                  {row.map((cell, ci) => (
                    <td key={ci} className="p-1 border-r border-border/10">
                      <input 
                        value={cell} 
                        onChange={e => setCell(ri, ci, e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-[10px]"
                      />
                    </td>
                  ))}
                  <td className="p-1 w-8 text-center">
                    <button onClick={() => removeRow(ri)} className="text-red-400 hover:text-red-500">
                      <Trash2 className="w-3 h-3 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTimelineEditor = (slide: SlideContent) => {
    if (!slide.timelineConfig) return null;
    return (
      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground block">Timeline Items</label>
        {slide.timelineConfig.items.map((item, i) => (
          <div key={i} className="flex gap-1">
            <input value={item.date}
              onChange={e => {
                const items = [...slide.timelineConfig!.items];
                items[i] = { ...item, date: e.target.value };
                updateSlide(editingSlideIdx, { timelineConfig: { items } });
              }}
              placeholder="Date" data-testid={`input-timeline-date-${i}`}
              className="w-20 bg-secondary/30 rounded-lg px-2 py-1 text-[10px] border border-border/50 focus:outline-none" />
            <input value={item.title}
              onChange={e => {
                const items = [...slide.timelineConfig!.items];
                items[i] = { ...item, title: e.target.value };
                updateSlide(editingSlideIdx, { timelineConfig: { items } });
              }}
              placeholder="Title" data-testid={`input-timeline-title-${i}`}
              className="flex-1 bg-secondary/30 rounded-lg px-2 py-1 text-[10px] border border-border/50 focus:outline-none" />
            <button onClick={() => {
              const items = slide.timelineConfig!.items.filter((_, idx) => idx !== i);
              updateSlide(editingSlideIdx, { timelineConfig: { items } });
            }} className="text-destructive px-1" data-testid={`button-remove-timeline-${i}`}>
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <Button size="sm" variant="ghost" className="rounded-lg text-[10px] h-6" data-testid="button-add-timeline-item"
          onClick={() => {
            const items = [...slide.timelineConfig!.items, { date: '', title: '', description: '' }];
            updateSlide(editingSlideIdx, { timelineConfig: { items } });
          }}>
          <Plus className="w-3 h-3 mr-1" /> Add Item
        </Button>
      </div>
    );
  };

  const renderKpiEditor = (slide: SlideContent) => {
    if (!slide.kpiConfig) return null;
    return (
      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground block">KPI Items</label>
        {slide.kpiConfig.items.map((item, i) => (
          <div key={i} className="flex gap-1">
            <input value={item.value}
              onChange={e => {
                const items = [...slide.kpiConfig!.items];
                items[i] = { ...item, value: e.target.value };
                updateSlide(editingSlideIdx, { kpiConfig: { items } });
              }}
              placeholder="Value" data-testid={`input-kpi-value-${i}`}
              className="w-20 bg-secondary/30 rounded-lg px-2 py-1 text-[10px] border border-border/50 focus:outline-none" />
            <input value={item.label}
              onChange={e => {
                const items = [...slide.kpiConfig!.items];
                items[i] = { ...item, label: e.target.value };
                updateSlide(editingSlideIdx, { kpiConfig: { items } });
              }}
              placeholder="Label" data-testid={`input-kpi-label-${i}`}
              className="flex-1 bg-secondary/30 rounded-lg px-2 py-1 text-[10px] border border-border/50 focus:outline-none" />
            <button onClick={() => {
              const items = slide.kpiConfig!.items.filter((_, idx) => idx !== i);
              updateSlide(editingSlideIdx, { kpiConfig: { items } });
            }} className="text-destructive px-1" data-testid={`button-remove-kpi-${i}`}>
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <Button size="sm" variant="ghost" className="rounded-lg text-[10px] h-6" data-testid="button-add-kpi-item"
          onClick={() => {
            const items = [...slide.kpiConfig!.items, { label: '', value: '' }];
            updateSlide(editingSlideIdx, { kpiConfig: { items } });
          }}>
          <Plus className="w-3 h-3 mr-1" /> Add KPI
        </Button>
      </div>
    );
  };

  const renderEditor = () => {
    if (!editingPresentation) return null;
    const currentSlide = editingPresentation.slides[editingSlideIdx];
    if (!currentSlide) return null;
    const theme = getTheme(editingPresentation.themeId);
    const slideImages = currentSlide.images || [];

    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={embedded ? 'space-y-4' : 'px-4 pt-12 pb-24'}>
        <input ref={imageInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/bmp" onChange={handleImageUpload} />

        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => { handleSaveEdits(); setView('library'); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back-from-editor">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                autoFocus
                className="text-lg font-bold font-display w-full bg-transparent border-b border-primary/50 focus:outline-none focus:border-primary"
                value={editingPresentation.settings.title}
                onChange={e => setEditingPresentation(prev => prev ? { ...prev, settings: { ...prev.settings, title: e.target.value } } : null)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => { if (e.key === 'Enter') setEditingTitle(false); }}
                data-testid="input-editor-title"
              />
            ) : (
              <h1 className="text-lg font-bold font-display truncate cursor-pointer hover:text-primary/80 transition-colors"
                onClick={() => setEditingTitle(true)} data-testid="text-editor-title" title="Click to edit title">
                {editingPresentation.settings.title}
                <Edit3 className="w-3 h-3 inline ml-1.5 text-muted-foreground" />
              </h1>
            )}
            <p className="text-[10px] text-muted-foreground">{editingPresentation.slides.length} slides &middot; {theme.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 pr-2">
          <Button size="sm" variant="secondary" className="rounded-lg text-[11px] h-7 flex-shrink-0" onClick={handleSaveEdits} data-testid="button-save-presentation">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Save
          </Button>
          <Button size="sm" variant="secondary" className="rounded-lg text-[11px] h-7 flex-shrink-0 bg-primary/20 text-primary hover:bg-primary/30"
            onClick={() => { setPresentingSlideIdx(editingSlideIdx); setPresenting(true); }} data-testid="button-present-editor">
            <Play className="w-3 h-3 mr-1" /> Present
          </Button>
          <Button size="sm" variant="secondary" className="rounded-lg text-[11px] h-7 flex-shrink-0"
            disabled={exporting === editingPresentation.id} onClick={() => handleExport(editingPresentation)} data-testid="button-export-editor" data-tour="generator-export">
            {exporting === editingPresentation.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
            Export
          </Button>
          <Button size="sm" variant="secondary" className="rounded-lg text-[11px] h-7 flex-shrink-0"
            onClick={() => setShowRegenPanel(!showRegenPanel)} data-testid="button-toggle-regen">
            <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
            {showRegenPanel ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
          </Button>
          <Button size="sm" variant="secondary" className="rounded-lg text-[11px] h-7 flex-shrink-0" onClick={() => addSlideAfter(editingSlideIdx)} data-testid="button-add-slide">
            <Plus className="w-3 h-3 mr-1" /> Slide
          </Button>
          <Button size="sm" variant="secondary" className="rounded-lg text-[11px] h-7 flex-shrink-0" onClick={() => handleAddToStudyPlanner(editingPresentation.id)} data-testid="button-add-to-study-editor">
            <BookOpen className="w-3 h-3 mr-1" /> Study
          </Button>
          <Button size="sm" variant="secondary" className="rounded-lg text-[11px] h-7 flex-shrink-0 bg-violet-500/20 text-violet-300 hover:bg-violet-500/30"
            onClick={() => openVideoCreator(editingPresentation)} data-testid="button-create-video-editor">
            <Film className="w-3 h-3 mr-1" /> Video
          </Button>
        </div>

        {showRegenPanel && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="glass rounded-2xl p-3 mb-4 space-y-2">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Regeneration Options</h4>
            {regenerating && (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-[11px] text-muted-foreground">Regenerating...</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              <Button size="sm" variant="ghost" className="rounded-lg text-[10px] h-7 justify-start" disabled={regenerating}
                onClick={handleRegenerateAll} data-testid="button-regen-all">
                <RotateCcw className="w-3 h-3 mr-1" /> Whole Deck
              </Button>
              <Button size="sm" variant="ghost" className="rounded-lg text-[10px] h-7 justify-start" disabled={regenerating}
                onClick={handleRegenerateCurrentSlide} data-testid="button-regen-slide">
                <RefreshCw className="w-3 h-3 mr-1" /> This Slide
              </Button>
              <Button size="sm" variant="ghost" className="rounded-lg text-[10px] h-7 justify-start col-span-2" disabled={regenerating}
                onClick={handleRegenerateNotes} data-testid="button-regen-notes">
                <MessageSquare className="w-3 h-3 mr-1" /> Notes Only
              </Button>
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground mb-1 block">Regenerate with style:</label>
              <div className="flex flex-wrap gap-1">
                {regenStyles.map(rs => (
                  <button key={rs.value} disabled={regenerating}
                    onClick={() => handleRegenerateWithStyle(rs.value)}
                    data-testid={`button-regen-style-${rs.value}`}
                    className="px-2 py-1 rounded-md text-[9px] font-medium bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-50">
                    {rs.label}
                  </button>
                ))}
              </div>
            </div>
            {(isDemoMode || !isPresentationAIAvailable()) && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-500">
                <AlertTriangle className="w-3 h-3" />
                <span>{isDemoMode ? 'AI features disabled in demo mode.' : 'AI key not set. Regeneration uses fallback engine.'}</span>
              </div>
            )}
          </motion.div>
        )}

        <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
          {editingPresentation.slides.map((s, i) => (
            <button key={s.id} onClick={() => { setEditingSlideIdx(i); setEditingImageId(null); }}
              data-testid={`button-slide-nav-${i}`}
              className={`flex-shrink-0 w-16 h-10 rounded-lg border text-[9px] font-medium flex items-center justify-center transition-all ${i === editingSlideIdx ? 'border-primary bg-primary/10 text-primary' : 'border-border/40 text-muted-foreground hover:border-primary/30'
                }`}>
              {i + 1}
            </button>
          ))}
        </div>

        <div ref={previewRef} className="rounded-xl p-4 mb-4 min-h-[180px] relative overflow-hidden select-none touch-pan-y"
          style={{ background: theme.gradientCover ? `linear-gradient(135deg, #${theme.bgColor} 0%, #${theme.bgColorAlt} 100%)` : `#${theme.bgColor}`, color: `#${theme.titleColor}` }}
          data-testid="slide-preview"
          onTouchStart={(e) => {
            const touch = e.touches[0];
            (previewRef.current as any).__swipeStartX = touch.clientX;
            (previewRef.current as any).__swipeStartY = touch.clientY;
          }}
          onTouchEnd={(e) => {
            const ref = previewRef.current as any;
            if (ref?.__swipeStartX == null) return;
            const touch = e.changedTouches[0];
            const dx = touch.clientX - ref.__swipeStartX;
            const dy = touch.clientY - ref.__swipeStartY;
            ref.__swipeStartX = null;
            ref.__swipeStartY = null;
            if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx)) return;
            if (dx < 0 && editingSlideIdx < (editingPresentation?.slides.length || 1) - 1) {
              setEditingSlideIdx(editingSlideIdx + 1);
              setEditingImageId(null);
            } else if (dx > 0 && editingSlideIdx > 0) {
              setEditingSlideIdx(editingSlideIdx - 1);
              setEditingImageId(null);
            }
          }}>
          {/* Accent stripe decoration */}
          {theme.shapeAccent && (
            <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none rounded-tl-xl rounded-tr-xl" style={{ height: '3px', backgroundColor: `#${theme.accentColor}` }} />
          )}
          {theme.gradientCover && (
            <div className="absolute top-0 right-0 z-0 pointer-events-none" style={{
              width: '80px', height: '80px',
              background: `radial-gradient(circle at top right, #${theme.accentColor}28 0%, transparent 70%)`,
            }} />
          )}
          {(() => {
            const ts = currentSlide.textStyle || {};
            const titleStyle: Record<string, string | number | undefined> = {
              color: ts.titleColor || `#${theme.titleColor}`,
              fontWeight: (ts.titleBold === 'bold' || !ts.titleBold) ? 'bold' : 'normal',
              fontStyle: ts.titleItalic === 'italic' ? 'italic' : 'normal',
              textAlign: ts.titleAlign || 'left',
              fontFamily: ts.titleFontFamily || theme.titleFont,
              fontSize: ts.titleFontSize ? `${Math.min(ts.titleFontSize * 0.45, 18)}px` : '14px',
            };
            const bodyStyle: Record<string, string | number | undefined> = {
              color: ts.bodyColor || `#${theme.bodyColor}`,
              fontWeight: ts.bodyBold === 'bold' ? 'bold' : 'normal',
              fontStyle: ts.bodyItalic === 'italic' ? 'italic' : 'normal',
              textAlign: ts.bodyAlign || 'left',
              fontFamily: ts.bodyFontFamily || theme.bodyFont,
            };
            const bulletStyle: Record<string, string | number | undefined> = {
              ...bodyStyle,
              color: ts.bulletColor || ts.bodyColor || `#${theme.bodyColor}`,
            };
            const accentColor = ts.accentColor || `#${theme.accentColor}`;
            const textWidthPct = getTextAreaWidth(currentSlide.layout, slideImages);
            const textWidthStyle = textWidthPct < 100 ? { maxWidth: `${textWidthPct}%` } : {};
            const hasVis = !!(currentSlide.chartConfig || currentSlide.tableConfig || currentSlide.timelineConfig || currentSlide.kpiConfig);
            return (
              <>
                {/* Text zone — capped height when visual data is present */}
                {/* Text zone — absolute if custom pos, otherwise relative with layout defaults */}
                <div 
                  className={`absolute transition-shadow ${dragState?.targetId === 'text' && dragState?.mode === 'move' ? 'cursor-grabbing' : 'cursor-grab'} z-[5] bg-card/5 backdrop-blur-[1px] rounded-lg p-1`}
                  style={{
                    left: `${currentSlide.textX ?? 0}%`,
                    top: `${currentSlide.textY ?? 0}%`,
                    width: `${currentSlide.textWidth ?? textWidthPct}%`,
                    height: `${currentSlide.textHeight ?? (hasVis ? 52 : 100)}%`,
                  }}
                  onMouseDown={(e) => startDrag(e, 'text', 'text', 'move')}
                  onTouchStart={(e) => startDrag(e, 'text', 'text', 'move')}
                >
                  <div className="w-full h-full overflow-hidden">
                    <p className="text-sm" style={titleStyle}>{renderTextWithBreaks(currentSlide.title)}</p>
                    {currentSlide.subtitle && <p className="text-[11px] mt-1 opacity-70" style={bodyStyle}>{renderTextWithBreaks(currentSlide.subtitle)}</p>}
                    {currentSlide.bullets && currentSlide.bullets.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {currentSlide.bullets.map((b, i) => (
                          <li key={i} className="text-[10px] opacity-80 flex items-start gap-1" style={bulletStyle}>
                            <span className="mt-0.5">&#8226;</span> <span>{renderTextWithBreaks(b)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {currentSlide.statement && <p className="text-xs mt-2 opacity-80" style={{ ...titleStyle, fontSize: '12px' }}>{renderTextWithBreaks(currentSlide.statement)}</p>}
                    {currentSlide.leftColumn && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          {currentSlide.leftLabel && <p className="text-[9px] font-bold mb-0.5" style={{ color: accentColor }}>{currentSlide.leftLabel}</p>}
                          {currentSlide.leftColumn.map((item, i) => (
                            <p key={i} className="text-[9px] opacity-70" style={bulletStyle}>&#8226; {renderTextWithBreaks(item)}</p>
                          ))}
                        </div>
                        <div>
                          {currentSlide.rightLabel && <p className="text-[9px] font-bold mb-0.5" style={{ color: accentColor }}>{currentSlide.rightLabel}</p>}
                          {(currentSlide.rightColumn || []).map((item, i) => (
                            <p key={i} className="text-[9px] opacity-70" style={bulletStyle}>&#8226; {renderTextWithBreaks(item)}</p>
                          ))}
                        </div>
                      </div>
                    )}
                    {currentSlide.agendaItems && (
                      <div className="mt-2 space-y-0.5">
                        {currentSlide.agendaItems.map((item, i) => (
                          <p key={i} className="text-[10px] opacity-70" style={bodyStyle}>
                            <span className="font-bold mr-1" style={{ color: accentColor }}>{String(i + 1).padStart(2, '0')}</span>
                            {item}
                          </p>
                        ))}
                      </div>
                    )}
                    {currentSlide.summaryPoints && (
                      <div className="mt-2 space-y-0.5">
                        {currentSlide.summaryPoints.map((point, i) => (
                          <p key={i} className="text-[10px] opacity-70 flex items-center gap-1" style={bodyStyle}>
                            <span className="w-3 h-3 rounded-full flex items-center justify-center text-[7px] text-white font-bold flex-shrink-0"
                              style={{ backgroundColor: accentColor }}>{i + 1}</span>
                            {point}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Resize handle for text zone */}
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-sm cursor-se-resize z-20 border border-white"
                    onMouseDown={(e) => startDrag(e, 'text', 'text', 'resize')}
                    onTouchStart={(e) => startDrag(e, 'text', 'text', 'resize')}
                  />
                </div>
                {/* Visual data zone — always below text, never overlapping */}
                {hasVis && (
                  <div 
                    className={`absolute transition-shadow ${dragState?.visualType !== 'image' && dragState?.mode === 'move' ? 'cursor-grabbing' : 'cursor-grab'} z-[5] bg-card/10 backdrop-blur-[2px] rounded-lg`}
                    style={{
                      left: `${currentSlide.chartConfig?.x ?? currentSlide.tableConfig?.x ?? currentSlide.timelineConfig?.x ?? currentSlide.kpiConfig?.x ?? 0}%`,
                      top: `${currentSlide.chartConfig?.y ?? currentSlide.tableConfig?.y ?? currentSlide.timelineConfig?.y ?? currentSlide.kpiConfig?.y ?? 55}%`,
                      width: `${currentSlide.chartConfig?.width ?? currentSlide.tableConfig?.width ?? currentSlide.timelineConfig?.width ?? currentSlide.kpiConfig?.width ?? 100}%`,
                      height: `${currentSlide.chartConfig?.height ?? currentSlide.tableConfig?.height ?? currentSlide.timelineConfig?.height ?? currentSlide.kpiConfig?.height ?? 40}%`,
                    }}
                    onMouseDown={(e) => {
                      const type = currentSlide.chartConfig ? 'chart' : currentSlide.tableConfig ? 'table' : currentSlide.timelineConfig ? 'timeline' : 'kpi';
                      startDrag(e, 'vis', type, 'move');
                    }}
                    onTouchStart={(e) => {
                      const type = currentSlide.chartConfig ? 'chart' : currentSlide.tableConfig ? 'table' : currentSlide.timelineConfig ? 'timeline' : 'kpi';
                      startDrag(e, 'vis', type, 'move');
                    }}
                  >
                    <div className="w-full h-full overflow-hidden p-2">
                       {renderSlidePreviewContent(currentSlide, theme)}
                    </div>
                    {/* Resize handle for visuals */}
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-sm cursor-se-resize z-20 border border-white"
                      onMouseDown={(e) => {
                        const type = currentSlide.chartConfig ? 'chart' : currentSlide.tableConfig ? 'table' : currentSlide.timelineConfig ? 'timeline' : 'kpi';
                        startDrag(e, 'vis', type, 'resize');
                      }}
                      onTouchStart={(e) => {
                        const type = currentSlide.chartConfig ? 'chart' : currentSlide.tableConfig ? 'table' : currentSlide.timelineConfig ? 'timeline' : 'kpi';
                        startDrag(e, 'vis', type, 'resize');
                      }}
                    />
                  </div>
                )}
              </>
            );
          })()}

          {slideImages.map(img => (
            <div key={img.id}
              className={`absolute transition-shadow ${dragState?.targetId === img.id ? 'cursor-grabbing' : 'cursor-grab'} ${editingImageId === img.id ? 'ring-2 ring-blue-400 z-10' : 'z-[5]'}`}
              style={{
                left: `${img.x}%`, top: `${img.y}%`, width: `${img.width}%`, height: `${img.height}%`,
                borderRadius: `${img.borderRadius}px`, opacity: img.opacity / 100,
              }}
              onMouseDown={(e) => startDrag(e, img.id, 'image', 'move')}
              onTouchStart={(e) => startDrag(e, img.id, 'image', 'move')}
              onClick={(e) => { e.stopPropagation(); setEditingImageId(img.id); }}
              data-testid={`image-box-${img.id}`}>
              {img.dataUrl ? (
                <img src={img.dataUrl} alt={img.label} className="w-full h-full pointer-events-none" draggable={false}
                  style={{ objectFit: img.fit, borderRadius: `${img.borderRadius}px` }} />
              ) : (
                <div className="w-full h-full border-2 border-dashed flex flex-col items-center justify-center gap-1"
                  style={{
                    borderColor: theme.darkTheme ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)',
                    backgroundColor: theme.darkTheme ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    borderRadius: `${img.borderRadius}px`,
                  }}>
                  <ImagePlus className="w-5 h-5" style={{ color: theme.darkTheme ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)' }} />
                  <span className="text-[8px] font-medium" style={{ color: theme.darkTheme ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)' }}>
                    {img.label || 'Click to add image'}
                  </span>
                  <button
                    className="mt-0.5 px-2 py-0.5 rounded text-[7px] font-semibold transition-colors"
                    style={{
                      backgroundColor: theme.darkTheme ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                      color: theme.darkTheme ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
                    }}
                    onClick={(e) => { e.stopPropagation(); triggerImageUpload(img.id); }}
                    data-testid={`button-upload-placeholder-${img.id}`}>
                    Upload
                  </button>
                </div>
              )}
              {editingImageId === img.id && (
                <>
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-sm cursor-se-resize z-20 border border-white"
                  onMouseDown={(e) => startDrag(e, img.id, 'image', 'resize')}
                  onTouchStart={(e) => startDrag(e, img.id, 'image', 'resize')}
                  data-testid={`handle-resize-${img.id}`} />
                  <button className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold z-20 hover:bg-red-600"
                    onClick={(e) => { e.stopPropagation(); removeImage(editingSlideIdx, img.id); }}
                    data-testid={`button-delete-image-preview-${img.id}`}>
                    &times;
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {currentSlide.speakerNotes !== undefined && (
          <div className="glass rounded-2xl p-3 mb-3">
            <button onClick={() => setShowNotesEditor(!showNotesEditor)}
              className="flex items-center justify-between w-full text-left" data-testid="button-toggle-notes">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider" data-tour="generator-notes">Speaker Notes</span>
              </div>
              {showNotesEditor ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
            {showNotesEditor && (
              <textarea
                value={currentSlide.speakerNotes || ''}
                onChange={e => updateSlide(editingSlideIdx, { speakerNotes: e.target.value })}
                placeholder="Speaker notes for this slide..."
                data-testid="input-speaker-notes"
                className="w-full h-20 mt-2 bg-secondary/30 rounded-lg px-3 py-2 text-[11px] resize-none border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            )}
          </div>
        )}

        <div className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider" data-tour="generator-editor">Edit Slide {editingSlideIdx + 1}</h3>

          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Layout</label>
            <select value={currentSlide.layout}
              onChange={e => {
                const newLayout = e.target.value as SlideLayoutType;
                const currentImages = currentSlide.images || [];
                const hasUploadedImages = currentImages.some(img => img.dataUrl);
                const updates: Partial<SlideContent> = { layout: newLayout };
                if (!hasUploadedImages) {
                  updates.images = generateImagePlaceholders(newLayout);
                }
                updateSlide(editingSlideIdx, updates);
              }}
              data-testid="select-layout"
              className="w-full bg-secondary/30 rounded-lg px-3 py-2 text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50">
              {Object.entries(layoutLabels).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Title</label>
            <input value={currentSlide.title}
              onChange={e => updateSlide(editingSlideIdx, { title: e.target.value })}
              data-testid="input-slide-title"
              className="w-full bg-secondary/30 rounded-lg px-3 py-2 text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>

          {(currentSlide.layout === 'cover' || currentSlide.layout === 'closing' || currentSlide.layout === 'section-divider') && (
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">Subtitle</label>
              <input value={currentSlide.subtitle || ''}
                onChange={e => updateSlide(editingSlideIdx, { subtitle: e.target.value })}
                data-testid="input-slide-subtitle"
                className="w-full bg-secondary/30 rounded-lg px-3 py-2 text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          )}

          {currentSlide.layout === 'big-statement' && (
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">Statement</label>
              <textarea value={currentSlide.statement || ''}
                onChange={e => updateSlide(editingSlideIdx, { statement: e.target.value })}
                data-testid="input-slide-statement"
                className="w-full h-20 bg-secondary/30 rounded-lg px-3 py-2 text-sm resize-none border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          )}

          {(currentSlide.bullets !== undefined || ['title-bullets', 'image-text', 'recommendations', 'process'].includes(currentSlide.layout)) && (
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">Bullet Points (one per line)</label>
              <textarea value={(currentSlide.bullets || []).join('\n')}
                onChange={e => updateSlide(editingSlideIdx, { bullets: e.target.value.split('\n') })}
                data-testid="input-slide-bullets"
                className="w-full h-24 bg-secondary/30 rounded-lg px-3 py-2 text-sm resize-none border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          )}

          {currentSlide.agendaItems !== undefined && (
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">Agenda Items (one per line)</label>
              <textarea value={(currentSlide.agendaItems || []).join('\n')}
                onChange={e => updateSlide(editingSlideIdx, { agendaItems: e.target.value.split('\n') })}
                data-testid="input-slide-agenda"
                className="w-full h-20 bg-secondary/30 rounded-lg px-3 py-2 text-sm resize-none border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          )}

          {currentSlide.summaryPoints !== undefined && (
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">Summary Points (one per line)</label>
              <textarea value={(currentSlide.summaryPoints || []).join('\n')}
                onChange={e => updateSlide(editingSlideIdx, { summaryPoints: e.target.value.split('\n') })}
                data-testid="input-slide-summary"
                className="w-full h-20 bg-secondary/30 rounded-lg px-3 py-2 text-sm resize-none border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          )}

          {(currentSlide.layout === 'two-column' || currentSlide.layout === 'comparison' || currentSlide.layout === 'problem-solution') && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">
                    {currentSlide.layout === 'problem-solution' ? 'Problem' : 'Left Label'}
                  </label>
                  <input value={currentSlide.leftLabel || ''}
                    onChange={e => updateSlide(editingSlideIdx, { leftLabel: e.target.value })}
                    className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-xs border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">
                    {currentSlide.layout === 'problem-solution' ? 'Solution' : 'Right Label'}
                  </label>
                  <input value={currentSlide.rightLabel || ''}
                    onChange={e => updateSlide(editingSlideIdx, { rightLabel: e.target.value })}
                    className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-xs border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Left Column</label>
                  <textarea value={(currentSlide.leftColumn || []).join('\n')}
                    onChange={e => updateSlide(editingSlideIdx, { leftColumn: e.target.value.split('\n') })}
                    className="w-full h-20 bg-secondary/30 rounded-lg px-2 py-1.5 text-xs resize-none border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Right Column</label>
                  <textarea value={(currentSlide.rightColumn || []).join('\n')}
                    onChange={e => updateSlide(editingSlideIdx, { rightColumn: e.target.value.split('\n') })}
                    className="w-full h-20 bg-secondary/30 rounded-lg px-2 py-1.5 text-xs resize-none border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
            </>
          )}

          {currentSlide.layout === 'chart' && renderChartEditor(currentSlide)}
          {currentSlide.layout === 'table' && renderTableEditor(currentSlide)}
          {currentSlide.layout === 'timeline' && renderTimelineEditor(currentSlide)}
          {currentSlide.layout === 'kpi' && renderKpiEditor(currentSlide)}

          <div className="flex items-center gap-1.5 pt-2 border-t border-border/30">
            <Button size="sm" variant="ghost" className="rounded-lg text-[11px] h-7" onClick={() => moveSlide(editingSlideIdx, 'up')} disabled={editingSlideIdx === 0} data-testid="button-move-up">
              Move Up
            </Button>
            <Button size="sm" variant="ghost" className="rounded-lg text-[11px] h-7" onClick={() => moveSlide(editingSlideIdx, 'down')} disabled={editingSlideIdx === editingPresentation.slides.length - 1} data-testid="button-move-down">
              Move Down
            </Button>
            <div className="flex-1" />
            <Button size="sm" variant="ghost" className="rounded-lg text-[11px] h-7 text-destructive" onClick={() => deleteSlide(editingSlideIdx)} disabled={editingPresentation.slides.length <= 1} data-testid="button-delete-slide">
              <Trash2 className="w-3 h-3 mr-1" /> Delete
            </Button>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 mt-3">
          <button
            onClick={() => setShowTypography(!showTypography)}
            className="flex items-center justify-between w-full"
            data-testid="button-toggle-typography"
          >
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" /> Typography
            </h3>
            {showTypography ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>

          {showTypography && (() => {
            const ts = currentSlide.textStyle || {};
            const updateTS = (updates: Partial<TextStyle>) => {
              updateSlide(editingSlideIdx, { textStyle: { ...ts, ...updates } });
            };
            const theme = getTheme(editingPresentation.themeId);
            return (
              <div className="space-y-3 mt-3">
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Title Style</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">Font Family</label>
                      <select
                        value={ts.titleFontFamily || theme.titleFont}
                        onChange={e => updateTS({ titleFontFamily: e.target.value })}
                        data-testid="select-title-font-family"
                        className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-[11px] border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">Font Size</label>
                      <select
                        value={ts.titleFontSize || theme.titleFontSize}
                        onChange={e => updateTS({ titleFontSize: parseInt(e.target.value) })}
                        data-testid="select-title-font-size"
                        className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-[11px] border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        {FONT_SIZES.map(s => <option key={s} value={s}>{s}pt</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] text-muted-foreground mr-1">Color</label>
                    <input
                      type="color"
                      value={ts.titleColor || `#${theme.titleColor}`}
                      onChange={e => updateTS({ titleColor: e.target.value })}
                      data-testid="input-title-color"
                      className="w-7 h-7 rounded border border-border/50 cursor-pointer bg-transparent p-0"
                    />
                    <div className="flex gap-0.5 ml-auto">
                      <button
                        onClick={() => updateTS({ titleBold: ts.titleBold === 'bold' ? 'normal' : 'bold' })}
                        data-testid="button-title-bold"
                        className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold transition-all ${ts.titleBold === 'bold' || !ts.titleBold ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => updateTS({ titleItalic: ts.titleItalic === 'italic' ? 'normal' : 'italic' })}
                        data-testid="button-title-italic"
                        className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] transition-all ${ts.titleItalic === 'italic' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    <button onClick={() => updateTS({ titleAlign: 'left' })} data-testid="button-title-align-left"
                      className={`flex-1 h-7 rounded-md flex items-center justify-center transition-all ${(ts.titleAlign || 'left') === 'left' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}
                    ><AlignLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={() => updateTS({ titleAlign: 'center' })} data-testid="button-title-align-center"
                      className={`flex-1 h-7 rounded-md flex items-center justify-center transition-all ${ts.titleAlign === 'center' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}
                    ><AlignCenter className="w-3.5 h-3.5" /></button>
                    <button onClick={() => updateTS({ titleAlign: 'right' })} data-testid="button-title-align-right"
                      className={`flex-1 h-7 rounded-md flex items-center justify-center transition-all ${ts.titleAlign === 'right' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}
                    ><AlignRight className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <div className="border-t border-border/30 pt-2 space-y-2">
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Body & Bullet Style</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">Font Family</label>
                      <select
                        value={ts.bodyFontFamily || theme.bodyFont}
                        onChange={e => updateTS({ bodyFontFamily: e.target.value })}
                        data-testid="select-body-font-family"
                        className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-[11px] border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">Font Size</label>
                      <select
                        value={ts.bodyFontSize || theme.bodyFontSize}
                        onChange={e => updateTS({ bodyFontSize: parseInt(e.target.value) })}
                        data-testid="select-body-font-size"
                        className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-[11px] border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        {FONT_SIZES.map(s => <option key={s} value={s}>{s}pt</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">Bullet Size</label>
                      <select
                        value={ts.bulletFontSize || theme.bulletFontSize}
                        onChange={e => updateTS({ bulletFontSize: parseInt(e.target.value) })}
                        data-testid="select-bullet-font-size"
                        className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-[11px] border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        {FONT_SIZES.map(s => <option key={s} value={s}>{s}pt</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">Accent Color</label>
                      <input
                        type="color"
                        value={ts.accentColor || `#${theme.accentColor}`}
                        onChange={e => updateTS({ accentColor: e.target.value })}
                        data-testid="input-accent-color"
                        className="w-full h-7 rounded border border-border/50 cursor-pointer bg-transparent p-0"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] text-muted-foreground mr-1">Body Color</label>
                    <input
                      type="color"
                      value={ts.bodyColor || `#${theme.bodyColor}`}
                      onChange={e => updateTS({ bodyColor: e.target.value })}
                      data-testid="input-body-color"
                      className="w-7 h-7 rounded border border-border/50 cursor-pointer bg-transparent p-0"
                    />
                    <label className="text-[10px] text-muted-foreground ml-2 mr-1">Bullet Color</label>
                    <input
                      type="color"
                      value={ts.bulletColor || ts.bodyColor || `#${theme.bodyColor}`}
                      onChange={e => updateTS({ bulletColor: e.target.value })}
                      data-testid="input-bullet-color"
                      className="w-7 h-7 rounded border border-border/50 cursor-pointer bg-transparent p-0"
                    />
                    <div className="flex gap-0.5 ml-auto">
                      <button
                        onClick={() => updateTS({ bodyBold: ts.bodyBold === 'bold' ? 'normal' : 'bold' })}
                        data-testid="button-body-bold"
                        className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold transition-all ${ts.bodyBold === 'bold' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => updateTS({ bodyItalic: ts.bodyItalic === 'italic' ? 'normal' : 'italic' })}
                        data-testid="button-body-italic"
                        className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] transition-all ${ts.bodyItalic === 'italic' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    <button onClick={() => updateTS({ bodyAlign: 'left' })} data-testid="button-body-align-left"
                      className={`flex-1 h-7 rounded-md flex items-center justify-center transition-all ${(ts.bodyAlign || 'left') === 'left' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}
                    ><AlignLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={() => updateTS({ bodyAlign: 'center' })} data-testid="button-body-align-center"
                      className={`flex-1 h-7 rounded-md flex items-center justify-center transition-all ${ts.bodyAlign === 'center' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}
                    ><AlignCenter className="w-3.5 h-3.5" /></button>
                    <button onClick={() => updateTS({ bodyAlign: 'right' })} data-testid="button-body-align-right"
                      className={`flex-1 h-7 rounded-md flex items-center justify-center transition-all ${ts.bodyAlign === 'right' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}
                    ><AlignRight className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <Button size="sm" variant="secondary" className="w-full rounded-lg text-[11px] h-7 mt-1"
                  onClick={() => updateSlide(editingSlideIdx, { textStyle: undefined })}
                  data-testid="button-reset-typography"
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset to Theme Defaults
                </Button>
              </div>
            );
          })()}
        </div>

        <div className="glass rounded-2xl p-4 mt-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Images ({slideImages.length})</h3>
            <Button size="sm" variant="ghost" className="rounded-lg text-[11px] h-7" onClick={() => addImageToSlide(editingSlideIdx)} data-testid="button-add-image-to-slide">
              <ImagePlus className="w-3 h-3 mr-1" /> Add Image
            </Button>
          </div>

          {slideImages.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-3">No images on this slide.</p>
          )}

          <div className="space-y-2">
            {slideImages.map((img, imgIdx) => (
              <div key={img.id}
                className={`rounded-xl border p-3 transition-all ${editingImageId === img.id ? 'border-primary bg-primary/5' : 'border-border/40'}`}
                data-testid={`image-editor-${img.id}`}>
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setEditingImageId(editingImageId === img.id ? null : img.id)} className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      {img.dataUrl ? (
                        <img src={img.dataUrl} alt={img.label} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded border-2 border-dashed border-border/50 flex items-center justify-center flex-shrink-0">
                          <ImagePlus className="w-3 h-3 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium truncate">{img.label || `Image ${imgIdx + 1}`}</p>
                        <p className="text-[9px] text-muted-foreground">{img.dataUrl ? 'Uploaded' : 'Empty'} &middot; {img.width}%&times;{img.height}%</p>
                      </div>
                    </div>
                  </button>
                  <Button size="sm" variant="ghost" className="rounded-lg h-7 w-7 p-0" onClick={() => triggerImageUpload(img.id)} data-testid={`button-upload-image-${img.id}`}>
                    <Upload className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-lg h-7 w-7 p-0 text-destructive" onClick={() => removeImage(editingSlideIdx, img.id)} data-testid={`button-remove-image-${img.id}`}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>

                {editingImageId === img.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-2.5 pt-2 border-t border-border/30 overflow-hidden">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">Label</label>
                      <input value={img.label} onChange={e => updateImage(editingSlideIdx, img.id, { label: e.target.value })}
                        className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-xs border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        data-testid={`input-image-label-${img.id}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1"><Move className="w-3 h-3" /> X (%)</label>
                        <input type="range" min={0} max={80} value={img.x} onChange={e => updateImage(editingSlideIdx, img.id, { x: parseInt(e.target.value) })}
                          className="w-full accent-primary" data-testid={`input-image-x-${img.id}`} />
                        <span className="text-[9px] text-muted-foreground">{img.x}%</span>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1"><Move className="w-3 h-3" /> Y (%)</label>
                        <input type="range" min={0} max={80} value={img.y} onChange={e => updateImage(editingSlideIdx, img.id, { y: parseInt(e.target.value) })}
                          className="w-full accent-primary" data-testid={`input-image-y-${img.id}`} />
                        <span className="text-[9px] text-muted-foreground">{img.y}%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1"><Maximize2 className="w-3 h-3" /> W (%)</label>
                        <input type="range" min={5} max={100} value={img.width} onChange={e => updateImage(editingSlideIdx, img.id, { width: parseInt(e.target.value) })}
                          className="w-full accent-primary" data-testid={`input-image-width-${img.id}`} />
                        <span className="text-[9px] text-muted-foreground">{img.width}%</span>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1"><Maximize2 className="w-3 h-3" /> H (%)</label>
                        <input type="range" min={5} max={100} value={img.height} onChange={e => updateImage(editingSlideIdx, img.id, { height: parseInt(e.target.value) })}
                          className="w-full accent-primary" data-testid={`input-image-height-${img.id}`} />
                        <span className="text-[9px] text-muted-foreground">{img.height}%</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">Fit Mode</label>
                      <div className="flex gap-1">
                        {fitOptions.map(fo => (
                          <button key={fo.value} onClick={() => updateImage(editingSlideIdx, img.id, { fit: fo.value })}
                            data-testid={`button-fit-${fo.value}-${img.id}`}
                            className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all ${img.fit === fo.value ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'
                              }`}>{fo.value.charAt(0).toUpperCase() + fo.value.slice(1)}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">Opacity: {img.opacity}%</label>
                      <input type="range" min={10} max={100} value={img.opacity} onChange={e => updateImage(editingSlideIdx, img.id, { opacity: parseInt(e.target.value) })}
                        className="w-full accent-primary" data-testid={`input-image-opacity-${img.id}`} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">Border Radius: {img.borderRadius}px</label>
                      <input type="range" min={0} max={50} value={img.borderRadius} onChange={e => updateImage(editingSlideIdx, img.id, { borderRadius: parseInt(e.target.value) })}
                        className="w-full accent-primary" data-testid={`input-image-radius-${img.id}`} />
                    </div>
                    {img.dataUrl && (
                      <Button size="sm" variant="secondary" className="w-full rounded-lg text-[11px] h-7" onClick={() => triggerImageUpload(img.id)}
                        data-testid={`button-replace-image-${img.id}`}>
                        <Upload className="w-3 h-3 mr-1" /> Replace Image
                      </Button>
                    )}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-4 mt-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Theme</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {presentationThemes.map(t => (
              <button key={t.id}
                onClick={() => {
                  setEditingPresentation(prev => prev ? {
                    ...prev,
                    themeId: t.id,
                    settings: { ...prev.settings, themeId: t.id },
                  } : null);
                }}
                className={`flex-shrink-0 w-16 h-10 rounded-lg border transition-all ${editingPresentation.themeId === t.id ? 'border-primary ring-2 ring-primary/30' : 'border-border/30'
                  }`}
                style={{ background: t.preview }}
                title={t.name}
                data-testid={`button-editor-theme-${t.id}`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderPresentationMode = () => {
    if (!presenting || !editingPresentation) return null;
    return (
      <PresentationViewer
        presentation={editingPresentation}
        onClose={() => setPresenting(false)}
        onPresentationUpdated={(updated) => {
          // Keep local editor state + the presentations list both fresh.
          // This ensures the video creator reads the latest timings/audio data
          // even if the user records narration and immediately clicks Create Video.
          setEditingPresentation(updated);
          setPresentations(prev => prev.map(p => p.id === updated.id ? updated : p));
        }}
      />
    );
  };

  const renderVideoCreator = () => {
    const pres = videoPresId ? presentations.find(p => p.id === videoPresId) : null;
    if (!pres) return null;
    const slideText = extractPresText(pres);
    const wordCount = slideText.trim().split(/\s+/).length;
    const modes: { id: 'video' | 'summary' | 'explainer' | 'podcast'; label: string; icon: React.ReactNode; desc: string }[] = [
      { id: 'video', label: 'Video', icon: <Video className="w-3.5 h-3.5" />, desc: 'Visual narration' },
      { id: 'summary', label: 'Summary', icon: <Sparkles className="w-3.5 h-3.5" />, desc: 'Key points only' },
      { id: 'explainer', label: 'Explainer', icon: <MessageSquare className="w-3.5 h-3.5" />, desc: 'Step-by-step' },
      { id: 'podcast', label: 'Podcast', icon: <Mic className="w-3.5 h-3.5" />, desc: 'Conversational' },
    ];
    const closeFn = () => { setVideoPresId(null); setPresAiScript(null); setPresScriptError(null); setPresVideoModalOpen(false); };
    return (
      <>
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={closeFn}>
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            className="glass-strong rounded-t-3xl w-full max-w-lg max-h-[88vh] overflow-y-auto pb-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <Film className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h2 className="font-bold text-sm">Create Video</h2>
                  <p className="text-[10px] text-muted-foreground">Video Studio</p>
                </div>
              </div>
              <button onClick={closeFn} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 space-y-4">
              <div className="glass rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <PresentationIcon className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{pres.settings.title}</p>
                    <p className="text-[10px] text-muted-foreground">{pres.slides.length} slides &middot; ~{wordCount} words</p>
                  </div>
                </div>
              </div>

              {/* Narration source selector */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Narration Source</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPresNarrationMode('ai-tts')}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${presNarrationMode === 'ai-tts' ? 'bg-violet-500/20 border-violet-500/50 text-violet-200' : 'border-white/10 text-muted-foreground hover:border-white/20'}`}
                  >
                    <Headphones className={`w-3.5 h-3.5 shrink-0 ${presNarrationMode === 'ai-tts' ? 'text-violet-400' : ''}`} />
                    <div>
                      <p className="text-xs font-medium leading-none">AI Voice</p>
                      <p className="text-[9px] mt-0.5 opacity-70">TTS narration</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setPresNarrationMode('recording')}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all relative ${presNarrationMode === 'recording' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200' : 'border-white/10 text-muted-foreground hover:border-white/20'} ${!presHasRecording ? 'opacity-60' : ''}`}
                  >
                    <Mic className={`w-3.5 h-3.5 shrink-0 ${presNarrationMode === 'recording' ? 'text-emerald-400' : ''}`} />
                    <div>
                      <p className="text-xs font-medium leading-none">My Voice</p>
                      <p className="text-[9px] mt-0.5 opacity-70">{presHasRecording ? 'Recording saved ✓' : 'No recording yet'}</p>
                    </div>
                    {presHasRecording && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />}
                  </button>
                </div>
                {presNarrationMode === 'recording' && !presHasRecording && (
                  <p className="text-[10px] text-amber-400/80 bg-amber-500/10 rounded-lg px-3 py-2 mt-2">
                    Open this presentation in Viewer → tap <strong>Record</strong> to record your narration first.
                  </p>
                )}
              </div>

              {/* Language (AI-TTS only) */}
              {presNarrationMode === 'ai-tts' && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Language</p>
                <div className="flex gap-2">
                  {[{ id: 'en', label: 'English' }, { id: 'bn', label: 'বাংলা' }].map(lang => (
                    <button key={lang.id} onClick={() => setPresVideoLanguage(lang.id as 'en' | 'bn')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border ${presVideoLanguage === lang.id ? 'bg-primary text-primary-foreground border-primary' : 'border-white/10 text-muted-foreground hover:border-white/20'}`}>
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
              )}

              {/* Script source selector */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Script Source</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'slide-words' as const, label: 'Slide Text', icon: <FileText className="w-3.5 h-3.5" />, desc: 'Titles & bullets' },
                    { id: 'speaker-notes' as const, label: 'My Notes', icon: <Mic className="w-3.5 h-3.5" />, desc: 'Speaker notes' },
                    { id: 'ai-script' as const, label: 'AI Script', icon: <Sparkles className="w-3.5 h-3.5" />, desc: 'AI-written' },
                  ] as const).map(src => (
                    <button key={src.id}
                      onClick={() => { setPresScriptSource(src.id); setPresAiScript(null); setPresScriptError(null); }}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all ${presScriptSource === src.id ? 'bg-violet-500/20 border-violet-500/50 text-violet-200' : 'border-white/10 text-muted-foreground hover:border-white/20'}`}>
                      <span className={presScriptSource === src.id ? 'text-violet-400' : ''}>{src.icon}</span>
                      <p className="text-[10px] font-medium leading-none">{src.label}</p>
                      <p className="text-[8px] opacity-60">{src.desc}</p>
                    </button>
                  ))}
                </div>
                {presScriptSource === 'speaker-notes' && !pres.slides.some(s => s.speakerNotes?.trim()) && (
                  <p className="text-[10px] text-amber-400/80 bg-amber-500/10 rounded-lg px-3 py-2 mt-2">
                    No speaker notes found. Add notes to your slides in the editor, or choose a different source.
                  </p>
                )}
              </div>

              {/* AI Script mode picker — only shown when AI Script source is chosen */}
              {presScriptSource === 'ai-script' && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">AI Script Style</p>
                <div className="grid grid-cols-2 gap-2">
                  {modes.map(m => (
                    <button key={m.id} onClick={() => { setPresVideoMode(m.id); setPresAiScript(null); setPresScriptError(null); }}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${presVideoMode === m.id ? 'bg-violet-500/20 border-violet-500/50 text-violet-200' : 'border-white/10 text-muted-foreground hover:border-white/20'}`}>
                      <span className={presVideoMode === m.id ? 'text-violet-400' : ''}>{m.icon}</span>
                      <div>
                        <p className="text-xs font-medium leading-none">{m.label}</p>
                        <p className="text-[9px] mt-0.5 opacity-70">{m.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              )}

              {/* Background Music picker — applies to both narration paths */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Music2 className="w-3 h-3" /> Background Music
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {BGM_TRACKS.map(track => (
                    <button
                      key={track.id}
                      onClick={() => setPresSelectedBgm(track.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                        presSelectedBgm === track.id
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
                {presSelectedBgm !== 'none' && (
                  <p className="text-[9px] text-indigo-400/60 mt-1.5 px-0.5">
                    BGM fades in at start and out 3 s before end — narration always on top
                  </p>
                )}
              </div>

              {/* AI-TTS path: generate section — adapts to chosen script source */}
              {presNarrationMode === 'ai-tts' && (
                <>
                  {/* Slide Text or Speaker Notes: direct generate button */}
                  {(presScriptSource === 'slide-words' || presScriptSource === 'speaker-notes') && (
                    <div className="pt-1">
                      <button
                        onClick={() => handlePresLaunchGeneration(false)}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                      >
                        <Film className="w-3.5 h-3.5" />
                        {presScriptSource === 'speaker-notes' ? 'Generate Video from My Notes' : 'Generate Video from Slide Text'}
                      </button>
                    </div>
                  )}

                  {/* AI Script: preview then generate */}
                  {presScriptSource === 'ai-script' && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">AI Script Preview</p>
                      {!presAiScript && !presGeneratingScript && (
                        <button onClick={handlePresGenerateAIScript}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-500/20 to-indigo-500/20 border border-violet-500/30 text-xs font-medium text-violet-200 hover:from-violet-500/30 hover:to-indigo-500/30 transition-all flex items-center justify-center gap-2">
                          <Sparkles className="w-3.5 h-3.5" /> ✨ Preview AI Script First
                        </button>
                      )}
                      {presGeneratingScript && (
                        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                          <span>Writing AI script…</span>
                        </div>
                      )}
                      {presScriptError && (
                        <p className="text-[11px] text-amber-400/80 bg-amber-500/10 rounded-lg px-3 py-2">{presScriptError}</p>
                      )}
                      {presAiScript && (
                        <div className="space-y-2">
                          <div className="glass rounded-xl p-3 max-h-48 overflow-y-auto">
                            <p className="text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed">{presAiScript}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setPresAiScript(null); setPresScriptError(null); }}
                              className="flex-1 py-2 rounded-lg border border-white/10 text-[11px] text-muted-foreground hover:border-white/20 transition-all">
                              Regenerate
                            </button>
                            <button onClick={() => handlePresLaunchGeneration(true)}
                              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-[11px] font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-1">
                              <Film className="w-3.5 h-3.5" /> Generate from Script
                            </button>
                          </div>
                        </div>
                      )}
                      {!presAiScript && !presGeneratingScript && (
                        <button onClick={() => handlePresLaunchGeneration(false)}
                          className="w-full py-2.5 rounded-xl border border-white/15 text-xs text-muted-foreground hover:border-violet-500/40 hover:text-violet-200 transition-all flex items-center justify-center gap-2">
                          <Video className="w-3.5 h-3.5" /> Skip Preview &amp; Generate Directly
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Recording path: editable per-slide timings + generate button */}
              {presNarrationMode === 'recording' && presHasRecording && (() => {
                const recPres = presentations.find(p => p.id === videoPresId);
                const timings = presTimingOverride ?? (recPres?.slides || []).map(() => 5);
                const totalSecs = timings.reduce((a, b) => a + b, 0);
                const fmtSec = (s: number) => s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
                const sourceLabel = presTimingSource === 'recording'
                  ? '⏺ From your recording'
                  : presTimingSource === 'custom'
                  ? '✏️ Custom timings'
                  : '⏱ Default (5s / slide)';
                return (
                  <div className="space-y-3">
                    {/* Editable timing panel */}
                    <div className="glass rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Slide Timings</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-emerald-400/70 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">{sourceLabel}</span>
                          <button
                            onClick={() => {
                              setPresTimingOverride((recPres?.slides || []).map(() => 5));
                              setPresTimingSource('default');
                            }}
                            className="text-[9px] text-white/30 hover:text-white/60 underline transition-colors"
                          >reset</button>
                        </div>
                      </div>

                      {/* Per-slide editable rows */}
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
                        {(recPres?.slides || []).map((slide, i) => (
                          <div key={i} className="flex items-center gap-2 text-[10px]">
                            <span className="text-muted-foreground truncate flex-1 min-w-0">
                              <span className="text-white/30 mr-1">{i + 1}.</span>{slide.title || `Slide ${i + 1}`}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number"
                                min={1}
                                max={300}
                                value={timings[i] ?? 5}
                                onChange={e => {
                                  const val = Math.max(1, Math.min(300, parseInt(e.target.value) || 1));
                                  setPresTimingOverride(prev => {
                                    const arr = prev ? [...prev] : (recPres?.slides || []).map(() => 5);
                                    arr[i] = val;
                                    return arr;
                                  });
                                  setPresTimingSource('custom');
                                }}
                                className="w-12 bg-white/5 border border-white/10 rounded px-1 py-0.5 text-right text-[10px] text-white focus:outline-none focus:border-emerald-500/50"
                              />
                              <span className="text-white/30 w-3">s</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Footer: total + note */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                        <p className="text-[9px] text-white/30">
                          {recPres?.recordedAt
                            ? `Recorded ${new Date(recPres.recordedAt).toLocaleDateString()}`
                            : 'Timings are proportional — audio controls actual length'}
                        </p>
                        <p className="text-[10px] font-mono text-white/50">Total: {fmtSec(totalSecs)}</p>
                      </div>
                    </div>

                    {/* Generate button */}
                    <button
                      onClick={handleGenerateVideoWithRecording}
                      disabled={presGenWithAudio}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {presGenWithAudio ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating… {Math.round(presGenProgress * 100)}%</>
                      ) : (
                        <><Mic className="w-3.5 h-3.5" /> Generate with My Voice</>
                      )}
                    </button>

                    {/* Progress + cancel */}
                    {presGenWithAudio && (
                      <div className="space-y-1">
                        <div className="w-full bg-secondary/40 rounded-full h-1.5">
                          <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${Math.round(presGenProgress * 100)}%` }} />
                        </div>
                        <button
                          onClick={() => { presGenCancelRef.current.cancelled = true; }}
                          className="w-full text-[10px] text-muted-foreground hover:text-red-400 transition-colors py-1"
                        >Cancel</button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </motion.div>
        </div>

        {presVideoModalOpen && (
          <MediaGenerationModal
            open
            onClose={() => { setPresVideoModalOpen(false); closeFn(); }}
            sourceModule="presentations"
            sourceId={pres.id}
            sourceName={pres.settings.title || 'Presentation'}
            getSourceText={async () => slideText}
            totalPages={pres.slides.length}
            preGeneratedScript={presVideoPreScript}
            initialMode={presVideoMode}
            language={presVideoLanguage}
            initialBgmId={presSelectedBgm}
            customVideoRenderFn={(c, idx, prog) => {
              const slide = pres.slides[idx] ?? pres.slides[pres.slides.length - 1];
              if (slide) renderPresentationSlideToCanvas(c, slide, getTheme(pres.themeId), presImageCacheRef.current, prog);
            }}
          />
        )}
      </>
    );
  };

  const renderStudyPlannerModal = () => {
    if (!showStudyPlannerModal) return null;
    const sessions = getStudySessions();
    const links = getStudyPresentationLinks();
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setShowStudyPlannerModal(false); setStudyPlannerTargetId(null); }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-strong rounded-2xl p-4 mx-4 max-w-[400px] w-full max-h-[70vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
          data-testid="modal-study-planner-picker"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Add to Study Planner
            </h3>
            <button onClick={() => { setShowStudyPlannerModal(false); setStudyPlannerTargetId(null); }} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mb-3">Select a subject to link this presentation to:</p>
          {sessions.length === 0 ? (
            <div className="text-center py-6">
              <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No study sessions found.</p>
              <p className="text-[10px] text-muted-foreground mt-1">Create sessions in the Study Planner module first.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {sessions.map(s => {
                const isLinked = studyPlannerTargetId ? links.some(l => l.presentationId === studyPlannerTargetId && l.sessionId === s.id) : false;
                return (
                  <button
                    key={s.id}
                    onClick={() => !isLinked && handleLinkToSession(s.id)}
                    disabled={isLinked}
                    className={`w-full text-left p-2.5 rounded-xl transition-colors ${isLinked ? 'bg-success/10 border border-success/20 cursor-default' : 'bg-secondary/50 hover:bg-secondary/80'}`}
                    data-testid={`button-link-session-${s.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" data-testid={`text-session-subject-${s.id}`}>{s.subject}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {s.topic && <span className="text-[9px] text-muted-foreground truncate">{s.topic}</span>}
                          {s.studyCategory && <span className="text-[8px] px-1 py-0.5 rounded-full bg-accent/20 text-accent-foreground">{s.studyCategory}</span>}
                        </div>
                      </div>
                      {isLinked && <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    );
  };

  return (
    <>
      <PageOnboardingTooltips pageId="presentation-generator" />
      <AnimatePresence mode="wait">
        {view === 'library' && <motion.div key="library">{renderLibrary()}</motion.div>}
        {view === 'create' && <motion.div key="create">{renderCreateForm()}</motion.div>}
        {view === 'editor' && <motion.div key="editor">{renderEditor()}</motion.div>}
      </AnimatePresence>
      {renderStudyPlannerModal()}
      {renderPresentationMode()}
      <AnimatePresence>{videoPresId && renderVideoCreator()}</AnimatePresence>
      {mediaModalPresId && (() => {
        const mp = presentations.find(p => p.id === mediaModalPresId);
        if (!mp) return null;
        const slideText = mp.slides.map((s, i) => `Slide ${i + 1}: ${s.title || ''}. ${s.subtitle || ''} ${s.body || ''} ${(s.bullets || []).join('. ')} ${s.speakerNotes || ''}`).join('\n\n');
        return (
          <MediaGenerationModal
            open
            onClose={() => setMediaModalPresId(null)}
            sourceModule="presentations"
            sourceId={mp.id}
            sourceName={mp.settings.title || 'Presentation'}
            getSourceText={async (_f: number, _t: number) => slideText}
            totalPages={mp.slides.length}
            customVideoRenderFn={(c, idx, prog) => {
              const slide = mp.slides[idx] ?? mp.slides[mp.slides.length - 1];
              if (slide) renderPresentationSlideToCanvas(c, slide, getTheme(mp.themeId), mediaModalImageCacheRef.current, prog);
            }}
          />
        );
      })()}
    </>
  );
}
