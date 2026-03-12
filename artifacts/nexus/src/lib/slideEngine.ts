import type { SlideContent, SlideLayoutType, SlideImage, ChartConfig, TableConfig, TimelineConfig, KpiConfig, VisualBlock, PresentationSettings, TextStyle } from '@/types/presentation';
import type { AIPresentationResponse, AISlideResponse } from '@/lib/presentationAI';
import type { ParsedContent, ParsedSection } from '@/lib/fileParsers';
import { presentationThemes } from '@/lib/presentationThemes';

const MAX_BULLETS_PER_SLIDE = 6;
const MAX_BULLET_LENGTH = 120;
const MAX_BODY_LENGTH = 300;

function uid(): string {
  return crypto.randomUUID();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.substring(0, max - 3).trim() + '...';
}

function chunkBullets(bullets: string[], max: number): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < bullets.length; i += max) {
    chunks.push(bullets.slice(i, i + max).map(b => truncate(b, MAX_BULLET_LENGTH)));
  }
  return chunks;
}

const SLIDE_TYPE_MAP: Record<string, SlideLayoutType> = {
  'cover': 'cover',
  'title': 'cover',
  'agenda': 'agenda',
  'toc': 'agenda',
  'table-of-contents': 'agenda',
  'section-divider': 'section-divider',
  'section': 'section-divider',
  'divider': 'section-divider',
  'title-bullets': 'title-bullets',
  'bullets': 'title-bullets',
  'content': 'title-bullets',
  'two-column': 'two-column',
  'columns': 'two-column',
  'split': 'two-column',
  'image-text': 'image-text',
  'image': 'image-text',
  'big-statement': 'big-statement',
  'quote': 'big-statement',
  'statement': 'big-statement',
  'comparison': 'comparison',
  'compare': 'comparison',
  'vs': 'comparison',
  'summary': 'summary',
  'recap': 'summary',
  'closing': 'closing',
  'end': 'closing',
  'thank-you': 'closing',
  'chart': 'chart',
  'graph': 'chart',
  'data': 'chart',
  'table': 'table',
  'grid': 'table',
  'timeline': 'timeline',
  'history': 'timeline',
  'roadmap': 'timeline',
  'kpi': 'kpi',
  'metrics': 'kpi',
  'stats': 'kpi',
  'statistics': 'kpi',
  'process': 'process',
  'steps': 'process',
  'workflow': 'process',
  'flow': 'process',
  'problem-solution': 'problem-solution',
  'problem': 'problem-solution',
  'solution': 'problem-solution',
  'recommendations': 'recommendations',
  'recommendation': 'recommendations',
  'action-items': 'recommendations',
  'next-steps': 'recommendations',
};

function mapSlideType(aiType: string): SlideLayoutType {
  const normalized = aiType.toLowerCase().trim();
  return SLIDE_TYPE_MAP[normalized] || 'title-bullets';
}

const THEME_VISUAL_COLORS: Record<string, { primary: string[]; secondary: string[]; accent: string[] }> = {};

function getThemeColors(themeId: string): { primary: string[]; secondary: string[]; accent: string[] } {
  if (THEME_VISUAL_COLORS[themeId]) return THEME_VISUAL_COLORS[themeId];

  const theme = presentationThemes.find(t => t.id === themeId);
  if (theme) {
    return {
      primary: [`#${theme.accentColor}`, `#${theme.accentColorAlt}`],
      secondary: [`#${theme.bgColorAlt}`, `#${theme.accentColor}40`],
      accent: [`#${theme.accentColor}`, `#${theme.accentColorAlt}`, `#${theme.bgColorAlt}`],
    };
  }

  return {
    primary: ['#6366F1', '#818CF8'],
    secondary: ['#E0E7FF', '#C7D2FE'],
    accent: ['#6366F1', '#A78BFA', '#818CF8'],
  };
}

export function createVisualBlock(slideType: SlideLayoutType, themeId: string): VisualBlock {
  const colors = getThemeColors(themeId);

  switch (slideType) {
    case 'cover':
    case 'closing':
      return { type: 'gradient', colors: colors.primary };
    case 'section-divider':
      return { type: 'gradient', colors: colors.accent };
    case 'big-statement':
      return { type: 'gradient', colors: [colors.primary[0], colors.secondary[0]] };
    case 'chart':
    case 'kpi':
    case 'table':
      return { type: 'shape', colors: colors.secondary };
    case 'timeline':
    case 'process':
      return { type: 'shape', colors: colors.accent };
    case 'image-text':
      return { type: 'icon-card', colors: colors.primary };
    default:
      return { type: 'gradient', colors: colors.secondary };
  }
}

function convertChartSuggestion(suggestion: AISlideResponse['chartSuggestion']): ChartConfig | undefined {
  if (!suggestion) return undefined;
  const validTypes = ['bar', 'line', 'pie', 'donut'] as const;
  const chartType = validTypes.includes(suggestion.type as any)
    ? (suggestion.type as ChartConfig['type'])
    : 'bar';

  return {
    type: chartType,
    title: suggestion.title || 'Chart',
    labels: suggestion.labels || [],
    datasets: (suggestion.datasets || []).map(d => ({
      label: d.label || 'Data',
      values: d.values || [],
    })),
  };
}

function convertTableSuggestion(suggestion: AISlideResponse['tableSuggestion']): TableConfig | undefined {
  if (!suggestion) return undefined;
  return {
    headers: suggestion.headers || [],
    rows: suggestion.rows || [],
  };
}

export function generateAutoTextStyle(layout: SlideLayoutType, themeId: string, slideIndex: number): TextStyle {
  const theme = presentationThemes.find(t => t.id === themeId);
  if (!theme) return {};

  const style: TextStyle = {};

  switch (layout) {
    case 'cover':
      style.titleFontSize = theme.coverTitleSize;
      style.titleBold = 'bold';
      style.titleAlign = 'left';
      style.titleFontFamily = theme.titleFont;
      style.bodyFontSize = theme.bodyFontSize + 2;
      style.bodyAlign = 'left';
      style.titleColor = `#${theme.titleColor}`;
      style.bodyColor = `#${theme.bodyColor}`;
      break;
    case 'big-statement':
      style.titleFontSize = 28;
      style.titleBold = 'bold';
      style.titleAlign = 'center';
      style.titleFontFamily = theme.titleFont;
      style.bodyFontSize = theme.bodyFontSize + 2;
      style.bodyAlign = 'center';
      style.titleColor = `#${theme.titleColor}`;
      style.bodyColor = `#${theme.bodyColor}`;
      break;
    case 'section-divider':
      style.titleFontSize = theme.sectionTitleSize;
      style.titleBold = 'bold';
      style.titleAlign = 'left';
      style.titleFontFamily = theme.titleFont;
      style.titleColor = '#FFFFFF';
      style.bodyColor = '#FFFFFFCC';
      break;
    case 'closing':
      style.titleFontSize = theme.coverTitleSize;
      style.titleBold = 'bold';
      style.titleAlign = 'center';
      style.titleFontFamily = theme.titleFont;
      style.titleColor = '#FFFFFF';
      style.bodyColor = '#FFFFFFCC';
      break;
    case 'kpi':
      style.titleFontSize = theme.titleFontSize;
      style.titleBold = 'bold';
      style.bodyFontSize = theme.bodyFontSize;
      style.titleColor = `#${theme.titleColor}`;
      style.bodyColor = `#${theme.bodyColor}`;
      style.accentColor = `#${theme.accentColor}`;
      break;
    case 'chart':
    case 'table':
      style.titleFontSize = theme.titleFontSize;
      style.titleBold = 'bold';
      style.bodyFontSize = theme.bodyFontSize;
      style.titleColor = `#${theme.titleColor}`;
      style.bodyColor = `#${theme.bodyColor}`;
      break;
    default: {
      const fonts = [theme.titleFont, theme.bodyFont];
      const fontIdx = slideIndex % fonts.length;
      style.titleFontSize = theme.titleFontSize;
      style.titleBold = 'bold';
      style.titleFontFamily = fonts[fontIdx];
      style.bodyFontSize = theme.bodyFontSize;
      style.bodyFontFamily = theme.bodyFont;
      style.bulletFontSize = theme.bulletFontSize;
      style.titleColor = `#${theme.titleColor}`;
      style.bodyColor = `#${theme.bodyColor}`;
      style.bulletColor = `#${theme.bodyColor}`;
      break;
    }
  }

  return style;
}

export function generateImagePlaceholders(layout: SlideLayoutType): SlideImage[] {
  const img = (label: string, x: number, y: number, w: number, h: number, r = 8): SlideImage => ({
    id: uid(), dataUrl: '', label, x, y, width: w, height: h, fit: 'cover', opacity: 100, borderRadius: r,
  });

  switch (layout) {
    case 'cover':
      return [img('Cover Image', 68, 8, 28, 55, 10)];
    case 'image-text':
      return [img('Main Image', 62, 6, 34, 88, 8)];
    case 'two-column':
      return [];
    case 'title-bullets':
      return [img('Side Image', 72, 8, 24, 60, 8)];
    case 'section-divider':
      return [];
    case 'big-statement':
      return [];
    case 'comparison':
      return [];
    case 'closing':
      return [img('Closing Image', 68, 8, 28, 55, 10)];
    default:
      return [];
  }
}

export function getTextAreaWidth(layout: SlideLayoutType, images: SlideImage[]): number {
  if (!images || images.length === 0) return 100;
  const hasUploadedOrPlaceholder = images.some(img => img.x >= 55);
  if (!hasUploadedOrPlaceholder) return 100;
  const minX = Math.min(...images.filter(img => img.x >= 55).map(img => img.x));
  return Math.max(45, minX - 4);
}

function aiSlideToContent(aiSlide: AISlideResponse, themeId: string, slideIndex: number): SlideContent {
  const layout = mapSlideType(aiSlide.slideType);

  const slide: SlideContent = {
    id: uid(),
    layout,
    title: aiSlide.title || 'Untitled Slide',
    subtitle: aiSlide.subtitle,
    speakerNotes: aiSlide.speakerNotes || '',
    visualBlock: createVisualBlock(layout, themeId),
    textStyle: generateAutoTextStyle(layout, themeId, slideIndex),
    images: generateImagePlaceholders(layout),
  };

  if (aiSlide.bullets && aiSlide.bullets.length > 0) {
    slide.bullets = aiSlide.bullets.map(b => truncate(b, MAX_BULLET_LENGTH));
  }

  if (layout === 'two-column' && aiSlide.bullets && aiSlide.bullets.length > 1) {
    const mid = Math.ceil(aiSlide.bullets.length / 2);
    slide.leftColumn = aiSlide.bullets.slice(0, mid);
    slide.rightColumn = aiSlide.bullets.slice(mid);
    slide.leftLabel = 'Key Points';
    slide.rightLabel = 'Details';
    slide.bullets = undefined;
  }

  if (layout === 'comparison' && aiSlide.bullets && aiSlide.bullets.length > 1) {
    const mid = Math.ceil(aiSlide.bullets.length / 2);
    slide.leftColumn = aiSlide.bullets.slice(0, mid);
    slide.rightColumn = aiSlide.bullets.slice(mid);
    slide.leftLabel = 'Pros';
    slide.rightLabel = 'Cons';
    slide.bullets = undefined;
  }

  if (layout === 'big-statement') {
    slide.statement = aiSlide.keyTakeaway || aiSlide.title;
  }

  if (layout === 'agenda' && aiSlide.bullets) {
    slide.agendaItems = aiSlide.bullets;
    slide.bullets = undefined;
  }

  if (layout === 'summary' && aiSlide.bullets) {
    slide.summaryPoints = aiSlide.bullets;
    slide.bullets = undefined;
  }

  if (layout === 'chart' && aiSlide.chartSuggestion) {
    slide.chartConfig = convertChartSuggestion(aiSlide.chartSuggestion);
  }

  if (layout === 'table' && aiSlide.tableSuggestion) {
    slide.tableConfig = convertTableSuggestion(aiSlide.tableSuggestion);
  }

  if (layout === 'timeline' && aiSlide.bullets) {
    slide.timelineConfig = {
      items: aiSlide.bullets.map((b, i) => ({
        date: `Step ${i + 1}`,
        title: b.split(':')[0] || b,
        description: b.split(':').slice(1).join(':').trim() || b,
      })),
    };
  }

  if (layout === 'kpi' && aiSlide.bullets) {
    slide.kpiConfig = {
      items: aiSlide.bullets.slice(0, 6).map(b => {
        const parts = b.split(':');
        return {
          label: parts[0]?.trim() || b,
          value: parts[1]?.trim() || '—',
          change: parts[2]?.trim(),
        };
      }),
    };
  }

  if (layout === 'process' && aiSlide.bullets) {
    slide.bullets = aiSlide.bullets;
  }

  if (layout === 'problem-solution' && aiSlide.bullets) {
    const mid = Math.ceil(aiSlide.bullets.length / 2);
    slide.leftColumn = aiSlide.bullets.slice(0, mid);
    slide.rightColumn = aiSlide.bullets.slice(mid);
    slide.leftLabel = 'Problem';
    slide.rightLabel = 'Solution';
    slide.bullets = undefined;
  }

  if (layout === 'recommendations' && aiSlide.bullets) {
    slide.bullets = aiSlide.bullets;
  }

  return slide;
}

export function buildSlidesFromAI(aiResponse: AIPresentationResponse, themeId: string = 'modern-minimal-light'): SlideContent[] {
  return aiResponse.slides.map((aiSlide, idx) => aiSlideToContent(aiSlide, themeId, idx));
}

interface DeckValidationIssue {
  slideIndex: number;
  field: string;
  message: string;
}

export function validateDeck(slides: SlideContent[]): { valid: boolean; issues: DeckValidationIssue[] } {
  const issues: DeckValidationIssue[] = [];

  const placeholderPatterns = [
    /key point about/i,
    /important detail/i,
    /add your.*here/i,
    /placeholder/i,
    /insert.*here/i,
    /your.*goes here/i,
    /lorem ipsum/i,
    /tbd/i,
    /fill in/i,
  ];

  function hasPlaceholder(text: string): boolean {
    return placeholderPatterns.some(p => p.test(text));
  }

  slides.forEach((slide, i) => {
    if (!slide.title || slide.title.trim().length === 0) {
      issues.push({ slideIndex: i, field: 'title', message: `Slide ${i + 1} is missing a title` });
    }

    if (!slide.speakerNotes || slide.speakerNotes.trim().length < 5) {
      issues.push({ slideIndex: i, field: 'speakerNotes', message: `Slide ${i + 1} is missing speaker notes` });
    }

    if (slide.bullets) {
      slide.bullets.forEach((b, bi) => {
        if (hasPlaceholder(b)) {
          issues.push({ slideIndex: i, field: `bullets[${bi}]`, message: `Slide ${i + 1} has placeholder bullet: "${b}"` });
        }
      });
    }

    if (slide.layout === 'chart' && !slide.chartConfig) {
      issues.push({ slideIndex: i, field: 'chartConfig', message: `Slide ${i + 1} is a chart slide but has no chart data` });
    }

    if (slide.layout === 'table' && !slide.tableConfig) {
      issues.push({ slideIndex: i, field: 'tableConfig', message: `Slide ${i + 1} is a table slide but has no table data` });
    }

    if (slide.layout === 'timeline' && !slide.timelineConfig) {
      issues.push({ slideIndex: i, field: 'timelineConfig', message: `Slide ${i + 1} is a timeline slide but has no timeline data` });
    }

    if (slide.layout === 'kpi' && !slide.kpiConfig) {
      issues.push({ slideIndex: i, field: 'kpiConfig', message: `Slide ${i + 1} is a KPI slide but has no KPI data` });
    }
  });

  return { valid: issues.length === 0, issues };
}

function sectionToSlides(section: ParsedSection, themeId: string): SlideContent[] {
  const slides: SlideContent[] = [];
  const heading = section.heading || 'Key Points';

  if (section.bullets.length > 0) {
    const chunks = chunkBullets(section.bullets, MAX_BULLETS_PER_SLIDE);
    chunks.forEach((chunk) => {
      slides.push({
        id: uid(),
        layout: 'title-bullets',
        title: heading,
        bullets: chunk,
        speakerNotes: `Discuss the key points about ${heading}. Walk through each bullet and provide context.`,
        visualBlock: createVisualBlock('title-bullets', themeId),
      });
    });
  }

  if (section.paragraphs.length > 0) {
    const combined = section.paragraphs.join(' ');
    if (combined.length <= MAX_BODY_LENGTH) {
      if (slides.length === 0) {
        slides.push({
          id: uid(),
          layout: 'title-bullets',
          title: heading,
          body: combined,
          bullets: combined.split('. ').filter(s => s.trim()).map(s => truncate(s.trim(), MAX_BULLET_LENGTH)),
          speakerNotes: `Present the overview of ${heading}. Highlight the main message and supporting details.`,
          visualBlock: createVisualBlock('title-bullets', themeId),
        });
      } else {
        const last = slides[slides.length - 1];
        if (!last.body) {
          last.body = truncate(combined, MAX_BODY_LENGTH);
        }
      }
    } else {
      const sentences = combined.split(/(?<=[.!?])\s+/).filter(s => s.trim());
      const midpoint = Math.ceil(sentences.length / 2);
      slides.push({
        id: uid(),
        layout: 'two-column',
        title: heading,
        leftColumn: sentences.slice(0, midpoint).map(s => truncate(s.trim(), MAX_BULLET_LENGTH)),
        rightColumn: sentences.slice(midpoint).map(s => truncate(s.trim(), MAX_BULLET_LENGTH)),
        leftLabel: 'Overview',
        rightLabel: 'Details',
        speakerNotes: `Compare the overview and details of ${heading}. Guide the audience through both columns.`,
        visualBlock: createVisualBlock('two-column', themeId),
      });
    }
  }

  if (slides.length === 0) {
    slides.push({
      id: uid(),
      layout: 'title-bullets',
      title: heading,
      bullets: [
        `Overview of ${heading}`,
        'Key concepts and context',
        'Important details to note',
      ],
      speakerNotes: `Introduce the ${heading} section. Set expectations for what comes next and provide context.`,
      visualBlock: createVisualBlock('title-bullets', themeId),
    });
  }

  return slides;
}

function buildFromTopic(settings: PresentationSettings): SlideContent[] {
  const contentSlideCount = settings.slideCount
    - (settings.includeCover ? 1 : 0)
    - (settings.includeAgenda ? 1 : 0)
    - (settings.includeSummary ? 1 : 0)
    - (settings.includeClosing ? 1 : 0);

  const count = Math.max(2, contentSlideCount);
  const topicSlides: SlideContent[] = [];

  const purposes: Record<string, { title: string; layout: SlideLayoutType; notes: string }[]> = {
    pitch: [
      { title: 'Problem Statement', layout: 'big-statement', notes: 'Clearly state the problem your solution addresses.' },
      { title: 'Our Solution', layout: 'title-bullets', notes: 'Present your solution and its key differentiators.' },
      { title: 'Market Opportunity', layout: 'chart', notes: 'Show the market size and growth potential with data.' },
      { title: 'Business Model', layout: 'process', notes: 'Walk through how your business generates revenue.' },
      { title: 'Traction & Metrics', layout: 'kpi', notes: 'Highlight key performance indicators and growth metrics.' },
      { title: 'Team', layout: 'title-bullets', notes: 'Introduce the founding team and their expertise.' },
      { title: 'Financial Projections', layout: 'chart', notes: 'Present financial forecasts and key assumptions.' },
      { title: 'The Ask', layout: 'big-statement', notes: 'State what you need and what investors will get in return.' },
    ],
    report: [
      { title: 'Executive Summary', layout: 'title-bullets', notes: 'Provide a high-level overview of the findings.' },
      { title: 'Key Findings', layout: 'kpi', notes: 'Present the most important findings from the report.' },
      { title: 'Data Analysis', layout: 'chart', notes: 'Walk through the data and methodology used.' },
      { title: 'Trends & Patterns', layout: 'timeline', notes: 'Highlight notable trends observed in the data.' },
      { title: 'Recommendations', layout: 'recommendations', notes: 'Present actionable recommendations based on findings.' },
      { title: 'Next Steps', layout: 'process', notes: 'Outline the plan for implementing recommendations.' },
      { title: 'Appendix', layout: 'table', notes: 'Reference supporting data and additional resources.' },
    ],
    academic: [
      { title: 'Introduction', layout: 'title-bullets', notes: 'Introduce the research topic and its significance.' },
      { title: 'Literature Review', layout: 'title-bullets', notes: 'Summarize key prior research in this area.' },
      { title: 'Methodology', layout: 'process', notes: 'Explain the research methodology and approach.' },
      { title: 'Results', layout: 'chart', notes: 'Present the key results from the research.' },
      { title: 'Discussion', layout: 'two-column', notes: 'Discuss the implications of the findings.' },
      { title: 'Conclusion', layout: 'big-statement', notes: 'Summarize the main conclusions and contributions.' },
      { title: 'References', layout: 'table', notes: 'List the references cited in the presentation.' },
    ],
    marketing: [
      { title: 'Market Overview', layout: 'chart', notes: 'Present current market conditions and landscape.' },
      { title: 'Target Audience', layout: 'title-bullets', notes: 'Define the target audience segments.' },
      { title: 'Strategy', layout: 'process', notes: 'Outline the marketing strategy and approach.' },
      { title: 'Channels & Tactics', layout: 'two-column', notes: 'Detail the channels and tactics to be used.' },
      { title: 'Campaign Timeline', layout: 'timeline', notes: 'Walk through the campaign timeline and milestones.' },
      { title: 'Budget Allocation', layout: 'chart', notes: 'Break down the marketing budget by category.' },
      { title: 'Expected ROI', layout: 'kpi', notes: 'Present projected return on investment.' },
    ],
    business: [
      { title: 'Company Overview', layout: 'title-bullets', notes: 'Provide context about the company and its mission.' },
      { title: 'Current Situation', layout: 'kpi', notes: 'Present the current state of affairs with key metrics.' },
      { title: 'Objectives', layout: 'title-bullets', notes: 'Outline the strategic objectives.' },
      { title: 'Strategy', layout: 'process', notes: 'Walk through the proposed strategy.' },
      { title: 'Implementation Plan', layout: 'timeline', notes: 'Present the detailed implementation plan.' },
      { title: 'Resources Needed', layout: 'table', notes: 'Detail the resources required for implementation.' },
      { title: 'Timeline', layout: 'timeline', notes: 'Walk through the project timeline and key milestones.' },
    ],
    educational: [
      { title: 'Learning Objectives', layout: 'title-bullets', notes: 'Set clear learning objectives for the session.' },
      { title: 'Background', layout: 'title-bullets', notes: 'Provide background context for the topic.' },
      { title: 'Core Concepts', layout: 'two-column', notes: 'Explain the core concepts with examples.' },
      { title: 'Examples', layout: 'title-bullets', notes: 'Walk through practical examples.' },
      { title: 'Practice Exercise', layout: 'process', notes: 'Guide the audience through a practice exercise.' },
      { title: 'Key Takeaways', layout: 'big-statement', notes: 'Summarize the main takeaways from the session.' },
      { title: 'Further Reading', layout: 'table', notes: 'Recommend additional resources for learning.' },
    ],
    portfolio: [
      { title: 'About Me', layout: 'title-bullets', notes: 'Introduce yourself and your professional background.' },
      { title: 'Skills & Expertise', layout: 'kpi', notes: 'Showcase your key skills and areas of expertise.' },
      { title: 'Project Showcase', layout: 'two-column', notes: 'Present your featured projects.' },
      { title: 'Case Study', layout: 'problem-solution', notes: 'Walk through a detailed case study.' },
      { title: 'Results & Impact', layout: 'chart', notes: 'Present the measurable results of your work.' },
      { title: 'Testimonials', layout: 'big-statement', notes: 'Share client or colleague testimonials.' },
      { title: 'Contact', layout: 'title-bullets', notes: 'Provide your contact information and next steps.' },
    ],
    proposal: [
      { title: 'Introduction', layout: 'title-bullets', notes: 'Introduce the proposal and its context.' },
      { title: 'Problem Definition', layout: 'problem-solution', notes: 'Clearly define the problem to be solved.' },
      { title: 'Proposed Solution', layout: 'title-bullets', notes: 'Present the proposed solution in detail.' },
      { title: 'Methodology', layout: 'process', notes: 'Explain the methodology and approach.' },
      { title: 'Timeline & Milestones', layout: 'timeline', notes: 'Present the project timeline with milestones.' },
      { title: 'Budget', layout: 'table', notes: 'Break down the proposed budget.' },
      { title: 'Expected Outcomes', layout: 'kpi', notes: 'Present the expected outcomes and success metrics.' },
    ],
  };

  const sections = purposes[settings.purpose] || purposes.business;
  const themeId = settings.themeId || 'modern-minimal-light';

  for (let i = 0; i < count; i++) {
    const sectionDef = sections[i % sections.length];
    const slide: SlideContent = {
      id: uid(),
      layout: sectionDef.layout,
      title: sectionDef.title,
      speakerNotes: sectionDef.notes,
      visualBlock: createVisualBlock(sectionDef.layout, themeId),
    };

    if (sectionDef.layout === 'title-bullets') {
      slide.bullets = [];
    } else if (sectionDef.layout === 'two-column') {
      slide.leftColumn = [];
      slide.rightColumn = [];
      slide.leftLabel = 'Current State';
      slide.rightLabel = 'Future State';
    } else if (sectionDef.layout === 'big-statement') {
      slide.statement = sectionDef.title;
    } else if (sectionDef.layout === 'comparison') {
      slide.leftColumn = [];
      slide.rightColumn = [];
      slide.leftLabel = 'Strengths';
      slide.rightLabel = 'Considerations';
    } else if (sectionDef.layout === 'chart') {
      slide.chartConfig = {
        type: 'bar',
        title: sectionDef.title,
        labels: ['Category 1', 'Category 2', 'Category 3'],
        datasets: [{ label: 'Series 1', values: [0, 0, 0] }],
      };
    } else if (sectionDef.layout === 'table') {
      slide.tableConfig = {
        headers: ['Column 1', 'Column 2', 'Column 3'],
        rows: [['—', '—', '—']],
      };
    } else if (sectionDef.layout === 'timeline') {
      slide.timelineConfig = {
        items: [
          { date: 'Phase 1', title: 'Start', description: 'Initial phase' },
          { date: 'Phase 2', title: 'Progress', description: 'Development phase' },
          { date: 'Phase 3', title: 'Complete', description: 'Final phase' },
        ],
      };
    } else if (sectionDef.layout === 'kpi') {
      slide.kpiConfig = {
        items: [
          { label: 'Metric 1', value: '—' },
          { label: 'Metric 2', value: '—' },
          { label: 'Metric 3', value: '—' },
        ],
      };
    } else if (sectionDef.layout === 'process') {
      slide.bullets = [];
    } else if (sectionDef.layout === 'problem-solution') {
      slide.leftColumn = [];
      slide.rightColumn = [];
      slide.leftLabel = 'Problem';
      slide.rightLabel = 'Solution';
    } else if (sectionDef.layout === 'recommendations') {
      slide.bullets = [];
    }

    topicSlides.push(slide);
  }

  return topicSlides;
}

export function buildSlideBlueprint(
  settings: PresentationSettings,
  sourceType: string,
  parsedContent?: ParsedContent
): SlideContent[] {
  const slides: SlideContent[] = [];
  const themeId = settings.themeId || 'modern-minimal-light';

  if (settings.includeCover) {
    slides.push({
      id: uid(),
      layout: 'cover',
      title: settings.title,
      subtitle: settings.subtitle || `A ${settings.purpose} presentation`,
      speakerNotes: `Welcome the audience and introduce the presentation: ${settings.title}.`,
      visualBlock: createVisualBlock('cover', themeId),
    });
  }

  let contentSlides: SlideContent[] = [];

  if (sourceType === 'topic' || !parsedContent) {
    contentSlides = buildFromTopic(settings);
  } else {
    const sections = parsedContent.sections;
    for (const section of sections) {
      contentSlides.push(...sectionToSlides(section, themeId));
    }
  }

  if (settings.includeAgenda) {
    const agendaItems = contentSlides
      .filter(s => s.layout !== 'section-divider')
      .slice(0, 8)
      .map(s => s.title);
    slides.push({
      id: uid(),
      layout: 'agenda',
      title: 'Agenda',
      agendaItems: agendaItems.length > 0 ? agendaItems : ['Overview', 'Key Points', 'Discussion'],
      speakerNotes: 'Walk the audience through the agenda for this presentation.',
      visualBlock: createVisualBlock('agenda', themeId),
    });
  }

  const maxContentSlides = settings.slideCount
    - slides.length
    - (settings.includeSummary ? 1 : 0)
    - (settings.includeClosing ? 1 : 0);

  if (contentSlides.length > maxContentSlides) {
    contentSlides = contentSlides.slice(0, Math.max(1, maxContentSlides));
  }

  slides.push(...contentSlides);

  if (settings.includeSummary) {
    const summaryPoints = contentSlides.slice(0, 5).map(s => s.title);
    slides.push({
      id: uid(),
      layout: 'summary',
      title: 'Summary',
      summaryPoints: summaryPoints.length > 0 ? summaryPoints : ['Key takeaways from this presentation'],
      speakerNotes: 'Recap the main points covered in this presentation.',
      visualBlock: createVisualBlock('summary', themeId),
    });
  }

  if (settings.includeClosing) {
    slides.push({
      id: uid(),
      layout: 'closing',
      title: 'Thank You',
      subtitle: settings.subtitle || 'Questions & Discussion',
      speakerNotes: 'Thank the audience and open the floor for questions.',
      visualBlock: createVisualBlock('closing', themeId),
    });
  }

  return slides.map(s => ({
    ...s,
    images: s.images && s.images.length > 0 ? s.images : generateImagePlaceholders(s.layout),
  }));
}
