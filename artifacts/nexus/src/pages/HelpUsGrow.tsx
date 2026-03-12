import { ArrowLeft, Sprout, MessageCircle, Rocket, Heart, Handshake, Map, CheckCircle2, Sparkles, AlertTriangle, DollarSign, Clock, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageTransition from '@/components/PageTransition';

const roadmapItems = [
  {
    title: 'Cloud Storage & Sync',
    desc: 'Migrate from local storage to secure cloud-based data storage so your data syncs across all devices and never gets lost. Currently limited due to funding.',
  },
  {
    title: 'Google Drive & Account Integration',
    desc: 'Connect your Google account for seamless file backup, calendar sync, and cross-platform automation.',
  },
  {
    title: 'Automation SaaS Platform',
    desc: 'Build powerful automation workflows — auto-reminders, smart scheduling, and AI-driven task management across all modules.',
  },
  {
    title: 'Enhanced OCD & Anxiety Tools',
    desc: 'More specialized features for OCD patients — exposure tracking, compulsion logging, anxiety scales, and therapist-friendly reports.',
  },
  {
    title: 'Robust Emergency Contact System',
    desc: 'One-tap SOS alerts, location sharing, automatic crisis detection, and integration with emergency services.',
  },
  {
    title: 'Community & Social Sharing',
    desc: 'A safe space where people battling OCD, anxiety, depression or any challenge can share their stories, struggles, and victories — building a supportive community where no one feels alone.',
  },
  {
    title: 'Premium AI Capabilities',
    desc: 'Faster, smarter AI with higher quotas for chat, summaries, analytics, and personalized coaching. Currently limited due to zero budget.',
  },
  {
    title: 'More Accessibility Features',
    desc: 'Better screen reader support, voice commands, customizable UI density, and more inclusive design for all users.',
  },
  {
    title: 'Google Play Store Launch',
    desc: 'Publish MindFlow as a native Android app on the Google Play Store — available to millions worldwide, with push notifications, offline support, and a seamless mobile experience.',
  },
  {
    title: 'And Much More…',
    desc: 'Habit streaks sharing, collaborative study rooms, mood-based music recommendations, journal prompts, sleep tracking, and features we haven\'t even dreamed up yet.',
  },
];

export default function HelpUsGrow() {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="px-4 py-6 space-y-5 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl glass flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Sprout className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Help Us Grow</h1>
          </div>
        </div>

        {/* Urgent Appeal */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}
          className="rounded-2xl p-4 space-y-3 border-2 border-destructive/40"
          style={{ background: 'linear-gradient(135deg, hsl(0 70% 50% / 0.08), hsl(35 90% 50% / 0.06))' }}>
          <h2 className="text-sm font-bold flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" /> Why We Need Your Help — Urgently
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            MindFlow was built from scratch with <span className="font-semibold text-foreground">zero budget</span> — every line of code, every feature, every design decision. We worked day and night to create something truly unique: <span className="font-semibold text-foreground">the first app in the world</span> that combines 28+ productivity, study, wellness, and life management modules into one simple, fast, bloat-free experience.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            But here's the reality: our entire infrastructure is currently built on a <span className="font-semibold text-foreground">restrictive free tier</span>. To keep MindFlow alive and truly independent, <span className="font-semibold text-foreground">we urgently need to buy an actual independent domain and shared hosting with proper SSL, security, and cloud sync features</span> — the very basic requirements. This will free us from convoluted terms and conditions, ensure sole ownership of the platform, and protect everything we poured our hearts into.
          </p>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
            <Clock className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-[11px] font-semibold text-destructive">
              Status: Anytime Anyday
            </p>
          </div>

        </motion.div>

        {/* What $42 Gets Us */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          className="rounded-2xl p-4 space-y-3 border border-primary/30"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(199 80% 50% / 0.06))' }}>
          <h2 className="text-sm font-bold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> What Your Donation Unlocks
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            ALL WE NEED INITIALLY IS AROUND <span className="text-lg font-bold text-primary">42-50 DOLLARS</span> TO BUY AN INDEPENDENT DOMAIN AND SECURE SHARED HOSTING WITH PROPER SSL. THIS IS THE FIRST ROUND OF FUNDING NEEDED TO ESCAPE THE FREE TIER RESTRICTIONS ONCE AND FOR ALL.
          </p>

          <ul className="space-y-1.5">
            {[
              'Independent domain name ownership for true brand identity',
              'Fast, reliable shared hosting with proper SSL security',
              'Cloud sync capabilities so you never lose your data across devices',
              'Complete independence from restrictive platform limitations',
              'Publish to Google Play Store as a native Android app',
              'No paywalls, subscriptions, or ads — keeping MindFlow free',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Shield className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-primary font-semibold text-center pt-1">
            Around 42-50 dollars for domain, hosting, and security. That's it. No subscriptions. No strings attached.
          </p>

           </motion.div>

        {/* Donation & Support Details */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}
          className="rounded-2xl p-5 space-y-4 text-center"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(280 60% 55% / 0.15))' }}>
          <h2 className="text-sm font-bold flex items-center justify-center gap-2">
            <Heart className="w-4 h-4 text-destructive fill-destructive" /> Donate & Support
          </h2>
          <div className="p-4 rounded-xl bg-background/80 border border-border space-y-3">
            <p className="text-xs font-semibold text-muted-foreground">Mobile Banking (Bkash / Nagad)</p>
            <p className="text-xl font-bold text-primary tracking-wider">+8801947062892</p>
            <p className="text-[10px] text-muted-foreground">(Personal Number — Send Any Amount)</p>
            <div className="h-px bg-border/50" />
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Direct Contact</p>
              <p className="text-xs font-semibold text-primary">WhatsApp: +8801947062892</p>
              <p className="text-xs font-semibold text-primary underline">hridoyzaman1@gmail.com</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground italic leading-relaxed">
            Every contribution brings us closer to securing proper hosting, an independent domain, and our Play Store launch.
          </p>
        </motion.div>

        {/* Professional Services */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}
          className="rounded-2xl p-5 space-y-3 border-2 border-primary/20 bg-primary/5"
        >
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Hire Us for Your Next Project
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We build any professional, premium, high-quality <span className="text-foreground font-semibold">Full Stack Website</span> — from design to execution, SaaS, and custom platforms for personal, professional, or business needs.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2 rounded-lg bg-background border border-border text-[10px] font-medium text-center">Fast Delivery</div>
            <div className="p-2 rounded-lg bg-background border border-border text-[10px] font-medium text-center">Premium Design</div>
            <div className="p-2 rounded-lg bg-background border border-border text-[10px] font-medium text-center">Scalable Code</div>
            <div className="p-2 rounded-lg bg-background border border-border text-[10px] font-medium text-center">SaaS Ready</div>
          </div>
          <p className="text-[11px] font-bold text-center pt-2">
            Contact for Hire: <span className="text-primary italic">hridoyzaman1@gmail.com</span>
          </p>
        </motion.div>

        {/* Thank You Note */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="glass rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Handshake className="w-4 h-4 text-primary" /> Thank You From the Bottom of Our Hearts
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            To everyone who has used MindFlow, shared it with friends, or even just opened it once — <span className="font-semibold text-foreground">thank you</span>. You believed in something built with nothing but passion, sleepless nights, and a dream to help people live better, study smarter, and feel less alone.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This app was never about money. It was about creating something genuinely useful — a companion that respects your privacy, doesn't bombard you with ads, and actually works. If we can secure its future, we promise to keep it that way. Always.
          </p>
          <p className="text-xs text-foreground font-semibold text-center pt-1">
            With gratitude — The MindFlow Team
          </p>
        </motion.div>

        {/* Message From Us */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" /> What Makes MindFlow Different
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            MindFlow is the <span className="font-semibold text-foreground">first app of its kind in the entire world</span> — a single app with 28+ modules covering productivity, studying, wellness, mental health, presentations, weather, nutrition planning, fitness coaching, live news, expense tracking, and more. All in one place, without bloatware, without the heavy feel, without slowness.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            No other app combines AI chat companion, study planner with quiz system, presentation maker and coach, nutrition planner, body & fitness coach, live news portal, OCD and anxiety tools, habit tracking, focus timer, book reader, expense tracker, weather forecasts, emergency contacts, and gamification — all working together seamlessly.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            And we built all of this with <span className="font-semibold text-foreground">$0</span>. Imagine what we can do with your support.
          </p>
        </motion.div>

        {/* How Support Helps */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          className="glass rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary" /> How Your Support Helps
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">Your contribution helps us:</p>
          <ul className="space-y-1.5">
            {[
              'Secure codebase copyright and legal protection (Around $42-50 needed)',

              'Publish MindFlow on the Google Play Store',
              'Upgrade to premium AI for smarter, faster responses',
              'Add cloud sync so your data follows you everywhere',
              'Build native mobile features with push notifications',
              'Keep the app 100% free for everyone — forever',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-primary mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Recently Launched */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21 }}
          className="glass rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Recently Launched
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We now have 28+ modules! Here are the latest features we've shipped:
          </p>
          <div className="space-y-2.5">
            {[
              {
                title: 'AI Presentation Coach',
                desc: 'Practice presentations with your camera and microphone. Real-time analysis of gestures, posture, eye contact, speech delivery, timing, and pauses across 7 scoring categories. Get live on-screen feedback plus detailed analytics reports.',
              },
              {
                title: 'AI Presentation Maker',
                desc: 'Generate beautiful slide decks from topics, PDFs, or DOCX files using AI. Edit slides, apply themes, add speaker notes, and export to PPTX — all integrated with Study Planner.',
              },
              {
                title: 'Weather Module',
                desc: 'Current conditions, hourly and daily forecasts, 7-day outlook, historical weather lookup, location search, and smart advice — right from your dashboard.',
              },
              {
                title: 'Nutrition Planner',
                desc: 'Track meals, log calories and macros, discover recipes from your pantry, get personalized meal plans, and generate detailed nutrition reports — all powered by a comprehensive food database.',
              },
              {
                title: 'Body & Fitness Coach',
                desc: 'BMI calculator, personalized workout routines, exercise library with muscle targeting, rest timers, progress tracking, and AI-powered fitness coaching tailored to your goals.',
              },
              {
                title: 'News Portal',
                desc: 'Stay informed with a live news feed aggregating top stories across categories. Bookmark articles, search headlines, and get AI-powered summaries — all without leaving MindFlow.',
              },
            ].map((item, i) => (
              <div key={i} className="rounded-xl bg-primary/10 border border-primary/20 p-3 space-y-1">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  {item.title}
                  <span className="ml-auto text-[9px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">LIVE</span>
                </p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Roadmap */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="glass rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Map className="w-4 h-4 text-primary" /> Our Roadmap
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Here's what we're working towards — your support accelerates every item on this list:
          </p>
          <div className="space-y-2.5">
            {roadmapItems.map((item, i) => (
              <div key={i} className="rounded-xl bg-secondary/50 p-3 space-y-1">
                <p className="text-xs font-semibold">{item.title}</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <p className="text-center text-[10px] text-muted-foreground/60 pb-4">
          Thank you for being part of this journey. We couldn't do it without you.
        </p>
      </div>
    </PageTransition>
  );
}
