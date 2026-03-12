import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, HelpCircle, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState, lazy, Suspense } from 'react';

const TutorialDialog = lazy(() => import('@/components/TutorialDialog'));

export default function About() {
  const navigate = useNavigate();
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="px-4 pt-12 pb-24 space-y-5">
      <div className="flex items-center gap-3">
        <Button size="icon" variant="ghost" onClick={() => navigate('/settings')} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold font-display">About</h1>
      </div>

      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="text-center space-y-1">
          <p className="text-2xl font-display font-bold">Nexus MindFlow</p>
          <p className="text-sm text-muted-foreground">Version 2.0.0</p>
          <p className="text-sm text-primary font-semibold mt-1">Developed by Hridoy Zaman</p>
        </div>

        <div className="border-t border-border/30 pt-4 space-y-3">
          <p className="text-sm text-foreground/90 leading-relaxed">
            <span className="font-semibold">Nexus MindFlow</span> is your all-in-one productivity & wellness companion — designed to help you organize your life, build positive habits, track your progress, and take care of your mental health, all in one beautiful app.
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            🧠 <span className="font-medium">For OCD & Anxiety Support:</span> Features dedicated tools including anxiety logging, intrusive thought journaling, the 5-4-3-2-1 grounding technique, guided breathing exercises, and a reassurance journal — all crafted to help you manage symptoms with compassion, not judgment.
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            🚀 <span className="font-medium">For Everyone:</span> 28+ modules including powerful task management, goal tracking, habit streaks, focus timer, a full Study Planner LMS (import PDFs, EPUB, PPTX slides & videos with split-screen notes, AI Summary & Explainer with Quick Summary/Deep Dive/ELI5 modes, study timers & dashboards), AI Presentation Maker (generate slides from topics, PDFs & DOCX with themes and PPTX export), AI Presentation Coach (real-time speech analysis with camera+mic, 7-category scoring, teleprompter & script generation), Weather Module (forecasts, historical data & smart advice), Nutrition Planner (meal logging, calorie tracking, recipe suggestions & health scores), Body & Fitness Coach (BMI calculator, personalized workout routines & exercise database), News Portal (curated news feeds with smart deduplication & caching), advanced expense tracking with budgets, donut charts, category limits & downloadable reports, sleep analysis, mood trends, AI-powered analytics with tailored academic feedback, and a personal buddy (Kira) — everything you need to level up your daily life.
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            🔒 Your data stays on your device. No accounts, no servers, no tracking. Just you and your growth.
          </p>
        </div>

        <div className="border-t border-border/30 pt-4">
          <p className="text-xs text-muted-foreground leading-relaxed italic">
            📖 <span className="font-medium not-italic">Origin Story:</span> This app was originally born because <span className="text-foreground/90 font-medium">Abdullah Al Robin</span> needed a productivity app that actually understood mental health — and who better to build it than his best friend <span className="text-foreground/90 font-medium">Hridoy Zaman</span>, who definitely didn't procrastinate building this by adding "just one more feature" seventeen times. Robin wanted a simple to-do app. Hridoy delivered an entire universe. You're welcome, Robin. 😤💜
          </p>
        </div>

        {/* View App Tutorial Button */}
        <div className="border-t border-border/30 pt-4 space-y-2">
          <Button
            variant="secondary"
            className="w-full gap-2 text-xs h-9"
            onClick={() => setShowTutorial(true)}
          >
            <BookOpen className="w-4 h-4" /> View App Tutorial
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2 text-xs h-9"
            onClick={() => navigate('/landing')}
          >
            <Globe className="w-4 h-4" /> View Our Website
          </Button>
        </div>
      </div>

      {showTutorial && (
        <Suspense fallback={null}>
          <TutorialDialog open={showTutorial} onOpenChange={setShowTutorial} />
        </Suspense>
      )}
    </motion.div>
  );
}
