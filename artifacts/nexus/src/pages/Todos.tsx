import { useState } from 'react';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Todo, AlarmSoundType } from '@/types';
import { exampleTodos } from '@/lib/examples';
import { ArrowLeft, Plus, CheckCircle2, Circle, Trash2, X, ChevronDown, ChevronUp, Bell, Clock, CalendarDays, ListTodo, StickyNote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ALARM_SOUNDS, previewAlarmSound } from '@/lib/alarm';
import { DatePicker } from '@/components/DatePicker';
import { TimePicker } from '@/components/TimePicker';
import EmptyState from '@/components/EmptyState';

export default function Todos() {
  const navigate = useNavigate();
  const [hasInit] = useLocalStorage('todos_init', false);
  const [todos, setTodos] = useLocalStorage<Todo[]>('todos', hasInit ? [] : migrateExampleTodos());
  const [, setInit] = useLocalStorage('todos_init', true);
  const [input, setInput] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showScheduleNew, setShowScheduleNew] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [newAlarm, setNewAlarm] = useState(false);
  const [newAlarmSound, setNewAlarmSound] = useState<AlarmSoundType>('chime');

  if (!hasInit) setInit(true);

  const add = () => {
    if (!input.trim()) return;
    const todo: Todo = {
      id: crypto.randomUUID(), text: input.trim(), done: false,
      scheduledDate: newDate || null, scheduledTime: newTime || null,
      reminderDate: newReminderDate || null, reminderTime: newReminderTime || null,
      alarmEnabled: newAlarm, alarmSound: newAlarmSound, alarmFired: false, notes: '',
      createdAt: new Date().toISOString(),
    };
    setTodos(prev => [todo, ...prev]);
    if (newReminderDate && newReminderTime) {
      toast.success(`⏰ Reminder set${newAlarm ? ' with alarm' : ''}`);
    }
    setInput(''); setNewDate(''); setNewTime(''); setNewReminderDate(''); setNewReminderTime(''); setNewAlarm(false); setNewAlarmSound('chime'); setShowScheduleNew(false);
  };

  const updateTodo = (id: string, updates: Partial<Todo>) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates, alarmFired: updates.reminderDate !== undefined ? false : t.alarmFired } : t));
  };

  const deleteTodo = (id: string) => {
    const backup = todos.find(t => t.id === id);
    const index = todos.findIndex(t => t.id === id);
    if (!backup) return;

    setTodos(prev => prev.filter(t => t.id !== id));
    toast.success('To-do deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          setTodos(prev => {
            const newTodos = [...prev];
            newTodos.splice(index, 0, backup);
            return newTodos;
          });
        }
      }
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="px-4 pt-12 pb-24 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display" data-tour="todos-header">To-Do</h1>
      </div>

      <PageOnboardingTooltips pageId="todos" />

      {/* Add Input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Add a to-do and press Enter..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !showScheduleNew && add()}
            className="bg-secondary border-0 flex-1"
          />
          <button onClick={() => setShowScheduleNew(!showScheduleNew)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${showScheduleNew ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
            <CalendarDays className="w-4 h-4" />
          </button>
        </div>

        {showScheduleNew && (
          <div className="glass rounded-2xl p-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-3.5 h-3.5 text-info" />
              <span className="text-xs font-medium">Schedule</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker value={newDate} onChange={setNewDate} placeholder="Date" className="bg-secondary border-0 w-full h-10 text-xs" />
              <TimePicker value={newTime} onChange={setNewTime} placeholder="Time" className="bg-secondary border-0 w-full h-10 text-xs" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Bell className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium">Reminder</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker value={newReminderDate} onChange={setNewReminderDate} placeholder="Date" className="bg-secondary border-0 w-full h-10 text-xs" />
              <TimePicker value={newReminderTime} onChange={setNewReminderTime} placeholder="Time" className="bg-secondary border-0 w-full h-10 text-xs" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">🔔 Play alarm sound</span>
              <Switch checked={newAlarm} onCheckedChange={setNewAlarm} />
            </div>
            {newAlarm && (
              <div className="flex gap-1.5 flex-wrap">
                {ALARM_SOUNDS.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => { setNewAlarmSound(s.value); previewAlarmSound(s.value); }}
                    className={`text-[10px] px-2.5 py-1.5 rounded-full transition-colors flex items-center gap-1 ${newAlarmSound === s.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
                  >
                    <span>{s.emoji}</span> {s.label}
                  </button>
                ))}
              </div>
            )}
            <button onClick={add} className="w-full text-xs bg-primary text-primary-foreground rounded-lg py-2 font-medium active:scale-[0.98]">
              Add Scheduled To-Do
            </button>
          </div>
        )}
      </div>

      {/* Todo List */}
      <div className="space-y-2">
        {todos.length === 0 && (
          <EmptyState
            icon={ListTodo}
            title="All caught up!"
            description="You don't have any active to-dos. Add one above."
          />
        )}
        {todos.map(todo => {
          const expanded = expandedId === todo.id;
          return (
            <motion.div key={todo.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: todos.indexOf(todo) * 0.03 }} className="glass rounded-2xl overflow-hidden">
              <div className="p-3 flex items-center gap-3">
                <button onClick={() => setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: !t.done } : t))}>
                  {todo.done ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                </button>
                <div className="flex-1 min-w-0" onClick={() => setExpandedId(expanded ? null : todo.id)}>
                  <span className={`text-sm ${todo.done ? 'line-through text-muted-foreground' : ''}`}>{todo.text}</span>
                  <div className="flex gap-1.5 mt-0.5 flex-wrap">
                    {todo.scheduledDate && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-info/15 text-info flex items-center gap-0.5">
                        <CalendarDays className="w-3 h-3" /> {todo.scheduledDate} {todo.scheduledTime || ''}
                      </span>
                    )}
                    {todo.reminderDate && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary flex items-center gap-0.5">
                        {todo.alarmEnabled ? <Bell className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {todo.reminderTime || ''}
                      </span>
                    )}
                    {todo.notes && <StickyNote className="w-3 h-3 text-muted-foreground" />}
                    {todo.isExample && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">Example</span>}
                  </div>
                </div>
                <button onClick={() => setExpandedId(expanded ? null : todo.id)} className="text-muted-foreground">
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button onClick={() => deleteTodo(todo.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>

              {expanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-border/30 pt-3">
                  <Input placeholder="To-do text" value={todo.text} onChange={e => updateTodo(todo.id, { text: e.target.value })} className="bg-secondary border-0 text-sm h-8" />
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <StickyNote className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground font-medium">Notes</span>
                    </div>
                    <Textarea placeholder="Add notes..." value={todo.notes || ''} onChange={e => updateTodo(todo.id, { notes: e.target.value })} className="bg-secondary border-0 min-h-[50px] text-xs" />
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3 text-info" />
                      <span className="text-[10px] font-semibold">Schedule</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <DatePicker value={todo.scheduledDate || ''} onChange={v => updateTodo(todo.id, { scheduledDate: v || null })} placeholder="Date" className="bg-background border-0 w-full h-8 text-xs" />
                      <TimePicker value={todo.scheduledTime || ''} onChange={v => updateTodo(todo.id, { scheduledTime: v || null })} placeholder="Time" className="bg-background border-0 w-full h-8 text-xs" />
                    </div>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center gap-1">
                      <Bell className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-semibold">Reminder</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <DatePicker value={todo.reminderDate || ''} onChange={v => updateTodo(todo.id, { reminderDate: v || null })} placeholder="Date" className="bg-background border-0 w-full h-8 text-xs" />
                      <TimePicker value={todo.reminderTime || ''} onChange={v => updateTodo(todo.id, { reminderTime: v || null })} placeholder="Time" className="bg-background border-0 w-full h-8 text-xs" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">🔔 Alarm sound</span>
                      <Switch checked={todo.alarmEnabled} onCheckedChange={v => updateTodo(todo.id, { alarmEnabled: v })} />
                    </div>
                    {todo.alarmEnabled && (
                      <div className="flex gap-1 flex-wrap">
                        {ALARM_SOUNDS.map(s => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => { updateTodo(todo.id, { alarmSound: s.value }); previewAlarmSound(s.value); }}
                            className={`text-[10px] px-2 py-1 rounded-full transition-colors flex items-center gap-0.5 ${(todo.alarmSound || 'chime') === s.value ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'}`}
                          >
                            <span>{s.emoji}</span> {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function migrateExampleTodos(): Todo[] {
  return exampleTodos.map(t => ({
    ...t,
    scheduledDate: (t as any).scheduledDate ?? null,
    scheduledTime: (t as any).scheduledTime ?? null,
    reminderDate: (t as any).reminderDate ?? null,
    reminderTime: (t as any).reminderTime ?? null,
    alarmEnabled: (t as any).alarmEnabled ?? false,
    alarmFired: (t as any).alarmFired ?? false,
    notes: (t as any).notes ?? '',
  }));
}
