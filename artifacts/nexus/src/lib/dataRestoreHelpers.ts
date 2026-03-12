const MINDFLOW_DATA_KEYS = [
  'goals', 'habits', 'tasks', 'notes', 'books', 'expenses', 'todos',
  'studySessions', 'studyMaterials', 'studyNotes', 'studyTimeLogs', 'studyHighlights', 'studyCustomCategories',
  'timeEntries', 'anxietyLogs', 'routines', 'focusSessions',
  'meditationSessions', 'moodEntries', 'breathingFeedback', 'gamification',
  'timeProjects', 'focusSettings', 'userProfile', 'onboardingDone', 'dataseeded',
  'savedReports', 'chatMessages', 'themeMode', 'accentIndex', 'emergencyContacts',
  'safetySettings', 'reassuranceJournal', 'groundingHistory', 'dismissedActivities',
  'profile', 'customTracks', 'kira_pending_mood', 'quickActionIds', 'sleepEntries', 'waterEntries',
  'tasks_init', 'time_init', 'habits_init', 'notes_init', 'goals_init',
  'books_init', 'expenses_init', 'study_init', 'todos_init',
  'ocd_init', 'routines_init', 'journal_init',
  'notificationSettings', 'audioPreferences', 'symmetryMode', 'accessibilitySettings',
  'incomes', 'budgetLimits', 'expenseCustomCategories',
  'focusSessionCount', 'focusAlarmEnabled', 'focusAlarmSound',
  'chat_messages', 'kira_chat_greeted', 'kira_last_greeted',
  'analyticsReports', 'visitedModules', 'tutorialSeen', 'appVersion',
];

export function hasExistingData(): boolean {
  for (const key of MINDFLOW_DATA_KEYS) {
    const item = window.localStorage.getItem(`mindflow_${key}`);
    if (item && item !== 'null' && item !== '[]' && item !== 'false') {
      return true;
    }
  }
  return false;
}

export function clearAllMindflowData(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('mindflow_')) keys.push(key);
  }
  keys.forEach(k => localStorage.removeItem(k));
  try { indexedDB.deleteDatabase('mindflow_study_db'); } catch { }
  try { indexedDB.deleteDatabase('mindflow_books_db'); } catch { }
}
