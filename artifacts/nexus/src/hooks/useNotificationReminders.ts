import { useEffect, useRef, useCallback } from 'react';
import { getLocalStorage, setLocalStorage } from '@/hooks/useLocalStorage';
import { getDailyQuote } from '@/lib/quotes';
import { sendPersistentNotification } from '@/lib/notifications';
import { Task, Todo, Habit, Goal, FocusSession, MeditationSession, MoodEntry, MoodType } from '@/types';
import { toast } from 'sonner';

export interface NotificationSettings {
  habitReminder: boolean;
  habitReminderTime: string;
  focusReminder: boolean;
  focusReminderTime: string;
  dailyQuote: boolean;
  dailyQuoteTime: string;
  studyReminder: boolean;
  studyReminderTime: string;
  weeklySummary: boolean;
  weeklySummaryTime: string;
  waterReminder: boolean;
  waterReminderStart: string;
  waterReminderEnd: string;
  goalReminder: boolean;
  goalReminderTime: string;
  taskReminder: boolean;
  taskReminderTime: string;
  expenseReminder: boolean;
  expenseReminderTime: string;
  meditationReminder: boolean;
  meditationReminderTime: string;
  readingReminder: boolean;
  readingReminderTime: string;
  fitnessReminder: boolean;
  fitnessReminderTime: string;
  nutritionReminder: boolean;
  nutritionReminderTime: string;
  moodReminder: boolean;
  moodReminderTime: string;
  journalReminder: boolean;
  journalReminderTime: string;
  sleepReminder: boolean;
  sleepReminderTime: string;
}

export const defaultNotificationSettings: NotificationSettings = {
  habitReminder: false,
  habitReminderTime: '08:00',
  focusReminder: false,
  focusReminderTime: '09:00',
  dailyQuote: false,
  dailyQuoteTime: '07:30',
  studyReminder: false,
  studyReminderTime: '14:00',
  weeklySummary: false,
  weeklySummaryTime: '10:00',
  waterReminder: false,
  waterReminderStart: '08:00',
  waterReminderEnd: '20:00',
  goalReminder: false,
  goalReminderTime: '08:30',
  taskReminder: false,
  taskReminderTime: '09:30',
  expenseReminder: false,
  expenseReminderTime: '20:30',
  meditationReminder: false,
  meditationReminderTime: '07:00',
  readingReminder: false,
  readingReminderTime: '21:00',
  fitnessReminder: false,
  fitnessReminderTime: '17:00',
  nutritionReminder: false,
  nutritionReminderTime: '12:00',
  moodReminder: false,
  moodReminderTime: '15:00',
  journalReminder: false,
  journalReminderTime: '22:00',
  sleepReminder: false,
  sleepReminderTime: '22:30',
};

export function buildWeeklySummary(): string {
  const now = Date.now();
  const weekAgo = now - 7 * 86400000;

  const tasks = getLocalStorage<Task[]>('tasks', []);
  const todos = getLocalStorage<Todo[]>('todos', []);
  const habits = getLocalStorage<Habit[]>('habits', []);
  const goals = getLocalStorage<Goal[]>('goals', []);
  const focus = getLocalStorage<FocusSession[]>('focusSessions', []);
  const meditation = getLocalStorage<MeditationSession[]>('meditationSessions', []);

  const weekTasks = tasks.filter(t => t.createdAt && new Date(t.createdAt).getTime() >= weekAgo);
  const tasksDone = weekTasks.filter(t => t.done).length;
  const weekTodos = todos.filter(t => t.createdAt && new Date(t.createdAt).getTime() >= weekAgo);
  const todosDone = weekTodos.filter(t => t.done).length;
  const focusMin = focus
    .filter(f => f.completedAt && new Date(f.completedAt).getTime() >= weekAgo)
    .reduce((s, f) => s + Math.round(f.duration / 60), 0);
  const medMin = meditation
    .filter(m => m.completedAt && new Date(m.completedAt).getTime() >= weekAgo)
    .reduce((s, m) => s + Math.round(m.duration / 60), 0);
  const activeHabits = habits.filter(h => h.currentStreak > 0).length;
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.currentStreak), 0);
  const avgGoal = goals.length ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0;

  // Mood data
  const moodEntries = getLocalStorage<MoodEntry[]>('moodEntries', []);
  const weekMoods = moodEntries.filter(m => new Date(m.createdAt).getTime() >= weekAgo);
  const MOOD_LABELS: Record<MoodType, string> = { great: '😊 Great', okay: '😐 Okay', low: '😔 Low', anxious: '😰 Anxious', stressed: '😤 Stressed' };
  const MOOD_SCORES: Record<MoodType, number> = { great: 5, okay: 4, low: 2, anxious: 1, stressed: 1 };

  const lines = [
    `📋 Tasks: ${tasksDone}/${weekTasks.length} completed`,
    `✅ To-dos: ${todosDone}/${weekTodos.length} done`,
    `⏱️ Focus: ${focusMin} min`,
    `🧘 Meditation: ${medMin} min`,
    `🔥 Habits: ${activeHabits}/${habits.length} active (best streak: ${bestStreak}d)`,
    `🎯 Goals: ${avgGoal}% avg progress`,
  ];

  // Mood summary
  if (weekMoods.length > 0) {
    const avgMood = Math.round((weekMoods.reduce((s, m) => s + MOOD_SCORES[m.mood], 0) / weekMoods.length) * 10) / 10;
    const moodCounts: Partial<Record<MoodType, number>> = {};
    weekMoods.forEach(m => { moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1; });
    const dominant = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0][0] as MoodType;
    lines.push(`💜 Mood: avg ${avgMood}/5 · mostly ${MOOD_LABELS[dominant]} (${weekMoods.length} logs)`);
  }

  // Add encouragement
  const total = tasksDone + todosDone;
  if (total >= 10) lines.push('🌟 Outstanding week! Keep it up!');
  else if (total >= 5) lines.push('👍 Solid progress this week!');
  else lines.push('💡 Small steps count — every bit matters!');

  return lines.join('\n');
}

export function useNotificationReminders() {
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const firedRef = useRef<Set<string>>(new Set());

  const check = useCallback(() => {
    const settings = getLocalStorage<NotificationSettings>('notificationSettings', defaultNotificationSettings);
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = now.toDateString();
    const isSunday = now.getDay() === 0;

    const fire = (key: string, title: string, body: string) => {
      const id = `${key}_${today}`;
      if (firedRef.current.has(id)) return;
      firedRef.current.add(id);
      sendPersistentNotification(title, body, id);
    };

    if (settings.habitReminder && hhmm === settings.habitReminderTime) {
      fire('habit', 'MindFlow — Habit Check 🔥', "Don't forget to log your habits today! Keep that streak going.");
    }
    if (settings.focusReminder && hhmm === settings.focusReminderTime) {
      fire('focus', 'MindFlow — Focus Time ⏱️', "Ready for a focus session? Your productivity awaits!");
    }
    if (settings.dailyQuote && hhmm === settings.dailyQuoteTime) {
      const q = getDailyQuote();
      fire('quote', 'MindFlow — Daily Inspiration ✨', `"${q.text}" — ${q.author}`);
    }
    if (settings.studyReminder && hhmm === settings.studyReminderTime) {
      fire('study', 'MindFlow — Study Reminder 📚', "Time to hit the books! Check your study planner.");
    }
    if (settings.goalReminder && hhmm === settings.goalReminderTime) {
      fire('goal', 'MindFlow — Goal Check 🎯', "How are your goals coming along? Take a step closer today!");
    }
    if (settings.taskReminder && hhmm === settings.taskReminderTime) {
      fire('task', 'MindFlow — Task List 📋', "Check your tasks for today. Stay organized and productive!");
    }
    if (settings.expenseReminder && hhmm === settings.expenseReminderTime) {
      fire('expense', 'MindFlow — Finance Tracker 💰', "Don't forget to log any expenses you had today!");
    }
    if (settings.meditationReminder && hhmm === settings.meditationReminderTime) {
      fire('meditation', 'MindFlow — Inner Peace 🧘', "Time for a quick meditation session. Breathe and center yourself.");
    }
    if (settings.readingReminder && hhmm === settings.readingReminderTime) {
      fire('reading', 'MindFlow — Reading Time 📖', "Open your books and continue your learning journey.");
    }
    if (settings.fitnessReminder && hhmm === settings.fitnessReminderTime) {
      fire('fitness', 'MindFlow — Fitness Coach 🏃', "Time to move! Get active and feel the energy.");
    }
    if (settings.nutritionReminder && hhmm === settings.nutritionReminderTime) {
      fire('nutrition', 'MindFlow — Nutrition Log 🥗', "Remember to track what you eat. Fuel your body right.");
    }
    if (settings.moodReminder && hhmm === settings.moodReminderTime) {
      fire('mood', 'MindFlow — Mood Heart ❤️', "How are you feeling right now? Take a second to check in.");
    }
    if (settings.journalReminder && hhmm === settings.journalReminderTime) {
      fire('journal', 'MindFlow — Journal ✍️', "Write down your thoughts today. Reflect and grow.");
    }
    if (settings.sleepReminder && hhmm === settings.sleepReminderTime) {
      fire('sleep', 'MindFlow — Sleep Well 😴', "Time to wind down for a restful night's sleep.");
    }

    // Weekly summary — Sundays only
    if (settings.weeklySummary && isSunday && hhmm === settings.weeklySummaryTime) {
      const summaryId = `weekly_${today}`;
      const lastFired = getLocalStorage<string>('lastWeeklySummary', '');
      if (lastFired !== today && !firedRef.current.has(summaryId)) {
        firedRef.current.add(summaryId);
        setLocalStorage('lastWeeklySummary', today);
        const summary = buildWeeklySummary();
        sendPersistentNotification('MindFlow — Weekly Summary 📊', summary, 'weekly_summary');
        toast('📊 Your Weekly Summary', {
          description: summary,
          duration: 15000,
        });
      }
    }

    // Water reminders — every 2 hours during the day
    if (settings.waterReminder) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = settings.waterReminderStart.split(':').map(Number);
      const [endH, endM] = settings.waterReminderEnd.split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;

      if (nowMinutes >= startMin && nowMinutes <= endMin) {
        // Fire at even-hour marks within range (every 2 hours from start)
        const currentHour = now.getHours();
        const isEvenSlot = (currentHour - startH) % 2 === 0 && now.getMinutes() === startM;
        if (isEvenSlot) {
          fire('water', 'MindFlow — Stay Hydrated 💧', "Time for a glass of water! Small sips throughout the day keep you energized and focused.");
        }
      }
    }
  }, []);

  useEffect(() => {
    check();
    intervalRef.current = setInterval(check, 30000);
    return () => clearInterval(intervalRef.current);
  }, [check]);
}
