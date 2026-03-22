import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AlarmSoundType } from '@/types';
import { playAlarmSound, stopAlarmSound } from '@/lib/alarm';
import { getLocalStorage, setLocalStorage } from '@/hooks/useLocalStorage';

export interface AlarmData {
  id: string;
  title: string;
  notes?: string;
  sound?: AlarmSoundType;
  type?: string; 
}

interface AlarmContextType {
  activeAlarm: AlarmData | null;
  triggerAlarm: (data: AlarmData) => void;
  stopAlarm: () => void;
  snoozeAlarm: (minutes: number) => void;
  dismissAlarm: () => void;
}

const AlarmContext = createContext<AlarmContextType | null>(null);

export function useAlarm() {
  const ctx = useContext(AlarmContext);
  if (!ctx) throw new Error('useAlarm must be used inside AlarmProvider');
  return ctx;
}

export function AlarmProvider({ children }: { children: React.ReactNode }) {
  const [activeAlarm, setActiveAlarm] = useState<AlarmData | null>(null);
  const audioRef = useRef<boolean>(false);

  const triggerAlarm = useCallback((data: AlarmData) => {
    setActiveAlarm(data);
    const defaultSound = getLocalStorage<AlarmSoundType>('defaultAlarmSound', 'chime');
    playAlarmSound(data.sound || defaultSound);
    audioRef.current = true;
    
    // Vibrate if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 300, 500, 300, 500]);
    }
  }, []);

  const stopAlarm = useCallback(() => {
    stopAlarmSound();
    audioRef.current = false;
    setActiveAlarm(null);
  }, []);

  const snoozeAlarm = useCallback((minutes: number) => {
    if (!activeAlarm) return;
    
    const snoozeTime = new Date(Date.now() + minutes * 60000);
    const h = String(snoozeTime.getHours()).padStart(2, '0');
    const m = String(snoozeTime.getMinutes()).padStart(2, '0');
    const d = snoozeTime.toISOString().split('T')[0];
    
    // We create a temporary "snoozed" reminder in the relevant storage or just a generic one
    // For now, we'll just stop the current alarm. The actual re-trigger logic 
    // should ideally be handled by creating a temporary item in useReminderEngine's source.
    // However, to satisfy the requirement quickly, we can just use a local setTimeout if it's acceptable,
    // but a persistent one is better.
    
    // Instead of complex logic, I'll modify useReminderEngine to handle a "snooze" queue.
    // For now, stopping is enough here.
    stopAlarm();
    
    // Store snooze info so useReminderEngine can pick it up
    const snoozes = getLocalStorage<any[]>('activeSnoozes', []);
    snoozes.push({
      ...activeAlarm,
      triggerAt: snoozeTime.toISOString(),
      id: `snooze_${activeAlarm.id}_${Date.now()}`
    });
    setLocalStorage('activeSnoozes', snoozes);
  }, [activeAlarm, stopAlarm]);

  const dismissAlarm = useCallback(() => {
    stopAlarm();
    // Clear any pending snoozes for this alarm ID if we wanted to be thorough
    const snoozes = getLocalStorage<any[]>('activeSnoozes', []);
    setLocalStorage('activeSnoozes', snoozes.filter(s => !s.id.startsWith(`snooze_${activeAlarm?.id}`)));
  }, [activeAlarm, stopAlarm]);

  return (
    <AlarmContext.Provider value={{ activeAlarm, triggerAlarm, stopAlarm, snoozeAlarm, dismissAlarm }}>
      {children}
    </AlarmContext.Provider>
  );
}
