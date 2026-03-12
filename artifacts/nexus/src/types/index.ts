export interface UserProfile {
  name: string;
  age: number;
  occupation: string;
  goalsText: string;
  avatar: string;
  profilePicture?: string;
}

// ─── Goals ───
export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'personal' | 'career' | 'health' | 'education';
  color: string;
  progress: number;
  completed: boolean;
  milestones?: Milestone[];
  deadlineDate?: string | null;
  reminderDate?: string | null;
  reminderTime?: string | null;
  alarmEnabled?: boolean;
  alarmSound?: AlarmSoundType;
  alarmFired?: boolean;
  isExample?: boolean;
  createdAt: string;
}

// ─── Habits (Gamified) ───
export interface HabitBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlockedAt: string;
}

export interface Habit {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly';
  color: string;
  currentStreak: number;
  longestStreak: number;
  lastCompleted: string | null;
  xp: number;
  completionDates?: string[]; // ISO date strings for heatmap
  badges?: HabitBadge[];
  isExample?: boolean;
  createdAt: string;
}

export interface GamificationState {
  totalXp: number;
  level: number;
  points: number; // spendable points
  unlockedRewards: string[]; // reward ids
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  type: 'theme' | 'icon' | 'title';
}

export type AlarmSoundType = 'chime' | 'bells' | 'nature' | 'urgent';

// ─── Tasks ───
export type TaskStatus = 'todo' | 'inProgress' | 'done';

export interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: string | null;
  done: boolean;
  status?: TaskStatus;
  notes: string;
  labels?: string[];
  subtasks?: Subtask[];
  project?: string;
  reminderDate: string | null;
  reminderTime: string | null;
  alarmEnabled: boolean;
  alarmSound?: AlarmSoundType;
  alarmFired: boolean;
  isExample?: boolean;
  createdAt: string;
}

export interface FocusSession {
  id: string;
  type: 'work' | 'shortBreak' | 'longBreak';
  duration: number;
  completedAt: string;
}

// ─── Breathing Feedback ───
export interface BreathingFeedback {
  id: string;
  durationSeconds: number;
  cyclesCompleted: number;
  calmnessBefore: number; // 1-10
  calmnessAfter: number;  // 1-10
  notes: string;
  aiAnalysis?: string;
  createdAt: string;
}

// ─── Task Subtasks & Labels ───
export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

// ─── Notes (Advanced) ───
export interface NoteVersion {
  id: string;
  content: string;
  savedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  folder?: string;
  tags?: string[];
  versions?: NoteVersion[];
  linkedNoteIds?: string[];
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  reminderDate?: string | null;
  reminderTime?: string | null;
  alarmEnabled?: boolean;
  alarmSound?: AlarmSoundType;
  alarmFired?: boolean;
  isExample?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface BookBookmark {
  id: string;
  page: number;
  note: string;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  createdAt: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  status: 'unread' | 'reading' | 'read';
  currentPage: number;
  totalPages: number;
  content?: string;
  pdfData?: string;
  epubData?: string;
  pdfUrl?: string;
  fileType?: 'txt' | 'pdf' | 'epub';
  bookmarks?: BookBookmark[];
  isExample?: boolean;
  isDefault?: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: 'food' | 'transport' | 'entertainment' | 'shopping' | 'bills' | 'other';
  date: string;
  isExample?: boolean;
  createdAt: string;
}

export interface Todo {
  id: string;
  text: string;
  done: boolean;
  scheduledDate: string | null;
  scheduledTime: string | null;
  reminderDate: string | null;
  reminderTime: string | null;
  alarmEnabled: boolean;
  alarmSound?: AlarmSoundType;
  alarmFired: boolean;
  notes: string;
  isExample?: boolean;
  createdAt: string;
}

export interface StudyMaterial {
  id: string;
  sessionId: string;
  name: string;
  fileType: 'pdf' | 'txt' | 'epub' | 'pptx' | 'ppt' | 'mp4' | 'webm' | 'mov' | 'avi' | 'mkv';
  totalPages?: number;
  currentPage?: number;
  category: 'book' | 'lecture-slides' | 'sheet' | 'video';
  createdAt: string;
}

export interface StudyNote {
  id: string;
  sessionId: string;
  materialId?: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyTimeLog {
  id: string;
  sessionId: string;
  subject: string;
  topic: string;
  durationMinutes: number;
  startedAt: string;
  endedAt: string;
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange';

export interface StudyHighlight {
  id: string;
  materialId: string;
  page: number;
  text: string;
  color: HighlightColor;
  createdAt: string;
}

export interface StudySession {
  id: string;
  subject: string;
  topic: string;
  duration: number;
  scheduledDate: string;
  scheduledTime: string;
  completed: boolean;
  color: string;
  studyCategory?: string;
  reminderDate?: string | null;
  reminderTime?: string | null;
  alarmEnabled?: boolean;
  alarmSound?: AlarmSoundType;
  alarmFired?: boolean;
  isExample?: boolean;
  createdAt: string;
}

// ─── Time Tracking (Advanced) ───
export interface TimeEntry {
  id: string;
  activity: string;
  duration: number;
  category: string;
  date: string;
  project?: string;
  hourlyRate?: number;
  billable?: boolean;
  isExample?: boolean;
  createdAt: string;
}

export interface TimeProject {
  id: string;
  name: string;
  color: string;
  hourlyRate: number;
  createdAt: string;
}

export interface MeditationSession {
  id: string;
  duration: number;
  completedAt: string;
}

export interface AnxietyLog {
  id: string;
  level: number;
  duration: number;
  notes: string;
  createdAt: string;
  isExample?: boolean;
}

export interface Routine {
  id: string;
  name: string;
  type: 'morning' | 'evening' | 'custom';
  steps: RoutineStep[];
  streak: number;
  isExample?: boolean;
  createdAt: string;
}

export interface RoutineStep {
  id: string;
  text: string;
  done: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  type: 'goal' | 'habit' | 'task' | 'note' | 'focus' | 'expense' | 'book' | 'todo' | 'study' | 'summary';
  title: string;
  timestamp: string;
}

export interface Reminder {
  id: string;
  sourceType: 'task' | 'todo' | 'study' | 'habit';
  sourceId: string;
  title: string;
  dateTime: string;
  alarmEnabled: boolean;
  fired: boolean;
}

export interface SavedReport {
  id: string;
  title: string;
  period: string;
  scores: { productivity: number; wellness: number; consistency: number };
  insights: string[];
  createdAt: string;
}

export type MoodType = 'great' | 'okay' | 'low' | 'anxious' | 'stressed';

export interface MoodEntry {
  id: string;
  mood: MoodType;
  createdAt: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  details: string;
  image?: string;
  preferWhatsApp: boolean;
}

export interface SafetySettings {
  enabled: boolean;
  inactivityDays: number;
  alertMessage: string;
}

export const defaultSafetySettings: SafetySettings = {
  enabled: false,
  inactivityDays: 7,
  alertMessage: "Hi, I haven't used my MindFlow app in a while. Please check on me to make sure I'm okay. 🙏",
};

export interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  highContrast: boolean;
  reduceMotion: boolean;
  boldText: boolean;
  splashSound: boolean;
}

// ─── Sleep Tracking ───
export interface SleepEntry {
  id: string;
  bedtime: string; // HH:mm
  wakeTime: string; // HH:mm
  quality: number; // 1-5
  date: string; // yyyy-MM-dd
  notes: string;
  createdAt: string;
}

// ─── Water Intake ───
export interface WaterEntry {
  id: string;
  amount: number; // ml
  date: string; // yyyy-MM-dd
  createdAt: string;
}

// ─── Quiz System ───
export type QuizQuestionType = 'mcq' | 'fill_blank' | 'matching' | 'short_qa' | 'broad' | 'creative';

export interface QuizQuestion {
  id: number;
  type: QuizQuestionType;
  question: string;
  options?: string[];
  correctAnswer?: string;
  marks: number;
  // For matching
  matchPairs?: { left: string; right: string }[];
  // For creative (NCTB)
  stimulus?: string;
  parts?: { label: string; question: string; marks: number }[];
  // Optional image
  imageUrl?: string;
}

export interface QuizUserAnswer {
  questionId: number;
  answer: string;
  isCorrect?: boolean;
  marksObtained?: number;
}

export interface QuizResult {
  id: string;
  sessionId?: string;
  subject: string;
  topic: string;
  className: string;
  studentName: string;
  quizType: QuizQuestionType;
  questions: QuizQuestion[];
  userAnswers: QuizUserAnswer[];
  totalMarks: number;
  obtainedMarks: number;
  totalTime: number; // seconds allocated
  timeTaken: number; // seconds actually used
  timerEnabled: boolean;
  feedback?: string;
  isGradable: boolean; // false for broad/creative
  createdAt: string;
}

