import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence, useMotionValueEvent } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Brain, Target, BookOpen, Timer, PenLine, BarChart3,
  Heart, Wallet, CheckSquare, Clock, MessageCircle,
  Sparkles, Shield, ChevronRight, Star, ArrowRight,
  Moon, Volume2, VolumeX, Bell, GraduationCap, Wind, Droplets,
  ChevronLeft, Play, Smartphone, Zap, Menu, X, Sun, Handshake, Map,
  Presentation, Mic, CloudSun, CheckCircle, AlertTriangle,
  UtensilsCrossed, Dumbbell, Newspaper, Pause, Share2, MousePointerClick, Code2, Rocket, ExternalLink,
  Monitor
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { SHOCASE_PROJECTS } from './Showcase';

/* ─── Reveal on scroll ─── */
function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Parallax wrapper ─── */
function Parallax({ children, className = '', speed = 0.15, rotate = 0 }: { children: React.ReactNode; className?: string; speed?: number; rotate?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [speed * 100, -speed * 100]);
  const r = useTransform(scrollYProgress, [0, 1], [-rotate, rotate]);
  return (
    <motion.div ref={ref} style={{ y, rotateZ: r }} className={className}>
      {children}
    </motion.div>
  );
}

/* ─── Gradient text component ─── */
function GradientText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`bg-clip-text text-transparent bg-gradient-to-r from-[hsl(245,80%,67%)] via-[hsl(199,89%,60%)] to-[hsl(152,69%,55%)] ${className}`}>
      {children}
    </span>
  );
}

/* ─── Floating particles ─── */
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `hsl(${Math.random() > 0.5 ? 245 : 199}, ${60 + Math.random() * 30}%, ${50 + Math.random() * 20}%)`,
          }}
          animate={{ y: [0, -40, 0], opacity: [0, 0.6, 0] }}
          transition={{ duration: Math.random() * 5 + 4, repeat: Infinity, delay: Math.random() * 4, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}



/* ─── Feature card with parallax ─── */
function FeatureCard({ icon: Icon, title, desc, delay, index }: { icon: React.ElementType; title: string; desc: string; delay: number; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  // Alternate parallax direction based on column position
  const parallaxDir = index % 2 === 0 ? 1 : -1;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60, rotateX: 8 }}
      animate={inView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ perspective: 800 }}
    >
      <Parallax speed={0.05 * parallaxDir}>
        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400 }}
          className="group relative p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-sm backdrop-blur-sm overflow-hidden h-full"
        >
          {/* Hover glow */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[hsl(245,60%,50%)]/10 to-transparent" />
          <div className="relative z-10">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[hsl(245,60%,55%)] to-[hsl(199,80%,50%)] flex items-center justify-center mb-3 sm:mb-4">
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5 sm:mb-2">{title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        </motion.div>
      </Parallax>
    </motion.div>
  );
}

/* ─── Stat counter ─── */
function StatCounter({ value, suffix, label }: { value: string; suffix?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="text-center">
      <motion.div
        className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
      >
        {value}{suffix}
      </motion.div>
      <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 uppercase tracking-widest">{label}</p>
    </div>
  );
}

/* ─── Premium Showcase Reel ─── */
const SHOWCASE_SLIDES: {
  icon: React.ElementType; color: string; tag: string; title: string;
  desc: string; features: string[]; isCTA?: boolean;
}[] = [
    {
      icon: Sparkles, color: 'from-[hsl(245,70%,60%)] to-[hsl(199,80%,55%)]',
      tag: 'ALL-IN-ONE', title: 'One App.\nEndless Possibilities.',
      desc: '28+ modules for productivity, studying, wellness, fitness, nutrition, news — all in one lightweight app.',
      features: ['Goals & Habits', 'Focus Timer', 'Study LMS', 'AI Analytics'],
    },
    {
      icon: CheckSquare, color: 'from-[hsl(210,70%,55%)] to-[hsl(245,60%,55%)]',
      tag: 'PRODUCTIVITY', title: 'Get Things Done.\nYour Way.',
      desc: 'Tasks with priorities & deadlines, rich markdown notes with folders, daily journal with mood tracking, and alarm reminders.',
      features: ['Smart Tasks', 'Rich Notes', 'Daily Journal', 'Reminders'],
    },
    {
      icon: Brain, color: 'from-[hsl(280,65%,55%)] to-[hsl(245,60%,60%)]',
      tag: 'AI-POWERED', title: 'Smart AI\nThat Gets You.',
      desc: 'AI summaries, quizzes, presentation maker, speech coach, wellness buddy Kira — your personal AI companion.',
      features: ['AI Summarizer', 'Quiz Generator', 'Kira Chat', 'Speech Coach'],
    },
    {
      icon: GraduationCap, color: 'from-[hsl(199,85%,50%)] to-[hsl(245,60%,55%)]',
      tag: 'STUDY SUITE', title: 'Study Smarter.\nNot Harder.',
      desc: 'Full LMS with PDF/EPUB/PPTX reader, video player, AI quizzes, split-screen notes, and study timers.',
      features: ['PDF Reader', 'AI Quizzes', 'Video Player', 'Study Timer'],
    },
    {
      icon: Heart, color: 'from-[hsl(340,75%,55%)] to-[hsl(280,60%,50%)]',
      tag: 'WELLNESS', title: 'Mental Health\nMatters.',
      desc: 'OCD toolkit, breathing exercises, grounding techniques, mood tracking, sleep analysis — designed with care.',
      features: ['OCD Toolkit', 'Breathing', 'Mood Tracking', 'Sleep Analysis'],
    },
    {
      icon: UtensilsCrossed, color: 'from-[hsl(25,95%,53%)] to-[hsl(340,70%,50%)]',
      tag: 'NUTRITION', title: 'Eat Well.\nLive Well.',
      desc: 'Nutrition planner with 210+ foods, 65+ recipes, meal scheduling, calorie tracking, and dietary goal management.',
      features: ['210+ Foods', '65+ Recipes', 'Meal Plans', 'Calorie Tracker'],
    },
    {
      icon: Dumbbell, color: 'from-[hsl(15,85%,50%)] to-[hsl(340,65%,50%)]',
      tag: 'FITNESS', title: 'Train Hard.\nTrack Everything.',
      desc: 'Fitness coach with 50+ exercises, workout timer, BMI calculator, body measurements, and progress tracking.',
      features: ['50+ Exercises', 'Workout Timer', 'BMI Calculator', 'Progress'],
    },
    {
      icon: Presentation, color: 'from-[hsl(260,65%,55%)] to-[hsl(199,70%,50%)]',
      tag: 'PRESENT & PERFORM', title: 'Present Like\nA Pro.',
      desc: 'AI presentation maker with multiple themes, speech coach with real-time feedback, and practice mode.',
      features: ['AI Slides', 'Speech Coach', 'Practice Mode', '6+ Themes'],
    },
    {
      icon: Wallet, color: 'from-[hsl(45,90%,50%)] to-[hsl(25,85%,50%)]',
      tag: 'FINANCE', title: 'Money Managed.\nStress Reduced.',
      desc: 'Track expenses by category, set budgets, visualize spending patterns, and export your financial data.',
      features: ['Expense Tracker', 'Budgets', 'Charts', 'Export Data'],
    },
    {
      icon: CloudSun, color: 'from-[hsl(199,80%,55%)] to-[hsl(210,70%,45%)]',
      tag: 'WEATHER & NEWS', title: 'Stay Informed.\nStay Ahead.',
      desc: 'Real-time weather with 7-day forecast. News portal with international & national feeds across multiple categories.',
      features: ['Live Weather', '7-Day Forecast', 'News Portal', 'Multi-Category'],
    },
    {
      icon: BarChart3, color: 'from-[hsl(270,60%,55%)] to-[hsl(199,75%,50%)]',
      tag: 'ANALYTICS', title: 'Know Yourself.\nGrow Yourself.',
      desc: 'AI-powered analytics dashboard with productivity scores, habit streaks, study patterns, and actionable insights.',
      features: ['AI Reports', 'Habit Streaks', 'Study Stats', 'Insights'],
    },
    {
      icon: Shield, color: 'from-[hsl(152,69%,45%)] to-[hsl(199,80%,50%)]',
      tag: '100% FREE & PRIVATE', title: 'Free. Private.\nForever.',
      desc: 'No subscriptions. No accounts. No data collection. Works offline as a PWA. Your data never leaves your device.',
      features: ['Offline PWA', 'No Tracking', '4 Themes', '8 Accents'],
    },
    {
      icon: Handshake, color: 'from-[hsl(245,70%,60%)] to-[hsl(152,65%,45%)]',
      tag: 'JOIN US', title: 'Try MindFlow.\nHelp Us Grow.',
      desc: 'Love what we built? Use it free forever. If you have the means, a small donation helps us keep building and improving.',
      features: ['100% Free', 'Open Source', 'Donate If You Can', 'Share The Love'],
      isCTA: true,
    },
  ];

function PremiumShowcase() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-100px' });
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => { });
    };
  }, []);

  const playTick = useCallback(() => {
    if (!soundOn) return;
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch { }
  }, [soundOn]);

  useEffect(() => {
    if (!isPlaying || !inView) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => {
        const next = (prev + 1) % SHOWCASE_SLIDES.length;
        if (SHOWCASE_SLIDES[next].isCTA) setIsPlaying(false);
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [isPlaying, inView]);

  useEffect(() => {
    if (inView) playTick();
  }, [currentSlide, playTick, inView]);

  const slide = SHOWCASE_SLIDES[currentSlide];
  const SlideIcon = slide.icon;

  return (
    <div ref={ref} className="relative w-full max-w-4xl mx-auto">
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-border shadow-2xl bg-card">
        <div className="absolute -inset-4 bg-gradient-to-r from-[hsl(245,60%,45%)]/20 via-transparent to-[hsl(199,80%,50%)]/20 blur-3xl opacity-50 -z-10" />

        <div className="relative min-h-[320px] sm:min-h-[380px] md:aspect-video overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${slide.color} opacity-[0.15]`} />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,transparent,hsl(var(--background)/0.8))]" />

              <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 sm:px-12 text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${slide.color} flex items-center justify-center mb-4 sm:mb-6 shadow-lg`}
                >
                  <SlideIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </motion.div>

                <motion.span
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-[9px] sm:text-[10px] font-bold tracking-[0.3em] text-primary/80 uppercase mb-2 sm:mb-3"
                >
                  {slide.tag}
                </motion.span>

                <motion.h3
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] whitespace-pre-line mb-3 sm:mb-4"
                >
                  {slide.title}
                </motion.h3>

                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="hidden sm:block text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed mb-4 sm:mb-6"
                >
                  {slide.desc}
                </motion.p>

                {slide.isCTA ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mt-1 sm:mt-2"
                  >
                    <Button
                      size="lg"
                      className="gap-2 bg-gradient-to-r from-[hsl(245,60%,55%)] to-[hsl(199,80%,50%)] hover:opacity-90 text-white shadow-lg px-6"
                      onClick={() => navigate('/')}
                    >
                      <Zap className="w-4 h-4" /> Launch App Free
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="gap-2 px-6"
                      onClick={() => {
                        const el = document.getElementById('help-us-grow');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      <Heart className="w-4 h-4 text-pink-400" /> Support Us
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-wrap justify-center gap-1.5 sm:gap-2"
                  >
                    {slide.features.map((f, i) => (
                      <motion.span
                        key={f}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 + i * 0.08 }}
                        className="px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                      >
                        {f}
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
            {SHOWCASE_SLIDES.map((_, i) => (
              <button key={i} onClick={() => { setCurrentSlide(i); setIsPlaying(false); }} className="group p-0.5">
                <div className={`h-1 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30 group-hover:bg-muted-foreground/50'}`} />
              </button>
            ))}
          </div>

          <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex items-center gap-1.5 z-20">
            <button
              onClick={() => setSoundOn(!soundOn)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-background/60 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-background/80 transition-colors"
              aria-label={soundOn ? 'Mute' : 'Unmute'}
            >
              {soundOn ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-foreground/70" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-foreground/70" />}
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-background/60 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-background/80 transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-foreground/70" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-foreground/70" />}
            </button>
          </div>

          <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-20">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/60 backdrop-blur-sm border border-border/50">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] sm:text-[10px] font-semibold text-foreground/70 uppercase tracking-wider">
                {currentSlide + 1}/{SHOWCASE_SLIDES.length}
              </span>
            </div>
          </div>

          <motion.div
            className="absolute bottom-0 left-0 h-0.5 bg-primary/60"
            key={`progress-${currentSlide}`}
            initial={{ width: '0%' }}
            animate={isPlaying ? { width: '100%' } : {}}
            transition={{ duration: 4, ease: 'linear' }}
          />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/* ─── MAIN LANDING PAGE ─── */
/* ═══════════════════════════════════════════════════════ */
export default function Landing() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  const [theme, setTheme] = useLocalStorage<'light' | 'dark' | 'amoled' | 'system'>('theme', 'dark');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const toggleTheme = () => {
    const nextMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextMode);
    const root = document.documentElement;
    root.classList.add('theme-transitioning');
    root.classList.remove('dark', 'light', 'amoled');
    if (nextMode === 'dark') root.classList.add('dark');
    else if (nextMode === 'light') { /* native light */ }
    setTimeout(() => root.classList.remove('theme-transitioning'), 450);
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const features = [
    { icon: Target, title: 'Smart Goals & Habits', desc: 'Track goals with milestones, build habit streaks, and visualize progress over time.' },
    { icon: CheckSquare, title: 'Tasks & To-Dos', desc: 'Priority-based task management with categories, deadlines, and alarm reminders.' },
    { icon: Timer, title: 'Focus Timer', desc: 'Pomodoro sessions with 6+ ambient soundscapes — rain, ocean, forest, Tibetan bowls.' },
    { icon: PenLine, title: 'Rich Notes', desc: 'Markdown notes with folders, tags, version history, and scheduled reminders.' },
    { icon: BookOpen, title: 'Book Reader', desc: '9 built-in books. Read PDFs, EPUB, TXT with highlights, annotations, and dark mode.' },
    { icon: GraduationCap, title: 'Study Planner (LMS)', desc: 'Full LMS with PDF, PPTX, EPUB viewer, video player, split-screen notes, AI quizzes & study timer.' },
    { icon: Sparkles, title: 'AI Summary & Explainer', desc: 'Quick Summary, Deep Dive, and ELI5 modes for PDFs, PPTs, EPUBs — page-range targeted analysis.' },
    { icon: MessageCircle, title: 'AI Study Buddy', desc: 'Context-aware study chatbot with image/PDF attachment support for step-by-step academic help.' },
    { icon: Play, title: 'Video Study Player', desc: 'Watch MP4/WebM lectures alongside split-screen notes. Track sessions and take notes while studying.' },
    { icon: Zap, title: 'AI Quiz Generator', desc: 'Auto-generate MCQ, flashcards, short/broad questions with timer, auto-marking, and feedback.' },
    { icon: Heart, title: 'Wellness Tools', desc: 'Mood tracking, breathing exercises, grounding, OCD toolkit, sleep & hydration monitoring.' },
    { icon: Wallet, title: 'Expense Tracker', desc: 'Budget management with category tracking, donut charts, and spending reports.' },
    { icon: Clock, title: 'Time Tracking', desc: 'Log hours across projects. Visualize where your time goes and optimize your day.' },
    { icon: BarChart3, title: 'AI Analytics', desc: 'Deep insights into productivity patterns, wellness trends, and personalized AI-powered tips.' },
    { icon: MessageCircle, title: 'Kira AI', desc: 'Your personal AI buddy for daily check-ins, motivation, wellness support, and guidance.' },
    { icon: Presentation, title: 'Presentation Maker', desc: 'AI-powered slide generation from topics, PDFs, or DOCX. Edit slides, add speaker notes, pick themes & export PPTX.' },
    { icon: Mic, title: 'Presentation Coach', desc: 'Real-time speech coaching with camera & mic — scores gestures, posture, eye contact, pace, filler words, volume & timing.' },
    { icon: CloudSun, title: 'Weather Module', desc: 'Current conditions, hourly & 7-day forecasts, historical data lookup, location search, and smart advice.' },
    { icon: Bell, title: 'Smart Reminders', desc: 'Context-aware notifications with 4 custom alarm sounds and smart scheduling.' },
    { icon: Volume2, title: 'Mini Music Player', desc: 'Floating ambient audio player with sleep timer — forest, rain, ocean, Tibetan bowls & custom audio.' },
    { icon: UtensilsCrossed, title: 'Nutrition Planner', desc: 'Meal planning with macro tracking, recipe engine, pantry management, health scores & weekly nutrition reports.' },
    { icon: Dumbbell, title: 'Body & Fitness', desc: 'BMI calculator, personalized workout routines, exercise database, progress tracking & fitness goal management.' },
    { icon: Newspaper, title: 'News Portal', desc: 'Curated news from multiple sources with category filters, search, bookmarks, and smart deduplication.' },
  ];

  const uniqueFeatures = [
    { icon: Wind, title: 'Grounding & Breathing', desc: '5-4-3-2-1 grounding and 4-7-8 breathing with AI analysis' },
    { icon: Shield, title: 'OCD Toolkit', desc: 'Routine builder, check limiter, and reassurance journal' },
    { icon: Droplets, title: 'Sleep & Hydration', desc: 'Water intake rings and sleep quality monitoring' },
    { icon: Volume2, title: '6+ Soundscapes', desc: 'Forest, rain, ocean, wind, Tibetan bowls, night' },
    { icon: Moon, title: '4 Themes', desc: 'Light, Dark, AMOLED, System + 8 accent colors' },
    { icon: Smartphone, title: 'Offline PWA', desc: 'Install like a native app — works offline, no store needed' },
    { icon: GraduationCap, title: 'Split-Screen Notes', desc: 'Take notes side-by-side while reading PDFs, PPTX, or watching videos' },
    { icon: Sparkles, title: 'AI-Powered Learning', desc: 'Summaries, explanations, quizzes, and study chatbot — all AI-driven' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-[hsl(245,60%,55%)]/30">

      {/* ═══ STICKY NAV ═══ */}
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="fixed top-0 w-full z-50 border-b border-white/[0.04] bg-background/80 backdrop-blur-xl"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-[hsl(245,60%,55%)] to-[hsl(199,80%,50%)] flex items-center justify-center">
              <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">MindFlow</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs text-muted-foreground">
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-foreground transition-colors">Features</a>
            <a href="#showcase" onClick={(e) => scrollToSection(e, 'showcase')} className="hover:text-foreground transition-colors">Showcase</a>
            <a href="#unique" onClick={(e) => scrollToSection(e, 'unique')} className="hover:text-foreground transition-colors">What's Unique</a>
            <a href="#roadmap" onClick={(e) => scrollToSection(e, 'roadmap')} className="hover:text-foreground transition-colors">Roadmap</a>
            <a href="#support" onClick={(e) => scrollToSection(e, 'support')} className="hover:text-foreground transition-colors">Help Us Grow</a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-foreground/70" /> : <Moon className="w-4 h-4 text-foreground/70" />}
            </button>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-muted/50"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4 text-foreground/70" /> : <Menu className="w-4 h-4 text-foreground/70" />}
            </button>

            <Button
              onClick={() => navigate('/')}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 sm:px-4 h-8 rounded-full"
            >
              Launch App
            </Button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md">
            <div className="flex flex-col px-6 py-4 gap-4 text-sm text-foreground/70">
              {[
                { id: 'features', label: 'Features' },
                { id: 'showcase', label: 'Showcase' },
                { id: 'unique', label: "What's Unique" },
                { id: 'roadmap', label: 'Roadmap' },
                { id: 'support', label: 'Help Us Grow' },
              ].map(link => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    setTimeout(() => {
                      document.getElementById(link.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }}
                  className="hover:text-foreground transition-colors py-1"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </motion.nav>

      {/* ═══ HERO ═══ */}
      <section ref={heroRef} className="relative min-h-[100svh] flex items-center justify-center pt-14">
        <Particles />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(245,60%,25%,0.3),transparent)]" />

        <motion.div
          style={{ y: heroY, scale: heroScale, opacity: heroOpacity }}
          className="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border border-border bg-muted/50 mb-6 sm:mb-8"
          >
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] sm:text-[11px] text-muted-foreground tracking-wider uppercase">28+ Modules • 100% Free • Offline First</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[0.9]"
          >
            Your Brain Works
            <br />
            <GradientText>Differently.</GradientText>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light text-muted-foreground mt-3 sm:mt-4 tracking-tight"
          >
            Your Tools Should Too.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="text-xs sm:text-sm text-muted-foreground mt-6 sm:mt-8 max-w-lg mx-auto leading-relaxed px-2"
          >
            Productivity, studying, wellness, and life management — all in one beautifully
            crafted app. No subscriptions. No accounts. Just results.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-8 sm:mt-10"
          >
            <Button
              onClick={() => navigate('/')}
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 sm:px-8 rounded-full group w-full sm:w-auto"
            >
              Start For Free
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <a href="#showcase" onClick={(e) => scrollToSection(e, 'showcase')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Play className="w-4 h-4" />
              Watch Demo
            </a>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute -bottom-20 sm:bottom-12 left-1/2 -translate-x-1/2 hidden sm:block"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-5 h-8 rounded-full border border-border flex justify-center pt-2"
            >
              <div className="w-1 h-2 rounded-full bg-border" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ PREMIUM SHOWCASE REEL ═══ */}
      <section id="showcase" className="relative py-20 sm:py-32 px-4 sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,hsl(245,60%,20%,0.15),transparent)]" />
        <div className="max-w-5xl mx-auto relative z-10">
          <Reveal>
            <div className="text-center mb-10 sm:mb-16">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-[0.3em] mb-3 sm:mb-4">See It In Action</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                Experience <GradientText>MindFlow</GradientText>
              </h2>
            </div>
          </Reveal>

          <PremiumShowcase />
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 border-y border-border/50">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-6 sm:gap-6">
          <StatCounter value="28" suffix="+" label="Modules" />
          <StatCounter value="AI" label="Presentation Maker & Coach" />
          <StatCounter value="Full" label="Health & Nutrition" />
          <StatCounter value="Pro" label="Study LMS" />
          <StatCounter value="100" suffix="%" label="Free & Private" />
        </div>
      </section>

      {/* ═══ FEATURES GRID with parallax cards ═══ */}
      <section id="features" className="py-20 sm:py-32 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-10 sm:mb-16">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-[0.3em] mb-3 sm:mb-4">Everything You Need</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                One App. <GradientText>Every Tool.</GradientText>
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {features.map((f, i) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} delay={i * 0.04} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ INTERACTIVE APP DEMO ═══ */}
      <section className="py-20 sm:py-32 px-4 sm:px-6 relative" style={{ touchAction: 'pan-y' }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_50%_40%,hsl(245,60%,20%,0.12),transparent)]" />
        <div className="max-w-5xl mx-auto relative z-10 flex flex-col items-center">
          <Reveal>
            <div className="text-center mb-10 sm:mb-16">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-[0.3em] mb-3 sm:mb-4">Interactive Preview</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                Designed To <GradientText>Delight.</GradientText>
              </h2>
            </div>
          </Reveal>

          <div className="relative mx-auto w-[300px] sm:w-[350px] h-[600px] sm:h-[700px]" style={{ touchAction: 'pan-y' }}>
            <div className="absolute -inset-12 sm:-inset-20 pointer-events-none hidden sm:block">
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/20 rounded-full blur-[100px]"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] border-2 border-primary/20 rounded-full"
                animate={{ scale: [1, 1.4, 1], opacity: [0.1, 0, 0.1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
            </div>

            <div className="relative z-10 rounded-[2.2rem] sm:rounded-[2.5rem] border-[3px] border-border bg-foreground p-1.5 sm:p-2 shadow-2xl overflow-hidden w-full h-full">
              <motion.div
                className="absolute -inset-8 sm:-inset-12 rounded-[3rem] blur-3xl opacity-20 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, hsl(245,70%,50%), hsl(199,80%,50%))' }}
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 4, repeat: Infinity }}
              />

              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 sm:w-28 h-5 sm:h-6 bg-foreground rounded-b-xl z-20 pointer-events-none" />

              <div className="rounded-[1.8rem] sm:rounded-[2.1rem] overflow-hidden w-full h-full bg-background relative z-10">
                <iframe src="/?demo=true" className="w-full h-full border-0" title="MindFlow App Demo" />
                {!demoActive && (
                  <div
                    className="absolute inset-0 z-20 sm:hidden flex items-end justify-center pb-8 cursor-pointer"
                    style={{ touchAction: 'pan-y' }}
                    onClick={() => setDemoActive(true)}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-4 py-2 rounded-full bg-primary/90 text-primary-foreground text-xs font-semibold shadow-lg backdrop-blur-sm"
                    >
                      Tap to interact with demo
                    </motion.div>
                  </div>
                )}
                {demoActive && (
                  <button
                    className="absolute top-2 right-2 z-30 sm:hidden w-7 h-7 rounded-full bg-foreground/80 text-background flex items-center justify-center text-xs font-bold shadow-lg"
                    onClick={() => setDemoActive(false)}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Post-Demo CTA */}
          <Reveal delay={0.2}>
            <div className="mt-16 sm:mt-24 text-center space-y-6 max-w-2xl mx-auto px-4">
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                For the ultimate experience, launch the full <span className="text-foreground font-semibold">MindFlow</span> app — your dedicated partner for wellness, academic success, and mindful productivity.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  onClick={() => navigate('/')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-6 rounded-full text-lg shadow-xl shadow-primary/20 transition-all active:scale-95 w-full sm:w-auto"
                >
                  Launch Full App
                </Button>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Free forever for early adopters
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ PREMIUM WEB DEV SHOWCASE ═══ */}
      <section className="py-20 sm:py-32 px-4 sm:px-6 relative border-t border-border/50 bg-secondary/10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,hsl(245,60%,20%,0.08),transparent)]" />
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-64 bg-primary/10 blur-3xl rounded-full" />
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 bg-[hsl(199,80%,50%)]/10 blur-3xl rounded-full" />

        <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center">
          <Reveal>
            <div className="text-center mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/10 mb-5">
                <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                <span className="text-[10px] sm:text-xs font-bold text-primary tracking-widest uppercase">Premium Works</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                Not Just Apps. <GradientText>Digital Artistry.</GradientText>
              </h2>
              <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Beyond MindFlow, we craft high-end, immersive websites and software.
                Experience one of our featured masterpieces below.
              </p>
            </div>
          </Reveal>

          {/* Featured Project Showcase */}
          <div className="w-full space-y-12 sm:space-y-16">
            {SHOCASE_PROJECTS.map((project, index) => {
              const reverse = index % 2 !== 0;
              return (
                <Reveal key={project.id} delay={0.2}>
                  <div className={`relative glass rounded-[2.5rem] p-6 sm:p-10 border border-primary/20 shadow-2xl flex flex-col lg:flex-row${reverse ? '-reverse' : ''} items-center gap-10 sm:gap-14 bg-background/40 hover:border-primary/40 transition-colors duration-500 overflow-hidden group`}>
                    <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/10 blur-[80px] rounded-full group-hover:bg-primary/20 transition-colors duration-700" />
                    
                    <div className="flex-1 space-y-6 sm:space-y-8 relative z-10 w-full">
                      <div>
                        <h3 className="text-2xl sm:text-4xl font-black tracking-tight mb-3">{project.title}</h3>
                        <p className="text-sm sm:text-base text-muted-foreground/90 leading-relaxed font-medium">
                          {project.longDesc}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {project.tags.map(tag => (
                         <span key={tag} className="px-3 py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-secondary border border-border text-foreground/80">
                           {tag}
                         </span>
                        ))}
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row gap-3">
                        <a 
                          href={project.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-3.5 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 text-sm"
                        >
                          <ExternalLink className="w-4 h-4" /> View Live Project
                        </a>
                        <Button 
                          variant="outline" 
                          className="rounded-full px-6 py-3.5 h-auto text-sm font-semibold border-primary/20 hover:bg-primary/5"
                          onClick={() => navigate('/showcase')}
                        >
                          See All Works <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex-[1.2] lg:flex-1 w-full self-center relative z-10 perspective-1000">
                      <motion.div 
                        className={`rounded-2xl overflow-hidden border bg-black transform rotate-y-${reverse ? '[-2deg]' : '[-2deg]'} rotate-x-[2deg] hover:rotate-y-0 hover:rotate-x-0 transition-all duration-700 shadow-2xl border-white/10 relative`}
                      >
                        {/* Browser Chrome Header */}
                        <div className="h-6 sm:h-8 bg-secondary/80 backdrop-blur-md flex items-center px-3 sm:px-4 gap-2 border-b border-white/10 relative z-20">
                           <div className="flex gap-1.5">
                             <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-400" />
                             <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-400" />
                             <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400" />
                           </div>
                        </div>
                        <div className="w-full aspect-video relative overflow-hidden bg-background">
                          <div 
                            className="absolute top-0 left-0 z-10"
                            style={{ 
                               width: '300%', 
                               height: '300%', 
                               transform: 'scale(0.333333)', 
                               transformOrigin: 'top left' 
                            }}
                          >
                            <iframe 
                              src={project.url} 
                              className="w-full h-full border-0 pointer-events-none group-hover:pointer-events-auto"
                              title={`${project.title} Preview`}
                              loading="lazy"
                            />
                          </div>
                          <div className="absolute inset-0 z-30 flex items-center justify-center transition-all duration-700 bg-black/40 backdrop-blur-md group-hover:opacity-0 group-hover:backdrop-blur-none pointer-events-none">
                             <div className="px-6 py-3 bg-background/95 text-foreground font-bold text-xs sm:text-sm rounded-full shadow-2xl border border-white/20 flex items-center gap-2 transform transition-all duration-700 group-hover:scale-90 group-hover:translate-y-4">
                                <Monitor className="w-4 h-4 text-primary" /> 
                                <span className="hidden sm:inline">Hover to interact</span>
                                <span className="sm:hidden">Tap to interact</span>
                             </div>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ WHAT'S UNIQUE with staggered parallax ═══ */}
      <section id="unique" className="py-20 sm:py-32 px-4 sm:px-6 border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-10 sm:mb-16">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-[0.3em] mb-3 sm:mb-4">Beyond Ordinary</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                What Makes MindFlow <GradientText>Different.</GradientText>
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {uniqueFeatures.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.08}>
                <Parallax speed={0.03 * (i % 2 === 0 ? 1 : -1)} rotate={0.5}>
                  <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card space-y-2 sm:space-y-3 h-full">
                    <f.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    <h3 className="text-xs sm:text-sm font-semibold text-foreground">{f.title}</h3>
                    <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </Parallax>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ REVIEWS ═══ */}
      <section id="reviews" className="py-20 sm:py-32 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-10 sm:mb-16">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-[0.3em] mb-3 sm:mb-4">What People Say</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                Loved By <GradientText>Students & Professionals.</GradientText>
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {[
              { quote: 'MindFlow replaced 5 apps for me. The study planner with AI quizzes is incredible.', name: 'Sarah K.', role: 'Medical Student' },
              { quote: 'The OCD toolkit and grounding exercises genuinely help. This isn\'t just another productivity app.', name: 'James R.', role: 'Software Developer' },
              { quote: 'Dark AMOLED theme, offline support, and Kira AI? This app is everything.', name: 'Priya M.', role: 'Design Student' },
            ].map((t, i) => (
              <Reveal key={t.name} delay={i * 0.1}>
                <Parallax speed={0.02 * (i % 2 === 0 ? 1 : -1)}>
                  <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card space-y-3 sm:space-y-4 h-full shadow-sm">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, j) => <Star key={j} className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-[hsl(38,92%,50%)] text-[hsl(38,92%,50%)]" />)}
                    </div>
                    <p className="text-xs sm:text-sm text-foreground/70 italic leading-relaxed">"{t.quote}"</p>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </Parallax>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ROADMAP ═══ */}
      <section id="roadmap" className="py-20 sm:py-32 px-4 sm:px-6 relative border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-10 sm:mb-16">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-[0.3em] mb-3 sm:mb-4">Future Vision</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                Our <GradientText>Roadmap.</GradientText>
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {[
              { icon: CheckCircle, title: 'AI Presentation Coach', desc: 'Real-time speech coaching with camera & mic analysis — gestures, posture, eye contact, pace, volume, filler words & timing. Live feedback, teleprompter, question mode & detailed reports.', done: true },
              { icon: CheckCircle, title: 'AI Presentation Maker', desc: 'Generate professional slide decks from any topic, PDF, or DOCX. Edit slides, add speaker notes, pick themes & export as PPTX.', done: true },
              { icon: CheckCircle, title: 'Weather Module', desc: 'Current conditions, hourly & 7-day forecasts, historical data, location search, unit preferences & smart weather advice.', done: true },
              { icon: CheckCircle, title: 'Nutrition Planner', desc: 'Meal planning with macro tracking, recipe engine, pantry management, health scores & weekly nutrition reports.', done: true },
              { icon: CheckCircle, title: 'Body & Fitness', desc: 'BMI calculator, personalized workout routines, exercise database, progress tracking & fitness goal management.', done: true },
              { icon: CheckCircle, title: 'News Portal', desc: 'Curated news from multiple sources with category filters, search, bookmarks, and smart deduplication.', done: true },
              { icon: Map, title: 'Cloud Storage & Sync', desc: 'Migrate from local storage to secure cloud-based data storage so your data syncs across all devices and never gets lost.' },
              { icon: MessageCircle, title: 'Community & Social Sharing', desc: 'A safe space where people battling challenges can share stories and build a supportive community.' },
              { icon: Shield, title: 'Enhanced OCD Tools', desc: 'More specialized features — exposure tracking, compulsion logging, anxiety scales, and reports.' },
              { icon: Sparkles, title: 'And So Much More...', desc: 'Stay tuned and remain a part of our magical journey. Together we shape the future of mindful productivity. More premium tools arriving soon.' },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 0.1}>
                <div className={`p-5 sm:p-6 rounded-2xl border shadow-sm space-y-3 h-full ${(item as any).done ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border bg-card'}`}>
                  <div className="flex items-center gap-2">
                    <item.icon className={`w-5 h-5 ${(item as any).done ? 'text-emerald-500' : 'text-primary'}`} />
                    {(item as any).done && <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Live</span>}
                  </div>
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ THE STORY ═══ */}
      <section className="py-20 sm:py-32 px-4 sm:px-6 relative border-t border-border/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,hsl(245,60%,20%,0.1),transparent)]" />
        <div className="max-w-2xl mx-auto relative z-10">
          <Reveal>
            <div className="text-center space-y-5 sm:space-y-6">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-[0.3em]">The Story</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                Built With <GradientText>Heart.</GradientText>
              </h2>
              <div className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
                <p>
                  What started as a lighthearted side project has grown into a comprehensive all-in-one companion
                  used and loved by everyone who tries it. MindFlow began with a simple question:
                  <span className="text-foreground/90 italic"> "Why do I need ten apps for what one should do?"</span>
                </p>
                <p>
                  28+ modules later, it handles productivity, studying, wellness, fitness, nutrition, finance,
                  presentations, weather, news, and more — constantly improving with every update for the
                  best possible user experience.
                </p>
              </div>
              <div className="pt-2">
                <p className="text-xs sm:text-sm text-primary font-semibold tracking-wide">
                  Developed by Hridoy Zaman
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  Solo-built with care, designed for everyone.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ HELP US GROW / DONATE ═══ */}
      <section id="support" className="py-20 sm:py-32 px-4 sm:px-6 relative border-t border-border/50 bg-secondary/20">
        <div className="max-w-3xl mx-auto relative z-10">
          <Reveal>
            <div className="text-center">
              <Handshake className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-4 sm:mb-6 text-primary" />
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 sm:mb-6">
                Help Us <GradientText>Grow.</GradientText>
              </h2>
            </div>

            <div className="max-w-xl mx-auto space-y-6 sm:space-y-8">
              <div className="glass rounded-2xl p-5 sm:p-6 space-y-3 border border-destructive/30">
                <h3 className="text-sm font-bold flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4" /> Why We Need Your Help
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  MindFlow was built from scratch with <span className="font-semibold text-foreground">zero budget</span> — every feature, every module, every line of code. We created the <span className="font-semibold text-foreground">first app of its kind in the entire world</span>: 28+ modules for productivity, studying, wellness, and life management in one fast, bloat-free experience.
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  But our entire infrastructure — codebase, hosting, deployment — runs on a <span className="font-semibold text-foreground">restrictive free tier</span>. To keep MindFlow alive and truly independent, <span className="font-semibold text-foreground">we urgently need to buy an actual independent domain and shared hosting with proper SSL, security, and cloud sync features</span>. This will free us from complicated terms, ensure 100% ownership, and let us scale without fear of losing the project.
                </p>

                <div className="mt-8 pt-8 border-t border-border/50">
                  <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-primary" /> Hire Us for Development
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    We build professional, premium, high-quality <span className="text-foreground font-semibold">Full Stack Websites</span> and SaaS platforms (from design to execution) for personal, professional, and business needs.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <a href="https://wa.me/8801947062892" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <MessageCircle className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">WhatsApp</p>
                        <p className="text-xs font-semibold group-hover:text-primary transition-colors underline-offset-2 group-hover:underline">+8801947062892</p>
                      </div>
                    </a>
                    <a href="mailto:hridoyzaman1@gmail.com" className="flex items-center gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Brain className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Email</p>
                        <p className="text-xs font-semibold group-hover:text-primary transition-colors underline-offset-2 group-hover:underline">hridoyzaman1@gmail.com</p>
                      </div>
                    </a>
                  </div>
                </div>


                <p className="text-xs sm:text-sm text-center text-muted-foreground italic pt-6">
                  "Every contribution brings us closer to securing MindFlow's future."
                </p>
              </div>

              <div className="glass rounded-2xl p-6 sm:p-8 space-y-5 border border-border">
                <h3 className="text-sm font-bold flex items-center justify-center gap-2">
                  <Heart className="w-4 h-4 text-destructive fill-destructive" /> Donate & Support
                </h3>
                <div className="p-5 rounded-xl bg-background border border-border space-y-3 text-center">
                  <p className="text-xs font-semibold text-muted-foreground">Mobile Banking (Bkash / Nagad)</p>
                  <p className="text-2xl sm:text-3xl font-bold text-primary tracking-wider">+8801947062892</p>
                  <p className="text-[10px] text-muted-foreground">(Personal Number — Send Any Amount)</p>
                  <div className="h-px bg-border/50" />
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                    For bank transfer or other methods, WhatsApp us:
                  </p>
                  <p className="text-sm font-semibold text-primary">+8801947062892</p>
                </div>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground text-center italic">
                  Every contribution — no matter how small — brings us closer to securing MindFlow's future.
                </p>
              </div>

              <div className="glass rounded-2xl p-5 sm:p-6 space-y-3 border border-border text-center">
                <h3 className="text-sm font-bold flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Thank You
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  To everyone who has used MindFlow, shared it, or even opened it once — <span className="font-semibold text-foreground">thank you</span>. You believed in something built with nothing but passion, sleepless nights, and a dream to help people live better. This app was never about money — it was about creating something genuinely useful that respects your privacy, stays ad-free, and actually works.
                </p>
                <p className="text-xs sm:text-sm text-foreground font-semibold pt-1">
                  With gratitude — The MindFlow Team
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-20 sm:py-32 px-4 sm:px-6 relative border-t border-border/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,hsl(245,60%,25%,0.1),transparent)]" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <Reveal>
            <Zap className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-4 sm:mb-6 text-[hsl(245,60%,65%)]" />
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-4 sm:mb-6">
              Ready to Think <GradientText>Different?</GradientText>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
              No signup required. No subscription. No data collection.
              Just open the app and start building your best self.
            </p>
            <Button
              onClick={() => navigate('/')}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 sm:px-10 rounded-full group text-sm sm:text-base w-full sm:w-auto"
            >
              Launch MindFlow
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Reveal>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-border/50 py-8 sm:py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-6">
          <Button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'MindFlow - Your All-In-One Companion',
                  text: 'Check out MindFlow! It has 28+ modules for productivity, studying, wellness, and more. 100% Free.',
                  url: 'https://nexusmindflow.vercel.app',
                }).catch(console.error);
              } else {
                navigator.clipboard.writeText('https://nexusmindflow.vercel.app');
                alert('Link copied to clipboard!');
              }
            }}
            variant="outline"
            className="rounded-full shadow-sm hover:bg-secondary transition-colors"
          >
            <Share2 className="w-4 h-4 mr-2 text-blue-500" /> Share MindFlow With Friends
          </Button>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-4 w-full">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[hsl(245,60%,55%)] to-[hsl(199,80%,50%)] flex items-center justify-center">
                <Brain className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Nexus MindFlow — Your wellbeing, study & life companion</span>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 text-[10px] sm:text-[11px] text-muted-foreground/60 flex-wrap justify-center">
              <span>v2.0.0</span>
              <span>•</span>
              <span>Developed by Hridoy Zaman</span>
              <span>•</span>
              <span>100% Free & Private</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
