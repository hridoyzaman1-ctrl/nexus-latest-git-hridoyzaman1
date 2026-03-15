// Content Media Engine — shared script generation, TTS control, video scene building
// 100% local, 100% free, no backend, no paid APIs
// Audio: Web Speech API (speechSynthesis)
// Video: Canvas API + MediaRecorder

import type { VideoScene } from './mediaStorage';
import { renderBgmBuffer, BGM_VOLUME, BGM_FADE_SECS } from './bgmEngine';

// ── Limits config ─────────────────────────────────────────────────────────────

export type MediaMode = 'summary' | 'explainer' | 'podcast' | 'video';
export type SourceModule = 'books' | 'study' | 'notes' | 'presentations' | 'coach' | 'audio-studio' | 'video-studio' | 'other';

export interface ModeLimits {
  maxWords: number;
  maxPages: number;
  maxAudioSeconds: number;
  maxVideoSeconds: number;
}

const LIMITS: Record<SourceModule, Record<MediaMode, ModeLimits>> = {
  books: {
    summary:  { maxWords: 12000, maxPages: 20, maxAudioSeconds: 240, maxVideoSeconds: 180 },
    explainer:{ maxWords: 9000,  maxPages: 15, maxAudioSeconds: 360, maxVideoSeconds: 180 },
    podcast:  { maxWords: 7500,  maxPages: 12, maxAudioSeconds: 480, maxVideoSeconds: 180 },
    video:    { maxWords: 4500,  maxPages: 8,  maxAudioSeconds: 240, maxVideoSeconds: 180 },
  },
  study: {
    summary:  { maxWords: 15000, maxPages: 25, maxAudioSeconds: 300, maxVideoSeconds: 240 },
    explainer:{ maxWords: 10000, maxPages: 20, maxAudioSeconds: 420, maxVideoSeconds: 240 },
    podcast:  { maxWords: 8000,  maxPages: 15, maxAudioSeconds: 600, maxVideoSeconds: 240 },
    video:    { maxWords: 5000,  maxPages: 10, maxAudioSeconds: 300, maxVideoSeconds: 240 },
  },
  notes: {
    summary:  { maxWords: 6000,  maxPages: 999, maxAudioSeconds: 240, maxVideoSeconds: 180 },
    explainer:{ maxWords: 5000,  maxPages: 999, maxAudioSeconds: 360, maxVideoSeconds: 180 },
    podcast:  { maxWords: 4000,  maxPages: 999, maxAudioSeconds: 480, maxVideoSeconds: 180 },
    video:    { maxWords: 2500,  maxPages: 999, maxAudioSeconds: 240, maxVideoSeconds: 180 },
  },
  presentations: {
    summary:  { maxWords: 6000,  maxPages: 20, maxAudioSeconds: 240, maxVideoSeconds: 180 },
    explainer:{ maxWords: 5000,  maxPages: 15, maxAudioSeconds: 360, maxVideoSeconds: 180 },
    podcast:  { maxWords: 4000,  maxPages: 12, maxAudioSeconds: 480, maxVideoSeconds: 180 },
    video:    { maxWords: 3000,  maxPages: 10, maxAudioSeconds: 180, maxVideoSeconds: 180 },
  },
  coach: {
    summary:  { maxWords: 3000,  maxPages: 999, maxAudioSeconds: 180, maxVideoSeconds: 180 },
    explainer:{ maxWords: 3000,  maxPages: 999, maxAudioSeconds: 300, maxVideoSeconds: 180 },
    podcast:  { maxWords: 3000,  maxPages: 999, maxAudioSeconds: 300, maxVideoSeconds: 180 },
    video:    { maxWords: 3000,  maxPages: 999, maxAudioSeconds: 180, maxVideoSeconds: 180 },
  },
  'audio-studio': {
    summary:  { maxWords: 12000, maxPages: 999, maxAudioSeconds: 300, maxVideoSeconds: 180 },
    explainer:{ maxWords: 10000, maxPages: 999, maxAudioSeconds: 420, maxVideoSeconds: 180 },
    podcast:  { maxWords: 8000,  maxPages: 999, maxAudioSeconds: 600, maxVideoSeconds: 180 },
    video:    { maxWords: 5000,  maxPages: 999, maxAudioSeconds: 300, maxVideoSeconds: 180 },
  },
  'video-studio': {
    summary:  { maxWords: 8000,  maxPages: 999, maxAudioSeconds: 240, maxVideoSeconds: 240 },
    explainer:{ maxWords: 7000,  maxPages: 999, maxAudioSeconds: 360, maxVideoSeconds: 240 },
    podcast:  { maxWords: 6000,  maxPages: 999, maxAudioSeconds: 480, maxVideoSeconds: 240 },
    video:    { maxWords: 5000,  maxPages: 999, maxAudioSeconds: 300, maxVideoSeconds: 300 },
  },
  other: {
    summary:  { maxWords: 3000,  maxPages: 10,  maxAudioSeconds: 180, maxVideoSeconds: 90 },
    explainer:{ maxWords: 3000,  maxPages: 10,  maxAudioSeconds: 180, maxVideoSeconds: 90 },
    podcast:  { maxWords: 3000,  maxPages: 10,  maxAudioSeconds: 180, maxVideoSeconds: 90 },
    video:    { maxWords: 2000,  maxPages: 8,   maxAudioSeconds: 90,  maxVideoSeconds: 90 },
  },
};

export function getLimits(module: SourceModule, mode: MediaMode): ModeLimits {
  return LIMITS[module]?.[mode] ?? LIMITS.other[mode];
}

// ── Text helpers ──────────────────────────────────────────────────────────────

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Estimate TTS duration in seconds (avg 130 wpm for TTS) */
export function estimateSpeechSeconds(text: string): number {
  return Math.ceil((countWords(text) / 130) * 60);
}

export function truncateToWordLimit(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  // Trim at word boundary first, then snap back to the last sentence end
  return trimToLastSentence(words.slice(0, maxWords).join(' '));
}

/**
 * Trim text so it ends at the last complete sentence boundary.
 * Handles: English . ! ?   Bangla । ॥   Arabic ؟   CJK 。   fullwidth ！ ？
 * Prevents scripts from ending mid-sentence after word-count truncation
 * or AI token cutoffs. Exported so the modal can apply it post-AI too.
 */
export function trimToLastSentence(text: string): string {
  if (!text) return text;
  // Sentence-ending punctuation (ASCII + Bangla danda + Arabic ? + CJK period + fullwidth)
  // U+0964 = ।  U+0965 = ॥  U+061F = ؟  U+3002 = 。  U+FF01 = ！  U+FF1F = ？
  const SENT_END_RE = /[.!?\u0964\u0965\u061F\u3002\uFF01\uFF1F]["'\u2019\u201d]?\s*$/;
  const SENT_MATCH_RE = /[.!?\u0964\u0965\u061F\u3002\uFF01\uFF1F]["'\u2019\u201d]?(?=\s|$)/g;
  // Already ends with sentence-ending punctuation
  if (SENT_END_RE.test(text)) return text.trim();
  // Collect all positions where a sentence ends
  const endings = [...text.matchAll(SENT_MATCH_RE)];
  if (endings.length === 0) return text.trim(); // no sentence end found — return as-is
  const last = endings[endings.length - 1];
  const cutPos = (last.index ?? 0) + last[0].length;
  // Only trim if we're keeping at least 35 % of the text (avoid over-trimming short inputs)
  if (cutPos >= text.length * 0.35) {
    return text.slice(0, cutPos).trim();
  }
  return text.trim();
}

/**
 * Strip everything from an AI response that is not meant to be spoken aloud.
 * - Markdown bold/italic/headers
 * - Stage directions in brackets: [music], [pause], [cut to]
 * - Production notes in parens that contain music/sound/sfx keywords
 * - Preamble lines like "Here is your script:", "Audio Script:", "Video Script:"
 * - Metadata lines: (Duration: ...), *540 words*, etc.
 * - Trailing/leading whitespace and collapsed blank lines
 */
export function sanitiseAIScript(raw: string): string {
  const cleaned = raw
    // Strip markdown bold/italic
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
    // Strip markdown headings (## Heading)
    .replace(/^#{1,6}\s+.*/gm, '')
    // Strip stage directions in brackets or parentheses
    .replace(/\[([^\]\n]*)\]/g, '')
    .replace(/\(([^)\n]*(music|sound|sfx|pause|cue|fade|beat|ambien)[^)\n]*)\)/gi, '')
    // Strip preamble lines (e.g. "Here's your script:", "Below is the narration:")
    .replace(/^[^\n.!?]*?(here'?s?|below is|this is|audio script|video script|narration script|script for)[^\n]*[\n:]/gim, '')
    // Strip metadata lines (duration, word count)
    .replace(/^\*?\(?(duration|word count|~?\d+\s*min|~?\d+\s*words?)[^)\n]*\)?\*?\n?/gim, '')
    // Strip section/label headers like "Introduction:", "Key Points:", "Conclusion:", "Summary:", "Overview:", "Section 1:", "Part 1:", etc.
    .replace(/^(introduction|summary|overview|conclusion|outro|intro|key\s*points?|key\s*takeaways?|takeaways?|highlights?|topics?\s*covered|section\s*\d*|part\s*\d*|chapter\s*\d*|segment\s*\d*|narration|script|podcast|explainer|video)\s*:?\s*$/gim, '')
    // Strip numbered/lettered standalone section markers ("1.", "2.", "A.", "B.", etc.)
    .replace(/^(\d+\.|\([a-zA-Z]\)|\([0-9]+\))\s*$/gm, '')
    // Strip ALL-CAPS lines that are short standalone headings (e.g. "KEY POINTS", "INTRODUCTION")
    .replace(/^[A-Z][A-Z\s\d]{3,50}$\n?/gm, (m) => {
      // only remove if the line is clearly a heading (no sentence-ending punctuation)
      return /[.!?,;]/.test(m) ? m : '';
    })
    // Strip horizontal rules
    .replace(/^\s*[-–—_*#]{3,}\s*$/gm, '')
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  // Ensure output ends at a complete sentence boundary
  return trimToLastSentence(cleaned);
}

function cleanText(text: string): string {
  return text
    // Strip page/slide markers added by extractors
    .replace(/\[Page \d+\]/g, '')
    .replace(/\[Slide \d+\]/g, '')
    .replace(/\[Info\].*$/gm, '')
    // Strip markdown formatting
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
    .replace(/^#{1,6}\s+.*/gm, '')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    // Strip CSS/SVG style declarations (font-family, font-size, fill, etc.)
    .replace(/\b(font-family|font-size|font-weight|font-style|font-variant|letter-spacing|word-spacing|text-anchor|text-decoration|line-height|fill|stroke|color|background|opacity|visibility|display|overflow)\s*:\s*[^;\n}]{0,120}[;]?/gi, '')
    // Strip standalone common font name lines
    .replace(/^[ \t]*(Helvetica|Arial|Times(\s+New\s+Roman)?|Calibri|Cambria|Courier(\s+New)?|Verdana|Georgia|Tahoma|Trebuchet(\s+MS)?|Gill\s+Sans|Futura|Garamond|Palatino|Century|Roboto|Lato|Montserrat|Open\s+Sans|Noto\s+Sans|Source\s+Sans|Liberation|DejaVu|Ubuntu|Kalpurush|SolaimanLipi|Nikosh)(\s+(Bold|Italic|Regular|Light|Medium|Black|\d+))?\s*$/gim, '')
    // Strip standalone size tokens ("18px", "12pt", "1.5em")
    .replace(/^\s*\d+(\.\d+)?\s*(px|pt|em|rem|%|sp|dp)\s*$/gm, '')
    // Strip standalone hex colour codes
    .replace(/^\s*#[0-9a-fA-F]{3,8}\s*$/gm, '')
    // Strip bare URLs
    .replace(/https?:\/\/\S+/g, '')
    // Normalise whitespace
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractSentences(text: string): string[] {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);
}

function extractBulletPoints(text: string): string[] {
  const lines = text.split('\n');
  const bullets: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^[-•*▪▸►➤✓✔☐☑]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed)) {
      bullets.push(trimmed.replace(/^[-•*▪▸►➤✓✔☐☑]\s*/, '').replace(/^\d+[.)]\s*/, '').trim());
    }
  }
  return bullets.filter(b => b.length > 5).slice(0, 15);
}

function extractHeadings(text: string): string[] {
  const lines = text.split('\n');
  const headings: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.length < 3 || t.length > 80) continue;
    if (/^#{1,6}\s/.test(t)) {
      headings.push(t.replace(/^#{1,6}\s*/, '').trim());
    } else if (t === t.toUpperCase() && t.length > 4 && t.length < 60 && /[A-Z]/.test(t)) {
      headings.push(t);
    }
  }
  return [...new Set(headings)].slice(0, 10);
}

function extractTopParagraphs(text: string, n = 5): string[] {
  return text
    .split(/\n\n+/)
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(p => p.length > 60)
    .slice(0, n);
}

// ── Script builders ───────────────────────────────────────────────────────────

const BN = {
  summaryOf: (t: string) => `"${t}"-এর সারসংক্ষেপ।`,
  coversTopics: (h: string) => `এই বিষয়বস্তুতে রয়েছে: ${h}।`,
  hereAreMain: 'এখানে মূল বিষয়গুলি রয়েছে।',
  keyPoint: (i: number) => `মূল বিষয় ${i + 1}:`,
  importantHighlights: 'গুরুত্বপূর্ণ বিষয়সমূহ:',
  concludes: (t: string) => `এটি "${t}"-এর সারসংক্ষেপের সমাপ্তি।`,
  welcomeExplainer: (t: string) => `"${t}" বিষয়ক এই ব্যাখ্যায় আপনাকে স্বাগতম।`,
  explainerGoThrough: (h: string) => `এই ব্যাখ্যায়, আমরা আলোচনা করব ${h}।`,
  explainerBreakDown: (t: string) => `এই ব্যাখ্যায়, আমরা "${t}" থেকে মূল ধারণাগুলি ব্যাখ্যা করব।`,
  keyHighlights: 'আসুন মূল বিষয়গুলি দেখি।',
  point: (i: number) => `বিষয় ${i + 1}:`,
  letsReview: 'আসুন পুনরালোচনা করি।',
  fullExplainer: (t: string) => `এটি "${t}"-এর সম্পূর্ণ ব্যাখ্যা। শুনার জন্য ধন্যবাদ।`,
  podcastIntro: (t: string) => `নমস্কার! আবারও স্বাগতম। আজ আমরা "${t}" নিয়ে আলোচনা করব। এটি একটি চমৎকার পর্ব হতে চলেছে, তাই চলুন শুরু করি।`,
  coveringToday: (h: string) => `আজ আমরা যা নিয়ে আলোচনা করব: ${h}। দারুণ বিষয়!`,
  richInsights: 'আজকের বিষয়টি অনেক তথ্যসমৃদ্ধ। চলুন সবচেয়ে আকর্ষণীয় বিষয়গুলি নিয়ে আলোচনা করি।',
  connectors: ['তাই,', 'এখন,', 'আকর্ষণীয়ভাবে,', 'বিষয়টি হল,', 'যা আশ্চর্যজনক তা হল'],
  keyTakeaways: 'এখন মূল শিক্ষণীয় বিষয়গুলি জানাই।',
  number: (i: number) => `নম্বর ${i + 1}:`,
  sumUp: 'সবচেয়ে গুরুত্বপূর্ণ বিষয়গুলি সংক্ষেপে জানাই।',
  wrapUp: (t: string, h: string) => `ঠিক আছে, শেষ করা যাক। আজ আমরা "${t}" নিয়ে আলোচনা করলাম। ${h ? `মূল বিষয়গুলি ছিল: ${h}।` : ''} আশা করি আপনি এটি মূল্যবান মনে করেছেন!`,
  outro: 'শুনার জন্য ধন্যবাদ! আবার দেখা হবে।',
  keyConceptsInsights: 'মূল ধারণা ও অন্তর্দৃষ্টি',
  topicsCovered: 'আলোচিত বিষয়সমূহ',
  keyPoints: (idx: number) => `মূল বিষয়সমূহ${idx > 0 ? ` (${idx + 1})` : ''}`,
  section: (i: number) => `অনুচ্ছেদ ${i + 1}`,
  recap: 'পুনরালোচনা',
} as const;

export function buildSummaryScript(rawText: string, _title: string, lang = 'en'): string {
  const text = cleanText(rawText);
  const sentences = extractSentences(text);
  const bullets = extractBulletPoints(text);

  const topSentences = sentences.slice(0, 8).join(' ');
  const keyPoints = bullets.length > 0
    ? bullets.slice(0, 6).map(b => /[.!?]$/.test(b.trim()) ? b : b + '.').join(' ')
    : sentences.slice(8, 14).join(' ');

  return trimToLastSentence([topSentences, keyPoints].filter(Boolean).join(' '));
}

export function buildExplainerScript(rawText: string, title: string, lang = 'en'): string {
  const bn = lang === 'bn';
  const text = cleanText(rawText);
  const sentences = extractSentences(text);
  const bullets = extractBulletPoints(text);
  const paragraphs = extractTopParagraphs(text, 6);

  const mainExplain = paragraphs.length > 0
    ? paragraphs.join(' ')
    : sentences.slice(0, 20).join(' ');

  const keyHighlights = bullets.length > 0
    ? bullets.slice(0, 8).map(b => /[.!?]$/.test(b.trim()) ? b : b + '.').join(' ')
    : '';

  return trimToLastSentence([
    mainExplain,
    keyHighlights,
    sentences.slice(-4).join(' '),
  ].filter(Boolean).join(' '));
}

export function buildPodcastScript(rawText: string, title: string, lang = 'en'): string {
  const bn = lang === 'bn';
  const text = cleanText(rawText);
  const sentences = extractSentences(text);
  const bullets = extractBulletPoints(text);
  const paragraphs = extractTopParagraphs(text, 8);

  const connectors = bn
    ? BN.connectors
    : ['So,', 'Now,', 'Interestingly,', "Here's the thing,", "What's fascinating is that"];

  const mainContent = paragraphs.length > 0
    ? paragraphs.map((p, i) => `${connectors[i % connectors.length]} ${p}`).join(' ')
    : sentences.slice(0, 25).join(' ');

  const keyTakeaways = bullets.length > 0
    ? bullets.slice(0, 6).map(b => /[.!?]$/.test(b.trim()) ? b : b + '.').join(' ')
    : sentences.slice(-8).join(' ');

  return trimToLastSentence([mainContent, keyTakeaways].filter(Boolean).join(' '));
}

export function buildVideoScenes(rawText: string, title: string, lang = 'en'): VideoScene[] {
  const bn = lang === 'bn';
  const text = cleanText(rawText);
  const sentences = extractSentences(text);
  const bullets = extractBulletPoints(text);
  const headings = extractHeadings(text);
  const paragraphs = extractTopParagraphs(text, 5);

  const scenes: VideoScene[] = [];

  // How many chars fit comfortably on a 480×270 slide body area at readable font size.
  // Empirically: ~260 chars renders cleanly at ≥11px across 7–8 lines.
  const BODY_MAX_CHARS = 260;
  // Max chars per individual bullet item (one line ~80px at bullet size)
  const BULLET_MAX_CHARS = 90;

  // Trim a bullet item to max chars at word boundary
  const trimBullet = (b: string) =>
    b.length <= BULLET_MAX_CHARS ? b : trimBodyText(b, BULLET_MAX_CHARS);

  // Title card
  scenes.push({
    type: 'title',
    heading: title,
    body: headings.slice(0, 3).join(' · ') || (bn ? BN.keyConceptsInsights : 'Key concepts & insights'),
    duration: 4,
  });

  // Overview — bullet list of headings (already short)
  if (headings.length > 0) {
    scenes.push({
      type: 'keypoint',
      heading: bn ? BN.topicsCovered : 'Topics Covered',
      body: headings.slice(0, 5).map(h => `• ${trimBullet(h)}`).join('\n'),
      duration: 5,
    });
  }

  // Key points from bullets — max 3 per slide, each bullet trimmed
  const pointGroups: string[][] = [];
  for (let i = 0; i < Math.min(bullets.length, 9); i += 3) {
    pointGroups.push(bullets.slice(i, i + 3));
  }
  pointGroups.forEach((group, idx) => {
    scenes.push({
      type: 'keypoint',
      heading: bn ? BN.keyPoints(idx) : `Key Points ${idx > 0 ? `(${idx + 1})` : ''}`.trim(),
      body: group.map(b => `• ${trimBullet(b)}`).join('\n'),
      duration: Math.max(5, group.length * 2),
    });
  });

  // Content paragraphs — always trimmed at sentence boundary
  paragraphs.slice(0, 4).forEach((para, i) => {
    const body = trimBodyText(para, BODY_MAX_CHARS);
    scenes.push({
      type: i % 2 === 0 ? 'definition' : 'example',
      heading: headings[i + 1] || (bn ? BN.section(i) : `Section ${i + 1}`),
      body,
      duration: Math.max(5, Math.ceil(countWords(body) / 40)),
    });
  });

  // If no bullets/headings, use sentence groups — trimmed at sentence boundary
  if (scenes.length < 4) {
    const senGroups: string[][] = [];
    for (let i = 0; i < Math.min(sentences.length, 12); i += 3) {
      senGroups.push(sentences.slice(i, i + 3));
    }
    senGroups.slice(0, 4).forEach((group, i) => {
      const body = trimBodyText(group.join(' '), BODY_MAX_CHARS);
      scenes.push({
        type: 'keypoint',
        heading: bn ? BN.section(i) : `Section ${i + 1}`,
        body,
        duration: Math.max(5, Math.ceil(countWords(body) / 40)),
      });
    });
  }

  // Recap — bullet list or trimmed sentences
  const recapText = bullets.length > 0
    ? bullets.slice(0, 4).map(b => `• ${trimBullet(b)}`).join('\n')
    : trimBodyText(sentences.slice(-3).join(' '), BODY_MAX_CHARS);
  scenes.push({
    type: 'recap',
    heading: bn ? BN.recap : 'Recap',
    body: recapText,
    duration: 5,
  });

  // Cap at 12 scenes max
  return scenes.slice(0, 12);
}

export function buildScriptForMode(
  rawText: string,
  title: string,
  mode: MediaMode,
  lang = 'en'
): { script: string; scenes?: VideoScene[]; sceneScripts?: string[] } {
  switch (mode) {
    case 'summary':
      return { script: buildSummaryScript(rawText, title, lang) };
    case 'explainer':
      return { script: buildExplainerScript(rawText, title, lang) };
    case 'podcast':
      return { script: buildPodcastScript(rawText, title, lang) };
    case 'video': {
      const scenes = buildVideoScenes(rawText, title, lang);
      const sceneScripts = scenes.map((s, i) => {
        const spokenBody = trimToLastSentence(
          s.body
            .replace(/^[•\-\*]\s*/gm, '')
            .replace(/\n+/g, ' ')
            .trim()
        );
        const text = i === 0 ? spokenBody : `${s.heading}. ${spokenBody}`;
        // Ensure each scene script ends with a period
        return /[.!?]$/.test(text.trim()) ? text : text + '.';
      });
      const script = sceneScripts.join('. ');
      return { script, scenes, sceneScripts };
    }
  }
}

// ── TTS Controller ────────────────────────────────────────────────────────────

export interface TTSOptions {
  voice?: SpeechSynthesisVoice | null;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
  onChunkStart?: (index: number, total: number, text: string) => void;
  onEnd?: () => void;
  onError?: (msg: string) => void;
}

/** Split long script into speakable chunks (sentences, max ~300 chars each) */
export function chunkScript(script: string): string[] {
  const sentences = script
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const chunks: string[] = [];
  let current = '';
  for (const s of sentences) {
    if ((current + ' ' + s).trim().length > 280) {
      if (current) chunks.push(current.trim());
      current = s;
    } else {
      current = current ? current + ' ' + s : s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [script.slice(0, 500)];
}

export class TTSController {
  private chunks: string[] = [];
  private currentIdx = 0;
  private cancelled = false;
  private paused = false;
  private opts: TTSOptions;

  constructor(opts: TTSOptions = {}) {
    this.opts = opts;
  }

  start(script: string) {
    this.chunks = chunkScript(script);
    this.currentIdx = 0;
    this.cancelled = false;
    this.paused = false;
    this.speakNext();
  }

  private speakNext() {
    if (this.cancelled || this.paused) return;
    if (this.currentIdx >= this.chunks.length) {
      this.opts.onEnd?.();
      return;
    }

    const chunk = this.chunks[this.currentIdx];
    const utt = new SpeechSynthesisUtterance(chunk);
    if (this.opts.voice) utt.voice = this.opts.voice;
    if (this.opts.lang) utt.lang = this.opts.lang;
    utt.rate = this.opts.rate ?? 1;
    utt.pitch = this.opts.pitch ?? 1;
    utt.volume = this.opts.volume ?? 1;

    utt.onstart = () => {
      this.opts.onChunkStart?.(this.currentIdx, this.chunks.length, chunk);
    };

    utt.onend = () => {
      if (!this.cancelled && !this.paused) {
        this.currentIdx++;
        this.speakNext();
      }
    };

    utt.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        this.opts.onError?.(`Speech error: ${e.error}`);
      }
    };

    window.speechSynthesis.speak(utt);
  }

  pause() {
    this.paused = true;
    window.speechSynthesis.pause();
  }

  resume() {
    this.paused = false;
    window.speechSynthesis.resume();
    // Some browsers lose the paused utterance — fall back to re-speaking current chunk
    setTimeout(() => {
      if (!this.paused && !this.cancelled && !window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
        this.speakNext();
      }
    }, 250);
  }

  stop() {
    this.cancelled = true;
    this.paused = false;
    window.speechSynthesis.cancel();
  }

  restart(script: string) {
    this.stop();
    setTimeout(() => this.start(script), 100);
  }

  setVolume(v: number) {
    this.opts.volume = v;
  }

  get totalChunks() { return this.chunks.length; }
  get currentChunk() { return this.currentIdx; }
  get isAtEnd() { return this.currentIdx >= this.chunks.length; }
}

// ── Available voices ──────────────────────────────────────────────────────────

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis?.getVoices() ?? [];
}

export function getDefaultVoice(lang = 'en'): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  return (
    voices.find(v => v.default && v.lang.startsWith(lang)) ||
    voices.find(v => v.lang.startsWith(lang)) ||
    voices[0] ||
    null
  );
}

// ── Video canvas renderer ─────────────────────────────────────────────────────

// Base HSL values for backgrounds [h, s, l]
const SCENE_HSL: Record<VideoScene['type'], [number, number, number]> = {
  title:      [245, 58, 14],
  keypoint:   [220, 40, 10],
  definition: [199, 55, 11],
  quote:      [280, 45, 12],
  example:    [152, 45, 9],
  recap:      [245, 52, 13],
};

const ACCENT_COLORS: Record<VideoScene['type'], string> = {
  title:      'hsl(245, 70%, 68%)',
  keypoint:   'hsl(210, 80%, 62%)',
  definition: 'hsl(199, 89%, 52%)',
  quote:      'hsl(291, 70%, 62%)',
  example:    'hsl(152, 69%, 48%)',
  recap:      'hsl(38, 92%, 58%)',
};

// Large decorative glyph per scene type
const SCENE_GLYPHS: Record<VideoScene['type'], string> = {
  title:      '✦',
  keypoint:   '◆',
  definition: '◉',
  quote:      '❝',
  example:    '◎',
  recap:      '↩',
};

function hslStr(h: number, s: number, l: number) {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export function renderSceneToCanvas(
  canvas: HTMLCanvasElement,
  scene: VideoScene,
  progress = 0
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const [bh, bs, bl] = SCENE_HSL[scene.type];
  const accent = ACCENT_COLORS[scene.type];

  // ── Background gradient ────────────────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, hslStr(bh, bs, bl + 4));
  bgGrad.addColorStop(0.5, hslStr(bh, bs, bl));
  bgGrad.addColorStop(1, hslStr(bh, bs + 5, bl - 4));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Radial glow (top-right corner) ────────────────────────────────────────
  const radGrad = ctx.createRadialGradient(W * 0.88, H * 0.12, 0, W * 0.88, H * 0.12, W * 0.55);
  radGrad.addColorStop(0, accent.replace('hsl', 'hsla').replace(')', ', 0.18)'));
  radGrad.addColorStop(1, 'hsla(0,0%,0%,0)');
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Decorative circles (background geometry) ──────────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(W * 0.04, 8);
  ctx.beginPath(); ctx.arc(W - W * 0.06, H * 0.18, W * 0.28, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.05;
  ctx.lineWidth = Math.max(W * 0.025, 5);
  ctx.beginPath(); ctx.arc(W * 0.04, H * 0.82, W * 0.2, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.04;
  ctx.lineWidth = Math.max(W * 0.015, 3);
  ctx.beginPath(); ctx.arc(W * 0.5, H * 0.5, W * 0.42, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // ── Diagonal lines (texture) ───────────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  for (let x = -H; x < W + H; x += 28) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.stroke();
  }
  ctx.restore();

  // ── Left accent stripe ────────────────────────────────────────────────────
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 4, H);

  // ── Top accent bar ────────────────────────────────────────────────────────
  const topGrad = ctx.createLinearGradient(0, 0, W, 0);
  topGrad.addColorStop(0, accent);
  topGrad.addColorStop(1, 'hsla(0,0%,100%,0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(4, 0, W - 4, 3);

  // ── Large faded glyph (background) ────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = accent;
  ctx.font = `${Math.round(H * 0.55)}px Arial, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(SCENE_GLYPHS[scene.type], W - 8, H - 4);
  ctx.restore();

  // ── Type badge pill ───────────────────────────────────────────────────────
  const badgeX = 14, badgeY = 16;
  const badgeLabel = scene.type.toUpperCase();
  ctx.font = '600 10px Inter, system-ui, sans-serif';
  const badgeW = ctx.measureText(badgeLabel).width + 16;
  ctx.fillStyle = accent.replace('hsl', 'hsla').replace(')', ', 0.22)');
  roundRect(ctx, badgeX, badgeY, badgeW, 19, 9.5);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeLabel, badgeX + 8, badgeY + 9.5);

  // ── Heading ───────────────────────────────────────────────────────────────
  const headTop = badgeY + 19 + 14;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  const headingFontSize = scene.heading.length > 45 ? Math.round(H * 0.07) : Math.round(H * 0.085);
  ctx.font = `700 ${headingFontSize}px Inter, system-ui, sans-serif`;
  // Subtle text shadow
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 6;
  const headLines = wrapText(ctx, scene.heading, 14, headTop, W - 28);
  headLines.forEach((line, i) => {
    ctx.fillText(line, 14, headTop + i * (headingFontSize + 4));
  });
  ctx.shadowBlur = 0;

  const bodyStartY = headTop + headLines.length * (headingFontSize + 4) + 12;

  // Thin separator line below heading
  ctx.fillStyle = accent.replace('hsl', 'hsla').replace(')', ', 0.30)');
  ctx.fillRect(14, bodyStartY - 6, W * 0.35, 1.5);

  // ── Body text (adaptive font — shrinks to fit, never cuts mid-sentence) ──────
  ctx.fillStyle = 'rgba(255,255,255,0.85)';

  const buildBodyLines = (fontSize: number): string[] => {
    ctx.font = `400 ${fontSize}px Inter, system-ui, sans-serif`;
    return scene.body
      .split('\n')
      .flatMap(line => {
        const stripped = line.replace(/^[•\-\*]\s*/, '');
        return wrapText(ctx, stripped ? '• ' + stripped : line, 14, bodyStartY, W - 28);
      });
  };

  let bodyFontSize = scene.body.length > 150 ? Math.round(H * 0.047) : Math.round(H * 0.054);
  let bodyLines = buildBodyLines(bodyFontSize);
  let maxBodyLines = Math.floor((H - bodyStartY - 20) / (bodyFontSize + 6));

  // Shrink font until all lines fit (minimum 8 px for legibility)
  while (bodyLines.length > maxBodyLines && bodyFontSize > 8) {
    bodyFontSize -= 1;
    bodyLines = buildBodyLines(bodyFontSize);
    maxBodyLines = Math.floor((H - bodyStartY - 20) / (bodyFontSize + 6));
  }

  ctx.font = `400 ${bodyFontSize}px Inter, system-ui, sans-serif`;
  const visibleLines = bodyLines.slice(0, maxBodyLines);

  // ── Last-resort trim: never cut mid-word or mid-sentence ─────────────────
  // This path is rare because buildVideoScenes pre-limits body text,
  // but can still fire for very long headings that push bodyStartY down.
  if (bodyLines.length > maxBodyLines && visibleLines.length > 0) {
    // Re-join what's visible and try to cut at a sentence boundary first.
    const joined = visibleLines.join(' ');

    // Find the last sentence-ending punctuation within the joined text
    const lastSentEnd = Math.max(
      joined.lastIndexOf('. '),
      joined.lastIndexOf('! '),
      joined.lastIndexOf('? '),
    );

    if (lastSentEnd > joined.length * 0.3) {
      // Clean cut at sentence end — no ellipsis needed
      const cleanCut = joined.slice(0, lastSentEnd + 1).trim();
      // Re-wrap cleanCut into visibleLines
      const rewrapped = cleanCut.split('\n').flatMap(line => {
        const stripped = line.replace(/^[•\-\*]\s*/, '');
        return wrapText(ctx, stripped ? '• ' + stripped : line, 14, bodyStartY, W - 28);
      });
      visibleLines.length = 0;
      rewrapped.slice(0, maxBodyLines).forEach(l => visibleLines.push(l));
    } else {
      // Fall back: trim the last visible line to the nearest word boundary
      const last = visibleLines[visibleLines.length - 1];
      let trimmed = last.replace(/[•\s]+$/, '');
      const lastSpace = trimmed.lastIndexOf(' ');
      if (lastSpace > trimmed.length * 0.35) {
        trimmed = trimmed.slice(0, lastSpace);
      }
      // Only add ellipsis if we genuinely cut content (not just trailing space)
      visibleLines[visibleLines.length - 1] =
        trimmed.endsWith('.') || trimmed.endsWith('!') || trimmed.endsWith('?')
          ? trimmed
          : trimmed + '…';
    }
  }

  visibleLines.forEach((line, i) => {
    // Highlight bullet dots in accent color
    if (line.startsWith('•')) {
      ctx.fillStyle = accent;
      ctx.fillText('•', 14, bodyStartY + i * (bodyFontSize + 6));
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(line.slice(1), 14 + bodyFontSize * 0.7, bodyStartY + i * (bodyFontSize + 6));
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(line, 14, bodyStartY + i * (bodyFontSize + 6));
    }
  });

  // ── Progress bar ──────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(0, H - 5, W, 5);
  if (progress > 0) {
    const pgGrad = ctx.createLinearGradient(0, 0, W * progress, 0);
    pgGrad.addColorStop(0, accent);
    pgGrad.addColorStop(1, 'rgba(255,255,255,0.9)');
    ctx.fillStyle = pgGrad;
    ctx.fillRect(0, H - 5, W * Math.min(progress, 1), 5);
    // Glowing dot at progress tip
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ffffff';
    const dotX = W * Math.min(progress, 1);
    ctx.beginPath(); ctx.arc(dotX, H - 2.5, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

/**
 * Trims body text so it always ends at a complete sentence or word —
 * never mid-word. Used to pre-limit slide body before rendering.
 * @param text  Full body text
 * @param maxChars  Soft character limit
 */
function trimBodyText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  // Prefer a sentence boundary
  const lastSentenceEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
    slice.lastIndexOf('.\n'),
    slice.lastIndexOf('!\n'),
    slice.lastIndexOf('?\n'),
  );
  if (lastSentenceEnd > maxChars * 0.35) {
    return text.slice(0, lastSentenceEnd + 1).trim();
  }
  // Fall back to last word boundary
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > maxChars * 0.3) {
    return text.slice(0, lastSpace).trim();
  }
  return slice.trim();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, _x: number, _y: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth) {
      if (current) {
        lines.push(current);
        // If the word itself is wider than maxWidth, break it at character level
        if (ctx.measureText(word).width > maxWidth) {
          let chunk = '';
          for (const ch of word) {
            if (ctx.measureText(chunk + ch).width > maxWidth) {
              if (chunk) lines.push(chunk);
              chunk = ch;
            } else {
              chunk += ch;
            }
          }
          current = chunk;
        } else {
          current = word;
        }
      } else {
        // No current content yet and word is too wide — character-break it
        if (ctx.measureText(word).width > maxWidth) {
          let chunk = '';
          for (const ch of word) {
            if (ctx.measureText(chunk + ch).width > maxWidth) {
              if (chunk) lines.push(chunk);
              chunk = ch;
            } else {
              chunk += ch;
            }
          }
          current = chunk;
        } else {
          current = word;
        }
      }
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Video recorder ────────────────────────────────────────────────────────────

export interface VideoRecordResult {
  blob: Blob;
  mimeType: string;
  durationSecs: number;
}

/**
 * Speak text via the browser's SpeechSynthesis API and return a Promise that
 * resolves when the utterance ends. Resolves immediately if TTS is unavailable.
 */
function speakAndWait(text: string, voice?: SpeechSynthesisVoice, rate: number = 1, pitch: number = 1): Promise<void> {
  return new Promise(resolve => {
    if (!text.trim() || typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }
    const utt = new SpeechSynthesisUtterance(text);
    if (voice) utt.voice = voice;
    utt.rate = rate;
    utt.pitch = pitch;
    utt.onend = () => resolve();
    utt.onerror = () => resolve();
    window.speechSynthesis.speak(utt);
  });
}

/**
 * Record canvas scenes as a WebM/MP4 video with smooth transitions.
 * When `sceneScripts` are provided the corresponding text is spoken aloud via
 * the browser's Text-to-Speech engine for each scene; the video canvas waits
 * until speech finishes before advancing, so visual timing matches narration.
 * Returns blob or throws.
 */
export async function recordVideoScenes(
  canvas: HTMLCanvasElement,
  scenes: VideoScene[],
  onProgress: (sceneIdx: number, total: number) => void,
  cancelSignal: { cancelled: boolean },
  bgmTrackId?: string,
  sceneScripts?: string[],
  customRenderFn?: (canvas: HTMLCanvasElement, sceneIdx: number, progress: number) => void,
  bgmVolume?: number,
  voiceSettings?: { voice?: SpeechSynthesisVoice; rate?: number; pitch?: number },
): Promise<VideoRecordResult> {
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : MediaRecorder.isTypeSupported('video/webm')
    ? 'video/webm'
    : 'video/mp4';

  // ── Optional BGM setup ────────────────────────────────────────────────────
  // The AI-TTS path records canvas-only by default. When BGM is selected we
  // create a separate AudioContext, synthesise the loop, pipe it to a
  // MediaStreamAudioDestinationNode and merge its audio track with the canvas
  // video track before handing everything to MediaRecorder.
  let bgmAudioCtx: AudioContext | null = null;
  let bgmSrc: AudioBufferSourceNode | null = null;

  try {
    const totalSceneSecs = scenes.reduce((s, sc) => s + sc.duration, 0);
    const canvasStream = canvas.captureStream(25); // 25 fps
    let recordStream: MediaStream = canvasStream;

    // Hoist bgmGain so it can be accessed for deferred automation after recorder starts
    let bgmGain: GainNode | null = null;

    if (bgmTrackId && bgmTrackId !== 'none') {
      bgmAudioCtx = new AudioContext();
      if (bgmAudioCtx.state === 'suspended') await bgmAudioCtx.resume();

      const bgmBuffer = await renderBgmBuffer(bgmTrackId, bgmAudioCtx.sampleRate);
      if (bgmBuffer) {
        const bgmDest = bgmAudioCtx.createMediaStreamDestination();

        bgmGain = bgmAudioCtx.createGain();
        bgmGain.gain.value = 0; // silent until automation is scheduled after recorder starts

        bgmSrc = bgmAudioCtx.createBufferSource();
        bgmSrc.buffer = bgmBuffer;
        bgmSrc.loop = true;
        bgmSrc.loopEnd = bgmBuffer.duration;
        bgmSrc.connect(bgmGain);
        bgmGain.connect(bgmDest);
        // bgmSrc.start() is deferred — see below

        // Merge canvas video + BGM audio into one combined stream for recording
        recordStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...bgmDest.stream.getAudioTracks(),
        ]);
      }
    }

    const recorder = new MediaRecorder(recordStream, {
      mimeType,
      videoBitsPerSecond: 5000000, // 5 Mbps for higher quality encoding (720p/1080p)
    });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.start(200); // collect every 200ms

    // Anchor all BGM timing to the AudioContext clock at the moment recorder goes live.
    // This is the same pattern used in recordVideoWithUserAudio: gain automation and
    // source.start() are scheduled AFTER recorder.start() so that currentTime is the
    // precise reference for the fade-in, hold, and fade-out events.
    if (bgmAudioCtx && bgmSrc && bgmGain) {
      const effectiveBgmVol = bgmVolume ?? BGM_VOLUME;
      const fadeSecs = Math.min(BGM_FADE_SECS, totalSceneSecs * 0.15);
      const now = bgmAudioCtx.currentTime;
      bgmGain.gain.setValueAtTime(0, now);
      bgmGain.gain.linearRampToValueAtTime(effectiveBgmVol, now + 0.1);
      bgmGain.gain.setValueAtTime(effectiveBgmVol, now + totalSceneSecs - fadeSecs);
      bgmGain.gain.linearRampToValueAtTime(0, now + totalSceneSecs);
      bgmSrc.start(now);
    }

    const startTime = Date.now();

    // Transition constants: 200ms fade-out + 200ms fade-in = 400ms total per cut
    const HALF_TRANS_MS = 200;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const overlayBlack = (alpha: number) => {
      if (!ctx) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    };

    for (let i = 0; i < scenes.length; i++) {
      if (cancelSignal.cancelled) break;
      const scene = scenes[i];
      onProgress(i, scenes.length);
      const sceneDurMs = scene.duration * 1000;
      const sceneText = sceneScripts?.[i] ?? '';
      const useTTS = !!sceneText;

      // Local render helper — uses custom renderer when provided (e.g. presentation
      // slide theme), otherwise falls back to the generic VideoScene renderer.
      const render = (p: number) =>
        customRenderFn
          ? customRenderFn(canvas, i, p)
          : renderSceneToCanvas(canvas, scene, p);

      // ── Start TTS for this scene (non-blocking) ───────────────────────────
      // The slide must stay on screen until speech completes — never before.
      let ttsFinished = !useTTS;
      if (useTTS) {
        speakAndWait(
          sceneText,
          voiceSettings?.voice,
          voiceSettings?.rate ?? 1,
          voiceSettings?.pitch ?? 1
        ).then(() => { ttsFinished = true; });
      }

      // ── Fade in from black (skip for first scene) ────────────────────────
      if (i > 0) {
        const t0 = Date.now();
        while (!cancelSignal.cancelled && Date.now() - t0 < HALF_TRANS_MS) {
          const t = (Date.now() - t0) / HALF_TRANS_MS;
          render(0);
          overlayBlack(1 - t);
          await new Promise(r => setTimeout(r, 40));
        }
      }
      render(0);

      // ── Hold slide until TTS done (TTS mode) or fixed duration (no TTS) ──
      const sceneStart = Date.now();
      if (useTTS) {
        // Estimate denominator for progress bar using speech-rate estimate
        const estimatedMs = Math.max(sceneDurMs, estimateSpeechSeconds(sceneText) * 1000);
        while (!cancelSignal.cancelled && !ttsFinished) {
          const elapsed = Date.now() - sceneStart;
          // Progress bar fills smoothly toward 1 but never reaches it until TTS ends
          const approachProg = 1 - Math.exp(-elapsed / estimatedMs);
          render(Math.min(approachProg, 0.95));
          await new Promise(r => setTimeout(r, 40));
        }
      } else {
        // Fixed-duration mode (no sceneScripts supplied — manual timing or fallback)
        const hasOut = i < scenes.length - 1;
        const mainDurMs = hasOut ? Math.max(sceneDurMs - HALF_TRANS_MS, 0) : sceneDurMs;
        while (!cancelSignal.cancelled && Date.now() - sceneStart < mainDurMs) {
          const elapsed = Date.now() - sceneStart;
          render(elapsed / sceneDurMs);
          await new Promise(r => setTimeout(r, 40));
        }
      }

      if (!cancelSignal.cancelled) render(1);

      // ── Fade out to black (skip for last scene) ──────────────────────────
      const hasOut = i < scenes.length - 1;
      if (hasOut && !cancelSignal.cancelled) {
        const t0 = Date.now();
        while (!cancelSignal.cancelled && Date.now() - t0 < HALF_TRANS_MS) {
          const t = (Date.now() - t0) / HALF_TRANS_MS;
          render(1);
          overlayBlack(t);
          await new Promise(r => setTimeout(r, 40));
        }
        if (ctx) { ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H); }
        await new Promise(r => setTimeout(r, 40));
      } else {
        render(1);
      }
    }

    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        resolve({ blob, mimeType, durationSecs: (Date.now() - startTime) / 1000 });
      };
      recorder.onerror = () => reject(new Error('MediaRecorder error'));
      if (recorder.state !== 'inactive') recorder.stop();
      else recorder.onstop?.(new Event('stop'));
    });

  } finally {
    // Always release BGM resources regardless of success, error, or cancellation
    try { bgmSrc?.stop(); } catch {}
    try { await bgmAudioCtx?.close(); } catch {}
    // Stop any pending TTS utterances
    try { window.speechSynthesis?.cancel(); } catch {}
  }
}

/**
 * Generate a video using pre-recorded user audio + slide canvas rendering.
 * Each scene's duration (in its `.duration` field, seconds) controls how long
 * that slide is shown. The audio blob is played through AudioContext and mixed
 * into the video stream, so the final video has the user's voice as narration.
 */
export async function recordVideoWithUserAudio(
  canvas: HTMLCanvasElement,
  scenes: VideoScene[],
  audioBlob: Blob,
  onProgress: (sceneIdx: number, total: number) => void,
  cancelSignal: { cancelled: boolean },
  bgmTrackId?: string,
  customRenderFn?: (canvas: HTMLCanvasElement, sceneIdx: number, progress: number) => void,
  bgmVolume?: number,
  narrationVolume?: number,
): Promise<VideoRecordResult> {
  if (scenes.length === 0) throw new Error('No scenes to render');
  if (!audioBlob || audioBlob.size === 0) throw new Error('Audio recording is empty');

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : MediaRecorder.isTypeSupported('video/webm')
    ? 'video/webm'
    : 'video/mp4';

  // ── Decode audio ──────────────────────────────────────────────────────────
  // AudioContext is created outside try/finally so we can close it in all paths.
  const audioCtx = new AudioContext();
  let audioSrc: AudioBufferSourceNode | null = null;
  let bgmSrc: AudioBufferSourceNode | null = null;
  let recorder: MediaRecorder | null = null;

  try {
    // Browsers may suspend AudioContext by default (autoplay policy).
    // Resume explicitly so audio plays and onended fires reliably.
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    const arrayBuf = await audioBlob.arrayBuffer();
    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuf);
    } catch {
      throw new Error('Could not decode audio recording. Try re-recording in a different format.');
    }
    const audioDurationSecs = audioBuffer.duration;
    if (audioDurationSecs < 0.1) throw new Error('Audio recording is too short (under 0.1 seconds).');

    // ── Scale scene durations to match audio exactly ──────────────────────
    const totalSceneDurSecs = scenes.reduce((sum, s) => sum + s.duration, 0);
    const syncedScenes = totalSceneDurSecs > 0
      ? scenes.map(s => ({ ...s, duration: s.duration * (audioDurationSecs / totalSceneDurSecs) }))
      : scenes.map(s => ({ ...s, duration: audioDurationSecs / scenes.length }));

    // ── Build audio mix ───────────────────────────────────────────────────
    // Both narration and BGM (if selected) route through the same
    // MediaStreamDestination so MediaRecorder captures a single mixed track.
    // Narration: gain = 1.0 (full volume, always clearly audible and on top)
    // BGM:       gain = BGM_VOLUME (≈ 22 %, looping, automatic fade-in + fade-out)
    //
    // CRITICAL TIMING NOTE: All GainNode automation and source.start() calls are
    // intentionally deferred until AFTER recorder.start(). By the time we reach
    // that point, audioCtx.currentTime has already advanced past 0 (due to resume,
    // decodeAudioData, and renderBgmBuffer). Scheduling against time-0 would cause
    // the fade-in to be skipped and the fade-out to fire too early by the same
    // offset. Capturing currentTime right after recorder.start() gives the exact
    // authoritative anchor for every gain event and source.start() call.
    const audioDest = audioCtx.createMediaStreamDestination();

    audioSrc = audioCtx.createBufferSource();
    audioSrc.buffer = audioBuffer;
    const narrationGain = audioCtx.createGain();
    narrationGain.gain.value = narrationVolume ?? 1.0;
    audioSrc.connect(narrationGain);
    narrationGain.connect(audioDest);

    // Build BGM routing graph (connected but NOT started — deferred below)
    let bgmGainNode: GainNode | null = null;
    if (bgmTrackId && bgmTrackId !== 'none') {
      const bgmBuffer = await renderBgmBuffer(bgmTrackId, audioCtx.sampleRate);
      if (bgmBuffer) {
        bgmGainNode = audioCtx.createGain();
        bgmGainNode.gain.value = 0; // silent until we schedule automation after recorder starts
        bgmSrc = audioCtx.createBufferSource();
        bgmSrc.buffer = bgmBuffer;
        bgmSrc.loop = true;
        bgmSrc.loopEnd = bgmBuffer.duration;
        bgmSrc.connect(bgmGainNode);
        bgmGainNode.connect(audioDest);
      }
    }

    // Resolves when narration playback ends naturally
    const audioEndedPromise = new Promise<void>(res => { audioSrc!.onended = () => res(); });

    // ── Merge canvas + mixed audio tracks ────────────────────────────────
    const canvasStream = canvas.captureStream(25);
    const combined = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioDest.stream.getAudioTracks(),
    ]);

    const chunks: BlobPart[] = [];
    recorder = new MediaRecorder(combined, { mimeType });
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.start(200);

    // ── Start all sources anchored to the same AudioContext clock position ─
    // Capture currentTime AFTER recorder.start() — this is the precise moment
    // at which the MediaRecorder stream is live. All source start times and all
    // gain automation events are expressed relative to this single reference.
    const playStart = audioCtx.currentTime;
    audioSrc.start(playStart);

    if (bgmSrc && bgmGainNode) {
      const effectiveBgmVol = bgmVolume ?? BGM_VOLUME;
      const fadeSecs = Math.min(BGM_FADE_SECS, audioDurationSecs * 0.15);
      bgmGainNode.gain.setValueAtTime(0, playStart);
      bgmGainNode.gain.linearRampToValueAtTime(effectiveBgmVol, playStart + 0.1);
      bgmGainNode.gain.setValueAtTime(effectiveBgmVol, playStart + audioDurationSecs - fadeSecs);
      bgmGainNode.gain.linearRampToValueAtTime(0, playStart + audioDurationSecs);
      bgmSrc.start(playStart);
    }

    const startTime = Date.now();

    const HALF_TRANS_MS = 200;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const overlayBlack = (alpha: number) => {
      if (!ctx) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    };

    // ── Render each scene to canvas ───────────────────────────────────────
    for (let i = 0; i < syncedScenes.length; i++) {
      if (cancelSignal.cancelled) break;
      const scene = syncedScenes[i];
      onProgress(i, syncedScenes.length);
      const sceneDurMs = scene.duration * 1000;

      // Local render helper — uses custom renderer when provided (e.g. presentation
      // slide theme), otherwise falls back to the generic VideoScene renderer.
      const render = (p: number) =>
        customRenderFn
          ? customRenderFn(canvas, i, p)
          : renderSceneToCanvas(canvas, scene, p);

      // Fade-in transition (skip first scene)
      if (i > 0) {
        const t0 = Date.now();
        while (!cancelSignal.cancelled && Date.now() - t0 < HALF_TRANS_MS) {
          render(0);
          overlayBlack(1 - (Date.now() - t0) / HALF_TRANS_MS);
          await new Promise(r => setTimeout(r, 40));
        }
        render(0);
      } else {
        render(0);
      }

      // Main hold
      const hasOut = i < syncedScenes.length - 1;
      const mainDurMs = hasOut ? Math.max(sceneDurMs - HALF_TRANS_MS, 0) : sceneDurMs;
      const sceneStart = Date.now();
      while (!cancelSignal.cancelled && Date.now() - sceneStart < mainDurMs) {
        const el = Date.now() - sceneStart;
        render(el / Math.max(sceneDurMs, 1));
        await new Promise(r => setTimeout(r, 40));
      }

      // Fade-out transition (skip last scene)
      if (hasOut && !cancelSignal.cancelled) {
        const t0 = Date.now();
        while (!cancelSignal.cancelled && Date.now() - t0 < HALF_TRANS_MS) {
          render(1);
          overlayBlack((Date.now() - t0) / HALF_TRANS_MS);
          await new Promise(r => setTimeout(r, 40));
        }
        if (ctx) { ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H); }
        await new Promise(r => setTimeout(r, 40));
      } else {
        render(1);
      }
    }

    // ── Mark progress complete ─────────────────────────────────────────────
    onProgress(syncedScenes.length, syncedScenes.length);

    if (!cancelSignal.cancelled) {
      // Wait for audio to finish naturally (AudioContext clock is authoritative).
      // Grace of 3 s handles any clock drift; 300 ms flush ensures MediaRecorder
      // captures the very last data chunk before we stop it.
      const gracePromise = new Promise<void>(res => setTimeout(res, 3000));
      await Promise.race([audioEndedPromise, gracePromise]);
      await new Promise(r => setTimeout(r, 300));
    }

    // ── Stop and collect ───────────────────────────────────────────────────
    return new Promise((resolve, reject) => {
      recorder!.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        resolve({ blob, mimeType, durationSecs: (Date.now() - startTime) / 1000 });
      };
      recorder!.onerror = () => reject(new Error('MediaRecorder error during video capture'));
      // Guard: only stop if still recording — prevents throw if recorder errored
      if (recorder!.state !== 'inactive') recorder!.stop();
      else recorder!.onstop?.(new Event('stop'));
    });

  } finally {
    // Always clean up audio resources regardless of success, error, or cancellation
    try { bgmSrc?.stop(); } catch {}
    try { audioSrc?.stop(); } catch {}
    try { await audioCtx.close(); } catch {}
  }
}

export function isVideoSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const stream = canvas.captureStream(1);
    if (!stream || typeof MediaRecorder === 'undefined') return false;
    return (
      MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ||
      MediaRecorder.isTypeSupported('video/webm') ||
      MediaRecorder.isTypeSupported('video/mp4')
    );
  } catch {
    return false;
  }
}
