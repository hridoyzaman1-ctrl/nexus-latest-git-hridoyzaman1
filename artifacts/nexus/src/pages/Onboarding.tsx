import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { UserProfile, SafetySettings, defaultSafetySettings } from '@/types';
import { avatars, avatarColors } from '@/lib/avatars';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Camera, ChevronRight, ChevronLeft, SkipForward, Check, Target, Brain, BarChart3, Sparkles, ShieldAlert, Heart, GraduationCap, Palette, Timer, BookOpen, MessageCircle, Droplets, Moon, Wind, Wallet, Bell, Volume2, CheckSquare, Clock, Flame, Presentation, Mic, CloudSun, UtensilsCrossed, Dumbbell, Newspaper } from 'lucide-react';

const slides = [
  {
    icon: Sparkles,
    color: 'hsl(245, 58%, 62%)',
    title: 'Welcome to MindFlow',
    subtitle: 'Your wellbeing, study & life companion',
    description: '28+ modules in one app — goals, habits, tasks, focus timer, notes, study planner, book reader, AI assistant, expense tracker, wellness tools, presentation maker, nutrition planner, fitness coach, news portal, weather, and much more.',
    previews: [
      { emoji: '🎯', label: 'Goals' },
      { emoji: '📝', label: 'Notes' },
      { emoji: '📚', label: 'Books' },
      { emoji: '🧠', label: 'AI' },
      { emoji: '❤️', label: 'Wellness' },
      { emoji: '🍽️', label: 'Nutrition' },
      { emoji: '💪', label: 'Fitness' },
      { emoji: '📰', label: 'News' },
      { emoji: '🌤️', label: 'Weather' },
    ],
  },
  {
    icon: Target,
    color: 'hsl(152, 69%, 45%)',
    title: 'Productivity Powerhouse',
    subtitle: 'Goals • Habits • Tasks • Focus • Notes • Time Tracking',
    description: 'Set goals with milestones, build habit streaks, manage tasks with priorities & alarms, deep focus with 6+ ambient soundscapes, rich markdown notes, and detailed time tracking.',
    previews: [
      { emoji: '🎯', label: 'Goals & Milestones' },
      { emoji: '🔥', label: 'Habit Streaks' },
      { emoji: '✅', label: 'Smart Tasks' },
      { emoji: '⏱️', label: 'Pomodoro' },
      { emoji: '🌧️', label: '6+ Sounds' },
      { emoji: '📝', label: 'Markdown Notes' },
    ],
  },
  {
    icon: GraduationCap,
    color: 'hsl(199, 89%, 48%)',
    title: 'Study & Learn',
    subtitle: 'LMS • Book Reader • AI Quizzes • Kira AI Buddy • Presentations',
    description: 'Full study planner with PDF/PPT/EPUB viewer, video player, split-screen notes, and AI-generated quizzes. 9 built-in books. Kira AI for study help. AI Presentation Maker integration for creating slides from study materials.',
    previews: [
      { emoji: '📖', label: 'PDF/EPUB Reader' },
      { emoji: '🎬', label: 'Video Player' },
      { emoji: '🧠', label: 'AI Quizzes' },
      { emoji: '✨', label: 'AI Summary & Explainer' },
      { emoji: '📚', label: '9 Free Books' },
      { emoji: '📽️', label: 'AI Presentations' },
    ],
  },
  {
    icon: Heart,
    color: 'hsl(340, 82%, 52%)',
    title: 'Wellness & Mental Health',
    subtitle: 'OCD Toolkit • Breathing • Sleep • Hydration • Grounding',
    description: 'Mood tracking, 4-7-8 breathing with AI analysis, 5-4-3-2-1 grounding, OCD tools (routine builder, check limiter, reassurance journal), sleep & water tracking.',
    previews: [
      { emoji: '🧘', label: 'Grounding' },
      { emoji: '💨', label: '4-7-8 Breathing' },
      { emoji: '🧩', label: 'OCD Toolkit' },
      { emoji: '😴', label: 'Sleep Tracker' },
      { emoji: '💧', label: 'Hydration' },
      { emoji: '💭', label: 'Mood Journal' },
    ],
  },
  {
    icon: BarChart3,
    color: 'hsl(38, 92%, 50%)',
    title: 'Analytics & Finance',
    subtitle: 'AI Reports • Expense Tracker • Smart Insights',
    description: 'AI-powered analytics across all your data — productivity, wellness, study progress. Plus a full expense tracker with budget limits, charts, and reports.',
    previews: [
      { emoji: '📊', label: 'AI Reports' },
      { emoji: '💰', label: 'Expenses' },
      { emoji: '📈', label: 'Trend Charts' },
      { emoji: '🎯', label: 'Budget Limits' },
      { emoji: '🔔', label: 'Smart Alerts' },
      { emoji: '⏰', label: 'Time Insights' },
    ],
  },
  {
    icon: Presentation,
    color: 'hsl(25, 95%, 53%)',
    title: 'Present & Perform',
    subtitle: 'AI Presentations • Speech Coach • PPTX Export',
    description: 'AI Presentation Maker generates slides from topics, PDFs, or text with themes and PPTX export. Presentation Coach provides real-time speech analysis with camera & mic across 7 scoring categories including pace, filler words, and eye contact.',
    previews: [
      { emoji: '📽️', label: 'AI Slide Maker' },
      { emoji: '🎤', label: 'Speech Coach' },
      { emoji: '📊', label: '7-Point Scoring' },
      { emoji: '📜', label: 'Teleprompter' },
      { emoji: '👁️', label: 'Eye Contact' },
      { emoji: '📥', label: 'PPTX Export' },
    ],
  },
  {
    icon: CloudSun,
    color: 'hsl(199, 89%, 48%)',
    title: 'Weather & Forecasts',
    subtitle: 'Live Conditions • Hourly & Weekly • Location Search',
    description: 'Real-time weather with temperature, humidity, wind speed, and conditions. Hourly and 7-day forecasts with precipitation chances. Search any city worldwide. Historical weather lookup. Free Open-Meteo data — no API key needed.',
    previews: [
      { emoji: '🌡️', label: 'Live Conditions' },
      { emoji: '⏰', label: 'Hourly Forecast' },
      { emoji: '📅', label: '7-Day Forecast' },
      { emoji: '🔍', label: 'City Search' },
      { emoji: '📊', label: 'Historical Data' },
      { emoji: '🌍', label: 'Worldwide' },
    ],
  },
  {
    icon: UtensilsCrossed,
    color: 'hsl(25, 95%, 53%)',
    title: 'Nutrition Planner',
    subtitle: 'Food Logging • 65+ Recipes • Meal Plans • Health Scores',
    description: 'Log meals with 210+ foods and fuzzy search. Browse 65+ recipes across 10 cuisines or create your own custom recipes. Generate daily, weekly, or monthly meal plans. Track calories, protein, carbs, and fat with health scoring.',
    previews: [
      { emoji: '🍳', label: '210+ Foods' },
      { emoji: '📖', label: '65+ Recipes' },
      { emoji: '✨', label: 'Custom Recipes' },
      { emoji: '📅', label: 'Meal Plans' },
      { emoji: '📊', label: 'Health Scores' },
      { emoji: '🥗', label: '10 Cuisines' },
    ],
  },
  {
    icon: Dumbbell,
    color: 'hsl(150, 70%, 45%)',
    title: 'Body & Fitness',
    subtitle: 'BMI Calculator • 50+ Exercises • Workout Timer • Coach',
    description: 'Calculate your BMI with health insights. Generate smart workout routines tailored to your goals, BMI, and gender. Browse 50+ exercises with step-by-step pose illustrations. Countdown timer and stopwatch with motivational coach messages. Track workout history and streaks. 100% free, no subscriptions.',
    previews: [
      { emoji: '⚖️', label: 'BMI Calculator' },
      { emoji: '🏋️', label: '50+ Exercises' },
      { emoji: '📋', label: 'Smart Routines' },
      { emoji: '⏱️', label: 'Workout Timer' },
      { emoji: '🔥', label: 'Streaks' },
      { emoji: '💬', label: 'Fitness Coach' },
    ],
  },
  {
    icon: Newspaper,
    color: 'hsl(210, 75%, 50%)',
    title: 'News Portal',
    subtitle: 'International & Bangladesh • RSS Feeds • Bookmarks',
    description: 'Read the latest headlines from BBC, Reuters, CNN, Al Jazeera, The Guardian, NPR, and more. Switch to Bangladesh national news from Daily Star, Prothom Alo, Dhaka Tribune. Filter by category, bookmark articles, search headlines, and get breaking news alerts. Offline fallback with cached news.',
    previews: [
      { emoji: '🌐', label: 'World News' },
      { emoji: '🇧🇩', label: 'Bangladesh' },
      { emoji: '🔖', label: 'Bookmarks' },
      { emoji: '🔍', label: 'Search' },
      { emoji: '⚡', label: 'Breaking News' },
      { emoji: '📴', label: 'Offline Cache' },
    ],
  },
  {
    icon: Palette,
    color: 'hsl(291, 64%, 42%)',
    title: 'Beautiful & Private',
    subtitle: '4 Themes • 8 Accents • Offline PWA • 100% Local',
    description: 'Light, Dark, AMOLED, and System themes with 8 accent colors. Works offline as a native app. All data stays on your device. Safety protocol for emergencies.',
    previews: [
      { emoji: '🌙', label: 'Dark & AMOLED' },
      { emoji: '🎨', label: '8 Accent Colors' },
      { emoji: '📱', label: 'Install as App' },
      { emoji: '🔒', label: '100% Private' },
      { emoji: '🔔', label: '4 Alarm Sounds' },
      { emoji: '🛡️', label: 'Safety Protocol' },
    ],
  },
];


// Steps: slides (0..10) -> profile (11) -> safety (12)
const PROFILE_STEP = slides.length;
const SAFETY_STEP = slides.length + 1;
const TOTAL_STEPS = slides.length + 2;

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useLocalStorage<UserProfile>('profile', {
    name: '', age: 0, occupation: '', goalsText: '', avatar: '😊',
  });
  const [safety, setSafety] = useLocalStorage<SafetySettings>('safetySettings', defaultSafetySettings);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProfileStep = step === PROFILE_STEP;
  const isSafetyStep = step === SAFETY_STEP;

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else finish();
  };
  const prev = () => { if (step > 0) setStep(step - 1); };
  const finish = () => {
    if (!profile.name.trim()) {
      setProfile(prev => ({ ...prev, name: 'User' }));
    }
    onComplete();
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 256;
        let w = img.width, h = img.height;
        if (w > h) { h = (h / w) * maxSize; w = maxSize; }
        else { w = (w / h) * maxSize; h = maxSize; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        updateProfile({ profilePicture: canvas.toDataURL('image/jpeg', 0.85) });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const avatarIndex = avatars.indexOf(profile.avatar);
  const avatarBg = avatarColors[avatarIndex >= 0 ? avatarIndex % avatarColors.length : 0];

  // Swipe handling
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-[100] flex flex-col overflow-hidden"
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

      {/* Skip button */}
      {!isProfileStep && !isSafetyStep && (
        <button onClick={finish}
          className="absolute top-6 right-6 z-10 text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors">
          Skip <SkipForward className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {step < slides.length ? (
            <motion.div
              key={`slide-${step}`}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.25 }}
              className="text-center max-w-sm mx-auto space-y-6"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center"
                style={{ background: slides[step].color + '18', border: `2px solid ${slides[step].color}33` }}
              >
                {(() => { const Icon = slides[step].icon; return <Icon className="w-12 h-12" style={{ color: slides[step].color }} />; })()}
              </motion.div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold font-display">{slides[step].title}</h1>
                <p className="text-sm font-medium" style={{ color: slides[step].color }}>{slides[step].subtitle}</p>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">{slides[step].description}</p>

              {/* Mini feature preview chips */}
              {slides[step].previews && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="flex flex-wrap justify-center gap-2 pt-1"
                >
                  {slides[step].previews.map((p, i) => (
                    <motion.div
                      key={p.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.35 + i * 0.06, type: 'spring', stiffness: 300 }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl glass text-[11px]"
                    >
                      <span>{p.emoji}</span>
                      <span className="text-foreground/80 font-medium">{p.label}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          ) : isProfileStep ? (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-sm mx-auto space-y-5"
            >
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold font-display">Set Up Your Profile</h1>
                <p className="text-xs text-muted-foreground">Optional — you can always update this in Settings</p>
              </div>

              {/* Avatar */}
              <div className="flex justify-center">
                <div className="relative">
                  {profile.profilePicture ? (
                    <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-primary/30">
                      <img src={profile.profilePicture} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <button onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                      className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl transition-transform active:scale-90"
                      style={{ background: avatarBg + '22', border: `2px solid ${avatarBg}44` }}>
                      {profile.avatar}
                    </button>
                  )}
                  <button onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                </div>
              </div>

              {/* Emoji picker */}
              <AnimatePresence>
                {showAvatarPicker && !profile.profilePicture && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="grid grid-cols-10 gap-2 pt-1">
                      {avatars.map((a, i) => (
                        <button key={a} onClick={() => { updateProfile({ avatar: a }); setShowAvatarPicker(false); }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all ${profile.avatar === a ? 'ring-2 ring-primary scale-110' : 'hover:bg-secondary'}`}
                          style={{ background: avatarColors[i % avatarColors.length] + '22' }}>
                          {a}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Fields */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="onb-name" className="text-xs text-muted-foreground ml-1">Your Name</Label>
                  <Input id="onb-name" placeholder="e.g. Alex" value={profile.name} onChange={e => updateProfile({ name: e.target.value })}
                    className="bg-secondary border-0 text-center" />
                </div>
                <div className="flex gap-2">
                  <div className="space-y-1.5 flex-1">
                    <Label htmlFor="onb-age" className="text-xs text-muted-foreground ml-1">Age</Label>
                    <Input id="onb-age" type="number" placeholder="e.g. 25" value={profile.age || ''} onChange={e => updateProfile({ age: parseInt(e.target.value) || 0 })}
                      className="bg-secondary border-0" min={0} max={150} />
                  </div>
                  <div className="space-y-1.5 flex-[2]">
                    <Label htmlFor="onb-occ" className="text-xs text-muted-foreground ml-1">Occupation</Label>
                    <Input id="onb-occ" placeholder="e.g. Student, Designer" value={profile.occupation} onChange={e => updateProfile({ occupation: e.target.value })}
                      className="bg-secondary border-0" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="onb-goals" className="text-xs text-muted-foreground ml-1">Your Goals (optional)</Label>
                  <Textarea id="onb-goals" placeholder="What do you want to achieve?" value={profile.goalsText} onChange={e => updateProfile({ goalsText: e.target.value })}
                    className="bg-secondary border-0 min-h-[70px] text-sm" />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="safety"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-sm mx-auto space-y-5"
            >
              <div className="text-center space-y-2">
                <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center"
                  style={{ background: 'hsl(0, 84%, 55%, 0.15)', border: '2px solid hsl(0, 84%, 55%, 0.3)' }}>
                  <ShieldAlert className="w-10 h-10" style={{ color: 'hsl(0, 84%, 55%)' }} />
                </div>
                <h1 className="text-2xl font-bold font-display">Safety Protocol</h1>
                <p className="text-xs text-muted-foreground">
                  If you stop using MindFlow for a set number of days, the app can alert your emergency contacts.
                  You can set this up now or later in Settings.
                </p>
              </div>

              <div className="glass rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Enable Safety Protocol</span>
                  <Switch checked={safety.enabled} onCheckedChange={v => setSafety(prev => ({ ...prev, enabled: v }))} />
                </div>

                {safety.enabled && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">Alert after inactivity of</label>
                        <span className="text-xs font-bold">{safety.inactivityDays} day{safety.inactivityDays !== 1 ? 's' : ''}</span>
                      </div>
                      <Slider
                        value={[safety.inactivityDays]}
                        onValueChange={([v]) => setSafety(prev => ({ ...prev, inactivityDays: v }))}
                        min={1} max={30} step={1}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      You can add emergency contacts after setup from the Emergency Contacts page or Settings.
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom: dots + buttons */}
      <div className="pb-10 px-6 space-y-5">
        {/* Dots */}
        <div className="flex justify-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <button key={i} onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`} />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 max-w-sm mx-auto w-full">
          {step > 0 && (
            <Button variant="secondary" onClick={prev} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          )}
          <Button onClick={next} className="flex-1 gap-1.5">
            {isSafetyStep ? (
              <><Check className="w-4 h-4" /> Get Started</>
            ) : (
              <>Next <ChevronRight className="w-4 h-4" /></>
            )}
          </Button>
          {(isProfileStep || isSafetyStep) && (
            <Button variant="ghost" onClick={finish} className="text-xs text-muted-foreground">
              Skip
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
