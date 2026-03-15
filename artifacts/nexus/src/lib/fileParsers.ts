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
    // Strip CSS property declarations that leak from SVG/PDF
    .replace(/\b(font-family|font-size|font-weight|font-style|font-variant|letter-spacing|word-spacing|text-anchor|text-decoration|line-height|fill|stroke|color|background|opacity|visibility)\s*:\s*[^;\n}]{0,120}[;]?/gi, '')
    // Strip standalone common font name lines
    .replace(/^[ \t]*(Helvetica|Arial|Times(\s+New\s+Roman)?|Calibri|Cambria|Courier(\s+New)?|Verdana|Georgia|Tahoma|Trebuchet(\s+MS)?|Roboto|Lato|Montserrat|Open\s+Sans|Noto\s+Sans|Source\s+Sans|Liberation|DejaVu|Ubuntu)(\s+(Bold|Italic|Regular|Light|Medium|Black|\d+))?\s*$/gim, '')
    // Strip standalone size values (e.g. "18px", "12pt")
    .replace(/^\s*\d+(\.\d+)?\s*(px|pt|em|rem|%)\s*$/gm, '')
    // Strip standalone hex colours
    .replace(/^\s*#[0-9a-fA-F]{3,8}\s*$/gm, '')
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

export async function parsePptxToSvgSlides(arrayBuffer: ArrayBuffer): Promise<string[]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(arrayBuffer);
  const slides: string[] = [];
  const slideFiles = Object.keys(zip.files).filter(f => f.match(/ppt\/slides\/slide\d+\.xml$/)).sort((a, b) => {
    const na = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
    const nb = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
    return na - nb;
  });

  const mediaFiles = Object.keys(zip.files).filter(f => f.startsWith('ppt/media/'));
  const mediaMap: Record<string, string> = {};
  for (const mf of mediaFiles) {
    try {
      const data = await zip.files[mf].async('base64');
      const ext2 = mf.split('.').pop()?.toLowerCase() || 'png';
      mediaMap[mf.split('/').pop() || ''] = `data:image/${ext2};base64,${data}`;
    } catch { /* skip */ }
  }

  for (const sf of slideFiles) {
    try {
      const xml = await zip.files[sf].async('string');
      const slideNum = sf.match(/slide(\d+)/)?.[1] || '?';

      interface SlideShape {
        x: number; y: number; cx: number; cy: number;
        texts: { text: string; bold: boolean; fontSize: number; color: string }[];
        isTitle: boolean;
      }
      const shapes: SlideShape[] = [];

      const spBlocks = xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) || [];
      for (const sp of spBlocks) {
        const offMatch = sp.match(/<a:off\s+x="(\d+)"\s+y="(\d+)"/);
        const extMatch = sp.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
        const emuToX = (emu: number) => (emu / 12192000) * 960;
        const emuToY = (emu: number) => (emu / 6858000) * 540;

        const x = offMatch ? emuToX(parseInt(offMatch[1])) : 48;
        const y = offMatch ? emuToY(parseInt(offMatch[2])) : 80;
        const cx = extMatch ? emuToX(parseInt(extMatch[1])) : 864;
        const cy = extMatch ? emuToY(parseInt(extMatch[2])) : 60;

        const isTitle = /<p:ph\s[^>]*type="(title|ctrTitle)"/.test(sp);
        const texts: SlideShape['texts'] = [];
        const paragraphs = sp.match(/<a:p>[\s\S]*?<\/a:p>/g) || [];
        for (const para of paragraphs) {
          const runs = para.match(/<a:r>[\s\S]*?<\/a:r>/g) || [];
          for (const run of runs) {
            const textMatch = run.match(/<a:t>([^<]*)<\/a:t>/);
            if (!textMatch || !textMatch[1].trim()) continue;
            const bold = /<a:rPr[^>]*\bb="1"/.test(run);
            const szMatch = run.match(/<a:rPr[^>]*\bsz="(\d+)"/);
            const fontSize = szMatch ? Math.max(12, Math.round((parseInt(szMatch[1]) / 100) * 1.0)) : (isTitle ? 28 : 16);
            const colorMatch = run.match(/<a:solidFill>[\s\S]*?<a:srgbClr val="([A-Fa-f0-9]{6})"[\s\S]*?<\/a:solidFill>/);
            const color = colorMatch ? `#${colorMatch[1]}` : '#333333';
            texts.push({ text: textMatch[1].trim(), bold: bold || isTitle, fontSize, color });
          }
          if (runs.length === 0) {
            const directText = para.match(/<a:t>([^<]*)<\/a:t>/);
            if (directText && directText[1].trim()) {
              texts.push({ text: directText[1].trim(), bold: isTitle, fontSize: isTitle ? 28 : 16, color: '#333333' });
            }
          }
        }
        if (texts.length > 0) shapes.push({ x, y, cx, cy, texts, isTitle });
      }

      const relFile = sf.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
      const imageRefs: string[] = [];
      if (zip.files[relFile]) {
        const relXml = await zip.files[relFile].async('string');
        const imgMatches = relXml.match(/Target="\.\.\/media\/[^"]+"/g);
        if (imgMatches) {
          imgMatches.forEach(m => {
            const fn = m.match(/media\/([^"]+)/)?.[1];
            if (fn && mediaMap[fn]) imageRefs.push(mediaMap[fn]);
          });
        }
      }

      let bgColor = '#FFFFFF';
      const bgSolidMatch = xml.match(/<p:bg>[\s\S]*?<a:srgbClr val="([A-Fa-f0-9]{6})"[\s\S]*?<\/p:bg>/);
      if (bgSolidMatch) bgColor = `#${bgSolidMatch[1]}`;

      const W = 960, H = 540;
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
      svg += `<defs><style>text { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; }</style></defs>`;
      svg += `<rect width="${W}" height="${H}" fill="${bgColor}"/>`;

      if (imageRefs.length === 1) {
        svg += `<image href="${imageRefs[0]}" x="80" y="40" width="800" height="460" preserveAspectRatio="xMidYMid meet"/>`;
      } else if (imageRefs.length > 1) {
        const cols = Math.min(imageRefs.length, 3);
        const imgW = Math.floor((W - 80) / cols) - 16;
        const imgH = Math.min(280, H - 160);
        imageRefs.forEach((img, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const ix = 48 + col * (imgW + 16);
          const iy = 60 + row * (imgH + 16);
          svg += `<image href="${img}" x="${ix}" y="${iy}" width="${imgW}" height="${imgH}" preserveAspectRatio="xMidYMid meet"/>`;
        });
      }

      if (shapes.length > 0) {
        for (const shape of shapes) {
          let textY = shape.y + 4;
          for (const t of shape.texts) {
            textY += t.fontSize + 4;
            if (textY > H - 10) break;
            const escaped = t.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').substring(0, 120);
            svg += `<text x="${shape.x + 8}" y="${textY}" font-size="${t.fontSize}" font-weight="${t.bold ? 'bold' : 'normal'}" fill="${t.color}">${escaped}</text>`;
          }
        }
      } else {
        const textMatches = xml.match(/<a:t>([^<]*)<\/a:t>/g);
        const texts = textMatches ? textMatches.map(t => t.replace(/<[^>]+>/g, '').trim()).filter(Boolean) : [];
        const startY = imageRefs.length > 0 ? 380 : 80;
        texts.forEach((t, i) => {
          const y = startY + i * 28;
          if (y < H - 20) {
            const fontSize = i === 0 ? 26 : 16;
            const weight = i === 0 ? 'bold' : 'normal';
            svg += `<text x="48" y="${y}" font-size="${fontSize}" font-weight="${weight}" fill="#333">${t.replace(/&/g, '&amp;').replace(/</g, '&lt;').substring(0, 120)}</text>`;
          }
        });
      }

      svg += `<rect x="${W - 52}" y="${H - 28}" width="44" height="22" rx="4" fill="rgba(0,0,0,0.06)"/>`;
      svg += `<text x="${W - 30}" y="${H - 13}" text-anchor="middle" font-size="11" fill="#999">${slideNum}</text>`;

      if (shapes.length === 0 && imageRefs.length === 0) {
        svg += `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="18" fill="#bbb">(Empty slide)</text>`;
      }

      svg += `</svg>`;
      const b64 = btoa(unescape(encodeURIComponent(svg)));
      slides.push(`data:image/svg+xml;base64,${b64}`);
    } catch {
      slides.push(`data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="960" height="540" fill="#f5f5f5"/><text x="480" y="270" text-anchor="middle" fill="#999" font-size="18">Could not render slide</text></svg>')}`);
    }
  }
  return slides;
}

export async function parsePptxToText(arrayBuffer: ArrayBuffer): Promise<string> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(arrayBuffer);
  const slideFiles = Object.keys(zip.files).filter(f => f.match(/ppt\/slides\/slide\d+\.xml$/)).sort((a, b) => {
    const na = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
    const nb = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
    return na - nb;
  });

  let fullText = '';
  for (const sf of slideFiles) {
    try {
      const xml = await zip.files[sf].async('string');
      const textMatches = xml.match(/<a:t>([^<]*)<\/a:t>/g);
      const slideText = textMatches ? textMatches.map(t => t.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(' ') : '';
      if (slideText) fullText += slideText + '\n\n';
    } catch { /* skip */ }
  }
  return cleanText(fullText);
}

export async function parsePptx(file: File): Promise<ParsedContent> {
  const arrayBuffer = await file.arrayBuffer();
  const rawText = await parsePptxToText(arrayBuffer);
  const slides = await parsePptxToSvgSlides(arrayBuffer);
  
  const cleaned = cleanText(rawText);
  const sections = splitIntoSections(cleaned);
  const title = sections[0]?.heading || file.name.replace(/\.[^.]+$/, '');

  return { title, sections, rawText: cleaned };
}
