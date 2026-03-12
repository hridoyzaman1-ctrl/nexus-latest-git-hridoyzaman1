import { setLocalStorage, getLocalStorage } from '@/hooks/useLocalStorage';
import {
  exampleGoals, exampleHabits, exampleTasks, exampleNotes, exampleBooks,
  exampleExpenses, exampleTodos, exampleStudySessions, exampleTimeEntries,
  exampleAnxietyLogs, exampleRoutines, exampleMoodEntries, exampleSleepEntries,
  exampleWaterEntries, exampleBreathingFeedback, exampleEmergencyContacts,
} from '@/lib/examples';
import { FocusSession, MeditationSession } from '@/types';

const id = () => crypto.randomUUID();

function daysAgo(d: number) {
  return new Date(Date.now() - d * 86400000).toISOString();
}

const exampleFocusSessions: FocusSession[] = [
  { id: id(), type: 'work', duration: 1500, completedAt: daysAgo(0) },
  { id: id(), type: 'work', duration: 2700, completedAt: daysAgo(1) },
  { id: id(), type: 'shortBreak', duration: 300, completedAt: daysAgo(1) },
  { id: id(), type: 'work', duration: 1800, completedAt: daysAgo(2) },
  { id: id(), type: 'work', duration: 3600, completedAt: daysAgo(3) },
  { id: id(), type: 'work', duration: 1500, completedAt: daysAgo(5) },
];

const exampleMeditationSessions: MeditationSession[] = [
  { id: id(), duration: 600, completedAt: daysAgo(0) },
  { id: id(), duration: 300, completedAt: daysAgo(1) },
  { id: id(), duration: 900, completedAt: daysAgo(3) },
  { id: id(), duration: 600, completedAt: daysAgo(5) },
];

export function seedExampleData() {
  // Always ensure default books are present (even for returning users)
  ensureDefaultBooks();

  const alreadySeeded = getLocalStorage<boolean>('dataseeded', false);
  if (alreadySeeded) return;

  // Only seed if the stores are empty
  if (getLocalStorage('goals', []).length === 0) setLocalStorage('goals', exampleGoals);
  if (getLocalStorage('habits', []).length === 0) setLocalStorage('habits', exampleHabits);
  if (getLocalStorage('tasks', []).length === 0) setLocalStorage('tasks', exampleTasks);
  if (getLocalStorage('notes', []).length === 0) setLocalStorage('notes', exampleNotes);
  if (getLocalStorage('expenses', []).length === 0) setLocalStorage('expenses', exampleExpenses);
  if (getLocalStorage('todos', []).length === 0) setLocalStorage('todos', exampleTodos);
  if (getLocalStorage('studySessions', []).length === 0) setLocalStorage('studySessions', exampleStudySessions);
  if (getLocalStorage('timeEntries', []).length === 0) setLocalStorage('timeEntries', exampleTimeEntries);
  if (getLocalStorage('anxietyLogs', []).length === 0) setLocalStorage('anxietyLogs', exampleAnxietyLogs);
  if (getLocalStorage('routines', []).length === 0) setLocalStorage('routines', exampleRoutines);
  if (getLocalStorage('focusSessions', []).length === 0) setLocalStorage('focusSessions', exampleFocusSessions);
  if (getLocalStorage('meditationSessions', []).length === 0) setLocalStorage('meditationSessions', exampleMeditationSessions);
  if (getLocalStorage('moodEntries', []).length === 0) setLocalStorage('moodEntries', exampleMoodEntries);
  if (getLocalStorage('sleepEntries', []).length === 0) setLocalStorage('sleepEntries', exampleSleepEntries);
  if (getLocalStorage('waterEntries', []).length === 0) setLocalStorage('waterEntries', exampleWaterEntries);
  if (getLocalStorage('breathingFeedback', []).length === 0) setLocalStorage('breathingFeedback', exampleBreathingFeedback);
  if (getLocalStorage('emergencyContacts', []).length === 0) setLocalStorage('emergencyContacts', exampleEmergencyContacts);

  setLocalStorage('dataseeded', true);
}

/** Ensure all default books exist — adds any missing ones, preserves user deletions via a blocklist, and purges removed defaults */
function ensureDefaultBooks() {
  const currentBooks = getLocalStorage<any[]>('books', []);
  const deletedDefaults = getLocalStorage<string[]>('deletedDefaultBooks', []);

  // 1. Purge deprecated default books (books that are marked 'isDefault' but no longer exist in exampleBooks)
  const validExampleUrls = new Set(exampleBooks.filter(b => b.pdfUrl).map(b => b.pdfUrl));
  const filteredBooks = currentBooks.filter((b: any) => {
    if (b.isDefault && b.pdfUrl && !validExampleUrls.has(b.pdfUrl)) {
      return false; // Drop this obsolete default book
    }
    return true;
  });

  // 2. Add missing defaults
  const existingPdfUrls = new Set(filteredBooks.map((b: any) => b.pdfUrl).filter(Boolean));
  const missingDefaults = exampleBooks.filter(
    (b) => b.pdfUrl && !existingPdfUrls.has(b.pdfUrl) && !deletedDefaults.includes(b.pdfUrl)
  );

  // 3. Save if array changed (either books were added or purged)
  if (missingDefaults.length > 0 || currentBooks.length !== filteredBooks.length) {
    setLocalStorage('books', [...filteredBooks, ...missingDefaults]);
  }
}
