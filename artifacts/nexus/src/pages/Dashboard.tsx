import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { UserProfile, ActivityItem, GamificationState } from '@/types';
import { getDailyQuote } from '@/lib/quotes';
import { avatars, avatarColors } from '@/lib/avatars';
import { getLocalStorage } from '@/hooks/useLocalStorage';
import { useNavigate } from 'react-router-dom';
import { Target, Flame, CheckSquare, Timer, StickyNote, BookOpen, DollarSign, BarChart3, Bell, X, Trash2, Clock, Sparkles, ChevronRight, Heart, Pencil, Plus, ListTodo, GraduationCap, Brain, ShieldAlert, CalendarCheck, GripVertical, Download, Smartphone, Globe, Sun, Moon, Eclipse, Monitor, CloudSun, Presentation, Mic, UtensilsCrossed, Dumbbell, Newspaper, Share2 } from 'lucide-react';
import { getUnreadCount } from '@/lib/notifications';
import { getCachedWeather, getTempUnit, getSavedLocation, saveLocation, cacheWeather, isCacheStale } from '@/lib/weatherStorage';
import { getWeatherIcon } from '@/lib/weatherIcons';
import { fetchWeatherData, getCurrentPosition, reverseGeocode } from '@/lib/weatherService';
import type { WeatherData, TempUnit } from '@/types/weather';
import { format, startOfWeek, addDays, isToday, isSameDay } from 'date-fns';
import { Goal, Habit, Task, FocusSession, Todo, MoodEntry, MoodType, Note, Expense, Book } from '@/types';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { Button } from '@/components/ui/button';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';
import { toast } from 'sonner';

const ALL_MODULES = [
  { id: 'goals', label: 'Goals', icon: Target, path: '/goals', color: 'hsl(245, 58%, 62%)' },
  { id: 'habits', label: 'Habits', icon: Flame, path: '/habits', color: 'hsl(38, 92%, 50%)' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, path: '/tasks', color: 'hsl(152, 69%, 45%)' },
  { id: 'notes', label: 'Notes', icon: StickyNote, path: '/notes', color: 'hsl(199, 89%, 48%)' },
  { id: 'books', label: 'Books', icon: BookOpen, path: '/books', color: 'hsl(291, 64%, 42%)' },
  { id: 'expenses', label: 'Expenses', icon: DollarSign, path: '/expenses', color: 'hsl(0, 84%, 60%)' },
  { id: 'todos', label: 'To-Do', icon: ListTodo, path: '/todos', color: 'hsl(217, 91%, 60%)' },
  { id: 'focus', label: 'Focus', icon: Timer, path: '/focus', color: 'hsl(340, 82%, 52%)' },
  { id: 'study', label: 'Study', icon: GraduationCap, path: '/study', color: 'hsl(262, 83%, 58%)' },
  { id: 'time', label: 'Time', icon: Clock, path: '/time-tracking', color: 'hsl(162, 73%, 46%)' },
  { id: 'reminders', label: 'Reminders', icon: Bell, path: '/reminders', color: 'hsl(340, 65%, 55%)' },
  { id: 'wellness', label: 'Wellness', icon: Heart, path: '/wellness', color: 'hsl(340, 82%, 52%)' },
  { id: 'meditation', label: 'Meditation', icon: Brain, path: '/wellness', color: 'hsl(280, 60%, 55%)' },
  { id: 'emergency', label: 'Emergency', icon: ShieldAlert, path: '/emergency-contacts', color: 'hsl(0, 84%, 55%)' },
  { id: 'presentations', label: 'Presentations', icon: Presentation, path: '/presentations', color: 'hsl(210, 80%, 55%)' },
  { id: 'coach', label: 'Coach', icon: Mic, path: '/presentation-coach', color: 'hsl(340, 75%, 55%)' },
  { id: 'weather', label: 'Weather', icon: CloudSun, path: '/weather', color: 'hsl(200, 75%, 50%)' },
  { id: 'nutrition', label: 'Nutrition', icon: UtensilsCrossed, path: '/nutrition', color: 'hsl(25, 95%, 53%)' },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell, path: '/fitness', color: 'hsl(150, 70%, 45%)' },
  { id: 'news', label: 'News', icon: Newspaper, path: '/news', color: 'hsl(210, 75%, 50%)' },
  { id: 'chat', label: 'Kira AI', icon: Sparkles, path: '/chat', color: 'hsl(280, 65%, 60%)' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics', color: 'hsl(210, 85%, 55%)' },
  { id: 'notifications', label: 'History', icon: Clock, path: '/notifications', color: 'hsl(140, 60%, 50%)' },
  { id: 'settings', label: 'Settings', icon: Smartphone, path: '/settings', color: 'hsl(0, 0%, 50%)' },
  { id: 'about', label: 'About', icon: Globe, path: '/about', color: 'hsl(200, 70%, 50%)' },
  { id: 'help', label: 'Support', icon: Heart, path: '/help-us-grow', color: 'hsl(340, 80%, 60%)' },
];

const DEFAULT_QUICK_IDS = ['habits', 'notes', 'expenses', 'study', 'presentations', 'news', 'nutrition', 'fitness', 'goals'];

const activityTypeConfig: Record<string, { icon: typeof Target; color: string }> = {
  goal: { icon: Target, color: 'hsl(245, 58%, 62%)' },
  habit: { icon: Flame, color: 'hsl(38, 92%, 50%)' },
  task: { icon: CheckSquare, color: 'hsl(152, 69%, 45%)' },
  note: { icon: StickyNote, color: 'hsl(199, 89%, 48%)' },
  focus: { icon: Timer, color: 'hsl(340, 82%, 52%)' },
  expense: { icon: DollarSign, color: 'hsl(0, 84%, 60%)' },
  book: { icon: BookOpen, color: 'hsl(291, 64%, 42%)' },
  todo: { icon: ListTodo, color: 'hsl(217, 91%, 60%)' },
  study: { icon: GraduationCap, color: 'hsl(262, 83%, 58%)' },
  summary: { icon: Sparkles, color: 'hsl(280, 60%, 55%)' },
  presentation: { icon: Presentation, color: 'hsl(210, 80%, 55%)' },
  coach: { icon: Mic, color: 'hsl(340, 75%, 55%)' },
  nutrition: { icon: UtensilsCrossed, color: 'hsl(25, 95%, 53%)' },
  fitness: { icon: Dumbbell, color: 'hsl(150, 70%, 45%)' },
};

function buildRecentActivities(): ActivityItem[] {
  const activities: ActivityItem[] = [];
  const goals = getLocalStorage<Goal[]>('goals', []);
  goals.forEach(g => activities.push({ id: g.id, type: 'goal', title: g.title, timestamp: g.createdAt }));
  const habits = getLocalStorage<Habit[]>('habits', []);
  habits.forEach(h => activities.push({ id: h.id, type: 'habit', title: h.title, timestamp: h.createdAt }));
  const tasks = getLocalStorage<Task[]>('tasks', []);
  tasks.forEach(t => activities.push({ id: t.id, type: 'task', title: t.title, timestamp: t.createdAt }));
  const focusSessions = getLocalStorage<FocusSession[]>('focusSessions', []);
  focusSessions.forEach(f => activities.push({ id: f.id, type: 'focus', title: `${Math.round(f.duration / 60)}min focus session`, timestamp: f.completedAt }));
  // Notes
  const notes = getLocalStorage<Note[]>('notes', []);
  notes.forEach(n => activities.push({ id: n.id, type: 'note', title: n.title, timestamp: n.updatedAt || n.createdAt }));
  // Todos
  const todos = getLocalStorage<Todo[]>('todos', []);
  todos.forEach(t => activities.push({ id: t.id, type: 'todo', title: t.text, timestamp: t.createdAt || new Date().toISOString() }));
  // Expenses
  const expenses = getLocalStorage<Expense[]>('expenses', []);
  expenses.forEach(e => activities.push({ id: e.id, type: 'expense', title: `${e.title} — $${e.amount}`, timestamp: e.createdAt }));
  // Books
  const books = getLocalStorage<Book[]>('books', []);
  books.filter(b => !b.isDefault).forEach(b => activities.push({ id: b.id, type: 'book', title: b.title, timestamp: b.createdAt }));
  // Study sessions
  const studySessions = getLocalStorage<any[]>('studySessions', []);
  studySessions.forEach(s => activities.push({ id: s.id, type: 'study', title: `${s.subject}: ${s.topic}`, timestamp: s.date || s.createdAt || new Date().toISOString() }));
  // AI Summaries
  const aiSummaries = getLocalStorage<any[]>('aiSummaries', []);
  aiSummaries.forEach(s => activities.push({ id: s.id, type: 'summary', title: s.title || 'AI Summary', timestamp: s.createdAt || new Date().toISOString() }));
  const presItems = getLocalStorage<any[]>('presentations', []);
  presItems.forEach(p => activities.push({ id: p.id, type: 'presentation' as any, title: p.title || 'Presentation', timestamp: p.createdAt || new Date().toISOString() }));
  const coachItems = getLocalStorage<any[]>('mindflow_coachReports', []);
  coachItems.forEach(r => activities.push({ id: r.id || crypto.randomUUID(), type: 'coach' as any, title: `Coach Session (${r.overallScore || 0}/100)`, timestamp: r.date || r.createdAt || new Date().toISOString() }));
  const nutritionLogs = getLocalStorage<any[]>('nutritionLogs', []);
  nutritionLogs.forEach(n => activities.push({ id: n.id, type: 'nutrition' as any, title: `${n.foodName} (${n.nutrition?.calories || 0} kcal)`, timestamp: n.createdAt || new Date().toISOString() }));
  const fitnessHistory = getLocalStorage<any[]>('fitnessHistory', []);
  fitnessHistory.forEach(s => activities.push({ id: s.id, type: 'fitness' as any, title: `Workout (${s.totalDurationMin || 0}min, ${s.caloriesBurned || 0} kcal)`, timestamp: s.completedAt || new Date().toISOString() }));
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);
}

function WeatherChip({ navigate }: { navigate: (path: string) => void }) {
  const [weather, setWeather] = useState<WeatherData | null>(getCachedWeather);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    const cached = getCachedWeather();
    if (cached && !isCacheStale()) {
      setWeather(cached);
      return;
    }
    fetchedRef.current = true;
    setLoading(true);
    const unit = getTempUnit();
    const saved = getSavedLocation();
    const unitParam = unit === 'celsius' ? 'celsius' as const : 'fahrenheit' as const;
    if (saved) {
      fetchWeatherData(saved.latitude, saved.longitude, unitParam, saved)
        .then(data => { cacheWeather(data); setWeather(data); })
        .catch(() => { if (cached) setWeather(cached); })
        .finally(() => setLoading(false));
    } else {
      getCurrentPosition()
        .then(pos => reverseGeocode(pos.coords.latitude, pos.coords.longitude))
        .then(loc => {
          saveLocation(loc);
          return fetchWeatherData(loc.latitude, loc.longitude, unitParam, loc);
        })
        .then(data => { cacheWeather(data); setWeather(data); })
        .catch(() => { if (cached) setWeather(cached); })
        .finally(() => setLoading(false));
    }
  }, []);

  const tempUnit = getTempUnit();
  const unitStr = tempUnit === 'celsius' ? '°C' : '°F';

  if (!weather) {
    return (
      <button onClick={() => navigate('/weather')} className="h-8 px-2 rounded-xl bg-secondary/50 flex items-center gap-1" data-testid="weather-chip">
        <CloudSun className={`w-3.5 h-3.5 ${loading ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
        <span className="text-[10px] font-bold text-muted-foreground">--{unitStr}</span>
      </button>
    );
  }

  const WIcon = getWeatherIcon(weather.current.weatherCode, weather.current.isDay);
  return (
    <button onClick={() => navigate('/weather')} className="h-8 px-2 rounded-xl bg-secondary/50 flex items-center gap-1" data-testid="weather-chip">
      <WIcon className="w-3.5 h-3.5 text-primary" />
      <span className="text-[10px] font-bold">{Math.round(weather.current.temperature)}{unitStr}</span>
    </button>
  );
}

function ProgressRing({ percentage, size = 72, strokeWidth = 6 }: { percentage: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="hsl(var(--secondary))" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="hsl(var(--primary))" strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold font-display">{percentage}%</span>
      </div>
    </div>
  );
}

function QuickActionReorderItem({ id, onRemove, navigate }: { id: string; onRemove: (id: string) => void; navigate: (path: string) => void }) {
  const mod = ALL_MODULES.find(m => m.id === id);
  if (!mod) return null;
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={id}
      id={id}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center gap-3 rounded-2xl p-3 bg-primary/10 border border-primary/20 active:scale-[0.98] transition-all"
    >
      <div
        onPointerDown={(e) => controls.start(e)}
        className="w-10 h-10 flex items-center justify-center text-primary/40 cursor-grab active:cursor-grabbing hover:text-primary/60 transition-colors bg-primary/5 rounded-xl flex-shrink-0"
        style={{ touchAction: 'none' }}
      >
        <GripVertical className="w-5 h-5" />
      </div>

      <button
        onClick={() => navigate(mod.path)}
        className="flex-1 flex items-center gap-3 min-w-0 text-left"
        type="button"
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: mod.color + '20' }}>
          <mod.icon className="w-4 h-4" style={{ color: mod.color }} />
        </div>
        <span className="flex-1 text-sm font-semibold truncate">{mod.label}</span>
      </button>

      <button
        onClick={() => onRemove(id)}
        className="w-9 h-9 flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
        type="button"
      >
        <X className="w-4 h-4" />
      </button>
    </Reorder.Item>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile] = useLocalStorage<UserProfile>('profile', {
    name: '', age: 0, occupation: '', goalsText: '', avatar: '😊',
  });
  const [dismissedActivities, setDismissedActivities] = useLocalStorage<string[]>('dismissedActivities', []);
  const [quickActionIds, setQuickActionIds] = useLocalStorage<string[]>('quickActionIds', DEFAULT_QUICK_IDS);
  const [editingQuickActions, setEditingQuickActions] = useState(false);
  const [themeMode, setThemeMode] = useLocalStorage<'system' | 'light' | 'dark' | 'amoled'>('themeMode', 'dark');
  const gamification = getLocalStorage<GamificationState>('gamification', { totalXp: 0, level: 1, points: 0, unlockedRewards: [] });
  const [showExportReminder, setShowExportReminder] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(getUnreadCount);

  useEffect(() => {
    const interval = setInterval(() => setUnreadNotifs(getUnreadCount()), 3000);
    const onStorage = () => setUnreadNotifs(getUnreadCount());
    window.addEventListener('storage', onStorage);
    return () => { clearInterval(interval); window.removeEventListener('storage', onStorage); };
  }, []);

  // Determine active title from unlocked rewards
  const activeTitle = gamification.unlockedRewards.includes('title_sage') ? '🧙 Sage'
    : gamification.unlockedRewards.includes('title_hero') ? '🦸 Hero' : null;

  // Apply golden theme if unlocked
  useEffect(() => {
    if (gamification.unlockedRewards.includes('theme_gold')) {
      const root = document.documentElement;
      root.style.setProperty('--primary', '38 92% 50%');
      root.style.setProperty('--accent', '38 92% 50%');
      root.style.setProperty('--ring', '38 92% 50%');
    }
  }, [gamification.unlockedRewards]);

  // Determine avatar: use unlocked icon if set
  const rewardAvatar = gamification.unlockedRewards.includes('icon_phoenix') ? '🦅'
    : gamification.unlockedRewards.includes('icon_dragon') ? '🐉' : null;

  const themeOptions: { mode: 'light' | 'dark' | 'amoled'; icon: typeof Sun; label: string }[] = [
    { mode: 'light', icon: Sun, label: 'Light' },
    { mode: 'dark', icon: Moon, label: 'Dark' },
    { mode: 'amoled', icon: Eclipse, label: 'AMOLED' },
  ];

  const applyTheme = (mode: 'system' | 'light' | 'dark' | 'amoled') => {
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

  // Live clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const quote = getDailyQuote();
  const goals = getLocalStorage<Goal[]>('goals', []);
  const habits = getLocalStorage<Habit[]>('habits', []);
  const tasks = getLocalStorage<Task[]>('tasks', []);
  const todos = getLocalStorage<Todo[]>('todos', []);
  const focusSessions = getLocalStorage<FocusSession[]>('focusSessions', []);
  const moodEntries = getLocalStorage<MoodEntry[]>('moodEntries', []);
  const notes = getLocalStorage<Note[]>('notes', []);
  const expenses = getLocalStorage<Expense[]>('expenses', []);

  // Export reminder logic
  useEffect(() => {
    const checkReminder = () => {
      const lastExport = localStorage.getItem('mindflow_lastExportDate');
      const dismissed = localStorage.getItem('mindflow_dismissedExportReminder');
      const now = Date.now();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;

      if (dismissed && now - parseInt(dismissed) < thirtyDays) return;

      if (lastExport) {
        if (now - new Date(lastExport).getTime() > thirtyDays) setShowExportReminder(true);
      } else {
        const hasData = (goals.length + tasks.length + todos.length + notes.length + expenses.length) > 15;
        if (hasData) setShowExportReminder(true);
      }
    };
    checkReminder();
  }, [goals.length, tasks.length, todos.length, notes.length, expenses.length]);

  const dismissExportReminder = () => {
    localStorage.setItem('mindflow_dismissedExportReminder', Date.now().toString());
    setShowExportReminder(false);
  };

  const MOOD_SCORES: Record<MoodType, number> = { great: 5, okay: 4, low: 2, anxious: 1, stressed: 1 };
  const MOOD_EMOJIS: Record<MoodType, string> = { great: '😊', okay: '😐', low: '😔', anxious: '😰', stressed: '😤' };
  const MOOD_COLORS: Record<MoodType, string> = {
    great: 'hsl(152, 69%, 45%)', okay: 'hsl(199, 89%, 48%)', low: 'hsl(38, 92%, 50%)',
    anxious: 'hsl(0, 84%, 60%)', stressed: 'hsl(340, 82%, 52%)',
  };

  // Last 7 days of mood data
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentMoods = moodEntries
    .filter(m => new Date(m.createdAt).getTime() >= sevenDaysAgo)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const latestMood = recentMoods.length > 0 ? recentMoods[recentMoods.length - 1] : null;
  const avgMoodScore = recentMoods.length > 0
    ? Math.round((recentMoods.reduce((s, m) => s + MOOD_SCORES[m.mood], 0) / recentMoods.length) * 10) / 10
    : null;

  const activeGoals = goals.filter(g => !g.completed).length;
  const completedGoals = goals.filter(g => g.completed).length;
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.currentStreak), 0);
  const pendingTasks = tasks.filter(t => !t.done).length;
  const doneTasks = tasks.filter(t => t.done).length;
  const focusMinutes = focusSessions.reduce((sum, s) => sum + Math.round(s.duration / 60), 0);
  const doneTodos = todos.filter(t => t.done).length;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const habitsCompletedToday = habits.filter(h => h.completionDates?.some(d => d.startsWith(todayStr))).length;
  const focusMinutesToday = focusSessions
    .filter(f => f.completedAt && f.completedAt.startsWith(todayStr))
    .reduce((sum, s) => sum + Math.round(s.duration / 60), 0);
  const studyTimeLogs = getLocalStorage<{ durationMinutes: number; date: string }[]>('studyTimeLogs', []);
  const studyMinutesToday = studyTimeLogs
    .filter(l => l.date === todayStr)
    .reduce((sum, l) => sum + l.durationMinutes, 0);
  const presentations = getLocalStorage<{ createdAt: string }[]>('presentations', []);
  const presentationsTotal = presentations.length;
  const coachReports = getLocalStorage<{ date?: string; createdAt?: string }[]>('mindflow_coachReports', []);
  const coachSessionsTotal = coachReports.length;

  // Overall progress
  const totalItems = goals.length + tasks.length + todos.length;
  const completedItems = completedGoals + doneTasks + doneTodos;
  const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const now = new Date();
  const upcomingReminders = [
    ...tasks.filter(t => !t.done && t.reminderDate && t.reminderTime && !t.alarmFired).map(t => ({
      id: t.id, title: t.title, type: 'Task' as const,
      dateTime: new Date(`${t.reminderDate}T${t.reminderTime}`),
      alarm: t.alarmEnabled,
    })),
    ...todos.filter(t => !t.done && t.reminderDate && t.reminderTime && !t.alarmFired).map(t => ({
      id: t.id, title: t.text, type: 'To-Do' as const,
      dateTime: new Date(`${t.reminderDate}T${t.reminderTime}`),
      alarm: t.alarmEnabled,
    })),
  ].filter(r => r.dateTime > now).sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime()).slice(0, 3);

  const recentActivities = buildRecentActivities().filter(a => !dismissedActivities.includes(a.id));
  const dismissActivity = (id: string) => setDismissedActivities(prev => [...prev, id]);
  const clearAllActivities = () => setDismissedActivities(prev => [...prev, ...recentActivities.map(a => a.id)]);

  const avatarIndex = avatars.indexOf(profile.avatar);
  const avatarBg = avatarColors[avatarIndex >= 0 ? avatarIndex % avatarColors.length : 0];

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const formattedDate = format(currentTime, 'EEEE, MMMM d');
  const formattedTime = format(currentTime, 'h:mm a');

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="px-4 pt-12 pb-24 space-y-5">
      <PageOnboardingTooltips pageId="dashboard" />
      {/* Greeting + Date + Time */}
      <div data-tour="greeting" className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }}
              className="w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-xl overflow-hidden"
              style={!profile.profilePicture ? { background: avatarBg + '22', border: `2px solid ${avatarBg}44` } : {}}>
              {profile.profilePicture ? (
                <img src={profile.profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                rewardAvatar || profile.avatar
              )}
            </motion.div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Welcome back</p>
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="text-base font-bold font-display truncate">{profile.name || 'MindFlow'}</h1>
                {activeTitle && <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">{activeTitle}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <WeatherChip navigate={navigate} />
            <button onClick={() => navigate('/notifications')} className="w-8 h-8 rounded-xl bg-secondary/50 flex items-center justify-center relative">
              <Bell className="w-3.5 h-3.5 text-muted-foreground" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                  {unreadNotifs > 20 ? '20+' : unreadNotifs}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5 bg-secondary/60 rounded-xl p-0.5">
            {themeOptions.map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => applyTheme(mode)}
                title={label}
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${themeMode === mode
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Icon className="w-3 h-3" />
              </button>
            ))}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold">{formattedTime}</p>
            <p className="text-[10px] text-muted-foreground">{formattedDate}</p>
          </div>
        </div>
      </div>

      {/* Monthly Export Reminder */}
      <AnimatePresence>
        {showExportReminder && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="glass rounded-2xl p-4 bg-primary/10 border border-primary/20 space-y-2 mt-2 mb-2 relative">
              <button onClick={dismissExportReminder} className="absolute top-3 right-3 text-primary/80 hover:text-primary transition-colors" aria-label="Dismiss">
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Download className="w-4 h-4" />
                <span className="text-sm">Backup Your Progress</span>
              </div>
              <p className="text-xs text-muted-foreground pr-6">
                It's been a while since your last data export (or you haven't backed up yet). Keep your MindFlow data safe!
              </p>
              <Button size="sm" onClick={() => navigate('/settings')} className="w-full text-xs font-semibold mt-2">
                Go to Settings
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Quote */}
      <motion.div data-tour="quote" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-4 glow-sm space-y-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">Quote of the Day</span>
        </div>
        <p className="text-sm italic text-foreground/90 leading-relaxed">"{quote.text}"</p>
        <p className="text-xs text-muted-foreground">— {quote.author}</p>
      </motion.div>

      {/* Daily Progress Ring */}
      <motion.div data-tour="daily-progress" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="glass rounded-2xl p-4 flex items-center gap-4">
        <ProgressRing percentage={overallProgress} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold font-display">Daily Progress</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {completedItems} of {totalItems} items completed
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            <span className="text-[10px] text-muted-foreground">
              <span className="font-semibold text-foreground">{completedGoals}</span> goals
            </span>
            <span className="text-[10px] text-muted-foreground">
              <span className="font-semibold text-foreground">{doneTasks}</span> tasks
            </span>
            <span className="text-[10px] text-muted-foreground">
              <span className="font-semibold text-foreground">{doneTodos}</span> todos
            </span>
          </div>
          {(habitsCompletedToday > 0 || focusMinutesToday > 0 || studyMinutesToday > 0 || presentationsTotal > 0 || coachSessionsTotal > 0) && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 pt-1 border-t border-border/30">
              {habitsCompletedToday > 0 && <span className="text-[10px] text-muted-foreground"><span className="font-semibold text-foreground">{habitsCompletedToday}</span> habits today</span>}
              {focusMinutesToday > 0 && <span className="text-[10px] text-muted-foreground"><span className="font-semibold text-foreground">{focusMinutesToday}m</span> focus today</span>}
              {studyMinutesToday > 0 && <span className="text-[10px] text-muted-foreground"><span className="font-semibold text-foreground">{studyMinutesToday}m</span> study today</span>}
              {presentationsTotal > 0 && <span className="text-[10px] text-muted-foreground"><span className="font-semibold text-foreground">{presentationsTotal}</span> presentations</span>}
              {coachSessionsTotal > 0 && <span className="text-[10px] text-muted-foreground"><span className="font-semibold text-foreground">{coachSessionsTotal}</span> coaching</span>}
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Active Goals', value: activeGoals, icon: Target, color: 'hsl(245, 58%, 62%)' },
          { label: 'Habits Streak', value: `${bestStreak}`, icon: Flame, color: 'hsl(38, 92%, 50%)' },
          { label: 'Pending Tasks', value: pendingTasks, icon: CheckSquare, color: 'hsl(152, 69%, 45%)' },
          { label: 'Focus Minutes', value: focusMinutes, icon: Timer, color: 'hsl(199, 89%, 48%)' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.05 }} className="glass rounded-2xl p-3 space-y-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: stat.color + '18' }}>
              <stat.icon className="w-4.5 h-4.5" style={{ color: stat.color }} />
            </div>
            <p className="text-2xl font-bold font-display">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Weekly Streak Calendar */}
      {(() => {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekActivityDates = new Set<string>();
        goals.forEach(g => weekActivityDates.add(format(new Date(g.createdAt), 'yyyy-MM-dd')));
        habits.forEach(h => {
          if (h.lastCompleted) weekActivityDates.add(format(new Date(h.lastCompleted), 'yyyy-MM-dd'));
          h.completionDates?.forEach(d => weekActivityDates.add(d.slice(0, 10)));
        });
        tasks.filter(t => t.done).forEach(t => weekActivityDates.add(format(new Date(t.createdAt), 'yyyy-MM-dd')));
        todos.filter(t => t.done).forEach(t => weekActivityDates.add(format(new Date(t.createdAt), 'yyyy-MM-dd')));
        focusSessions.forEach(f => weekActivityDates.add(format(new Date(f.completedAt), 'yyyy-MM-dd')));
        moodEntries.forEach(m => weekActivityDates.add(format(new Date(m.createdAt), 'yyyy-MM-dd')));
        let activeDayCount = 0;
        for (let i = 0; i < 7; i++) {
          if (weekActivityDates.has(format(addDays(weekStart, i), 'yyyy-MM-dd'))) activeDayCount++;
        }
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
            className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4 text-primary" /> Weekly Streak
              </h2>
              <p className="text-[10px] text-muted-foreground">{activeDayCount}/7 days active</p>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 7 }).map((_, i) => {
                const day = addDays(weekStart, i);
                const dateStr = format(day, 'yyyy-MM-dd');
                const isActive = weekActivityDates.has(dateStr);
                const todayFlag = isToday(day);
                const isFuture = day > new Date();
                return (
                  <motion.div key={i}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.18 + i * 0.04 }}
                    className="flex flex-col items-center gap-1.5">
                    <span className={`text-[10px] font-medium ${todayFlag ? 'text-primary' : 'text-muted-foreground'}`}>
                      {format(day, 'EEE')}
                    </span>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-primary/20 ring-2 ring-primary/40'
                      : todayFlag ? 'bg-secondary ring-2 ring-primary/20'
                        : isFuture ? 'bg-secondary/40' : 'bg-secondary/60'
                      }`}>
                      {isActive ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <span className={`text-xs font-medium ${isFuture ? 'text-muted-foreground/30' : 'text-muted-foreground/50'}`}>
                          {format(day, 'd')}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        );
      })()}

      {/* Mood Tracker Widget */}
      {recentMoods.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-primary" /> Mood Trends
            </h2>
            <button onClick={() => navigate('/analytics')} className="text-[10px] text-primary font-medium">View All →</button>
          </div>

          {/* Mini bar chart - last 7 entries */}
          <div className="flex items-end gap-1 h-12">
            {recentMoods.slice(-7).map((m, i) => {
              const score = MOOD_SCORES[m.mood];
              const heightPct = (score / 5) * 100;
              return (
                <motion.div key={m.id} className="flex-1 flex flex-col items-center gap-0.5"
                  initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }}>
                  <div className="w-full rounded-t-sm origin-bottom" style={{ height: `${heightPct}%`, background: MOOD_COLORS[m.mood], minHeight: 4 }} />
                </motion.div>
              );
            })}
          </div>
          <div className="flex items-end gap-1">
            {recentMoods.slice(-7).map(m => (
              <div key={m.id} className="flex-1 text-center text-[8px] text-muted-foreground">
                {format(new Date(m.createdAt), 'EEE')}
              </div>
            ))}
          </div>

          {/* Current mood + average */}
          <div className="flex items-center justify-between pt-1 border-t border-border/30">
            <div className="flex items-center gap-2">
              <span className="text-lg">{latestMood ? MOOD_EMOJIS[latestMood.mood] : '—'}</span>
              <div>
                <p className="text-xs font-medium capitalize">{latestMood?.mood || 'No data'}</p>
                <p className="text-[10px] text-muted-foreground">Current mood</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold font-display">{avgMoodScore ?? '—'}<span className="text-[10px] text-muted-foreground font-normal">/5</span></p>
              <p className="text-[10px] text-muted-foreground">7-day avg</p>
            </div>
          </div>
        </motion.div>
      )}

      {upcomingReminders.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-primary" /> Upcoming Reminders
          </h2>
          <div className="space-y-2">
            {upcomingReminders.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="glass rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-[10px] text-muted-foreground">{r.type} • {r.dateTime.toLocaleString()}</p>
                </div>
                {r.alarm && <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">🔔 Alarm</span>}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div data-tour="quick-modules">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Quick Actions</h2>
          <Button size="sm" variant="ghost" onClick={() => setEditingQuickActions(true)} className="text-[10px] text-muted-foreground h-6 px-2 gap-1">
            <Pencil className="w-3 h-3" /> Edit
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {quickActionIds.map((id, i) => {
            const mod = ALL_MODULES.find(m => m.id === id);
            if (!mod) return null;
            const Icon = mod.icon;
            return (
              <motion.button key={mod.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.04 }}
                onClick={() => navigate(mod.path)}
                className="glass rounded-2xl p-3 flex flex-col items-center gap-2 hover:bg-card/80 transition-colors active:scale-95">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: mod.color + '18' }}>
                  <Icon className="w-5 h-5" style={{ color: mod.color }} />
                </div>
                <span className="text-xs font-medium">{mod.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Edit Quick Actions Modal */}
      <AnimatePresence>
        {editingQuickActions && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setEditingQuickActions(false)}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[480px] glass-strong rounded-t-3xl p-5 pb-36 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold font-display">Edit Quick Actions</h2>
                <button onClick={() => setEditingQuickActions(false)} className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Tap to add or remove. Drag to reorder selected modules.</p>

              {/* Selected items - reorderable */}
              {quickActionIds.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Quick Actions ({quickActionIds.length}/9)</p>
                    <p className="text-[10px] text-muted-foreground">Drag to reorder · Click to navigate</p>
                  </div>
                  <Reorder.Group axis="y" values={quickActionIds} onReorder={setQuickActionIds} className="space-y-2">
                    {quickActionIds.map(id => (
                      <QuickActionReorderItem
                        key={id}
                        id={id}
                        navigate={navigate}
                        onRemove={(removedId) => setQuickActionIds(quickActionIds.filter(i => i !== removedId))}
                      />
                    ))}
                  </Reorder.Group>
                </div>
              )}

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">All App Modules</p>
                  <p className="text-[10px] text-muted-foreground">Click module to navigate</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_MODULES.map(mod => {
                    const isActive = quickActionIds.includes(mod.id);
                    return (
                      <div key={mod.id} className="relative group">
                        <button
                          onClick={() => navigate(mod.path)}
                          className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${isActive
                            ? 'bg-primary/5 border-primary/20'
                            : 'bg-card/30 border-border/40 hover:border-primary/30'
                            }`}
                        >
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: mod.color + '20' }}>
                            <mod.icon className="w-5 h-5" style={{ color: mod.color }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold truncate">{mod.label}</p>
                            <p className="text-[10px] text-muted-foreground truncate opacity-70">App Screen</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isActive) {
                              setQuickActionIds(quickActionIds.filter(i => i !== mod.id));
                            } else {
                              if (quickActionIds.length < 9) setQuickActionIds([...quickActionIds, mod.id]);
                              else toast.error('Maximum 9 quick actions allowed');
                            }
                          }}
                          className={`absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-all ${isActive
                            ? 'bg-primary text-primary-foreground rotate-0 scale-100'
                            : 'bg-secondary text-muted-foreground hover:bg-primary hover:text-primary-foreground opacity-60 hover:opacity-100 hover:scale-110'
                            }`}
                        >
                          {isActive ? <CheckSquare className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Button onClick={() => setEditingQuickActions(false)} className="w-full">Done</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics CTA */}
      <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        onClick={() => navigate('/analytics')}
        className="w-full rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-[0.98] relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(280 60% 55%))' }}>
        <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Analytics & Insights</p>
          <p className="text-[10px] text-white/70">Weekly · Monthly · Charts & scores</p>
        </div>
        <ChevronRight className="w-5 h-5 text-white/60 shrink-0" />
        <div className="absolute bottom-2 left-16 right-12 flex items-end gap-1.5 h-5 opacity-30">
          {['40%', '65%', '55%', '80%', '50%', '35%', '60%'].map((h, i) => (
            <div key={i} className="flex-1 bg-white/50 rounded-sm" style={{ height: h }} />
          ))}
        </div>
      </motion.button>

      {/* Recent Activities — at the very bottom */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary" /> Recent Activity
          </h2>
          <Button size="sm" variant="ghost" onClick={clearAllActivities} className="text-[10px] text-muted-foreground h-6 px-2 gap-1">
            <Trash2 className="w-3 h-3" /> Clear
          </Button>
        </div>
        <div className="space-y-1.5">
          <AnimatePresence>
            {recentActivities.map((activity, i) => {
              const config = activityTypeConfig[activity.type] || activityTypeConfig.task;
              const Icon = config.icon;
              return (
                <motion.div
                  key={activity.id} layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, x: -200, height: 0, marginBottom: 0 }}
                  transition={{ delay: i * 0.02 }}
                  drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.3}
                  onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 100) dismissActivity(activity.id); }}
                  style={{ touchAction: 'pan-y' }}
                  className="glass rounded-xl px-3 py-2.5 flex items-center gap-3 cursor-grab active:cursor-grabbing"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: config.color + '18' }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{activity.title}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{activity.type} • {timeAgo(activity.timestamp)}</p>
                  </div>
                  <button onClick={() => dismissActivity(activity.id)}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-secondary transition-colors shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {recentActivities.length === 0 && (
            <div className="glass rounded-xl px-4 py-6 text-center">
              <Clock className="w-6 h-6 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground/50">No recent activity yet</p>
              <p className="text-[10px] text-muted-foreground/30 mt-0.5">Your actions will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Install App Banner — only show in browser, not standalone */}
      {!window.matchMedia('(display-mode: standalone)').matches && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => navigate('/install')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Install MindFlow</p>
            <p className="text-[10px] text-muted-foreground">Add to home screen for a native app experience</p>
          </div>
          <Download className="w-4 h-4 text-muted-foreground shrink-0" />
        </motion.div>
      )}

      {/* Share App */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => {
          if (navigator.share) {
            navigator.share({
              title: 'MindFlow - Your All-In-One Companion',
              text: 'Check out MindFlow! It has 28+ modules for productivity, studying, wellness, and more. 100% Free.',
              url: 'https://nexusmindflow.vercel.app',
            }).catch(console.error);
          } else {
            navigator.clipboard.writeText('https://nexusmindflow.vercel.app');
            toast.success('Link copied to clipboard!');
          }
        }}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
          <Share2 className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Share MindFlow</p>
          <p className="text-[10px] text-muted-foreground">Invite friends to join the journey</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </motion.div>

      {/* Help Us Grow */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => navigate('/help-us-grow')}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, hsl(152 69% 45%), hsl(120 60% 40%))' }}>
          <span className="text-lg">🌱</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Help Us Grow</p>
          <p className="text-[10px] text-muted-foreground">Support development & see our roadmap</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </motion.div>

      {/* View Landing Page */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => navigate('/landing')}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/80 to-accent/80 flex items-center justify-center shrink-0">
          <Globe className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">About MindFlow</p>
          <p className="text-[10px] text-muted-foreground">See all features & share with friends</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </motion.div>
    </motion.div>
  );
}
