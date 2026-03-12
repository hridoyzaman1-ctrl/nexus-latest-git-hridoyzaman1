export type SessionType = 'speech' | 'presentation' | 'interview' | 'pitch' | 'debate' | 'panel' | 'custom';
export type QuestionCategory = 'interview' | 'academic-viva' | 'debate' | 'corporate-qa' | 'public-speaking-qa' | 'startup-pitch-qa' | 'panel-discussion' | 'press-media' | 'leadership' | 'custom';
export type CoachView = 'home' | 'permissions' | 'session' | 'script' | 'questions' | 'report' | 'history';

export interface ScriptSettings {
  topic: string;
  duration: number;
  targetAudience: string;
  presentationType: string;
  tone: string;
  language: string;
  keyPoints: string;
  speakingStyle: string;
  purpose: string;
  customInstructions: string;
  callToAction: string;
  complexityLevel: 'simple' | 'moderate' | 'advanced';
}

export interface PracticeQuestion {
  id: string;
  category: QuestionCategory;
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  thinkingTimeSuggested: number;
}

export interface QuestionModeSettings {
  category: QuestionCategory;
  customTopic?: string;
  questionCount: number;
  answerTimeLimit: number;
  thinkingTime: number;
}

export interface SectionScore {
  score: number;
  label: string;
  explanation: string;
}

export interface VisionMetrics {
  postureScore: number;
  eyeContactScore: number;
  gestureScore: number;
  shoulderBalance: number;
  headStability: number;
  facingCamera: boolean;
  handsVisible: boolean;
  gestureFrequency: number;
  excessiveMovement: boolean;
  bodyVisible: boolean;
  faceDetected: boolean;
}

export interface AudioMetrics {
  volumeLevel: number;
  isSpeaking: boolean;
  silenceDuration: number;
  speakingDuration: number;
  volumeConsistency: number;
  clipping: boolean;
  estimatedWPM: number;
  pauseQuality: number;
  totalSpeakingTime: number;
  totalSilenceTime: number;
  transcriptAvailable: boolean;
  transcript: string;
}

export interface TimelineMarker {
  time: number;
  type: 'pause' | 'posture-dip' | 'pace-spike' | 'overtime' | 'recovery' | 'gesture-excess' | 'eye-contact-loss';
  label: string;
}

export interface TrendDataPoint {
  time: number;
  posture: number;
  eyeContact: number;
  gesture: number;
  pace: number;
  volume: number;
}

export interface CoachingCard {
  id: string;
  message: string;
  type: 'positive' | 'suggestion' | 'warning';
  priority: number;
  timestamp: number;
}

export interface CoachReport {
  id: string;
  title: string;
  sessionType: SessionType;
  date: string;
  duration: number;
  targetDuration: number;
  overtime: number;
  scriptUsed: boolean;
  splitScreenUsed: boolean;
  questionModeUsed: boolean;
  transcriptAvailable: boolean;
  overallScore: number;
  scores: {
    posture: SectionScore;
    eyeContact: SectionScore;
    gestureControl: SectionScore;
    speechDelivery: SectionScore;
    speechPace: SectionScore;
    timeManagement: SectionScore;
    overallPresence: SectionScore;
  };
  strengths: string[];
  areasToImprove: string[];
  suggestions: string[];
  positiveReinforcement: string[];
  summary: string;
  trendData: TrendDataPoint[];
  timelineMarkers: TimelineMarker[];
  questionResults?: QuestionResult[];
  script?: string;
  version: number;
}

export interface QuestionResult {
  questionId: string;
  question: string;
  category: QuestionCategory;
  answerDuration: number;
  scores: {
    posture: number;
    eyeContact: number;
    gestureControl: number;
    speechDelivery: number;
    speechPace: number;
  };
}

export interface CoachSessionConfig {
  sessionType: SessionType;
  title: string;
  topic: string;
  targetDuration: number;
  useScript: boolean;
  useTeleprompter: boolean;
  useQuestionMode: boolean;
  questionSettings?: QuestionModeSettings;
  script?: string;
}
