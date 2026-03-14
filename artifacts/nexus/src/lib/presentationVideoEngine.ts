import type { SlideContent, ThemeConfig, SlideLayoutType, SlideImage } from '@/types/presentation';

/**
 * Pre-load all images referenced by slide.images[] from their dataUrls.
 * Returns a Map<imageId, HTMLImageElement> for synchronous use inside the
 * canvas render loop.
 */
export async function preloadSlideImages(
  slides: SlideContent[],
): Promise<Map<string, HTMLImageElement>> {
  const map = new Map<string, HTMLImageElement>();
  const promises: Promise<void>[] = [];

  for (const slide of slides) {
    for (const img of slide.images ?? []) {
      if (!img.dataUrl || map.has(img.id)) continue;
      const el = new Image();
      promises.push(
        new Promise<void>(resolve => {
          el.onload = () => { map.set(img.id, el); resolve(); };
          el.onerror = () => resolve();
          el.src = img.dataUrl;
        }),
      );
    }
  }

  await Promise.all(promises);
  return map;
}

/**
 * Draw a helper rounded-rect path (ponyfill for ctx.roundRect which is not
 * available on all browsers).
 */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  const R = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + R, y);
  ctx.lineTo(x + w - R, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + R);
  ctx.lineTo(x + w, y + h - R);
  ctx.quadraticCurveTo(x + w, y + h, x + w - R, y + h);
  ctx.lineTo(x + R, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - R);
  ctx.lineTo(x, y + R);
  ctx.quadraticCurveTo(x, y, x + R, y);
  ctx.closePath();
}

/**
 * Render a presentation slide to an offscreen canvas using the theme's exact
 * visual design: background colours, accent decorations, fonts, text layout,
 * and any user-uploaded images. Intended to be called every ~40 ms inside the
 * MediaRecorder frame loop.
 *
 * @param canvas     - offscreen HTMLCanvasElement (typically 480 × 270)
 * @param slide      - SlideContent for the current slide
 * @param theme      - ThemeConfig from presentationThemes
 * @param imageCache - Map returned by preloadSlideImages()
 * @param progress   - 0..1 — drives the thin progress bar at the bottom
 */
function getTextAreaWidth(layout: SlideLayoutType, images: SlideImage[]): number {
  if (!images || images.length === 0) return 100;
  // If images are placed on the right (x >= 55), constrain text to the left
  const hasUploadedOrPlaceholder = images.some(img => img.x >= 55);
  if (!hasUploadedOrPlaceholder) return 100;
  const minX = Math.min(...images.filter(img => img.x >= 55).map(img => img.x));
  return Math.max(45, minX - 4);
}

export function renderPresentationSlideToCanvas(
  canvas: HTMLCanvasElement,
  slide: SlideContent,
  theme: ThemeConfig,
  imageCache: Map<string, HTMLImageElement>,
  progress = 0,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  const tc = `#${theme.titleColor}`;
  const bc = `#${theme.bodyColor}`;
  const ac = `#${theme.accentColor}`;
  const bg = `#${theme.bgColor}`;
  const bg2 = `#${theme.bgColorAlt}`;

  // ── Background ─────────────────────────────────────────────────────────────
  if (theme.gradientCover) {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, bg);
    grad.addColorStop(1, bg2);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = bg;
  }
  ctx.fillRect(0, 0, W, H);

  // ── Accent decoration ──────────────────────────────────────────────────────
  if (theme.shapeAccent) {
    // top stripe
    ctx.fillStyle = ac;
    ctx.fillRect(0, 0, W, 3);
    // subtle left bar (not on cover to keep it clean)
    if (slide.layout !== 'cover' && slide.layout !== 'section-divider') {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = ac;
      ctx.fillRect(0, 0, 3, H);
      ctx.restore();
    }
  }

  // ── Images (rendered behind text) ─────────────────────────────────────────
  // x, y, width, height are percentages of the slide container
  for (const imgMeta of slide.images ?? []) {
    // (drawn first so text sits on top)
    const el = imageCache.get(imgMeta.id);
    if (!el) continue;

    const ix = (imgMeta.x / 100) * W;
    const iy = (imgMeta.y / 100) * H;
    const iw = (imgMeta.width / 100) * W;
    const ih = (imgMeta.height / 100) * H;
    if (iw < 1 || ih < 1) continue;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, imgMeta.opacity ?? 1));

    const br = (imgMeta.borderRadius ?? 0);
    if (br > 0) {
      roundRectPath(ctx, ix, iy, iw, ih, br);
      ctx.clip();
    }

    if (imgMeta.fit === 'contain') {
      const ar = el.naturalWidth / Math.max(el.naturalHeight, 1);
      const iar = iw / Math.max(ih, 1);
      let dw = iw, dh = ih;
      if (ar > iar) { dh = iw / ar; } else { dw = ih * ar; }
      ctx.drawImage(el, ix + (iw - dw) / 2, iy + (ih - dh) / 2, dw, dh);
    } else {
      ctx.drawImage(el, ix, iy, iw, ih);
    }
    ctx.restore();
  }

  // ── Text readability panel (when images are present) ───────────────────────
  // No longer hardcoded. We use getTextAreaWidth to match the UI perfectly.
  const textWidthPct = getTextAreaWidth(slide.layout, slide.images || []);
  const panelW = (textWidthPct / 100) * W;
  const hasLargeImages = (slide.images?.length ?? 0) > 0 &&
    slide.images!.some(img => (img.width ?? 0) > 10 && (img.height ?? 0) > 10);

  if (hasLargeImages && textWidthPct < 100) {
    const panelAlpha = theme.darkTheme ? 0.62 : 0.65;
    ctx.save();
    ctx.globalAlpha = panelAlpha;
    ctx.fillStyle = bg;
    // Cover the text area with a readability panel
    ctx.fillRect(0, 0, panelW, H);
    ctx.restore();

    // Accent stripe still visible on top
    if (theme.shapeAccent) {
      ctx.fillStyle = ac;
      ctx.fillRect(0, 0, W, 3);
    }
  }

  // ── Text helpers ───────────────────────────────────────────────────────────
  // Scale font sizes proportionally to the canvas width.
  // ThemeConfig sizes were designed for a ~960 px wide slide.
  const scale = W / 960;

  const titleSize = Math.round(
    Math.max(13, (
      slide.layout === 'cover'            ? theme.coverTitleSize
      : slide.layout === 'section-divider' ? theme.sectionTitleSize
      : theme.titleFontSize
    ) * scale * 1.4),
  );
  const bodySize  = Math.round(Math.max(9,  theme.bodyFontSize   * scale * 1.25));
  const bulletSize = Math.round(Math.max(8,  theme.bulletFontSize * scale * 1.25));

  const tf = `"${theme.titleFont}", sans-serif`;
  const bf = `"${theme.bodyFont}", sans-serif`;

  const mx = Math.round(W * 0.048);   // horizontal margin
  const my = Math.round(H * 0.07);    // vertical margin

  // Text Styling from slide object
  const sStyle = slide.textStyle;
  const contentMaxW = (textWidthPct / 100) * W - mx * 2;
  
  // Custom colors if defined
  const finalTitleColor = sStyle?.titleColor ? `#${sStyle.titleColor}` : tc;
  const finalBodyColor = sStyle?.bodyColor ? `#${sStyle.bodyColor}` : bc;

  function getAlignmentX(align: string | undefined): number {
    if (align === 'center') return panelW / 2;
    if (align === 'right') return panelW - mx;
    return mx;
  }

  /** Measure and truncate a line to fit maxW pixels. */
  function truncLine(text: string, maxW: number): string {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  }

  /**
   * Draw word-wrapped text. Returns the y position of the last drawn line.
   * `align` sets ctx.textAlign for this call.
   */
  function drawWrapped(
    text: string,
    x: number, y: number,
    maxW: number,
    size: number,
    color: string,
    bold = false,
    maxLines = 5,
    fontStack = tf,
    align: CanvasTextAlign = 'left',
  ): number {
    ctx.font = `${bold ? 'bold ' : ''}${size}px ${fontStack}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    const lineH = size + Math.round(size * 0.28);
    const words = text.trim().split(/\s+/).filter(Boolean);
    let line = '';
    let lineY = y;
    let drawn = 0;

    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxW) {
        if (drawn >= maxLines - 1) {
          ctx.fillText(truncLine(line + ' ' + word, maxW), x, lineY);
          return lineY;
        }
        ctx.fillText(line, x, lineY);
        lineY += lineH;
        line = word;
        drawn++;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(truncLine(line, maxW), x, lineY);
    return lineY;
  }

  // ── Layout-specific rendering ───────────────────────────────────────────────

  if (slide.layout === 'cover') {
    // Vertically centred large title + optional subtitle
    const maxW = W - mx * 3;
    ctx.font = `bold ${titleSize}px ${tf}`;
    // Estimate approx line count to vertically centre the block
    const approxLines = Math.max(1, Math.ceil(ctx.measureText(slide.title || '').width / maxW) + 1);
    const blockH = approxLines * (titleSize + 4) + (slide.subtitle ? bodySize + 14 : 0) + 8;
    const startY = Math.max(my + titleSize, (H - blockH) / 2 + titleSize);

    const titleX = getAlignmentX(sStyle?.titleAlign);
    const titleBottom = drawWrapped(
      slide.title || '', titleX, startY, maxW, titleSize, finalTitleColor, true, 3, tf, sStyle?.titleAlign || 'center',
    );

    // accent underline
    ctx.fillStyle = ac;
    ctx.fillRect(W / 2 - Math.min(36, W * 0.07), titleBottom + 9, Math.min(72, W * 0.14), 2);

    if (slide.subtitle) {
      const subX = getAlignmentX(sStyle?.bodyAlign);
      drawWrapped(
        slide.subtitle, subX, titleBottom + 22, maxW, bodySize, finalBodyColor, false, 2, bf, sStyle?.bodyAlign || 'center',
      );
    }

  } else if (slide.layout === 'section-divider' || slide.layout === 'big-statement') {
    const text = slide.statement || slide.title || '';
    const maxW = W - mx * 3;
    ctx.font = `bold ${titleSize}px ${tf}`;
    const approxLines = Math.max(1, Math.ceil(ctx.measureText(text).width / maxW));
    const blockH = approxLines * (titleSize + 6);
    const startY = Math.max(my + titleSize, (H - blockH) / 2 + titleSize);

    const textX = getAlignmentX(sStyle?.titleAlign);
    drawWrapped(text, textX, startY, maxW, titleSize, finalTitleColor, true, 3, tf, sStyle?.titleAlign || 'center');

    if (slide.subtitle) {
      const subX = getAlignmentX(sStyle?.bodyAlign);
      drawWrapped(slide.subtitle, subX, startY + (titleSize + 6) * approxLines + 10, maxW, bodySize, finalBodyColor, false, 2, bf, sStyle?.bodyAlign || 'center');
    }

  } else {
    // ── Standard slide: title bar at top, content area below ─────────────────
    const alignX = getAlignmentX(sStyle?.titleAlign);
    const titleY = my + titleSize;
    const titleBottom = drawWrapped(
      slide.title || '', alignX, titleY, contentMaxW, titleSize, finalTitleColor, true, 2, tf, sStyle?.titleAlign || 'left'
    );

    // Accent separator
    ctx.fillStyle = sStyle?.accentColor ? `#${sStyle.accentColor}` : ac;
    ctx.fillRect(alignX, titleBottom + 6, Math.min(44, W * 0.09), 2);

    let cy = titleBottom + 20;

    // ── Two-column ────────────────────────────────────────────────────────────
    if (slide.layout === 'two-column' && (slide.leftColumn?.length || slide.rightColumn?.length)) {
      const colW = (contentMaxW - 8) / 2;
      let ly = cy, ry = cy;

      if (slide.leftLabel) {
        ctx.font = `bold ${bulletSize}px ${bf}`;
        ctx.fillStyle = ac;
        ctx.textAlign = 'left';
        ctx.fillText(truncLine(slide.leftLabel, colW), mx, ly);
        ly += bulletSize + 6;
      }
      for (const item of (slide.leftColumn || []).slice(0, 6)) {
        if (ly > H - my) break;
        ctx.fillStyle = ac;
        ctx.beginPath(); ctx.arc(mx + 3, ly - bulletSize / 2 + 1, 2, 0, Math.PI * 2); ctx.fill();
        ctx.font = `${bulletSize}px ${bf}`; ctx.fillStyle = bc; ctx.textAlign = 'left';
        ctx.fillText(truncLine(item, colW - 10), mx + 10, ly);
        ly += bulletSize + 6;
      }

      const rx = mx + colW + 8;
      if (slide.rightLabel) {
        ctx.font = `bold ${bulletSize}px ${bf}`;
        ctx.fillStyle = ac; ctx.textAlign = 'left';
        ctx.fillText(truncLine(slide.rightLabel, colW), rx, ry);
        ry += bulletSize + 6;
      }
      for (const item of (slide.rightColumn || []).slice(0, 6)) {
        if (ry > H - my) break;
        ctx.fillStyle = ac;
        ctx.beginPath(); ctx.arc(rx + 3, ry - bulletSize / 2 + 1, 2, 0, Math.PI * 2); ctx.fill();
        ctx.font = `${bulletSize}px ${bf}`; ctx.fillStyle = bc; ctx.textAlign = 'left';
        ctx.fillText(truncLine(item, colW - 10), rx + 10, ry);
        ry += bulletSize + 6;
      }

    // ── KPI grid ──────────────────────────────────────────────────────────────
    } else if (slide.kpiConfig?.items?.length) {
      const kpis = slide.kpiConfig.items.slice(0, 4);
      const cols = Math.min(kpis.length, 2);
      const kw = (contentMaxW - 8) / cols;
      const kh = Math.min((H - cy - my) / Math.ceil(kpis.length / cols), H * 0.35);
      kpis.forEach((kpi, i) => {
        const kx = mx + (i % cols) * (kw + 8);
        const ky = cy + Math.floor(i / cols) * kh;
        // card bg
        ctx.save();
        ctx.globalAlpha = theme.darkTheme ? 0.12 : 0.07;
        ctx.fillStyle = ac;
        roundRectPath(ctx, kx, ky, kw, kh * 0.85, 4);
        ctx.fill();
        ctx.restore();
        // value
        const valSize = Math.round(titleSize * 0.82);
        ctx.font = `bold ${valSize}px ${tf}`;
        ctx.fillStyle = ac; ctx.textAlign = 'left';
        ctx.fillText(truncLine(kpi.value, kw - 8), kx + 6, ky + valSize + 6);
        // label
        ctx.font = `${bulletSize}px ${bf}`;
        ctx.fillStyle = bc;
        ctx.fillText(truncLine(kpi.label, kw - 8), kx + 6, ky + valSize + bulletSize + 10);
        if (kpi.change) {
          const isPositive = kpi.change.startsWith('+') || /up/i.test(kpi.change);
          ctx.fillStyle = isPositive ? '#22c55e' : '#ef4444';
          ctx.font = `${Math.round(bulletSize * 0.85)}px ${bf}`;
          ctx.fillText(kpi.change, kx + 6, ky + valSize + bulletSize * 2 + 12);
        }
      });

    // ── Bullets / title-bullets / recommendations / process ───────────────────
    } else if (slide.bullets?.length) {
      for (const bullet of slide.bullets.slice(0, 7)) {
        if (cy > H - my) break;
        ctx.fillStyle = ac;
        ctx.beginPath(); ctx.arc(mx + 3, cy - bulletSize / 2 + 1, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.font = `${bulletSize}px ${bf}`; ctx.fillStyle = bc; ctx.textAlign = 'left';
        ctx.fillText(truncLine(bullet, contentMaxW - 12), mx + 12, cy);
        cy += bulletSize + 7;
      }

    // ── Agenda items ───────────────────────────────────────────────────────────
    } else if (slide.agendaItems?.length) {
      for (const [idx, item] of slide.agendaItems.slice(0, 7).entries()) {
        if (cy > H - my) break;
        // number badge
        ctx.save();
        ctx.fillStyle = ac;
        const badgeR = Math.round(bulletSize * 0.65);
        ctx.beginPath(); ctx.arc(mx + badgeR, cy - bulletSize / 2 + 2, badgeR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = theme.darkTheme ? '#000' : '#fff';
        ctx.font = `bold ${Math.round(bulletSize * 0.7)}px ${tf}`;
        ctx.textAlign = 'center';
        ctx.fillText(String(idx + 1), mx + badgeR, cy - bulletSize / 2 + 2 + badgeR * 0.4);
        ctx.restore();
        ctx.font = `${bulletSize}px ${bf}`; ctx.fillStyle = bc; ctx.textAlign = 'left';
        ctx.fillText(truncLine(item, contentMaxW - badgeR * 2 - 8), mx + badgeR * 2 + 6, cy);
        cy += bulletSize + 7;
      }

    // ── Summary points ─────────────────────────────────────────────────────────
    } else if (slide.summaryPoints?.length) {
      for (const pt of slide.summaryPoints.slice(0, 7)) {
        if (cy > H - my) break;
        ctx.fillStyle = ac;
        ctx.beginPath(); ctx.arc(mx + 3, cy - bulletSize / 2 + 1, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.font = `${bulletSize}px ${bf}`; ctx.fillStyle = bc; ctx.textAlign = 'left';
        ctx.fillText(truncLine(pt, contentMaxW - 12), mx + 12, cy);
        cy += bulletSize + 7;
      }

    // ── Body text ──────────────────────────────────────────────────────────────
    } else if (slide.body) {
      const maxLines = Math.floor((H - cy - my) / (bodySize + Math.round(bodySize * 0.28)));
      const bAlign = sStyle?.bodyAlign || 'left';
      drawWrapped(slide.body, getAlignmentX(bAlign), cy, contentMaxW, bodySize, finalBodyColor, false, Math.max(1, maxLines), bf, bAlign);

    } else if (slide.statement) {
      const bAlign = sStyle?.bodyAlign || 'left';
      drawWrapped(slide.statement, getAlignmentX(bAlign), cy, contentMaxW, bodySize, finalBodyColor, false, 5, bf, bAlign);

    } else if (slide.subtitle) {
      const bAlign = sStyle?.bodyAlign || 'left';
      drawWrapped(slide.subtitle, getAlignmentX(bAlign), cy, contentMaxW, bodySize, finalBodyColor, false, 3, bf, bAlign);
    }
  }

  // ── Progress bar ────────────────────────────────────────────────────────────
  ctx.fillStyle = theme.darkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  ctx.fillRect(0, H - 3, W, 3);
  if (progress > 0) {
    ctx.fillStyle = ac;
    ctx.fillRect(0, H - 3, W * Math.min(progress, 1), 3);
  }
}
