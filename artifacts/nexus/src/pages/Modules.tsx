import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Flame, CheckSquare, Timer, StickyNote, BookOpen, ListTodo, GraduationCap, DollarSign, Clock, Brain, Heart, Bell, ShieldAlert, BarChart3, MessageCircle, Sun, Moon, Eclipse, Monitor, Search, Presentation, Video, CloudSun, UtensilsCrossed, Dumbbell, Newspaper, ArrowLeft, Library } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const modules = [
  { title: 'Goals', desc: 'Set and track your goals', icon: Target, path: '/goals', color: 'hsl(245, 58%, 62%)' },
  { title: 'Habits', desc: 'Build daily habits', icon: Flame, path: '/habits', color: 'hsl(38, 92%, 50%)' },
  { title: 'Tasks', desc: 'Manage your tasks', icon: CheckSquare, path: '/tasks', color: 'hsl(152, 69%, 45%)' },
  { title: 'Reminders', desc: 'All upcoming reminders', icon: Bell, path: '/reminders', color: 'hsl(340, 65%, 55%)' },
  { title: 'Focus Timer', desc: 'Pomodoro sessions', icon: Timer, path: '/focus', color: 'hsl(340, 82%, 52%)' },
  { title: 'Notes', desc: 'Folders, tags & graph', icon: StickyNote, path: '/notes', color: 'hsl(199, 89%, 48%)' },
  { title: 'Books', desc: 'PDF, EPUB & TXT reader', icon: BookOpen, path: '/books', color: 'hsl(291, 64%, 42%)' },
  { title: 'To-Do', desc: 'Quick task list', icon: ListTodo, path: '/todos', color: 'hsl(217, 91%, 60%)' },
  { title: 'Study Planner', desc: 'LMS, quizzes & AI buddy', icon: GraduationCap, path: '/study', color: 'hsl(262, 83%, 58%)' },
  { title: 'Expenses', desc: 'Budgets, charts & reports', icon: DollarSign, path: '/expenses', color: 'hsl(0, 84%, 60%)' },
  { title: 'Time Tracking', desc: 'Log your time', icon: Clock, path: '/time-tracking', color: 'hsl(162, 73%, 46%)' },
  { title: 'Analytics', desc: 'AI reports & trends', icon: BarChart3, path: '/analytics', color: 'hsl(199, 89%, 48%)' },
  { title: 'Kira Chat', desc: 'Wellness buddy', icon: MessageCircle, path: '/chat', color: 'hsl(280, 60%, 55%)' },
  { title: 'Emergency', desc: 'Safety contacts', icon: ShieldAlert, path: '/emergency-contacts', color: 'hsl(0, 84%, 55%)' },
  { title: 'Presentations', desc: 'Create slide decks', icon: Presentation, path: '/presentations', color: 'hsl(25, 95%, 53%)' },
  { title: 'Presentation Coach', desc: 'AI speech coaching', icon: Video, path: '/presentation-coach', color: 'hsl(262, 83%, 58%)' },
  { title: 'Weather', desc: 'Forecast, alerts & advice', icon: CloudSun, path: '/weather', color: 'hsl(199, 89%, 48%)' },
  { title: 'Nutrition Planner', desc: 'Meals, recipes & diet plans', icon: UtensilsCrossed, path: '/nutrition', color: 'hsl(25, 95%, 53%)' },
  { title: 'Body & Fitness', desc: 'BMI, workouts & exercise coach', icon: Dumbbell, path: '/fitness', color: 'hsl(150, 70%, 45%)' },
  { title: 'News Portal', desc: 'Headlines & world news', icon: Newspaper, path: '/news', color: 'hsl(210, 75%, 50%)' },
  { title: 'Media Library', desc: 'Audio & video from your content', icon: Library, path: '/media-library', color: 'hsl(245, 58%, 62%)' },
  { title: 'Meditation', desc: 'Mindful moments', icon: Brain, path: '/wellness#meditation', color: 'hsl(280, 60%, 55%)' },
  { title: 'Wellness & OCD Support', desc: 'ERP & coping tools', icon: Heart, path: '/wellness#ocd', color: 'hsl(340, 82%, 52%)' },
];

type ThemeMode = 'system' | 'light' | 'dark' | 'amoled';

const themeOptions: { mode: ThemeMode; icon: typeof Sun; label: string }[] = [
  { mode: 'light', icon: Sun, label: 'Light' },
  { mode: 'dark', icon: Moon, label: 'Dark' },
  { mode: 'amoled', icon: Eclipse, label: 'AMOLED' },
];

export default function Modules() {
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = useLocalStorage<ThemeMode>('themeMode', 'dark');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredModules = modules.filter(m =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const applyTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    const root = document.documentElement;
    root.classList.add('theme-transitioning');
    root.classList.remove('dark', 'light', 'amoled');
    if (mode === 'dark') root.classList.add('dark');
    else if (mode === 'amoled') root.classList.add('amoled');
    else if (mode === 'light') { /* default */ }
    else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark');
    }
    setTimeout(() => root.classList.remove('theme-transitioning'), 450);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="px-4 pt-12 pb-24">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display flex-1">Modules</h1>
        {/* Quick theme toggle */}
        <div className="flex items-center gap-1 bg-secondary/60 rounded-xl p-1">
          {themeOptions.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => applyTheme(mode)}
              title={label}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${themeMode === mode
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search modules..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-secondary/30 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50 border border-primary/5 hover:border-primary/20 focus:border-primary/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <AnimatePresence>
          {filteredModules.map(({ title, desc, icon: Icon, path, color }, i) => (
            <motion.button
              key={path}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.02, duration: 0.15 }}
              onClick={() => navigate(path)}
              className="glass rounded-2xl p-4 text-left hover:bg-card/80 transition-all active:scale-[0.97]"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: color + '18' }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </motion.button>
          ))}
        </AnimatePresence>

        {filteredModules.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-2 text-center py-12 text-muted-foreground text-sm"
          >
            <Search className="w-8 h-8 mx-auto mb-3 opacity-20" />
            No modules found matching "{searchQuery}"
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
