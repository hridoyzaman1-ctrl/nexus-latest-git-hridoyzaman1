import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { FocusSession, AlarmSoundType } from '@/types';
import { Play, Pause, RotateCcw, Square, ArrowLeft, Settings2, BarChart3, Music, Volume2, Bell, Calendar } from 'lucide-react';
import { ALARM_SOUNDS, playAlarmSound, previewAlarmSound } from '@/lib/alarm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';

type SessionType = 'work' | 'shortBreak' | 'longBreak';

interface FocusSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
}

const DEFAULT_SETTINGS: FocusSettings = { workMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakInterval: 4 };
const colors: Record<SessionType, string> = { work: 'hsl(340, 82%, 52%)', shortBreak: 'hsl(152, 69%, 45%)', longBreak: 'hsl(199, 89%, 48%)' };
const labels: Record<SessionType, string> = { work: 'Work', shortBreak: 'Short Break', longBreak: 'Long Break' };

export default function FocusTimer() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useLocalStorage<FocusSession[]>('focusSessions', []);
  const [settings, setSettings] = useLocalStorage<FocusSettings>('focusSettings', DEFAULT_SETTINGS);
  const [type, setType] = useState<SessionType>('work');
  const [timeLeft, setTimeLeft] = useState(settings.workMinutes * 60);
  const [running, setRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapMonth, setHeatmapMonth] = useState(new Date());
  const [sessionCount, setSessionCount] = useLocalStorage<number>('focusSessionCount', 0);
  const [alarmEnabled, setAlarmEnabled] = useLocalStorage<boolean>('focusAlarmEnabled', true);
  const [alarmSound, setAlarmSound] = useLocalStorage<AlarmSoundType>('focusAlarmSound', 'chime');
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const music = useMusicPlayer();

  const getDuration = useCallback((t: SessionType) => {
    switch (t) {
      case 'work': return settings.workMinutes * 60;
      case 'shortBreak': return settings.shortBreakMinutes * 60;
      case 'longBreak': return settings.longBreakMinutes * 60;
    }
  }, [settings]);

  const total = getDuration(type);
  const progress = (total - timeLeft) / total;
  const color = colors[type];
  const todaySessions = sessions.filter(s => new Date(s.completedAt).toDateString() === new Date().toDateString());
  const todayFocusMin = todaySessions.filter(s => s.type === 'work').reduce((sum, s) => sum + Math.round(s.duration / 60), 0);

  const stop = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeLeft < total) {
      setSessions(prev => [...prev, { id: crypto.randomUUID(), type, duration: total - timeLeft, completedAt: new Date().toISOString() }]);
    }
    setTimeLeft(getDuration(type));
  }, [timeLeft, total, type, setSessions, getDuration]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setRunning(false);
          clearInterval(intervalRef.current);
          setSessions(p => [...p, { id: crypto.randomUUID(), type, duration: total, completedAt: new Date().toISOString() }]);
          if (alarmEnabled) playAlarmSound(alarmSound);
          if (type === 'work') {
            const newCount = sessionCount + 1;
            setSessionCount(newCount);
            // Auto-switch to break
            if (newCount % settings.longBreakInterval === 0) {
              setType('longBreak');
              return getDuration('longBreak');
            } else {
              setType('shortBreak');
              return getDuration('shortBreak');
            }
          } else {
            setType('work');
            return getDuration('work');
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, type, total, setSessions, sessionCount, settings.longBreakInterval, getDuration]);

  const switchType = (t: SessionType) => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setType(t);
    setTimeLeft(getDuration(t));
  };

  const updateSetting = (key: keyof FocusSettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (key === 'workMinutes' && type === 'work') setTimeLeft(value * 60);
    if (key === 'shortBreakMinutes' && type === 'shortBreak') setTimeLeft(value * 60);
    if (key === 'longBreakMinutes' && type === 'longBreak') setTimeLeft(value * 60);
  };

  // Weekly focus data
  const weeklyData = useMemo(() => {
    const days: { label: string; minutes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dStr = format(d, 'yyyy-MM-dd');
      const mins = sessions
        .filter(s => s.type === 'work' && s.completedAt.startsWith(dStr))
        .reduce((sum, s) => sum + Math.round(s.duration / 60), 0);
      days.push({ label: format(d, 'EEE'), minutes: mins });
    }
    return days;
  }, [sessions]);
  const maxWeekly = Math.max(...weeklyData.map(d => d.minutes), 1);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="px-4 pt-12 pb-24 space-y-5">
      <PageOnboardingTooltips pageId="focus" />
      <div data-tour="focus-header" className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display flex-1">Focus Timer</h1>
        <button
          onClick={() => {
            setShowSettings(!showSettings);
            setShowStats(false);
            setShowHeatmap(false);
          }}
          className={`p-2 rounded-lg transition-all ${showSettings ? 'bg-primary/15 ring-1 ring-primary/30 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}
        >
          <Settings2 className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            setShowStats(!showStats);
            setShowSettings(false);
            setShowHeatmap(false);
          }}
          className={`p-2 rounded-lg transition-all ${showStats ? 'bg-primary/15 ring-1 ring-primary/30 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}
        >
          <BarChart3 className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            setShowHeatmap(!showHeatmap);
            setShowSettings(false);
            setShowStats(false);
          }}
          className={`p-2 rounded-lg transition-all ${showHeatmap ? 'bg-primary/15 ring-1 ring-primary/30 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}
        >
          <Calendar className="w-5 h-5" />
        </button>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass rounded-2xl p-4 space-y-3 overflow-hidden">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Settings2 className="w-4 h-4" /> Timer Settings</h3>
            {[
              { key: 'workMinutes' as const, label: 'Work Duration', min: 5, max: 90, value: settings.workMinutes, unit: 'min' },
              { key: 'shortBreakMinutes' as const, label: 'Short Break', min: 1, max: 30, value: settings.shortBreakMinutes, unit: 'min' },
              { key: 'longBreakMinutes' as const, label: 'Long Break', min: 5, max: 60, value: settings.longBreakMinutes, unit: 'min' },
              { key: 'longBreakInterval' as const, label: 'Long Break After', min: 2, max: 8, value: settings.longBreakInterval, unit: 'sessions' },
            ].map(s => (
              <div key={s.key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-medium">{s.value} {s.unit}</span>
                </div>
                <Slider value={[s.value]} onValueChange={([v]) => updateSetting(s.key, v)} min={s.min} max={s.max} step={1} />
              </div>
            ))}
            <div className="border-t border-border/30 pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Bell className="w-3 h-3" /> Session alarm</span>
                <Switch checked={alarmEnabled} onCheckedChange={setAlarmEnabled} />
              </div>
              {alarmEnabled && (
                <Select value={alarmSound} onValueChange={(v: AlarmSoundType) => { setAlarmSound(v); previewAlarmSound(v); }}>
                  <SelectTrigger className="bg-secondary border-0 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALARM_SOUNDS.map(s => <SelectItem key={s.value} value={s.value}>{s.emoji} {s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session Type Selector */}
      <div className="flex justify-center gap-2">
        {(Object.keys(labels) as SessionType[]).map(t => (
          <button key={t} onClick={() => switchType(t)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${type === t ? 'text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
            style={type === t ? { background: colors[t] } : {}}>
            {labels[t]} ({Math.floor(getDuration(t) / 60)}m)
          </button>
        ))}
      </div>

      {/* Timer Circle */}
      <div className="flex justify-center">
        <div className="relative w-64 h-64">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 264 264">
            <circle cx="132" cy="132" r="120" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
            <circle cx="132" cy="132" r="120" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold font-display">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
            <span className="text-xs text-muted-foreground mt-1">{labels[type]}</span>
            <span className="text-[10px] text-muted-foreground">Session #{sessionCount + 1}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        <button onClick={() => setRunning(!running)}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{ background: color }}>
          {running ? <Pause className="w-6 h-6 text-primary-foreground" /> : <Play className="w-6 h-6 text-primary-foreground ml-0.5" />}
        </button>
        <button onClick={() => { setRunning(false); clearInterval(intervalRef.current); setTimeLeft(getDuration(type)); }}
          className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center active:scale-90">
          <RotateCcw className="w-5 h-5 text-muted-foreground" />
        </button>
        <button onClick={stop}
          className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center active:scale-90">
          <Square className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Daily Summary */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Today's Focus</span>
          <span className="text-xs text-muted-foreground">{todaySessions.length} {todaySessions.length === 1 ? 'session' : 'sessions'}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Progress value={Math.min(100, (todayFocusMin / 120) * 100)} className="h-2" />
          </div>
          <span className="text-sm font-bold">{todayFocusMin}m</span>
        </div>
        <p className="text-[10px] text-muted-foreground">Target: 120 minutes of deep focus</p>
      </div>

      {/* Ambient Sound Mixer */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Music className="w-4 h-4 text-primary" /> Ambient Sounds</h3>
        <div className="grid grid-cols-3 gap-2">
          {music.tracks.map(track => (
            <button key={track.id}
              onClick={() => {
                if (music.currentTrack?.id === track.id && music.isPlaying) music.pause();
                else if (music.currentTrack?.id === track.id) music.resume();
                else music.play(track);
              }}
              className={`rounded-xl p-2.5 text-[10px] font-medium text-center transition-all ${music.currentTrack?.id === track.id
                ? 'bg-primary/15 ring-1 ring-primary/30 text-primary'
                : 'bg-secondary text-muted-foreground'
                }`}>
              {track.name.split(' ')[0]}
              <p className="text-[8px] mt-0.5 truncate">{track.name.slice(track.name.indexOf(' ') + 1)}</p>
            </button>
          ))}
        </div>
        {music.isPlaying && (
          <div className="flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
            <Slider value={[music.volume * 100]} onValueChange={([v]) => music.setVolume(v / 100)} max={100} className="flex-1" />
            <span className="text-[10px] text-muted-foreground">{Math.round(music.volume * 100)}%</span>
          </div>
        )}
      </div>

      {/* Weekly Stats */}
      <AnimatePresence>
        {showStats && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass rounded-2xl p-4 space-y-3 overflow-hidden">
            <h3 className="text-sm font-semibold">Weekly Focus Summary</h3>
            <div className="flex items-end gap-1 h-24">
              {weeklyData.map(d => (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t relative overflow-hidden" style={{ height: `${Math.max(4, (d.minutes / maxWeekly) * 100)}%` }}>
                    <div className="absolute inset-0 bg-primary rounded-t" />
                  </div>
                  <span className="text-[9px] text-muted-foreground">{d.label}</span>
                  <span className="text-[8px] text-muted-foreground">{d.minutes}m</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground text-center">Total this week: {weeklyData.reduce((s, d) => s + d.minutes, 0)} min</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Focus Heatmap Calendar */}
      <AnimatePresence>
        {showHeatmap && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass rounded-2xl p-4 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <button onClick={() => setHeatmapMonth(new Date(heatmapMonth.getFullYear(), heatmapMonth.getMonth() - 1))} className="text-xs text-muted-foreground">← Prev</button>
              <h3 className="text-sm font-semibold">{format(heatmapMonth, 'MMMM yyyy')}</h3>
              <button onClick={() => setHeatmapMonth(new Date(heatmapMonth.getFullYear(), heatmapMonth.getMonth() + 1))} className="text-xs text-muted-foreground">Next →</button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-[9px] text-muted-foreground text-center font-medium">{d}</div>)}
              {Array.from({ length: startOfMonth(heatmapMonth).getDay() }).map((_, i) => <div key={`e-${i}`} />)}
              {eachDayOfInterval({ start: startOfMonth(heatmapMonth), end: endOfMonth(heatmapMonth) }).map(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const dayMins = sessions
                  .filter(s => s.type === 'work' && s.completedAt.startsWith(dayStr))
                  .reduce((sum, s) => sum + Math.round(s.duration / 60), 0);
                const isToday = isSameDay(day, new Date());
                const intensity = Math.min(1, dayMins / 120);
                return (
                  <div key={dayStr}
                    className={`rounded-md aspect-square flex flex-col items-center justify-center ${isToday ? 'ring-1 ring-primary/40' : ''}`}
                    style={{ background: dayMins > 0 ? `hsl(var(--primary) / ${0.1 + intensity * 0.5})` : 'hsl(var(--secondary) / 0.3)' }}
                    title={`${dayMins}m focus`}
                  >
                    <span className={`text-[9px] ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>{day.getDate()}</span>
                    {dayMins > 0 && <span className="text-[7px] text-primary font-medium">{dayMins}m</span>}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="text-[9px] text-muted-foreground">Less</span>
              {[0.1, 0.2, 0.35, 0.5, 0.6].map((v, i) => (
                <div key={i} className="w-3 h-3 rounded-sm" style={{ background: `hsl(var(--primary) / ${v})` }} />
              ))}
              <span className="text-[9px] text-muted-foreground">More</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Recent Sessions</h2>
          {sessions.slice(-5).reverse().map(s => (
            <div key={s.id} className="glass rounded-xl p-3 flex items-center justify-between text-sm">
              <span>{labels[s.type]}</span>
              <span className="text-muted-foreground">{Math.round(s.duration / 60)}m</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
