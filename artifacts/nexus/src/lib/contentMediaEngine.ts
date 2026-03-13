// Content Media Engine — shared script generation, TTS control, video scene building
// 100% local, 100% free, no backend, no paid APIs
// Audio: Web Speech API (speechSynthesis)
// Video: Canvas API + MediaRecorder

import type { VideoScene } from './mediaStorage';

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
  return words.slice(0, maxWords).join(' ') + '…';
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
  return raw
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]\n]*)\]/g, '')
    .replace(/\(([^)\n]*(music|sound|sfx|pause|cue|fade|beat|ambien)[^)\n]*)\)/gi, '')
    .replace(/^[^\n.!?]*?(here'?s?|below is|this is|audio script|video script|narration script|script for)[^\n]*[\n:]/gim, '')
    .replace(/^\*?\(?(duration|word count|~?\d+\s*min|~?\d+\s*words?)[^)\n]*\)?\*?\n?/gim, '')
    .replace(/^\s*[-–—_*#]{3,}\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanText(text: string): string {
  return text
    .replace(/\[Page \d+\]/g, '')
    .replace(/\[Slide \d+\]/g, '')
    .replace(/\[Info\].*$/gm, '')
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/https?:\/\/\S+/g, '')
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

export function buildSummaryScript(rawText: string, title: string, lang = 'en'): string {
  const bn = lang === 'bn';
  const text = cleanText(rawText);
  const sentences = extractSentences(text);
  const bullets = extractBulletPoints(text);
  const headings = extractHeadings(text);

  const topSentences = sentences.slice(0, 8).join(' ');
  const keyPoints = bullets.length > 0
    ? bullets.slice(0, 6).map((b, i) => `${bn ? BN.keyPoint(i) : `Key point ${i + 1}:`} ${b}`).join('. ')
    : sentences.slice(8, 14).join(' ');
  const topicLine = headings.length > 0
    ? (bn ? BN.coversTopics(headings.slice(0, 4).join(', ')) : `This content covers: ${headings.slice(0, 4).join(', ')}.`)
    : '';

  return [
    topicLine,
    bn ? BN.hereAreMain : 'Here are the main points.',
    topSentences,
    keyPoints ? `${bn ? BN.importantHighlights : 'Important highlights:'} ${keyPoints}` : '',
    bn ? 'এটি সারসংক্ষেপের সমাপ্তি।' : 'That concludes the summary.',
  ].filter(Boolean).join(' ');
}

export function buildExplainerScript(rawText: string, title: string, lang = 'en'): string {
  const bn = lang === 'bn';
  const text = cleanText(rawText);
  const sentences = extractSentences(text);
  const bullets = extractBulletPoints(text);
  const headings = extractHeadings(text);
  const paragraphs = extractTopParagraphs(text, 6);

  const topicIntro = headings.length > 0
    ? (bn ? BN.explainerGoThrough(headings.slice(0, 5).join(', ')) : `In this explainer, we'll go through ${headings.slice(0, 5).join(', ')}.`)
    : (bn ? BN.explainerBreakDown(title) : `In this explainer, we'll break down the key concepts from "${title}".`);

  const mainExplain = paragraphs.length > 0
    ? paragraphs.join(' ')
    : sentences.slice(0, 20).join(' ');

  const keyHighlights = bullets.length > 0
    ? `${bn ? BN.keyHighlights : "Let's look at the key highlights."} ${bullets.slice(0, 8).map((b, i) => `${bn ? BN.point(i) : `Point ${i + 1}:`} ${b}.`).join(' ')}`
    : '';

  return [
    topicIntro,
    mainExplain,
    keyHighlights,
    `${bn ? BN.letsReview : "Let's review."} ${sentences.slice(-4).join(' ')}`,
    bn ? 'এটি সম্পূর্ণ ব্যাখ্যার সমাপ্তি। শুনার জন্য ধন্যবাদ।' : `That's the full explainer. Thanks for listening.`,
  ].filter(Boolean).join(' ');
}

export function buildPodcastScript(rawText: string, title: string, lang = 'en'): string {
  const bn = lang === 'bn';
  const text = cleanText(rawText);
  const sentences = extractSentences(text);
  const bullets = extractBulletPoints(text);
  const headings = extractHeadings(text);
  const paragraphs = extractTopParagraphs(text, 8);

  const intro = bn
    ? 'নমস্কার! আবারও স্বাগতম। আজকের পর্বে আমরা একটি চমৎকার বিষয় নিয়ে আলোচনা করব। চলুন শুরু করি।'
    : `Hey there! Welcome back. Today we're exploring something fascinating. This is going to be a great episode, so let's get started.`;

  const overview = headings.length > 0
    ? (bn ? BN.coveringToday(headings.slice(0, 5).join(', ')) : `Here's what we're covering today: ${headings.slice(0, 5).join(', ')}. Exciting stuff!`)
    : (bn ? BN.richInsights : `Today's topic is rich with insights. Let me walk you through what I found most interesting.`);

  const connectors = bn
    ? BN.connectors
    : ['So,', 'Now,', 'Interestingly,', "Here's the thing,", "What's fascinating is that"];

  const mainContent = paragraphs.length > 0
    ? paragraphs.map((p, i) => `${connectors[i % connectors.length]} ${p}`).join(' ')
    : sentences.slice(0, 25).join(' ');

  const keyTakeaways = bullets.length > 0
    ? `${bn ? BN.keyTakeaways : 'Now let me give you the key takeaways.'} ${bullets.slice(0, 6).map((b, i) => `${bn ? BN.number(i) : `Number ${i + 1}:`} ${b}.`).join(' ')}`
    : `${bn ? BN.sumUp : 'Let me sum up the most important things.'} ${sentences.slice(-8).join(' ')}`;

  const recap = bn
    ? `ঠিক আছে, শেষ করা যাক। ${headings.slice(0, 3).length > 0 ? `মূল বিষয়গুলি ছিল: ${headings.slice(0, 3).join(', ')}।` : ''} আশা করি আপনি এটি মূল্যবান মনে করেছেন!`
    : `Alright, let's wrap up. ${headings.slice(0, 3).length > 0 ? `The main topics were: ${headings.slice(0, 3).join(', ')}.` : ''} I hope you found this valuable!`;
  const outro = bn ? BN.outro : `Thanks for listening! See you next time.`;

  return [intro, overview, mainContent, keyTakeaways, recap, outro].filter(Boolean).join(' ');
}

export function buildVideoScenes(rawText: string, title: string, lang = 'en'): VideoScene[] {
  const bn = lang === 'bn';
  const text = cleanText(rawText);
  const sentences = extractSentences(text);
  const bullets = extractBulletPoints(text);
  const headings = extractHeadings(text);
  const paragraphs = extractTopParagraphs(text, 5);

  const scenes: VideoScene[] = [];

  // Title card
  scenes.push({
    type: 'title',
    heading: title,
    body: headings.slice(0, 3).join(' · ') || (bn ? BN.keyConceptsInsights : 'Key concepts & insights'),
    duration: 4,
  });

  // Overview
  if (headings.length > 0) {
    scenes.push({
      type: 'keypoint',
      heading: bn ? BN.topicsCovered : 'Topics Covered',
      body: headings.slice(0, 5).map(h => `• ${h}`).join('\n'),
      duration: 5,
    });
  }

  // Key points from bullets
  const pointGroups: string[][] = [];
  for (let i = 0; i < Math.min(bullets.length, 9); i += 3) {
    pointGroups.push(bullets.slice(i, i + 3));
  }
  pointGroups.forEach((group, idx) => {
    scenes.push({
      type: 'keypoint',
      heading: bn ? BN.keyPoints(idx) : `Key Points ${idx > 0 ? `(${idx + 1})` : ''}`.trim(),
      body: group.map(b => `• ${b}`).join('\n'),
      duration: Math.max(5, group.length * 2),
    });
  });

  // Content paragraphs as definition/example cards
  paragraphs.slice(0, 4).forEach((para, i) => {
    const short = para.length > 200 ? para.slice(0, 200) + '…' : para;
    scenes.push({
      type: i % 2 === 0 ? 'definition' : 'example',
      heading: headings[i + 1] || (bn ? BN.section(i) : `Section ${i + 1}`),
      body: short,
      duration: Math.max(5, Math.ceil(countWords(short) / 40)),
    });
  });

  // If no bullets/headings, use sentences
  if (scenes.length < 4) {
    const senGroups: string[][] = [];
    for (let i = 0; i < Math.min(sentences.length, 12); i += 3) {
      senGroups.push(sentences.slice(i, i + 3));
    }
    senGroups.slice(0, 4).forEach((group, i) => {
      scenes.push({
        type: 'keypoint',
        heading: bn ? BN.section(i) : `Section ${i + 1}`,
        body: group.join(' '),
        duration: Math.max(5, Math.ceil(countWords(group.join(' ')) / 40)),
      });
    });
  }

  // Recap
  const recapText = bullets.length > 0
    ? bullets.slice(0, 4).map(b => `• ${b}`).join('\n')
    : sentences.slice(-3).join(' ');
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
): { script: string; scenes?: VideoScene[] } {
  switch (mode) {
    case 'summary':
      return { script: buildSummaryScript(rawText, title, lang) };
    case 'explainer':
      return { script: buildExplainerScript(rawText, title, lang) };
    case 'podcast':
      return { script: buildPodcastScript(rawText, title, lang) };
    case 'video': {
      const scenes = buildVideoScenes(rawText, title, lang);
      const script = scenes.map((s, i) => {
        const spokenBody = s.body
          .replace(/^[•\-\*]\s*/gm, '')
          .replace(/\n+/g, ' ')
          .trim();
        // Title card (index 0) — skip heading (filename) in narration, speak only body
        if (i === 0) return spokenBody;
        return `${s.heading}. ${spokenBody}`;
      }).join('. ');
      return { script, scenes };
    }
  }
}

// ── TTS Controller ────────────────────────────────────────────────────────────

export interface TTSOptions {
  voice?: SpeechSynthesisVoice | null;
  rate?: number;
  pitch?: number;
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

  // ── Body text ─────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const bodyFontSize = scene.body.length > 200 ? Math.round(H * 0.047) : Math.round(H * 0.054);
  ctx.font = `400 ${bodyFontSize}px Inter, system-ui, sans-serif`;
  const maxBodyLines = Math.floor((H - bodyStartY - 16) / (bodyFontSize + 5));
  const bodyLines = scene.body
    .split('\n')
    .flatMap(line => {
      const stripped = line.replace(/^[•\-\*]\s*/, '');
      return wrapText(ctx, stripped ? '• ' + stripped : line, 14, bodyStartY, W - 28);
    });
  bodyLines.slice(0, maxBodyLines).forEach((line, i) => {
    // Highlight bullet dots in accent color
    if (line.startsWith('•')) {
      ctx.fillStyle = accent;
      ctx.fillText('•', 14, bodyStartY + i * (bodyFontSize + 5));
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(line.slice(1), 14 + bodyFontSize * 0.7, bodyStartY + i * (bodyFontSize + 5));
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(line, 14, bodyStartY + i * (bodyFontSize + 5));
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

function wrapText(ctx: CanvasRenderingContext2D, text: string, _x: number, _y: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
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

/** Record canvas scenes as a WebM/MP4 video. Returns blob or throws. */
export async function recordVideoScenes(
  canvas: HTMLCanvasElement,
  scenes: VideoScene[],
  onProgress: (sceneIdx: number, total: number) => void,
  cancelSignal: { cancelled: boolean }
): Promise<VideoRecordResult> {
  const stream = canvas.captureStream(25); // 25 fps
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : MediaRecorder.isTypeSupported('video/webm')
    ? 'video/webm'
    : 'video/mp4';

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

  recorder.start(200); // collect every 200ms

  const startTime = Date.now();
  let totalDuration = 0;

  for (let i = 0; i < scenes.length; i++) {
    if (cancelSignal.cancelled) break;
    const scene = scenes[i];
    onProgress(i, scenes.length);
    const sceneDurMs = scene.duration * 1000;
    const sceneStart = Date.now();
    totalDuration += scene.duration;

    while (Date.now() - sceneStart < sceneDurMs) {
      if (cancelSignal.cancelled) break;
      const elapsed = Date.now() - sceneStart;
      const progress = elapsed / sceneDurMs;
      renderSceneToCanvas(canvas, scene, progress);
      await new Promise(r => setTimeout(r, 40)); // ~25fps
    }
    renderSceneToCanvas(canvas, scene, 1);
  }

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve({ blob, mimeType, durationSecs: (Date.now() - startTime) / 1000 });
    };
    recorder.onerror = () => reject(new Error('MediaRecorder error'));
    recorder.stop();
  });
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
