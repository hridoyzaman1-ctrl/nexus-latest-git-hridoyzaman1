import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalStorage, getLocalStorage } from '@/hooks/useLocalStorage';
import { MeditationSession, AnxietyLog, Routine, RoutineStep, BreathingFeedback, SleepEntry, WaterEntry } from '@/types';
import { exampleAnxietyLogs, exampleRoutines } from '@/lib/examples';
import { getDailyQuote } from '@/lib/quotes';
import { ArrowLeft, Play, Pause, Brain, Heart, Wind, Compass, CheckCircle2, Circle, Hand, Eye, Ear, Fingerprint, Flower2, Coffee, Music, Upload, Trash2, Sparkles, Plus, X, BookHeart, Lock, AlertTriangle, PartyPopper, Loader2, MessageCircle, ChevronRight, Moon, Droplets, Sunrise, Smile, Frown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import AudioVisualizer from '@/components/AudioVisualizer';
import { useCheckLimiter } from '@/hooks/useCheckLimiter';
import { isDemoMode } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';
import EmptyState from '@/components/EmptyState';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';
import { TimePicker } from '@/components/TimePicker';

const sections = [
  { id: 'meditation', label: 'Meditation', icon: Brain, color: 'hsl(280, 60%, 55%)', desc: 'Timer, music & ambient sounds' },
  { id: 'sleep', label: 'Sleep', icon: Moon, color: 'hsl(230, 70%, 55%)', desc: 'Track sleep & get feedback' },
  { id: 'water', label: 'Water', icon: Droplets, color: 'hsl(199, 89%, 48%)', desc: 'Track daily hydration' },
  { id: 'ocd', label: 'OCD Support', icon: Heart, color: 'hsl(340, 82%, 52%)', desc: 'Anxiety logs & coping tools' },
  { id: 'grounding', label: '5-4-3-2-1', icon: Hand, color: 'hsl(38, 92%, 50%)', desc: 'Sensory grounding exercise' },
  { id: 'routines', label: 'Routines', icon: Compass, color: 'hsl(152, 69%, 45%)', desc: 'Build & track daily routines' },
  { id: 'breathing', label: 'Breathing', icon: Wind, color: 'hsl(199, 89%, 48%)', desc: '4-7-8 breathing technique' },
  { id: 'journal', label: 'Journal', icon: BookHeart, color: 'hsl(291, 64%, 42%)', desc: 'Challenge intrusive thoughts' },
];

const copingStrategies = [
  "Delay the compulsion by 15 minutes",
  "Practice deep breathing",
  "Write down your thoughts",
  "Use the 5-4-3-2-1 grounding technique",
  "Remember: thoughts are not facts",
];

export default function Wellness() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);




  if (activeSection === 'meditation') return <MeditationView onBack={() => setActiveSection(null)} />;
  if (activeSection === 'ocd') return <OCDView onBack={() => setActiveSection(null)} />;
  if (activeSection === 'grounding') return <GroundingView onBack={() => setActiveSection(null)} />;
  if (activeSection === 'routines') return <RoutinesView onBack={() => setActiveSection(null)} />;
  if (activeSection === 'breathing') return <BreathingView onBack={() => setActiveSection(null)} />;
  if (activeSection === 'sleep') return <SleepTrackerView onBack={() => setActiveSection(null)} />;
  if (activeSection === 'water') return <WaterTrackerView onBack={() => setActiveSection(null)} />;
  if (activeSection === 'journal') return <ReassuranceJournalView onBack={() => setActiveSection(null)} />;

  const quote = getDailyQuote();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pt-12 pb-24 space-y-4">
      <PageOnboardingTooltips pageId="wellness" />
      <div data-tour="wellness-header" className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-display">Wellness Hub</h1>
          <p className="text-sm text-muted-foreground">Tools for mental health and mindfulness</p>
        </div>

      </div>

      {/* Daily Inspiration — same quote as Dashboard */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="glass rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">Daily Inspiration</span>
        </div>
        <p className="text-sm italic text-foreground/90 leading-relaxed">"{quote.text}"</p>
        <p className="text-xs text-muted-foreground">— {quote.author}</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        {sections.map(({ id, label, icon: Icon, color, desc }, i) => (
          <motion.button
            key={id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            onClick={() => setActiveSection(id)}
            className="glass rounded-2xl p-5 text-left hover:bg-card/80 transition-all active:scale-[0.97] relative"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 absolute top-4 right-4" />
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: color + '18' }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
          </motion.button>
        ))}
      </div>

    </motion.div>
  );
}

// ============ 5-4-3-2-1 Grounding Exercise ============
interface GroundingEntry {
  id: string;
  responses: { see: string[]; hear: string[]; touch: string[]; smell: string[]; taste: string[] };
  completedAt: string;
}

function GroundingView({ onBack }: { onBack: () => void }) {
  const [history, setHistory] = useLocalStorage<GroundingEntry[]>('groundingHistory', []);
  const [showHistory, setShowHistory] = useState(false);

  const deleteEntry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const backup = history.find(entry => entry.id === id);
    const index = history.findIndex(entry => entry.id === id);
    setHistory(prev => prev.filter(entry => entry.id !== id));
    toast.success('Entry deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          if (backup) {
            setHistory(prev => {
              const newHistory = [...prev];
              newHistory.splice(index, 0, backup);
              return newHistory;
            });
          }
        }
      }
    });
  };

  const clearHistory = () => {
    const backup = [...history];
    setHistory([]);
    toast.success('History cleared', {
      action: {
        label: 'Undo',
        onClick: () => setHistory(backup)
      }
    });
  };

  const [step, setStep] = useState(0);
  const [see, setSee] = useState<string[]>(['', '', '', '', '']);
  const [hear, setHear] = useState<string[]>(['', '', '', '']);
  const [touch, setTouch] = useState<string[]>(['', '', '']);
  const [smell, setSmell] = useState<string[]>(['', '']);
  const [taste, setTaste] = useState<string[]>(['']);

  const steps = [
    { label: 'Start', count: 0, icon: Hand, color: 'hsl(245, 58%, 62%)', description: '' },
    { label: '5 things you SEE', count: 5, icon: Eye, color: 'hsl(199, 89%, 48%)', description: 'Look around. Name 5 things you can see right now.' },
    { label: '4 things you HEAR', count: 4, icon: Ear, color: 'hsl(152, 69%, 45%)', description: 'Pause and listen carefully. Name 4 sounds you hear.' },
    { label: '3 things you TOUCH', count: 3, icon: Fingerprint, color: 'hsl(38, 92%, 50%)', description: 'Feel the surfaces around you. Name 3 things you can touch.' },
    { label: '2 things you SMELL', count: 2, icon: Flower2, color: 'hsl(291, 64%, 42%)', description: 'Breathe in gently. Name 2 things you can smell.' },
    { label: '1 thing you TASTE', count: 1, icon: Coffee, color: 'hsl(340, 82%, 52%)', description: 'Focus on your mouth. Name 1 thing you can taste.' },
    { label: 'Complete', count: 0, icon: CheckCircle2, color: 'hsl(152, 69%, 45%)', description: '' },
  ];

  const getFields = (): [string[], (v: string[]) => void] => {
    if (step === 1) return [see, setSee];
    if (step === 2) return [hear, setHear];
    if (step === 3) return [touch, setTouch];
    if (step === 4) return [smell, setSmell];
    return [taste, setTaste];
  };

  const canNext = () => {
    if (step === 0 || step === 6) return true;
    const [fields] = getFields();
    return fields.every(f => f.trim().length > 0);
  };

  const next = () => {
    if (step === 5 && canNext()) {
      setHistory(prev => [...prev, {
        id: crypto.randomUUID(),
        responses: { see, hear, touch, smell, taste },
        completedAt: new Date().toISOString(),
      }]);
      setStep(6);
    } else if (step < 6) {
      setStep(step + 1);
    }
  };

  const reset = () => {
    setStep(0);
    setSee(['', '', '', '', '']);
    setHear(['', '', '', '']);
    setTouch(['', '', '']);
    setSmell(['', '']);
    setTaste(['']);
  };

  const updateField = (index: number, value: string) => {
    const [fields, setFields] = getFields();
    const updated = [...fields];
    updated[index] = value;
    setFields(updated);
  };

  const currentStep = steps[step];
  const Icon = currentStep.icon;
  const senseLabels = ['', 'I can see...', 'I can hear...', 'I can touch...', 'I can smell...', 'I can taste...', ''];

  return (
    <div className="px-4 pt-12 pb-24 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground" aria-label="Go back"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display">5-4-3-2-1 Grounding</h1>
      </div>

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex-1 h-1.5 rounded-full transition-colors duration-300"
            style={{ background: step >= i ? currentStep.color : 'hsl(var(--secondary))' }} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
          {step === 0 && (
            <div className="glass rounded-2xl p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: currentStep.color + '22' }}>
                <Hand className="w-8 h-8" style={{ color: currentStep.color }} />
              </div>
              <h2 className="text-lg font-bold font-display">5-4-3-2-1 Grounding</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This technique helps you reconnect with the present moment when you're feeling anxious, overwhelmed, or disconnected.
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>👁️ 5 things you see</p>
                <p>👂 4 things you hear</p>
                <p>✋ 3 things you touch</p>
                <p>👃 2 things you smell</p>
                <p>👅 1 thing you taste</p>
              </div>
              <Button onClick={next} className="w-full">Begin Exercise</Button>
            </div>
          )}

          {step >= 1 && step <= 5 && (
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: currentStep.color + '22' }}>
                  <Icon className="w-6 h-6" style={{ color: currentStep.color }} />
                </div>
                <div>
                  <h2 className="text-base font-bold font-display">{currentStep.label}</h2>
                  <p className="text-xs text-muted-foreground">{currentStep.description}</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {getFields()[0].map((val, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center" style={{ background: currentStep.color + '22', color: currentStep.color }}>{i + 1}</span>
                      <Input placeholder={senseLabels[step]} value={val} onChange={e => updateField(i, e.target.value)} className="bg-secondary border-0 flex-1" autoFocus={i === 0} />
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="flex gap-2">
                {step > 1 && <Button onClick={() => setStep(step - 1)} variant="ghost" size="sm">Back</Button>}
                <Button onClick={next} disabled={!canNext()} className="flex-1" size="sm">
                  {step === 5 ? 'Complete ✨' : 'Next'}
                </Button>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="glass rounded-2xl p-6 text-center space-y-4">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
                <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-success/20">
                  <CheckCircle2 className="w-10 h-10 text-success" />
                </div>
              </motion.div>
              <h2 className="text-lg font-bold font-display">Well Done! 🌟</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You've completed the grounding exercise. You're more present, grounded, and in control.
              </p>
              <div className="text-xs text-muted-foreground">Sessions completed: {history.length}</div>
              <div className="flex gap-2">
                <Button onClick={reset} variant="secondary" className="flex-1">Do Again</Button>
                <Button onClick={onBack} className="flex-1">Done</Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {history.length > 0 && step === 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">Previous Sessions</h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="text-[10px] h-7 text-muted-foreground">
                {showHistory ? 'Hide' : 'Show All'} ({history.length})
              </Button>
              <Button variant="ghost" size="sm" onClick={clearHistory} className="text-[10px] h-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="w-3 h-3 mr-1" /> Clear
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {(showHistory ? history.slice().reverse() : history.slice(-3).reverse()).map(entry => (
              <motion.div key={entry.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-xl p-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground">{new Date(entry.completedAt).toLocaleString()}</p>
                  <p className="text-xs mt-1 text-foreground/80 line-clamp-2">
                    <span className="font-bold text-primary mr-1">👁</span> {entry.responses.see.join(', ')}
                  </p>
                </div>
                <button
                  onClick={(e) => deleteEntry(entry.id, e)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
                  title="Delete entry"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Meditation View ============
function MeditationView({ onBack }: { onBack: () => void }) {
  const [sessions, setSessions] = useLocalStorage<MeditationSession[]>('meditationSessions', []);
  const [duration, setDuration] = useState(300);
  const [timeLeft, setTimeLeft] = useState(300);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const presets = [5, 10, 15, 20, 30];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const music = useMusicPlayer();

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setRunning(false);
          clearInterval(intervalRef.current);
          setSessions(p => [...p, { id: crypto.randomUUID(), duration: duration - prev + 1, completedAt: new Date().toISOString() }]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, duration, setSessions]);

  useEffect(() => {
    if (music.currentTrack) {
      setRunning(music.isPlaying);
    }
  }, [music.isPlaying, music.currentTrack]);

  const selectPreset = (min: number) => {
    setDuration(min * 60);
    setTimeLeft(min * 60);
    setRunning(false);
    clearInterval(intervalRef.current);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    toast.success('Session deleted from history');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error('Audio file too large (max 25MB)');
      e.target.value = '';
      return;
    }
    if (file.type.startsWith('audio/')) {
      music.addCustomTrack(file);
    } else {
      toast.error('Please select an MP3 or WAV audio file.');
    }
    e.target.value = '';
  };

  return (
    <div className="px-4 pt-12 pb-24 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground" aria-label="Go back"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display">Meditation</h1>
      </div>

      <div className="flex gap-2 justify-center flex-wrap">
        {presets.map(m => (
          <button key={m} onClick={() => selectPreset(m)} className={`text-xs px-3 py-1.5 rounded-full transition-colors ${duration === m * 60 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>{m}m</button>
        ))}
      </div>

      <div className={`rounded-2xl overflow-hidden relative ${music.glassmorphism ? 'glass' : 'bg-card border border-border'}`}>
        <AudioVisualizer glassmorphism={music.glassmorphism} />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: (running || music.isPlaying) ? [1, 1.08, 1] : 1 }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="w-32 h-32 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="w-24 h-24 rounded-full bg-primary/15 backdrop-blur-sm flex items-center justify-center">
              <span className="text-2xl font-bold font-display">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="flex items-center justify-between glass rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium">Glassmorphism Effect</span>
        </div>
        <Switch checked={music.glassmorphism} onCheckedChange={music.toggleGlassmorphism} />
      </div>

      <div className="flex justify-center">
        <button onClick={() => {
          if (music.currentTrack) {
            if (music.isPlaying) music.pause();
            else music.resume();
          } else {
            setRunning(!running);
          }
        }} className="w-14 h-14 rounded-full bg-primary flex items-center justify-center active:scale-90 transition-transform">
          {(running || music.isPlaying) ? <Pause className="w-6 h-6 text-primary-foreground" /> : <Play className="w-6 h-6 text-primary-foreground ml-0.5" />}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Music className="w-4 h-4" /> Meditation Sounds
          </h2>
          <button onClick={() => fileInputRef.current?.click()} className="text-xs text-primary flex items-center gap-1 active:scale-95 transition-transform">
            <Upload className="w-3.5 h-3.5" /> Import MP3
          </button>
          <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {music.tracks.map(track => (
            <motion.button
              key={track.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (music.currentTrack?.id === track.id && music.isPlaying) {
                  music.pause();
                } else if (music.currentTrack?.id === track.id) {
                  music.resume();
                } else {
                  music.play(track);
                }
              }}
              className={`rounded-xl p-3 text-left text-xs font-medium flex items-center justify-between transition-all ${music.currentTrack?.id === track.id
                ? 'bg-primary/15 border border-primary/30 text-primary'
                : 'glass hover:bg-card/80'
                }`}
            >
              <span className="truncate flex-1">{track.name}</span>
              <div className="flex items-center gap-1 shrink-0 ml-1">
                {music.currentTrack?.id === track.id && music.isPlaying && (
                  <div className="flex gap-0.5 items-end h-3">
                    {[1, 2, 3].map(i => (
                      <motion.div key={i} animate={{ height: ['4px', '12px', '4px'] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                        className="w-0.5 bg-primary rounded-full" />
                    ))}
                  </div>
                )}
                {(track.isCustom || track.isDeletable) && (
                  <button onClick={e => {
                    e.stopPropagation();
                    if (track.isCustom) {
                      music.removeCustomTrack(track.id);
                    } else {
                      music.removeBuiltinTrack(track.id);
                    }
                  }}
                    className="text-muted-foreground hover:text-destructive ml-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {sessions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">History</h2>
          {sessions.slice(-5).reverse().map(s => (
            <div key={s.id} className="glass rounded-xl p-3 flex justify-between items-center text-sm">
              <span>{Math.round(s.duration / 60)}min meditation</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{new Date(s.completedAt).toLocaleDateString()}</span>
                <button onClick={(e) => deleteSession(s.id, e)} className="text-muted-foreground hover:text-destructive active:scale-95 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ OCD View (with Check Limiter) ============
function OCDView({ onBack }: { onBack: () => void }) {
  const [hasInit] = useLocalStorage('ocd_init', false);
  const [logs, setLogs] = useLocalStorage<AnxietyLog[]>('anxietyLogs', hasInit ? [] : exampleAnxietyLogs);
  const [, setInit] = useLocalStorage('ocd_init', true);
  const [level, setLevel] = useState(5);
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const { recordCheck } = useCheckLimiter();
  const [nudgeMsg, setNudgeMsg] = useState('');

  useEffect(() => { if (!hasInit) setInit(true); }, [hasInit, setInit]);

  const handleViewLog = (logId: string) => {
    const result = recordCheck(`ocd_log_${logId}`);
    if (result.shouldNudge) {
      setNudgeMsg(result.message);
    }
  };

  const addLog = () => {
    if (duration === '') {
      toast.error('Please enter an estimated duration (minutes)');
      return;
    }
    setLogs(prev => [...prev, { id: crypto.randomUUID(), level, duration: parseInt(duration) || 0, notes, createdAt: new Date().toISOString() }]);
    setLevel(5); setDuration(''); setNotes('');
    toast.success('Anxiety log recorded');
  };

  const deleteLog = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLogs(prev => prev.filter(log => log.id !== id));
    toast.success('Log deleted');
  };

  const levelColor = (l: number) => l <= 3 ? 'hsl(152, 69%, 45%)' : l <= 6 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 84%, 60%)';

  return (
    <div className="px-4 pt-12 pb-24 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground" aria-label="Go back"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display">OCD Support</h1>
      </div>

      {/* Check Limiter Nudge */}
      <AnimatePresence>
        {nudgeMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Check Limiter</p>
                <p className="text-xs text-muted-foreground mt-1">{nudgeMsg}</p>
              </div>
              <button onClick={() => setNudgeMsg('')} className="text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold">Log Anxiety</h2>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Anxiety Level</span>
            <span className="font-bold" style={{ color: levelColor(level) }}>{level}/10</span>
          </div>
          <Slider value={[level]} onValueChange={([v]) => setLevel(v)} min={1} max={10} step={1} />
        </div>
        <Input type="number" placeholder="Duration (minutes)" value={duration} onChange={e => setDuration(e.target.value)} className="bg-secondary border-0" />
        <Textarea placeholder="Notes..." value={notes} onChange={e => setNotes(e.target.value)} className="bg-secondary border-0" />
        <Button onClick={addLog} size="sm" className="w-full">Log Entry</Button>
      </div>
      <div className="glass rounded-2xl p-4">
        <h2 className="text-sm font-semibold mb-3">Recent Anxiety Levels</h2>
        <div className="flex items-end gap-1 h-24">
          {logs.slice(-7).map(log => (
            <div key={log.id} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-md" style={{ height: `${log.level * 10}%`, background: levelColor(log.level) }} />
              <span className="text-[9px] text-muted-foreground">{log.level}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="glass rounded-2xl p-4">
        <h2 className="text-sm font-semibold mb-2">Coping Strategies</h2>
        <div className="space-y-2">
          {copingStrategies.map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-primary text-sm mt-0.5">•</span>
              <p className="text-sm text-muted-foreground">{s}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {logs.length === 0 && (
          <EmptyState
            icon={Frown}
            title="No anxiety logged"
            description="Log your anxiety levels to track patterns and manage triggers."
          />
        )}
        {logs.slice().reverse().map(log => (
          <div key={log.id} onClick={() => handleViewLog(log.id)} className="glass rounded-xl p-3 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: levelColor(log.level) + '22', color: levelColor(log.level) }}>{log.level}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate">{log.notes || 'No notes'}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(log.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <button onClick={(e) => deleteLog(log.id, e)} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Routines View (Enhanced with Builder + Completion Rituals) ============
function RoutinesView({ onBack }: { onBack: () => void }) {
  const [hasInit] = useLocalStorage('routines_init', false);
  const [routines, setRoutines] = useLocalStorage<Routine[]>('routines', hasInit ? [] : exampleRoutines);
  const [, setInit] = useLocalStorage('routines_init', true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'morning' | 'evening' | 'custom'>('morning');
  const [newSteps, setNewSteps] = useState<string[]>(['']);
  const [celebrating, setCelebrating] = useState<string | null>(null);

  // Editing
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'morning' | 'evening' | 'custom'>('morning');
  const [editSteps, setEditSteps] = useState<{ id: string, text: string, done: boolean }[]>([]);

  useEffect(() => { if (!hasInit) setInit(true); }, [hasInit, setInit]);

  const toggleStep = (routineId: string, stepId: string) => {
    const today = new Date().toDateString();
    setRoutines(prev => prev.map(r => {
      if (r.id !== routineId) return r;
      const updatedSteps = r.steps.map(s => s.id === stepId ? { ...s, done: !s.done } : s);
      const allDone = updatedSteps.every(s => s.done);
      const wasAllDone = r.steps.every(s => s.done);
      if (allDone && !wasAllDone) {
        setCelebrating(routineId);
        setTimeout(() => setCelebrating(null), 3000);
        toast.success('🎉 Routine complete! Great job!');
      }
      // Only increment streak once per calendar day
      const alreadyCountedToday = (r as any).lastStreakDate === today;
      const shouldIncrementStreak = allDone && !wasAllDone && !alreadyCountedToday;
      return { ...r, steps: updatedSteps, streak: shouldIncrementStreak ? r.streak + 1 : r.streak, lastStreakDate: shouldIncrementStreak ? today : (r as any).lastStreakDate };
    }));
  };

  const addRoutine = () => {
    if (!newName.trim() || newSteps.filter(s => s.trim()).length === 0) return;
    const routine: Routine = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      type: newType,
      steps: newSteps.filter(s => s.trim()).map(s => ({ id: crypto.randomUUID(), text: s.trim(), done: false })),
      streak: 0,
      createdAt: new Date().toISOString(),
    };
    setRoutines(prev => [routine, ...prev]);
    setNewName('');
    setNewSteps(['']);
    setShowAdd(false);
    toast.success('Routine created! 🌟');
  };

  const addStepField = () => setNewSteps(prev => [...prev, '']);
  const updateStepField = (i: number, v: string) => {
    const updated = [...newSteps];
    updated[i] = v;
    setNewSteps(updated);
  };
  const removeStepField = (i: number) => setNewSteps(prev => prev.filter((_, idx) => idx !== i));

  const startEditRoutine = (r: Routine) => {
    setEditingRoutineId(r.id);
    setEditName(r.name);
    setEditType(r.type);
    setEditSteps([...r.steps]);
  };

  const saveEditRoutine = () => {
    if (!editName.trim() || !editingRoutineId) return;
    setRoutines(prev => prev.map(r => r.id === editingRoutineId ? {
      ...r,
      name: editName.trim(),
      type: editType,
      steps: editSteps.filter(s => s.text.trim())
    } : r));
    setEditingRoutineId(null);
    toast.success('Routine updated');
  };

  const updateEditStep = (i: number, text: string) => {
    const updated = [...editSteps];
    updated[i] = { ...updated[i], text };
    setEditSteps(updated);
  };

  const addEditStep = () => setEditSteps(prev => [...prev, { id: crypto.randomUUID(), text: '', done: false }]);
  const removeEditStep = (i: number) => setEditSteps(prev => prev.filter((_, idx) => idx !== i));

  const deleteRoutine = (id: string) => {
    const backup = routines.find(r => r.id === id);
    const index = routines.findIndex(r => r.id === id);
    if (!backup) return;

    setRoutines(prev => prev.filter(r => r.id !== id));
    toast.success('Routine deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          setRoutines(prev => {
            const newRoutines = [...prev];
            newRoutines.splice(index, 0, backup);
            return newRoutines;
          });
        }
      }
    });
  };

  const resetRoutine = (id: string) => {
    setRoutines(prev => prev.map(r => r.id === id ? { ...r, steps: r.steps.map(s => ({ ...s, done: false })) } : r));
  };

  const typeEmoji = { morning: '🌅', evening: '🌙', custom: '⚡' };

  return (
    <div className="px-4 pt-12 pb-24 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground" aria-label="Go back"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display flex-1">Routines</h1>
        <Button size="sm" variant="ghost" onClick={() => setShowAdd(!showAdd)}><Plus className="w-5 h-5" /></Button>
      </div>

      {/* Add Routine Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass rounded-2xl p-4 space-y-3">
              <Input placeholder="Routine name" value={newName} onChange={e => setNewName(e.target.value)} className="bg-secondary border-0" />
              <div className="flex gap-2">
                {(['morning', 'evening', 'custom'] as const).map(t => (
                  <button key={t} onClick={() => setNewType(t)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 ${newType === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                    {typeEmoji[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground font-medium">Steps</span>
                {newSteps.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder={`Step ${i + 1}`} value={s} onChange={e => updateStepField(i, e.target.value)} className="bg-secondary border-0 flex-1" />
                    {newSteps.length > 1 && (
                      <button onClick={() => removeStepField(i)} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
                <button onClick={addStepField} className="text-xs text-primary flex items-center gap-1"><Plus className="w-3 h-3" /> Add step</button>
              </div>
              <div className="flex gap-2">
                <Button onClick={addRoutine} className="flex-1" size="sm">Create Routine</Button>
                <Button onClick={() => setShowAdd(false)} variant="ghost" size="sm"><X className="w-4 h-4" /></Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {routines.length === 0 && !showAdd && (
        <EmptyState
          icon={Sunrise}
          title="No routines yet"
          description="Build daily habits by creating a morning or evening routine."
          actionLabel="Create Routine"
          onAction={() => setShowAdd(true)}
        />
      )}
      {routines.map(routine => {
        const allDone = routine.steps.every(s => s.done);
        const isCelebrating = celebrating === routine.id;
        return (
          <motion.div key={routine.id} layout className="glass rounded-2xl p-4 space-y-3 relative overflow-hidden">
            {/* Celebration overlay */}
            <AnimatePresence>
              {isCelebrating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-success/10 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.3, 1] }}
                    transition={{ duration: 0.5 }}
                    className="text-center"
                  >
                    <PartyPopper className="w-12 h-12 text-success mx-auto mb-2" />
                    <p className="text-lg font-bold font-display">Complete! 🎉</p>
                    <p className="text-xs text-muted-foreground">Routine done for today</p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{typeEmoji[routine.type]}</span>
                <h2 className="text-sm font-semibold">{routine.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startEditRoutine(routine)} className="text-[10px] text-muted-foreground hover:text-primary transition-colors">Edit</button>
                <span className="text-xs text-warning">🔥 {routine.streak}d</span>
                {allDone && (
                  <button onClick={() => resetRoutine(routine.id)} className="text-[10px] text-primary underline">Reset</button>
                )}
                <button onClick={() => deleteRoutine(routine.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-success rounded-full"
                animate={{ width: `${(routine.steps.filter(s => s.done).length / routine.steps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <AnimatePresence>
              {editingRoutineId === routine.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pt-3 space-y-3 border-t border-border/30 mt-3 overflow-hidden">
                  <Input placeholder="Routine name" value={editName} onChange={e => setEditName(e.target.value)} className="bg-secondary border-0 text-xs h-8" />
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {(['morning', 'evening', 'custom'] as const).map(t => (
                      <button key={t} onClick={() => setEditType(t)}
                        className={`text-[10px] px-2.5 py-1 rounded-full transition-colors whitespace-nowrap ${editType === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                        {typeEmoji[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Steps</span>
                    {editSteps.map((s, i) => (
                      <div key={i} className="flex gap-2">
                        <Input placeholder={`Step ${i + 1}`} value={s.text} onChange={e => updateEditStep(i, e.target.value)} className="bg-secondary border-0 flex-1 text-xs h-7" />
                        <button onClick={() => removeEditStep(i)} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                    <button onClick={addEditStep} className="text-[10px] text-primary flex items-center gap-1"><Plus className="w-3 h-3" /> Add step</button>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveEditRoutine} size="sm" className="flex-1 text-xs h-8">Save Changes</Button>
                    <Button onClick={() => setEditingRoutineId(null)} variant="ghost" size="sm" className="text-xs h-8">Cancel</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              {routine.steps.map((step, i) => (
                <motion.button
                  key={step.id}
                  onClick={() => toggleStep(routine.id, step.id)}
                  className="flex items-center gap-2 w-full text-left"
                  whileTap={{ scale: 0.97 }}
                >
                  <motion.div animate={step.done ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.3 }}>
                    {step.done ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </motion.div>
                  <span className={`text-sm ${step.done ? 'line-through text-muted-foreground' : ''}`}>{step.text}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        );
      })}

      {routines.length === 0 && (
        <div className="text-center py-8">
          <Compass className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No routines yet. Create one to get started!</p>
        </div>
      )}
    </div>
  );
}

// ============ Reassurance Journal ============
interface JournalEntry {
  id: string;
  intrusiveThought: string;
  rationalResponse: string;
  anxietyBefore: number;
  anxietyAfter: number;
  locked: boolean;
  createdAt: string;
}

const exampleJournalEntries: JournalEntry[] = [
  { id: crypto.randomUUID(), intrusiveThought: "What if I left the stove on and the house burns down?", rationalResponse: "I checked the stove before leaving. Even if I forgot, the auto-shutoff would activate. My home is safe.", anxietyBefore: 8, anxietyAfter: 3, locked: false, createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: crypto.randomUUID(), intrusiveThought: "I might have said something offensive at the meeting and everyone hates me now.", rationalResponse: "No one reacted negatively. People are busy thinking about their own concerns. One comment doesn't define a relationship.", anxietyBefore: 7, anxietyAfter: 4, locked: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: crypto.randomUUID(), intrusiveThought: "If I don't check the door lock 3 times, something bad will happen.", rationalResponse: "Checking once is enough. The lock works mechanically — extra checks don't add safety. This is the OCD talking, not reality.", anxietyBefore: 9, anxietyAfter: 5, locked: false, createdAt: new Date().toISOString() },
];

function ReassuranceJournalView({ onBack }: { onBack: () => void }) {
  const [hasInit] = useLocalStorage('journal_init', false);
  const [entries, setEntries] = useLocalStorage<JournalEntry[]>('reassuranceJournal', hasInit ? [] : exampleJournalEntries);
  const [, setInit] = useLocalStorage('journal_init', true);
  const [showAdd, setShowAdd] = useState(false);
  const [thought, setThought] = useState('');
  const [response, setResponse] = useState('');
  const [anxBefore, setAnxBefore] = useState(5);
  const [anxAfter, setAnxAfter] = useState(3);
  const [filter, setFilter] = useState<'all' | 'active' | 'locked'>('all');

  // Editing
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editThought, setEditThought] = useState('');
  const [editResponse, setEditResponse] = useState('');
  const [editAnxBefore, setEditAnxBefore] = useState(5);
  const [editAnxAfter, setEditAnxAfter] = useState(3);

  if (!hasInit) setInit(true);

  const addEntry = () => {
    if (!thought.trim()) return;
    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      intrusiveThought: thought.trim(),
      rationalResponse: response.trim(),
      anxietyBefore: anxBefore,
      anxietyAfter: anxAfter,
      locked: false,
      createdAt: new Date().toISOString(),
    };
    setEntries(prev => [entry, ...prev]);
    setThought('');
    setResponse('');
    setAnxBefore(5);
    setAnxAfter(3);
    setShowAdd(false);
    toast.success('Journal entry saved 💜');
  };

  const startEditEntry = (e: JournalEntry) => {
    setEditingEntryId(e.id);
    setEditThought(e.intrusiveThought);
    setEditResponse(e.rationalResponse);
    setEditAnxBefore(e.anxietyBefore);
    setEditAnxAfter(e.anxietyAfter);
  };

  const saveEditEntry = () => {
    if (!editThought.trim() || !editingEntryId) return;
    setEntries(prev => prev.map(e => e.id === editingEntryId ? {
      ...e,
      intrusiveThought: editThought.trim(),
      rationalResponse: editResponse.trim(),
      anxietyBefore: editAnxBefore,
      anxietyAfter: editAnxAfter
    } : e));
    setEditingEntryId(null);
    toast.success('Journal entry updated');
  };

  const lockEntry = (id: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, locked: true } : e));
    toast('🔒 Locked & let go. You\'re stronger than your thoughts.', { duration: 3000 });
  };

  const deleteEntry = (id: string) => {
    const backup = entries.find(e => e.id === id);
    const index = entries.findIndex(e => e.id === id);
    if (!backup) return;

    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success('Entry deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          setEntries(prev => {
            const newEntries = [...prev];
            newEntries.splice(index, 0, backup);
            return newEntries;
          });
        }
      }
    });
  };

  const filtered = entries.filter(e => {
    if (filter === 'active') return !e.locked;
    if (filter === 'locked') return e.locked;
    return true;
  });

  const levelColor = (l: number) => l <= 3 ? 'hsl(152, 69%, 45%)' : l <= 6 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 84%, 60%)';

  return (
    <div className="px-4 pt-12 pb-24 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground" aria-label="Go back"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display flex-1">Reassurance Journal</h1>
        <Button size="sm" variant="ghost" onClick={() => setShowAdd(!showAdd)}><Plus className="w-5 h-5" /></Button>
      </div>

      <p className="text-xs text-muted-foreground">Log intrusive thoughts, challenge them with rational responses, and lock them away when you're ready to let go.</p>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'active', 'locked'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1.5 rounded-full transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
            {f === 'locked' ? '🔒 ' : ''}{f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Add Entry Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass rounded-2xl p-4 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium flex items-center gap-1 mb-1">
                  <AlertTriangle className="w-3 h-3" /> Intrusive Thought
                </label>
                <Textarea placeholder="What's the intrusive thought?" value={thought} onChange={e => setThought(e.target.value)} className="bg-secondary border-0 min-h-[60px]" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium flex items-center gap-1 mb-1">
                  <Heart className="w-3 h-3" /> Rational Response
                </label>
                <Textarea placeholder="Challenge it with a rational response..." value={response} onChange={e => setResponse(e.target.value)} className="bg-secondary border-0 min-h-[60px]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Anxiety Before</span>
                    <span className="font-bold" style={{ color: levelColor(anxBefore) }}>{anxBefore}/10</span>
                  </div>
                  <Slider value={[anxBefore]} onValueChange={([v]) => setAnxBefore(v)} min={1} max={10} step={1} />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Anxiety After</span>
                    <span className="font-bold" style={{ color: levelColor(anxAfter) }}>{anxAfter}/10</span>
                  </div>
                  <Slider value={[anxAfter]} onValueChange={([v]) => setAnxAfter(v)} min={1} max={10} step={1} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={addEntry} className="flex-1" size="sm">Save Entry</Button>
                <Button onClick={() => setShowAdd(false)} variant="ghost" size="sm"><X className="w-4 h-4" /></Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entries */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <EmptyState
            icon={Smile}
            title="No mood logs"
            description="Log your mood today to start tracking your well-being."
          />
        )}
        {filtered.map((entry, i) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`glass rounded-2xl p-4 space-y-2 ${entry.locked ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between">
              <p className="text-[10px] text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</p>
              <div className="flex gap-1">
                {!entry.locked && (
                  <>
                    <button onClick={() => startEditEntry(entry)} className="text-xs text-primary flex items-center gap-0.5" title="Edit entry">
                      <Plus className="w-3 h-3 rotate-45 scale-75" /> Edit
                    </button>
                    <button onClick={() => lockEntry(entry.id)} className="text-xs text-primary flex items-center gap-0.5" title="Lock & let go">
                      <Lock className="w-3 h-3" />
                    </button>
                  </>
                )}
                <button onClick={() => deleteEntry(entry.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div>
                <span className="text-[10px] text-destructive/70 font-medium">💭 Intrusive Thought</span>
                <p className="text-xs mt-0.5">{entry.intrusiveThought}</p>
              </div>
              {entry.rationalResponse && (
                <div>
                  <span className="text-[10px] text-success/70 font-medium">💚 Rational Response</span>
                  <p className="text-xs mt-0.5">{entry.rationalResponse}</p>
                </div>
              )}
            </div>

            <AnimatePresence>
              {editingEntryId === entry.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pt-3 space-y-3 border-t border-border/30 mt-3 overflow-hidden">
                  <div>
                    <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Intrusive Thought</label>
                    <Textarea placeholder="Thought" value={editThought} onChange={e => setEditThought(e.target.value)} className="bg-secondary border-0 text-xs min-h-[50px]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Rational Response</label>
                    <Textarea placeholder="Response" value={editResponse} onChange={e => setEditResponse(e.target.value)} className="bg-secondary border-0 text-xs min-h-[50px]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pb-1">
                    <div>
                      <div className="flex justify-between text-[9px] mb-1">
                        <span className="text-muted-foreground">Anxiety Before</span>
                        <span className="font-bold">{editAnxBefore}</span>
                      </div>
                      <Slider value={[editAnxBefore]} onValueChange={([v]) => setEditAnxBefore(v)} min={1} max={10} step={1} />
                    </div>
                    <div>
                      <div className="flex justify-between text-[9px] mb-1">
                        <span className="text-muted-foreground">Anxiety After</span>
                        <span className="font-bold">{editAnxAfter}</span>
                      </div>
                      <Slider value={[editAnxAfter]} onValueChange={([v]) => setEditAnxAfter(v)} min={1} max={10} step={1} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveEditEntry} size="sm" className="flex-1 text-xs h-8">Save Changes</Button>
                    <Button onClick={() => setEditingEntryId(null)} variant="ghost" size="sm" className="text-xs h-8">Cancel</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                Before: <span className="font-bold" style={{ color: levelColor(entry.anxietyBefore) }}>{entry.anxietyBefore}</span>
              </span>
              <span>→</span>
              <span className="flex items-center gap-1">
                After: <span className="font-bold" style={{ color: levelColor(entry.anxietyAfter) }}>{entry.anxietyAfter}</span>
              </span>
              {entry.locked && <span className="ml-auto">🔒 Locked</span>}
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8">
          <BookHeart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {filter === 'locked' ? 'No locked entries yet.' : 'No journal entries yet. Start by logging an intrusive thought.'}
          </p>
        </div>
      )}
    </div>
  );
}

// ============ Breathing View with Feedback & AI Analysis ============
function BreathingView({ onBack }: { onBack: () => void }) {
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [counter, setCounter] = useState(4);
  const [cycleCount, setCycleCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [calmBefore, setCalmBefore] = useState(5);
  const [calmAfter, setCalmAfter] = useState(7);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useLocalStorage<BreathingFeedback[]>('breathingFeedback', []);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (!active) return;
    let currentPhase: typeof phase = 'inhale';
    let currentCount = 4;
    setPhase('inhale');
    setCounter(4);

    intervalRef.current = setInterval(() => {
      currentCount--;
      if (currentCount <= 0) {
        if (currentPhase === 'inhale') { currentPhase = 'hold'; currentCount = 7; }
        else if (currentPhase === 'hold') { currentPhase = 'exhale'; currentCount = 8; }
        else { currentPhase = 'inhale'; currentCount = 4; setCycleCount(c => c + 1); }
        setPhase(currentPhase);
      }
      setCounter(currentCount);
    }, 1000);

    elapsedRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);

    return () => { clearInterval(intervalRef.current); clearInterval(elapsedRef.current); };
  }, [active]);

  const stopExercise = () => {
    setActive(false);
    clearInterval(intervalRef.current);
    clearInterval(elapsedRef.current);
    if (elapsedSeconds > 10) setShowFeedback(true);
  };

  const submitFeedback = async () => {
    setAiLoading(true);
    const feedback: BreathingFeedback = {
      id: crypto.randomUUID(),
      durationSeconds: elapsedSeconds,
      cyclesCompleted: cycleCount,
      calmnessBefore: calmBefore,
      calmnessAfter: calmAfter,
      notes: feedbackNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    if (isDemoMode) {
      feedback.aiAnalysis = `Great effort completing ${cycleCount} breathing cycles! 💜 Your calmness went from ${calmBefore} to ${calmAfter}/10 — ${calmAfter > calmBefore ? "that's real progress!" : "keep practicing, it gets easier with time."} Try to find a quiet space and close your eyes next time for even deeper relaxation. You showed up for yourself today, and that matters! 🌟`;
    } else {
      try {
        const { chatWithKira, KIRA_SYSTEM_PROMPT } = await import('@/lib/longcat');
        const prompt = `The user just completed a 4-7-8 breathing exercise. Here's their feedback:
- Duration: ${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s
- Cycles completed: ${cycleCount}
- Calmness before: ${calmBefore}/10
- Calmness after: ${calmAfter}/10
- Their notes: "${feedbackNotes || 'No notes provided'}"

Previous sessions count: ${feedbackHistory.length}
${feedbackHistory.length > 0 ? `Last session improvement: ${feedbackHistory[feedbackHistory.length - 1].calmnessAfter - feedbackHistory[feedbackHistory.length - 1].calmnessBefore} points` : ''}

Give a brief, warm, genuinely helpful analysis (3-5 sentences) of their breathing session. Comment on their improvement (or lack thereof), acknowledge their effort, give one specific actionable tip to improve their next session, and be encouraging. Use the Kira personality — warm, friendly, genuine.`;

        const analysis = await chatWithKira([
          { role: 'system', content: KIRA_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ], { maxTokens: 300, temperature: 0.7 });

        feedback.aiAnalysis = analysis;
      } catch {
        feedback.aiAnalysis = `Great effort completing ${cycleCount} breathing cycles! 💜 Your calmness went from ${calmBefore} to ${calmAfter}/10 — ${calmAfter > calmBefore ? "that's real progress!" : "keep practicing, it gets easier with time."} Try to find a quiet space and close your eyes next time for even deeper relaxation. You showed up for yourself today, and that matters! 🌟`;
      }
    }

    setFeedbackHistory(prev => [...prev, feedback]);
    setAiLoading(false);
    setShowFeedback(false);
    setCycleCount(0);
    setElapsedSeconds(0);
    setFeedbackNotes('');
    setCalmBefore(5);
    setCalmAfter(7);
    toast.success('Breathing feedback saved! 🌟');
  };

  const deleteFeedback = (id: string) => {
    const backup = feedbackHistory.find(f => f.id === id);
    const index = feedbackHistory.findIndex(f => f.id === id);
    if (!backup) return;

    setFeedbackHistory(prev => prev.filter(f => f.id !== id));
    toast.success('Feedback deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          setFeedbackHistory(prev => {
            const newFeedbacks = [...prev];
            newFeedbacks.splice(index, 0, backup);
            return newFeedbacks;
          });
        }
      }
    });
  };

  const phaseColors = { inhale: 'hsl(199, 89%, 48%)', hold: 'hsl(38, 92%, 50%)', exhale: 'hsl(152, 69%, 45%)' };
  const levelColor = (l: number) => l <= 3 ? 'hsl(0, 84%, 60%)' : l <= 6 ? 'hsl(38, 92%, 50%)' : 'hsl(152, 69%, 45%)';

  return (
    <div className="px-4 pt-12 pb-24 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground" aria-label="Go back"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display">4-7-8 Breathing</h1>
      </div>

      {/* Timer Display */}
      <div className="flex justify-center">
        <motion.div
          animate={{
            width: active ? (phase === 'exhale' ? 160 : 220) : 180,
            height: active ? (phase === 'exhale' ? 160 : 220) : 180,
          }}
          transition={{ duration: 1 }}
          className="rounded-full flex items-center justify-center"
          style={{
            background: (active ? phaseColors[phase] : 'hsl(199, 89%, 48%)') + '22',
            border: `3px solid ${active ? phaseColors[phase] : 'hsl(199, 89%, 48%)'}`,
          }}
        >
          <div className="text-center">
            <p className="text-4xl font-bold font-display">{active ? counter : '—'}</p>
            <p className="text-sm capitalize mt-1" style={{ color: active ? phaseColors[phase] : 'hsl(var(--muted-foreground))' }}>{active ? phase : 'Ready'}</p>
            {active && <p className="text-[10px] text-muted-foreground mt-1">Cycle {cycleCount + 1} • {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}</p>}
          </div>
        </motion.div>
      </div>

      <div className="flex justify-center gap-6 text-center text-xs text-muted-foreground">
        <div><p className="font-semibold text-info">4s</p><p>Inhale</p></div>
        <div><p className="font-semibold text-warning">7s</p><p>Hold</p></div>
        <div><p className="font-semibold text-success">8s</p><p>Exhale</p></div>
      </div>

      <div className="flex justify-center">
        <Button onClick={() => {
          if (active) stopExercise();
          else { setActive(true); setCycleCount(0); setElapsedSeconds(0); }
        }} variant={active ? "destructive" : "default"} className="px-8">
          {active ? 'Stop' : 'Start'}
        </Button>
      </div>

      {/* Feedback Form */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><MessageCircle className="w-4 h-4 text-primary" /> How was your session?</h3>
              <p className="text-[10px] text-muted-foreground">{cycleCount} cycles • {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Calm Before</span>
                    <span className="font-bold" style={{ color: levelColor(calmBefore) }}>{calmBefore}/10</span>
                  </div>
                  <Slider value={[calmBefore]} onValueChange={([v]) => setCalmBefore(v)} min={1} max={10} step={1} />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Calm After</span>
                    <span className="font-bold" style={{ color: levelColor(calmAfter) }}>{calmAfter}/10</span>
                  </div>
                  <Slider value={[calmAfter]} onValueChange={([v]) => setCalmAfter(v)} min={1} max={10} step={1} />
                </div>
              </div>

              <Textarea
                placeholder="How did you feel? Any thoughts during the exercise? (optional)"
                value={feedbackNotes}
                onChange={e => setFeedbackNotes(e.target.value)}
                className="bg-secondary border-0 min-h-[60px] text-xs"
              />

              <div className="flex gap-2">
                <Button onClick={submitFeedback} disabled={aiLoading} className="flex-1" size="sm">
                  {aiLoading ? <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Analyzing...</> : <><Sparkles className="w-3 h-3 mr-1" /> Get Kira's Feedback</>}
                </Button>
                <Button onClick={() => { setShowFeedback(false); setCycleCount(0); setElapsedSeconds(0); }} variant="ghost" size="sm"><X className="w-4 h-4" /></Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback History */}
      {feedbackHistory.length > 0 && !active && !showFeedback && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Session History</h2>
          {feedbackHistory.slice().reverse().map(fb => (
            <motion.div key={fb.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground">{new Date(fb.createdAt).toLocaleString()}</p>
                  <p className="text-xs">{fb.cyclesCompleted} cycles • {Math.floor(fb.durationSeconds / 60)}m {fb.durationSeconds % 60}s</p>
                </div>
                <button onClick={() => deleteFeedback(fb.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3 text-[10px]">
                <span>Before: <span className="font-bold" style={{ color: levelColor(fb.calmnessBefore) }}>{fb.calmnessBefore}</span></span>
                <span>→</span>
                <span>After: <span className="font-bold" style={{ color: levelColor(fb.calmnessAfter) }}>{fb.calmnessAfter}</span></span>
                <span className={`ml-auto font-medium ${fb.calmnessAfter > fb.calmnessBefore ? 'text-success' : fb.calmnessAfter < fb.calmnessBefore ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {fb.calmnessAfter > fb.calmnessBefore ? `+${fb.calmnessAfter - fb.calmnessBefore}` : fb.calmnessAfter - fb.calmnessBefore}
                </span>
              </div>

              {fb.notes && <p className="text-xs text-muted-foreground italic">"{fb.notes}"</p>}

              {fb.aiAnalysis && (
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-3">
                  <p className="text-[10px] text-primary font-semibold flex items-center gap-1 mb-1"><Sparkles className="w-3 h-3" /> Kira's Analysis</p>
                  <p className="text-xs text-foreground/80 leading-relaxed">{fb.aiAnalysis}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Sleep Tracker View ============
function calcSleepHours(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let bedMins = bh * 60 + bm;
  let wakeMins = wh * 60 + wm;
  if (wakeMins <= bedMins) wakeMins += 24 * 60; // next day
  return Math.round(((wakeMins - bedMins) / 60) * 10) / 10;
}

function getSleepFeedback(entries: SleepEntry[]): { emoji: string; title: string; message: string; color: string } {
  if (entries.length === 0) return { emoji: '🌙', title: 'Start Tracking', message: 'Log your first sleep entry to get personalized feedback!', color: 'hsl(230, 70%, 55%)' };

  const recent = entries.slice(-7);
  const avgHours = recent.reduce((s, e) => s + calcSleepHours(e.bedtime, e.wakeTime), 0) / recent.length;
  const avgQuality = recent.reduce((s, e) => s + e.quality, 0) / recent.length;

  // Check bedtime consistency
  const bedtimes = recent.map(e => { const [h, m] = e.bedtime.split(':').map(Number); return h * 60 + m; });
  const avgBedtime = bedtimes.reduce((s, b) => s + b, 0) / bedtimes.length;
  const bedtimeVariance = bedtimes.reduce((s, b) => s + Math.abs(b - avgBedtime), 0) / bedtimes.length;

  if (avgQuality >= 4 && avgHours >= 7 && avgHours <= 9 && bedtimeVariance < 60) {
    return { emoji: '🌟', title: 'Excellent Sleep!', message: `You're averaging ${avgHours.toFixed(1)}h with great quality. Your consistent bedtime is paying off — keep this up! You're in the optimal sleep zone.`, color: 'hsl(152, 69%, 45%)' };
  }
  if (avgQuality >= 3.5 && avgHours >= 7) {
    return { emoji: '😊', title: 'Good Sleep Pattern', message: `Averaging ${avgHours.toFixed(1)}h of sleep with decent quality. ${bedtimeVariance > 90 ? 'Try going to bed at the same time each night for even better results.' : 'Your consistency is helping — stay on track!'}`, color: 'hsl(199, 89%, 48%)' };
  }
  if (avgHours < 6) {
    return { emoji: '😴', title: 'Need More Sleep', message: `You're only averaging ${avgHours.toFixed(1)}h — aim for 7-9 hours. Try setting a bedtime reminder 8 hours before your wake-up time. Avoid screens 30 minutes before bed.`, color: 'hsl(0, 84%, 60%)' };
  }
  if (avgHours > 9.5) {
    return { emoji: '🛌', title: 'Oversleeping', message: `Averaging ${avgHours.toFixed(1)}h — more than 9h can leave you groggy. Try setting a consistent wake time and getting morning sunlight to regulate your cycle.`, color: 'hsl(38, 92%, 50%)' };
  }
  if (avgQuality < 3) {
    return { emoji: '💤', title: 'Low Sleep Quality', message: `Duration is okay at ${avgHours.toFixed(1)}h, but quality is low. Try: cooler room temperature, no caffeine after 2pm, a relaxing pre-bed routine, and avoiding heavy meals before sleep.`, color: 'hsl(38, 92%, 50%)' };
  }
  if (bedtimeVariance > 120) {
    return { emoji: '⏰', title: 'Irregular Schedule', message: `Your bedtime varies a lot (±${Math.round(bedtimeVariance)}min). A consistent sleep schedule — even on weekends — is one of the most impactful changes you can make.`, color: 'hsl(38, 92%, 50%)' };
  }
  return { emoji: '🌙', title: 'Room for Improvement', message: `${avgHours.toFixed(1)}h avg with moderate quality. Focus on winding down earlier and creating a dark, cool sleep environment. Small improvements add up!`, color: 'hsl(199, 89%, 48%)' };
}

const QUALITY_LABELS = ['', 'Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'];
const QUALITY_EMOJIS = ['', '😫', '😕', '😐', '😊', '🌟'];

function SleepTrackerView({ onBack }: { onBack: () => void }) {
  const [entries, setEntries] = useLocalStorage<SleepEntry[]>('sleepEntries', []);
  const [bedtime, setBedtime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [quality, setQuality] = useState(3);
  const [notes, setNotes] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const logSleep = () => {
    const entry: SleepEntry = {
      id: crypto.randomUUID(),
      bedtime,
      wakeTime,
      quality,
      date: new Date().toISOString().slice(0, 10),
      notes,
      createdAt: new Date().toISOString(),
    };
    setEntries(prev => [...prev, entry]);
    setNotes('');
    toast.success('Sleep logged! 🌙');
  };

  const deleteEntry = (id: string) => {
    const backup = entries.find(e => e.id === id);
    const index = entries.findIndex(e => e.id === id);
    if (!backup) return;

    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success('Entry deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          setEntries(prev => {
            const newEntries = [...prev];
            newEntries.splice(index, 0, backup);
            return newEntries;
          });
        }
      }
    });
  };
  const clearHistory = () => { setEntries([]); toast.success('Sleep history cleared'); };

  const hours = calcSleepHours(bedtime, wakeTime);
  const feedback = getSleepFeedback(entries);

  // Last 7 entries for chart
  const chartEntries = entries.slice(-7);

  return (
    <div className="px-4 pt-12 pb-24 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground" aria-label="Go back"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display">Sleep Tracker</h1>
      </div>

      {/* Feedback Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-4 space-y-2" style={{ borderLeft: `3px solid ${feedback.color}` }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{feedback.emoji}</span>
          <h2 className="text-sm font-bold font-display">{feedback.title}</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{feedback.message}</p>
      </motion.div>

      {/* Sleep Trend Chart */}
      {chartEntries.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass rounded-2xl p-4 space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground">Last 7 Nights</h2>
          <div className="flex items-end gap-1.5 h-20">
            {chartEntries.map((e, i) => {
              const h = calcSleepHours(e.bedtime, e.wakeTime);
              const heightPct = Math.min(100, (h / 12) * 100);
              const barColor = e.quality >= 4 ? 'hsl(152, 69%, 45%)' : e.quality >= 3 ? 'hsl(199, 89%, 48%)' : 'hsl(38, 92%, 50%)';
              return (
                <motion.div key={e.id} className="flex-1 flex flex-col items-center gap-0.5"
                  initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.1 + i * 0.05 }}>
                  <span className="text-[8px] text-muted-foreground">{h}h</span>
                  <div className="w-full rounded-t-md origin-bottom" style={{ height: `${heightPct}%`, background: barColor, minHeight: 4 }} />
                  <span className="text-[8px] text-muted-foreground">{e.date.slice(5)}</span>
                </motion.div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
            <span>Avg: {(chartEntries.reduce((s, e) => s + calcSleepHours(e.bedtime, e.wakeTime), 0) / chartEntries.length).toFixed(1)}h</span>
            <span>Quality: {(chartEntries.reduce((s, e) => s + e.quality, 0) / chartEntries.length).toFixed(1)}/5</span>
          </div>
        </motion.div>
      )}

      {/* Log New Entry */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-4 space-y-4">
        <h2 className="text-sm font-bold font-display">Log Tonight's Sleep</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground font-medium">Bedtime</label>
            <TimePicker value={bedtime} onChange={setBedtime} placeholder="Bedtime" className="bg-secondary border-0 w-full h-10 text-xs" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground font-medium">Wake Time</label>
            <TimePicker value={wakeTime} onChange={setWakeTime} placeholder="Wake time" className="bg-secondary border-0 w-full h-10 text-xs" />
          </div>
        </div>

        <div className="text-center">
          <span className="text-2xl font-bold font-display">{hours}h</span>
          <p className="text-[10px] text-muted-foreground">sleep duration</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-muted-foreground font-medium">Sleep Quality</label>
          <Slider value={[quality]} onValueChange={([v]) => setQuality(v)} min={1} max={5} step={1} />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{QUALITY_EMOJIS[quality]} {QUALITY_LABELS[quality]}</span>
            <span>{quality}/5</span>
          </div>
        </div>

        <Textarea placeholder="How did you sleep? Any dreams? (optional)" value={notes} onChange={e => setNotes(e.target.value)}
          className="bg-secondary border-0 min-h-[50px] text-sm" />

        <Button onClick={logSleep} className="w-full gap-1.5">
          <Moon className="w-4 h-4" /> Log Sleep
        </Button>
      </motion.div>

      {/* History Toggle */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="text-xs text-muted-foreground gap-1">
          {showHistory ? 'Hide' : 'Show'} History ({entries.length})
        </Button>
        {entries.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearHistory} className="text-xs text-destructive gap-1">
            <Trash2 className="w-3 h-3" /> Clear All
          </Button>
        )}
      </div>

      {/* History */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden">
            {entries.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No sleep entries yet</p>
            ) : (
              entries.slice().reverse().map(entry => (
                <motion.div key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="glass rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{QUALITY_EMOJIS[entry.quality]}</span>
                      <div>
                        <p className="text-xs font-medium">{entry.date} — {calcSleepHours(entry.bedtime, entry.wakeTime)}h</p>
                        <p className="text-[10px] text-muted-foreground">{entry.bedtime} → {entry.wakeTime} · {QUALITY_LABELS[entry.quality]}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteEntry(entry.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {entry.notes && <p className="text-[10px] text-muted-foreground">{entry.notes}</p>}
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ Water Tracker View ============
const WATER_GOAL_ML = 2500;
const GLASS_SIZES = [
  { label: '250ml', amount: 250, icon: '🥤' },
  { label: '500ml', amount: 500, icon: '🫗' },
  { label: '750ml', amount: 750, icon: '🍶' },
  { label: '1L', amount: 1000, icon: '🧊' },
];

function getWaterFeedback(entries: WaterEntry[], goal: number): { emoji: string; title: string; message: string; color: string } {
  if (entries.length === 0) return { emoji: '💧', title: 'Start Hydrating!', message: 'Log your first glass of water to get personalized hydration feedback!', color: 'hsl(199, 89%, 48%)' };

  const today = new Date().toISOString().slice(0, 10);
  const last7 = entries.filter(e => {
    const d = new Date(e.date);
    const diff = (new Date(today).getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff < 7 && diff >= 0;
  });

  const dayTotals: Record<string, number> = {};
  last7.forEach(e => { dayTotals[e.date] = (dayTotals[e.date] || 0) + e.amount; });
  const days = Object.values(dayTotals);
  if (days.length === 0) return { emoji: '💧', title: 'Time to Hydrate', message: 'No water logged recently. Start with a single glass — your body will thank you!', color: 'hsl(199, 89%, 48%)' };

  const avg = days.reduce((s, d) => s + d, 0) / days.length;
  const goalPct = avg / goal;
  const daysMetGoal = days.filter(d => d >= goal).length;

  if (goalPct >= 1 && daysMetGoal >= 5) {
    return { emoji: '🌊', title: 'Hydration Champion!', message: `Averaging ${(avg / 1000).toFixed(1)}L/day — you're consistently meeting your goal! Your body, skin, and energy levels are all benefiting from this habit. Absolutely stellar!`, color: 'hsl(152, 69%, 45%)' };
  }
  if (goalPct >= 0.8) {
    return { emoji: '💪', title: 'Almost There!', message: `Averaging ${(avg / 1000).toFixed(1)}L/day — you're close to your ${(goal / 1000).toFixed(1)}L target! Try keeping a water bottle visible at your desk. Small environmental cues make a big difference.`, color: 'hsl(199, 89%, 48%)' };
  }
  if (goalPct >= 0.5) {
    return { emoji: '🌤️', title: 'Building the Habit', message: `At ${(avg / 1000).toFixed(1)}L/day, you're halfway there. Here's a trick: link drinking water to something you already do — after each meal, before coffee, or when checking your phone. You've got this!`, color: 'hsl(38, 92%, 50%)' };
  }
  return { emoji: '🏜️', title: 'Your Body Needs More', message: `Only ${(avg / 1000).toFixed(1)}L/day average. Dehydration affects focus, mood, and energy more than most people realize. Start with just one extra glass today — progress beats perfection!`, color: 'hsl(0, 84%, 60%)' };
}

function WaterTrackerView({ onBack }: { onBack: () => void }) {
  const [entries, setEntries] = useLocalStorage<WaterEntry[]>('waterEntries', []);
  const [dailyGoal, setDailyGoal] = useLocalStorage<number>('waterGoal', WATER_GOAL_ML);
  const [showHistory, setShowHistory] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const todayEntries = entries.filter(e => e.date === today);
  const todayTotal = todayEntries.reduce((s, e) => s + e.amount, 0);
  const progress = Math.min(1, todayTotal / dailyGoal);

  const addWater = (amount: number) => {
    const entry: WaterEntry = {
      id: crypto.randomUUID(),
      amount,
      date: today,
      createdAt: new Date().toISOString(),
    };
    setEntries(prev => [...prev, entry]);
    toast.success(`+${amount}ml logged 💧`);
  };

  const addCustom = () => {
    const amt = parseInt(customAmount);
    if (!amt || amt <= 0) return;
    addWater(amt);
    setCustomAmount('');
  };

  const deleteEntry = (id: string) => {
    const backup = entries.find(e => e.id === id);
    const index = entries.findIndex(e => e.id === id);
    if (!backup) return;

    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success('Entry deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          setEntries(prev => {
            const newEntries = [...prev];
            newEntries.splice(index, 0, backup);
            return newEntries;
          });
        }
      }
    });
  };
  const clearHistory = () => { setEntries([]); toast.success('Water history cleared'); };

  const feedback = getWaterFeedback(entries, dailyGoal);

  // Last 7 days chart data
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dStr = d.toISOString().slice(0, 10);
    const dayTotal = entries.filter(e => e.date === dStr).reduce((s, e) => s + e.amount, 0);
    return { date: dStr, label: d.toLocaleDateString('en', { weekday: 'short' }), total: dayTotal };
  });

  const ringRadius = 52;
  const ringCircumference = 2 * Math.PI * ringRadius;

  return (
    <div className="px-4 pt-12 pb-24 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground" aria-label="Go back"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display">Water Tracker</h1>
      </div>

      {/* Feedback Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-4 space-y-2" style={{ borderLeft: `3px solid ${feedback.color}` }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{feedback.emoji}</span>
          <h2 className="text-sm font-bold font-display">{feedback.title}</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{feedback.message}</p>
      </motion.div>

      {/* Progress Ring */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="glass rounded-2xl p-6 flex flex-col items-center space-y-3">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={ringRadius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
            <motion.circle cx="60" cy="60" r={ringRadius} fill="none"
              stroke={progress >= 1 ? 'hsl(152, 69%, 45%)' : 'hsl(199, 89%, 48%)'}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={ringCircumference}
              initial={{ strokeDashoffset: ringCircumference }}
              animate={{ strokeDashoffset: ringCircumference * (1 - progress) }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold font-display">{(todayTotal / 1000).toFixed(1)}L</span>
            <span className="text-[10px] text-muted-foreground">of {(dailyGoal / 1000).toFixed(1)}L goal</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{Math.round(progress * 100)}% of daily goal</p>
      </motion.div>

      {/* Quick Add Buttons */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-bold font-display">Quick Add</h2>
        <div className="grid grid-cols-4 gap-2">
          {GLASS_SIZES.map(g => (
            <button key={g.amount} onClick={() => addWater(g.amount)}
              className="bg-secondary rounded-xl p-3 text-center hover:bg-primary/20 active:scale-95 transition-all">
              <span className="text-lg">{g.icon}</span>
              <p className="text-[10px] text-muted-foreground mt-1">{g.label}</p>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input type="number" placeholder="Custom ml" value={customAmount} onChange={e => setCustomAmount(e.target.value)}
            className="bg-secondary border-0 flex-1" />
          <Button onClick={addCustom} size="sm" className="gap-1"><Plus className="w-3.5 h-3.5" /> Add</Button>
        </div>
      </motion.div>

      {/* Weekly Trend */}
      {chartData.some(d => d.total > 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass rounded-2xl p-4 space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground">Last 7 Days</h2>
          <div className="flex items-end gap-1.5 h-20">
            {chartData.map((d, i) => {
              const heightPct = Math.min(100, (d.total / dailyGoal) * 100);
              const metGoal = d.total >= dailyGoal;
              return (
                <motion.div key={d.date} className="flex-1 flex flex-col items-center gap-0.5"
                  initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.1 + i * 0.05 }}>
                  <span className="text-[8px] text-muted-foreground">{d.total > 0 ? `${(d.total / 1000).toFixed(1)}L` : ''}</span>
                  <div className="w-full rounded-t-md origin-bottom" style={{
                    height: `${Math.max(heightPct, d.total > 0 ? 8 : 2)}%`,
                    background: metGoal ? 'hsl(152, 69%, 45%)' : d.total > 0 ? 'hsl(199, 89%, 48%)' : 'hsl(var(--secondary))',
                    minHeight: 4,
                  }} />
                  <span className="text-[8px] text-muted-foreground">{d.label}</span>
                </motion.div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
            <span>Avg: {(chartData.reduce((s, d) => s + d.total, 0) / chartData.filter(d => d.total > 0).length / 1000 || 0).toFixed(1)}L</span>
            <span>Goal met: {chartData.filter(d => d.total >= dailyGoal).length}/7 days</span>
          </div>
        </motion.div>
      )}

      {/* Goal Setting */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground">Daily Goal</h2>
        <Slider value={[dailyGoal]} onValueChange={([v]) => setDailyGoal(v)} min={1000} max={5000} step={250} />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>1L</span>
          <span className="font-medium text-foreground">{(dailyGoal / 1000).toFixed(1)}L</span>
          <span>5L</span>
        </div>
      </motion.div>

      {/* History Toggle */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="text-xs text-muted-foreground gap-1">
          {showHistory ? 'Hide' : 'Show'} History ({entries.length})
        </Button>
        {entries.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearHistory} className="text-xs text-destructive gap-1">
            <Trash2 className="w-3 h-3" /> Clear All
          </Button>
        )}
      </div>

      {/* History */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden">
            {entries.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No water entries yet</p>
            ) : (
              entries.slice().reverse().slice(0, 30).map(entry => (
                <motion.div key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="glass rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">💧</span>
                    <div>
                      <p className="text-xs font-medium">{entry.amount}ml</p>
                      <p className="text-[10px] text-muted-foreground">{entry.date} · {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <button onClick={() => deleteEntry(entry.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
