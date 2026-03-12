import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Modules = lazy(() => import("@/pages/Modules"));
const Goals = lazy(() => import("@/pages/Goals"));
const Habits = lazy(() => import("@/pages/Habits"));
const Tasks = lazy(() => import("@/pages/Tasks"));
const FocusTimer = lazy(() => import("@/pages/FocusTimer"));
const Notes = lazy(() => import("@/pages/Notes"));
const PresentationGenerator = lazy(() => import("@/pages/PresentationGenerator"));
const PresentationCoach = lazy(() => import("@/pages/PresentationCoach"));
const Books = lazy(() => import("@/pages/Books"));
const StudyPlanner = lazy(() => import("@/pages/StudyPlanner"));
const Wellness = lazy(() => import("@/pages/Wellness"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Chat = lazy(() => import("@/pages/Chat"));
const Weather = lazy(() => import("@/pages/Weather"));
const Expenses = lazy(() => import("@/pages/Expenses"));
const Todos = lazy(() => import("@/pages/Todos"));
const TimeTracking = lazy(() => import("@/pages/TimeTracking"));
const SettingsPage = lazy(() => import("@/pages/Settings"));
const Reminders = lazy(() => import("@/pages/Reminders"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Install = lazy(() => import("@/pages/Install"));
const NotificationHistory = lazy(() => import("@/pages/NotificationHistory"));
const EmergencyContacts = lazy(() => import("@/pages/EmergencyContacts"));
const About = lazy(() => import("@/pages/About"));
const HelpUsGrow = lazy(() => import("@/pages/HelpUsGrow"));
const NutritionPlanner = lazy(() => import("@/pages/NutritionPlanner"));
const FitnessCoach = lazy(() => import("@/pages/FitnessCoach"));
const NewsPortal = lazy(() => import("@/pages/NewsPortal"));
const Showcase = lazy(() => import("@/pages/Showcase"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Landing = lazy(() => import("@/pages/Landing"));
const KiraGreetingPopup = lazy(() => import("@/components/KiraGreetingPopup"));
const DataRestorePromptLazy = lazy(() => import("@/components/DataRestorePrompt"));
const MiniMusicPlayer = lazy(() => import("@/components/MiniMusicPlayer"));
const KiraChatFAB = lazy(() => import("@/components/KiraChatFAB"));
const OfflineBanner = lazy(() => import("@/components/OfflineBanner"));
const SplashScreen = lazy(() => import("@/components/SplashScreen"));
const TutorialDialog = lazy(() => import("@/components/TutorialDialog"));
import ScrollToTop from "@/components/ScrollToTop";
import { MusicPlayerProvider } from "@/contexts/MusicPlayerContext";
import { useReminderEngine } from "@/hooks/useReminderEngine";
import { useNotificationReminders } from "@/hooks/useNotificationReminders";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useAccessibility } from "@/hooks/useAccessibility";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { getLocalStorage, setLocalStorage } from "@/hooks/useLocalStorage";
import { hasExistingData, clearAllMindflowData } from "@/lib/dataRestoreHelpers";

const queryClient = new QueryClient();

// Replaced ScrollToTop with AnimatePresence onExitComplete for proper timing

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <>
      <AnimatePresence mode="wait">
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center animate-in fade-in duration-300">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/modules" element={<Modules />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/focus" element={<FocusTimer />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/books" element={<Books />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/todos" element={<Todos />} />
            <Route path="/study" element={<StudyPlanner />} />
            <Route path="/time-tracking" element={<TimeTracking />} />
            <Route path="/wellness" element={<Wellness />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/notifications" element={<NotificationHistory />} />
            <Route path="/emergency-contacts" element={<EmergencyContacts />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/about" element={<About />} />
            <Route path="/help-us-grow" element={<HelpUsGrow />} />
            <Route path="/presentations" element={<PresentationGenerator />} />
            <Route path="/presentation-coach" element={<PresentationCoach />} />
            <Route path="/weather" element={<Weather />} />
            <Route path="/nutrition" element={<NutritionPlanner />} />
            <Route path="/fitness" element={<FitnessCoach />} />
            <Route path="/news" element={<NewsPortal />} />
            <Route path="/showcase" element={<Showcase />} />
            <Route path="/install" element={<Install />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </>
  );
}

const accentPresets = [
  { h: 245, s: 58, l: 62 },
  { h: 152, s: 69, l: 45 },
  { h: 340, s: 82, l: 52 },
  { h: 38, s: 92, l: 50 },
  { h: 199, s: 89, l: 48 },
  { h: 291, s: 64, l: 42 },
  { h: 217, s: 91, l: 60 },
  { h: 0, s: 84, l: 60 },
];

function applyThemeImmediately() {
  const savedTheme = getLocalStorage<'system' | 'light' | 'dark' | 'amoled'>('themeMode', 'dark');
  const root = document.documentElement;
  root.classList.remove('dark', 'light', 'amoled');
  if (savedTheme === 'dark') root.classList.add('dark');
  else if (savedTheme === 'amoled') root.classList.add('amoled');
  else if (savedTheme === 'light') { /* light is default */ }
  else {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark');
  }

  const savedAccent = getLocalStorage<number>('accentIndex', 0);
  if (savedAccent >= 0 && savedAccent < accentPresets.length) {
    const { h, s, l } = accentPresets[savedAccent];
    root.style.setProperty('--primary', `${h} ${s}% ${l}%`);
    root.style.setProperty('--accent', `${h} ${s}% ${l}%`);
    root.style.setProperty('--ring', `${h} ${s}% ${l}%`);
  }
}

// Apply theme before first render so splash screen uses correct theme
applyThemeImmediately();

function AppInner() {
  const location = useLocation();
  useReminderEngine();
  useNotificationReminders();
  useActivityTracker();
  useAccessibility();

  const [onboardingDone, setOnboardingDone] = useState(() =>
    getLocalStorage<boolean>('onboardingDone', false)
  );
  const [splashDone, setSplashDone] = useState(false);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [restoreChecked, setRestoreChecked] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const hasOnboarded = getLocalStorage<boolean>('onboardingDone', false);
    const appVersion = getLocalStorage<string>('appVersion', '');

    // Show restore prompt on fresh install / reinstall (no appVersion set yet)
    if (!appVersion) {
      if (hasExistingData()) {
        // Found old data — let user choose to restore or start fresh
        setShowRestorePrompt(true);
      } else if (hasOnboarded) {
        // Returning user but no data — show restore for import option
        setShowRestorePrompt(true);
      } else {
        // Brand new user, no data, never onboarded — skip restore, go to onboarding
        setLocalStorage('appVersion', '2.0.0');
        setRestoreChecked(true);
      }
    } else {
      setRestoreChecked(true);
    }
  }, []);

  useEffect(() => {
    if (!restoreChecked && showRestorePrompt) return;
    import("@/lib/seedData").then(m => m.seedExampleData());
    applyThemeImmediately();
  }, [restoreChecked, showRestorePrompt]);

  useEffect(() => {
    if (restoreChecked && onboardingDone && splashDone) {
      const tutorialSeen = getLocalStorage<boolean>('tutorialSeen', false);
      if (!tutorialSeen) {
        const t = setTimeout(() => setShowTutorial(true), 600);
        return () => clearTimeout(t);
      }
    }
  }, [restoreChecked, onboardingDone, splashDone]);

  // Kira is disabled while tutorial is showing or hasn't been completed yet this session
  const kiraDisabled = showTutorial;

  const handleRestore = () => {
    setLocalStorage('appVersion', '2.0.0');
    setShowRestorePrompt(false);
    setRestoreChecked(true);
  };

  const handleFreshStart = () => {
    clearAllMindflowData();
    setLocalStorage('appVersion', '2.0.0');
    setShowRestorePrompt(false);
    setRestoreChecked(true);
    setOnboardingDone(false);
    window.location.reload();
  };

  const handleTutorialClose = (open: boolean) => {
    setShowTutorial(open);
    if (!open) {
      setLocalStorage('tutorialSeen', true);
    }
  };

  const handleOnboardingComplete = () => {
    setLocalStorage('onboardingDone', true);
    setOnboardingDone(true);
  };

  // Landing page bypasses all gates (splash, onboarding, restore)
  if (location.pathname === '/landing') {
    return <Suspense fallback={<div className="min-h-screen" />}><Landing /></Suspense>;
  }

  if (!splashDone) {
    return <Suspense fallback={<div className="min-h-screen" />}><SplashScreen onFinish={() => setSplashDone(true)} /></Suspense>;
  }

  if (showRestorePrompt) {
    return <Suspense fallback={<div className="min-h-screen" />}><DataRestorePromptLazy onRestore={handleRestore} onFresh={handleFreshStart} /></Suspense>;
  }

  if (!onboardingDone) {
    return <Suspense fallback={<div className="min-h-screen" />}><Onboarding onComplete={handleOnboardingComplete} /></Suspense>;
  }

  return (
    <>
      <Suspense fallback={null}><OfflineBanner /></Suspense>
      {!showTutorial && <Suspense fallback={null}><KiraGreetingPopup disabled={kiraDisabled} /></Suspense>}
      <Layout>
        <AnimatedRoutes />
      </Layout>
      <Suspense fallback={null}><MiniMusicPlayer /></Suspense>
      <Suspense fallback={null}><KiraChatFAB /></Suspense>
      <Suspense fallback={null}><TutorialDialog open={showTutorial} onOpenChange={handleTutorialClose} /></Suspense>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <MusicPlayerProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <AppInner />
        </BrowserRouter>
      </MusicPlayerProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
