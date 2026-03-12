import { useState, useRef, useCallback, useEffect } from 'react';
import { isDemoMode } from '@/hooks/useLocalStorage';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Play, Square, Mic, Camera, CheckCircle2, AlertCircle,
  Download, Trash2, Edit3, Clock, Target, Sparkles, ChevronRight,
  Eye, EyeOff, FileText, HelpCircle, RotateCcw, Loader2,
  Video, Volume2, Hand, User, Timer, Award, TrendingUp,
  MessageSquare, SplitSquareHorizontal, ChevronDown, ChevronUp,
  Pause as PauseIcon, X, Printer, Headphones,
} from 'lucide-react';
import MediaGenerationModal from '@/components/MediaGenerationModal';
import type {
  CoachView, CoachSessionConfig, CoachReport, SessionType, CoachingCard,
  VisionMetrics, AudioMetrics, TrendDataPoint, TimelineMarker, SectionScore,
  ScriptSettings, QuestionModeSettings, QuestionCategory, PracticeQuestion,
  QuestionResult,
} from '@/types/presentationCoach';
import { SESSION_TYPES, DURATION_PRESETS, QUESTION_CATEGORIES, AUDIENCE_PRESETS, TONE_OPTIONS, COMPLEXITY_OPTIONS, TREND_INTERVAL_MS, OVERTIME_WARNING_SECONDS, AUTO_STOP_OVERTIME_SECONDS } from '@/lib/coach/constants';
import { initVisionAnalyzer, analyzeFrame, destroyVisionAnalyzer } from '@/lib/coach/visionAnalyzer';
import { initAudioAnalyzer, getAudioMetrics, destroyAudioAnalyzer } from '@/lib/coach/audioAnalyzer';
import { createAccumulator, accumulateFrame, calculateScores } from '@/lib/coach/scoringEngine';
import { generateFeedback, resetFeedbackEngine } from '@/lib/coach/feedbackEngine';
import { generateReport, generatePrintableReport } from '@/lib/coach/reportGenerator';
import { getAllCoachReports, saveCoachReport, deleteCoachReport, renameCoachReport } from '@/lib/coach/coachStorage';
import { isScriptGenerationAvailable, generateScript } from '@/lib/coach/scriptGenerator';
import { getRandomQuestions } from '@/lib/coach/questionBank';

function fmtTime(s: number): string {
  const m = Math.floor(Math.abs(s) / 60);
  const sec = Math.floor(Math.abs(s) % 60);
  return `${s < 0 ? '-' : ''}${m}:${String(sec).padStart(2, '0')}`;
}

function scoreColor(s: number): string {
  if (s >= 80) return 'hsl(152, 69%, 45%)';
  if (s >= 60) return 'hsl(199, 89%, 48%)';
  if (s >= 40) return 'hsl(38, 92%, 50%)';
  return 'hsl(0, 84%, 60%)';
}

export default function PresentationCoach() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [view, setView] = useState<CoachView>('home');
  const [mediaModalScript, setMediaModalScript] = useState<string | null>(null);
  const [mediaModalTitle, setMediaModalTitle] = useState('');
  const [mediaModalSourceId, setMediaModalSourceId] = useState('');

  const [sessionType, setSessionType] = useState<SessionType>('presentation');
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionTopic, setSessionTopic] = useState('');
  const [targetDuration, setTargetDuration] = useState(300);
  const [customDuration, setCustomDuration] = useState(5);
  const [useScript, setUseScript] = useState(false);
  const [useTeleprompter, setUseTeleprompter] = useState(false);
  const [useQuestionMode, setUseQuestionMode] = useState(false);
  const [script, setScript] = useState('');
  const [scriptGenerating, setScriptGenerating] = useState(false);
  const [scriptSettings, setScriptSettings] = useState<ScriptSettings>({
    topic: '', duration: 300, targetAudience: '', presentationType: 'Presentation',
    tone: 'Professional', language: 'English', keyPoints: '', speakingStyle: '',
    purpose: '', customInstructions: '', callToAction: '', complexityLevel: 'moderate',
  });

  const [questionSettings, setQuestionSettings] = useState<QuestionModeSettings>({
    category: 'interview', questionCount: 3, answerTimeLimit: 120, thinkingTime: 15,
  });
  const [currentQuestions, setCurrentQuestions] = useState<PracticeQuestion[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingCountdown, setThinkingCountdown] = useState(0);
  const [answerCountdown, setAnswerCountdown] = useState(0);

  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [visionReady, setVisionReady] = useState(false);
  const [permissionsChecking, setPermissionsChecking] = useState(false);
  const [permissionError, setPermissionError] = useState('');

  const [sessionActive, setSessionActive] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [teleprompterAutoScroll, setTeleprompterAutoScroll] = useState(false);
  const [teleprompterSpeed, setTeleprompterSpeed] = useState(2);
  const [liveVision, setLiveVision] = useState<VisionMetrics | null>(null);
  const [liveAudio, setLiveAudio] = useState<AudioMetrics | null>(null);
  const [liveCards, setLiveCards] = useState<CoachingCard[]>([]);
  const [liveScores, setLiveScores] = useState<Record<string, SectionScore>>({});

  const [currentReport, setCurrentReport] = useState<CoachReport | null>(null);
  const [reports, setReports] = useState<CoachReport[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [expandedScoreId, setExpandedScoreId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analysisRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trendRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accRef = useRef(createAccumulator());
  const trendDataRef = useRef<TrendDataPoint[]>([]);
  const markersRef = useRef<TimelineMarker[]>([]);
  const teleprompterRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionResultsRef = useRef<QuestionResult[]>([]);
  const questionStartTimeRef = useRef(0);
  const sessionStartTimeRef = useRef(0);
  const elapsedRef = useRef(0);
  const liveVisionRef = useRef<VisionMetrics | null>(null);
  const [audioReady, setAudioReady] = useState(false);

  const refreshReports = useCallback(() => setReports(getAllCoachReports()), []);

  useEffect(() => { refreshReports(); }, [refreshReports]);

  useEffect(() => {
    if (teleprompterAutoScroll && showTeleprompter && teleprompterRef.current) {
      autoScrollRef.current = setInterval(() => {
        teleprompterRef.current?.scrollBy({ top: teleprompterSpeed, behavior: 'smooth' });
      }, 100);
    } else {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    }
    return () => { if (autoScrollRef.current) clearInterval(autoScrollRef.current); };
  }, [teleprompterAutoScroll, showTeleprompter, teleprompterSpeed]);

  const attachStream = useCallback(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, []);

  const checkPermissions = async () => {
    setPermissionsChecking(true);
    setPermissionError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: true });
      streamRef.current = stream;

      const waitForVideo = () => new Promise<void>((resolve) => {
        const tryAttach = () => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
            resolve();
            return true;
          }
          return false;
        };
        if (tryAttach()) return;
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (tryAttach() || attempts > 20) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      });
      await waitForVideo();

      setCameraReady(true);
      setMicReady(true);

      const visionOk = await initVisionAnalyzer();
      setVisionReady(visionOk);
      if (!visionOk) {
        toast({ title: 'Vision analysis', description: 'MediaPipe not available — using basic analysis mode.' });
      }

      const audioOk = initAudioAnalyzer(stream);
      setAudioReady(audioOk);
      if (!audioOk) {
        toast({ title: 'Audio analysis', description: 'Audio analyzer could not start — speech metrics will be limited.' });
      }
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError' ? 'Camera and microphone access was denied. Please allow permissions in your browser settings.'
        : err.name === 'NotFoundError' ? 'No camera or microphone found on this device.'
        : `Could not access camera/microphone: ${err.message}`;
      setPermissionError(msg);
    } finally {
      setPermissionsChecking(false);
    }
  };

  const startSession = () => {
    if (!cameraReady || !micReady) return;
    accRef.current = createAccumulator();
    trendDataRef.current = [];
    markersRef.current = [];
    questionResultsRef.current = [];
    resetFeedbackEngine();
    setElapsed(0);
    setSessionActive(true);
    setSessionPaused(false);
    setLiveCards([]);
    setLiveScores({});
    sessionStartTimeRef.current = Date.now();

    if (useQuestionMode) {
      const qs = getRandomQuestions(questionSettings.category, questionSettings.questionCount);
      setCurrentQuestions(qs);
      setCurrentQuestionIdx(0);
      if (questionSettings.thinkingTime > 0) {
        setIsThinking(true);
        setThinkingCountdown(questionSettings.thinkingTime);
      } else if (questionSettings.answerTimeLimit > 0) {
        setAnswerCountdown(questionSettings.answerTimeLimit);
      }
      questionStartTimeRef.current = Date.now();
    }

    elapsedRef.current = 0;

    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        elapsedRef.current = next;
        if (targetDuration > 0 && next > targetDuration + AUTO_STOP_OVERTIME_SECONDS) {
          stopSession();
        }
        return next;
      });
    }, 1000);

    analysisRef.current = setInterval(() => {
      if (!videoRef.current || sessionPaused) return;
      if (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0) return;
      const vision = analyzeFrame(videoRef.current, performance.now());
      const audio = getAudioMetrics();
      setLiveVision(vision);
      setLiveAudio(audio);
      liveVisionRef.current = vision;
      accumulateFrame(accRef.current, vision, audio);

      const currentElapsed = elapsedRef.current;
      const scores = calculateScores(accRef.current, currentElapsed, targetDuration);
      setLiveScores(scores);

      const cards = generateFeedback(vision, audio, currentElapsed, targetDuration);
      setLiveCards(cards);

      if (vision.postureScore < 40 && markersRef.current.filter(m => m.type === 'posture-dip').length < 10) {
        markersRef.current.push({ time: currentElapsed, type: 'posture-dip', label: 'Posture dip detected' });
      }
      if (audio.silenceDuration > 4) {
        const lastPause = markersRef.current.filter(m => m.type === 'pause').pop();
        if (!lastPause || currentElapsed - lastPause.time > 10) {
          markersRef.current.push({ time: currentElapsed, type: 'pause', label: `Long pause (${Math.round(audio.silenceDuration)}s)` });
        }
      }
      if (audio.estimatedWPM > 180) {
        markersRef.current.push({ time: currentElapsed, type: 'pace-spike', label: `Fast pace (~${audio.estimatedWPM} WPM)` });
      }
    }, 200);

    trendRef.current = setInterval(() => {
      const audio = getAudioMetrics();
      const v = liveVisionRef.current;
      trendDataRef.current.push({
        time: elapsedRef.current,
        posture: v?.postureScore || 70,
        eyeContact: v?.eyeContactScore || 70,
        gesture: v?.gestureScore || 70,
        pace: audio.estimatedWPM || 0,
        volume: audio.volumeLevel || 0,
      });
    }, TREND_INTERVAL_MS);

    if (useTeleprompter && script) setShowTeleprompter(true);
  };

  const stopSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (analysisRef.current) clearInterval(analysisRef.current);
    if (trendRef.current) clearInterval(trendRef.current);
    timerRef.current = null;
    analysisRef.current = null;
    trendRef.current = null;

    const finalElapsed = elapsedRef.current;
    if (targetDuration > 0 && finalElapsed > targetDuration) {
      markersRef.current.push({ time: finalElapsed, type: 'overtime', label: `Overtime: ${fmtTime(finalElapsed - targetDuration)}` });
    }

    const finalScores = calculateScores(accRef.current, finalElapsed, targetDuration);
    const audio = getAudioMetrics();

    const config: CoachSessionConfig = {
      sessionType, title: sessionTitle, topic: sessionTopic,
      targetDuration, useScript, useTeleprompter, useQuestionMode,
      questionSettings: useQuestionMode ? questionSettings : undefined,
      script: useScript ? script : undefined,
    };

    const report = generateReport(
      config, finalScores, finalElapsed,
      trendDataRef.current, markersRef.current,
      audio.transcriptAvailable, showTeleprompter,
      questionResultsRef.current.length > 0 ? questionResultsRef.current : undefined,
    );

    saveCoachReport(report);
    setCurrentReport(report);
    setSessionActive(false);
    setView('report');
    refreshReports();

    destroyAudioAnalyzer();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    toast({ title: 'Session complete', description: `Your report is ready — scored ${report.overallScore}/100.` });
  }, [targetDuration, sessionType, sessionTitle, sessionTopic, useScript, useTeleprompter, useQuestionMode, questionSettings, script, showTeleprompter, toast, refreshReports]);

  useEffect(() => {
    if (!streamRef.current) return;
    attachStream();
    const t1 = setTimeout(attachStream, 150);
    const t2 = setTimeout(attachStream, 400);
    const t3 = setTimeout(attachStream, 700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [sessionActive, attachStream]);

  useEffect(() => {
    if (isThinking && thinkingCountdown > 0) {
      const t = setTimeout(() => setThinkingCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(t);
    } else if (isThinking && thinkingCountdown <= 0) {
      setIsThinking(false);
      questionStartTimeRef.current = Date.now();
      if (questionSettings.answerTimeLimit > 0) {
        setAnswerCountdown(questionSettings.answerTimeLimit);
      }
    }
  }, [isThinking, thinkingCountdown, questionSettings.answerTimeLimit]);

  const isAdvancingRef = useRef(false);

  useEffect(() => {
    if (!isThinking && answerCountdown > 0 && sessionActive && useQuestionMode) {
      const t = setTimeout(() => setAnswerCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(t);
    } else if (!isThinking && answerCountdown === 0 && sessionActive && useQuestionMode && questionStartTimeRef.current > 0) {
      if (!isAdvancingRef.current) {
        nextQuestion();
      }
    }
  }, [answerCountdown, isThinking, sessionActive, useQuestionMode]);

  const nextQuestion = () => {
    if (isAdvancingRef.current) return;
    isAdvancingRef.current = true;
    const q = currentQuestions[currentQuestionIdx];
    if (q) {
      const answerDuration = (Date.now() - questionStartTimeRef.current) / 1000;
      const currentAudio = getAudioMetrics();
      const currentVision = liveVisionRef.current;
      const estimatedWPM = currentAudio.estimatedWPM || 0;
      let paceScore = 50;
      if (estimatedWPM > 0) {
        if (estimatedWPM >= 120 && estimatedWPM <= 160) paceScore = Math.min(100, Math.round(90 + (10 - Math.abs(140 - estimatedWPM) * 0.5)));
        else if (estimatedWPM >= 100 && estimatedWPM <= 180) paceScore = Math.min(100, Math.round(70 + (20 - Math.abs(140 - estimatedWPM) * 0.5)));
        else paceScore = Math.max(20, Math.round(60 - Math.abs(140 - estimatedWPM) * 0.5));
      }
      questionResultsRef.current.push({
        questionId: q.id, question: q.question, category: q.category,
        answerDuration,
        scores: {
          posture: currentVision?.postureScore || liveVision?.postureScore || 50,
          eyeContact: currentVision?.eyeContactScore || liveVision?.eyeContactScore || 50,
          gestureControl: currentVision?.gestureScore || liveVision?.gestureScore || 50,
          speechDelivery: currentAudio.volumeConsistency || liveAudio?.volumeConsistency || 50,
          speechPace: paceScore,
        },
      });
    }

    if (currentQuestionIdx < currentQuestions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      if (questionSettings.thinkingTime > 0) {
        setIsThinking(true);
        setThinkingCountdown(questionSettings.thinkingTime);
      } else {
        questionStartTimeRef.current = Date.now();
        if (questionSettings.answerTimeLimit > 0) {
          setAnswerCountdown(questionSettings.answerTimeLimit);
        }
      }
      setTimeout(() => { isAdvancingRef.current = false; }, 100);
    } else {
      stopSession();
    }
  };

  const handleDownloadReport = (report: CoachReport) => {
    const html = generatePrintableReport(report);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/[^a-zA-Z0-9 -]/g, '')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded', description: 'Report saved as HTML file.' });
  };

  const handlePrintReport = (report: CoachReport) => {
    const html = generatePrintableReport(report);
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  const handleGenerateScript = async () => {
    if (isDemoMode) {
      toast({ title: 'Demo mode', description: 'AI script generation is disabled in demo mode.', variant: 'destructive' });
      return;
    }
    if (!isScriptGenerationAvailable()) {
      toast({ title: 'API key required', description: 'Add your longcat.chat API key to enable AI script generation.', variant: 'destructive' });
      return;
    }
    setScriptGenerating(true);
    try {
      const generated = await generateScript({ ...scriptSettings, topic: sessionTopic || scriptSettings.topic, duration: targetDuration });
      setScript(generated);
      toast({ title: 'Script generated', description: 'Your script is ready. You can edit it before using.' });
    } catch (err: any) {
      toast({ title: 'Generation failed', description: err.message || 'Could not generate script.', variant: 'destructive' });
    } finally {
      setScriptGenerating(false);
    }
  };

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (analysisRef.current) clearInterval(analysisRef.current);
    if (trendRef.current) clearInterval(trendRef.current);
    destroyAudioAnalyzer();
    destroyVisionAnalyzer();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const remaining = targetDuration > 0 ? targetDuration - elapsed : 0;
  const isOvertime = targetDuration > 0 && elapsed > targetDuration;
  const nearEnd = targetDuration > 0 && remaining <= OVERTIME_WARNING_SECONDS && remaining > 0;

  // ==================== RENDER ====================

  const renderHome = () => (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="px-4 pt-12 pb-24 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground" data-testid="button-back-home"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display" data-testid="text-coach-title" data-tour="coach-header">Presentation Coach</h1>
      </div>

      <div className="glass rounded-2xl p-5 relative overflow-hidden" data-tour="coach-camera">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><Video className="w-5 h-5 text-primary" /></div>
            <div><h2 className="font-bold text-base">AI Speech Coach</h2><p className="text-[11px] text-muted-foreground">Practice and improve your delivery</p></div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            Get real-time feedback on posture, eye contact, gestures, speech delivery, and pace. Record practice sessions, review detailed reports, and track your improvement over time.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider" data-tour="coach-setup">Session Setup</h3>

        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">Session Type</label>
          <div className="flex gap-1.5 flex-wrap">
            {SESSION_TYPES.map(t => (
              <button key={t.value} onClick={() => setSessionType(t.value)} data-testid={`button-type-${t.value}`}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${sessionType === t.value ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">Session Title</label>
          <input value={sessionTitle} onChange={e => setSessionTitle(e.target.value)} placeholder="e.g. Q3 Strategy Pitch" data-testid="input-session-title"
            className="w-full bg-secondary/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border/50" />
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">Topic</label>
          <input value={sessionTopic} onChange={e => setSessionTopic(e.target.value)} placeholder="What are you presenting about?" data-testid="input-session-topic"
            className="w-full bg-secondary/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border/50" />
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">Target Duration</label>
          <div className="flex gap-1.5 flex-wrap">
            {DURATION_PRESETS.map(d => (
              <button key={d.value} onClick={() => setTargetDuration(d.value)} data-testid={`button-duration-${d.value}`}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${targetDuration === d.value ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}>
                {d.label}
              </button>
            ))}
            <div className="flex items-center gap-1">
              <input type="number" min={1} max={20} value={customDuration}
                onChange={e => { const v = parseInt(e.target.value) || 1; setCustomDuration(v); setTargetDuration(v * 60); }}
                className="w-12 bg-secondary/30 rounded-lg px-2 py-1.5 text-xs border border-border/50 text-center" data-testid="input-custom-duration" />
              <span className="text-[10px] text-muted-foreground">min</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <button onClick={() => setUseScript(!useScript)} data-testid="button-toggle-script" data-tour="coach-script"
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${useScript ? 'border-primary bg-primary/5' : 'border-border/50'}`}>
            <FileText className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1"><p className="text-sm font-medium">Use Script</p><p className="text-[10px] text-muted-foreground">Generate or paste a script with teleprompter</p></div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${useScript ? 'border-primary bg-primary' : 'border-border'}`}>
              {useScript && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
            </div>
          </button>

          <button onClick={() => setUseQuestionMode(!useQuestionMode)} data-testid="button-toggle-questions" data-tour="coach-questions"
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${useQuestionMode ? 'border-primary bg-primary/5' : 'border-border/50'}`}>
            <HelpCircle className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1"><p className="text-sm font-medium">Question Mode</p><p className="text-[10px] text-muted-foreground">Practice answering questions live</p></div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${useQuestionMode ? 'border-primary bg-primary' : 'border-border'}`}>
              {useQuestionMode && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
            </div>
          </button>
        </div>

        {useScript && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-muted-foreground">Script</label>
              <div className="flex gap-1">
                {isDemoMode ? (
                  <span className="text-[9px] text-amber-500 italic">AI disabled in demo</span>
                ) : isScriptGenerationAvailable() ? (
                  <Button size="sm" variant="secondary" className="rounded-lg text-[10px] h-6" onClick={() => setView('script')} data-testid="button-open-script-gen">
                    <Sparkles className="w-3 h-3 mr-1" /> AI Generate
                  </Button>
                ) : (
                  <span className="text-[9px] text-muted-foreground italic">Add longcat.chat API key for AI scripts</span>
                )}
              </div>
            </div>
            <textarea value={script} onChange={e => setScript(e.target.value)} placeholder="Paste or type your script here..." data-testid="input-script"
              className="w-full h-24 bg-secondary/30 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border/50" />
            {script && (
              <button onClick={() => setUseTeleprompter(!useTeleprompter)} data-testid="button-toggle-teleprompter" data-tour="coach-teleprompter"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium transition-all ${useTeleprompter ? 'bg-primary/10 text-primary' : 'bg-secondary/30 text-muted-foreground'}`}>
                <SplitSquareHorizontal className="w-4 h-4" /> {useTeleprompter ? 'Teleprompter ON' : 'Enable Teleprompter'}
              </button>
            )}
          </motion.div>
        )}

        {useQuestionMode && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-3 overflow-hidden">
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">Question Category</label>
              <div className="flex gap-1.5 flex-wrap">
                {QUESTION_CATEGORIES.map(c => (
                  <button key={c.value} onClick={() => setQuestionSettings(s => ({ ...s, category: c.value }))} data-testid={`button-qcat-${c.value}`}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${questionSettings.category === c.value ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-0.5 block">Questions</label>
                <select value={questionSettings.questionCount} onChange={e => setQuestionSettings(s => ({ ...s, questionCount: parseInt(e.target.value) }))}
                  className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-xs border border-border/50" data-testid="select-question-count">
                  {[1, 2, 3, 5, 8, 10].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-0.5 block">Think Time</label>
                <select value={questionSettings.thinkingTime} onChange={e => setQuestionSettings(s => ({ ...s, thinkingTime: parseInt(e.target.value) }))}
                  className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-xs border border-border/50" data-testid="select-thinking-time">
                  {[0, 5, 10, 15, 20, 30].map(n => <option key={n} value={n}>{n === 0 ? 'None' : `${n}s`}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-0.5 block">Answer Limit</label>
                <select value={questionSettings.answerTimeLimit} onChange={e => setQuestionSettings(s => ({ ...s, answerTimeLimit: parseInt(e.target.value) }))}
                  className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-xs border border-border/50" data-testid="select-answer-time">
                  {[60, 90, 120, 180, 300].map(n => <option key={n} value={n}>{n < 60 ? `${n}s` : `${n / 60}m`}</option>)}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {isDemoMode && (
        <div className="glass rounded-xl p-3 border border-amber-500/30">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-medium">AI coaching features are disabled in demo mode.</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button className="flex-1 rounded-xl h-12 font-semibold gap-2" disabled={isDemoMode} onClick={() => { setView('permissions'); checkPermissions(); }} data-testid="button-start-session" data-tour="coach-live">
          <Play className="w-4 h-4" /> {isDemoMode ? 'Disabled in Demo' : 'Start Session'}
        </Button>
        <Button variant="secondary" className="rounded-xl h-12 px-4" onClick={() => { refreshReports(); setView('history'); }} data-testid="button-view-history" data-tour="coach-history">
          <Clock className="w-4 h-4" />
        </Button>
      </div>

      {reports.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider" data-tour="coach-reports">Recent Sessions</h3>
          {reports.slice(0, 3).map(r => (
            <button key={r.id} onClick={() => { setCurrentReport(r); setView('report'); }} data-testid={`button-recent-${r.id}`}
              className="w-full glass rounded-xl p-3 flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: scoreColor(r.overallScore) + '20' }}>
                <span className="text-sm font-bold" style={{ color: scoreColor(r.overallScore) }}>{r.overallScore}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.title}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(r.date).toLocaleDateString()} &middot; {fmtTime(r.duration)}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );

  const renderPermissions = () => (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="px-4 pt-12 pb-24 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => { cleanup(); setView('home'); setCameraReady(false); setMicReady(false); }} className="text-muted-foreground" data-testid="button-back-perms"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold font-display">Getting Ready</h1>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-[4/3] object-cover bg-black rounded-t-2xl" data-testid="video-preview" />
        <div className="p-4 space-y-3">
          {[{ label: 'Camera', ready: cameraReady, icon: Camera }, { label: 'Microphone', ready: micReady, icon: Mic }, { label: 'Vision Analysis', ready: visionReady, icon: Eye }].map(item => (
            <div key={item.label} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.ready ? 'bg-green-500/15 text-green-500' : 'bg-secondary text-muted-foreground'}`}>
                <item.icon className="w-4 h-4" />
              </div>
              <span className="text-sm flex-1">{item.label}</span>
              {item.ready ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : permissionsChecking ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <AlertCircle className="w-4 h-4 text-muted-foreground/40" />}
            </div>
          ))}
        </div>
      </div>

      {permissionError && (
        <div className="glass rounded-xl p-3 border border-destructive/30">
          <p className="text-sm text-destructive flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {permissionError}</p>
          <Button size="sm" variant="secondary" className="mt-2 rounded-lg text-xs" onClick={checkPermissions} data-testid="button-retry-permissions">
            <RotateCcw className="w-3 h-3 mr-1" /> Retry
          </Button>
        </div>
      )}

      {!visionReady && cameraReady && (
        <p className="text-[11px] text-muted-foreground text-center">Vision analysis will use basic mode. This still provides feedback on your speaking practice.</p>
      )}

      <Button className="w-full rounded-xl h-12 font-semibold gap-2" disabled={!cameraReady || !micReady} onClick={startSession} data-testid="button-begin-session">
        <Play className="w-4 h-4" /> Begin {useQuestionMode ? 'Question Practice' : 'Recording'}
      </Button>
    </motion.div>
  );

  const renderSession = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-background z-50 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${isOvertime ? 'bg-red-500 text-white animate-pulse' : nearEnd ? 'bg-red-500/20 text-red-500' : 'bg-secondary'}`}
            data-testid="text-timer">
            {isOvertime ? `+${fmtTime(elapsed - targetDuration)}` : fmtTime(elapsed)}
          </div>
          {targetDuration > 0 && !isOvertime && <span className="text-[10px] text-muted-foreground">/ {fmtTime(targetDuration)}</span>}
        </div>
        <div className="flex items-center gap-1">
          {script && (
            <button onClick={() => setShowTeleprompter(!showTeleprompter)} className={`w-7 h-7 rounded-lg flex items-center justify-center ${showTeleprompter ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`} data-testid="button-toggle-teleprompter-session">
              <SplitSquareHorizontal className="w-4 h-4" />
            </button>
          )}
          <Button size="sm" variant="destructive" className="rounded-lg text-xs h-7 px-3" onClick={stopSession} data-testid="button-stop-session">
            <Square className="w-3 h-3 mr-1" /> Stop
          </Button>
        </div>
      </div>

      <div className={`flex-1 flex ${showTeleprompter ? 'flex-col' : 'flex-col'} overflow-hidden`}>
        <div className={`relative ${showTeleprompter ? 'h-1/2' : 'flex-1'} bg-black`}>
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} data-testid="video-live" />

          {/* Live score indicators */}
          <div className="absolute top-2 left-2 flex gap-1 flex-wrap max-w-[70%]" data-tour="coach-scoring">
            {[
              { key: 'posture', icon: User, score: liveScores.posture?.score, label: 'Posture' },
              { key: 'eyeContact', icon: Eye, score: liveScores.eyeContact?.score, label: 'Eyes' },
              { key: 'gesture', icon: Hand, score: liveScores.gestureControl?.score, label: 'Gesture' },
              { key: 'delivery', icon: Volume2, score: liveScores.speechDelivery?.score, label: 'Speech' },
            ].map(s => (
              <div key={s.key} className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm flex items-center gap-1"
                data-testid={`score-${s.key}`}>
                <s.icon className="w-3 h-3 text-white/70" />
                <span className="text-[10px] font-bold" style={{ color: scoreColor(s.score || 0) }}>{s.score || '—'}</span>
                <span className="text-[8px] text-white/50">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Volume indicator */}
          {liveAudio && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm">
              <Volume2 className={`w-3 h-3 ${liveAudio.isSpeaking ? 'text-green-400' : 'text-white/40'}`} />
              <div className="w-16 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${liveAudio.volumeLevel}%`, backgroundColor: liveAudio.clipping ? '#ef4444' : '#4ade80' }} />
              </div>
            </div>
          )}

          {/* Coaching cards */}
          <div className="absolute bottom-2 right-2 flex flex-col gap-1.5 max-w-[55%]">
            <AnimatePresence>
              {liveCards.map(card => (
                <motion.div key={card.id} initial={{ opacity: 0, x: 20, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 20, scale: 0.9 }}
                  className={`px-2.5 py-1.5 rounded-lg backdrop-blur-md text-[10px] font-medium shadow-lg ${
                    card.type === 'positive' ? 'bg-green-500/80 text-white' : card.type === 'warning' ? 'bg-red-500/80 text-white' : 'bg-blue-500/80 text-white'
                  }`} data-testid={`coaching-card-${card.id}`}>
                  {card.message}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Question mode overlay */}
        {useQuestionMode && currentQuestions.length > 0 && (
          <div className="absolute bottom-16 left-0 right-0 px-3">
            <div className="glass-strong rounded-xl p-3 shadow-xl">
              {isThinking ? (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Thinking time</p>
                  <p className="text-3xl font-bold text-primary">{thinkingCountdown}</p>
                  <p className="text-xs text-muted-foreground mt-1">Question {currentQuestionIdx + 1}/{currentQuestions.length}</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-muted-foreground">Q{currentQuestionIdx + 1}/{currentQuestions.length}</p>
                    {questionSettings.answerTimeLimit > 0 && (
                      <p className={`text-[11px] font-mono font-semibold ${answerCountdown < 10 ? 'text-red-400 animate-pulse' : answerCountdown < 30 ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                        <Timer className="w-3 h-3 inline mr-0.5" />{fmtTime(answerCountdown)}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-medium leading-snug">{currentQuestions[currentQuestionIdx]?.question}</p>
                  <Button size="sm" className="mt-2 rounded-lg text-xs w-full h-7" onClick={nextQuestion} data-testid="button-next-question">
                    {currentQuestionIdx < currentQuestions.length - 1 ? 'Next Question' : 'Finish'}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Teleprompter panel */}
        {showTeleprompter && (
          <div className="h-1/2 border-t border-border/30 flex flex-col bg-background">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20">
              <span className="text-[10px] font-semibold text-muted-foreground">TELEPROMPTER</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setTeleprompterAutoScroll(!teleprompterAutoScroll)} className={`px-2 py-0.5 rounded text-[9px] font-medium ${teleprompterAutoScroll ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`} data-testid="button-auto-scroll">
                  {teleprompterAutoScroll ? 'Auto' : 'Manual'}
                </button>
                {teleprompterAutoScroll && (
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => setTeleprompterSpeed(s => Math.max(1, s - 1))} className="w-5 h-5 rounded bg-secondary flex items-center justify-center text-xs">-</button>
                    <span className="text-[9px] text-muted-foreground w-4 text-center">{teleprompterSpeed}</span>
                    <button onClick={() => setTeleprompterSpeed(s => Math.min(5, s + 1))} className="w-5 h-5 rounded bg-secondary flex items-center justify-center text-xs">+</button>
                  </div>
                )}
              </div>
            </div>
            <div ref={teleprompterRef} className="flex-1 overflow-y-auto px-4 py-3">
              <p className="text-lg leading-relaxed font-medium whitespace-pre-wrap">{script}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderScriptGenerator = () => (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="px-4 pt-12 pb-24 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('home')} className="text-muted-foreground" data-testid="button-back-script"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold font-display">Script Generator</h1>
      </div>

      {isDemoMode ? (
        <div className="glass rounded-2xl p-5 text-center">
          <AlertCircle className="w-10 h-10 text-amber-500/30 mx-auto mb-3" />
          <h3 className="font-semibold text-sm">Demo Mode</h3>
          <p className="text-xs text-muted-foreground mt-1">AI script generation is disabled in demo mode.</p>
        </div>
      ) : !isScriptGenerationAvailable() ? (
        <div className="glass rounded-2xl p-5 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-semibold text-sm">API Key Required</h3>
          <p className="text-xs text-muted-foreground mt-1">Add your longcat.chat API key to enable AI script generation.</p>
          <p className="text-[10px] text-muted-foreground mt-3">Set the VITE_LONGCAT_API_KEY environment variable.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Topic *</label>
            <input value={scriptSettings.topic || sessionTopic} onChange={e => setScriptSettings(s => ({ ...s, topic: e.target.value }))}
              placeholder="Your speech topic" data-testid="input-script-topic"
              className="w-full bg-secondary/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border/50" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">Audience</label>
              <select value={scriptSettings.targetAudience} onChange={e => setScriptSettings(s => ({ ...s, targetAudience: e.target.value }))}
                className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-xs border border-border/50" data-testid="select-audience">
                <option value="">Select...</option>
                {AUDIENCE_PRESETS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">Tone</label>
              <select value={scriptSettings.tone} onChange={e => setScriptSettings(s => ({ ...s, tone: e.target.value }))}
                className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-xs border border-border/50" data-testid="select-tone">
                {TONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">Language</label>
              <input value={scriptSettings.language} onChange={e => setScriptSettings(s => ({ ...s, language: e.target.value }))}
                className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-xs border border-border/50" data-testid="input-script-language" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">Complexity</label>
              <select value={scriptSettings.complexityLevel} onChange={e => setScriptSettings(s => ({ ...s, complexityLevel: e.target.value as any }))}
                className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-xs border border-border/50" data-testid="select-complexity">
                {COMPLEXITY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Key Points</label>
            <textarea value={scriptSettings.keyPoints} onChange={e => setScriptSettings(s => ({ ...s, keyPoints: e.target.value }))}
              placeholder="Key points to cover..." data-testid="input-key-points"
              className="w-full h-16 bg-secondary/30 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border/50" />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Purpose</label>
            <input value={scriptSettings.purpose} onChange={e => setScriptSettings(s => ({ ...s, purpose: e.target.value }))}
              placeholder="e.g. Persuade, Inform, Inspire" data-testid="input-purpose"
              className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-xs border border-border/50" />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Call to Action</label>
            <input value={scriptSettings.callToAction} onChange={e => setScriptSettings(s => ({ ...s, callToAction: e.target.value }))}
              placeholder="What action should the audience take?" data-testid="input-cta"
              className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-xs border border-border/50" />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Custom Instructions</label>
            <textarea value={scriptSettings.customInstructions} onChange={e => setScriptSettings(s => ({ ...s, customInstructions: e.target.value }))}
              placeholder="Any additional instructions..." data-testid="input-custom-instructions"
              className="w-full h-14 bg-secondary/30 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border/50" />
          </div>

          <Button className="w-full rounded-xl h-10 font-semibold gap-2 text-sm" onClick={handleGenerateScript} disabled={scriptGenerating || !(scriptSettings.topic || sessionTopic)} data-testid="button-generate-script">
            {scriptGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate Script</>}
          </Button>

          {script && (
            <div className="space-y-2">
              <label className="text-[11px] text-muted-foreground block">Generated Script (editable)</label>
              <textarea value={script} onChange={e => setScript(e.target.value)} data-testid="textarea-generated-script"
                className="w-full h-40 bg-secondary/30 rounded-xl px-3 py-2 text-xs resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border/50" />
              <Button variant="secondary" className="w-full rounded-xl h-9 text-xs" onClick={() => { setUseScript(true); setView('home'); }} data-testid="button-use-script">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Use This Script
              </Button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );

  const renderReport = () => {
    if (!currentReport) return null;
    const r = currentReport;
    const allScores = Object.entries(r.scores);

    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="px-4 pt-12 pb-24 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setCurrentReport(null); setView('home'); }} className="text-muted-foreground" data-testid="button-back-report"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-bold font-display flex-1 truncate">{r.title}</h1>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <Button size="sm" variant="secondary" className="rounded-lg text-[10px] h-7 flex-shrink-0" onClick={() => handleDownloadReport(r)} data-testid="button-download-report">
            <Download className="w-3 h-3 mr-1" /> Download
          </Button>
          <Button size="sm" variant="secondary" className="rounded-lg text-[10px] h-7 flex-shrink-0" onClick={() => handlePrintReport(r)} data-testid="button-print-report">
            <Printer className="w-3 h-3 mr-1" /> Print
          </Button>
          <Button size="sm" variant="secondary" className="rounded-lg text-[10px] h-7 flex-shrink-0"
            onClick={() => {
              setMediaModalScript(r.summary || r.script || `Coaching report for ${r.title}. Score: ${r.overallScore}/100. Duration: ${Math.round(r.duration / 60)} minutes. Strengths: ${(r.strengths || []).join(', ')}. Areas to improve: ${(r.areasToImprove || []).join(', ')}.`);
              setMediaModalTitle(r.title);
              setMediaModalSourceId(r.id);
            }}
          >
            <Headphones className="w-3 h-3 mr-1" /> Audio
          </Button>
          <Button size="sm" variant="ghost" className="rounded-lg text-[10px] h-7 flex-shrink-0 text-destructive" onClick={() => { deleteCoachReport(r.id); refreshReports(); setCurrentReport(null); setView('home'); }} data-testid="button-delete-report">
            <Trash2 className="w-3 h-3 mr-1" /> Delete
          </Button>
        </div>

        <div className="glass rounded-2xl p-5 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <div className="relative">
            <p className="text-5xl font-bold" style={{ color: scoreColor(r.overallScore) }} data-testid="text-overall-score">{r.overallScore}</p>
            <p className="text-xs text-muted-foreground mt-1">Overall Score</p>
            <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-muted-foreground flex-wrap">
              <span><Clock className="w-3 h-3 inline mr-0.5" /> {fmtTime(r.duration)}</span>
              {r.targetDuration > 0 && <span><Target className="w-3 h-3 inline mr-0.5" /> Target: {fmtTime(r.targetDuration)}</span>}
              {r.overtime > 0 && <span className="text-red-500">Overtime: {fmtTime(r.overtime)}</span>}
            </div>
            <div className="flex items-center justify-center gap-2 mt-2 text-[9px] text-muted-foreground flex-wrap">
              {r.scriptUsed && <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">Script</span>}
              {r.splitScreenUsed && <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">Teleprompter</span>}
              {r.questionModeUsed && <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">Q&A</span>}
              {r.transcriptAvailable && <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">Transcript</span>}
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Section Scores</h3>
          <div className="space-y-2">
            {allScores.map(([key, s]) => (
              <button key={key} className="w-full" onClick={() => setExpandedScoreId(expandedScoreId === key ? null : key)} data-testid={`score-section-${key}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: scoreColor(s.score) + '15' }}>
                    <span className="text-sm font-bold" style={{ color: scoreColor(s.score) }}>{s.score}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-xs font-medium">{s.label}</p>
                    <div className="w-full h-1.5 bg-secondary/50 rounded-full mt-1 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${s.score}%`, backgroundColor: scoreColor(s.score) }} />
                    </div>
                  </div>
                  {expandedScoreId === key ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
                <AnimatePresence>
                  {expandedScoreId === key && (
                    <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="text-[11px] text-muted-foreground mt-2 text-left leading-relaxed overflow-hidden">{s.explanation}</motion.p>
                  )}
                </AnimatePresence>
              </button>
            ))}
          </div>
        </div>

        {r.strengths.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-green-500 uppercase tracking-wider mb-2">Strengths</h3>
            {r.strengths.map((s, i) => <p key={i} className="text-[11px] text-foreground/80 mb-1.5 flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" /> {s}</p>)}
          </div>
        )}

        {r.areasToImprove.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2">Areas to Improve</h3>
            {r.areasToImprove.map((s, i) => <p key={i} className="text-[11px] text-foreground/80 mb-1.5 flex items-start gap-1.5"><Target className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" /> {s}</p>)}
          </div>
        )}

        {r.suggestions.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Suggestions</h3>
            {r.suggestions.map((s, i) => <p key={i} className="text-[11px] text-foreground/80 mb-1.5 flex items-start gap-1.5"><Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" /> {s}</p>)}
          </div>
        )}

        {r.positiveReinforcement.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">What Went Well</h3>
            {r.positiveReinforcement.map((s, i) => <p key={i} className="text-[11px] text-foreground/80 mb-1.5 flex items-start gap-1.5"><Award className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" /> {s}</p>)}
          </div>
        )}

        {r.timelineMarkers.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Timeline Markers</h3>
            <div className="space-y-1.5">
              {r.timelineMarkers.slice(0, 10).map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <span className="text-muted-foreground font-mono w-10 text-right">{fmtTime(m.time)}</span>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.type === 'overtime' ? 'bg-red-500' : m.type === 'recovery' ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <span className="text-foreground/80">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="glass rounded-2xl p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Summary</h3>
          <p className="text-sm leading-relaxed text-foreground/80" data-testid="text-report-summary">{r.summary}</p>
        </div>

        <p className="text-[9px] text-muted-foreground text-center">Report ID: {r.id}</p>
      </motion.div>
    );
  };

  const renderHistory = () => (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="px-4 pt-12 pb-24 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('home')} className="text-muted-foreground" data-testid="button-back-history"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold font-display">Session History</h1>
      </div>

      {reports.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-sm font-semibold">No sessions yet</h3>
          <p className="text-xs text-muted-foreground mt-1">Complete a coaching session to see it here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map(r => (
            <div key={r.id} className="glass rounded-xl overflow-hidden" data-testid={`history-item-${r.id}`}>
              <button onClick={() => { setCurrentReport(r); setView('report'); }} className="w-full p-3 flex items-center gap-3 text-left">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: scoreColor(r.overallScore) + '15' }}>
                  <span className="text-lg font-bold" style={{ color: scoreColor(r.overallScore) }}>{r.overallScore}</span>
                </div>
                <div className="flex-1 min-w-0">
                  {renamingId === r.id ? (
                    <input value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus
                      onBlur={() => { renameCoachReport(r.id, renameValue); refreshReports(); setRenamingId(null); }}
                      onKeyDown={e => { if (e.key === 'Enter') { renameCoachReport(r.id, renameValue); refreshReports(); setRenamingId(null); } }}
                      className="w-full bg-transparent text-sm font-medium focus:outline-none border-b border-primary" data-testid={`input-rename-${r.id}`} />
                  ) : (
                    <p className="text-sm font-medium truncate">{r.title}</p>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                    <span>{new Date(r.date).toLocaleDateString()}</span>
                    <span>{fmtTime(r.duration)}</span>
                    <span className="capitalize">{r.sessionType}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
              <div className="flex items-center gap-1 px-3 pb-2">
                <Button size="sm" variant="ghost" className="rounded-lg text-[10px] h-6 px-2" onClick={e => { e.stopPropagation(); setRenamingId(r.id); setRenameValue(r.title); }} data-testid={`button-rename-${r.id}`}>
                  <Edit3 className="w-3 h-3 mr-0.5" /> Rename
                </Button>
                <Button size="sm" variant="ghost" className="rounded-lg text-[10px] h-6 px-2" onClick={e => { e.stopPropagation(); handleDownloadReport(r); }} data-testid={`button-download-history-${r.id}`}>
                  <Download className="w-3 h-3 mr-0.5" /> Download
                </Button>
                <div className="flex-1" />
                <Button size="sm" variant="ghost" className="rounded-lg text-[10px] h-6 px-2 text-destructive" onClick={e => { e.stopPropagation(); deleteCoachReport(r.id); refreshReports(); }} data-testid={`button-delete-history-${r.id}`}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );

  return (
    <>
      <PageOnboardingTooltips pageId="presentation-coach" />
      <AnimatePresence mode="wait">
        {sessionActive && <motion.div key="session">{renderSession()}</motion.div>}
        {!sessionActive && view === 'home' && <motion.div key="home">{renderHome()}</motion.div>}
        {!sessionActive && view === 'permissions' && <motion.div key="permissions">{renderPermissions()}</motion.div>}
        {!sessionActive && view === 'script' && <motion.div key="script">{renderScriptGenerator()}</motion.div>}
        {!sessionActive && view === 'report' && <motion.div key="report">{renderReport()}</motion.div>}
        {!sessionActive && view === 'history' && <motion.div key="history">{renderHistory()}</motion.div>}
      </AnimatePresence>
      {mediaModalScript && (
        <MediaGenerationModal
          open
          onClose={() => setMediaModalScript(null)}
          sourceModule="coach"
          sourceId={mediaModalSourceId || `coach_${Date.now()}`}
          sourceName={mediaModalTitle || 'Coaching Report'}
          getSourceText={async (_f: number, _t: number) => mediaModalScript ?? ''}
        />
      )}
    </>
  );
}
