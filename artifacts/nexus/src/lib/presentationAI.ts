import type { PresentationSettings, SlideContent } from '@/types/presentation';

const LONGCAT_API_URL = 'https://api.longcat.chat/openai/v1/chat/completions';
const PRESENTATION_AI_KEY = import.meta.env.VITE_PRESENTATION_AI_KEY || '';
const MODEL = 'LongCat-Flash-Chat';

export function isPresentationAIAvailable(): boolean {
  const hasKey = PRESENTATION_AI_KEY.length > 0;
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  return hasKey && isOnline;
}

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AISlideResponse {
  slideNumber: number;
  slideType: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  speakerNotes: string;
  visualSuggestion?: string;
  chartSuggestion?: {
    type: string;
    title: string;
    labels: string[];
    datasets: { label: string; values: number[] }[];
  };
  tableSuggestion?: {
    headers: string[];
    rows: string[][];
  };
  timelineSuggestion?: {
    items: { date: string; title: string; description: string }[];
  };
  kpiSuggestion?: {
    items: { label: string; value: string; change?: string }[];
  };
  keyTakeaway?: string;
  transitionToNext?: string;
}

export interface AIPresentationResponse {
  presentationTitle: string;
  slides: AISlideResponse[];
}

interface QualityIssue {
  slideIndex: number;
  issue: string;
}

const PLACEHOLDER_PATTERNS = [
  /key point about/i,
  /important detail/i,
  /add your.*here/i,
  /placeholder/i,
  /insert.*here/i,
  /your.*goes here/i,
  /lorem ipsum/i,
  /xxx/i,
  /tbd/i,
  /fill in/i,
];

function hasPlaceholderContent(text: string): boolean {
  return PLACEHOLDER_PATTERNS.some(p => p.test(text));
}

function validateQuality(slides: AISlideResponse[]): { valid: boolean; issues: QualityIssue[] } {
  const issues: QualityIssue[] = [];

  slides.forEach((slide, i) => {
    if (!slide.speakerNotes || slide.speakerNotes.trim().length < 5) {
      issues.push({ slideIndex: i, issue: `Slide ${i + 1} missing speaker notes` });
    }

    if (slide.bullets) {
      slide.bullets.forEach(b => {
        if (hasPlaceholderContent(b)) {
          issues.push({ slideIndex: i, issue: `Slide ${i + 1} has placeholder bullet: "${b}"` });
        }
      });
    }

    if (!slide.title || slide.title.trim().length === 0) {
      issues.push({ slideIndex: i, issue: `Slide ${i + 1} missing title` });
    }
  });

  return { valid: issues.length === 0, issues };
}

function parseAIResponse(raw: string): AIPresentationResponse {
  let cleaned = raw.trim();

  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    cleaned = jsonBlockMatch[1].trim();
  }

  const parsed = JSON.parse(cleaned);

  if (!parsed.presentationTitle || !Array.isArray(parsed.slides)) {
    throw new Error('Invalid AI response: missing presentationTitle or slides array');
  }

  for (const slide of parsed.slides) {
    if (!slide.slideType || !slide.title) {
      throw new Error('Invalid slide: missing slideType or title');
    }
    if (!slide.speakerNotes) {
      slide.speakerNotes = '';
    }
    if (typeof slide.slideNumber !== 'number') {
      slide.slideNumber = parsed.slides.indexOf(slide) + 1;
    }
  }

  return parsed as AIPresentationResponse;
}

async function callAI(messages: AIMessage[], maxTokens: number, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(LONGCAT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PRESENTATION_AI_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      throw new Error(`Presentation AI error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException || (err as Error).name === 'AbortError') {
      throw new Error('AI request timed out. Please try again.');
    }
    throw err;
  }
}

function buildSystemPrompt(): string {
  return `You are an expert presentation designer and content strategist. Generate structured JSON for professional presentations.

CRITICAL RULES:
- Output ONLY valid JSON, no markdown, no explanation text
- Every slide MUST have meaningful speakerNotes (2-4 sentences)
- NEVER use placeholder text like "Key point about...", "Important detail", "Add your X here", "TBD", "Lorem ipsum"
- All content must be specific, actionable, and professional
- Vary slide types for visual interest
- Include data visualizations where appropriate (charts, tables, timelines, KPIs)

Valid slideType values: cover, agenda, section-divider, title-bullets, two-column, image-text, big-statement, comparison, summary, closing, chart, table, timeline, kpi, process, problem-solution, recommendations`;
}

function buildTopicPrompt(settings: PresentationSettings): string {
  return `Create a ${settings.slideCount}-slide presentation about: "${settings.title}"
${settings.subtitle ? `Subtitle: "${settings.subtitle}"` : ''}
Purpose: ${settings.purpose}
Target audience: ${settings.targetAudience || 'general'}
Tone: ${settings.tone}
Layout preference: ${settings.layoutPreference}
${settings.includeCover ? 'Include a cover slide.' : ''}
${settings.includeAgenda ? 'Include an agenda slide.' : ''}
${settings.includeSummary ? 'Include a summary slide.' : ''}
${settings.includeClosing ? 'Include a closing slide.' : ''}

Respond with JSON in this exact format:
{
  "presentationTitle": "string",
  "slides": [
    {
      "slideNumber": 1,
      "slideType": "cover|agenda|section-divider|title-bullets|two-column|big-statement|comparison|summary|closing|chart|table|timeline|kpi|process|problem-solution|recommendations",
      "title": "string",
      "subtitle": "string (optional)",
      "bullets": ["string array (optional, for title-bullets/two-column)"],
      "speakerNotes": "string (REQUIRED, 2-4 sentences of what to say)",
      "visualSuggestion": "string (optional, describe a visual element)",
      "chartSuggestion": { "type": "bar|line|pie|donut", "title": "string", "labels": ["string"], "datasets": [{"label": "string", "values": [number]}] },
      "tableSuggestion": { "headers": ["string"], "rows": [["string"]] },
      "timelineSuggestion": { "items": [{"date": "string", "title": "string", "description": "string"}] },
      "kpiSuggestion": { "items": [{"label": "string", "value": "string", "change": "string (optional)"}] },
      "keyTakeaway": "string (optional)",
      "transitionToNext": "string (optional, transition phrase)"
    }
  ]
}

Use varied slide types. For data-heavy topics, include chart/table/kpi slides. Every slide must have specific, real content — no placeholders.`;
}

function buildFilePrompt(settings: PresentationSettings, sourceContent: string, parsedSections?: string[]): string {
  const sectionInfo = parsedSections?.length
    ? `\nDetected sections: ${parsedSections.join(', ')}`
    : '';

  const contentPreview = sourceContent.length > 6000
    ? sourceContent.substring(0, 6000) + '\n... (content truncated)'
    : sourceContent;

  return `Create a ${settings.slideCount}-slide presentation based on the following source document.
Purpose: ${settings.purpose}
Target audience: ${settings.targetAudience || 'general'}
Tone: ${settings.tone}
Layout preference: ${settings.layoutPreference}
${settings.includeCover ? 'Include a cover slide.' : ''}
${settings.includeAgenda ? 'Include an agenda slide.' : ''}
${settings.includeSummary ? 'Include a summary slide.' : ''}
${settings.includeClosing ? 'Include a closing slide.' : ''}
${sectionInfo}

SOURCE DOCUMENT:
---
${contentPreview}
---

Extract the key information from this document and structure it into a professional presentation.
Respond with JSON in this exact format:
{
  "presentationTitle": "string",
  "slides": [
    {
      "slideNumber": 1,
      "slideType": "cover|agenda|section-divider|title-bullets|two-column|big-statement|comparison|summary|closing|chart|table|timeline|kpi|process|problem-solution|recommendations",
      "title": "string",
      "subtitle": "string (optional)",
      "bullets": ["string array (optional)"],
      "speakerNotes": "string (REQUIRED, 2-4 sentences)",
      "visualSuggestion": "string (optional)",
      "chartSuggestion": { "type": "bar|line|pie|donut", "title": "string", "labels": ["string"], "datasets": [{"label": "string", "values": [number]}] },
      "tableSuggestion": { "headers": ["string"], "rows": [["string"]] },
      "timelineSuggestion": { "items": [{"date": "string", "title": "string", "description": "string"}] },
      "kpiSuggestion": { "items": [{"label": "string", "value": "string", "change": "string"}] },
      "keyTakeaway": "string (optional)",
      "transitionToNext": "string (optional)"
    }
  ]
}

Use content directly from the document. Every slide must have specific content — no placeholders.`;
}

export async function generatePresentationContent(
  settings: PresentationSettings,
  sourceContent?: string,
  parsedSections?: string[]
): Promise<AIPresentationResponse> {
  if (!isPresentationAIAvailable()) {
    throw new Error('Presentation AI is not available. Please add your VITE_PRESENTATION_AI_KEY.');
  }

  const systemPrompt = buildSystemPrompt();
  const userPrompt = sourceContent
    ? buildFilePrompt(settings, sourceContent, parsedSections)
    : buildTopicPrompt(settings);

  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const raw = await callAI(messages, 4000, 60000);

  let result: AIPresentationResponse;
  try {
    result = parseAIResponse(raw);
  } catch {
    const retryMessages: AIMessage[] = [
      { role: 'system', content: systemPrompt + '\n\nIMPORTANT: Your previous response was not valid JSON. Output ONLY the JSON object, no markdown fences, no extra text. Ensure all required fields are present.' },
      { role: 'user', content: userPrompt },
    ];
    const retryRaw = await callAI(retryMessages, 4000, 60000);
    result = parseAIResponse(retryRaw);
  }

  const quality = validateQuality(result.slides);
  if (!quality.valid) {
    result.slides = result.slides.map(slide => {
      if (!slide.speakerNotes || slide.speakerNotes.trim().length < 5) {
        slide.speakerNotes = `Present the key points about ${slide.title}. Emphasize the main takeaways and engage your audience with relevant examples.`;
      }
      if (slide.bullets) {
        slide.bullets = slide.bullets.filter(b => !hasPlaceholderContent(b));
      }
      return slide;
    });
  }

  return result;
}

export async function regenerateFullDeck(
  existingSlides: SlideContent[],
  settings: PresentationSettings,
  style?: string
): Promise<AIPresentationResponse> {
  if (!isPresentationAIAvailable()) {
    throw new Error('Presentation AI is not available. Please add your VITE_PRESENTATION_AI_KEY.');
  }

  const currentStructure = existingSlides.map((s, i) => ({
    number: i + 1,
    type: s.layout,
    title: s.title,
  }));

  const styleInstruction = style
    ? `\nAdapt the style to be more ${style}.`
    : '';

  const messages: AIMessage[] = [
    { role: 'system', content: buildSystemPrompt() },
    {
      role: 'user',
      content: `Regenerate this ${settings.slideCount}-slide presentation with fresh content.
Title: "${settings.title}"
Purpose: ${settings.purpose}
Audience: ${settings.targetAudience || 'general'}
Tone: ${settings.tone}
${styleInstruction}

Current slide structure for reference:
${JSON.stringify(currentStructure, null, 2)}

Generate a completely refreshed version with better content, varied slide types, and comprehensive speaker notes.
Respond with the same JSON format:
{
  "presentationTitle": "string",
  "slides": [{ 
    "slideNumber": number, 
    "slideType": "string", 
    "title": "string", 
    "subtitle": "string", 
    "bullets": ["string"], 
    "speakerNotes": "string (REQUIRED)", 
    "visualSuggestion": "string", 
    "chartSuggestion": { "type": "bar|line|pie|donut", "title": "string", "labels": ["string"], "datasets": [{"label": "string", "values": [number]}] },
    "tableSuggestion": { "headers": ["string"], "rows": [["string"]] },
    "timelineSuggestion": { "items": [{"date": "string", "title": "string", "description": "string"}] },
    "kpiSuggestion": { "items": [{"label": "string", "value": "string", "change": "string"}] },
    "keyTakeaway": "string", 
    "transitionToNext": "string" 
  }]
}`,
    },
  ];

  const raw = await callAI(messages, 4000, 60000);

  let result: AIPresentationResponse;
  try {
    result = parseAIResponse(raw);
  } catch {
    const retryMessages = [...messages];
    retryMessages[0] = {
      role: 'system',
      content: buildSystemPrompt() + '\n\nCRITICAL: Output ONLY valid JSON. No markdown fences, no extra text.',
    };
    const retryRaw = await callAI(retryMessages, 4000, 60000);
    result = parseAIResponse(retryRaw);
  }

  return result;
}

export async function regenerateSingleSlide(
  slide: SlideContent,
  context: { prevSlideTitle?: string; nextSlideTitle?: string; presentationTitle: string },
  settings: PresentationSettings
): Promise<AISlideResponse> {
  if (!isPresentationAIAvailable()) {
    throw new Error('Presentation AI is not available. Please add your VITE_PRESENTATION_AI_KEY.');
  }

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are an expert presentation designer. Regenerate a single slide with improved content. Output ONLY valid JSON for one slide object.`,
    },
    {
      role: 'user',
      content: `Regenerate this slide with better, more specific content.

Presentation: "${context.presentationTitle}"
Purpose: ${settings.purpose}
Tone: ${settings.tone}
${context.prevSlideTitle ? `Previous slide: "${context.prevSlideTitle}"` : ''}
${context.nextSlideTitle ? `Next slide: "${context.nextSlideTitle}"` : ''}

Current slide:
- Type: ${slide.layout}
- Title: "${slide.title}"
- Bullets: ${JSON.stringify(slide.bullets || [])}

Respond with JSON:
{
  "slideNumber": 1,
  "slideType": "${slide.layout}",
  "title": "string",
  "subtitle": "string",
  "bullets": ["string"],
  "speakerNotes": "string (REQUIRED, 2-4 sentences)",
  "visualSuggestion": "string",
  "chartSuggestion": { "type": "bar|line|pie|donut", "title": "string", "labels": ["string"], "datasets": [{"label": "string", "values": [number]}] },
  "tableSuggestion": { "headers": ["string"], "rows": [["string"]] },
  "timelineSuggestion": { "items": [{"date": "string", "title": "string", "description": "string"}] },
  "kpiSuggestion": { "items": [{"label": "string", "value": "string", "change": "string"}] },
  "keyTakeaway": "string",
  "transitionToNext": "string"
}`,
    },
  ];

  const raw = await callAI(messages, 800, 30000);

  let parsed: AISlideResponse;
  try {
    parsed = JSON.parse(raw.replace(/```(?:json)?\s*([\s\S]*?)```/, '$1').trim());
  } catch {
    const retryMessages: AIMessage[] = [
      { role: 'system', content: 'Output ONLY a valid JSON object for a single slide. No markdown, no extra text.' },
      messages[1],
    ];
    const retryRaw = await callAI(retryMessages, 800, 30000);
    parsed = JSON.parse(retryRaw.replace(/```(?:json)?\s*([\s\S]*?)```/, '$1').trim());
  }

  if (!parsed.speakerNotes || parsed.speakerNotes.trim().length < 5) {
    parsed.speakerNotes = `Discuss the key aspects of ${parsed.title}. Provide context and examples to keep your audience engaged.`;
  }

  return parsed;
}

export async function regenerateNotesOnly(
  slides: SlideContent[],
  settings: PresentationSettings
): Promise<string[]> {
  if (!isPresentationAIAvailable()) {
    throw new Error('Presentation AI is not available. Please add your VITE_PRESENTATION_AI_KEY.');
  }

  const slideInfo = slides.map((s, i) => ({
    number: i + 1,
    type: s.layout,
    title: s.title,
    bullets: s.bullets?.slice(0, 4),
  }));

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are an expert presentation coach. Generate compelling speaker notes for each slide. Output ONLY a JSON array of strings, one per slide.`,
    },
    {
      role: 'user',
      content: `Generate speaker notes for each slide in this ${settings.purpose} presentation titled "${settings.title}".
Tone: ${settings.tone}
Audience: ${settings.targetAudience || 'general'}

Slides:
${JSON.stringify(slideInfo, null, 2)}

Respond with a JSON array of strings (one per slide), each 2-4 sentences:
["notes for slide 1", "notes for slide 2", ...]`,
    },
  ];

  const raw = await callAI(messages, 2000, 45000);

  let notes: string[];
  try {
    const cleaned = raw.replace(/```(?:json)?\s*([\s\S]*?)```/, '$1').trim();
    notes = JSON.parse(cleaned);
  } catch {
    const retryMessages: AIMessage[] = [
      { role: 'system', content: 'Output ONLY a valid JSON array of strings. No markdown, no extra text.' },
      messages[1],
    ];
    const retryRaw = await callAI(retryMessages, 2000, 45000);
    notes = JSON.parse(retryRaw.replace(/```(?:json)?\s*([\s\S]*?)```/, '$1').trim());
  }

  if (!Array.isArray(notes)) {
    throw new Error('Invalid notes response: expected an array of strings');
  }

  while (notes.length < slides.length) {
    notes.push(`Present the key points of this slide and engage your audience with relevant examples.`);
  }

  return notes.slice(0, slides.length);
}
