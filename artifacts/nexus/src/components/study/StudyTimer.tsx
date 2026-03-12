import { useState, useEffect, useRef, useCallback } from 'react';
import { AlarmSoundType } from '@/types';
import { ALARM_SOUNDS, previewAlarmSound, stopAlarmSound, playAlarmSound } from '@/lib/alarm';
import { Timer, Pause, Play, RotateCcw, X, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  sessionId: string;
  sessionSubject: string;
  sessionDuration: number; // minutes
  onTimeLogged: (minutes: number) => void;
  alarmEnabled?: boolean;
  alarmSound?: AlarmSoundType;
  nextSessionSubject?: string;
}

export default function StudyTimer({ sessionId, sessionSubject, sessionDuration, onTimeLogged, alarmEnabled = false, alarmSound = 'chime', nextSessionSubject }: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [showSetup, setShowSetup] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(sessionDuration);
  const [useAlarm, setUseAlarm] = useState(alarmEnabled);
  const [sound, setSound] = useState<AlarmSoundType>(alarmSound);
  const [alarmFired, setAlarmFired] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = customMinutes * 60;
  const remaining = Math.max(0, totalSeconds - elapsed);
  const progress = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const start = useCallback(() => {
    if (elapsed >= totalSeconds && totalSeconds > 0) return;
    setIsRunning(true);
    startTimeRef.current = Date.now() - elapsed * 1000;
  }, [elapsed, totalSeconds]);

  const pause = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setElapsed(0);
    setAlarmFired(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  // Timer tick
  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const now = Date.now();
        const newElapsed = Math.floor((now - startTimeRef.current) / 1000);
        setElapsed(newElapsed);
      }
    }, 250);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  // Check timer completion
  useEffect(() => {
    if (elapsed >= totalSeconds && totalSeconds > 0 && !alarmFired && isRunning) {
      setAlarmFired(true);
      setIsRunning(false);
      onTimeLogged(customMinutes);

      if (useAlarm) {
        playAlarmSound(sound);
        toast.success(
          `⏰ Time's up for "${sessionSubject}"!${nextSessionSubject ? ` Next: ${nextSessionSubject}` : ''}`,
          { duration: 10000, action: { label: 'Dismiss', onClick: () => stopAlarmSound() } }
        );
      } else {
        toast.success(
          `✅ Session "${sessionSubject}" complete!${nextSessionSubject ? ` Next: ${nextSessionSubject}` : ''}`,
          { duration: 8000 }
        );
      }
    }
  }, [elapsed, totalSeconds, alarmFired, isRunning, useAlarm, sound, sessionSubject, nextSessionSubject, customMinutes, onTimeLogged]);

  // Cleanup
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); stopAlarmSound(); }, []);

  return (
    <div className="space-y-2">
      {/* Timer display */}
      <div className="glass rounded-2xl p-3">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 shrink-0">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/20" />
              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary" strokeDasharray={`${2 * Math.PI * 20}`} strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`} strokeLinecap="round" />
            </svg>
            <Timer className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-mono font-bold">{formatTime(remaining)}</p>
            <p className="text-[10px] text-muted-foreground">
              {alarmFired ? '✅ Complete!' : isRunning ? 'Studying...' : elapsed > 0 ? 'Paused' : 'Ready'}
            </p>
          </div>
          <div className="flex gap-1.5">
            {!alarmFired && (
              isRunning ? (
                <Button size="sm" variant="outline" onClick={pause} className="h-8 w-8 p-0"><Pause className="w-3.5 h-3.5" /></Button>
              ) : (
                <Button size="sm" onClick={start} className="h-8 w-8 p-0"><Play className="w-3.5 h-3.5" /></Button>
              )
            )}
            <Button size="sm" variant="ghost" onClick={reset} className="h-8 w-8 p-0"><RotateCcw className="w-3.5 h-3.5" /></Button>
            <Button size="sm" variant="ghost" onClick={() => setShowSetup(!showSetup)} className="h-8 w-8 p-0 text-[10px]">⚙️</Button>
          </div>
        </div>
      </div>

      {/* Timer settings */}
      <AnimatePresence>
        {showSetup && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="glass rounded-xl p-3 space-y-2 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
              <label className="text-xs text-muted-foreground flex-1">Duration (min)</label>
              <input type="number" value={customMinutes} onChange={e => { setCustomMinutes(Math.max(1, parseInt(e.target.value) || 1)); reset(); }} min={1} max={600} className="w-full sm:w-16 text-xs text-center bg-secondary rounded px-2 py-1 border-0" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">🔔 Alarm when done</span>
              <Switch checked={useAlarm} onCheckedChange={setUseAlarm} />
            </div>
            {useAlarm && (
              <div className="flex gap-1.5 flex-wrap">
                {ALARM_SOUNDS.map(s => (
                  <button key={s.value} onClick={() => { setSound(s.value); previewAlarmSound(s.value); }}
                    className={`text-[10px] px-2 py-1 rounded-full transition-colors flex items-center gap-0.5 ${sound === s.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                    <span>{s.emoji}</span> {s.label}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Mini timer for overlay on readers/video players
export function MiniStudyTimer({ remaining, isRunning, visible, onToggleVisible }: { remaining: number; isRunning: boolean; visible: boolean; onToggleVisible: () => void }) {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <button onClick={onToggleVisible} className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-mono transition-colors hover:bg-primary/25" title={visible ? 'Hide timer' : 'Show timer'}>
      {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
      {visible && (
        <span className={isRunning ? 'animate-pulse' : ''}>{formatTime(remaining)}</span>
      )}
    </button>
  );
}
