// Utility to extract text from documents for AI summarization
import { getBookFile } from '@/lib/bookStorage';
import { getStudyFile } from '@/lib/studyStorage';

export async function extractPdfText(pdfData?: string, pdfUrl?: string, startPage = 1, endPage = 30): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  let pdf;
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
    const pageText = content.items.map((item: any) => item.str).join(' ');
    if (pageText.trim()) {
      texts.push(`[Page ${i}]\n${pageText}`);
    } else {
      emptyPages++;
      // Try to get annotations as fallback
      try {
        const annots = await page.getAnnotations();
        const annotTexts = annots
          .filter((a: any) => a.contents || a.title)
          .map((a: any) => [a.title, a.contents].filter(Boolean).join(': '));
        if (annotTexts.length > 0) {
          texts.push(`[Page ${i} - annotations]\n${annotTexts.join('\n')}`);
        }
      } catch { /* no annotations */ }
    }
  }

  // If most pages are empty, this is likely an image-based PDF
  if (emptyPages > 0 && texts.length === 0) {
    return `[Info] This appears to be an image-based PDF (${pdf.numPages} pages). Pages ${start}-${end} contain no extractable text layer. This document may consist of scanned images or illustrations (e.g., comics, handwritten notes, or photo-based content).`;
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

      // Decode the SVG from different possible formats
      if (slide.startsWith('data:image/svg+xml;base64,')) {
        try {
          svgStr = decodeURIComponent(escape(atob(slide.replace('data:image/svg+xml;base64,', ''))));
        } catch {
          // Try direct atob
          svgStr = atob(slide.replace('data:image/svg+xml;base64,', ''));
        }
      } else if (slide.startsWith('data:image/svg+xml,')) {
        svgStr = decodeURIComponent(slide.replace('data:image/svg+xml,', ''));
      } else if (slide.startsWith('<svg') || slide.startsWith('<?xml')) {
        svgStr = slide;
      }

      let slideTexts: string[] = [];

      // Method 1: DOMParser (most robust)
      if (svgStr) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(svgStr, 'image/svg+xml');
          // Walk all text nodes in the SVG
          const walker = document.createTreeWalker(doc.documentElement, NodeFilter.SHOW_TEXT);
          let node: Node | null;
          while ((node = walker.nextNode())) {
            const t = (node.textContent || '').trim();
            if (t && t.length > 0) slideTexts.push(t);
          }
        } catch {
          // DOMParser failed, fall through to regex
        }
      }

      // Method 2: Regex fallback on SVG string
      if (slideTexts.length === 0 && svgStr) {
        // Match text content between tags, including nested
        const textElRegex = /<text[^>]*>([\s\S]*?)<\/text>/gi;
        let match;
        while ((match = textElRegex.exec(svgStr)) !== null) {
          // Strip inner tags to get plain text
          const plain = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (plain) slideTexts.push(plain);
        }
        // Also try tspan elements
        if (slideTexts.length === 0) {
          const tspanRegex = /<tspan[^>]*>([^<]*)<\/tspan>/gi;
          while ((match = tspanRegex.exec(svgStr)) !== null) {
            const t = match[1].trim();
            if (t) slideTexts.push(t);
          }
        }
        // Last resort: any text between > and <
        if (slideTexts.length === 0) {
          const allText = svgStr.match(/>([^<]{2,})</g);
          if (allText) {
            slideTexts = allText.map(t => t.slice(1, -1).trim()).filter(t => t.length > 1 && !/^[0-9.]+$/.test(t));
          }
        }
      }

      // Method 3: Raw base64 text scan (last resort for non-SVG slides)
      if (slideTexts.length === 0 && slide.includes('base64,')) {
        try {
          const raw = atob(slide.split('base64,')[1] || '');
          // Extract readable ASCII sequences
          const readable = raw.match(/[\x20-\x7E]{4,}/g);
          if (readable) {
            slideTexts = readable.filter(s => /[a-zA-Z]{2,}/.test(s));
          }
        } catch { /* ignore */ }
      }

      if (slideTexts.length > 0) {
        texts.push(`[Slide ${i}]\n${slideTexts.join(' ')}`);
      }
    } catch {
      // Silently skip slides that can't be parsed
    }
  }

  // If no text was extracted from any slide, check if they're all image-based
  if (texts.length === 0) {
    const imageSlideCount = slides.slice(start - 1, end).filter(s =>
      s && (s.startsWith('data:image/png') || s.startsWith('data:image/jpeg') || s.startsWith('data:image/jpg'))
    ).length;
    if (imageSlideCount > 0) {
      return `[Info] This presentation contains ${imageSlideCount} image-based slide(s) (slides ${start}-${end}). Image slides don't contain extractable text. The presentation may use images, screenshots, or scanned content instead of text elements.`;
    }
  }

  return texts.join('\n\n');
}

export function extractPlainText(fullText: string, startPage = 1, endPage = 30, charsPerPage = 2000): string {
  const start = Math.max(0, (startPage - 1) * charsPerPage);
  const end = Math.min(fullText.length, endPage * charsPerPage);
  return fullText.slice(start, end);
}

// Helper to build getPageText for book reader
export function makeBookPageTextFn(bookId: string, fileType?: string, pdfUrl?: string) {
  return async (startPage: number, endPage: number): Promise<string> => {
    if (fileType === 'pdf' || pdfUrl) {
      const file = pdfUrl ? null : await getBookFile(bookId);
      return extractPdfText(file?.pdfData, pdfUrl, startPage, endPage);
    }
    // text/epub
    const file = await getBookFile(bookId);
    if (file?.content) return extractPlainText(file.content, startPage, endPage);
    return '';
  };
}

// Helper for study material
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
