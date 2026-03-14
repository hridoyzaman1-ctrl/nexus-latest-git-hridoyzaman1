import { useState, useMemo, useCallback } from 'react';
import { useLocalStorage, getLocalStorage, isDemoMode } from '@/hooks/useLocalStorage';
import { Goal, Habit, Task, FocusSession, MeditationSession, Expense, Book, StudySession, StudyMaterial, StudyNote, StudyTimeLog, Todo, TimeEntry, SavedReport, MoodEntry, MoodType, UserProfile, BreathingFeedback, GamificationState, SleepEntry, WaterEntry, QuizResult } from '@/types';
import type { SavedAISummary } from '@/components/AISummarizer';
import { chatWithLongCat, ANALYTICS_SYSTEM_PROMPT, LongCatMessage } from '@/lib/longcat';
import { getAllMediaItems } from '@/lib/mediaStorage';
import { Sparkles, FileText, Loader2, Trash2, Download, TrendingUp, TrendingDown, Minus, Calendar, ChevronDown, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, subDays, startOfDay, isWithinInterval, parseISO, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';

const CHART_COLORS = [
  'hsl(245, 58%, 62%)',
  'hsl(152, 69%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(199, 89%, 48%)',
  'hsl(340, 82%, 52%)',
  'hsl(291, 64%, 42%)',
];

type PeriodPreset = '7d' | '30d' | '90d' | 'custom';

function scoreColor(s: number) {
  return s >= 80 ? 'hsl(152, 69%, 45%)' : s >= 60 ? 'hsl(199, 89%, 48%)' : s >= 40 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 84%, 60%)';
}

// Build day-by-day activity data within a date range
function buildDailyData(start: Date, end: Date, tasks: Task[], todos: Todo[], focusSessions: FocusSession[], meditationSessions: MeditationSession[], expenses: Expense[]) {
  const days: { date: string; label: string; tasks: number; focus: number; meditation: number; spending: number }[] = [];
  const dayCount = differenceInDays(end, start) + 1;

  for (let i = 0; i < dayCount; i++) {
    const d = subDays(end, dayCount - 1 - i);
    const dStr = format(d, 'yyyy-MM-dd');
    const label = dayCount <= 14 ? format(d, 'EEE') : format(d, 'MMM d');

    const tasksCompleted = tasks.filter(t => t.done && t.createdAt && format(parseISO(t.createdAt), 'yyyy-MM-dd') === dStr).length
      + todos.filter(t => t.done && t.createdAt && format(parseISO(t.createdAt), 'yyyy-MM-dd') === dStr).length;

    const focusMins = focusSessions
      .filter(f => f.completedAt && format(parseISO(f.completedAt), 'yyyy-MM-dd') === dStr)
      .reduce((s, f) => s + Math.round(f.duration / 60), 0);

    const medMins = meditationSessions
      .filter(m => m.completedAt && format(parseISO(m.completedAt), 'yyyy-MM-dd') === dStr)
      .reduce((s, m) => s + Math.round(m.duration / 60), 0);

    const daySpending = expenses
      .filter(e => e.date === dStr)
      .reduce((s, e) => s + e.amount, 0);

    days.push({ date: dStr, label, tasks: tasksCompleted, focus: focusMins, meditation: medMins, spending: daySpending });
  }
  return days;
}

// Generate encouraging insights based on data
function generateInsights(
  tasks: Task[], todos: Todo[], habits: Habit[], goals: Goal[],
  focusSessions: FocusSession[], meditationSessions: MeditationSession[],
  expenses: Expense[], start: Date, end: Date, userProfile?: UserProfile | null,
  sleepEntries?: SleepEntry[], waterEntries?: WaterEntry[]
): string[] {
  const insights: string[] = [];

  if (userProfile?.name) {
    const goalSnippet = userProfile.goalsText ? ` Your stated goal — "${userProfile.goalsText.slice(0, 60)}${userProfile.goalsText.length > 60 ? '…' : ''}" — let's see how you're tracking:` : '';
    insights.push(`👤 Here's your personalized report, ${userProfile.name}${userProfile.occupation ? ` (${userProfile.occupation})` : ''}.${goalSnippet}`);
  }

  const periodTasks = tasks.filter(t => t.createdAt && isWithinInterval(parseISO(t.createdAt), { start, end }));
  const completedTasks = periodTasks.filter(t => t.done);
  const taskRate = periodTasks.length ? Math.round((completedTasks.length / periodTasks.length) * 100) : 0;

  if (taskRate >= 80) {
    insights.push(`🎯 You completed ${taskRate}% of your tasks — outstanding discipline! Keep riding this momentum.`);
  } else if (taskRate >= 50) {
    insights.push(`📋 You completed ${completedTasks.length} of ${periodTasks.length} tasks. Consider breaking larger tasks into smaller steps — it often makes them feel more achievable.`);
  } else if (periodTasks.length > 0) {
    insights.push(`💡 Task completion was at ${taskRate}% this period. Sometimes reprioritizing and focusing on just 2-3 key tasks per day can help build momentum.`);
  }

  const activeHabits = habits.filter(h => h.currentStreak > 0);
  if (activeHabits.length > 0) {
    const bestHabit = activeHabits.reduce((best, h) => h.currentStreak > best.currentStreak ? h : best);
    insights.push(`🔥 "${bestHabit.title}" is your strongest habit with a ${bestHabit.currentStreak}-day streak. Consistency here is paying off!`);
  }
  const brokenHabits = habits.filter(h => h.longestStreak > 3 && h.currentStreak === 0);
  if (brokenHabits.length > 0) {
    insights.push(`🌱 ${brokenHabits.length} habit${brokenHabits.length > 1 ? 's' : ''} could use a fresh start. Even one small step today restarts the chain.`);
  }

  const periodFocus = focusSessions.filter(f => f.completedAt && isWithinInterval(parseISO(f.completedAt), { start, end }));
  const totalFocusMin = periodFocus.reduce((s, f) => s + Math.round(f.duration / 60), 0);
  if (totalFocusMin > 120) {
    insights.push(`⏱️ ${totalFocusMin} minutes of deep focus this period — that's impressive! Your ability to concentrate is a real strength.`);
  } else if (totalFocusMin > 0) {
    insights.push(`⏱️ You logged ${totalFocusMin} minutes of focus time. Even short, consistent sessions build deep work capacity over time.`);
  }

  const periodMed = meditationSessions.filter(m => m.completedAt && isWithinInterval(parseISO(m.completedAt), { start, end }));
  if (periodMed.length > 0) {
    const medMins = periodMed.reduce((s, m) => s + Math.round(m.duration / 60), 0);
    insights.push(`🧘 ${medMins} minutes of meditation across ${periodMed.length} sessions. Your mind will thank you for this investment.`);
  } else {
    insights.push(`🧘 No meditation sessions this period — even 3 minutes of quiet breathing can help reset your day. Worth trying!`);
  }

  const periodExpenses = expenses.filter(e => e.date && isWithinInterval(parseISO(e.date), { start, end }));
  if (periodExpenses.length > 0) {
    const total = periodExpenses.reduce((s, e) => s + e.amount, 0);
    const topCategory = Object.entries(
      periodExpenses.reduce<Record<string, number>>((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {})
    ).sort((a, b) => b[1] - a[1])[0];
    insights.push(`💰 You spent $${total.toFixed(0)} this period${topCategory ? `, mostly on ${topCategory[0]} ($${topCategory[1].toFixed(0)})` : ''}. Tracking is the first step to smart spending!`);
  }

  const progressingGoals = goals.filter(g => !g.completed && g.progress > 0);
  if (progressingGoals.length > 0) {
    const best = progressingGoals.reduce((b, g) => g.progress > b.progress ? g : b);
    insights.push(`🏆 "${best.title}" is at ${best.progress}% — you're getting closer! Keep the momentum going.`);
  }

  // Sleep insights
  if (sleepEntries && sleepEntries.length > 0) {
    const periodSleep = sleepEntries.filter(s => { try { return isWithinInterval(parseISO(s.createdAt), { start, end }); } catch { return false; } });
    if (periodSleep.length > 0) {
      const avgHours = periodSleep.reduce((s, e) => {
        const [bh, bm] = e.bedtime.split(':').map(Number);
        const [wh, wm] = e.wakeTime.split(':').map(Number);
        let bed = bh * 60 + bm, wake = wh * 60 + wm;
        if (wake <= bed) wake += 24 * 60;
        return s + (wake - bed) / 60;
      }, 0) / periodSleep.length;
      const avgQ = periodSleep.reduce((s, e) => s + e.quality, 0) / periodSleep.length;
      if (avgHours >= 7 && avgQ >= 4) {
        insights.push(`😴 Excellent sleep! ${avgHours.toFixed(1)}h average with ${avgQ.toFixed(1)}/5 quality. Great rest = great performance.`);
      } else if (avgHours < 6) {
        insights.push(`⚠️ Only ${avgHours.toFixed(1)}h average sleep — aim for 7-9h. Poor sleep impacts focus, mood, and health.`);
      } else {
        insights.push(`🛌 ${avgHours.toFixed(1)}h avg sleep, ${avgQ.toFixed(1)}/5 quality across ${periodSleep.length} logged nights. ${avgQ < 3 ? 'Try improving your bedtime routine.' : 'Keep it up!'}`);
      }
    }
  }

  // Water intake insights
  if (waterEntries && waterEntries.length > 0) {
    const periodWater = waterEntries.filter(w => { try { return isWithinInterval(parseISO(w.createdAt), { start, end }); } catch { return false; } });
    if (periodWater.length > 0) {
      const dayTotals: Record<string, number> = {};
      periodWater.forEach(w => { dayTotals[w.date] = (dayTotals[w.date] || 0) + w.amount; });
      const days = Object.values(dayTotals);
      const avgMl = days.reduce((s, d) => s + d, 0) / days.length;
      const goal = 2500;
      const daysMetGoal = days.filter(d => d >= goal).length;
      if (avgMl >= goal) {
        insights.push(`💧 Hydration on point! Averaging ${(avgMl / 1000).toFixed(1)}L/day with ${daysMetGoal} days meeting your goal. Your body is thanking you!`);
      } else if (avgMl >= goal * 0.6) {
        insights.push(`💧 Water intake at ${(avgMl / 1000).toFixed(1)}L/day — getting there! Try keeping a bottle nearby as a visual reminder. Small sips throughout the day add up fast.`);
      } else {
        insights.push(`💧 Only ${(avgMl / 1000).toFixed(1)}L/day average. Staying hydrated boosts focus, mood, and energy. Even one extra glass per meal makes a noticeable difference!`);
      }
    }
  }

  // Habit streak insights
  const bestStreak = habits.reduce((best, h) => h.longestStreak > best.longestStreak ? h : best, { longestStreak: 0, title: '' } as Habit);
  if (bestStreak.longestStreak >= 7) {
    insights.push(`🏆 Your longest habit streak is ${bestStreak.longestStreak} days on "${bestStreak.title}" — that's real commitment! Streaks build identity: you're becoming someone who does this consistently.`);
  }

  return insights;
}

// Detect if user is an academic student based on study planner categories
function isAcademicUser(sessions: StudySession[]): boolean {
  const academicCategories = ['Class', 'School', 'University', 'Certification'];
  return sessions.some(s => s.studyCategory && academicCategories.includes(s.studyCategory));
}

// Generate study-specific insights
function generateStudyInsights(
  sessions: StudySession[], timeLogs: StudyTimeLog[], materials: StudyMaterial[], notes: StudyNote[],
  start: Date, end: Date, quizHistory?: QuizResult[], completedMaterials?: string[]
): string[] {
  const insights: string[] = [];
  if (sessions.length === 0) return insights;

  const totalStudyMin = timeLogs.reduce((s, l) => s + l.durationMinutes, 0);
  const completedSessions = sessions.filter(s => s.completed).length;
  const completionRate = sessions.length ? Math.round((completedSessions / sessions.length) * 100) : 0;

  if (totalStudyMin > 0) {
    const hours = Math.floor(totalStudyMin / 60);
    const mins = totalStudyMin % 60;
    insights.push(`📚 You've logged ${hours}h ${mins}m of study time across ${timeLogs.length} sessions. ${totalStudyMin > 300 ? 'Impressive dedication!' : 'Every minute counts — keep building the habit.'}`);
  }

  if (completionRate >= 80) {
    insights.push(`🎓 ${completionRate}% session completion rate — outstanding academic discipline!`);
  } else if (completionRate >= 50) {
    insights.push(`📋 ${completedSessions}/${sessions.length} study sessions completed. Try breaking longer sessions into focused 25-min blocks.`);
  } else if (sessions.length > 0) {
    insights.push(`📋 Study completion at ${completionRate}%. Start with your easiest subject to build momentum.`);
  }

  // Materials distribution
  const videoCount = materials.filter(m => m.category === 'video').length;
  const docCount = materials.filter(m => m.category !== 'video').length;
  if (materials.length > 0) {
    insights.push(`📁 ${materials.length} study materials organized — ${docCount} documents, ${videoCount} videos${notes.length > 0 ? `, ${notes.length} notes` : ''}.`);
  }

  // Subject time distribution
  const subjectTime: Record<string, number> = {};
  timeLogs.forEach(l => { subjectTime[l.subject] = (subjectTime[l.subject] || 0) + l.durationMinutes; });
  const subjects = Object.entries(subjectTime).sort((a, b) => b[1] - a[1]);
  if (subjects.length >= 2) {
    const top = subjects[0];
    const bottom = subjects[subjects.length - 1];
    if (top[1] > bottom[1] * 3) {
      insights.push(`⚠️ Study time is heavily skewed toward "${top[0]}" (${top[1]}min) vs "${bottom[0]}" (${bottom[1]}min). Consider balancing your study schedule.`);
    }
  }

  // Quiz insights
  if (quizHistory && quizHistory.length > 0) {
    const gradable = quizHistory.filter(q => q.isGradable);
    if (gradable.length > 0) {
      const avgPct = Math.round(gradable.reduce((s, q) => s + (q.obtainedMarks / q.totalMarks) * 100, 0) / gradable.length);
      const bestQ = gradable.reduce((b, q) => (q.obtainedMarks / q.totalMarks) > (b.obtainedMarks / b.totalMarks) ? q : b);
      const bestPct = Math.round((bestQ.obtainedMarks / bestQ.totalMarks) * 100);
      if (avgPct >= 80) {
        insights.push(`🏆 Quiz performance is stellar! Averaging ${avgPct}% across ${gradable.length} quizzes. Best: ${bestPct}% in ${bestQ.subject}. Keep this up!`);
      } else if (avgPct >= 50) {
        insights.push(`📝 Quiz average: ${avgPct}% across ${gradable.length} quizzes. Good foundation — reviewing weak areas before retaking can boost scores significantly.`);
      } else {
        insights.push(`📝 ${gradable.length} quizzes taken with ${avgPct}% average. The topics just need a bit more review — try re-reading the material before your next attempt. You're building knowledge with each try!`);
      }
    }
    insights.push(`🧠 ${quizHistory.length} total quizzes generated (${[...new Set(quizHistory.map(q => q.quizType))].join(', ')})`);
  }

  // Completed materials progress
  if (completedMaterials && completedMaterials.length > 0) {
    const totalReadable = materials.filter(m => !['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(m.fileType)).length;
    const pct = totalReadable > 0 ? Math.round((completedMaterials.length / totalReadable) * 100) : 0;
    insights.push(`✅ ${completedMaterials.length} materials marked as completed${totalReadable > 0 ? ` (${pct}% of readable materials)` : ''}. Great progress!`);
  }

  // AI summaries insight
  const aiSummariesAll = getLocalStorage<SavedAISummary[]>('aiSummaries', []);
  if (aiSummariesAll.length > 0) {
    const modes: Record<string, number> = {};
    aiSummariesAll.forEach(s => { modes[s.mode] = (modes[s.mode] || 0) + 1; });
    const modeStr = Object.entries(modes).map(([k, v]) => `${v} ${k}`).join(', ');
    insights.push(`✨ ${aiSummariesAll.length} AI summaries/explainers saved (${modeStr}). Great use of AI-assisted learning!`);
  }

  // Media generation insight
  const allMedia = getAllMediaItems();
  if (allMedia.length > 0) {
    const audioCount = allMedia.filter(m => m.mode !== 'video').length;
    const videoCount = allMedia.filter(m => m.mode === 'video').length;
    const moduleSet = [...new Set(allMedia.map(m => m.sourceModule))];
    const parts = [];
    if (audioCount > 0) parts.push(`${audioCount} audio`);
    if (videoCount > 0) parts.push(`${videoCount} video`);
    insights.push(`🎧 ${allMedia.length} media items generated (${parts.join(', ')}) from ${moduleSet.length} module${moduleSet.length > 1 ? 's' : ''}. Creative content creation in action!`);
  }

  return insights;
}

export default function Analytics() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodPreset>('7d');
  const [customStart, setCustomStart] = useState<Date | undefined>(subDays(new Date(), 30));
  const [customEnd, setCustomEnd] = useState<Date | undefined>(new Date());
  const [savedReports, setSavedReports] = useLocalStorage<SavedReport[]>('analyticsReports', []);
  const [showReports, setShowReports] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [activeChart, setActiveChart] = useState<'activity' | 'focus' | 'spending' | 'mood' | 'sleep' | 'water' | 'correlation' | 'study'>('activity');

  // Load all data
  const goals = getLocalStorage<Goal[]>('goals', []);
  const habits = getLocalStorage<Habit[]>('habits', []);
  const tasks = getLocalStorage<Task[]>('tasks', []);
  const todos = getLocalStorage<Todo[]>('todos', []);
  const focusSessions = getLocalStorage<FocusSession[]>('focusSessions', []);
  const meditationSessions = getLocalStorage<MeditationSession[]>('meditationSessions', []);
  const expenses = getLocalStorage<Expense[]>('expenses', []);
  const books = getLocalStorage<Book[]>('books', []);
  const studySessions = getLocalStorage<StudySession[]>('studySessions', []);
  const studyMaterials = getLocalStorage<StudyMaterial[]>('studyMaterials', []);
  const studyNotes = getLocalStorage<StudyNote[]>('studyNotes', []);
  const studyTimeLogs = getLocalStorage<StudyTimeLog[]>('studyTimeLogs', []);
  const timeEntries = getLocalStorage<TimeEntry[]>('timeEntries', []);
  const moodEntries = getLocalStorage<MoodEntry[]>('moodEntries', []);
  const userProfile = getLocalStorage<UserProfile | null>('profile', null);
  const breathingFeedback = getLocalStorage<BreathingFeedback[]>('breathingFeedback', []);
  const gamification = getLocalStorage<GamificationState>('gamification', { totalXp: 0, level: 1, points: 0, unlockedRewards: [] });
  const sleepEntries = getLocalStorage<SleepEntry[]>('sleepEntries', []);
  const waterEntries = getLocalStorage<WaterEntry[]>('waterEntries', []);
  const quizHistory = getLocalStorage<QuizResult[]>('studyQuizHistory', []);
  const completedMaterials = getLocalStorage<string[]>('studyCompletedMaterials', []);
  const aiSummaries = getLocalStorage<SavedAISummary[]>('aiSummaries', []);
  // Coach data for AI report
  const coachReports = getLocalStorage<any[]>('coachReports', []);
  // Presentation Generator data for AI report
  const presentations = getLocalStorage<any[]>('presentations', []);
  // Wellness data for AI report
  const routines = getLocalStorage<any[]>('routines', []);
  const anxietyLogs = getLocalStorage<any[]>('anxietyLogs', []);
  const groundingHistory = getLocalStorage<any[]>('groundingHistory', []);
  const reassuranceJournal = getLocalStorage<any[]>('reassuranceJournal', []);

  const { start, end, periodLabel } = useMemo(() => {
    const now = new Date();
    switch (period) {
      case '7d': return { start: startOfDay(subDays(now, 6)), end: now, periodLabel: 'Last 7 Days' };
      case '30d': return { start: startOfDay(subDays(now, 29)), end: now, periodLabel: 'Last 30 Days' };
      case '90d': return { start: startOfDay(subDays(now, 89)), end: now, periodLabel: 'Last 90 Days' };
      case 'custom': return {
        start: customStart ? startOfDay(customStart) : startOfDay(subDays(now, 6)),
        end: customEnd || now,
        periodLabel: customStart && customEnd ? `${format(customStart, 'MMM d')} — ${format(customEnd, 'MMM d')}` : 'Custom Range',
      };
    }
  }, [period, customStart, customEnd]);

  const dailyData = useMemo(() =>
    buildDailyData(start, end, tasks, todos, focusSessions, meditationSessions, expenses),
    [start, end, tasks, todos, focusSessions, meditationSessions, expenses]
  );

  // Period-scoped scores
  const periodTasks = tasks.filter(t => t.createdAt && isWithinInterval(parseISO(t.createdAt), { start, end }));
  const tasksDone = periodTasks.filter(t => t.done).length;
  const taskRate = periodTasks.length ? Math.round((tasksDone / periodTasks.length) * 100) : 0;
  const avgGoalProgress = goals.length ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0;
  const periodFocusMin = focusSessions
    .filter(f => f.completedAt && isWithinInterval(parseISO(f.completedAt), { start, end }))
    .reduce((s, f) => s + Math.round(f.duration / 60), 0);
  const periodMedMin = meditationSessions
    .filter(m => m.completedAt && isWithinInterval(parseISO(m.completedAt), { start, end }))
    .reduce((s, m) => s + Math.round((Number(m.duration) || 0) / 60), 0);
  const activeHabits = habits.filter(h => h.currentStreak > 0).length;
  const consistencyScore = habits.length ? Math.round((activeHabits / habits.length) * 100) : 0;
  const productivityScore = Math.min(100, Math.round(taskRate * 0.4 + avgGoalProgress * 0.3 + Math.min(100, periodFocusMin) * 0.3));
  const wellnessScore = Math.min(100, Math.round(Math.min(100, periodMedMin * 2) * 0.5 + 50 * 0.5));

  // Expense breakdown by category
  const expenseByCategory = useMemo(() => {
    const periodExp = expenses.filter(e => e.date && isWithinInterval(parseISO(e.date), { start, end }));
    const cats: Record<string, number> = {};
    try {
      periodExp.forEach(e => {
        if (!e.category) return;
        cats[e.category] = (cats[e.category] || 0) + (Number(e.amount) || 0);
      });
    } catch { }
    return Object.entries(cats).map(([name, value], i) => ({ name, value: Math.round(value * 100) / 100, color: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [expenses, start, end]);

  // Sleep period data
  const periodSleep = sleepEntries.filter(s => { try { return isWithinInterval(parseISO(s.createdAt), { start, end }); } catch { return false; } });
  const avgSleepHours = periodSleep.length > 0 ? periodSleep.reduce((s, e) => {
    try {
      if (!e.bedtime || !e.wakeTime || !e.bedtime.includes(':') || !e.wakeTime.includes(':')) return s + 8; // Default 8h for malformed data
      const [bh, bm] = e.bedtime.split(':').map(Number);
      const [wh, wm] = e.wakeTime.split(':').map(Number);
      if (isNaN(bh) || isNaN(bm) || isNaN(wh) || isNaN(wm)) return s + 8;
      let bed = bh * 60 + bm, wake = wh * 60 + wm;
      if (wake <= bed) wake += 24 * 60;
      return s + (wake - bed) / 60;
    } catch { return s + 8; }
  }, 0) / periodSleep.length : 0;
  const sleepScore = periodSleep.length > 0 ? Math.min(100, Math.max(0, Math.round((avgSleepHours / 8) * 50 + (periodSleep.reduce((s, e) => s + (Number(e.quality) || 0), 0) / periodSleep.length / 5) * 50))) : 0;
  // Water data
  const periodWater = waterEntries.filter(w => { try { return isWithinInterval(parseISO(w.createdAt), { start, end }); } catch { return false; } });
  const waterDayTotals: Record<string, number> = {};
  periodWater.forEach(w => { waterDayTotals[w.date] = (waterDayTotals[w.date] || 0) + w.amount; });
  const waterDays = Object.values(waterDayTotals);
  const avgWaterMl = waterDays.length > 0 ? waterDays.reduce((s, d) => s + d, 0) / waterDays.length : 0;
  const waterScore = waterDays.length > 0 ? Math.min(100, Math.round((avgWaterMl / 2500) * 100)) : 0;

  const wellnessScoreWithSleep = (() => {
    let score = Math.min(100, periodMedMin * 2) * 0.3;
    let weights = 0.3;
    if (periodSleep.length > 0) { score += sleepScore * 0.3; weights += 0.3; }
    if (waterDays.length > 0) { score += waterScore * 0.2; weights += 0.2; }
    score += 20; weights += 0.2;
    return Math.min(100, Math.round(score / weights * (weights)));
  })();

  const insights = useMemo(() => {
    const base = generateInsights(tasks, todos, habits, goals, focusSessions, meditationSessions, expenses, start, end, userProfile, sleepEntries, waterEntries);
    const studyIns = generateStudyInsights(studySessions, studyTimeLogs, studyMaterials, studyNotes, start, end, quizHistory, completedMaterials);
    const extra: string[] = [];
    if (presentations.length > 0) {
      const recentPres = presentations.filter((p: any) => { try { return isWithinInterval(parseISO(p.createdAt), { start, end }); } catch { return false; } });
      if (recentPres.length > 0) {
        const totalSlides = recentPres.reduce((s: number, p: any) => s + (p.slides?.length || 0), 0);
        extra.push(`🎨 You created ${recentPres.length} presentation${recentPres.length > 1 ? 's' : ''} with ${totalSlides} slides this period. Great preparation work!`);
      }
    }
    if (coachReports.length > 0) {
      const recentCoach = coachReports.filter((r: any) => { try { return isWithinInterval(parseISO(r.date ?? r.createdAt), { start, end }); } catch { return false; } });
      if (recentCoach.length > 0) {
        const avgScore = Math.round(recentCoach.reduce((s: number, r: any) => s + (r.overallScore || 0), 0) / recentCoach.length);
        extra.push(`🎤 ${recentCoach.length} coaching session${recentCoach.length > 1 ? 's' : ''} this period, averaging ${avgScore}/100. ${avgScore >= 70 ? 'Strong performance!' : 'Keep practicing — every session builds confidence.'}`);
      }
    }
    return [...base, ...studyIns, ...extra];
  }, [tasks, todos, habits, goals, focusSessions, meditationSessions, expenses, start, end, userProfile, sleepEntries, waterEntries, studySessions, studyTimeLogs, studyMaterials, studyNotes, quizHistory, completedMaterials, presentations, coachReports]);

  const saveReport = useCallback(() => {
    const report: SavedReport = {
      id: crypto.randomUUID(),
      title: `Report — ${periodLabel}`,
      period: periodLabel,
      scores: { productivity: productivityScore, wellness: wellnessScore, consistency: consistencyScore },
      insights: insights.slice(0, 5),
      createdAt: new Date().toISOString(),
    };
    setSavedReports(prev => [report, ...prev]);
    import('sonner').then(({ toast }) => toast.success('Report saved'));
  }, [periodLabel, productivityScore, wellnessScore, consistencyScore, insights, setSavedReports]);

  const deleteReport = (id: string) => setSavedReports(prev => prev.filter(r => r.id !== id));

  const generateAIReport = async () => {
    if (isDemoMode) { setReportLoading(false); return; }
    setReportLoading(true);
    setAiReport(null);
    const profileContext = userProfile
      ? `User Profile:\n- Name: ${userProfile.name}\n- Age: ${userProfile.age}\n- Occupation: ${userProfile.occupation}\n- Personal Goals: ${userProfile.goalsText}\n\n`
      : '';
    const breathingSessions = breathingFeedback.filter(b => { try { return isWithinInterval(parseISO(b.createdAt), { start, end }); } catch { return false; } });
    const avgBreathingImprovement = breathingSessions.length > 0 ? (breathingSessions.reduce((s, b) => s + (b.calmnessAfter - b.calmnessBefore), 0) / breathingSessions.length).toFixed(1) : 'N/A';
    const totalTimeTracked = timeEntries.reduce((s, e) => s + e.duration, 0);
    const billableTime = timeEntries.filter(e => e.billable).reduce((s, e) => s + e.duration, 0);
    const sleepSummary = periodSleep.length > 0 ? `\nSleep: ${periodSleep.length} nights logged, avg ${avgSleepHours.toFixed(1)}h, avg quality ${(periodSleep.reduce((s, e) => s + e.quality, 0) / periodSleep.length).toFixed(1)}/5` : '\nSleep: No data';
    const waterSummary = waterDays.length > 0 ? `\nWater: avg ${(avgWaterMl / 1000).toFixed(1)}L/day across ${waterDays.length} days tracked` : '\nWater: No data';
    const bestHabitStreak = habits.reduce((best, h) => h.longestStreak > best ? h.longestStreak : best, 0);
    const habitStreakSummary = bestHabitStreak > 0 ? `\nBest Habit Streak: ${bestHabitStreak} days` : '';

    // Study planner data
    const totalStudyMin = studyTimeLogs.reduce((s, l) => s + l.durationMinutes, 0);
    const studyCompleted = studySessions.filter(s => s.completed).length;
    const isAcademic = isAcademicUser(studySessions);
    const studyCategories = [...new Set(studySessions.map(s => s.studyCategory).filter(Boolean))];
    const subjectTime: Record<string, number> = {};
    studyTimeLogs.forEach(l => { subjectTime[l.subject] = (subjectTime[l.subject] || 0) + l.durationMinutes; });
    // Quiz performance data
    const gradableQuizzes = quizHistory.filter(q => q.isGradable);
    const quizAvgScore = gradableQuizzes.length > 0
      ? Math.round(gradableQuizzes.reduce((s, q) => s + (q.obtainedMarks / q.totalMarks) * 100, 0) / gradableQuizzes.length)
      : 0;
    const quizSubjects = [...new Set(quizHistory.map(q => q.subject))];
    const completedMaterialCount = completedMaterials.length;
    const totalReadable = studyMaterials.filter(m => !['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(m.fileType)).length;

    const quizSummary = quizHistory.length > 0
      ? `\nQuiz Performance: ${gradableQuizzes.length} graded quizzes taken, avg score ${quizAvgScore}%, subjects: ${quizSubjects.join(', ')}\nBest quiz: ${gradableQuizzes.length > 0 ? `${Math.max(...gradableQuizzes.map(q => Math.round((q.obtainedMarks / q.totalMarks) * 100)))}%` : 'N/A'}\nWorst quiz: ${gradableQuizzes.length > 0 ? `${Math.min(...gradableQuizzes.map(q => Math.round((q.obtainedMarks / q.totalMarks) * 100)))}%` : 'N/A'}\nQuiz types used: ${[...new Set(quizHistory.map(q => q.quizType))].join(', ')}\nMaterials completed: ${completedMaterialCount}/${totalReadable} readable materials marked as done`
      : '';

    const studySummary = studySessions.length > 0
      ? `\n\nSTUDY PLANNER DATA:\nSessions: ${studyCompleted}/${studySessions.length} completed\nTotal Study Time: ${Math.floor(totalStudyMin / 60)}h${totalStudyMin % 60}m\nMaterials: ${studyMaterials.length} (Books: ${studyMaterials.filter(m => m.category === 'book').length}, Slides: ${studyMaterials.filter(m => m.category === 'lecture-slides').length}, Videos: ${studyMaterials.filter(m => m.category === 'video').length})\nNotes: ${studyNotes.length}\nAI Summaries & Explainers: ${aiSummaries.length} saved (modes used: ${[...new Set(aiSummaries.map(s => s.mode))].join(', ') || 'none'})\nCategories: ${studyCategories.join(', ') || 'None set'}\nSubject breakdown: ${Object.entries(subjectTime).map(([k, v]) => `${k}:${v}min`).join(', ') || 'No time logged'}${quizSummary}\nUser type: ${isAcademic ? 'ACADEMIC STUDENT (provide detailed constructive academic feedback including quiz performance analysis, study strategies based on quiz scores, spaced repetition suggestions, time distribution advice across subjects, exam preparation tips. Analyze quiz performance trends, identify weak subjects needing more review, and recommend balanced study schedules. For OCD/anxiety students: provide calming study strategies, remind them perfection isn\'t required, suggest breaks and manageable chunks.)' : 'CASUAL LEARNER (keep study feedback casual and encouraging, no academic pressure or formal study advice)'}`
      : '';

    // Wellness data
    const routinesDone = routines.filter((r: any) => r.steps?.every((s: any) => s.done)).length;
    const wellnessExtra = [
      routines.length > 0 ? `\nRoutines: ${routinesDone}/${routines.length} completed today` : '',
      anxietyLogs.length > 0 ? `\nAnxiety Logs: ${anxietyLogs.length} entries, avg level ${(anxietyLogs.reduce((s: number, l: any) => s + (l.level || 0), 0) / anxietyLogs.length).toFixed(1)}/10` : '',
      groundingHistory.length > 0 ? `\nGrounding Exercises: ${groundingHistory.length} completed` : '',
      reassuranceJournal.length > 0 ? `\nReassurance Journal: ${reassuranceJournal.length} entries` : '',
    ].join('');

    // Presentation Generator data
    const presentationSummary = presentations.length > 0
      ? (() => {
        const purposes = [...new Set(presentations.map((p: any) => p.settings?.purpose).filter(Boolean))].join(', ');
        const totalSlides = presentations.reduce((s: number, p: any) => s + (p.slides?.length || 0), 0);
        const themes = [...new Set(presentations.map((p: any) => p.themeId).filter(Boolean))];
        const recentCount = presentations.filter((p: any) => {
          try { return isWithinInterval(parseISO(p.createdAt), { start, end }); } catch { return false; }
        }).length;
        const sources = [...new Set(presentations.map((p: any) => p.sourceType).filter(Boolean))].join(', ');
        return `\n\nPRESENTATION GENERATOR DATA:\nTotal presentations: ${presentations.length} (${recentCount} this period)\nTotal slides created: ${totalSlides}\nPurposes: ${purposes || 'Not set'}\nSource types: ${sources || 'topic'}\nThemes used: ${themes.length} unique themes`;
      })()
      : '';

    // Presentation Coach data (period-scoped)
    const periodCoachReports = coachReports.filter((r: any) => { try { return isWithinInterval(parseISO(r.date ?? r.createdAt), { start, end }); } catch { return false; } });
    const coachSummary = periodCoachReports.length > 0
      ? (() => {
        const avgScore = Math.round(periodCoachReports.reduce((s: number, r: any) => s + (r.overallScore || 0), 0) / periodCoachReports.length);
        const bestScore = Math.max(...periodCoachReports.map((r: any) => r.overallScore || 0));
        const totalPracticeSec = periodCoachReports.reduce((s: number, r: any) => s + (r.duration || 0), 0);
        const types = [...new Set(periodCoachReports.map((r: any) => r.sessionType))].join(', ');
        const scoreFields = ['posture', 'eyeContact', 'gestureControl', 'speechDelivery', 'speechPace', 'timeManagement', 'overallPresence'];
        const avgByField: Record<string, number> = {};
        scoreFields.forEach(f => {
          const vals = periodCoachReports.map((r: any) => r.scores?.[f]?.score).filter((v: any) => typeof v === 'number');
          if (vals.length) avgByField[f] = Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
        });
        const fieldStr = Object.entries(avgByField).map(([k, v]) => `${k}:${v}`).join(', ');
        const scriptUsed = periodCoachReports.filter((r: any) => r.scriptUsed).length;
        const questionUsed = periodCoachReports.filter((r: any) => r.questionModeUsed).length;
        return `\n\nPRESENTATION COACH DATA (this period):\nSessions: ${periodCoachReports.length} (${coachReports.length} all-time), Avg score: ${avgScore}/100, Best: ${bestScore}/100\nTotal practice: ${Math.floor(totalPracticeSec / 60)}m\nTypes: ${types}\nAvg by category: ${fieldStr}\nScript used: ${scriptUsed}/${periodCoachReports.length}, Question mode: ${questionUsed}/${periodCoachReports.length}`;
      })()
      : '';

    const notesAll = getLocalStorage<any[]>('notes', []);
    const notesWithReminders = notesAll.filter((n: any) => n.reminderDate).length;
    const booksAll = getLocalStorage<any[]>('books', []);
    const booksReading = booksAll.filter((b: any) => b.currentPage > 0).length;
    const notesSummary = notesAll.length > 0 ? `\nNotes: ${notesAll.length} total${notesWithReminders > 0 ? `, ${notesWithReminders} with reminders` : ''}` : '';
    const booksSummary = booksAll.length > 0 ? `\nBooks: ${booksAll.length} in library, ${booksReading} in progress` : '';

    // Media generation data
    const allMediaItems = getAllMediaItems();
    const mediaSummary = allMediaItems.length > 0
      ? (() => {
        const byModule: Record<string, number> = {};
        allMediaItems.forEach(m => { byModule[m.sourceModule] = (byModule[m.sourceModule] || 0) + 1; });
        const byMode: Record<string, number> = {};
        allMediaItems.forEach(m => { byMode[m.mode] = (byMode[m.mode] || 0) + 1; });
        const moduleStr = Object.entries(byModule).map(([k, v]) => `${k}:${v}`).join(', ');
        const modeStr = Object.entries(byMode).map(([k, v]) => `${v} ${k}`).join(', ');
        return `\n\nMEDIA GENERATION DATA:\nTotal items: ${allMediaItems.length}\nBy source: ${moduleStr}\nBy mode: ${modeStr}\nAudio items: ${allMediaItems.filter(m => m.mode !== 'video').length}, Video items: ${allMediaItems.filter(m => m.mode === 'video').length}`;
      })()
      : '';

    const nutritionLogs = getLocalStorage<any[]>('nutritionLogs', []);
    const periodNutritionLogs = nutritionLogs.filter((l: any) => { try { return isWithinInterval(parseISO(l.date), { start, end }); } catch { return false; } });
    const nutritionSummary = periodNutritionLogs.length > 0
      ? (() => {
        const days = new Set(periodNutritionLogs.map((l: any) => l.date)).size;
        const totals = periodNutritionLogs.reduce((a: any, l: any) => ({
          cal: a.cal + (l.nutrition?.calories || 0),
          protein: a.protein + (l.nutrition?.protein || 0),
          carbs: a.carbs + (l.nutrition?.carbs || 0),
          fat: a.fat + (l.nutrition?.fat || 0),
        }), { cal: 0, protein: 0, carbs: 0, fat: 0 });
        const mealTypes = periodNutritionLogs.reduce((a: any, l: any) => { a[l.mealType] = (a[l.mealType] || 0) + 1; return a; }, {} as Record<string, number>);
        return `\n\nNUTRITION & DIET DATA:\nMeals logged: ${periodNutritionLogs.length} over ${days} days\nAvg daily calories: ${Math.round(totals.cal / days)} kcal\nAvg daily protein: ${Math.round(totals.protein / days)}g, carbs: ${Math.round(totals.carbs / days)}g, fat: ${Math.round(totals.fat / days)}g\nMeal distribution: ${Object.entries(mealTypes).map(([k, v]) => `${k}:${v}`).join(', ')}`;
      })()
      : '';

    const fitnessHistory = getLocalStorage<any[]>('fitnessHistory', []);
    const periodFitness = fitnessHistory.filter((s: any) => { try { return isWithinInterval(parseISO(s.completedAt?.split('T')[0] || ''), { start, end }); } catch { return false; } });
    const fitnessSummary = periodFitness.length > 0
      ? (() => {
        const totalMin = periodFitness.reduce((a: number, s: any) => a + (s.totalDurationMin || 0), 0);
        const totalCal = periodFitness.reduce((a: number, s: any) => a + (s.caloriesBurned || 0), 0);
        const fitnessProfile = getLocalStorage<any>('fitnessProfile', null);
        const bmiInfo = fitnessProfile ? `BMI: ${fitnessProfile.bmi} (${fitnessProfile.bmiCategory})` : '';
        return `\n\nFITNESS & EXERCISE DATA:\nWorkouts completed: ${periodFitness.length}\nTotal exercise time: ${totalMin} min\nCalories burned: ${totalCal} kcal\n${bmiInfo}`;
      })()
      : '';

    const newsBookmarks = getLocalStorage<any[]>('newsBookmarks', []);
    const newsSummary = newsBookmarks.length > 0
      ? `\n\nNEWS ENGAGEMENT:\nSaved articles: ${newsBookmarks.length}\nPreferred mode: ${localStorage.getItem('newsSelectedMode') || 'international'}`
      : '';

    let weatherContext = '';
    try {
      const cachedWeather = getLocalStorage<any>('weatherCurrentData', null);
      if (cachedWeather?.current) {
        const c = cachedWeather.current;
        weatherContext = `\nWeather: ${c.temperature}°, ${c.description || 'N/A'}, humidity ${c.humidity}%${c.windSpeed ? `, wind ${c.windSpeed}km/h` : ''}`;
      }
    } catch { }

    const dataSummary = `${profileContext}${periodLabel} | P:${productivityScore} W:${wellnessScoreWithSleep || wellnessScore} C:${consistencyScore}\nTasks:${tasksDone}/${periodTasks.length} Focus:${periodFocusMin}m Med:${periodMedMin}m Goals:${avgGoalProgress}%\nHabits:${activeHabits}/${habits.length} Streak:${bestHabitStreak}d Lvl:${gamification.level}(${gamification.totalXp}XP)\nBreathing:${breathingSessions.length}(${avgBreathingImprovement}) Time:${Math.floor(totalTimeTracked / 60)}h${totalTimeTracked % 60}m${sleepSummary}${waterSummary}${habitStreakSummary}${notesSummary}${booksSummary}${weatherContext}${wellnessExtra}${studySummary}${presentationSummary}${coachSummary}${nutritionSummary}${fitnessSummary}${newsSummary}${mediaSummary}`;
    try {
      const messages: LongCatMessage[] = [
        { role: 'system', content: ANALYTICS_SYSTEM_PROMPT },
        { role: 'user', content: dataSummary },
      ];
      const report = await chatWithLongCat(messages, { maxTokens: 1800, temperature: 0.6 });
      setAiReport(report);
    } catch {
      setAiReport('Unable to generate report right now. Please try again.');
    } finally {
      setReportLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-strong rounded-lg px-3 py-2 text-xs space-y-0.5 shadow-xl">
        <p className="font-semibold">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}{p.name === 'spending' ? '$' : ''}</p>
        ))}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="px-4 pt-12 pb-24 space-y-5">
      <PageOnboardingTooltips pageId="analytics" />
      <div data-tour="analytics-header" className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-2xl font-bold font-display">Analytics</h1>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setShowReports(!showReports)}
            className={`text-xs px-2.5 py-1.5 rounded-full transition-colors flex items-center gap-1 ${showReports ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
          >
            <FileText className="w-3 h-3" /> Reports
            {savedReports.length > 0 && <span className="w-4 h-4 rounded-full bg-primary-foreground/20 text-[8px] flex items-center justify-center font-bold">{savedReports.length}</span>}
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-1.5 flex-wrap">
        {([
          { key: '7d', label: '7 Days' },
          { key: '30d', label: '30 Days' },
          { key: '90d', label: '90 Days' },
        ] as { key: PeriodPreset; label: string }[]).map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${period === p.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
          >
            {p.label}
          </button>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <button className={`text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 ${period === 'custom' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
              <Calendar className="w-3 h-3" /> Custom
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[60]" align="start">
            <div className="p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Select date range</p>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">From</p>
                <CalendarPicker
                  mode="single"
                  selected={customStart}
                  onSelect={(d) => { setCustomStart(d); setPeriod('custom'); }}
                  className={cn("p-2 pointer-events-auto")}
                  disabled={(date) => date > new Date()}
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">To</p>
                <CalendarPicker
                  mode="single"
                  selected={customEnd}
                  onSelect={(d) => { setCustomEnd(d); setPeriod('custom'); }}
                  className={cn("p-2 pointer-events-auto")}
                  disabled={(date) => date > new Date()}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <p className="text-xs text-muted-foreground">{periodLabel}</p>

      {/* Score Cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Productivity', score: productivityScore },
          { label: 'Wellness', score: wellnessScoreWithSleep || wellnessScore },
          { label: 'Consistency', score: consistencyScore },
        ].map(({ label, score }) => (
          <div key={label} className="glass rounded-2xl p-3 text-center">
            <div className="relative w-14 h-14 mx-auto mb-1.5">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3.5" />
                <circle cx="28" cy="28" r="24" fill="none" stroke={scoreColor(score)} strokeWidth="3.5" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 24} strokeDashoffset={2 * Math.PI * 24 * (1 - score / 100)}
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: scoreColor(score) }}>{score}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Tasks', value: `${tasksDone}/${periodTasks.length}` },
          { label: 'Focus', value: `${periodFocusMin}m` },
          { label: 'Meditate', value: `${periodMedMin}m` },
          { label: 'Habits', value: `${activeHabits}/${habits.length}` },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-2.5 text-center">
            <p className="text-sm font-bold font-display">{s.value}</p>
            <p className="text-[9px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Chart Tabs + Chart */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex gap-1.5 flex-wrap">
          {([
            { key: 'activity', label: 'Activity' },
            { key: 'focus', label: 'Focus & Meditation' },
            { key: 'spending', label: 'Spending' },
            { key: 'mood', label: 'Mood' },
            { key: 'sleep', label: 'Sleep' },
            { key: 'water', label: 'Water' },
            { key: 'correlation', label: 'Mood Correlation' },
            { key: 'study', label: 'Study' },
          ] as { key: typeof activeChart; label: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveChart(tab.key)}
              className={`text-[10px] px-2.5 py-1 rounded-full transition-colors ${activeChart === tab.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="h-[180px]">
          {activeChart === 'activity' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="tasks" name="Tasks" fill="hsl(152, 69%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeChart === 'focus' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(245, 58%, 62%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(245, 58%, 62%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="medGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="focus" name="Focus" stroke="hsl(245, 58%, 62%)" fill="url(#focusGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="meditation" name="Meditation" stroke="hsl(199, 89%, 48%)" fill="url(#medGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {activeChart === 'spending' && (
            expenseByCategory.length > 0 ? (
              <div className="flex items-center gap-4 h-full">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={35} strokeWidth={0}>
                      {expenseByCategory.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 flex-1">
                  {expenseByCategory.map(cat => (
                    <div key={cat.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                      <span className="text-[10px] text-muted-foreground capitalize flex-1 truncate">{cat.name}</span>
                      <span className="text-[10px] font-semibold">${cat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No spending data this period</div>
            )
          )}

          {activeChart === 'mood' && (() => {
            const MOOD_SCORES: Record<MoodType, number> = { great: 5, okay: 4, low: 2, anxious: 1, stressed: 1 };
            const MOOD_EMOJIS: Record<MoodType, string> = { great: '😊', okay: '😐', low: '😔', anxious: '😰', stressed: '😤' };
            const periodMoods = moodEntries.filter(m => {
              try { return isWithinInterval(parseISO(m.createdAt), { start, end }); } catch { return false; }
            });
            if (periodMoods.length === 0) {
              return <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No mood data yet — select a mood on Kira's greeting popup!</div>;
            }
            // Group by day, average score
            const byDay: Record<string, { total: number; count: number; moods: MoodType[] }> = {};
            periodMoods.forEach(m => {
              const d = format(parseISO(m.createdAt), 'yyyy-MM-dd');
              if (!byDay[d]) byDay[d] = { total: 0, count: 0, moods: [] };
              byDay[d].total += MOOD_SCORES[m.mood];
              byDay[d].count += 1;
              byDay[d].moods.push(m.mood);
            });
            const dayCount = differenceInDays(end, start) + 1;
            const moodData = [];
            for (let i = 0; i < dayCount; i++) {
              const d = subDays(end, dayCount - 1 - i);
              const dStr = format(d, 'yyyy-MM-dd');
              const label = dayCount <= 14 ? format(d, 'EEE') : format(d, 'MMM d');
              const entry = byDay[dStr];
              if (entry) {
                const avg = Math.round((entry.total / entry.count) * 10) / 10;
                const dominantMood = entry.moods.sort((a, b) =>
                  entry.moods.filter(m => m === b).length - entry.moods.filter(m => m === a).length
                )[0];
                moodData.push({ label, score: avg, emoji: MOOD_EMOJIS[dominantMood], mood: dominantMood });
              } else {
                moodData.push({ label, score: null, emoji: '', mood: '' });
              }
            }
            const MoodTooltip = ({ active, payload, label: l }: any) => {
              if (!active || !payload?.length || payload[0].value === null) return null;
              const p = payload[0].payload;
              return (
                <div className="glass-strong rounded-lg px-3 py-2 text-xs space-y-0.5 shadow-xl">
                  <p className="font-semibold">{l} {p.emoji}</p>
                  <p>Mood score: {p.score}/5</p>
                </div>
              );
            };
            const moodColor = (score: number) => {
              if (score >= 4) return 'hsl(152, 69%, 45%)';
              if (score >= 3) return 'hsl(199, 89%, 48%)';
              if (score >= 2) return 'hsl(38, 92%, 50%)';
              return 'hsl(340, 82%, 52%)';
            };
            return (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={moodData}>
                  <defs>
                    <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(291, 64%, 42%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(291, 64%, 42%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<MoodTooltip />} />
                  <Area type="monotone" dataKey="score" name="Mood" stroke="hsl(291, 64%, 42%)" fill="url(#moodGrad)" strokeWidth={2} connectNulls dot={{ r: 3, fill: 'hsl(291, 64%, 42%)' }} />
                </AreaChart>
              </ResponsiveContainer>
            );
          })()}

          {activeChart === 'sleep' && (() => {
            const periodSleepData = sleepEntries.filter(s => {
              try { return isWithinInterval(parseISO(s.createdAt), { start, end }); } catch { return false; }
            });
            if (periodSleepData.length === 0) {
              return <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No sleep data yet — log your sleep in the Wellness Hub!</div>;
            }
            const sleepChartData = periodSleepData.map(e => {
              const [bh, bm] = e.bedtime.split(':').map(Number);
              const [wh, wm] = e.wakeTime.split(':').map(Number);
              let bed = bh * 60 + bm, wake = wh * 60 + wm;
              if (wake <= bed) wake += 24 * 60;
              const hours = Math.round(((wake - bed) / 60) * 10) / 10;
              return { label: e.date.slice(5), hours, quality: e.quality };
            });
            return (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sleepChartData} barCategoryGap="15%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="hours" name="Hours" fill="hsl(230, 70%, 55%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="quality" name="Quality" fill="hsl(152, 69%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            );
          })()}

          {activeChart === 'water' && (() => {
            if (periodWater.length === 0) {
              return <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No water data yet — track your hydration in the Wellness Hub!</div>;
            }
            const dayCount = differenceInDays(end, start) + 1;
            const waterChartData = [];
            for (let i = 0; i < dayCount; i++) {
              const d = subDays(end, dayCount - 1 - i);
              const dStr = format(d, 'yyyy-MM-dd');
              const label = dayCount <= 14 ? format(d, 'EEE') : format(d, 'MMM d');
              const total = (waterDayTotals[dStr] || 0) / 1000;
              waterChartData.push({ label, liters: Math.round(total * 10) / 10, goal: 2.5 });
            }
            return (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterChartData} barCategoryGap="15%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="liters" name="Liters" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            );
          })()}

          {activeChart === 'correlation' && (() => {
            const MOOD_SCORES: Record<MoodType, number> = { great: 5, okay: 4, low: 2, anxious: 1, stressed: 1 };
            const dayCount = differenceInDays(end, start) + 1;

            // Build per-day: mood score, water L, active habit streaks count
            const correlationData: { label: string; mood: number | null; water: number; habits: number }[] = [];
            const periodMoods = moodEntries.filter(m => { try { return isWithinInterval(parseISO(m.createdAt), { start, end }); } catch { return false; } });
            const moodByDay: Record<string, number[]> = {};
            periodMoods.forEach(m => { const d = format(parseISO(m.createdAt), 'yyyy-MM-dd'); (moodByDay[d] ??= []).push(MOOD_SCORES[m.mood]); });

            for (let i = 0; i < dayCount; i++) {
              const d = subDays(end, dayCount - 1 - i);
              const dStr = format(d, 'yyyy-MM-dd');
              const label = dayCount <= 14 ? format(d, 'EEE') : format(d, 'MMM d');
              const dayMoods = moodByDay[dStr];
              const mood = dayMoods ? Math.round((dayMoods.reduce((a, b) => a + b, 0) / dayMoods.length) * 10) / 10 : null;
              const water = Math.round((waterDayTotals[dStr] || 0) / 1000 * 10) / 10;
              // Approximate habit activity: count habits with streak > 0 (static snapshot)
              const habitCount = habits.filter(h => h.currentStreak > 0).length;
              correlationData.push({ label, mood, water, habits: habitCount });
            }

            const hasData = correlationData.some(d => d.mood !== null || d.water > 0);
            if (!hasData) {
              return <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Log mood & water data to see correlations!</div>;
            }

            const CorrelationTooltip = ({ active, payload, label: l }: any) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="glass-strong rounded-lg px-3 py-2 text-xs space-y-0.5 shadow-xl">
                  <p className="font-semibold">{l}</p>
                  {payload.map((p: any) => (
                    <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value ?? '—'}{p.name === 'Water (L)' ? 'L' : ''}</p>
                  ))}
                </div>
              );
            };

            return (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={correlationData}>
                  <defs>
                    <linearGradient id="corrMoodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(291, 64%, 42%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(291, 64%, 42%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="corrWaterGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={20} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={20} />
                  <Tooltip content={<CorrelationTooltip />} />
                  <Area yAxisId="left" type="monotone" dataKey="mood" name="Mood" stroke="hsl(291, 64%, 42%)" fill="url(#corrMoodGrad)" strokeWidth={2} connectNulls dot={{ r: 2, fill: 'hsl(291, 64%, 42%)' }} />
                  <Area yAxisId="right" type="monotone" dataKey="water" name="Water (L)" stroke="hsl(199, 89%, 48%)" fill="url(#corrWaterGrad)" strokeWidth={2} dot={{ r: 2, fill: 'hsl(199, 89%, 48%)' }} />
                  <Area yAxisId="left" type="monotone" dataKey="habits" name="Active Habits" stroke="hsl(152, 69%, 45%)" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            );
          })()}

          {activeChart === 'study' && (() => {
            if (studyTimeLogs.length === 0) {
              return <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No study data yet — use the Study Planner to track your sessions!</div>;
            }
            const subjectTime: Record<string, number> = {};
            studyTimeLogs.forEach(l => { subjectTime[l.subject] = (subjectTime[l.subject] || 0) + l.durationMinutes; });
            const data = Object.entries(subjectTime).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value], i) => ({ name: name.substring(0, 12), value, color: CHART_COLORS[i % CHART_COLORS.length] }));
            return (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" barCategoryGap="15%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Minutes" radius={[0, 4, 4, 0]}>
                    {data.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
        </div>
      </div>

      {/* Insights */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Insights & Feedback</h2>
        </div>
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-secondary/50 rounded-xl px-3 py-2.5 text-xs leading-relaxed"
            >
              {insight}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Save & AI Report */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex gap-2">
          <Button onClick={saveReport} variant="outline" size="sm" className="flex-1 gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Save Report
          </Button>
          <Button onClick={generateAIReport} disabled={reportLoading || isDemoMode} size="sm" className="flex-1 gap-1.5 text-xs">
            {reportLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {isDemoMode ? 'AI Reports disabled in demo' : reportLoading ? 'Analyzing…' : 'AI Report'}
          </Button>
        </div>
        {reportLoading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-secondary/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10">
                <motion.div className="absolute inset-0 rounded-full border-2 border-primary/30" />
                <motion.div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary"
                  animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
                <Sparkles className="w-4 h-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold">Kira is analyzing your data…</p>
                <motion.p className="text-[10px] text-muted-foreground"
                  animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
                  Crunching numbers, finding patterns, writing insights
                </motion.p>
              </div>
            </div>
            <div className="space-y-1.5">
              {[85, 60, 40].map((w, i) => (
                <motion.div key={i} className="h-2 rounded-full bg-primary/10 overflow-hidden"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.2 }}>
                  <motion.div className="h-full rounded-full bg-primary/30"
                    animate={{ width: ['0%', `${w}%`, '0%'] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
        {aiReport && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-secondary/50 rounded-xl p-3 text-xs leading-relaxed whitespace-pre-wrap">
            {aiReport}
          </motion.div>
        )}
      </div>

      {/* Saved Reports Panel */}
      <AnimatePresence>
        {showReports && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Saved Reports</h2>
                <button onClick={() => setShowReports(false)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              {savedReports.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No saved reports yet. Tap "Save Report" to store your current analysis.</p>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {savedReports.map(report => (
                    <motion.div key={report.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="bg-secondary/50 rounded-xl p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold">{report.title}</p>
                          <p className="text-[10px] text-muted-foreground">{format(parseISO(report.createdAt), 'MMM d, yyyy · h:mm a')}</p>
                        </div>
                        <button onClick={() => deleteReport(report.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        {Object.entries(report.scores).map(([key, val]) => (
                          <div key={key} className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ background: scoreColor(val) }} />
                            <span className="text-[9px] text-muted-foreground capitalize">{key}</span>
                            <span className="text-[9px] font-bold" style={{ color: scoreColor(val) }}>{val}</span>
                          </div>
                        ))}
                      </div>
                      {report.insights.length > 0 && (
                        <div className="space-y-1">
                          {report.insights.slice(0, 3).map((ins, i) => (
                            <p key={i} className="text-[10px] text-muted-foreground leading-relaxed">{ins}</p>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
