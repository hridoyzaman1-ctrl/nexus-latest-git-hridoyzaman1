export const SCORING_WEIGHTS = {
  posture: 0.15,
  eyeContact: 0.20,
  gestureControl: 0.10,
  speechDelivery: 0.20,
  speechPace: 0.15,
  timeManagement: 0.10,
  overallPresence: 0.10,
};

export const ANALYSIS_FPS = 5;
export const TREND_INTERVAL_MS = 5000;
export const FEEDBACK_COOLDOWN_MS = 8000;
export const MAX_COACHING_CARDS = 2;
export const OVERTIME_WARNING_SECONDS = 30;
export const AUTO_STOP_OVERTIME_SECONDS = 300;
export const MAX_IMAGE_SIZE = 320;

export const SESSION_TYPES = [
  { value: 'speech' as const, label: 'Speech' },
  { value: 'presentation' as const, label: 'Presentation' },
  { value: 'interview' as const, label: 'Interview' },
  { value: 'pitch' as const, label: 'Pitch' },
  { value: 'debate' as const, label: 'Debate' },
  { value: 'panel' as const, label: 'Panel' },
  { value: 'custom' as const, label: 'Custom' },
];

export const DURATION_PRESETS = [
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 300, label: '5 min' },
  { value: 600, label: '10 min' },
  { value: 900, label: '15 min' },
  { value: 1200, label: '20 min' },
];

export const QUESTION_CATEGORIES = [
  { value: 'interview' as const, label: 'Interview' },
  { value: 'academic-viva' as const, label: 'Academic Viva' },
  { value: 'debate' as const, label: 'Debate' },
  { value: 'corporate-qa' as const, label: 'Corporate Q&A' },
  { value: 'public-speaking-qa' as const, label: 'Public Speaking Q&A' },
  { value: 'startup-pitch-qa' as const, label: 'Startup Pitch Q&A' },
  { value: 'panel-discussion' as const, label: 'Panel Discussion' },
  { value: 'press-media' as const, label: 'Press / Media' },
  { value: 'leadership' as const, label: 'Leadership' },
  { value: 'custom' as const, label: 'Custom Category' },
];

export const AUDIENCE_PRESETS = [
  'School Presentation',
  'College Presentation',
  'Academic Seminar',
  'Corporate Presentation',
  'Public Speech',
  'Political Speech',
  'Startup Pitch',
  'Conference Talk',
  'Interview Answer',
  'Motivational Speech',
  'Panel Introduction',
  'Debate Speech',
  'Custom',
];

export const TONE_OPTIONS = ['Professional', 'Conversational', 'Inspirational', 'Formal', 'Casual', 'Persuasive', 'Educational', 'Humorous'];
export const COMPLEXITY_OPTIONS = [
  { value: 'simple' as const, label: 'Simple' },
  { value: 'moderate' as const, label: 'Moderate' },
  { value: 'advanced' as const, label: 'Advanced' },
];
