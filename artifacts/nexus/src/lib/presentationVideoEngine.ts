import type { SlideContent, ThemeConfig, SlideLayoutType, SlideImage, TableConfig } from '@/types/presentation';

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
interface TextAreaConfig {
  x: number;     // percentage (0..100)
  width: number; // percentage (0..100)
  hasPanel: boolean;
}

function getTextAreaConfig(layout: SlideLayoutType, images: SlideImage[], hasVisualData: boolean): TextAreaConfig {
  let areaX = 0;
  let areaW = 100;
  let hasPanel = hasVisualData;

  const PADDING = 4; // safety margin around images

  if (images && images.length > 0) {
    // Detect images on the right (x > 40%)
    const rightSideImages = images.filter(img => img.x > 40);
    if (rightSideImages.length > 0) {
      const minX = Math.min(...rightSideImages.map(img => img.x));
      areaW = Math.max(30, minX - PADDING);
      hasPanel = true;
    }

    // Detect images on the left (x + w < 60%)
    const leftSideImages = images.filter(img => (img.x + img.width) < 60);
    if (leftSideImages.length > 0) {
      const maxX = Math.max(...leftSideImages.map(img => img.x + img.width));
      if (maxX > areaX) {
        const shift = maxX + PADDING;
        const widthReduction = shift - areaX;
        areaX = shift;
        areaW = Math.max(30, areaW - widthReduction);
        hasPanel = true;
      }
    }
  }

  // Final bounds checks
  if (areaX < 0) areaX = 0;
  if (areaX > 70) areaX = 70; // cap at 70% to ensure some text space
  if (areaW < 30) areaW = 30;
  if (areaX + areaW > 100) areaW = 100 - areaX;

  return { x: areaX, width: areaW, hasPanel };
}

/** ── Visual Data Rendering Helpers ────────────────────────────────────────── */

function drawChart(
  ctx: CanvasRenderingContext2D,
  config: any, // ChartConfig
  theme: ThemeConfig,
  x: number, y: number, w: number, h: number,
  titleSize: number, labelSize: number
) {
  const ac = `#${theme.accentColor}`;
  const bc = `#${theme.bodyColor}`;
  const bf = `"${theme.bodyFont}", sans-serif`;
  const tf = `"${theme.titleFont}", sans-serif`;

  // Draw Title
  ctx.font = `bold ${titleSize}px ${tf}`;
  ctx.fillStyle = ac;
  ctx.textAlign = 'left';
  ctx.fillText(`${config.type.toUpperCase()} CHART: ${config.title || ''}`, x, y + titleSize);

  const chartY = y + titleSize + 15;
  const chartH = h - (titleSize + 25);

  if (config.type === 'bar' || config.type === 'line') {
    const dataset = config.datasets?.[0];
    if (!dataset || !config.labels?.length) return;

    const maxVal = Math.max(...dataset.values, 1);
    const colW = w / config.labels.length;
    const barW = colW * 0.7;

    config.labels.forEach((label: string, i: number) => {
      const val = dataset.values[i] || 0;
      const valH = (val / maxVal) * (chartH - labelSize - 10);
      const cx = x + i * colW + colW / 2;

      if (config.type === 'bar') {
        ctx.fillStyle = ac;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(cx - barW / 2, chartY + chartH - labelSize - 5 - valH, barW, valH);
        ctx.globalAlpha = 1.0;
      } else {
        // Line chart dot
        ctx.fillStyle = ac;
        ctx.beginPath();
        ctx.arc(cx, chartY + chartH - labelSize - 5 - valH, 4, 0, Math.PI * 2);
        ctx.fill();
        // Line to next
        if (i < config.labels.length - 1) {
          const nextVal = dataset.values[i + 1] || 0;
          const nextValH = (nextVal / maxVal) * (chartH - labelSize - 10);
          const nextCx = x + (i + 1) * colW + colW / 2;
          ctx.strokeStyle = ac;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, chartY + chartH - labelSize - 5 - valH);
          ctx.lineTo(nextCx, chartY + chartH - labelSize - 5 - nextValH);
          ctx.stroke();
        }
      }

      // Label
      ctx.font = `${labelSize}px ${bf}`;
      ctx.fillStyle = bc;
      ctx.textAlign = 'center';
      const truncatedLabel = label.length > 10 ? label.slice(0, 8) + '…' : label;
      ctx.fillText(truncatedLabel, cx, chartY + chartH);
    });
  } else if (config.type === 'pie' || config.type === 'donut') {
    const dataset = config.datasets?.[0];
    if (!dataset || !config.labels?.length) return;

    const total = dataset.values.reduce((a: number, b: number) => a + b, 0);
    const centerX = x + w / 2;
    const centerY = chartY + chartH / 2;
    const radius = Math.min(w, chartH) / 2.5;

    let startAngle = -Math.PI / 2;
    dataset.values.forEach((val: number, i: number) => {
      const sliceAngle = (val / total) * Math.PI * 2;
      ctx.fillStyle = ac;
      ctx.globalAlpha = 0.6 + (i % 5) * 0.1;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.fill();
      ctx.globalAlpha = 1.0;
      startAngle += sliceAngle;
    });

    if (config.type === 'donut') {
      ctx.fillStyle = `#${theme.bgColor}`;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawTable(
  ctx: CanvasRenderingContext2D,
  config: TableConfig,
  theme: ThemeConfig,
  x: number, y: number, w: number, h: number,
  fontSize: number,
  drawWrappedFn: any
) {
  const ac = `#${theme.accentColor}`;
  const bc = `#${theme.bodyColor}`;
  const bf = `"${theme.bodyFont}", sans-serif`;

  const headers = config.headers || [];
  const rows = config.rows || [];
  const colCount = headers.length || 1;
  
  // Proportional widths: last column usually has the findings/meat
  const widths = headers.map(() => 1 / colCount);
  if (colCount >= 3) {
    widths[0] = 0.2; widths[1] = 0.15; widths[2] = 0.65; // prioritize findings
  }

  const rowH = fontSize * 2.2;
  let currY = y;

  // Header
  ctx.fillStyle = ac;
  ctx.fillRect(x, currY, w, rowH);
  ctx.font = `bold ${fontSize}px ${bf}`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  let currX = x;
  headers.forEach((h: string, i: number) => {
    const colW = w * (widths[i] || (1 / colCount));
    ctx.fillText(h, currX + 8, currY + rowH / 2);
    currX += colW;
  });

  currY += rowH;
  ctx.textBaseline = 'top';

  // Rows
  const cellFontSize = Math.max(10, fontSize - 1);
  for (const row of rows.slice(0, 5)) {
    let maxRowHeight = rowH;
    currX = x;
    
    // First pass: measure all cells in row to find max height
    const rowY = currY;
    row.forEach((cell: string, ci: number) => {
      const colW = w * (widths[ci] || (1 / colCount));
      // Temporarily draw to a dummy value to get height
      const cellBottom = drawWrappedFn(cell, currX + 8, rowY + 6, colW - 16, cellFontSize, bc, false, 3, bf, 'left', true);
      maxRowHeight = Math.max(maxRowHeight, cellBottom - rowY + 12);
      currX += colW;
    });

    if (rowY + maxRowHeight > y + h) break;

    // Second pass: actually draw
    currX = x;
    row.forEach((cell: string, ci: number) => {
      const colW = w * (widths[ci] || (1 / colCount));
      drawWrappedFn(cell, currX + 8, rowY + 6, colW - 16, cellFontSize, bc, false, 3, bf, 'left');
      currX += colW;
    });

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, rowY + maxRowHeight); ctx.lineTo(x + w, rowY + maxRowHeight); ctx.stroke();
    
    currY += maxRowHeight;
  }
}

function drawTimeline(
  ctx: CanvasRenderingContext2D,
  config: any, // TimelineConfig
  theme: ThemeConfig,
  x: number, y: number, w: number, h: number,
  fontSize: number
) {
  const ac = `#${theme.accentColor}`;
  const bc = `#${theme.bodyColor}`;
  const bf = `"${theme.bodyFont}", sans-serif`;

  const items = config.items.slice(0, 6);
  const itemH = (h - 20) / items.length;

  ctx.strokeStyle = ac;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 10);
  ctx.lineTo(x + 10, y + h - 10);
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  items.forEach((item: any, i: number) => {
    const iy = y + 10 + i * itemH;
    ctx.fillStyle = ac;
    ctx.beginPath(); ctx.arc(x + 10, iy + 5, 5, 0, Math.PI * 2); ctx.fill();

    ctx.font = `bold ${fontSize}px ${bf}`;
    ctx.fillStyle = ac;
    ctx.textAlign = 'left';
    ctx.fillText(item.date, x + 25, iy + fontSize);

    ctx.font = `${fontSize}px ${bf}`;
    ctx.fillStyle = bc;
    ctx.fillText(item.title.length > 40 ? item.title.slice(0, 38) + '…' : item.title, x + 25, iy + fontSize * 2.2);
  });
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

  // ── Text readability panel ────────────────────────────────────────────────
  const hasVisualData = !!(slide.chartConfig || slide.tableConfig || slide.timelineConfig || slide.kpiConfig);
  const textCfg = getTextAreaConfig(slide.layout, slide.images || [], hasVisualData);
  const panelX = (textCfg.x / 100) * W;
  const panelW = (textCfg.width / 100) * W;

  if (textCfg.hasPanel) {
    const panelAlpha = theme.darkTheme ? 0.72 : 0.75; // Increased opacity for better legibility
    ctx.save();
    ctx.globalAlpha = panelAlpha;
    ctx.fillStyle = bg;
    ctx.fillRect(panelX, 0, panelW, H);
    ctx.restore();

    // Accent stripe still visible on top
    if (theme.shapeAccent) {
      ctx.fillStyle = ac;
      ctx.fillRect(0, 0, W, 3);
    }
  }

  // Scale font sizes proportionally to the canvas width.
  // We use a baseline of 1280 (720p) for scaling calculations.
  const scale = W / 1280;

  const titleSize = Math.round(
    Math.max(16, (
      slide.layout === 'cover'            ? theme.coverTitleSize
      : slide.layout === 'section-divider' ? theme.sectionTitleSize
      : theme.titleFontSize
    ) * scale * 1.55), // Increased scale for more impact at 720p
  );
  const bodySize  = Math.round(Math.max(12, theme.bodyFontSize   * scale * 1.4));
  const bulletSize = Math.round(Math.max(11, theme.bulletFontSize * scale * 1.4));

  const tf = `"${theme.titleFont}", sans-serif`;
  const bf = `"${theme.bodyFont}", sans-serif`;

  const mx = Math.round(W * 0.05);   // horizontal margin inside panel
  const my = Math.round(H * 0.08);    // vertical margin

  // Text Styling from slide object
  const sStyle = slide.textStyle;
  const contentMaxW = panelW - mx * 2;
  
  // Custom colors if defined
  const finalTitleColor = sStyle?.titleColor ? `#${sStyle.titleColor}` : tc;
  const finalBodyColor = sStyle?.bodyColor ? `#${sStyle.bodyColor}` : bc;

  function getAlignmentX(align: string | undefined): number {
    const base = panelX + mx;
    if (align === 'center') return panelX + panelW / 2;
    if (align === 'right') return panelX + panelW - mx;
    return base;
  }

  /** Measure and truncate a line to fit maxW pixels. */
  function truncLine(text: string, maxW: number): string {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  }

  /**
   * Draw word-wrapped text. Returns the y position of the NEXT available line.
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
    measureOnly = false
  ): number {
    if (!text) return y;
    
    // Recursive shrink-to-fit for titles if they are being truncated
    let currentSize = size;
    let attempts = 0;
    
    const internalDraw = (fs: number) => {
      ctx.save();
      ctx.font = `${bold ? 'bold ' : ''}${fs}px ${fontStack}`;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.textBaseline = 'top';

      const lineH = fs + Math.round(fs * 0.3);
      const words = text.trim().split(/\s+/).filter(Boolean);
      let line = '';
      let currY = y;
      let drawn = 0;
      let truncated = false;

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const test = line ? `${line} ${word}` : word;
        const metrics = ctx.measureText(test);

        if (line && metrics.width > maxW) {
          if (drawn >= maxLines - 1) {
            if (!measureOnly) ctx.fillText(truncLine(line + ' ' + (words.slice(i).join(' ')), maxW), x, currY);
            truncated = true;
            drawn++;
            break;
          }
          if (!measureOnly) ctx.fillText(line, x, currY);
          currY += lineH;
          line = word;
          drawn++;
        } else {
          line = test;
        }
      }

      if (line && drawn < maxLines) {
        if (!measureOnly) ctx.fillText(truncLine(line, maxW), x, currY);
        currY += lineH;
      }

      ctx.restore();
      return { currY, truncated };
    };

    let result = internalDraw(currentSize);
    
    // If it's a title and it truncated, try shrinking font up to 3 times
    if (result.truncated && maxLines <= 4 && attempts < 3 && !measureOnly) {
      while (result.truncated && attempts < 3) {
        currentSize = Math.round(currentSize * 0.85);
        attempts++;
        result = internalDraw(currentSize);
      }
    }

    return result.currY;
  }

  // ── Layout-specific rendering ───────────────────────────────────────────────

  if (slide.layout === 'cover') {
    // Vertically centred large title + optional subtitle
    const maxW = contentMaxW;
    ctx.font = `bold ${titleSize}px ${tf}`;
    // Estimate approx line count to vertically centre the block
    const testText = slide.title || '';
    const approxLines = Math.max(1, Math.ceil(ctx.measureText(testText).width / maxW));
    const blockH = approxLines * (titleSize + 4) + (slide.subtitle ? bodySize + 22 : 0) + 8;
    const startY = Math.max(my + titleSize, (H - blockH) / 2 + titleSize);

    const titleX = getAlignmentX(sStyle?.titleAlign);
    const titleBottom = drawWrapped(
      slide.title || '', titleX, startY, maxW, titleSize, finalTitleColor, true, 3, tf, sStyle?.titleAlign || 'center',
    );

    // accent underline
    ctx.fillStyle = ac;
    const lineX = sStyle?.titleAlign === 'center' ? W / 2 - 36 : titleX;
    ctx.fillRect(lineX, titleBottom + 9, 72, 2);

    if (slide.subtitle) {
      const subX = getAlignmentX(sStyle?.bodyAlign);
      drawWrapped(
        slide.subtitle, subX, titleBottom + 22, maxW, bodySize, finalBodyColor, false, 2, bf, sStyle?.bodyAlign || 'center',
      );
    }

  } else if (slide.layout === 'section-divider' || slide.layout === 'big-statement') {
    const text = slide.statement || slide.title || '';
    const maxW = contentMaxW;
    ctx.font = `bold ${titleSize}px ${tf}`;
    const approxLines = Math.max(1, Math.ceil(ctx.measureText(text).width / maxW));
    const blockH = approxLines * (titleSize + 6);
    const startY = Math.max(my + titleSize, (H - blockH) / 2 + titleSize);

    const textX = getAlignmentX(sStyle?.titleAlign);
    drawWrapped(text, textX, startY, maxW, titleSize, finalTitleColor, true, 4, tf, sStyle?.titleAlign || 'center');

    if (slide.subtitle) {
      const subX = getAlignmentX(sStyle?.bodyAlign);
      drawWrapped(slide.subtitle, subX, startY + (titleSize + 6) * approxLines + 10, maxW, bodySize, finalBodyColor, false, 2, bf, sStyle?.bodyAlign || 'center');
    }

  } else {
    // ── Standard slide: title bar at top, content area below ─────────────────
    const alignX = getAlignmentX(sStyle?.titleAlign);
    const titleY = my;
    const titleBottom = drawWrapped(
      slide.title || '', alignX, titleY, contentMaxW, titleSize, finalTitleColor, true, 3, tf, sStyle?.titleAlign || 'left'
    );

    // Accent separator
    ctx.fillStyle = sStyle?.accentColor ? `#${sStyle.accentColor}` : ac;
    ctx.fillRect(alignX, titleBottom + 6, Math.min(44, W * 0.09), 2);

    let cy = titleBottom + 20;
    // CRITICAL: Cap content height if visual data is present to prevent overlapping
    const maxContentY = hasVisualData ? H * 0.55 : H - my;

    // ── Two-column / Comparison / Problem-Solution ──────────────────────────
    if ((slide.layout === 'two-column' || slide.layout === 'comparison' || slide.layout === 'problem-solution') && 
        (slide.leftColumn?.length || slide.rightColumn?.length)) {
      const colW = (contentMaxW - 40) / 2;
      let ly = cy, ry = cy;

      // Labels (Headers)
      if (slide.leftLabel || slide.rightLabel) {
        ctx.font = `bold ${bulletSize + 2}px ${bf}`;
        ctx.textAlign = 'left';
        
        if (slide.leftLabel) {
          ctx.fillStyle = slide.layout === 'problem-solution' ? '#ef4444' : ac;
          ctx.fillText(truncLine(slide.leftLabel, colW), mx, ly);
        }
        if (slide.rightLabel) {
          ctx.fillStyle = slide.layout === 'problem-solution' ? '#22c55e' : ac;
          ctx.textAlign = 'left';
          ctx.fillText(truncLine(slide.rightLabel, colW), mx + colW + 40, ry);
        }
        ly += bulletSize + 12;
        ry += bulletSize + 12;
      }

      // Arrow for Problem-Solution
      if (slide.layout === 'problem-solution') {
        const arrowX = mx + colW + 20;
        const arrowY = cy + (H * 0.15);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(arrowX - 8, arrowY);
        ctx.lineTo(arrowX + 8, arrowY);
        ctx.lineTo(arrowX + 2, arrowY - 6);
        ctx.moveTo(arrowX + 8, arrowY);
        ctx.lineTo(arrowX + 2, arrowY + 6);
        ctx.stroke();
      }

      // Left Column
      for (const item of (slide.leftColumn || []).slice(0, 6)) {
        if (ly + bulletSize > maxContentY) break;
        ctx.fillStyle = slide.layout === 'problem-solution' ? '#ef4444' : ac;
        ctx.beginPath(); ctx.arc(mx + 6, ly + bulletSize / 2, 2.5, 0, Math.PI * 2); ctx.fill();
        ly = drawWrapped(item, mx + 16, ly, colW - 16, bulletSize, bc, false, 2, bf, 'left');
        ly += 4;
      }

      // Right Column
      const rx = mx + colW + 40;
      for (const item of (slide.rightColumn || []).slice(0, 6)) {
        if (ry + bulletSize > maxContentY) break;
        ctx.fillStyle = slide.layout === 'problem-solution' ? '#22c55e' : ac;
        ctx.beginPath(); ctx.arc(rx + 6, ry + bulletSize / 2, 2.5, 0, Math.PI * 2); ctx.fill();
        ry = drawWrapped(item, rx + 16, ry, colW - 16, bulletSize, bc, false, 2, bf, 'left');
        ry += 4;
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
        if (ky + kh * 0.85 > H - my) return;
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
        drawWrapped(kpi.label, kx + 6, ky + valSize + 10, kw - 12, bulletSize, bc, false, 2, bf, 'left');
        if (kpi.change) {
          const isPositive = kpi.change.startsWith('+') || /up/i.test(kpi.change);
          ctx.fillStyle = isPositive ? '#22c55e' : '#ef4444';
          ctx.font = `${Math.round(bulletSize * 0.85)}px ${bf}`;
          ctx.fillText(kpi.change, kx + 6, ky + valSize + bulletSize * 2 + 12);
        }
      });

    // ── Bullets / title-bullets / recommendations / process ───────────────────
    } else if (slide.bullets?.length) {
      const isProcess = slide.layout === 'process';
      const isRecs = slide.layout === 'recommendations';
      
      for (const [idx, bullet] of slide.bullets.slice(0, 7).entries()) {
        if (cy + bulletSize > maxContentY) break;
        
        if (isProcess) {
          // Circle with number for process
          const br = Math.round(bulletSize * 0.7);
          ctx.beginPath(); 
          ctx.fillStyle = ac;
          ctx.arc(mx + br, cy + bulletSize/2, br, 0, Math.PI * 2); 
          ctx.fill();
          
          ctx.fillStyle = theme.darkTheme ? '#000' : '#fff';
          ctx.font = `bold ${Math.round(bulletSize * 0.8)}px ${tf}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(idx + 1), mx + br, cy + bulletSize/2);
          
          cy = drawWrapped(bullet, mx + br*2 + 10, cy, contentMaxW - br*2 - 10, bulletSize, bc, false, 3, bf, 'left');
        } else if (isRecs) {
          // Star for recommendations
          ctx.fillStyle = ac;
          ctx.font = `${bulletSize}px ${bf}`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText('★', mx, cy);
          
          cy = drawWrapped(bullet, mx + 20, cy, contentMaxW - 20, bulletSize, bc, true, 3, bf, 'left');
        } else {
          // Normal bullet
          ctx.fillStyle = ac;
          ctx.beginPath(); 
          ctx.arc(mx + 6, cy + bulletSize/2, 3, 0, Math.PI * 2); 
          ctx.fill();
          
          cy = drawWrapped(bullet, mx + 20, cy, contentMaxW - 20, bulletSize, bc, false, 3, bf, 'left');
        }
        cy += 4; // gap between items
      }

    // ── Agenda items ───────────────────────────────────────────────────────────
    } else if (slide.agendaItems?.length) {
      for (const [idx, item] of slide.agendaItems.slice(0, 7).entries()) {
        if (cy + bulletSize > maxContentY) break;
        // number badge
        const badgeR = Math.round(bulletSize * 0.65);
        ctx.beginPath(); 
        ctx.fillStyle = ac;
        ctx.arc(mx + badgeR, cy + bulletSize / 2, badgeR, 0, Math.PI * 2); 
        ctx.fill();
        
        ctx.fillStyle = theme.darkTheme ? '#000' : '#fff';
        ctx.font = `bold ${Math.round(bulletSize * 0.7)}px ${tf}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(idx + 1), mx + badgeR, cy + bulletSize / 2);
        
        cy = drawWrapped(item, mx + badgeR * 2 + 10, cy, contentMaxW - badgeR * 2 - 10, bulletSize, bc, false, 2, bf, 'left');
        cy += 4;
      }

    // ── Summary points ─────────────────────────────────────────────────────────
    } else if (slide.summaryPoints?.length) {
      for (const pt of slide.summaryPoints.slice(0, 7)) {
        if (cy + bulletSize > maxContentY) break;
        ctx.fillStyle = ac;
        ctx.beginPath(); ctx.arc(mx + 6, cy + bulletSize / 2, 2.5, 0, Math.PI * 2); ctx.fill();
        cy = drawWrapped(pt, mx + 20, cy, contentMaxW - 20, bulletSize, bc, false, 2, bf, 'left');
        cy += 4;
      }

    // ── Body text ──────────────────────────────────────────────────────────────
    } else if (slide.body) {
      const maxLines = Math.floor((maxContentY - cy) / (bodySize + Math.round(bodySize * 0.28)));
      const bAlign = sStyle?.bodyAlign || 'left';
      if (maxLines > 0) {
        drawWrapped(slide.body, getAlignmentX(bAlign), cy, contentMaxW, bodySize, finalBodyColor, false, maxLines, bf, bAlign);
      }

    } else if (slide.statement) {
      const bAlign = sStyle?.bodyAlign || 'left';
      drawWrapped(slide.statement, getAlignmentX(bAlign), cy, contentMaxW, bodySize, finalBodyColor, false, 5, bf, bAlign);

    } else if (slide.subtitle) {
      const bAlign = sStyle?.bodyAlign || 'left';
      drawWrapped(slide.subtitle, getAlignmentX(bAlign), cy, contentMaxW, bodySize, finalBodyColor, false, 3, bf, bAlign);
    }

    // ── Visual Data Area (Charts / Tables / Timelines) ──
    if (hasVisualData) {
      const vY = H * 0.5; // Start visual data higher to give more room (50%)
      const vH = H * 0.45; // Take up 45% of height
      
      if (slide.chartConfig) {
        drawChart(ctx, slide.chartConfig, theme, mx, vY, contentMaxW, vH, bulletSize + 2, bulletSize - 2);
      } else if (slide.tableConfig) {
        drawTable(ctx, slide.tableConfig, theme, mx, vY, contentMaxW, vH, bulletSize + 2, drawWrapped);
      } else if (slide.timelineConfig) {
        drawTimeline(ctx, slide.timelineConfig, theme, mx, vY, contentMaxW, vH, bulletSize - 1);
      }
    }
  }

  // ── Images Rendering (Moved to last to be on top, matching viewer UI) ──
  for (const imgMeta of slide.images ?? []) {
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

  // ── Progress bar ────────────────────────────────────────────────────────────
  ctx.fillStyle = theme.darkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  ctx.fillRect(0, H - 3, W, 3);
  if (progress > 0) {
    ctx.fillStyle = ac;
    ctx.fillRect(0, H - 3, W * Math.min(progress, 1), 3);
  }
}
