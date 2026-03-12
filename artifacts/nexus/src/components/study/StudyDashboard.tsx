import { useMemo } from 'react';
import { StudySession, StudyMaterial, StudyNote, StudyTimeLog } from '@/types';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { BookOpen, Video, FileText, StickyNote, Timer, GraduationCap, Trash2, TrendingUp, Sparkles } from 'lucide-react';
import { getLocalStorage } from '@/hooks/useLocalStorage';
import type { SavedAISummary } from '@/components/AISummarizer';
import { motion } from 'framer-motion';
import { format, subDays, parseISO, isWithinInterval, startOfDay } from 'date-fns';

const COLORS = [
  'hsl(245, 58%, 62%)', 'hsl(152, 69%, 45%)', 'hsl(38, 92%, 50%)',
  'hsl(199, 89%, 48%)', 'hsl(340, 82%, 52%)', 'hsl(291, 64%, 42%)',
];

interface Props {
  sessions: StudySession[];
  materials: StudyMaterial[];
  notes: StudyNote[];
  timeLogs: StudyTimeLog[];
  onDeleteLog?: (id: string) => void;
}

export default function StudyDashboard({ sessions, materials, notes, timeLogs, onDeleteLog }: Props) {
  const totalStudyMin = timeLogs.reduce((s, l) => s + l.durationMinutes, 0);
  const completedSessions = sessions.filter(s => s.completed).length;
  const totalMaterials = materials.length;
  const totalNotes = notes.length;
  const allSummaries = getLocalStorage<SavedAISummary[]>('aiSummaries', []);
  const materialIds = materials.map(m => m.id);
  const totalAISummaries = allSummaries.filter(s => materialIds.includes(s.documentId)).length;

  const materialsByType = useMemo(() => {
    const types: Record<string, number> = {};
    materials.forEach(m => {
      const label = m.category === 'lecture-slides' ? 'Slides' : m.category === 'video' ? 'Videos' : m.category === 'sheet' ? 'Sheets' : 'Books';
      types[label] = (types[label] || 0) + 1;
    });
    return Object.entries(types).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
  }, [materials]);

  // Study time by subject
  const timeBySubject = useMemo(() => {
    const subj: Record<string, number> = {};
    timeLogs.forEach(l => { subj[l.subject] = (subj[l.subject] || 0) + l.durationMinutes; });
    return Object.entries(subj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
  }, [timeLogs]);

  // Daily study trend (last 14 days)
  const dailyTrend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const d = subDays(now, 13 - i);
      const dStr = format(d, 'yyyy-MM-dd');
      const mins = timeLogs.filter(l => {
        try { return format(parseISO(l.endedAt), 'yyyy-MM-dd') === dStr; } catch { return false; }
      }).reduce((s, l) => s + l.durationMinutes, 0);
      return { label: format(d, 'EEE'), mins };
    });
  }, [timeLogs]);

  // Materials per session
  const materialsPerSession = useMemo(() => {
    return sessions.slice(0, 8).map(s => ({
      name: s.subject.substring(0, 10),
      books: materials.filter(m => m.sessionId === s.id && (m.category === 'book' || m.category === 'sheet')).length,
      slides: materials.filter(m => m.sessionId === s.id && m.category === 'lecture-slides').length,
      videos: materials.filter(m => m.sessionId === s.id && m.category === 'video').length,
    }));
  }, [sessions, materials]);

  // Session categories
  const categoryCounts = useMemo(() => {
    const cats: Record<string, number> = {};
    sessions.forEach(s => { const cat = s.studyCategory || 'Uncategorized'; cats[cat] = (cats[cat] || 0) + 1; });
    return Object.entries(cats).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
  }, [sessions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-strong rounded-lg px-3 py-2 text-xs space-y-0.5 shadow-xl">
        <p className="font-semibold">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color || p.fill }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <GraduationCap className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold font-display">Study Dashboard</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {[
          { icon: <Timer className="w-4 h-4 text-primary" />, label: 'Total Study', value: `${Math.floor(totalStudyMin / 60)}h ${totalStudyMin % 60}m` },
          { icon: <TrendingUp className="w-4 h-4 text-success" />, label: 'Completed', value: `${completedSessions}/${sessions.length}` },
          { icon: <BookOpen className="w-4 h-4 text-info" />, label: 'Materials', value: `${totalMaterials}` },
          { icon: <StickyNote className="w-4 h-4 text-warning" />, label: 'Notes', value: `${totalNotes}` },
          { icon: <Sparkles className="w-4 h-4 text-violet-500" />, label: 'AI Summaries', value: `${totalAISummaries}` },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass rounded-xl p-3 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-secondary">{card.icon}</div>
            <div>
              <p className="text-sm font-bold font-display">{card.value}</p>
              <p className="text-[9px] text-muted-foreground">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Subject-wise breakdown */}
      {timeBySubject.length > 0 && (
        <div className="glass rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">📊 Study Time by Subject</p>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeBySubject} layout="vertical" barCategoryGap="15%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                <XAxis type="number" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Minutes" radius={[0, 4, 4, 0]}>
                  {timeBySubject.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Daily study trend */}
      {dailyTrend.some(d => d.mins > 0) && (
        <div className="glass rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">📈 Daily Study (Last 14 Days)</p>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="studyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(245, 58%, 62%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(245, 58%, 62%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="mins" name="Minutes" stroke="hsl(245, 58%, 62%)" fill="url(#studyGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Material distribution & Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {materialsByType.length > 0 && (
          <div className="glass rounded-2xl p-3 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground">📚 Materials</p>
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={materialsByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={40} innerRadius={22} strokeWidth={0}>
                    {materialsByType.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-0.5">
              {materialsByType.map(t => (
                <div key={t.name} className="flex items-center gap-1.5 text-[9px]">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                  <span className="text-muted-foreground flex-1">{t.name}</span>
                  <span className="font-semibold">{t.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {categoryCounts.length > 0 && (
          <div className="glass rounded-2xl p-3 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground">🏷️ Categories</p>
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={40} innerRadius={22} strokeWidth={0}>
                    {categoryCounts.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-0.5">
              {categoryCounts.map(c => (
                <div key={c.name} className="flex items-center gap-1.5 text-[9px]">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                  <span className="text-muted-foreground flex-1">{c.name}</span>
                  <span className="font-semibold">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Materials per session */}
      {materialsPerSession.some(m => m.books + m.slides + m.videos > 0) && (
        <div className="glass rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">📁 Materials by Session</p>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={materialsPerSession} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={20} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="books" name="Books/Sheets" fill="hsl(245, 58%, 62%)" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="slides" name="Slides" fill="hsl(38, 92%, 50%)" radius={[0, 0, 0, 0]} stackId="a" />
                <Bar dataKey="videos" name="Videos" fill="hsl(340, 82%, 52%)" radius={[2, 2, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent study log with delete */}
      {timeLogs.length > 0 && (
        <div className="glass rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">🕐 Study History</p>
          <div className="space-y-1 max-h-52 overflow-y-auto">
            {[...timeLogs].reverse().map(log => (
              <div key={log.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-border/30 group">
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{log.subject}</span>
                  {log.topic && <span className="text-muted-foreground"> — {log.topic}</span>}
                </div>
                <span className="text-muted-foreground shrink-0">{log.durationMinutes}min</span>
                <span className="text-[9px] text-muted-foreground shrink-0">{new Date(log.endedAt).toLocaleDateString()}</span>
                {onDeleteLog && (
                  <button onClick={() => onDeleteLog(log.id)} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-destructive p-0.5 shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-subject detail */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground">📋 Subject Overview</p>
        {sessions.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-3">No sessions yet.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => {
              const sMats = materials.filter(m => m.sessionId === s.id);
              const sNotes = notes.filter(n => n.sessionId === s.id);
              const sTime = timeLogs.filter(l => l.sessionId === s.id).reduce((sum, l) => sum + l.durationMinutes, 0);
              return (
                <div key={s.id} className="p-2.5 rounded-xl bg-secondary/50 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{s.subject}</span>
                    {s.studyCategory && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">{s.studyCategory}</span>}
                    {s.completed && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-success/15 text-success">✓ Done</span>}
                  </div>
                  {s.topic && <p className="text-[10px] text-muted-foreground">{s.topic}</p>}
                  <div className="flex gap-2 flex-wrap text-[9px] text-muted-foreground">
                    {sTime > 0 && <span className="flex items-center gap-0.5"><Timer className="w-2.5 h-2.5" /> {sTime}min</span>}
                    {sMats.length > 0 && <span className="flex items-center gap-0.5"><BookOpen className="w-2.5 h-2.5" /> {sMats.length} files</span>}
                    {sMats.filter(m => m.category === 'video').length > 0 && <span className="flex items-center gap-0.5"><Video className="w-2.5 h-2.5" /> {sMats.filter(m => m.category === 'video').length} videos</span>}
                    {sNotes.length > 0 && <span className="flex items-center gap-0.5"><StickyNote className="w-2.5 h-2.5" /> {sNotes.length} notes</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
