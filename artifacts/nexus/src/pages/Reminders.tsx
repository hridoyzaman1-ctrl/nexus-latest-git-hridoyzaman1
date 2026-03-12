import { useLocalStorage } from '@/hooks/useLocalStorage';
import { getLocalStorage, setLocalStorage } from '@/hooks/useLocalStorage';
import { Task, Todo, StudySession, Note } from '@/types';
import { ArrowLeft, Bell, CheckSquare, ListTodo, GraduationCap, StickyNote, Clock, X, Trash2, AlarmClockOff, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isTomorrow, isPast, addMinutes, addHours } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';

interface ReminderItem {
  id: string;
  sourceId: string;
  title: string;
  sourceType: 'task' | 'todo' | 'study' | 'note';
  dateTime: Date;
  alarm: boolean;
  done: boolean;
}

const snoozeOptions = [
  { label: '5 min', minutes: 5 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
];

export default function Reminders() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useLocalStorage<string[]>('dismissedReminders', []);
  const [snoozeOpen, setSnoozeOpen] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);

  const tasks = getLocalStorage<Task[]>('tasks', []);
  const todos = getLocalStorage<Todo[]>('todos', []);
  const studySessions = getLocalStorage<StudySession[]>('studySessions', []);
  const notes = getLocalStorage<Note[]>('notes', []);

  const allReminders: ReminderItem[] = [
    ...tasks
      .filter(t => t.reminderDate && t.reminderTime)
      .map(t => ({
        id: `task_${t.id}`,
        sourceId: t.id,
        title: t.title,
        sourceType: 'task' as const,
        dateTime: new Date(`${t.reminderDate}T${t.reminderTime}`),
        alarm: t.alarmEnabled,
        done: t.done,
      })),
    ...todos
      .filter(t => t.reminderDate && t.reminderTime)
      .map(t => ({
        id: `todo_${t.id}`,
        sourceId: t.id,
        title: t.text,
        sourceType: 'todo' as const,
        dateTime: new Date(`${t.reminderDate}T${t.reminderTime}`),
        alarm: t.alarmEnabled,
        done: t.done,
      })),
    ...studySessions
      .filter(s => s.scheduledDate && s.scheduledTime)
      .map(s => ({
        id: `study_${s.id}`,
        sourceId: s.id,
        title: `${s.subject}${s.topic ? ` — ${s.topic}` : ''}`,
        sourceType: 'study' as const,
        dateTime: new Date(`${s.scheduledDate}T${s.scheduledTime}`),
        alarm: false,
        done: s.completed,
      })),
    ...notes
      .filter(n => n.reminderDate && n.reminderTime)
      .map(n => ({
        id: `note_${n.id}`,
        sourceId: n.id,
        title: n.title || 'Untitled Note',
        sourceType: 'note' as const,
        dateTime: new Date(`${n.reminderDate}T${n.reminderTime}`),
        alarm: n.alarmEnabled || false,
        done: !!n.alarmFired,
      })),
  ].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

  const reminders = allReminders.filter(r => !dismissed.includes(r.id));

  const upcoming = reminders.filter(r => !r.done && !isPast(r.dateTime));
  const pastDue = reminders.filter(r => !r.done && isPast(r.dateTime));
  const completed = reminders.filter(r => r.done);

  const dismissOne = (id: string) => {
    setDismissed(prev => [...prev, id]);
    setSnoozeOpen(null);
    toast('Reminder dismissed');
  };

  const clearAll = () => setDismissed(prev => [...prev, ...reminders.map(r => r.id)]);
  const clearSection = (items: ReminderItem[]) => setDismissed(prev => [...prev, ...items.map(r => r.id)]);

  const snoozeReminder = (r: ReminderItem, minutes: number) => {
    const newTime = addMinutes(new Date(), minutes);
    const newDate = format(newTime, 'yyyy-MM-dd');
    const newTimeStr = format(newTime, 'HH:mm');

    if (r.sourceType === 'task') {
      const updated = tasks.map(t =>
        t.id === r.sourceId
          ? { ...t, reminderDate: newDate, reminderTime: newTimeStr, alarmFired: false }
          : t
      );
      setLocalStorage('tasks', updated);
    } else if (r.sourceType === 'todo') {
      const updated = todos.map(t =>
        t.id === r.sourceId
          ? { ...t, reminderDate: newDate, reminderTime: newTimeStr, alarmFired: false }
          : t
      );
      setLocalStorage('todos', updated);
    } else if (r.sourceType === 'note') {
      const updated = notes.map(n =>
        n.id === r.sourceId
          ? { ...n, reminderDate: newDate, reminderTime: newTimeStr, alarmFired: false }
          : n
      );
      setLocalStorage('notes', updated);
    }

    setSnoozeOpen(null);
    forceUpdate(n => n + 1);
    toast.success(`Snoozed for ${minutes >= 60 ? `${minutes / 60} hour` : `${minutes} min`} — ${format(newTime, 'h:mm a')}`);
  };

  const sourceIcon = (type: string) => {
    if (type === 'task') return <CheckSquare className="w-4 h-4" />;
    if (type === 'todo') return <ListTodo className="w-4 h-4" />;
    if (type === 'note') return <StickyNote className="w-4 h-4" />;
    return <GraduationCap className="w-4 h-4" />;
  };

  const sourceColor = (type: string) =>
    type === 'task' ? 'hsl(152, 69%, 45%)' : type === 'todo' ? 'hsl(199, 89%, 48%)' : type === 'note' ? 'hsl(38, 92%, 50%)' : 'hsl(262, 83%, 58%)';

  const formatDate = (d: Date) => {
    if (isToday(d)) return `Today, ${format(d, 'h:mm a')}`;
    if (isTomorrow(d)) return `Tomorrow, ${format(d, 'h:mm a')}`;
    return format(d, 'MMM d, h:mm a');
  };

  const ReminderCard = ({ r, i, dimmed = false }: { r: ReminderItem; i: number; dimmed?: boolean }) => {
    const isSnoozeOpen = snoozeOpen === r.id;
    const canSnooze = r.sourceType !== 'study' && !r.done;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, x: -200, height: 0, marginBottom: 0, padding: 0 }}
        transition={{ delay: i * 0.03 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.x) > 100) dismissOne(r.id);
        }}
        style={{ touchAction: 'pan-y' }}
        className={`glass rounded-xl overflow-hidden cursor-grab active:cursor-grabbing ${dimmed ? 'opacity-50' : ''}`}
      >
        <div className="p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: sourceColor(r.sourceType) + '18', color: sourceColor(r.sourceType) }}>
            {sourceIcon(r.sourceType)}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${r.done ? 'line-through text-muted-foreground' : ''}`}>{r.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{formatDate(r.dateTime)}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
                style={{ background: sourceColor(r.sourceType) + '18', color: sourceColor(r.sourceType) }}>
                {r.sourceType}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {r.alarm && !r.done && <Bell className="w-3.5 h-3.5 text-primary" />}
            {canSnooze && (
              <button
                onClick={() => setSnoozeOpen(isSnoozeOpen ? null : r.id)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isSnoozeOpen ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                title="Snooze"
              >
                <Timer className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => dismissOne(r.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Dismiss"
            >
              <AlarmClockOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Snooze options dropdown */}
        <AnimatePresence>
          {isSnoozeOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 pt-1 border-t border-border/30">
                <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Snooze for:</p>
                <div className="flex gap-1.5">
                  {snoozeOptions.map(opt => (
                    <button
                      key={opt.minutes}
                      onClick={() => snoozeReminder(r, opt.minutes)}
                      className="flex-1 text-[10px] py-1.5 rounded-lg bg-secondary text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors font-medium"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pt-12 pb-24 space-y-5">
      <PageOnboardingTooltips pageId="reminders" />
      <div data-tour="reminders-header" className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display flex-1">Reminders</h1>
        {reminders.length > 0 && (
          <Button size="sm" variant="ghost" onClick={clearAll} className="text-xs text-muted-foreground gap-1">
            <Trash2 className="w-3.5 h-3.5" /> Clear All
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Upcoming', value: upcoming.length, color: 'hsl(152, 69%, 45%)' },
          { label: 'Past Due', value: pastDue.length, color: 'hsl(0, 84%, 60%)' },
          { label: 'Done', value: completed.length, color: 'hsl(199, 89%, 48%)' },
        ].map(s => (
          <div key={s.label} className="glass rounded-2xl p-3 text-center">
            <p className="text-xl font-bold font-display" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Past Due */}
      {pastDue.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-destructive uppercase tracking-wider">⚠️ Past Due</h2>
            <button onClick={() => clearSection(pastDue)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Clear</button>
          </div>
          <AnimatePresence>
            {pastDue.map((r, i) => <ReminderCard key={r.id} r={r} i={i} />)}
          </AnimatePresence>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</h2>
            <button onClick={() => clearSection(upcoming)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Clear</button>
          </div>
          <AnimatePresence>
            {upcoming.map((r, i) => <ReminderCard key={r.id} r={r} i={i} />)}
          </AnimatePresence>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completed</h2>
            <button onClick={() => clearSection(completed)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Clear</button>
          </div>
          <AnimatePresence>
            {completed.slice(0, 10).map((r, i) => <ReminderCard key={r.id} r={r} i={i} dimmed />)}
          </AnimatePresence>
        </div>
      )}

      {reminders.length === 0 && (
        <div className="text-center py-12 space-y-2">
          <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">No reminders</p>
          <p className="text-xs text-muted-foreground/60">Add reminders to your tasks, to-dos, notes, or study sessions</p>
        </div>
      )}
    </motion.div>
  );
}
