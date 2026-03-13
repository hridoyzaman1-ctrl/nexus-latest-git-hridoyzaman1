// Utility to extract text from documents for AI summarization
import { getBookFile } from '@/lib/bookStorage';
import { getStudyFile } from '@/lib/studyStorage';

/**
 * Strips font metadata, CSS declarations, SVG style artifacts, and other
 * non-content noise that PDF.js / SVG-PPTX extraction can accidentally pull in.
 * Safe to run on any raw extracted text before feeding it to the AI.
 */
export function cleanExtractedText(text: string): string {
  return text
    // ── CSS property declarations ────────────────────────────────────────────
    // e.g. "font-family: Helvetica; font-size: 18px; fill: #333;"
    .replace(/\b(font-family|font-size|font-weight|font-style|font-variant|letter-spacing|word-spacing|text-anchor|text-decoration|line-height|fill|stroke|color|background|opacity|visibility|display|overflow)\s*:\s*[^;\n}]{0,120}[;]?/gi, '')
    // ── Standalone CSS/SVG style blocks ─────────────────────────────────────
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<defs[\s\S]*?<\/defs>/gi, '')
    // ── Lines that are nothing but common font names ─────────────────────────
    // e.g. "Helvetica", "Arial Bold", "Times New Roman"
    .replace(/^[ \t]*(Helvetica|Arial|Times(\s+New\s+Roman)?|Calibri|Cambria|Courier(\s+New)?|Verdana|Georgia|Tahoma|Trebuchet(\s+MS)?|Gill\s+Sans|Futura|Garamond|Palatino|Century|Comic\s+Sans(\s+MS)?|Impact|Lucida|Roboto|Open\s+Sans|Lato|Montserrat|Source\s+Sans|Noto\s+Sans|Ubuntu|DejaVu|Liberation|Bangla|Kalpurush|SolaimanLipi|Nikosh|Siyam\s+Rupali)(\s+(Bold|Italic|Regular|Light|Medium|Black|Condensed|Narrow|Extended|\d+))?\s*$/gim, '')
    // ── Standalone px / pt / em / % size values ──────────────────────────────
    .replace(/^\s*\d+(\.\d+)?\s*(px|pt|em|rem|%|sp|dp)\s*$/gm, '')
    // ── Hex colour codes on their own line ────────────────────────────────────
    .replace(/^\s*#[0-9a-fA-F]{3,8}\s*$/gm, '')
    // ── XML / SVG namespace and attribute fragments ──────────────────────────
    .replace(/xmlns[:\w]*\s*=\s*"[^"]*"/g, '')
    .replace(/xlink:[:\w]+\s*=\s*"[^"]*"/g, '')
    // ── Lines that look like CSS selectors or rules ──────────────────────────
    .replace(/^\.[\w-]+\s*\{[^}]*\}\s*$/gm, '')
    // ── Lines that are ONLY numbers (sizes, ids, coordinates) ────────────────
    .replace(/^\s*-?\d+(\.\d+)?\s*$/gm, '')
    // ── Collapse noise-gaps left behind ─────────────────────────────────────
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── PDF text helpers ───────────────────────────────────────────────────────────

function fixLigatures(text: string): string {
  return text
    .replace(/ﬁ/g, 'fi').replace(/ﬀ/g, 'ff').replace(/ﬂ/g, 'fl')
    .replace(/ﬃ/g, 'ffi').replace(/ﬄ/g, 'ffl').replace(/ﬅ/g, 'st')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');
}

/** Returns true when >35% of non-space chars look like encoding garbage */
function isLikelyGarbled(text: string): boolean {
  if (!text || text.length < 40) return false;
  const nonSpace = text.replace(/\s/g, '');
  if (!nonSpace.length) return false;
  // Allow: ASCII printable, Latin extended, Cyrillic, Arabic, Bangla, CJK, common punctuation
  const weird = (nonSpace.match(
    /[^\x20-\x7E\u00A0-\u024F\u0400-\u04FF\u0600-\u06FF\u0980-\u09FF\u4E00-\u9FFF\u2000-\u206F\u2018-\u201F]/g
  ) || []).length;
  return weird / nonSpace.length > 0.35;
}

/** Strip chars that look like encoding garbage, keep readable content */
function cleanGarbled(text: string): string {
  return text
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u024F\u0400-\u04FF\u0600-\u06FF\u0980-\u09FF\u4E00-\u9FFF\u2000-\u206F\u2018-\u201F]/g, ' ')
    .replace(/\s{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .trim();
}

interface RawItem { str: string; transform?: number[]; hasEOL?: boolean }

/**
 * Reconstruct readable lines from raw PDF.js text items.
 * Sorts by y-position (PDF y increases upward) then x, grouping items
 * within LINE_GAP units of each other onto the same line.
 */
function reconstructLines(items: RawItem[]): string {
  const valid = items.filter(it => typeof it.str === 'string');
  if (!valid.length) return '';

  const LINE_GAP = 4;

  const sorted = [...valid].sort((a, b) => {
    const ay = a.transform?.[5] ?? 0;
    const by = b.transform?.[5] ?? 0;
    if (Math.abs(ay - by) > LINE_GAP) return by - ay;
    return (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0);
  });

  const lines: string[] = [];
  let curY: number | null = null;
  let curLine = '';

  for (const it of sorted) {
    const y = it.transform?.[5] ?? 0;
    const s = it.str;

    if (curY === null || Math.abs(y - curY) > LINE_GAP) {
      if (curLine.trim()) lines.push(curLine.trim());
      curLine = s;
      curY = y;
    } else {
      if (curLine && s) {
        const gap = !curLine.endsWith(' ') && !s.startsWith(' ');
        curLine += gap ? ' ' + s : s;
      } else {
        curLine += s;
      }
    }

    if (it.hasEOL) {
      if (curLine.trim()) lines.push(curLine.trim());
      curLine = '';
      curY = null;
    }
  }
  if (curLine.trim()) lines.push(curLine.trim());

  return lines.filter(l => l.trim()).join('\n');
}

// ── Main extractors ────────────────────────────────────────────────────────────

export async function extractPdfText(pdfData?: string, pdfUrl?: string, startPage = 1, endPage = 30): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  let pdf: Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;
  if (pdfUrl) {
    pdf = await pdfjsLib.getDocument({ url: pdfUrl }).promise;
  } else if (pdfData) {
    const binary = atob(pdfData);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    pdf = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
  } else {
    return '';
  }

  const texts: string[] = [];
  const start = Math.max(1, startPage);
  const end = Math.min(pdf.numPages, endPage);
  let emptyPages = 0;

  for (let i = start; i <= end; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as RawItem[];

    // Position-based line reconstruction
    let pageText = reconstructLines(items);

    // Fix ligatures
    pageText = fixLigatures(pageText);

    if (!pageText.trim()) {
      emptyPages++;
      // Fallback: annotation text
      try {
        const annots = await page.getAnnotations();
        const annotTexts = annots
          .filter((a: any) => a.contents || a.title)
          .map((a: any) => [a.title, a.contents].filter(Boolean).join(': '));
        if (annotTexts.length > 0) {
          texts.push(`[Page ${i} - notes]\n${annotTexts.join('\n')}`);
        }
      } catch { /* no annotations */ }
      continue;
    }

    // If text looks garbled, try to salvage readable content
    if (isLikelyGarbled(pageText)) {
      const cleaned = cleanExtractedText(cleanGarbled(pageText));
      if (cleaned.replace(/\s/g, '').length > 20) {
        texts.push(`[Page ${i}]\n${cleaned}`);
      } else {
        emptyPages++;
      }
    } else {
      texts.push(`[Page ${i}]\n${cleanExtractedText(pageText)}`);
    }
  }

  if (emptyPages > 0 && texts.length === 0) {
    return `[Info] This appears to be an image-based or scanned PDF (${pdf.numPages} pages). Pages ${start}-${end} contain no extractable text layer. Try copying and pasting the text manually instead.`;
  }

  return texts.join('\n\n');
}

export async function extractPptxText(slides: string[], startPage = 1, endPage = 30): Promise<string> {
  const texts: string[] = [];
  const start = Math.max(1, startPage);
  const end = Math.min(slides.length, endPage);

  for (let i = start; i <= end; i++) {
    const slide = slides[i - 1];
    if (!slide) continue;
    try {
      let svgStr = '';
      if (slide.startsWith('data:image/svg+xml;base64,')) {
        try { svgStr = decodeURIComponent(escape(atob(slide.replace('data:image/svg+xml;base64,', '')))); }
        catch { svgStr = atob(slide.replace('data:image/svg+xml;base64,', '')); }
      } else if (slide.startsWith('data:image/svg+xml,')) {
        svgStr = decodeURIComponent(slide.replace('data:image/svg+xml,', ''));
      } else if (slide.startsWith('<svg') || slide.startsWith('<?xml')) {
        svgStr = slide;
      }

      let slideTexts: string[] = [];

      if (svgStr) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(svgStr, 'image/svg+xml');

          // ── Targeted element query (avoids <style>, <defs>, <script> entirely) ──
          // Query only SVG <text> elements — their textContent captures child <tspan>s too.
          // We deliberately skip <style>, <defs>, <title>, <desc> which carry CSS/font metadata.
          const textEls = Array.from(doc.querySelectorAll('text'));
          for (const el of textEls) {
            const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (t && t.length > 0) slideTexts.push(t);
          }

          // Deduplicate adjacent identical fragments (tspan repetition)
          slideTexts = [...new Set(slideTexts)];
        } catch { /* DOMParser failed — fall through to regex */ }
      }

      // Regex fallback: only if element-query yielded nothing
      if (slideTexts.length === 0 && svgStr) {
        // Strip <style> and <defs> blocks first so font CSS can't leak in
        const stripped = svgStr
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<defs[\s\S]*?<\/defs>/gi, '');
        const textElRegex = /<text[^>]*>([\s\S]*?)<\/text>/gi;
        let match;
        while ((match = textElRegex.exec(stripped)) !== null) {
          const plain = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (plain) slideTexts.push(plain);
        }
      }

      if (slideTexts.length > 0) {
        // Apply noise cleaner before storing
        const cleaned = cleanExtractedText(slideTexts.join('\n'));
        if (cleaned.trim()) texts.push(`[Slide ${i}]\n${cleaned}`);
      }
    } catch { /* skip bad slide */ }
  }

  if (texts.length === 0) {
    const imageCount = slides.slice(start - 1, end)
      .filter(s => s && (s.startsWith('data:image/png') || s.startsWith('data:image/jpeg'))).length;
    if (imageCount > 0) {
      return `[Info] This presentation contains ${imageCount} image-based slide(s). Image slides don't contain extractable text.`;
    }
  }
  return texts.join('\n\n');
}

export function extractPlainText(fullText: string, startPage = 1, endPage = 30, charsPerPage = 2000): string {
  const start = Math.max(0, (startPage - 1) * charsPerPage);
  const end = Math.min(fullText.length, endPage * charsPerPage);
  return fullText.slice(start, end);
}

export function makeBookPageTextFn(bookId: string, fileType?: string, pdfUrl?: string) {
  return async (startPage: number, endPage: number): Promise<string> => {
    if (fileType === 'pdf' || pdfUrl) {
      const file = pdfUrl ? null : await getBookFile(bookId);
      return extractPdfText(file?.pdfData, pdfUrl, startPage, endPage);
    }
    const file = await getBookFile(bookId);
    if (file?.content) return extractPlainText(file.content, startPage, endPage);
    return '';
  };
}

export function makeStudyPageTextFn(materialId: string, fileType: string) {
  return async (startPage: number, endPage: number): Promise<string> => {
    const file = await getStudyFile(materialId);
    if (!file) return '';
    if (fileType === 'pdf' && file.pdfData) return extractPdfText(file.pdfData, undefined, startPage, endPage);
    if ((fileType === 'pptx' || fileType === 'ppt') && file.pptxSlides) return extractPptxText(file.pptxSlides, startPage, endPage);
    if (file.content) return extractPlainText(file.content, startPage, endPage);
    return '';
  };
}
