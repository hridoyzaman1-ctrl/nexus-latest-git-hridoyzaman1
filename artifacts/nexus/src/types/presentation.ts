export type PresentationPurpose = 'pitch' | 'report' | 'academic' | 'marketing' | 'business' | 'educational' | 'portfolio' | 'proposal';
export type PresentationTone = 'modern' | 'minimal' | 'luxury' | 'bold' | 'corporate' | 'creative' | 'dark' | 'light';
export type LayoutPreference = 'text-heavy' | 'balanced' | 'visual-heavy';
export type SourceType = 'topic' | 'text' | 'pdf' | 'docx' | 'txt';
export type SlideLayoutType =
  | 'cover'
  | 'agenda'
  | 'section-divider'
  | 'title-bullets'
  | 'two-column'
  | 'image-text'
  | 'big-statement'
  | 'comparison'
  | 'summary'
  | 'closing'
  | 'chart'
  | 'table'
  | 'timeline'
  | 'kpi'
  | 'process'
  | 'problem-solution'
  | 'recommendations';

export type ImageFit = 'cover' | 'contain' | 'fill';

export interface SlideImage {
  id: string;
  dataUrl: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fit: ImageFit;
  opacity: number;
  borderRadius: number;
}

export type ChartType = 'bar' | 'line' | 'pie' | 'donut';

export interface ChartConfig {
  type: ChartType;
  title: string;
  labels: string[];
  datasets: { label: string; values: number[] }[];
}

export interface TableConfig {
  headers: string[];
  rows: string[][];
}

export interface TimelineItem {
  date: string;
  title: string;
  description: string;
}

export interface TimelineConfig {
  items: TimelineItem[];
}

export interface KpiItem {
  label: string;
  value: string;
  change?: string;
  icon?: string;
}

export interface KpiConfig {
  items: KpiItem[];
}

export type VisualBlockType = 'gradient' | 'shape' | 'icon-card';

export interface VisualBlock {
  type: VisualBlockType;
  colors: string[];
  label?: string;
}

export type FontWeight = 'normal' | 'bold';
export type FontStyle = 'normal' | 'italic';
export type TextAlign = 'left' | 'center' | 'right';

export interface TextStyle {
  titleFontSize?: number;
  titleColor?: string;
  titleBold?: FontWeight;
  titleItalic?: FontStyle;
  titleAlign?: TextAlign;
  titleFontFamily?: string;
  bodyFontSize?: number;
  bodyColor?: string;
  bodyBold?: FontWeight;
  bodyItalic?: FontStyle;
  bodyAlign?: TextAlign;
  bodyFontFamily?: string;
  bulletFontSize?: number;
  bulletColor?: string;
  accentColor?: string;
}

export const FONT_FAMILIES = [
  'Calibri',
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Verdana',
  'Trebuchet MS',
  'Garamond',
  'Palatino',
  'Tahoma',
];

export const FONT_SIZES = [10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 34, 38, 42, 48];

export interface SlideContent {
  id: string;
  layout: SlideLayoutType;
  title: string;
  subtitle?: string;
  bullets?: string[];
  body?: string;
  leftColumn?: string[];
  rightColumn?: string[];
  leftLabel?: string;
  rightLabel?: string;
  statement?: string;
  imageUrl?: string;
  agendaItems?: string[];
  summaryPoints?: string[];
  images?: SlideImage[];
  speakerNotes: string;
  chartConfig?: ChartConfig;
  tableConfig?: TableConfig;
  timelineConfig?: TimelineConfig;
  kpiConfig?: KpiConfig;
  visualBlock?: VisualBlock;
  textStyle?: TextStyle;
}

export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  preview: string;
  bgColor: string;
  bgColorAlt: string;
  titleColor: string;
  bodyColor: string;
  accentColor: string;
  accentColorAlt: string;
  titleFont: string;
  bodyFont: string;
  titleFontSize: number;
  bodyFontSize: number;
  bulletFontSize: number;
  coverTitleSize: number;
  sectionTitleSize: number;
  marginX: number;
  marginY: number;
  shapeAccent: boolean;
  gradientCover: boolean;
  darkTheme: boolean;
}

export interface PaletteConfig {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  bgLight: string;
  bgDark: string;
  gradient?: string;
}

export interface PresentationSettings {
  title: string;
  subtitle: string;
  purpose: PresentationPurpose;
  targetAudience: string;
  slideCount: number;
  tone: PresentationTone;
  themeId: string;
  layoutPreference: LayoutPreference;
  includeCover: boolean;
  includeAgenda: boolean;
  includeSummary: boolean;
  includeClosing: boolean;
  selectedPalette?: string;
}

export interface Presentation {
  id: string;
  settings: PresentationSettings;
  sourceType: SourceType;
  sourceContent: string;
  slides: SlideContent[];
  themeId: string;
  slideCount: number;
  createdAt: string;
  updatedAt: string;
  generationSettings?: Record<string, unknown>;
  presentationGoal?: string;
}
