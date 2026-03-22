import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Clock, X, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAlarm } from '@/contexts/AlarmContext';
import { cn } from '@/lib/utils';

export function AlarmDialog() {
  const { activeAlarm, stopAlarm, snoozeAlarm, dismissAlarm } = useAlarm();
  const [snoozeMinutes, setSnoozeMinutes] = useState(5);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!activeAlarm) return;
    const interval = setInterval(() => setPulse(p => !p), 1000);
    return () => clearInterval(interval);
  }, [activeAlarm]);

  if (!activeAlarm) return null;

  const snoozeOptions = [5, 10, 15, 30];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-sm glass rounded-3xl p-6 shadow-2xl border-2 border-primary/20 overflow-hidden"
        >
          {/* Animated Background Pulse */}
          <motion.div
            className="absolute inset-0 bg-primary/10 -z-10"
            animate={{ opacity: pulse ? 0.2 : 0.05 }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center"
              >
                <Bell className="w-8 h-8 text-primary" />
              </motion.div>
              <motion.div
                className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">
                {activeAlarm.title}
              </h2>
              {activeAlarm.notes && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {activeAlarm.notes}
                </p>
              )}
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-primary uppercase tracking-widest mt-1">
                <Volume2 className="w-3 h-3" />
                <span>Alarm Ringing</span>
              </div>
            </div>

            <div className="w-full space-y-4">
              <div className="space-y-3">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Snooze for</p>
                <div className="flex justify-between gap-1.5">
                  {snoozeOptions.map(min => (
                    <button
                      key={min}
                      onClick={() => setSnoozeMinutes(min)}
                      className={cn(
                        "flex-1 py-2 px-1 rounded-xl text-xs font-semibold transition-all border",
                        snoozeMinutes === min 
                          ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                          : "bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary"
                      )}
                    >
                      {min}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => snoozeAlarm(snoozeMinutes)}
                  variant="outline"
                  className="rounded-2xl h-12 text-sm font-bold gap-2 border-primary/20 hover:bg-primary/5"
                >
                  <Clock className="w-4 h-4" /> Snooze
                </Button>
                <Button 
                  onClick={stopAlarm}
                  className="rounded-2xl h-12 text-sm font-bold gap-2 shadow-lg shadow-primary/20"
                >
                  <BellOff className="w-4 h-4" /> Stop
                </Button>
              </div>

              <Button 
                onClick={dismissAlarm}
                variant="ghost"
                className="w-full rounded-xl text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Dismiss & Close
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
