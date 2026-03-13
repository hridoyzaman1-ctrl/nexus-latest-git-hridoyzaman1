import { Goal, Habit, Task, Note, Book, Expense, Todo, StudySession, TimeEntry, AnxietyLog, Routine, MoodEntry, SleepEntry, WaterEntry, BreathingFeedback, EmergencyContact } from '@/types';

const id = () => crypto.randomUUID();
const now = new Date().toISOString();
const today = now.split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString();
const tomorrowDate = tomorrow.split('T')[0];

export const exampleGoals: Goal[] = [
  { id: id(), title: "Learn a new language", description: "Study Spanish using Duolingo and practice conversations", category: "education", color: "#6C63FF", progress: 35, completed: false, isExample: true, createdAt: now },
  { id: id(), title: "Read 12 books this year", description: "One book per month across various genres", category: "personal", color: "#10B981", progress: 25, completed: false, isExample: true, createdAt: now },
  { id: id(), title: "Exercise 3x per week", description: "Mix of cardio, strength training and yoga", category: "health", color: "#E91E63", progress: 60, completed: false, isExample: true, createdAt: now },
];

export const exampleHabits: Habit[] = [
  { id: id(), title: "Morning Meditation", frequency: "daily", color: "#9C27B0", currentStreak: 7, longestStreak: 7, lastCompleted: now, xp: 70, completionDates: [], isExample: true, createdAt: now },
  { id: id(), title: "Drink 8 glasses of water", frequency: "daily", color: "#00BCD4", currentStreak: 3, longestStreak: 5, lastCompleted: now, xp: 30, completionDates: [], isExample: true, createdAt: now },
  { id: id(), title: "Read for 30 minutes", frequency: "daily", color: "#FF9800", currentStreak: 12, longestStreak: 12, lastCompleted: now, xp: 120, completionDates: [], isExample: true, createdAt: now },
];

export const exampleTasks: Task[] = [
  { id: id(), title: "Review project proposal", priority: "high", dueDate: tomorrow, done: false, notes: '', reminderDate: today, reminderTime: '09:00', alarmEnabled: false, alarmFired: false, isExample: true, createdAt: now },
  { id: id(), title: "Buy groceries", priority: "medium", dueDate: null, done: false, notes: '', reminderDate: today, reminderTime: '14:00', alarmEnabled: false, alarmFired: false, isExample: true, createdAt: now },
  { id: id(), title: "Clean desk", priority: "low", dueDate: null, done: true, notes: '', reminderDate: tomorrowDate, reminderTime: '10:00', alarmEnabled: false, alarmFired: false, isExample: true, createdAt: now },
];

export const exampleNotes: Note[] = [
  { id: id(), title: "Meeting Notes - Project Alpha", content: "Discussed timeline, budget allocation, and team assignments. Next review in 2 weeks.", category: "Work", isExample: true, createdAt: now },
  { id: id(), title: "Book Summary - Atomic Habits", content: "Key takeaway: Focus on systems, not goals. 1% better every day compounds into remarkable results.", category: "Reading", isExample: true, createdAt: now },
  { id: id(), title: "Ideas for Weekend", content: "1. Visit the art museum\n2. Try the new ramen place\n3. Morning hike at the park", category: "Personal", isExample: true, createdAt: now },
];

export const exampleBooks: Book[] = [];

export const exampleExpenses: Expense[] = [
  { id: id(), title: "Coffee", amount: 4.50, category: "food", date: now, isExample: true, createdAt: now },
  { id: id(), title: "Uber ride", amount: 12.00, category: "transport", date: now, isExample: true, createdAt: now },
  { id: id(), title: "Netflix", amount: 15.99, category: "bills", date: now, isExample: true, createdAt: now },
];

export const exampleTodos: Todo[] = [
  { id: id(), text: "Buy birthday gift", done: false, scheduledDate: null, scheduledTime: null, reminderDate: null, reminderTime: null, alarmEnabled: false, alarmFired: false, notes: '', isExample: true, createdAt: now },
  { id: id(), text: "Call dentist", done: false, scheduledDate: null, scheduledTime: null, reminderDate: null, reminderTime: null, alarmEnabled: false, alarmFired: false, notes: '', isExample: true, createdAt: now },
  { id: id(), text: "Update resume", done: false, scheduledDate: null, scheduledTime: null, reminderDate: null, reminderTime: null, alarmEnabled: false, alarmFired: false, notes: '', isExample: true, createdAt: now },
];

export const exampleStudySessions: StudySession[] = [
  { id: id(), subject: "Mathematics", topic: "Calculus", duration: 120, scheduledDate: now.split('T')[0], scheduledTime: "09:00", completed: false, color: "#6C63FF", isExample: true, createdAt: now },
  { id: id(), subject: "Physics", topic: "Quantum Mechanics", duration: 90, scheduledDate: now.split('T')[0], scheduledTime: "14:00", completed: false, color: "#E91E63", isExample: true, createdAt: now },
  { id: id(), subject: "English", topic: "Essay Writing", duration: 60, scheduledDate: now.split('T')[0], scheduledTime: "16:00", completed: false, color: "#10B981", isExample: true, createdAt: now },
];

export const exampleTimeEntries: TimeEntry[] = [
  { id: id(), activity: "Deep Work - Coding", duration: 135, category: "Work", date: now, isExample: true, createdAt: now },
  { id: id(), activity: "Meeting - Team Standup", duration: 30, category: "Meeting", date: now, isExample: true, createdAt: now },
  { id: id(), activity: "Learning - Online Course", duration: 60, category: "Learning", date: now, isExample: true, createdAt: now },
];

export const exampleAnxietyLogs: AnxietyLog[] = [
  { id: id(), level: 6, duration: 20, notes: "Worried about upcoming presentation", createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), isExample: true },
  { id: id(), level: 4, duration: 15, notes: "Minor stress from traffic", createdAt: new Date(Date.now() - 86400000).toISOString(), isExample: true },
  { id: id(), level: 3, duration: 10, notes: "Felt anxious before social event", createdAt: now, isExample: true },
];

export const exampleRoutines: Routine[] = [
  {
    id: id(), name: "Morning Routine", type: "morning", streak: 5, isExample: true, createdAt: now,
    steps: [
      { id: id(), text: "Wake up", done: false },
      { id: id(), text: "Stretch", done: false },
      { id: id(), text: "Meditate", done: false },
      { id: id(), text: "Breakfast", done: false },
      { id: id(), text: "Plan day", done: false },
    ],
  },
  {
    id: id(), name: "Evening Routine", type: "evening", streak: 3, isExample: true, createdAt: now,
    steps: [
      { id: id(), text: "Review day", done: false },
      { id: id(), text: "Journal", done: false },
      { id: id(), text: "Read", done: false },
      { id: id(), text: "Prepare tomorrow", done: false },
      { id: id(), text: "Sleep by 10pm", done: false },
    ],
  },
];

const daysAgoISO = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
const dateStr = (d: number) => new Date(Date.now() - d * 86400000).toISOString().split('T')[0];

export const exampleMoodEntries: MoodEntry[] = [
  { id: id(), mood: 'great', createdAt: daysAgoISO(0) },
  { id: id(), mood: 'okay', createdAt: daysAgoISO(1) },
  { id: id(), mood: 'stressed', createdAt: daysAgoISO(2) },
  { id: id(), mood: 'great', createdAt: daysAgoISO(3) },
  { id: id(), mood: 'low', createdAt: daysAgoISO(4) },
  { id: id(), mood: 'anxious', createdAt: daysAgoISO(5) },
  { id: id(), mood: 'okay', createdAt: daysAgoISO(6) },
];

export const exampleSleepEntries: SleepEntry[] = [
  { id: id(), bedtime: '23:00', wakeTime: '07:00', quality: 4, date: dateStr(0), notes: 'Slept well', createdAt: daysAgoISO(0) },
  { id: id(), bedtime: '23:30', wakeTime: '06:45', quality: 3, date: dateStr(1), notes: 'Woke up once', createdAt: daysAgoISO(1) },
  { id: id(), bedtime: '00:15', wakeTime: '07:30', quality: 3, date: dateStr(2), notes: '', createdAt: daysAgoISO(2) },
  { id: id(), bedtime: '22:45', wakeTime: '06:30', quality: 5, date: dateStr(3), notes: 'Great rest!', createdAt: daysAgoISO(3) },
  { id: id(), bedtime: '01:00', wakeTime: '08:00', quality: 2, date: dateStr(5), notes: 'Stayed up too late', createdAt: daysAgoISO(5) },
];

export const exampleWaterEntries: WaterEntry[] = [
  { id: id(), amount: 500, date: dateStr(0), createdAt: daysAgoISO(0) },
  { id: id(), amount: 350, date: dateStr(0), createdAt: daysAgoISO(0) },
  { id: id(), amount: 250, date: dateStr(0), createdAt: daysAgoISO(0) },
  { id: id(), amount: 400, date: dateStr(1), createdAt: daysAgoISO(1) },
  { id: id(), amount: 500, date: dateStr(1), createdAt: daysAgoISO(1) },
  { id: id(), amount: 300, date: dateStr(2), createdAt: daysAgoISO(2) },
  { id: id(), amount: 600, date: dateStr(3), createdAt: daysAgoISO(3) },
  { id: id(), amount: 450, date: dateStr(4), createdAt: daysAgoISO(4) },
];

export const exampleBreathingFeedback: BreathingFeedback[] = [
  { id: id(), durationSeconds: 240, cyclesCompleted: 5, calmnessBefore: 3, calmnessAfter: 7, notes: 'Felt much calmer after', createdAt: daysAgoISO(1) },
  { id: id(), durationSeconds: 180, cyclesCompleted: 4, calmnessBefore: 4, calmnessAfter: 8, notes: 'Good session', createdAt: daysAgoISO(3) },
  { id: id(), durationSeconds: 300, cyclesCompleted: 6, calmnessBefore: 2, calmnessAfter: 6, notes: 'Needed this today', createdAt: daysAgoISO(5) },
];

export const exampleEmergencyContacts: EmergencyContact[] = [
  { id: id(), name: 'Mom', phone: '+1 555-0101', details: 'Primary emergency contact', preferWhatsApp: false },
  { id: id(), name: 'Best Friend', phone: '+1 555-0202', details: 'Can always call anytime', preferWhatsApp: true },
];
