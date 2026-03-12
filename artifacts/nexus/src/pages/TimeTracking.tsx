import { useState, useEffect, useRef, useMemo } from 'react';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TimeEntry, TimeProject, AlarmSoundType } from '@/types';
import { exampleTimeEntries } from '@/lib/examples';
import { ArrowLeft, Plus, X, Play, Square, Clock, BarChart3, Receipt, FolderKanban, Trash2, Bell, Calendar, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import EmptyState from '@/components/EmptyState';
import { ALARM_SOUNDS, previewAlarmSound, playAlarmSound } from '@/lib/alarm';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, addDays } from 'date-fns';

const CATEGORY_SUGGESTIONS = ['Work', 'Meeting', 'Design', 'Development', 'Research', 'Admin', 'Communication', 'Planning', 'Break'];

export default function TimeTracking() {
  const navigate = useNavigate();
  const [hasInit] = useLocalStorage('time_init', false);
  const [entries, setEntries] = useLocalStorage<TimeEntry[]>('timeEntries', hasInit ? [] : exampleTimeEntries);
  const [projects, setProjects] = useLocalStorage<TimeProject[]>('timeProjects', []);
  const [, setInit] = useLocalStorage('time_init', true);
  const [showAdd, setShowAdd] = useState(false);
  const [showProjectAdd, setShowProjectAdd] = useState(false);
  const [activity, setActivity] = useState('');
  const [manualDuration, setManualDuration] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Work');
  const [billable, setBillable] = useState(false);
  const [timerActivity, setTimerActivity] = useState('');
  const [timerProject, setTimerProject] = useState('');
  const [timerCategory, setTimerCategory] = useState('Work');
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [view, setView] = useState<'entries' | 'reports' | 'invoice' | 'calendar'>('entries');
  const [reportRange, setReportRange] = useState<'weekly' | 'monthly'>('weekly');
  const [projectName, setProjectName] = useState('');
  const [projectRate, setProjectRate] = useState('');
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [alarmSound, setAlarmSound] = useState<AlarmSoundType>('chime');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Editing
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editActivity, setEditActivity] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editProject, setEditProject] = useState('');
  const [editCategory, setEditCategory] = useState('Work');
  const [editBillable, setEditBillable] = useState(false);

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjName, setEditProjName] = useState('');
  const [editProjRate, setEditProjRate] = useState('');
  const [showProjectsList, setShowProjectsList] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const idleRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const lastActivityRef = useRef(Date.now());

  if (!hasInit) setInit(true);

  // Timer
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
      return () => clearInterval(intervalRef.current);
    }
  }, [timerRunning]);

  // Idle detection
  useEffect(() => {
    if (!timerRunning) return;
    const onActivity = () => { lastActivityRef.current = Date.now(); setIdleSeconds(0); };
    window.addEventListener('mousemove', onActivity);
    window.addEventListener('keydown', onActivity);
    idleRef.current = setInterval(() => {
      const idle = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      setIdleSeconds(idle);
      if (idle >= 300) toast.warning('⏸️ Idle detected — still working?');
    }, 30000);
    return () => {
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      clearInterval(idleRef.current);
    };
  }, [timerRunning]);

  const timerStateRef = useRef({ timerRunning, timerSeconds, timerActivity, timerProject, timerCategory, projects, alarmEnabled, alarmSound });
  useEffect(() => {
    timerStateRef.current = { timerRunning, timerSeconds, timerActivity, timerProject, timerCategory, projects, alarmEnabled, alarmSound };
  }, [timerRunning, timerSeconds, timerActivity, timerProject, timerCategory, projects, alarmEnabled, alarmSound]);

  useEffect(() => {
    return () => {
      const state = timerStateRef.current;
      if (state.timerRunning && state.timerSeconds > 0) {
        const activityName = state.timerActivity.trim() || 'Untitled Activity';
        const proj = state.projects.find(p => p.id === state.timerProject);
        const duration = Math.max(1, Math.round(state.timerSeconds / 60));

        setEntries(prev => [{
          id: crypto.randomUUID(), activity: activityName,
          duration: duration, category: state.timerCategory,
          date: new Date().toISOString(), project: proj?.name,
          hourlyRate: proj?.hourlyRate, billable: !!proj,
          createdAt: new Date().toISOString(),
        }, ...prev]);
      }
    };
  }, [setEntries]);

  const stopTimer = () => {
    setTimerRunning(false);
    clearInterval(intervalRef.current);
    if (timerSeconds > 0) {
      const activityName = timerActivity.trim() || 'Untitled Activity';
      const proj = projects.find(p => p.id === timerProject);
      const duration = Math.max(1, Math.round(timerSeconds / 60));
      setEntries(prev => [{
        id: crypto.randomUUID(), activity: activityName,
        duration: duration, category: timerCategory,
        date: new Date().toISOString(), project: proj?.name,
        hourlyRate: proj?.hourlyRate, billable: !!proj,
        createdAt: new Date().toISOString(),
      }, ...prev]);
      if (alarmEnabled) playAlarmSound(alarmSound);
      toast.success(`⏱️ Tracked ${duration} min for "${activityName}"`);
    }
    setTimerSeconds(0); setTimerActivity(''); setTimerProject(''); setTimerCategory('Work');
  };

  const addManual = () => {
    if (!activity.trim() || !manualDuration) return;
    const proj = projects.find(p => p.id === selectedProject);
    setEntries(prev => [{
      id: crypto.randomUUID(), activity: activity.trim(),
      duration: parseInt(manualDuration), category: selectedCategory,
      date: new Date().toISOString(), project: proj?.name,
      hourlyRate: proj?.hourlyRate, billable: billable,
      createdAt: new Date().toISOString(),
    }, ...prev]);
    setActivity(''); setManualDuration(''); setSelectedProject(''); setBillable(false); setSelectedCategory('Work'); setShowAdd(false);
  };

  const addProject = () => {
    if (!projectName.trim()) return;
    setProjects(prev => [...prev, {
      id: crypto.randomUUID(), name: projectName.trim(),
      color: `hsl(${Math.random() * 360}, 60%, 55%)`,
      hourlyRate: parseFloat(projectRate) || 0,
      createdAt: new Date().toISOString(),
    }]);
    setProjectName(''); setProjectRate(''); setShowProjectAdd(false);
  };

  const deleteEntry = (id: string) => {
    const backup = entries.find(e => e.id === id);
    const index = entries.findIndex(e => e.id === id);
    if (!backup) return;

    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success('Entry deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          setEntries(prev => {
            const newEntries = [...prev];
            newEntries.splice(index, 0, backup);
            return newEntries;
          });
        }
      }
    });
  };

  const startEditEntry = (e: TimeEntry) => {
    setEditingEntryId(e.id);
    setEditActivity(e.activity);
    setEditDuration(e.duration.toString());
    const proj = projects.find(p => p.name === e.project);
    setEditProject(proj?.id || '');
    setEditCategory(e.category);
    setEditBillable(e.billable || false);
  };

  const saveEditEntry = () => {
    if (!editActivity.trim() || !editingEntryId) return;
    const proj = projects.find(p => p.id === editProject);
    setEntries(prev => prev.map(e => e.id === editingEntryId ? {
      ...e,
      activity: editActivity.trim(),
      duration: parseInt(editDuration) || 0,
      category: editCategory,
      project: proj?.name,
      hourlyRate: proj?.hourlyRate,
      billable: editBillable
    } : e));
    setEditingEntryId(null);
    toast.success('Entry updated');
  };

  const startEditProject = (p: TimeProject) => {
    setEditingProjectId(p.id);
    setEditProjName(p.name);
    setEditProjRate(p.hourlyRate?.toString() || '0');
  };

  const saveEditProject = () => {
    if (!editProjName.trim() || !editingProjectId) return;
    setProjects(prev => prev.map(p => p.id === editingProjectId ? {
      ...p,
      name: editProjName.trim(),
      hourlyRate: parseFloat(editProjRate) || 0
    } : p));
    setEditingProjectId(null);
    toast.success('Project updated');
  };

  const deleteProject = (id: string) => {
    const backup = projects.find(p => p.id === id);
    const index = projects.findIndex(p => p.id === id);
    if (!backup) return;

    setProjects(prev => prev.filter(p => p.id !== id));
    toast.success('Project deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          setProjects(prev => {
            const newProjects = [...prev];
            newProjects.splice(index, 0, backup);
            return newProjects;
          });
        }
      }
    });
  };

  const totalMinutes = entries.reduce((s, e) => s + e.duration, 0);
  const billableMinutes = entries.filter(e => e.billable).reduce((s, e) => s + e.duration, 0);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  // Report data (weekly or monthly)
  const reportData = useMemo(() => {
    const now = new Date();
    const days: { label: string; minutes: number; billable: number }[] = [];
    const count = reportRange === 'weekly' ? 7 : 30;
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const dayEntries = entries.filter(e => e.date.startsWith(dayStr));
      days.push({
        label: reportRange === 'weekly' ? d.toLocaleDateString('en', { weekday: 'short' }) : d.getDate().toString(),
        minutes: dayEntries.reduce((s, e) => s + e.duration, 0),
        billable: dayEntries.filter(e => e.billable).reduce((s, e) => s + e.duration, 0),
      });
    }
    return days;
  }, [entries, reportRange]);

  const maxReport = Math.max(...reportData.map(d => d.minutes), 1);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    entries.forEach(e => { map[e.category] = (map[e.category] || 0) + e.duration; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  // Project breakdown
  const projectBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    entries.forEach(e => { const p = e.project || 'Unassigned'; map[p] = (map[p] || 0) + e.duration; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  // Invoice calculation
  const invoiceData = useMemo(() => {
    const byProject: Record<string, { minutes: number; rate: number }> = {};
    entries.filter(e => e.billable && e.project).forEach(e => {
      if (!byProject[e.project!]) byProject[e.project!] = { minutes: 0, rate: e.hourlyRate || 0 };
      byProject[e.project!].minutes += e.duration;
    });
    return Object.entries(byProject).map(([name, data]) => ({
      project: name, hours: (data.minutes / 60).toFixed(1), rate: data.rate, total: (data.minutes / 60) * data.rate,
    }));
  }, [entries]);

  const invoiceTotal = invoiceData.reduce((s, i) => s + i.total, 0);

  // Calendar data
  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(calendarMonth), end: endOfMonth(calendarMonth) });
  }, [calendarMonth]);

  // Smart category suggestion based on activity text
  const suggestCategory = (text: string) => {
    const lower = text.toLowerCase();
    if (/meet|call|standup|sync/i.test(lower)) return 'Meeting';
    if (/design|figma|ui|ux/i.test(lower)) return 'Design';
    if (/code|dev|bug|fix|build|deploy/i.test(lower)) return 'Development';
    if (/research|read|learn|study/i.test(lower)) return 'Research';
    if (/email|slack|chat|message/i.test(lower)) return 'Communication';
    if (/plan|roadmap|sprint/i.test(lower)) return 'Planning';
    if (/admin|invoice|report/i.test(lower)) return 'Admin';
    return 'Work';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="px-4 pt-12 pb-24 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display flex-1" data-tour="time-header">Time Tracking</h1>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)} variant="ghost"><Plus className="w-5 h-5" /></Button>
      </div>

      <PageOnboardingTooltips pageId="time-tracking" />

      {/* Timer */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <Input placeholder="What are you working on?" value={timerActivity}
          onChange={e => { setTimerActivity(e.target.value); if (!timerRunning) setTimerCategory(suggestCategory(e.target.value)); }}
          className="bg-secondary border-0" disabled={timerRunning} />
        <div className="flex gap-2">
          {!timerRunning && (
            <Select value={timerCategory} onValueChange={setTimerCategory}>
              <SelectTrigger className="bg-secondary border-0 text-xs flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORY_SUGGESTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {projects.length > 0 && !timerRunning && (
            <Select value={timerProject} onValueChange={setTimerProject}>
              <SelectTrigger className="bg-secondary border-0 text-xs flex-1"><SelectValue placeholder="Project" /></SelectTrigger>
              <SelectContent>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (${p.hourlyRate}/hr)</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold font-display">{String(Math.floor(timerSeconds / 3600)).padStart(2, '0')}:{String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, '0')}:{String(timerSeconds % 60).padStart(2, '0')}</span>
            {timerRunning && idleSeconds > 60 && (
              <p className="text-[10px] text-warning mt-0.5">⏸️ Idle for {Math.floor(idleSeconds / 60)}m</p>
            )}
          </div>
          {timerRunning ? (
            <button onClick={stopTimer} className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center"><Square className="w-5 h-5 text-destructive" /></button>
          ) : (
            <button onClick={() => { if (!timerActivity.trim()) setTimerActivity('Untitled Activity'); setTimerRunning(true); }} className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center"><Play className="w-5 h-5 text-success ml-0.5" /></button>
          )}
        </div>
        {/* Alarm setting for timer stop */}
        {!timerRunning && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Bell className="w-3 h-3" /> Alarm when stopped</span>
            <div className="flex items-center gap-2">
              <Switch checked={alarmEnabled} onCheckedChange={setAlarmEnabled} />
              {alarmEnabled && (
                <Select value={alarmSound} onValueChange={(v: AlarmSoundType) => { setAlarmSound(v); previewAlarmSound(v); }}>
                  <SelectTrigger className="bg-secondary border-0 text-[10px] h-6 w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALARM_SOUNDS.map(s => <SelectItem key={s.value} value={s.value}>{s.emoji} {s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="glass rounded-xl p-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <div>
            <span className="text-sm font-semibold">{hrs}h {mins}m</span>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
        </div>
        <div className="glass rounded-xl p-3 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-success" />
          <div>
            <span className="text-sm font-semibold">{Math.floor(billableMinutes / 60)}h {billableMinutes % 60}m</span>
            <p className="text-[10px] text-muted-foreground">Billable</p>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-1.5 overflow-x-auto">
        {[
          { key: 'entries', label: 'Entries', icon: Clock },
          { key: 'reports', label: 'Reports', icon: BarChart3 },
          { key: 'calendar', label: 'Calendar', icon: Calendar },
          { key: 'invoice', label: 'Invoice', icon: Receipt },
        ].map(tab => (
          <button key={tab.key} onClick={() => setView(tab.key as typeof view)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${view === tab.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Projects Manager */}
      <div className="flex items-center justify-between">
        <button onClick={() => setShowProjectsList(!showProjectsList)} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors">
          <FolderKanban className="w-3 h-3" /> {projects.length} projects {showProjectsList ? '↑' : '↓'}
        </button>
        <button onClick={() => setShowProjectAdd(!showProjectAdd)} className="text-xs text-primary">+ Project</button>
      </div>

      <AnimatePresence>
        {showProjectsList && projects.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
            {projects.map(p => (
              <div key={p.id} className="glass rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">${p.hourlyRate}/hr</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEditProject(p)} className="text-[10px] text-primary">Edit</button>
                  <button onClick={() => deleteProject(p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingProjectId && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass rounded-xl p-3 space-y-2 overflow-hidden border-primary/20">
            <Input placeholder="Project name" value={editProjName} onChange={e => setEditProjName(e.target.value)} className="bg-secondary border-0 text-xs" />
            <Input type="number" placeholder="Rate ($)" value={editProjRate} onChange={e => setEditProjRate(e.target.value)} className="bg-secondary border-0 text-xs" />
            <div className="flex gap-2">
              <Button onClick={saveEditProject} size="sm" className="text-xs flex-1">Save Project</Button>
              <Button onClick={() => setEditingProjectId(null)} size="sm" variant="ghost">Cancel</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProjectAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass rounded-xl p-3 space-y-2 overflow-hidden">
            <Input placeholder="Project name" value={projectName} onChange={e => setProjectName(e.target.value)} className="bg-secondary border-0 text-xs" />
            <Input type="number" placeholder="Hourly rate ($)" value={projectRate} onChange={e => setProjectRate(e.target.value)} className="bg-secondary border-0 text-xs" />
            <div className="flex gap-2">
              <Button onClick={addProject} size="sm" className="text-xs flex-1">Add</Button>
              <Button onClick={() => setShowProjectAdd(false)} size="sm" variant="ghost"><X className="w-3 h-3" /></Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Add */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass rounded-2xl p-4 space-y-3 overflow-hidden">
            <Input placeholder="Activity" value={activity}
              onChange={e => { setActivity(e.target.value); setSelectedCategory(suggestCategory(e.target.value)); }}
              className="bg-secondary border-0" />
            <Input type="number" placeholder="Duration (minutes)" value={manualDuration} onChange={e => setManualDuration(e.target.value)} className="bg-secondary border-0" />
            <div className="grid grid-cols-2 gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-secondary border-0 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_SUGGESTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {projects.length > 0 && (
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="bg-secondary border-0 text-xs"><SelectValue placeholder="Project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={billable} onChange={e => setBillable(e.target.checked)} className="rounded" /> Billable
            </label>
            <div className="flex gap-2">
              <Button onClick={addManual} className="flex-1" size="sm">Add Entry</Button>
              <Button onClick={() => setShowAdd(false)} variant="ghost" size="sm"><X className="w-4 h-4" /></Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ENTRIES VIEW */}
      {view === 'entries' && (
        <div className="space-y-2">
          {entries.length === 0 && !showAdd && !timerRunning && (
            <EmptyState
              icon={Clock}
              title="No time entries"
              description="Start the timer or manually log an entry to track your time."
              actionLabel="Add Entry"
              onAction={() => setShowAdd(true)}
            />
          )}
          {entries.map(entry => (
            <motion.div key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{entry.activity}</span>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full text-muted-foreground">{entry.category}</span>
                    {entry.project && <span className="text-[10px] text-primary">{entry.project}</span>}
                    {entry.billable && <span className="text-[10px] text-success">💰</span>}
                    {entry.isExample && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">Example</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-muted-foreground">{entry.duration >= 60 ? `${Math.floor(entry.duration / 60)}h ${entry.duration % 60}m` : `${entry.duration}m`}</span>
                  {entry.hourlyRate ? <p className="text-[10px] text-success">${((entry.duration / 60) * entry.hourlyRate).toFixed(2)}</p> : null}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEditEntry(entry)} className="text-muted-foreground hover:text-primary"><Plus className="w-3.5 h-3.5 rotate-45" /></button>
                  <button onClick={() => deleteEntry(entry.id)} className="text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              <AnimatePresence>
                {editingEntryId === entry.id && (
                  <div className="pt-2 space-y-2 border-t border-border/30">
                    <Input placeholder="Activity" value={editActivity} onChange={e => setEditActivity(e.target.value)} className="bg-secondary border-0 text-xs h-8" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" placeholder="Mins" value={editDuration} onChange={e => setEditDuration(e.target.value)} className="bg-secondary border-0 text-xs h-8" />
                      <Select value={editCategory} onValueChange={setEditCategory}>
                        <SelectTrigger className="bg-secondary border-0 text-[10px] h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORY_SUGGESTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Select value={editProject} onValueChange={setEditProject}>
                        <SelectTrigger className="bg-secondary border-0 text-[10px] h-8 flex-1"><SelectValue placeholder="No project" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No project</SelectItem>
                          {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0">
                        <input type="checkbox" checked={editBillable} onChange={e => setEditBillable(e.target.checked)} className="rounded scale-75" /> Billable
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveEditEntry} size="sm" className="text-xs h-7 flex-1">Save</Button>
                      <Button onClick={() => setEditingEntryId(null)} size="sm" variant="ghost" className="text-xs h-7">Cancel</Button>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* REPORTS VIEW */}
      {view === 'reports' && (
        <div className="space-y-4">
          <div className="flex gap-1.5">
            {(['weekly', 'monthly'] as const).map(r => (
              <button key={r} onClick={() => setReportRange(r)}
                className={`text-xs px-3 py-1 rounded-full ${reportRange === r ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          <div className="glass rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-semibold">{reportRange === 'weekly' ? 'Weekly' : 'Monthly'} Activity</h2>
            <div className="flex items-end gap-[2px] h-32">
              {reportData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full rounded-t relative overflow-hidden" style={{ height: `${Math.max(2, (d.minutes / maxReport) * 100)}%` }}>
                    <div className="absolute inset-0 bg-primary rounded-t" />
                    {d.billable > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-success rounded-t" style={{ height: `${(d.billable / d.minutes) * 100}%` }} />
                    )}
                  </div>
                  {reportRange === 'weekly' && <span className="text-[9px] text-muted-foreground">{d.label}</span>}
                </div>
              ))}
            </div>
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-primary" /> Total</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-success" /> Billable</span>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="glass rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-semibold">Category Breakdown</h2>
            {categoryBreakdown.map(([name, catMins]) => (
              <div key={name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{name}</span>
                  <span className="text-muted-foreground">{Math.floor(catMins / 60)}h {catMins % 60}m</span>
                </div>
                <Progress value={(catMins / totalMinutes) * 100} className="h-1.5" />
              </div>
            ))}
          </div>

          <div className="glass rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-semibold">Project Breakdown</h2>
            {projectBreakdown.map(([name, projMins]) => (
              <div key={name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{name}</span>
                  <span className="text-muted-foreground">{Math.floor(projMins / 60)}h {projMins % 60}m</span>
                </div>
                <Progress value={(projMins / totalMinutes) * 100} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CALENDAR VIEW */}
      {view === 'calendar' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))} className="text-xs text-muted-foreground">← Prev</button>
            <span className="text-sm font-semibold">{format(calendarMonth, 'MMMM yyyy')}</span>
            <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))} className="text-xs text-muted-foreground">Next →</button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-[10px] text-muted-foreground text-center font-medium">{d}</div>)}
            {Array.from({ length: startOfMonth(calendarMonth).getDay() }).map((_, i) => <div key={`e-${i}`} />)}
            {calendarDays.map(day => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const dayEntries = entries.filter(e => e.date.startsWith(dayStr));
              const dayMins = dayEntries.reduce((s, e) => s + e.duration, 0);
              const isToday = isSameDay(day, new Date());
              const intensity = Math.min(1, dayMins / 240); // Max 4hrs = full intensity
              return (
                <div key={dayStr} className={`rounded-lg p-1 min-h-[48px] ${isToday ? 'ring-1 ring-primary/30' : ''}`}
                  style={{ background: dayMins > 0 ? `hsl(var(--primary) / ${0.1 + intensity * 0.3})` : 'hsl(var(--secondary) / 0.3)' }}>
                  <p className={`text-[10px] text-center ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>{day.getDate()}</p>
                  {dayMins > 0 && (
                    <p className="text-[8px] text-center text-primary font-medium mt-0.5">
                      {dayMins >= 60 ? `${Math.floor(dayMins / 60)}h${dayMins % 60 > 0 ? ` ${dayMins % 60}m` : ''}` : `${dayMins}m`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* INVOICE VIEW */}
      {view === 'invoice' && (
        <div className="glass rounded-2xl p-4 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Receipt className="w-4 h-4 text-success" /> Invoice Summary</h2>
          {invoiceData.length === 0 ? (
            <p className="text-xs text-muted-foreground">No billable entries yet. Add projects with hourly rates and mark entries as billable.</p>
          ) : (
            <>
              <div className="space-y-2">
                {invoiceData.map(item => (
                  <div key={item.project} className="flex items-center justify-between text-xs bg-secondary/50 rounded-lg p-2">
                    <div>
                      <span className="font-medium">{item.project}</span>
                      <p className="text-[10px] text-muted-foreground">{item.hours}h × ${item.rate}/hr</p>
                    </div>
                    <span className="font-semibold">${item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
                <span>Total</span>
                <span className="text-success">${invoiceTotal.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
