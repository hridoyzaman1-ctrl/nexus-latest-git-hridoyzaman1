import { useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface CheckRecord {
  id: string;
  count: number;
  lastChecked: string;
  timestamps: string[];
}

const MAX_CHECKS_BEFORE_NUDGE = 3;
const COOLDOWN_MINUTES = 10;

export function useCheckLimiter() {
  const [records, setRecords] = useLocalStorage<Record<string, CheckRecord>>('checkLimiter', {});

  const recordCheck = useCallback((itemId: string): { shouldNudge: boolean; checkCount: number; message: string } => {
    const now = new Date();
    const existing = records[itemId];

    if (!existing) {
      setRecords(prev => ({
        ...prev,
        [itemId]: { id: itemId, count: 1, lastChecked: now.toISOString(), timestamps: [now.toISOString()] },
      }));
      return { shouldNudge: false, checkCount: 1, message: '' };
    }

    // Filter timestamps within the cooldown window
    const recentTimestamps = existing.timestamps.filter(
      t => (now.getTime() - new Date(t).getTime()) < COOLDOWN_MINUTES * 60 * 1000
    );

    const newCount = recentTimestamps.length + 1;
    const newTimestamps = [...recentTimestamps, now.toISOString()];

    setRecords(prev => ({
      ...prev,
      [itemId]: { id: itemId, count: newCount, lastChecked: now.toISOString(), timestamps: newTimestamps },
    }));

    if (newCount > MAX_CHECKS_BEFORE_NUDGE) {
      const messages = [
        "You've checked this a few times now. Try stepping away for 10 minutes 💜",
        "It's okay — the task is still here. Give yourself a break 🌿",
        "Checking again? Remember: certainty isn't always possible, and that's okay 🧘",
        "You're safe. Try the grounding exercise instead of re-checking ✨",
        "This is a pattern. Take 3 deep breaths before checking again 🌊",
      ];
      return {
        shouldNudge: true,
        checkCount: newCount,
        message: messages[Math.min(newCount - MAX_CHECKS_BEFORE_NUDGE - 1, messages.length - 1)],
      };
    }

    return { shouldNudge: false, checkCount: newCount, message: '' };
  }, [records, setRecords]);

  const resetItem = useCallback((itemId: string) => {
    setRecords(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }, [setRecords]);

  const getCheckCount = useCallback((itemId: string): number => {
    const existing = records[itemId];
    if (!existing) return 0;
    const now = new Date();
    return existing.timestamps.filter(
      t => (now.getTime() - new Date(t).getTime()) < COOLDOWN_MINUTES * 60 * 1000
    ).length;
  }, [records]);

  return { recordCheck, resetItem, getCheckCount };
}
