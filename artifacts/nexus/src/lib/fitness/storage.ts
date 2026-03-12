import { getLocalStorage, setLocalStorage } from '@/hooks/useLocalStorage';
import type { UserFitnessProfile, WorkoutRoutine, WorkoutSession } from '@/types/fitness';

const KEYS = {
  profile: 'fitnessProfile',
  routines: 'fitnessRoutines',
  history: 'fitnessHistory',
  activeRoutine: 'fitnessActiveRoutine',
  streak: 'fitnessStreak',
};

export function getFitnessProfile(): UserFitnessProfile | null {
  return getLocalStorage<UserFitnessProfile | null>(KEYS.profile, null);
}

export function saveFitnessProfile(profile: UserFitnessProfile): void {
  setLocalStorage(KEYS.profile, profile);
}

export function getWorkoutRoutines(): WorkoutRoutine[] {
  return getLocalStorage<WorkoutRoutine[]>(KEYS.routines, []);
}

export function saveWorkoutRoutine(routine: WorkoutRoutine): void {
  const list = getWorkoutRoutines();
  const idx = list.findIndex(r => r.id === routine.id);
  if (idx >= 0) list[idx] = routine;
  else list.unshift(routine);
  setLocalStorage(KEYS.routines, list);
}

export function deleteWorkoutRoutine(id: string): void {
  setLocalStorage(KEYS.routines, getWorkoutRoutines().filter(r => r.id !== id));
}

export function getActiveRoutineId(): string | null {
  return getLocalStorage<string | null>(KEYS.activeRoutine, null);
}

export function setActiveRoutineId(id: string | null): void {
  setLocalStorage(KEYS.activeRoutine, id);
}

export function getWorkoutHistory(): WorkoutSession[] {
  return getLocalStorage<WorkoutSession[]>(KEYS.history, []);
}

export function saveWorkoutSession(session: WorkoutSession): void {
  const list = getWorkoutHistory();
  list.unshift(session);
  setLocalStorage(KEYS.history, list);
}

export function deleteWorkoutSession(id: string): void {
  setLocalStorage(KEYS.history, getWorkoutHistory().filter(s => s.id !== id));
}

export function getWorkoutStreak(): { current: number; lastDate: string } {
  return getLocalStorage<{ current: number; lastDate: string }>(KEYS.streak, { current: 0, lastDate: '' });
}

export function updateWorkoutStreak(): number {
  const streak = getWorkoutStreak();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (streak.lastDate === today) {
    return streak.current;
  }
  if (streak.lastDate === yesterday) {
    const newStreak = { current: streak.current + 1, lastDate: today };
    setLocalStorage(KEYS.streak, newStreak);
    return newStreak.current;
  }
  const newStreak = { current: 1, lastDate: today };
  setLocalStorage(KEYS.streak, newStreak);
  return 1;
}
