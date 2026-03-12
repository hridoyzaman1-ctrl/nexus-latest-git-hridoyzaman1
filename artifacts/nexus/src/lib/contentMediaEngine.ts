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

function cleanText(text: string): string {
  return text
    .replace(/\[Page \d+\]/g, '')
    .replace(/\[Slide \d+\]/g, '')
    .replace(/\[Info\].*$/gm, '')
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

export function buildSummaryScript(rawText: string, title: string): string {
  const text = cleanText(rawText);
  const sentences = extractSentences(text);
  const bullets = extractBulletPoints(text);
  const headings = extractHeadings(text);

  const topSentences = sentences.slice(0, 8).join(' ');
  const keyPoints = bullets.length > 0
    ? bullets.slice(0, 6).map((b, i) => `Key point ${i + 1}: ${b}`).join('. ')
    : sentences.slice(8, 14).join(' ');
  const topicLine = headings.length > 0
    ? `This content covers: ${headings.slice(0, 4).join(', ')}.`
    : '';

  return [
    `Summary of "${title}".`,
    topicLine,
    'Here are the main points.',
    topSentences,
    keyPoints ? `Important highlights: ${keyPoints}` : '',
    `That concludes the summary of "${title}".`,
  ].filter(Boolean).join(' ');
}

export function buildExplainerScript(rawText: string, title: string): string {
  const text = cleanText(rawText);
  const sentences = extractSentences(text);
  const bullets = extractBulletPoints(text);
  const headings = extractHeadings(text);
  const paragraphs = extractTopParagraphs(text, 6);

  const topicIntro = headings.length > 0
    ? `In this explainer, we'll go through ${headings.slice(0, 5).join(', ')}.`
    : `In this explainer, we'll break down the key concepts from "${title}".`;

  const mainExplain = paragraphs.length > 0
    ? paragraphs.join(' ')
    : sentences.slice(0, 20).join(' ');

  const keyHighlights = bullets.length > 0
    ? `Let's look at the key highlights. ${bullets.slice(0, 8).map((b, i) => `Point ${i + 1}: ${b}.`).join(' ')}`
    : '';

  return [
    `Welcome to this explainer on "${title}".`,
    topicIntro,
    mainExplain,
    keyHighlights,
    `Let's review. ${sentences.slice(-4).join(' ')}`,
    `That's the full explainer for "${title}". Thanks for listening.`,
  ].filter(Boolean).join(' ');
}

export function buildPodcastScript(rawText: string, title: string): string {
  const text = cleanText(rawText);
  const sentences = extractSentences(text);
  const bullets = extractBulletPoints(text);
  const headings = extractHeadings(text);
  const paragraphs = extractTopParagraphs(text, 8);

  const intro = `Hey there! Welcome back. Today we're diving into "${title}". This is going to be a great episode, so let's get started.`;

  const overview = headings.length > 0
    ? `Here's what we're covering today: ${headings.slice(0, 5).join(', ')}. Exciting stuff!`
    : `Today's topic is rich with insights. Let me walk you through what I found most interesting.`;

  const mainContent = paragraphs.length > 0
    ? paragraphs.map((p, i) => {
        const connectors = ['So,', 'Now,', 'Interestingly,', 'Here\'s the thing,', 'What\'s fascinating is that'];
        return `${connectors[i % connectors.length]} ${p}`;
      }).join(' ')
    : sentences.slice(0, 25).join(' ');

  const keyTakeaways = bullets.length > 0
    ? `Now let me give you the key takeaways. ${bullets.slice(0, 6).map((b, i) => `Number ${i + 1}: ${b}.`).join(' ')}`
    : `Let me sum up the most important things. ${sentences.slice(-8).join(' ')}`;

  const recap = `Alright, let's wrap up. We covered "${title}" today. ${headings.slice(0, 3).length > 0 ? `The main topics were: ${headings.slice(0, 3).join(', ')}.` : ''} I hope you found this valuable!`;
  const outro = `Thanks for listening! See you next time.`;

  return [intro, overview, mainContent, keyTakeaways, recap, outro].filter(Boolean).join(' ');
}

export function buildVideoScenes(rawText: string, title: string): VideoScene[] {
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
    body: headings.slice(0, 3).join(' · ') || 'Key concepts & insights',
    duration: 4,
  });

  // Overview
  if (headings.length > 0) {
    scenes.push({
      type: 'keypoint',
      heading: 'Topics Covered',
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
      heading: `Key Points ${idx > 0 ? `(${idx + 1})` : ''}`.trim(),
      body: group.map(b => `• ${b}`).join('\n'),
      duration: Math.max(5, group.length * 2),
    });
  });

  // Content paragraphs as definition/example cards
  paragraphs.slice(0, 4).forEach((para, i) => {
    const short = para.length > 200 ? para.slice(0, 200) + '…' : para;
    scenes.push({
      type: i % 2 === 0 ? 'definition' : 'example',
      heading: headings[i + 1] || `Section ${i + 1}`,
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
        heading: `Section ${i + 1}`,
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
    heading: 'Recap',
    body: recapText,
    duration: 5,
  });

  // Cap at 12 scenes max
  return scenes.slice(0, 12);
}

export function buildScriptForMode(
  rawText: string,
  title: string,
  mode: MediaMode
): { script: string; scenes?: VideoScene[] } {
  switch (mode) {
    case 'summary':
      return { script: buildSummaryScript(rawText, title) };
    case 'explainer':
      return { script: buildExplainerScript(rawText, title) };
    case 'podcast':
      return { script: buildPodcastScript(rawText, title) };
    case 'video': {
      const scenes = buildVideoScenes(rawText, title);
      const script = scenes.map(s => `${s.heading}. ${s.body}`).join('. ');
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

const SCENE_COLORS: Record<VideoScene['type'], string> = {
  title:      'hsl(245, 58%, 15%)',
  keypoint:   'hsl(240, 20%, 10%)',
  definition: 'hsl(199, 50%, 10%)',
  quote:      'hsl(280, 40%, 10%)',
  example:    'hsl(152, 40%, 8%)',
  recap:      'hsl(245, 58%, 12%)',
};

const ACCENT_COLORS: Record<VideoScene['type'], string> = {
  title:      'hsl(245, 58%, 62%)',
  keypoint:   'hsl(245, 58%, 62%)',
  definition: 'hsl(199, 89%, 48%)',
  quote:      'hsl(291, 64%, 55%)',
  example:    'hsl(152, 69%, 45%)',
  recap:      'hsl(245, 58%, 62%)',
};

export function renderSceneToCanvas(
  canvas: HTMLCanvasElement,
  scene: VideoScene,
  progress = 0 // 0-1 for progress bar
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  // Background
  ctx.fillStyle = SCENE_COLORS[scene.type];
  ctx.fillRect(0, 0, W, H);

  // Subtle gradient overlay
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, 'rgba(255,255,255,0.03)');
  grad.addColorStop(1, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Top accent bar
  ctx.fillStyle = ACCENT_COLORS[scene.type];
  ctx.fillRect(0, 0, W, 4);

  // Type badge
  ctx.fillStyle = ACCENT_COLORS[scene.type] + '30';
  roundRect(ctx, 16, 20, 100, 22, 11);
  ctx.fill();
  ctx.fillStyle = ACCENT_COLORS[scene.type];
  ctx.font = '600 11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(scene.type.toUpperCase(), 26, 35);

  // Heading
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  const headingFontSize = scene.heading.length > 40 ? 18 : 22;
  ctx.font = `700 ${headingFontSize}px Inter, system-ui, sans-serif`;
  const headWords = wrapText(ctx, scene.heading, 16, H < 320 ? 80 : 72, W - 32);
  headWords.forEach((line, i) => {
    ctx.fillText(line, 16, (H < 320 ? 80 : 72) + i * (headingFontSize + 4));
  });
  const bodyStartY = (H < 320 ? 80 : 72) + headWords.length * (headingFontSize + 4) + 16;

  // Body text
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  const bodyFontSize = scene.body.length > 200 ? 12 : 14;
  ctx.font = `400 ${bodyFontSize}px Inter, system-ui, sans-serif`;
  const bodyLines = scene.body.split('\n').flatMap(line => wrapText(ctx, line, 16, bodyStartY, W - 32));
  bodyLines.slice(0, 10).forEach((line, i) => {
    ctx.fillText(line, 16, bodyStartY + i * (bodyFontSize + 5));
  });

  // Progress bar at bottom
  if (progress > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(0, H - 4, W, 4);
    ctx.fillStyle = ACCENT_COLORS[scene.type];
    ctx.fillRect(0, H - 4, W * progress, 4);
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
