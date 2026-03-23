import { useState, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Goal, Milestone, AlarmSoundType } from '@/types';
import { exampleGoals } from '@/lib/examples';
import { ArrowLeft, Plus, Trash2, X, ChevronDown, ChevronUp, CheckCircle2, Circle, Target, TrendingUp, CalendarDays, Bell, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { DatePicker } from '@/components/DatePicker';
import { TimePicker } from '@/components/TimePicker';
import EmptyState from '@/components/EmptyState';
import { ALARM_SOUNDS, previewAlarmSound } from '@/lib/alarm';
import { toast } from 'sonner';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';

const categoryColors: Record<string, string> = {
  personal: 'hsl(245, 58%, 62%)',
  career: 'hsl(38, 92%, 50%)',
  health: 'hsl(152, 69%, 45%)',
  education: 'hsl(199, 89%, 48%)',
};

export default function Goals() {
  const navigate = useNavigate();
  const [hasInit] = useLocalStorage('goals_init', false);
  const [goals, setGoals] = useLocalStorage<Goal[]>('goals', hasInit ? [] : exampleGoals);
  const [, setInit] = useLocalStorage('goals_init', true);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Goal['category']>('personal');
  const [milestoneInputs, setMilestoneInputs] = useState<string[]>(['']);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Scheduling
  const [newDeadline, setNewDeadline] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [newAlarm, setNewAlarm] = useState(false);
  const [newAlarmSound, setNewAlarmSound] = useState<AlarmSoundType>('chime');
  const [showScheduleNew, setShowScheduleNew] = useState(false);
  // Editing
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<Goal['category']>('personal');
  const [editDeadline, setEditDeadline] = useState('');
  const [editReminderDate, setEditReminderDate] = useState('');
  const [editReminderTime, setEditReminderTime] = useState('');
  const [editAlarm, setEditAlarm] = useState(false);
  const [editAlarmSound, setEditAlarmSound] = useState<AlarmSoundType>('chime');
  const [showEditSchedule, setShowEditSchedule] = useState(false);

  if (!hasInit) setInit(true);

  const addGoal = () => {
    if (!title.trim()) return;
    const milestones: Milestone[] = milestoneInputs
      .filter(m => m.trim())
      .map(m => ({ id: crypto.randomUUID(), title: m.trim(), completed: false }));
    const goal: Goal = {
      id: crypto.randomUUID(), title: title.trim(), description, category,
      color: categoryColors[category], progress: 0, completed: false,
      milestones,
      deadlineDate: newDeadline || null,
      reminderDate: newReminderDate || null, reminderTime: newReminderTime || null,
      alarmEnabled: newAlarm, alarmSound: newAlarmSound, alarmFired: false,
      createdAt: new Date().toISOString(),
    };
    setGoals(prev => [goal, ...prev]);
    if (newReminderDate && newReminderTime) {
      toast.success(`⏰ Reminder set${newAlarm ? ' with alarm' : ''}`);
    }
    setTitle(''); setDescription(''); setMilestoneInputs(['']); setShowAdd(false);
    setNewDeadline(''); setNewReminderDate(''); setNewReminderTime(''); setNewAlarm(false); setNewAlarmSound('chime'); setShowScheduleNew(false);
  };

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates, alarmFired: updates.reminderDate !== undefined ? false : g.alarmFired } : g));
  };

  const startEditGoal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setEditTitle(goal.title);
    setEditDescription(goal.description || '');
    setEditCategory(goal.category);
    setEditDeadline(goal.deadlineDate || '');
    setEditReminderDate(goal.reminderDate || '');
    setEditReminderTime(goal.reminderTime || '');
    setEditAlarm(goal.alarmEnabled || false);
    setEditAlarmSound(goal.alarmSound || 'chime');
    setShowEditSchedule(false);
  };

  const saveEditGoal = () => {
    if (!editTitle.trim() || !editingGoalId) return;
    updateGoal(editingGoalId, {
      title: editTitle.trim(),
      description: editDescription,
      category: editCategory,
      color: categoryColors[editCategory],
      deadlineDate: editDeadline || null,
      reminderDate: editReminderDate || null,
      reminderTime: editReminderTime || null,
      alarmEnabled: editAlarm,
      alarmSound: editAlarmSound,
    });
    setEditingGoalId(null);
    toast.success('Goal updated');
  };

  const deleteGoal = (id: string) => {
    const backup = goals.find(g => g.id === id);
    const index = goals.findIndex(g => g.id === id);
    if (!backup) return;

    setGoals(prev => prev.filter(g => g.id !== id));
    toast.success('Goal deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          setGoals(prev => {
            const newGoals = [...prev];
            newGoals.splice(index, 0, backup);
            return newGoals;
          });
        }
      }
    });
  };
  const clearExamples = () => setGoals(prev => prev.filter(g => !g.isExample));

  const toggleMilestone = (goalId: string, milestoneId: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g;
      const milestones = (g.milestones || []).map(m =>
        m.id === milestoneId ? { ...m, completed: !m.completed } : m
      );
      const completedCount = milestones.filter(m => m.completed).length;
      const progress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : g.progress;
      const completed = progress === 100;
      return { ...g, milestones, progress, completed };
    }));
  };

  const addMilestoneToGoal = (goalId: string, title: string) => {
    if (!title.trim()) return;
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g;
      const milestones = [...(g.milestones || []), { id: crypto.randomUUID(), title: title.trim(), completed: false }];
      const completedCount = milestones.filter(m => m.completed).length;
      const progress = Math.round((completedCount / milestones.length) * 100);
      return { ...g, milestones, progress };
    }));
  };

  const deleteMilestone = (goalId: string, milestoneId: string) => {
    const backupGoal = goals.find(g => g.id === goalId);
    if (!backupGoal) return;
    const backupMilestone = (backupGoal.milestones || []).find(m => m.id === milestoneId);
    const mIndex = (backupGoal.milestones || []).findIndex(m => m.id === milestoneId);
    if (!backupMilestone) return;

    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g;
      const milestones = (g.milestones || []).filter(m => m.id !== milestoneId);
      const completedCount = milestones.filter(m => m.completed).length;
      const progress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;
      return { ...g, milestones, progress };
    }));

    toast.success('Milestone deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          setGoals(prev => prev.map(g => {
            if (g.id !== goalId) return g;
            const milestones = [...(g.milestones || [])];
            milestones.splice(mIndex, 0, backupMilestone);
            const completedCount = milestones.filter(m => m.completed).length;
            const progress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;
            return { ...g, milestones, progress };
          }));
        }
      }
    });
  };

  // Dashboard stats
  const activeGoals = goals.filter(g => !g.completed).length;
  const completedGoals = goals.filter(g => g.completed).length;
  const avgProgress = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="px-4 pt-12 pb-24 space-y-4">
      <PageOnboardingTooltips pageId="goals" />
      <div data-tour="goals-header" className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display flex-1">Goals</h1>
        <Button data-tour="add-btn" size="sm" onClick={() => setShowAdd(!showAdd)} variant="ghost"><Plus className="w-5 h-5" /></Button>
      </div>

      {/* Dashboard Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass rounded-xl p-3 text-center">
          <Target className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold">{activeGoals}</p>
          <p className="text-[10px] text-muted-foreground">Active</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <CheckCircle2 className="w-4 h-4 text-success mx-auto mb-1" />
          <p className="text-lg font-bold">{completedGoals}</p>
          <p className="text-[10px] text-muted-foreground">Done</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <TrendingUp className="w-4 h-4 text-info mx-auto mb-1" />
          <p className="text-lg font-bold">{avgProgress}%</p>
          <p className="text-[10px] text-muted-foreground">Avg</p>
        </div>
      </div>

      {goals.some(g => g.isExample) && (
        <button onClick={clearExamples} className="text-xs text-muted-foreground underline">Clear all examples</button>
      )}

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass rounded-2xl p-4 space-y-3 overflow-hidden">
            <Input placeholder="Goal title" value={title} onChange={e => setTitle(e.target.value)} className="bg-secondary border-0" />
            <Textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="bg-secondary border-0" />
            <Select value={category} onValueChange={(v: Goal['category']) => setCategory(v)}>
              <SelectTrigger className="bg-secondary border-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="career">Career</SelectItem>
                <SelectItem value="health">Health</SelectItem>
                <SelectItem value="education">Education</SelectItem>
              </SelectContent>
            </Select>
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">Milestones</span>
              {milestoneInputs.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder={`Milestone ${i + 1}`} value={m} onChange={e => {
                    const copy = [...milestoneInputs];
                    copy[i] = e.target.value;
                    setMilestoneInputs(copy);
                  }} className="bg-secondary border-0 text-xs" />
                  {milestoneInputs.length > 1 && (
                    <Button size="sm" variant="ghost" onClick={() => setMilestoneInputs(milestoneInputs.filter((_, j) => j !== i))}><X className="w-3 h-3" /></Button>
                  )}
                </div>
              ))}
              <button onClick={() => setMilestoneInputs([...milestoneInputs, ''])} className="text-xs text-primary">+ Add milestone</button>
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={() => setShowScheduleNew(!showScheduleNew)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${showScheduleNew ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                <CalendarDays className="w-4 h-4" />
              </button>
              <span className="text-[10px] text-muted-foreground">Set deadline & reminder</span>
            </div>
            {showScheduleNew && (
              <div className="glass rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 text-info" />
                  <span className="text-xs font-medium">Deadline</span>
                </div>
                <DatePicker value={newDeadline} onChange={setNewDeadline} placeholder="Deadline date" className="bg-secondary border-0 w-full h-10 text-xs" />
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
                      <button key={s.value} type="button" onClick={() => { setNewAlarmSound(s.value); previewAlarmSound(s.value); }}
                        className={`text-[10px] px-2.5 py-1.5 rounded-full transition-colors flex items-center gap-1 ${newAlarmSound === s.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                        <span>{s.emoji}</span> {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={addGoal} className="flex-1" size="sm">Add Goal</Button>
              <Button onClick={() => setShowAdd(false)} variant="ghost" size="sm"><X className="w-4 h-4" /></Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {goals.length === 0 && !showAdd && (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Create your first goal to start tracking milestones."
          actionLabel="Create Goal"
          onAction={() => setShowAdd(true)}
        />
      )}

      <div className="space-y-3">
        {goals.map(goal => {
          const expanded = expandedId === goal.id;
          const milestones = goal.milestones || [];
          return (
            <motion.div key={goal.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl overflow-hidden">
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${goal.completed ? 'line-through text-muted-foreground' : ''}`}>{goal.title}</span>
                      {goal.isExample && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">Example</span>}
                      {goal.completed && <span className="text-[10px] bg-success/20 text-success px-1.5 py-0.5 rounded-full">✓ Done</span>}
                    </div>
                    {goal.description && <p className="text-xs text-muted-foreground mt-1">{goal.description}</p>}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: categoryColors[goal.category] + '22', color: categoryColors[goal.category] }}>
                        {goal.category}
                      </span>
                      {goal.deadlineDate && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-info/15 text-info flex items-center gap-0.5">
                          <CalendarDays className="w-3 h-3" /> {goal.deadlineDate}
                        </span>
                      )}
                      {goal.reminderDate && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary flex items-center gap-0.5">
                          {goal.alarmEnabled ? <Bell className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {goal.reminderTime || ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEditGoal(goal)} className="text-muted-foreground p-1 hover:text-primary transition-colors">
                      <Plus className="w-4 h-4 rotate-45 scale-75" /> Edit
                    </button>
                    <button onClick={() => setExpandedId(expanded ? null : goal.id)} className="text-muted-foreground p-1">
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button onClick={() => deleteGoal(goal.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-muted-foreground">{milestones.filter(m => m.completed).length}/{milestones.length || '—'} milestones</span>
                    <span className="font-medium">{goal.progress}%</span>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                </div>

                {/* Edit Form */}
                <AnimatePresence>
                  {editingGoalId === goal.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pt-3 space-y-3 border-t border-border/30 mt-3 overflow-hidden">
                      <Input placeholder="Goal title" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="bg-secondary border-0 text-sm" />
                      <Textarea placeholder="Description" value={editDescription} onChange={e => setEditDescription(e.target.value)} className="bg-secondary border-0 text-xs" />
                      <Select value={editCategory} onValueChange={(v: Goal['category']) => setEditCategory(v)}>
                        <SelectTrigger className="bg-secondary border-0 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personal">Personal</SelectItem>
                          <SelectItem value="career">Career</SelectItem>
                          <SelectItem value="health">Health</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex gap-2 items-center">
                        <button onClick={() => setShowEditSchedule(!showEditSchedule)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${showEditSchedule ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                          <CalendarDays className="w-4 h-4" />
                        </button>
                        <span className="text-[10px] text-muted-foreground">Edit deadline & reminder</span>
                      </div>

                      {showEditSchedule && (
                        <div className="bg-secondary/30 rounded-xl p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-3 h-3 text-info" />
                            <span className="text-[10px] font-medium">Deadline</span>
                          </div>
                          <DatePicker value={editDeadline} onChange={setEditDeadline} placeholder="Deadline date" className="bg-secondary border-0 w-full h-8 text-[10px]" />

                          <div className="flex items-center gap-2 mt-1">
                            <Bell className="w-3 h-3 text-primary" />
                            <span className="text-[10px] font-medium">Reminder</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <DatePicker value={editReminderDate} onChange={setEditReminderDate} placeholder="Date" className="bg-secondary border-0 w-full h-8 text-[10px]" />
                            <TimePicker value={editReminderTime} onChange={setEditReminderTime} placeholder="Time" className="bg-secondary border-0 w-full h-8 text-[10px]" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-muted-foreground">🔔 Alarm sound</span>
                            <Switch checked={editAlarm} onCheckedChange={setEditAlarm} className="scale-75" />
                          </div>
                          {editAlarm && (
                            <div className="flex gap-1 flex-wrap">
                              {ALARM_SOUNDS.map(s => (
                                <button key={s.value} type="button" onClick={() => { setEditAlarmSound(s.value); previewAlarmSound(s.value); }}
                                  className={`text-[9px] px-2 py-1 rounded-full transition-colors ${editAlarmSound === s.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                                  {s.emoji} {s.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button onClick={saveEditGoal} size="sm" className="flex-1 text-xs h-8">Save Changes</Button>
                        <Button onClick={() => setEditingGoalId(null)} variant="ghost" size="sm" className="text-xs h-8">Cancel</Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Expanded: Milestones */}
              {expanded && (
                <div className="px-4 pb-4 space-y-2 border-t border-border/30 pt-3">
                  {milestones.length === 0 && <p className="text-xs text-muted-foreground">No milestones yet. Add some below!</p>}
                  {milestones.map(m => (
                    <div key={m.id} className="flex items-center gap-2 group">
                      <button onClick={() => toggleMilestone(goal.id, m.id)}>
                        {m.completed ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      <span className={`text-xs flex-1 ${m.completed ? 'line-through text-muted-foreground' : ''}`}>{m.title}</span>
                      <button onClick={() => deleteMilestone(goal.id, m.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <MilestoneAdder onAdd={(t) => addMilestoneToGoal(goal.id, t)} />
                </div>
              )}
            </motion.div>
          );
        })
        }
      </div >
    </motion.div >
  );
}

function MilestoneAdder({ onAdd }: { onAdd: (title: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-2 mt-1">
      <Input placeholder="New milestone..." value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { onAdd(val); setVal(''); } }}
        className="bg-secondary border-0 text-xs h-8" />
      <Button size="sm" variant="ghost" onClick={() => { onAdd(val); setVal(''); }} className="h-8 text-xs"><Plus className="w-3 h-3" /></Button>
    </div>
  );
}
