import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { logError } from '@/lib/logger';
import { QuizQuestion, QuizQuestionType, QuizResult, QuizUserAnswer, StudyMaterial, StudySession } from '@/types';
import { studyAIChat, QUIZ_SYSTEM_PROMPT, QUIZ_FEEDBACK_PROMPT } from '@/lib/studyAI';
import { getStudyFile } from '@/lib/studyStorage';
import { ArrowLeft, Clock, Download, Play, CheckCircle2, XCircle, ChevronDown, AlertTriangle, Trash2, History, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';

const QUIZ_TYPES: { value: QuizQuestionType; label: string; gradable: boolean; description: string }[] = [
  { value: 'mcq', label: 'MCQ', gradable: true, description: 'Multiple choice - auto-graded' },
  { value: 'fill_blank', label: 'Fill in the Blanks', gradable: true, description: 'Fill missing words - auto-graded' },
  { value: 'matching', label: 'Matching', gradable: true, description: 'Match pairs - auto-graded' },
  { value: 'short_qa', label: 'Short Q/A', gradable: true, description: '1-2 word answers - auto-graded' },
  { value: 'broad', label: 'Broad Questions', gradable: false, description: 'Long answers - download only' },
  { value: 'creative', label: 'Creative (NCTB)', gradable: false, description: 'NCTB style - download only' },
];

interface Props {
  sessions: StudySession[];
  materials: StudyMaterial[];
  quizHistory: QuizResult[];
  onSaveQuiz: (result: QuizResult) => void;
  onDeleteQuiz: (id: string) => void;
  onDeleteAllQuizzes: () => void;
  onBack: () => void;
}

export default function StudyQuiz({ sessions, materials, quizHistory, onSaveQuiz, onDeleteQuiz, onDeleteAllQuizzes, onBack }: Props) {
  // Setup state
  const [step, setStep] = useState<'setup' | 'generating' | 'quiz' | 'results' | 'history'>('setup');
  const [studentName, setStudentName] = useState('');
  const [className, setClassName] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState('');
  const [quizType, setQuizType] = useState<QuizQuestionType>('mcq');
  const [numQuestions, setNumQuestions] = useState('10');
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [manualTimeLimit, setManualTimeLimit] = useState(''); // in minutes
  const [scopeType, setScopeType] = useState<'session' | 'material' | 'topic' | 'all'>('session');

  // Quiz state
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [totalMarks, setTotalMarks] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Results state
  const [result, setResult] = useState<QuizResult | null>(null);
  const [feedback, setFeedback] = useState('');
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const isGradable = QUIZ_TYPES.find(t => t.value === quizType)?.gradable ?? true;
  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  // Filter out video materials - only readable files can have quizzes
  const readableMaterials = materials.filter(m => !['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(m.fileType));
  const sessionMaterials = readableMaterials.filter(m => m.sessionId === selectedSessionId);

  // Check if a material already had a quiz in last 24h
  const canTakeQuizForMaterial = useCallback((materialId: string): boolean => {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    // Check quizHistory for quizzes on this material in last 24h
    // Match by materialId stored in quiz or by checking session+material combo
    const recentQuizzes = quizHistory.filter(q => {
      const quizTime = new Date(q.createdAt).getTime();
      if (quizTime < last24h) return false;
      // Check if quiz was for this specific material (stored in topic or via sessionId+material matching)
      return q.sessionId === materials.find(m => m.id === materialId)?.sessionId;
    });
    // For material-scoped quizzes, check if material name matches
    return recentQuizzes.length === 0;
  }, [quizHistory, materials]);

  // Check for session-level (1 quiz per session per 24h)
  const canTakeQuizForSession = useCallback((sessionId: string): boolean => {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    return !quizHistory.some(q => q.sessionId === sessionId && new Date(q.createdAt).getTime() >= last24h);
  }, [quizHistory]);

  // Get materials that have had quizzes in last 24h (for duplicate detection)
  const materialNamesWithRecentQuiz = useMemo(() => {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const recent = quizHistory.filter(q => new Date(q.createdAt).getTime() >= last24h);
    return recent.map(q => q.topic.toLowerCase());
  }, [quizHistory]);

  // Timer countdown
  useEffect(() => {
    if (quizStarted && timerEnabled && timeRemaining > 0 && !quizSubmitted) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [quizStarted, timerEnabled, quizSubmitted]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Generate quiz with rate limiting
  const generateQuiz = async () => {
    // Offline check
    if (!navigator.onLine) {
      toast.error("You're offline — AI quiz generation requires an internet connection.");
      return;
    }

    // Rate limit check: 1 quiz per material/session per 24h
    if (scopeType === 'session' && selectedSessionId && !canTakeQuizForSession(selectedSessionId)) {
      toast.error('You already took a quiz for this session today. Try again in 24 hours or choose a different subject.');
      return;
    }
    if (scopeType === 'material' && selectedMaterialIds.length > 0) {
      const mat = materials.find(m => m.id === selectedMaterialIds[0]);
      if (mat && materialNamesWithRecentQuiz.includes(mat.name.toLowerCase())) {
        toast.error(`You already took a quiz for "${mat.name}" today. Try again in 24 hours.`);
        return;
      }
    }
    setStep('generating');
    try {
      // Gather content based on scope
      let contentSummary = '';
      let subject = customTopic || 'General';
      let topic = '';

      if (scopeType === 'all') {
        subject = 'All Subjects';
        const allSubjects = [...new Set(sessions.map(s => s.subject))].join(', ');
        contentSummary = `Generate questions covering these subjects: ${allSubjects}. Topics: ${sessions.map(s => `${s.subject}: ${s.topic}`).join('; ')}`;
      } else if (scopeType === 'session' && selectedSession) {
        subject = selectedSession.subject;
        topic = selectedSession.topic;
        // Try to get content from materials
        for (const mat of sessionMaterials.slice(0, 3)) {
          try {
            const file = await getStudyFile(mat.id);
            if (file?.content) contentSummary += file.content.substring(0, 3000) + '\n\n';
          } catch { /* skip */ }
        }
        if (!contentSummary) contentSummary = `Subject: ${subject}, Topic: ${topic}`;
      } else if (scopeType === 'material' && selectedMaterialIds.length > 0) {
        const mat = materials.find(m => m.id === selectedMaterialIds[0]);
        subject = selectedSession?.subject || 'Study Material';
        topic = mat?.name || '';
        try {
          const file = await getStudyFile(selectedMaterialIds[0]);
          if (file?.content) contentSummary = file.content.substring(0, 5000);
        } catch { /* skip */ }
        if (!contentSummary) contentSummary = `Material: ${topic}`;
      } else if (scopeType === 'topic') {
        subject = customTopic || 'Custom Topic';
        topic = customTopic;
        contentSummary = `Topic: ${customTopic}. Generate questions about this topic.`;
      }

      const numQ = parseInt(numQuestions) || 10;
      const typeLabel = QUIZ_TYPES.find(t => t.value === quizType)?.label || quizType;

      const prompt = `Generate exactly ${numQ} ${typeLabel} questions about:
Subject: ${subject}
Topic: ${topic || 'General'}
Content: ${contentSummary.substring(0, 4000)}

Question type: ${quizType}
Number of questions: ${numQ}
${!isGradable ? 'These are non-gradable questions. Only provide questions with marks, NO answers needed.' : 'Provide correct answers for auto-grading.'}
${quizType === 'creative' ? 'Use NCTB Bangladesh creative question format with stimulus and 4 parts (ক,খ,গ,ঘ).' : ''}

Respond with valid JSON only.`;

      const response = await studyAIChat(
        [
          { role: 'system', content: QUIZ_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        { maxTokens: 3000, temperature: 0.6 }
      );

      // Parse JSON from response
      let parsed: any;
      try {
        // Extract JSON from response (may have markdown wrapping)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found');
        }
      } catch {
        toast.error('Failed to parse quiz. Please try again.');
        setStep('setup');
        return;
      }

      const qs: QuizQuestion[] = (parsed.questions || []).map((q: any, i: number) => ({
        id: q.id || i + 1,
        type: quizType,
        question: q.question || q.stimulus || '',
        options: q.options,
        correctAnswer: q.correctAnswer,
        marks: q.marks || 1,
        matchPairs: q.matchPairs,
        stimulus: q.stimulus,
        parts: q.parts,
      }));

      if (qs.length === 0) {
        toast.error('No questions generated. Try again.');
        setStep('setup');
        return;
      }

      const total = qs.reduce((s, q) => s + q.marks, 0);

      // Calculate time
      let finalTime = 0;
      if (timerEnabled && manualTimeLimit && parseInt(manualTimeLimit) > 0) {
        finalTime = parseInt(manualTimeLimit) * 60; // Convert to seconds
      } else {
        // Auto-calculate time: ~1 min per MCQ mark, 2 min per other
        finalTime = isGradable ? total * 60 : 0;
        finalTime = parsed.totalTime || finalTime;
      }

      setQuestions(qs);
      setTotalMarks(parsed.totalMarks || total);
      setTotalTime(finalTime);
      setTimeRemaining(finalTime);
      setUserAnswers({});
      setQuizSubmitted(false);
      setQuizStarted(false);
      setStep('quiz');
      toast.success(`${qs.length} questions generated!`);
    } catch (err) {
      logError('Quiz generation error', err);
      toast.error('Failed to generate quiz. Check your connection.');
      setStep('setup');
    }
  };

  const startQuiz = () => {
    setQuizStarted(true);
    if (!timerEnabled) setTimeRemaining(0);
  };

  const handleSubmit = useCallback((autoSubmit = false) => {
    if (quizSubmitted) return;
    setQuizSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const timeTaken = timerEnabled ? totalTime - timeRemaining : 0;
    const subject = selectedSession?.subject || customTopic || 'General';
    const topic = selectedSession?.topic || customTopic || '';

    if (isGradable) {
      // Auto-grade
      let obtained = 0;
      const answers: QuizUserAnswer[] = questions.map(q => {
        const userAns = (userAnswers[q.id] || '').trim();
        let correct = false;
        if (q.type === 'mcq') {
          correct = userAns.toUpperCase() === (q.correctAnswer || '').toUpperCase();
        } else {
          correct = userAns.toLowerCase() === (q.correctAnswer || '').toLowerCase();
        }
        const marks = correct ? q.marks : 0;
        obtained += marks;
        return { questionId: q.id, answer: userAns, isCorrect: correct, marksObtained: marks };
      });

      const quizResult: QuizResult = {
        id: crypto.randomUUID(),
        sessionId: selectedSessionId || undefined,
        subject,
        topic,
        className,
        studentName,
        quizType,
        questions,
        userAnswers: answers,
        totalMarks,
        obtainedMarks: obtained,
        totalTime,
        timeTaken,
        timerEnabled,
        isGradable: true,
        createdAt: new Date().toISOString(),
      };

      setResult(quizResult);
      onSaveQuiz(quizResult);
      setStep('results');

      // Get AI feedback
      if (!navigator.onLine) {
        setFeedback('Great effort! Keep studying and you\'ll keep improving 💪');
        setLoadingFeedback(false);
        return;
      }

      setLoadingFeedback(true);
      const pct = Math.round((obtained / totalMarks) * 100);
      studyAIChat(
        [
          { role: 'system', content: QUIZ_FEEDBACK_PROMPT },
          { role: 'user', content: `Student: ${studentName}, Subject: ${subject}, Score: ${obtained}/${totalMarks} (${pct}%), Questions attempted: ${answers.filter(a => a.answer).length}/${questions.length}. ${autoSubmit ? 'Time ran out.' : 'Submitted manually.'}` },
        ],
        { maxTokens: 300, temperature: 0.7 }
      ).then(fb => {
        setFeedback(fb);
        // Update result with feedback
        const updated = { ...quizResult, feedback: fb };
        onSaveQuiz(updated);
      }).catch(() => setFeedback('Great effort! Keep studying and you\'ll keep improving 💪'))
        .finally(() => setLoadingFeedback(false));
    } else {
      // Non-gradable - just save questions
      const quizResult: QuizResult = {
        id: crypto.randomUUID(),
        sessionId: selectedSessionId || undefined,
        subject,
        topic,
        className,
        studentName,
        quizType,
        questions,
        userAnswers: [],
        totalMarks,
        obtainedMarks: 0,
        totalTime: 0,
        timeTaken: 0,
        timerEnabled: false,
        isGradable: false,
        createdAt: new Date().toISOString(),
      };
      setResult(quizResult);
      onSaveQuiz(quizResult);
      setStep('results');
    }
  }, [quizSubmitted, questions, userAnswers, totalMarks, totalTime, timeRemaining, timerEnabled, selectedSession, customTopic, className, studentName, quizType, isGradable, selectedSessionId, onSaveQuiz]);

  const downloadQuiz = (quizResult?: QuizResult) => {
    const r = quizResult || result;
    if (!r) return;
    let text = `Quiz: ${r.subject} - ${r.topic}\nStudent: ${r.studentName}\nClass: ${r.className}\nType: ${r.quizType.toUpperCase()}\nDate: ${new Date(r.createdAt).toLocaleDateString()}\nTotal Marks: ${r.totalMarks}\n`;
    if (r.isGradable) text += `Obtained: ${r.obtainedMarks}/${r.totalMarks}\n`;
    text += `\n${'='.repeat(50)}\n\n`;

    r.questions.forEach((q, i) => {
      if (q.type === 'creative') {
        text += `Q${i + 1}. [Creative - ${q.marks} marks]\n`;
        text += `Stimulus: ${q.stimulus}\n`;
        q.parts?.forEach(p => { text += `  (${p.label}) ${p.question} [${p.marks} marks]\n`; });
      } else {
        text += `Q${i + 1}. ${q.question} [${q.marks} marks]\n`;
        if (q.options) q.options.forEach(o => { text += `  ${o}\n`; });
      }
      if (r.isGradable) {
        const ua = r.userAnswers.find(a => a.questionId === q.id);
        if (ua) {
          text += `  Your answer: ${ua.answer || '(not answered)'}\n`;
          text += `  Correct answer: ${q.correctAnswer}\n`;
          text += `  ${ua.isCorrect ? '✓ Correct' : '✗ Incorrect'} (${ua.marksObtained}/${q.marks})\n`;
        }
      }
      text += '\n';
    });

    if (r.feedback) text += `\nFeedback: ${r.feedback}\n`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Quiz-${r.subject}-${new Date(r.createdAt).toLocaleDateString()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── SETUP SCREEN ───
  if (step === 'setup' || step === 'history') {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-muted-foreground" aria-label="Go back"><ArrowLeft className="w-5 h-5" /></button>
          <h2 className="text-lg font-bold font-display flex-1 flex items-center gap-2"><Brain className="w-5 h-5 text-primary" /> AI Quiz Generator</h2>
          <Button size="sm" variant={step === 'history' ? 'default' : 'ghost'} onClick={() => setStep(step === 'history' ? 'setup' : 'history')}>
            <History className="w-4 h-4" />
          </Button>
        </div>

        {/* Quiz History */}
        {step === 'history' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">📋 Quiz History ({quizHistory.length})</p>
              {quizHistory.length > 0 && (
                <button onClick={onDeleteAllQuizzes} className="text-[10px] text-destructive flex items-center gap-1"><Trash2 className="w-3 h-3" /> Clear All</button>
              )}
            </div>
            {quizHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No quizzes taken yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                {[...quizHistory].reverse().map(q => (
                  <div key={q.id} className="glass rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{q.subject}</span>
                      <span className="text-[9px] text-muted-foreground">{new Date(q.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap text-[9px]">
                      <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">{q.quizType.toUpperCase()}</span>
                      {q.isGradable && (
                        <span className={`px-1.5 py-0.5 rounded-full ${q.obtainedMarks / q.totalMarks >= 0.7 ? 'bg-success/15 text-success' : q.obtainedMarks / q.totalMarks >= 0.4 ? 'bg-warning/15 text-warning' : 'bg-destructive/15 text-destructive'}`}>
                          {q.obtainedMarks}/{q.totalMarks}
                        </span>
                      )}
                      <span className="text-muted-foreground">{q.questions.length} Qs</span>
                      {q.studentName && <span className="text-muted-foreground">by {q.studentName}</span>}
                    </div>
                    {q.feedback && <p className="text-[10px] text-muted-foreground line-clamp-2">{q.feedback}</p>}
                    <div className="flex gap-1.5 pt-1">
                      <button onClick={() => downloadQuiz(q)} className="text-[10px] text-primary flex items-center gap-0.5"><Download className="w-3 h-3" /> Download</button>
                      <button onClick={() => onDeleteQuiz(q.id)} className="text-[10px] text-destructive flex items-center gap-0.5"><Trash2 className="w-3 h-3" /> Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Setup Form */}
        {step === 'setup' && (
          <div className="glass rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground">📝 Configure your quiz</p>

            {/* Required fields */}
            <Input placeholder="Your Name *" value={studentName} onChange={e => setStudentName(e.target.value)} className="bg-secondary border-0" />
            <Input placeholder="Class/Grade *" value={className} onChange={e => setClassName(e.target.value)} className="bg-secondary border-0" />

            {/* Scope selection */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-medium text-muted-foreground">Quiz Scope</span>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { v: 'session' as const, l: '📚 Subject/Session' },
                  { v: 'material' as const, l: '📄 Specific Material' },
                  { v: 'topic' as const, l: '💡 Custom Topic' },
                  { v: 'all' as const, l: '🌐 All Subjects' },
                ].map(s => (
                  <button key={s.v} onClick={() => setScopeType(s.v)}
                    className={`text-[10px] px-2.5 py-1.5 rounded-full transition-colors ${scopeType === s.v ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                    {s.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Session/Material selector */}
            {(scopeType === 'session' || scopeType === 'material') && (
              <Select value={selectedSessionId} onValueChange={v => { setSelectedSessionId(v); setSelectedMaterialIds([]); }}>
                <SelectTrigger className="bg-secondary border-0"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                <SelectContent>
                  {sessions.map(s => <SelectItem key={s.id} value={s.id}>{s.subject} — {s.topic}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {scopeType === 'material' && selectedSessionId && sessionMaterials.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground">Select material:</span>
                {sessionMaterials.map(m => (
                  <button key={m.id} onClick={() => setSelectedMaterialIds(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])}
                    className={`text-[10px] w-full text-left px-2.5 py-1.5 rounded-lg transition-colors ${selectedMaterialIds.includes(m.id) ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    {m.name}
                  </button>
                ))}
              </div>
            )}

            {scopeType === 'topic' && (
              <Input placeholder="Enter topic (e.g. Photosynthesis, World War II)" value={customTopic} onChange={e => setCustomTopic(e.target.value)} className="bg-secondary border-0" />
            )}

            {/* Quiz type */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-medium text-muted-foreground">Question Type</span>
              <div className="grid grid-cols-2 gap-1.5">
                {QUIZ_TYPES.map(t => (
                  <button key={t.value} onClick={() => setQuizType(t.value)}
                    className={`text-left p-2 rounded-xl transition-colors ${quizType === t.value ? 'bg-primary/20 border border-primary/30' : 'bg-secondary'}`}>
                    <p className="text-[11px] font-semibold">{t.label}</p>
                    <p className="text-[9px] text-muted-foreground">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Number of questions */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground flex-1">Number of Questions</span>
              <Input type="number" value={numQuestions} onChange={e => setNumQuestions(e.target.value)} className="w-20 bg-secondary border-0 text-center text-xs h-8" min="1" max="50" />
            </div>

            {/* Timer toggle */}
            {isGradable && (
              <div className="space-y-2 p-2 rounded-xl bg-secondary">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">⏱️ Enable Timer</p>
                    <p className="text-[9px] text-muted-foreground">Once enabled & started, cannot be disabled</p>
                  </div>
                  <Switch checked={timerEnabled} onCheckedChange={setTimerEnabled} />
                </div>

                {timerEnabled && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                    <span className="text-[10px] text-muted-foreground flex-1">Time Limit (minutes)</span>
                    <Input
                      type="number"
                      value={manualTimeLimit}
                      onChange={e => setManualTimeLimit(e.target.value)}
                      placeholder="Auto"
                      className="w-20 bg-background border-0 text-center text-xs h-8"
                      min="1"
                      max="180"
                    />
                  </div>
                )}
              </div>
            )}

            <Button onClick={generateQuiz} className="w-full" disabled={!studentName.trim() || !className.trim()}>
              <Brain className="w-4 h-4 mr-2" /> Generate Quiz
            </Button>
          </div>
        )}
      </motion.div>
    );
  }

  // ─── GENERATING ───
  if (step === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold">Generating quiz questions...</p>
        <p className="text-xs text-muted-foreground">AI is creating your personalized quiz</p>
      </div>
    );
  }

  // ─── RESULTS SCREEN ───
  if (step === 'results' && result) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <PageOnboardingTooltips pageId="study-quiz-result" />
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('setup')} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
          <h2 className="text-lg font-bold font-display flex-1">Quiz Results</h2>
          <Button size="sm" variant="ghost" onClick={() => downloadQuiz()}><Download className="w-4 h-4" /></Button>
        </div>

        {/* Score card */}
        {result.isGradable ? (
          <div data-tour="quiz-score" className="glass rounded-2xl p-4 text-center space-y-2">
            <p className="text-3xl font-bold font-display">
              <span className={result.obtainedMarks / result.totalMarks >= 0.7 ? 'text-success' : result.obtainedMarks / result.totalMarks >= 0.4 ? 'text-warning' : 'text-destructive'}>
                {result.obtainedMarks}
              </span>
              <span className="text-muted-foreground text-lg">/{result.totalMarks}</span>
            </p>
            <p className="text-xs text-muted-foreground">{result.subject} • {result.quizType.toUpperCase()} • {result.questions.length} Questions</p>
            <p className="text-xs text-muted-foreground">Student: {result.studentName} • Class: {result.className}</p>

            {/* Feedback */}
            {loadingFeedback ? (
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground">Getting feedback...</span>
              </div>
            ) : feedback && (
              <div data-tour="quiz-feedback" className="mt-2 p-3 rounded-xl bg-primary/5 text-left">
                <p className="text-xs leading-relaxed">{feedback}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="glass rounded-2xl p-4 text-center space-y-2">
            <p className="text-sm font-semibold">📝 Questions Generated</p>
            <p className="text-xs text-muted-foreground">{result.questions.length} {result.quizType} questions • {result.totalMarks} marks</p>
            <p className="text-xs text-muted-foreground">Download to practice. These questions require manual evaluation.</p>
          </div>
        )}

        {/* Question review */}
        <div className="space-y-2">
          {result.questions.map((q, i) => {
            const ua = result.userAnswers.find(a => a.questionId === q.id);
            return (
              <div key={q.id} className={`glass rounded-xl p-3 space-y-1 ${result.isGradable ? (ua?.isCorrect ? 'border-l-2 border-success' : 'border-l-2 border-destructive') : ''}`}>
                {q.type === 'creative' ? (
                  <>
                    <p className="text-[10px] font-semibold">Q{i + 1}. Creative [{q.marks} marks]</p>
                    <p className="text-xs italic">{q.stimulus}</p>
                    {q.parts?.map(p => (
                      <p key={p.label} className="text-xs ml-2">({p.label}) {p.question} [{p.marks}]</p>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      {result.isGradable && (ua?.isCorrect ? <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />)}
                      <p className="text-xs flex-1"><strong>Q{i + 1}.</strong> {q.question} [{q.marks}]</p>
                    </div>
                    {q.options && <div className="ml-6 space-y-0.5">{q.options.map((o, j) => (
                      <p key={j} className={`text-[10px] ${o.startsWith(q.correctAnswer || '?') ? 'text-success font-semibold' : ''}`}>{o}</p>
                    ))}</div>}
                    {result.isGradable && ua && (
                      <div className="ml-6 text-[10px] space-y-0.5">
                        <p>Your answer: <strong>{ua.answer || '(blank)'}</strong></p>
                        <p className="text-success">Correct: <strong>{q.correctAnswer}</strong></p>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button onClick={() => downloadQuiz()} variant="outline" className="flex-1"><Download className="w-4 h-4 mr-2" /> Download</Button>
          <Button onClick={() => setStep('setup')} className="flex-1">New Quiz</Button>
        </div>
      </motion.div>
    );
  }

  // ─── QUIZ SCREEN ───
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 sticky top-0 z-10 bg-background/90 backdrop-blur-md py-2">
        <button onClick={() => { if (confirm('Leave quiz? Progress will be lost.')) setStep('setup'); }} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{selectedSession?.subject || customTopic || 'Quiz'}</p>
          <p className="text-[10px] text-muted-foreground">{questions.length} questions • {totalMarks} marks</p>
        </div>
        {timerEnabled && quizStarted && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${timeRemaining < 60 ? 'bg-destructive/15 text-destructive animate-pulse' : 'bg-primary/15 text-primary'}`}>
            <Clock className="w-3 h-3" />
            <span className="text-xs font-mono font-semibold">{formatTime(timeRemaining)}</span>
          </div>
        )}
      </div>

      {/* Pre-start screen */}
      {!quizStarted && (
        <div className="glass rounded-2xl p-4 text-center space-y-3">
          <p className="text-sm font-semibold">Ready to start?</p>
          <p className="text-xs text-muted-foreground">{questions.length} questions • {totalMarks} marks{timerEnabled ? ` • ${formatTime(totalTime)} time limit` : ' • No time limit'}</p>
          <p className="text-xs text-muted-foreground">Student: {studentName} • Class: {className}</p>
          {timerEnabled && (
            <div className="flex items-center gap-2 text-[10px] text-warning justify-center">
              <AlertTriangle className="w-3 h-3" />
              <span>Timer cannot be disabled after starting</span>
            </div>
          )}
          <Button onClick={startQuiz} className="w-full"><Play className="w-4 h-4 mr-2" /> Start Quiz</Button>
        </div>
      )}

      {/* Questions */}
      {quizStarted && !quizSubmitted && isGradable && (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id} className="glass rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold"><span className="text-primary">Q{i + 1}.</span> {q.question} <span className="text-muted-foreground">[{q.marks}]</span></p>

              {q.type === 'mcq' && q.options && (
                <RadioGroup value={userAnswers[q.id] || ''} onValueChange={v => setUserAnswers(prev => ({ ...prev, [q.id]: v }))}>
                  {q.options.map((opt, j) => {
                    const letter = opt.charAt(0);
                    return (
                      <div key={j} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary">
                        <RadioGroupItem value={letter} id={`q${q.id}-${j}`} />
                        <Label htmlFor={`q${q.id}-${j}`} className="text-xs cursor-pointer flex-1">{opt}</Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              )}

              {(q.type === 'fill_blank' || q.type === 'short_qa') && (
                <Input
                  placeholder={q.type === 'fill_blank' ? 'Fill in the blank...' : 'Your answer...'}
                  value={userAnswers[q.id] || ''}
                  onChange={e => setUserAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  className="bg-secondary border-0 text-xs h-8"
                />
              )}

              {q.type === 'matching' && q.matchPairs && (
                <div className="space-y-1">
                  {q.matchPairs.map((pair, j) => (
                    <div key={j} className="flex items-center gap-2 text-xs">
                      <span className="bg-secondary px-2 py-1 rounded flex-1">{pair.left}</span>
                      <span className="text-muted-foreground">→</span>
                      <Input
                        placeholder="Match..."
                        value={(userAnswers[q.id] || '').split('|')[j] || ''}
                        onChange={e => {
                          const parts = (userAnswers[q.id] || '').split('|');
                          parts[j] = e.target.value;
                          setUserAnswers(prev => ({ ...prev, [q.id]: parts.join('|') }));
                        }}
                        className="bg-secondary border-0 text-xs h-7 flex-1"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <Button onClick={() => handleSubmit(false)} className="w-full" size="lg">Submit Quiz</Button>
        </div>
      )}

      {/* Non-gradable: just show questions */}
      {quizStarted && !isGradable && (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id} className="glass rounded-xl p-3 space-y-1">
              {q.type === 'creative' ? (
                <>
                  <p className="text-[10px] font-semibold text-primary">Creative Question {i + 1} [{q.marks} marks]</p>
                  <p className="text-xs italic leading-relaxed bg-secondary/50 p-2 rounded-lg">{q.stimulus}</p>
                  {q.parts?.map(p => (
                    <p key={p.label} className="text-xs ml-2">({p.label}) {p.question} <span className="text-muted-foreground">[{p.marks}]</span></p>
                  ))}
                </>
              ) : (
                <p className="text-xs"><strong className="text-primary">Q{i + 1}.</strong> {q.question} <span className="text-muted-foreground">[{q.marks}]</span></p>
              )}
            </div>
          ))}

          <div className="glass rounded-xl p-3 text-center space-y-2">
            <p className="text-xs text-muted-foreground">These questions require written answers. Download to practice.</p>
            <div className="flex gap-2">
              <Button onClick={() => handleSubmit(false)} variant="outline" className="flex-1">Save to History</Button>
              <Button onClick={() => downloadQuiz()} className="flex-1"><Download className="w-4 h-4 mr-2" /> Download</Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
