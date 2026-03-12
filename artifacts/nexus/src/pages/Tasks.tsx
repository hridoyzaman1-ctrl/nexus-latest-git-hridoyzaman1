import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Task, AlarmSoundType, Subtask, TaskStatus } from '@/types';
import { exampleTasks } from '@/lib/examples';
import { ArrowLeft, Plus, X, Circle, CheckCircle2, CheckSquare, Trash2, Bell, BellOff, ChevronDown, ChevronUp, Clock, CalendarDays, StickyNote, Volume2, Tag, GripVertical, LayoutGrid, List, Calendar, BarChart3, FolderKanban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ALARM_SOUNDS, previewAlarmSound } from '@/lib/alarm';
import { DatePicker } from '@/components/DatePicker';
import { TimePicker } from '@/components/TimePicker';
import EmptyState from '@/components/EmptyState';
import { format, startOfWeek, addDays, parseISO, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';

const priorityColors = { low: 'hsl(199, 89%, 48%)', medium: 'hsl(38, 92%, 50%)', high: 'hsl(0, 84%, 60%)' };
const LABEL_COLORS = ['hsl(245, 58%, 62%)', 'hsl(152, 69%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(340, 82%, 52%)', 'hsl(199, 89%, 48%)', 'hsl(291, 64%, 42%)'];

type ViewMode = 'list' | 'kanban' | 'calendar' | 'analytics';
type CalendarView = 'monthly' | 'weekly';

export default function Tasks() {
  const navigate = useNavigate();
  const [hasInit] = useLocalStorage('tasks_init', false);
  const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', hasInit ? [] : migrateExampleTasks());
  const [, setInit] = useLocalStorage('tasks_init', true);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [alarmSound, setAlarmSound] = useState<AlarmSoundType>('chime');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [labelInput, setLabelInput] = useState('');
  const [newLabels, setNewLabels] = useState<string[]>([]);
  const [newSubtasks, setNewSubtasks] = useState<string[]>(['']);
  const [projectInput, setProjectInput] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>('monthly');
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);

  if (!hasInit) setInit(true);

  const addTask = () => {
    if (!title.trim()) return;
    const subtasks: Subtask[] = newSubtasks.filter(s => s.trim()).map(s => ({ id: crypto.randomUUID(), title: s.trim(), done: false }));
    const task: Task = {
      id: crypto.randomUUID(), title: title.trim(), priority, dueDate: dueDate || null,
      done: false, status: 'todo', notes, labels: newLabels.length > 0 ? newLabels : undefined,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
      project: projectInput.trim() || undefined,
      reminderDate: reminderDate || null, reminderTime: reminderTime || null,
      alarmEnabled, alarmSound, alarmFired: false, createdAt: new Date().toISOString(),
    };
    setTasks(prev => [task, ...prev]);
    if (reminderDate && reminderTime) {
      toast.success(`⏰ Reminder set for ${reminderDate} at ${reminderTime}${alarmEnabled ? ' with alarm' : ''}`);
    }
    setTitle(''); setNotes(''); setDueDate(''); setReminderDate(''); setReminderTime('');
    setAlarmEnabled(false); setAlarmSound('chime'); setNewLabels([]); setNewSubtasks(['']); setProjectInput(''); setShowAdd(false);
  };

  const toggle = (id: string) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done, status: !t.done ? 'done' : 'todo' } : t));
  const deleteTask = (id: string) => {
    const backup = tasks.find(t => t.id === id);
    const index = tasks.findIndex(t => t.id === id);
    if (!backup) return;

    setTasks(prev => prev.filter(t => t.id !== id));
    toast.success('Task deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          setTasks(prev => {
            const newTasks = [...prev];
            newTasks.splice(index, 0, backup);
            return newTasks;
          });
        }
      }
    });
  };
  const updateNotes = (id: string, n: string) => setTasks(prev => prev.map(t => t.id === id ? { ...t, notes: n } : t));
  const updateTask = (id: string, updates: Partial<Task>) => setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  const updateReminder = (id: string, date: string, time: string, alarm: boolean, sound?: AlarmSoundType) =>
    setTasks(prev => prev.map(t => t.id === id ? { ...t, reminderDate: date || null, reminderTime: time || null, alarmEnabled: alarm, alarmSound: sound || t.alarmSound || 'chime', alarmFired: false } : t));

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const subtasks = (t.subtasks || []).map(s => s.id === subtaskId ? { ...s, done: !s.done } : s);
      return { ...t, subtasks };
    }));
  };

  const addSubtaskToTask = (taskId: string, title: string) => {
    if (!title.trim()) return;
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      return { ...t, subtasks: [...(t.subtasks || []), { id: crypto.randomUUID(), title: title.trim(), done: false }] };
    }));
  };

  const moveTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, done: newStatus === 'done' } : t));
  };

  // Drag and drop handlers (desktop)
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDragTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };
  const handleDragEnd = (e: React.DragEvent) => {
    setDragTaskId(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      moveTaskStatus(taskId, targetStatus);
      toast.success(`Moved to ${targetStatus === 'todo' ? 'To Do' : targetStatus === 'inProgress' ? 'In Progress' : 'Done'}`);
    }
    setDragTaskId(null);
  };

  // Touch drag handlers (mobile)
  const touchStartRef = useRef<{ taskId: string; startY: number; startX: number } | null>(null);
  const touchGhostRef = useRef<HTMLDivElement | null>(null);
  const columnRefsMap = useRef<Map<TaskStatus, HTMLDivElement>>(new Map());

  const handleTouchStart = (e: React.TouchEvent, taskId: string) => {
    const touch = e.touches[0];
    touchStartRef.current = { taskId, startY: touch.clientY, startX: touch.clientX };
    setDragTaskId(taskId);

    // Create ghost element
    const ghost = document.createElement('div');
    ghost.className = 'fixed z-50 bg-card/90 backdrop-blur-sm rounded-xl p-2 shadow-lg pointer-events-none text-[10px] font-medium border border-primary/30';
    const task = tasks.find(t => t.id === taskId);
    ghost.textContent = task?.title || '';
    ghost.style.left = `${touch.clientX - 40}px`;
    ghost.style.top = `${touch.clientY - 20}px`;
    ghost.style.width = '100px';
    document.body.appendChild(ghost);
    touchGhostRef.current = ghost;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (touchGhostRef.current) {
      touchGhostRef.current.style.left = `${touch.clientX - 40}px`;
      touchGhostRef.current.style.top = `${touch.clientY - 20}px`;
    }
    // Highlight column under finger
    columnRefsMap.current.forEach((el, status) => {
      const rect = el.getBoundingClientRect();
      if (touch.clientX >= rect.left && touch.clientX <= rect.right && touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        el.style.background = 'hsl(var(--primary) / 0.08)';
      } else {
        el.style.background = '';
      }
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const { taskId } = touchStartRef.current;

    // Find which column the touch ended on
    let targetStatus: TaskStatus | null = null;
    columnRefsMap.current.forEach((el, status) => {
      el.style.background = '';
      const rect = el.getBoundingClientRect();
      if (touch.clientX >= rect.left && touch.clientX <= rect.right && touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        targetStatus = status;
      }
    });

    if (targetStatus) {
      moveTaskStatus(taskId, targetStatus);
      toast.success(`Moved to ${targetStatus === 'todo' ? 'To Do' : targetStatus === 'inProgress' ? 'In Progress' : 'Done'}`);
    }

    // Cleanup
    if (touchGhostRef.current) {
      document.body.removeChild(touchGhostRef.current);
      touchGhostRef.current = null;
    }
    touchStartRef.current = null;
    setDragTaskId(null);
  };

  const filtered = tasks.filter(t => filter === 'all' ? true : filter === 'active' ? !t.done : t.done);
  const projects = useMemo(() => [...new Set(tasks.map(t => t.project).filter(Boolean) as string[])], [tasks]);

  // Kanban columns
  const kanbanColumns: { status: TaskStatus; label: string; color: string }[] = [
    { status: 'todo', label: 'To Do', color: 'hsl(var(--muted-foreground))' },
    { status: 'inProgress', label: 'In Progress', color: 'hsl(38, 92%, 50%)' },
    { status: 'done', label: 'Done', color: 'hsl(152, 69%, 45%)' },
  ];

  // Calendar data
  const calendarDays = useMemo(() => {
    if (calendarView === 'monthly') {
      return eachDayOfInterval({ start: startOfMonth(calendarMonth), end: endOfMonth(calendarMonth) });
    }
    const weekStart = startOfWeek(calendarMonth);
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [calendarMonth, calendarView]);

  // Analytics
  const completedCount = tasks.filter(t => t.done).length;
  const totalCount = tasks.length;
  const highPriorityDone = tasks.filter(t => t.done && t.priority === 'high').length;
  const highPriorityTotal = tasks.filter(t => t.priority === 'high').length;

  // Weekly productivity data for analytics
  const weeklyProductivity = useMemo(() => {
    const data: { label: string; total: number; done: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dayStr = format(d, 'yyyy-MM-dd');
      const dayTasks = tasks.filter(t => t.createdAt.startsWith(dayStr));
      const dayDone = tasks.filter(t => t.done && t.createdAt.startsWith(dayStr));
      data.push({ label: format(d, 'EEE'), total: dayTasks.length, done: dayDone.length });
    }
    return data;
  }, [tasks]);
  const maxWeeklyProd = Math.max(...weeklyProductivity.map(d => d.total), 1);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="px-4 pt-12 pb-24 space-y-4">
      <PageOnboardingTooltips pageId="tasks" />
      <div data-tour="tasks-header" className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display flex-1">Tasks</h1>
        <Button data-tour="add-btn" size="sm" onClick={() => setShowAdd(!showAdd)} variant="ghost"><Plus className="w-5 h-5" /></Button>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-1.5">
        {[
          { key: 'list', icon: List, label: 'List' },
          { key: 'kanban', icon: LayoutGrid, label: 'Kanban' },
          { key: 'calendar', icon: Calendar, label: 'Calendar' },
          { key: 'analytics', icon: BarChart3, label: 'Stats' },
        ].map(v => (
          <button key={v.key} onClick={() => setViewMode(v.key as ViewMode)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full transition-colors ${viewMode === v.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
            <v.icon className="w-3 h-3" /> {v.label}
          </button>
        ))}
      </div>

      {viewMode === 'list' && (
        <div className="flex gap-2">
          {(['all', 'active', 'completed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1.5 rounded-full transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Add Task Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass rounded-2xl p-4 space-y-3 overflow-hidden">
            <Input placeholder="Task title" value={title} onChange={e => setTitle(e.target.value)} className="bg-secondary border-0" />
            <Textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="bg-secondary border-0 min-h-[60px]" />
            <div className="grid grid-cols-2 gap-2">
              <Select value={priority} onValueChange={(v: Task['priority']) => setPriority(v)}>
                <SelectTrigger className="bg-secondary border-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Project (optional)" value={projectInput} onChange={e => setProjectInput(e.target.value)} className="bg-secondary border-0" />
            </div>

            {/* Labels */}
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <Input placeholder="Add label..." value={labelInput} onChange={e => setLabelInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (labelInput.trim()) { setNewLabels([...newLabels, labelInput.trim()]); setLabelInput(''); } } }}
                  className="bg-secondary border-0 text-xs" />
              </div>
              {newLabels.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {newLabels.map((l, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: LABEL_COLORS[i % LABEL_COLORS.length] + '22', color: LABEL_COLORS[i % LABEL_COLORS.length] }}>
                      {l} <button onClick={() => setNewLabels(newLabels.filter((_, j) => j !== i))}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Subtasks */}
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground font-medium">Subtasks</span>
              {newSubtasks.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder={`Subtask ${i + 1}`} value={s} onChange={e => { const copy = [...newSubtasks]; copy[i] = e.target.value; setNewSubtasks(copy); }} className="bg-secondary border-0 text-xs" />
                  {newSubtasks.length > 1 && <Button size="sm" variant="ghost" onClick={() => setNewSubtasks(newSubtasks.filter((_, j) => j !== i))}><X className="w-3 h-3" /></Button>}
                </div>
              ))}
              <button onClick={() => setNewSubtasks([...newSubtasks, ''])} className="text-xs text-primary">+ Add subtask</button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Due Date</span></div>
              <DatePicker value={dueDate} onChange={setDueDate} placeholder="Select due date" className="bg-secondary border-0 w-full h-10 text-sm" />
            </div>
            <div className="space-y-2 bg-secondary/50 rounded-xl p-3">
              <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-primary" /><span className="text-xs font-semibold">Reminder & Alarm</span></div>
              <div className="grid grid-cols-2 gap-2">
                <DatePicker value={reminderDate} onChange={setReminderDate} placeholder="Date" className="bg-background border-0 w-full h-10 text-xs" />
                <TimePicker value={reminderTime} onChange={setReminderTime} placeholder="Time" className="bg-background border-0 w-full h-10 text-xs" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">🔔 Play alarm sound</span>
                <Switch checked={alarmEnabled} onCheckedChange={setAlarmEnabled} />
              </div>
              {alarmEnabled && (
                <div className="flex gap-1.5 flex-wrap">
                  {ALARM_SOUNDS.map(s => (
                    <button key={s.value} type="button" onClick={() => { setAlarmSound(s.value); previewAlarmSound(s.value); }}
                      className={`text-[10px] px-2.5 py-1.5 rounded-full transition-colors flex items-center gap-1 ${alarmSound === s.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                      <span>{s.emoji}</span> {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={addTask} className="flex-1" size="sm">Add Task</Button>
              <Button onClick={() => setShowAdd(false)} variant="ghost" size="sm"><X className="w-4 h-4" /></Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {filtered.length === 0 && !showAdd && (
            <EmptyState
              icon={CheckSquare}
              title="No tasks found"
              description="You have no tasks matching this filter, or your list is empty."
              actionLabel="Add Task"
              onAction={() => setShowAdd(true)}
            />
          )}

          {filtered.map(task => {
            const expanded = expandedId === task.id;
            const subtasksDone = (task.subtasks || []).filter(s => s.done).length;
            const subtasksTotal = (task.subtasks || []).length;
            return (
              <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl overflow-hidden">
                <div className="p-3 flex items-center gap-3">
                  <button onClick={() => toggle(task.id)} className="shrink-0">
                    {task.done ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0" onClick={() => setExpandedId(expanded ? null : task.id)}>
                    <span className={`text-sm ${task.done ? 'line-through text-muted-foreground' : 'font-medium'}`}>{task.title}</span>
                    <div className="flex gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: priorityColors[task.priority] + '22', color: priorityColors[task.priority] }}>{task.priority}</span>
                      {task.project && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">{task.project}</span>}
                      {task.dueDate && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground flex items-center gap-0.5"><CalendarDays className="w-3 h-3" /> {format(new Date(task.dueDate.includes('T') ? task.dueDate : task.dueDate + 'T00:00:00'), 'MMM d, yyyy')}</span>}
                      {(task.labels || []).map((l, i) => <span key={l} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: LABEL_COLORS[i % LABEL_COLORS.length] + '22', color: LABEL_COLORS[i % LABEL_COLORS.length] }}>{l}</span>)}
                      {subtasksTotal > 0 && <span className="text-[10px] text-muted-foreground">{subtasksDone}/{subtasksTotal} subtasks</span>}
                      {task.isExample && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">Example</span>}
                    </div>
                  </div>
                  <button onClick={() => setExpandedId(expanded ? null : task.id)} className="text-muted-foreground">
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button onClick={() => deleteTask(task.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
                {expanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-border/30 pt-3">
                    <div className="space-y-2">
                      <Input placeholder="Task title" value={task.title} onChange={e => updateTask(task.id, { title: e.target.value })} className="bg-secondary border-0 text-sm h-8" />
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={task.priority} onValueChange={(v: Task['priority']) => updateTask(task.id, { priority: v })}>
                          <SelectTrigger className="bg-secondary border-0 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input placeholder="Project" value={task.project || ''} onChange={e => updateTask(task.id, { project: e.target.value || undefined })} className="bg-secondary border-0 text-xs h-8" />
                      </div>
                    </div>
                    {subtasksTotal > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-muted-foreground font-medium">Subtasks</span>
                        {(task.subtasks || []).map(st => (
                          <button key={st.id} onClick={() => toggleSubtask(task.id, st.id)} className="flex items-center gap-2 w-full text-left">
                            {st.done ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
                            <span className={`text-xs ${st.done ? 'line-through text-muted-foreground' : ''}`}>{st.title}</span>
                          </button>
                        ))}
                        <SubtaskAdder onAdd={(t) => addSubtaskToTask(task.id, t)} />
                      </div>
                    )}
                    {subtasksTotal === 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-muted-foreground font-medium">Subtasks</span>
                        <SubtaskAdder onAdd={(t) => addSubtaskToTask(task.id, t)} />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1 mb-1"><StickyNote className="w-3 h-3 text-muted-foreground" /><span className="text-[10px] text-muted-foreground font-medium">Notes</span></div>
                      <Textarea placeholder="Add notes..." value={task.notes || ''} onChange={e => updateNotes(task.id, e.target.value)} className="bg-secondary border-0 min-h-[50px] text-xs" />
                    </div>
                    <div className="bg-secondary/50 rounded-xl p-2.5 space-y-2">
                      <div className="flex items-center gap-1"><Bell className="w-3 h-3 text-primary" /><span className="text-[10px] font-semibold">Reminder</span></div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <DatePicker value={task.reminderDate || ''} onChange={v => updateReminder(task.id, v, task.reminderTime || '', task.alarmEnabled)} placeholder="Date" className="bg-background border-0 w-full h-8 text-xs" />
                        <TimePicker value={task.reminderTime || ''} onChange={v => updateReminder(task.id, task.reminderDate || '', v, task.alarmEnabled)} placeholder="Time" className="bg-background border-0 w-full h-8 text-xs" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">🔔 Alarm sound</span>
                        <Switch checked={task.alarmEnabled} onCheckedChange={v => updateReminder(task.id, task.reminderDate || '', task.reminderTime || '', v)} />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* KANBAN VIEW with Drag & Drop */}
      {viewMode === 'kanban' && (
        <div className="space-y-4">
          {projects.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1"><FolderKanban className="w-3 h-3" /> Projects:</span>
              {projects.map(p => <span key={p} className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full">{p}</span>)}
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {kanbanColumns.map(col => {
              const colTasks = tasks.filter(t => (t.status || (t.done ? 'done' : 'todo')) === col.status);
              return (
                <div key={col.status}
                  ref={(el) => { if (el) columnRefsMap.current.set(col.status, el); }}
                  className={`space-y-2 rounded-xl p-1.5 transition-colors ${dragTaskId ? 'ring-1 ring-dashed ring-primary/20' : ''}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.status)}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                    <span className="text-[10px] font-semibold">{col.label}</span>
                    <span className="text-[10px] text-muted-foreground">({colTasks.length})</span>
                  </div>
                  <div className="space-y-1.5 min-h-[100px]">
                    {colTasks.map(task => (
                      <div key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        onTouchStart={(e) => handleTouchStart(e, task.id)}
                        onTouchMove={(e) => handleTouchMove(e)}
                        onTouchEnd={(e) => handleTouchEnd(e)}
                        className={`glass rounded-xl p-2 space-y-1 cursor-grab active:cursor-grabbing transition-all touch-none ${dragTaskId === task.id ? 'opacity-50 scale-95' : ''}`}
                      >
                        <div className="flex items-start gap-1">
                          <GripVertical className="w-3 h-3 text-muted-foreground/50 shrink-0 mt-0.5" />
                          <p className="text-[10px] font-medium leading-tight flex-1">{task.title}</p>
                        </div>
                        <div className="flex gap-1 flex-wrap pl-4">
                          <span className="text-[8px] px-1 py-0.5 rounded" style={{ background: priorityColors[task.priority] + '22', color: priorityColors[task.priority] }}>{task.priority}</span>
                          {task.project && <span className="text-[8px] px-1 py-0.5 rounded bg-primary/10 text-primary">{task.project}</span>}
                          {task.dueDate && <span className="text-[8px] text-muted-foreground">{format(new Date(task.dueDate.includes('T') ? task.dueDate : task.dueDate + 'T00:00:00'), 'MMM d')}</span>}
                          {(task.subtasks || []).length > 0 && (
                            <span className="text-[8px] text-muted-foreground">
                              {(task.subtasks || []).filter(s => s.done).length}/{(task.subtasks || []).length}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={() => {
              if (calendarView === 'monthly') setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1));
              else setCalendarMonth(addDays(calendarMonth, -7));
            }} className="text-xs text-muted-foreground">← Prev</button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{calendarView === 'monthly' ? format(calendarMonth, 'MMMM yyyy') : `Week of ${format(startOfWeek(calendarMonth), 'MMM d')}`}</span>
              <div className="flex gap-1">
                {(['weekly', 'monthly'] as const).map(v => (
                  <button key={v} onClick={() => setCalendarView(v)}
                    className={`text-[10px] px-2 py-0.5 rounded-full ${calendarView === v ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                    {v === 'weekly' ? 'W' : 'M'}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => {
              if (calendarView === 'monthly') setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1));
              else setCalendarMonth(addDays(calendarMonth, 7));
            }} className="text-xs text-muted-foreground">Next →</button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-[10px] text-muted-foreground text-center font-medium">{d}</div>)}
            {/* Offset for monthly */}
            {calendarView === 'monthly' && Array.from({ length: startOfMonth(calendarMonth).getDay() }).map((_, i) => <div key={`empty-${i}`} />)}
            {calendarDays.map(day => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const dayTasks = tasks.filter(t => t.dueDate === dayStr);
              const isToday = isSameDay(day, new Date());
              const minH = calendarView === 'weekly' ? 'min-h-[120px]' : 'min-h-[48px]';
              return (
                <div key={dayStr} className={`rounded-lg p-1 ${minH} ${isToday ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-secondary/30'}`}>
                  <p className={`text-[10px] text-center ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                    {calendarView === 'weekly' ? format(day, 'EEE d') : day.getDate()}
                  </p>
                  {dayTasks.slice(0, calendarView === 'weekly' ? 5 : 2).map(t => (
                    <div key={t.id} className="text-[7px] px-1 py-0.5 rounded mt-0.5 truncate" style={{ background: priorityColors[t.priority] + '22', color: priorityColors[t.priority] }}>
                      {t.done && '✓ '}{t.title}
                    </div>
                  ))}
                  {dayTasks.length > (calendarView === 'weekly' ? 5 : 2) && <p className="text-[7px] text-muted-foreground text-center">+{dayTasks.length - (calendarView === 'weekly' ? 5 : 2)}</p>}
                </div>
              );
            })}
          </div>
          {/* Unscheduled tasks indicator */}
          {(() => {
            const unscheduled = tasks.filter(t => !t.dueDate && !t.done).length;
            return unscheduled > 0 ? (
              <div className="text-[10px] text-muted-foreground text-center mt-2 bg-secondary/30 rounded-lg py-1.5">
                📋 {unscheduled} task{unscheduled !== 1 ? 's' : ''} without a due date (not shown above)
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* ANALYTICS VIEW */}
      {viewMode === 'analytics' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="glass rounded-xl p-3 text-center">
              <p className="text-lg font-bold">{completedCount}/{totalCount}</p>
              <p className="text-[10px] text-muted-foreground">Tasks Done</p>
              <Progress value={totalCount > 0 ? (completedCount / totalCount) * 100 : 0} className="h-1.5 mt-2" />
            </div>
            <div className="glass rounded-xl p-3 text-center">
              <p className="text-lg font-bold">{highPriorityDone}/{highPriorityTotal}</p>
              <p className="text-[10px] text-muted-foreground">High Priority</p>
              <Progress value={highPriorityTotal > 0 ? (highPriorityDone / highPriorityTotal) * 100 : 0} className="h-1.5 mt-2" />
            </div>
          </div>

          {/* Weekly chart */}
          <div className="glass rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-semibold">Weekly Productivity</h3>
            <div className="flex items-end gap-1 h-20">
              {weeklyProductivity.map(d => (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full rounded-t relative overflow-hidden" style={{ height: `${Math.max(4, (d.total / maxWeeklyProd) * 100)}%` }}>
                    <div className="absolute inset-0 bg-primary/30 rounded-t" />
                    <div className="absolute bottom-0 left-0 right-0 bg-success rounded-t" style={{ height: d.total > 0 ? `${(d.done / d.total) * 100}%` : '0' }} />
                  </div>
                  <span className="text-[9px] text-muted-foreground">{d.label}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-primary/30" /> Created</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-success" /> Done</span>
            </div>
          </div>

          <div className="glass rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-semibold">By Priority</h3>
            {(['high', 'medium', 'low'] as const).map(p => {
              const count = tasks.filter(t => t.priority === p).length;
              const done = tasks.filter(t => t.priority === p && t.done).length;
              return (
                <div key={p} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: priorityColors[p] }} />
                  <span className="text-xs flex-1 capitalize">{p}</span>
                  <span className="text-xs text-muted-foreground">{done}/{count}</span>
                </div>
              );
            })}
          </div>
          {projects.length > 0 && (
            <div className="glass rounded-2xl p-4 space-y-2">
              <h3 className="text-xs font-semibold">By Project</h3>
              {projects.map(p => {
                const count = tasks.filter(t => t.project === p).length;
                const done = tasks.filter(t => t.project === p && t.done).length;
                return (
                  <div key={p} className="flex items-center justify-between text-xs">
                    <span>{p}</span>
                    <span className="text-muted-foreground">{done}/{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function SubtaskAdder({ onAdd }: { onAdd: (title: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-2">
      <Input placeholder="New subtask..." value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { onAdd(val); setVal(''); } }}
        className="bg-secondary border-0 text-xs h-7" />
      <Button size="sm" variant="ghost" onClick={() => { onAdd(val); setVal(''); }} className="h-7 text-xs"><Plus className="w-3 h-3" /></Button>
    </div>
  );
}

function migrateExampleTasks(): Task[] {
  return exampleTasks.map(t => ({
    ...t,
    notes: t.notes ?? '',
    status: (t.done ? 'done' : 'todo') as TaskStatus,
    reminderDate: t.reminderDate ?? null,
    reminderTime: t.reminderTime ?? null,
    alarmEnabled: t.alarmEnabled ?? false,
    alarmFired: t.alarmFired ?? false,
  }));
}
