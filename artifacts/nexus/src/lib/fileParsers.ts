import mammoth from 'mammoth';

export interface ParsedContent {
  title: string;
  sections: ParsedSection[];
  rawText: string;
}

export interface ParsedSection {
  heading: string;
  paragraphs: string[];
  bullets: string[];
}

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitIntoSections(text: string): ParsedSection[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const sections: ParsedSection[] = [];
  let current: ParsedSection = { heading: '', paragraphs: [], bullets: [] };

  for (const line of lines) {
    const isBullet = /^[-•*▪▸►➤✓✔☐☑]\s/.test(line) || /^\d+[.)]\s/.test(line);
    const isHeading = line.length < 80 && !isBullet && (
      line === line.toUpperCase() ||
      /^#{1,6}\s/.test(line) ||
      (line.length < 50 && !line.endsWith('.') && !line.endsWith(','))
    );

    if (isHeading && (current.paragraphs.length > 0 || current.bullets.length > 0)) {
      sections.push(current);
      current = { heading: line.replace(/^#{1,6}\s*/, ''), paragraphs: [], bullets: [] };
    } else if (isHeading && current.heading === '') {
      current.heading = line.replace(/^#{1,6}\s*/, '');
    } else if (isBullet) {
      current.bullets.push(line.replace(/^[-•*▪▸►➤✓✔☐☑]\s*/, '').replace(/^\d+[.)]\s*/, ''));
    } else {
      current.paragraphs.push(line);
    }
  }

  if (current.heading || current.paragraphs.length > 0 || current.bullets.length > 0) {
    sections.push(current);
  }

  if (sections.length === 0) {
    sections.push({ heading: 'Content', paragraphs: lines.slice(0, 20), bullets: [] });
  }

  return sections;
}

export function parsePlainText(text: string): ParsedContent {
  const cleaned = cleanText(text);
  const lines = cleaned.split('\n').filter(l => l.trim());
  const title = lines[0]?.substring(0, 100) || 'Untitled';
  const sections = splitIntoSections(cleaned);

  return { title, sections, rawText: cleaned };
}

export async function parseDocx(file: File): Promise<ParsedContent> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const sections: ParsedSection[] = [];
  let current: ParsedSection = { heading: '', paragraphs: [], bullets: [] };

  const elements = doc.body.children;
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent || '').trim();
    if (!text) continue;

    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
      if (current.heading || current.paragraphs.length > 0 || current.bullets.length > 0) {
        sections.push(current);
      }
      current = { heading: text, paragraphs: [], bullets: [] };
    } else if (tag === 'ul' || tag === 'ol') {
      const items = el.querySelectorAll('li');
      items.forEach(li => {
        const t = (li.textContent || '').trim();
        if (t) current.bullets.push(t);
      });
    } else if (tag === 'p') {
      current.paragraphs.push(text);
    }
  }

  if (current.heading || current.paragraphs.length > 0 || current.bullets.length > 0) {
    sections.push(current);
  }

  const rawText = doc.body.textContent || '';
  const title = sections[0]?.heading || rawText.split('\n')[0]?.substring(0, 100) || 'Untitled';

  return { title, sections, rawText };
}

export async function parsePdf(file: File): Promise<ParsedContent> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n\n';
  }

  const cleaned = cleanText(fullText);
  const lines = cleaned.split('\n').filter(l => l.trim());

  let mergedLines: string[] = [];
  for (const line of lines) {
    if (mergedLines.length > 0 && !line.match(/^[A-Z]/) && mergedLines[mergedLines.length - 1].length < 60) {
      mergedLines[mergedLines.length - 1] += ' ' + line;
    } else {
      mergedLines.push(line);
    }
  }

  const title = mergedLines[0]?.substring(0, 100) || 'Untitled';
  const sections = splitIntoSections(mergedLines.join('\n'));

  return { title, sections, rawText: cleaned };
}

export function parseTxt(text: string): ParsedContent {
  return parsePlainText(text);
}
