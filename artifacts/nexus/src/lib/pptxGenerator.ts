import PptxGenJS from 'pptxgenjs';
import type { SlideContent, ThemeConfig, ChartConfig, TableConfig, TimelineConfig, KpiConfig, VisualBlock, TextStyle } from '@/types/presentation';
import { getTheme } from '@/lib/presentationThemes';

interface ResolvedTextStyle {
  titleFontSize: number;
  titleColor: string;
  titleBold: boolean;
  titleItalic: boolean;
  titleAlign: 'left' | 'center' | 'right';
  titleFontFamily: string;
  bodyFontSize: number;
  bodyColor: string;
  bodyBold: boolean;
  bodyItalic: boolean;
  bodyAlign: 'left' | 'center' | 'right';
  bodyFontFamily: string;
  bulletFontSize: number;
  bulletColor: string;
  accentColor: string;
}

function resolveTextStyle(theme: ThemeConfig, textStyle?: TextStyle): ResolvedTextStyle {
  const ts = textStyle || {};
  return {
    titleFontSize: ts.titleFontSize || theme.titleFontSize,
    titleColor: stripHash(ts.titleColor || theme.titleColor),
    titleBold: (ts.titleBold || 'bold') === 'bold',
    titleItalic: (ts.titleItalic || 'normal') === 'italic',
    titleAlign: ts.titleAlign || 'left',
    titleFontFamily: ts.titleFontFamily || theme.titleFont,
    bodyFontSize: ts.bodyFontSize || theme.bodyFontSize,
    bodyColor: stripHash(ts.bodyColor || theme.bodyColor),
    bodyBold: (ts.bodyBold || 'normal') === 'bold',
    bodyItalic: (ts.bodyItalic || 'normal') === 'italic',
    bodyAlign: ts.bodyAlign || 'left',
    bodyFontFamily: ts.bodyFontFamily || theme.bodyFont,
    bulletFontSize: ts.bulletFontSize || theme.bulletFontSize,
    bulletColor: stripHash(ts.bulletColor || ts.bodyColor || theme.bodyColor),
    accentColor: stripHash(ts.accentColor || theme.accentColor),
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - amount;
  return [
    Math.round(r * f).toString(16).padStart(2, '0'),
    Math.round(g * f).toString(16).padStart(2, '0'),
    Math.round(b * f).toString(16).padStart(2, '0'),
  ].join('').toUpperCase();
}

function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return [
    Math.round(r + (255 - r) * amount).toString(16).padStart(2, '0'),
    Math.round(g + (255 - g) * amount).toString(16).padStart(2, '0'),
    Math.round(b + (255 - b) * amount).toString(16).padStart(2, '0'),
  ].join('').toUpperCase();
}

function stripHash(color: string): string {
  return color.replace('#', '');
}

function addShapeAccent(slide: PptxGenJS.Slide, theme: ThemeConfig) {
  if (!theme.shapeAccent) return;
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: 0.08,
    h: '100%',
    fill: { color: theme.accentColor },
  });
}

function addSlideImages(slide: PptxGenJS.Slide, content: SlideContent) {
  const images = content.images || [];
  for (const img of images) {
    if (!img.dataUrl) continue;

    try {
      const imageOpts: any = {
        data: img.dataUrl,
        x: `${img.x}%`,
        y: `${img.y}%`,
        w: `${img.width}%`,
        h: `${img.height}%`,
        transparency: 100 - img.opacity,
      };

      if (img.borderRadius > 0) {
        imageOpts.rounding = true;
      }

      if (img.fit && img.fit !== 'fill') {
        imageOpts.sizing = {
          type: img.fit === 'contain' ? 'contain' : 'cover',
          w: `${img.width}%`,
          h: `${img.height}%`,
        };
      }

      slide.addImage(imageOpts);
    } catch (err) {
      console.warn('Could not add image to slide:', err);
    }
  }
}

function addSpeakerNotes(slide: PptxGenJS.Slide, content: SlideContent) {
  if (content.speakerNotes) {
    slide.addNotes(content.speakerNotes);
  }
}

function renderVisualBlock(slide: PptxGenJS.Slide, visualBlock: VisualBlock, theme: ThemeConfig) {
  if (!visualBlock) return;

  const colors = visualBlock.colors.map(c => stripHash(c));
  const x = 6.8;
  const y = 1.2;
  const w = 5.5;
  const h = 4.5;

  switch (visualBlock.type) {
    case 'gradient': {
      slide.addShape('rect', {
        x,
        y,
        w,
        h,
        fill: { color: colors[0] || theme.accentColor },
        rectRadius: 0.15,
      });
      if (colors.length > 1) {
        slide.addShape('rect', {
          x: x + 0.3,
          y: y + 0.3,
          w: w - 0.6,
          h: h - 0.6,
          fill: { color: colors[1] },
          rectRadius: 0.1,
        });
      }

      break;
    }
    case 'shape': {
      slide.addShape('ellipse', {
        x: x + 0.5,
        y: y + 0.5,
        w: 2,
        h: 2,
        fill: { color: colors[0] || theme.accentColor },
      });
      slide.addShape('rect', {
        x: x + 3,
        y: y + 1,
        w: 2,
        h: 2,
        fill: { color: colors[1] || lighten(theme.accentColor, 0.3) },
        rectRadius: 0.15,
      });
      if (colors.length > 2) {
        slide.addShape('rect', {
          x: x + 1.5,
          y: y + 2.8,
          w: 2.5,
          h: 1.2,
          fill: { color: colors[2] },
          rectRadius: 0.3,
        });
      }
      break;
    }
    case 'icon-card': {
      const cardW = 2.4;
      const cardH = 2;
      const gap = 0.3;
      for (let i = 0; i < Math.min(colors.length, 4); i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        slide.addShape('rect', {
          x: x + col * (cardW + gap),
          y: y + row * (cardH + gap),
          w: cardW,
          h: cardH,
          fill: { color: colors[i] },
          rectRadius: 0.1,
        });
      }
      break;
    }
  }
}

function renderCover(pptx: PptxGenJS, slide: PptxGenJS.Slide, content: SlideContent, theme: ThemeConfig) {
  const s = resolveTextStyle(theme, content.textStyle);
  if (theme.gradientCover) {
    slide.background = { fill: darken(theme.bgColor, 0.15) };
  }

  if (theme.shapeAccent) {
    slide.addShape('rect', {
      x: 0,
      y: '75%',
      w: '100%',
      h: '25%',
      fill: { color: s.accentColor },
      rectRadius: 0,
    });
  }

  slide.addText(content.title, {
    x: theme.marginX,
    y: 1.5,
    w: 5.5,
    h: 2,
    fontSize: content.textStyle?.titleFontSize || theme.coverTitleSize,
    fontFace: s.titleFontFamily,
    color: s.titleColor,
    bold: s.titleBold,
    italic: s.titleItalic,
    align: s.titleAlign,
    valign: 'middle',
    wrap: true,
  });

  if (content.subtitle) {
    slide.addText(content.subtitle, {
      x: theme.marginX,
      y: 3.6,
      w: 5.5,
      h: 0.8,
      fontSize: s.bodyFontSize + 2,
      fontFace: s.bodyFontFamily,
      color: s.bodyColor,
      bold: s.bodyBold,
      italic: s.bodyItalic,
      align: s.bodyAlign,
      valign: 'top',
    });
  }

  if (content.visualBlock) {
    renderVisualBlock(slide, content.visualBlock, theme);
  }

  addSlideImages(slide, content);
}

function renderAgenda(slide: PptxGenJS.Slide, content: SlideContent, theme: ThemeConfig) {
  const s = resolveTextStyle(theme, content.textStyle);
  addShapeAccent(slide, theme);

  slide.addText(content.title, {
    x: theme.marginX + 0.2,
    y: theme.marginY,
    w: 9,
    h: 0.8,
    fontSize: s.titleFontSize,
    fontFace: s.titleFontFamily,
    color: s.titleColor,
    bold: s.titleBold,
    italic: s.titleItalic,
  });

  const items = content.agendaItems || [];
  items.forEach((item, i) => {
    const y = 1.6 + i * 0.55;
    slide.addText(`${String(i + 1).padStart(2, '0')}`, {
      x: theme.marginX + 0.3,
      y,
      w: 0.5,
      h: 0.45,
      fontSize: s.bodyFontSize + 2,
      fontFace: s.titleFontFamily,
      color: s.accentColor,
      bold: true,
      valign: 'middle',
    });
    slide.addText(item, {
      x: theme.marginX + 1,
      y,
      w: 8,
      h: 0.45,
      fontSize: s.bodyFontSize,
      fontFace: s.bodyFontFamily,
      color: s.bodyColor,
      bold: s.bodyBold,
      italic: s.bodyItalic,
      valign: 'middle',
    });
  });

  addSlideImages(slide, content);
}

function renderSectionDivider(slide: PptxGenJS.Slide, content: SlideContent, theme: ThemeConfig) {
  const s = resolveTextStyle(theme, content.textStyle);
  slide.background = { fill: s.accentColor };

  slide.addText(content.title, {
    x: theme.marginX,
    y: 2,
    w: 7,
    h: 1.5,
    fontSize: content.textStyle?.titleFontSize || theme.sectionTitleSize,
    fontFace: s.titleFontFamily,
    color: s.titleColor || 'FFFFFF',
    bold: s.titleBold,
    italic: s.titleItalic,
    align: s.titleAlign,
    valign: 'middle',
  });

  if (content.subtitle) {
    slide.addText(content.subtitle, {
      x: theme.marginX,
      y: 3.6,
      w: 7,
      h: 0.6,
      fontSize: s.bodyFontSize,
      fontFace: s.bodyFontFamily,
      color: s.bodyColor || 'FFFFFFCC',
      bold: s.bodyBold,
      italic: s.bodyItalic,
      align: s.bodyAlign,
    });
  }

  addSlideImages(slide, content);
}

function renderTitleBullets(slide: PptxGenJS.Slide, content: SlideContent, theme: ThemeConfig) {
  const s = resolveTextStyle(theme, content.textStyle);
  addShapeAccent(slide, theme);

  const hasImages = (content.images || []).some(img => img.dataUrl);
  const hasVisualBlock = !!content.visualBlock;
  const textW = (hasImages || hasVisualBlock) ? 5.8 : 9;

  slide.addText(content.title, {
    x: theme.marginX + 0.2,
    y: theme.marginY,
    w: textW,
    h: 0.8,
    fontSize: s.titleFontSize,
    fontFace: s.titleFontFamily,
    color: s.titleColor,
    bold: s.titleBold,
    italic: s.titleItalic,
  });

  if (content.body) {
    slide.addText(content.body, {
      x: theme.marginX + 0.2,
      y: 1.5,
      w: textW,
      h: 3.5,
      fontSize: s.bodyFontSize,
      fontFace: s.bodyFontFamily,
      color: s.bodyColor,
      bold: s.bodyBold,
      italic: s.bodyItalic,
      valign: 'top',
      wrap: true,
      lineSpacingMultiple: 1.3,
    });
  }

  const bullets = content.bullets || [];
  if (bullets.length > 0) {
    const textRows = bullets.map(b => ({
      text: b,
      options: {
        fontSize: s.bulletFontSize,
        fontFace: s.bodyFontFamily,
        color: s.bulletColor,
        bold: s.bodyBold,
        italic: s.bodyItalic,
        bullet: { type: 'bullet' as const, code: '2022' },
        paraSpaceAfter: 8,
        lineSpacingMultiple: 1.2,
      },
    }));

    slide.addText(textRows, {
      x: theme.marginX + 0.3,
      y: content.body ? 3.2 : 1.6,
      w: textW - 0.2,
      h: content.body ? 2 : 3.6,
      valign: 'top',
      wrap: true,
    });
  }

  if (content.visualBlock) {
    renderVisualBlock(slide, content.visualBlock, theme);
  }

  addSlideImages(slide, content);
}

function renderImageText(slide: PptxGenJS.Slide, content: SlideContent, theme: ThemeConfig) {
  const s = resolveTextStyle(theme, content.textStyle);
  addShapeAccent(slide, theme);

  slide.addText(content.title, {
    x: theme.marginX + 0.2,
    y: theme.marginY,
    w: 5.5,
    h: 0.8,
    fontSize: s.titleFontSize,
    fontFace: s.titleFontFamily,
    color: s.titleColor,
    bold: s.titleBold,
    italic: s.titleItalic,
  });

  const bullets = content.bullets || [];
  if (bullets.length > 0) {
    const textRows = bullets.map(b => ({
      text: b,
      options: {
        fontSize: s.bulletFontSize,
        fontFace: s.bodyFontFamily,
        color: s.bulletColor,
        bold: s.bodyBold,
        italic: s.bodyItalic,
        bullet: { type: 'bullet' as const, code: '2022' },
        paraSpaceAfter: 8,
        lineSpacingMultiple: 1.2,
      },
    }));

    slide.addText(textRows, {
      x: theme.marginX + 0.3,
      y: 1.6,
      w: 5.2,
      h: 3.6,
      valign: 'top',
      wrap: true,
    });
  } else if (content.body) {
    slide.addText(content.body, {
      x: theme.marginX + 0.2,
      y: 1.5,
      w: 5.5,
      h: 3.5,
      fontSize: s.bodyFontSize,
      fontFace: s.bodyFontFamily,
      color: s.bodyColor,
      bold: s.bodyBold,
      italic: s.bodyItalic,
      valign: 'top',
      wrap: true,
      lineSpacingMultiple: 1.3,
    });
  }

  if (content.visualBlock) {
    renderVisualBlock(slide, content.visualBlock, theme);
  }

  addSlideImages(slide, content);
}

function renderTwoColumn(slide: PptxGenJS.Slide, content: SlideContent, theme: ThemeConfig) {
  const s = resolveTextStyle(theme, content.textStyle);
  addShapeAccent(slide, theme);

  slide.addText(content.title, {
    x: theme.marginX + 0.2,
    y: theme.marginY,
    w: 9,
    h: 0.8,
    fontSize: s.titleFontSize,
    fontFace: s.titleFontFamily,
    color: s.titleColor,
    bold: s.titleBold,
    italic: s.titleItalic,
  });

  const colWidth = 4.1;
  const startY = 1.6;

  if (content.leftLabel) {
    slide.addText(content.leftLabel, {
      x: theme.marginX + 0.3,
      y: startY,
      w: colWidth,
      h: 0.4,
      fontSize: s.bodyFontSize,
      fontFace: s.titleFontFamily,
      color: s.accentColor,
      bold: true,
    });
  }

  if (content.rightLabel) {
    slide.addText(content.rightLabel, {
      x: theme.marginX + 0.3 + colWidth + 0.4,
      y: startY,
      w: colWidth,
      h: 0.4,
      fontSize: s.bodyFontSize,
      fontFace: s.titleFontFamily,
      color: s.accentColor,
      bold: true,
    });
  }

  const bulletY = startY + 0.5;
  const left = content.leftColumn || [];
  const right = content.rightColumn || [];

  if (left.length > 0) {
    slide.addText(
      left.map(b => ({
        text: b,
        options: {
          fontSize: s.bulletFontSize,
          fontFace: s.bodyFontFamily,
          color: s.bulletColor,
          bold: s.bodyBold,
          italic: s.bodyItalic,
          bullet: { type: 'bullet' as const, code: '2022' },
          paraSpaceAfter: 6,
          lineSpacingMultiple: 1.2,
        },
      })),
      { x: theme.marginX + 0.3, y: bulletY, w: colWidth, h: 3.2, valign: 'top', wrap: true }
    );
  }

  if (right.length > 0) {
    slide.addText(
      right.map(b => ({
        text: b,
        options: {
          fontSize: s.bulletFontSize,
          fontFace: s.bodyFontFamily,
          color: s.bulletColor,
          bold: s.bodyBold,
          italic: s.bodyItalic,
          bullet: { type: 'bullet' as const, code: '2022' },
          paraSpaceAfter: 6,
          lineSpacingMultiple: 1.2,
        },
      })),
      { x: theme.marginX + 0.3 + colWidth + 0.4, y: bulletY, w: colWidth, h: 3.2, valign: 'top', wrap: true }
    );
  }

  slide.addShape('line', {
    x: theme.marginX + colWidth + 0.45,
    y: startY,
    w: 0,
    h: 3.5,
    line: { color: theme.darkTheme ? '444444' : 'DDDDDD', width: 1 },
  });

  addSlideImages(slide, content);
}

function renderBigStatement(slide: PptxGenJS.Slide, content: SlideContent, theme: ThemeConfig) {
  const s = resolveTextStyle(theme, content.textStyle);
  if (theme.shapeAccent) {
    slide.addShape('rect', {
      x: 0,
      y: 0,
      w: '100%',
      h: '100%',
      fill: { color: darken(theme.bgColor, 0.05) },
    });
  }

  addSlideImages(slide, content);

  const stText = content.statement || content.title;
  slide.addText(stText, {
    x: 1.2,
    y: 1.5,
    w: 7.6,
    h: 3,
    fontSize: content.textStyle?.titleFontSize || (stText.length > 100 ? 20 : 26),
    fontFace: s.titleFontFamily,
    color: s.titleColor,
    bold: s.titleBold,
    italic: s.titleItalic,
    align: s.titleAlign || 'center',
    valign: 'middle',
    wrap: true,
    lineSpacingMultiple: 1.4,
  });

  slide.addShape('rect', {
    x: 4.2,
    y: 4.6,
    w: 1.6,
    h: 0.05,
    fill: { color: s.accentColor },
  });
}

function renderComparison(slide: PptxGenJS.Slide, content: SlideContent, theme: ThemeConfig) {
  renderTwoColumn(slide, content, theme);
}

function renderSummary(slide: PptxGenJS.Slide, content: SlideContent, theme: ThemeConfig) {
  const s = resolveTextStyle(theme, content.textStyle);
  addShapeAccent(slide, theme);

  slide.addText(content.title, {
    x: theme.marginX + 0.2,
    y: theme.marginY,
    w: 9,
    h: 0.8,
    fontSize: s.titleFontSize,
    fontFace: s.titleFontFamily,
    color: s.titleColor,
    bold: s.titleBold,
    italic: s.titleItalic,
  });

  const points = content.summaryPoints || [];
  points.forEach((point, i) => {
    const y = 1.6 + i * 0.6;
    slide.addShape('ellipse', {
      x: theme.marginX + 0.4,
      y: y + 0.1,
      w: 0.25,
      h: 0.25,
      fill: { color: s.accentColor },
    });
    slide.addText(String(i + 1), {
      x: theme.marginX + 0.4,
      y: y + 0.1,
      w: 0.25,
      h: 0.25,
      fontSize: 9,
      fontFace: s.titleFontFamily,
      color: 'FFFFFF',
      align: 'center',
      valign: 'middle',
      bold: true,
    });
    slide.addText(point, {
      x: theme.marginX + 0.85,
      y,
      w: 8,
      h: 0.5,
      fontSize: s.bodyFontSize,
      fontFace: s.bodyFontFamily,
      color: s.bodyColor,
      bold: s.bodyBold,
      italic: s.bodyItalic,
      valign: 'middle',
    });
  });

  addSlideImages(slide, content);
}

function renderClosing(slide: PptxGenJS.Slide, content: SlideContent, theme: ThemeConfig) {
  const s = resolveTextStyle(theme, content.textStyle);
  slide.background = { fill: s.accentColor };

  addSlideImages(slide, content);

  slide.addText(content.title, {
    x: 1,
    y: 1.8,
    w: 8,
    h: 1.5,
    fontSize: content.textStyle?.titleFontSize || theme.coverTitleSize,
    fontFace: s.titleFontFamily,
    color: s.titleColor || 'FFFFFF',
    bold: s.titleBold,
    italic: s.titleItalic,
    align: s.titleAlign || 'center',
    valign: 'middle',
  });

  if (content.subtitle) {
    slide.addText(content.subtitle, {
      x: 1,
      y: 3.5,
      w: 8,
      h: 0.8,
      fontSize: s.bodyFontSize + 2,
      fontFace: s.bodyFontFamily,
      color: s.bodyColor || 'FFFFFFCC',
      bold: s.bodyBold,
      italic: s.bodyItalic,
      align: s.bodyAlign || 'center',
    });
  }
}

function renderChart(slide: PptxGenJS.Slide, content: SlideContent, theme: ThemeConfig) {
  const s = resolveTextStyle(theme, content.textStyle);
  addShapeAccent(slide, theme);

  slide.addText(content.title, {
    x: theme.marginX + 0.2,
    y: theme.marginY,
    w: 9,
    h: 0.8,
    fontSize: s.titleFontSize,
    fontFace: s.titleFontFamily,
    color: s.titleColor,
    bold: s.titleBold,
    italic: s.titleItalic,
  });

  const cfg = content.chartConfig;
  if (!cfg) {
    renderTitleBullets(slide, content, theme);
    return;
  }

  if (cfg.title) {
    slide.addText(cfg.title, {
      x: theme.marginX + 0.3,
      y: 1.3,
      w: 9,
      h: 0.4,
      fontSize: s.bodyFontSize,
      fontFace: s.bodyFontFamily,
      color: s.bodyColor,
    });
  }

  const chartColors = [
    stripHash(theme.accentColor),
    stripHash(theme.accentColorAlt),
    darken(theme.accentColor, 0.2),
    lighten(theme.accentColor, 0.3),
    darken(theme.accentColorAlt, 0.2),
    lighten(theme.accentColorAlt, 0.3),
  ];

  const chartData = cfg.datasets.map((ds, i) => ({
    name: ds.label,
    labels: cfg.labels,
    values: ds.values,
    color: chartColors[i % chartColors.length],
  }));

  let chartType: any;
  switch (cfg.type) {
    case 'bar':
      chartType = 'bar';
      break;
    case 'line':
      chartType = 'line';
      break;
    case 'pie':
      chartType = 'pie';
      break;
    case 'donut':
      chartType = 'doughnut';
      break;
    default:
      chartType = 'bar';
  }

  try {
    slide.addChart(chartType as any, chartData, {
      x: 0.8,
      y: 1.8,
      w: 8.5,
      h: 4.8,
      showTitle: false,
      showValue: cfg.type === 'pie' || cfg.type === 'donut',
      showLegend: cfg.datasets.length > 1 || cfg.type === 'pie' || cfg.type === 'donut',
      legendPos: 'b',
      legendFontSize: 9,
      catAxisLabelFontSize: 9,
      valAxisLabelFontSize: 9,
      dataLabelFontSize: 8,
    } as any);
  } catch {
    slide.addText('Chart could not be rendered', {
      x: 2,
      y: 3,
      w: 6,
      h: 1,
      fontSize: 14,
      fontFace: theme.bodyFont,
      color: theme.bodyColor,
      align: 'center',
      valign: 'middle',
    });
  }
}

function renderTable(slide: PptxGenJS.Slide, content: SlideContent, theme: ThemeConfig) {
  const s = resolveTextStyle(theme, content.textStyle);
  addShapeAccent(slide, theme);

  slide.addText(content.title, {
    x: theme.marginX + 0.2,
    y: theme.marginY,
    w: 9,
    h: 0.8,
    fontSize: s.titleFontSize,
    fontFace: s.titleFontFamily,
    color: s.titleColor,
    bold: s.titleBold,
    italic: s.titleItalic,
  });

  const cfg = content.tableConfig;
  if (!cfg) {
    renderTitleBullets(slide, content, theme);
    return;
  }

  const headerRow = cfg.headers.map(h => ({
    text: h,
    options: {
      bold: true,
      fontSize: s.bulletFontSize,
      fontFace: s.titleFontFamily,
      color: 'FFFFFF',
      fill: { color: s.accentColor },
      align: 'center' as const,
      valign: 'middle' as const,
    },
  }));

  const dataRows = cfg.rows.map((row, rowIdx) =>
    row.map(cell => ({
      text: cell,
      options: {
        fontSize: s.bulletFontSize - 1,
        fontFace: s.bodyFontFamily,
        color: s.bodyColor,
        fill: { color: rowIdx % 2 === 0 ? stripHash(theme.bgColor) : darken(theme.bgColor, 0.03) },
        align: 'center' as const,
        valign: 'middle' as const,
      },
    }))
  );

  const colCount = cfg.headers.length;
  const availW = 9;
  const colW = availW / colCount;

  try {
    slide.addTable([headerRow, ...dataRows], {
      x: theme.marginX + 0.3,
      y: 1.5,
      w: availW,
      colW: Array(colCount).fill(colW),
      rowH: 0.45,
      border: { type: 'solid', pt: 0.5, color: theme.darkTheme ? '555555' : 'CCCCCC' },
      autoPage: false,
    } as any);
  } catch {
    slide.addText('Table could not be rendered', {
      x: 2,
      y: 3,
      w: 6,
      h: 1,
      fontSize: 14,
      fontFace: theme.bodyFont,
      color: theme.bodyColor,
      align: 'center',
      valign: 'middle',
    });
  }
}

function renderTimeline(slide: PptxGenJS.Slide, content: SlideContent, theme: ThemeConfig) {
  const s = resolveTextStyle(theme, content.textStyle);
  addShapeAccent(slide, theme);

  slide.addText(content.title, {
    x: theme.marginX + 0.2,
    y: theme.marginY,
    w: 9,
    h: 0.8,
    fontSize: s.titleFontSize,
    fontFace: s.titleFontFamily,
    color: s.titleColor,
    bold: s.titleBold,
    italic: s.titleItalic,
  });

  const cfg = content.timelineConfig;
  if (!cfg || cfg.items.length === 0) {
    renderTitleBullets(slide, content, theme);
    return;
  }

  const items = cfg.items.slice(0, 6);
  const lineY = 3.2;
  const startX = 1.0;
  const totalW = 8.5;
  const spacing = items.length > 1 ? totalW / (items.length - 1) : 0;

  slide.addShape('line', {
    x: startX,
    y: lineY,
    w: totalW,
    h: 0,
    line: { color: theme.darkTheme ? '555555' : 'CCCCCC', width: 2 },
  });

  items.forEach((item, i) => {
    const x = items.length === 1 ? startX + totalW / 2 : startX + i * spacing;

    slide.addShape('ellipse', {
      x: x - 0.12,
      y: lineY - 0.12,
      w: 0.24,
      h: 0.24,
      fill: { color: theme.accentColor },
    });

    slide.addText(item.date, {
      x: x - 0.8,
      y: lineY - 0.9,
      w: 1.6,
      h: 0.35,
      fontSize: 9,
      fontFace: theme.titleFont,
      color: theme.accentColor,
      bold: true,
      align: 'center',
      valign: 'middle',
    });

    slide.addText(item.title, {
      x: x - 0.8,
      y: lineY - 0.55,
      w: 1.6,
      h: 0.35,
      fontSize: 10,
      fontFace: theme.titleFont,
      color: theme.titleColor,
      bold: true,
      align: 'center',
      valign: 'middle',
      wrap: true,
    });

    if (item.description) {
      slide.addText(item.description, {
        x: x - 0.8,
        y: lineY + 0.25,
        w: 1.6,
        h: 0.8,
        fontSize: 8,
        fontFace: theme.bodyFont,
        color: theme.bodyColor,
        align: 'center',
        valign: 'top',
        wrap: true,
      });
    }
  });
}

function renderKpi(slide: PptxGenJS.Slide, content: SlideContent, theme: ThemeConfig) {
  const s = resolveTextStyle(theme, content.textStyle);
  addShapeAccent(slide, theme);

  slide.addText(content.title, {
    x: theme.marginX + 0.2,
    y: theme.marginY,
    w: 9,
    h: 0.8,
    fontSize: s.titleFontSize,
    fontFace: s.titleFontFamily,
    color: s.titleColor,
    bold: s.titleBold,
    italic: s.titleItalic,
  });

  const cfg = content.kpiConfig;
  if (!cfg || cfg.items.length === 0) {
    renderTitleBullets(slide, content, theme);
    return;
  }

  const items = cfg.items.slice(0, 4);
  const cardW = 2.1;
  const cardH = 2.5;
  const gap = 0.3;
  const totalW = items.length * cardW + (items.length - 1) * gap;
  const startX = (10 - totalW) / 2;
  const startY = 2.0;

  items.forEach((item, i) => {
    const x = startX + i * (cardW + gap);

    slide.addShape('rect', {
      x,
      y: startY,
      w: cardW,
      h: cardH,
      fill: { color: darken(theme.bgColor, 0.05) },
      rectRadius: 0.1,
      line: { color: theme.darkTheme ? '444444' : 'E0E0E0', width: 1 },
    });

    slide.addText(item.value, {
      x,
      y: startY + 0.4,
      w: cardW,
      h: 0.8,
      fontSize: 28,
      fontFace: theme.titleFont,
      color: theme.accentColor,
      bold: true,
      align: 'center',
      valign: 'middle',
    });

    slide.addText(item.label, {
      x,
      y: startY + 1.2,
      w: cardW,
      h: 0.5,
      fontSize: 11,
      fontFace: theme.bodyFont,
      color: theme.titleColor,
      align: 'center',
      valign: 'middle',
      wrap: true,
      bold: true,
    });

    if (item.change) {
      const isPositive = item.change.startsWith('+') || item.change.toLowerCase().includes('up');
      slide.addText(item.change, {
        x,
        y: startY + 1.8,
        w: cardW,
        h: 0.4,
        fontSize: 10,
        fontFace: theme.bodyFont,
        color: isPositive ? '22C55E' : 'EF4444',
        align: 'center',
        valign: 'middle',
      });
    }
  });
}

function renderProcess(slide: PptxGenJS.Slide, content: SlideContent, theme: ThemeConfig) {
  const s = resolveTextStyle(theme, content.textStyle);
  addShapeAccent(slide, theme);

  slide.addText(content.title, {
    x: theme.marginX + 0.2,
    y: theme.marginY,
    w: 9,
    h: 0.8,
    fontSize: s.titleFontSize,
    fontFace: s.titleFontFamily,
    color: s.titleColor,
    bold: s.titleBold,
    italic: s.titleItalic,
  });

  const steps = content.bullets || [];
  if (steps.length === 0) {
    return;
  }

  const maxSteps = Math.min(steps.length, 6);
  const stepW = 1.4;
  const arrowW = 0.4;
  const totalW = maxSteps * stepW + (maxSteps - 1) * arrowW;
  const startX = (10 - totalW) / 2;
  const y = 2.5;
  const stepH = 2.2;

  for (let i = 0; i < maxSteps; i++) {
    const x = startX + i * (stepW + arrowW);

    slide.addShape('ellipse', {
      x: x + stepW / 2 - 0.25,
      y,
      w: 0.5,
      h: 0.5,
      fill: { color: theme.accentColor },
    });

    slide.addText(String(i + 1), {
      x: x + stepW / 2 - 0.25,
      y,
      w: 0.5,
      h: 0.5,
      fontSize: 14,
      fontFace: theme.titleFont,
      color: 'FFFFFF',
      align: 'center',
      valign: 'middle',
      bold: true,
    });

    slide.addText(steps[i], {
      x,
      y: y + 0.65,
      w: stepW,
      h: stepH - 0.7,
      fontSize: 9,
      fontFace: theme.bodyFont,
      color: theme.bodyColor,
      align: 'center',
      valign: 'top',
      wrap: true,
    });

    if (i < maxSteps - 1) {
      slide.addText('\u2192', {
        x: x + stepW,
        y: y + 0.05,
        w: arrowW,
        h: 0.4,
        fontSize: 18,
        fontFace: theme.bodyFont,
        color: theme.accentColor,
        align: 'center',
        valign: 'middle',
      });
    }
  }
}

function renderProblemSolution(slide: PptxGenJS.Slide, content: SlideContent, theme: ThemeConfig) {
  const s = resolveTextStyle(theme, content.textStyle);
  addShapeAccent(slide, theme);

  slide.addText(content.title, {
    x: theme.marginX + 0.2,
    y: theme.marginY,
    w: 9,
    h: 0.8,
    fontSize: s.titleFontSize,
    fontFace: s.titleFontFamily,
    color: s.titleColor,
    bold: s.titleBold,
    italic: s.titleItalic,
  });

  const colW = 4.2;
  const startY = 1.6;

  slide.addShape('rect', {
    x: theme.marginX + 0.2,
    y: startY,
    w: colW,
    h: 4,
    fill: { color: darken(theme.bgColor, 0.06) },
    rectRadius: 0.1,
  });

  slide.addText(content.leftLabel || 'Problem', {
    x: theme.marginX + 0.4,
    y: startY + 0.2,
    w: colW - 0.4,
    h: 0.5,
    fontSize: theme.bodyFontSize + 2,
    fontFace: theme.titleFont,
    color: 'EF4444',
    bold: true,
  });

  const leftBullets = content.leftColumn || [];
  if (leftBullets.length > 0) {
    slide.addText(
      leftBullets.map(b => ({
        text: b,
        options: {
          fontSize: theme.bulletFontSize,
          fontFace: theme.bodyFont,
          color: theme.bodyColor,
          bullet: { type: 'bullet' as const, code: '2022' },
          paraSpaceAfter: 6,
          lineSpacingMultiple: 1.2,
        },
      })),
      { x: theme.marginX + 0.5, y: startY + 0.8, w: colW - 0.6, h: 3, valign: 'top', wrap: true }
    );
  }

  slide.addShape('rect', {
    x: theme.marginX + 0.2 + colW + 0.4,
    y: startY,
    w: colW,
    h: 4,
    fill: { color: darken(theme.bgColor, 0.06) },
    rectRadius: 0.1,
  });

  slide.addText(content.rightLabel || 'Solution', {
    x: theme.marginX + 0.4 + colW + 0.4,
    y: startY + 0.2,
    w: colW - 0.4,
    h: 0.5,
    fontSize: theme.bodyFontSize + 2,
    fontFace: theme.titleFont,
    color: '22C55E',
    bold: true,
  });

  const rightBullets = content.rightColumn || [];
  if (rightBullets.length > 0) {
    slide.addText(
      rightBullets.map(b => ({
        text: b,
        options: {
          fontSize: theme.bulletFontSize,
          fontFace: theme.bodyFont,
          color: theme.bodyColor,
          bullet: { type: 'bullet' as const, code: '2022' },
          paraSpaceAfter: 6,
          lineSpacingMultiple: 1.2,
        },
      })),
      { x: theme.marginX + 0.5 + colW + 0.4, y: startY + 0.8, w: colW - 0.6, h: 3, valign: 'top', wrap: true }
    );
  }

  slide.addText('\u2192', {
    x: theme.marginX + 0.2 + colW,
    y: startY + 1.5,
    w: 0.4,
    h: 0.6,
    fontSize: 24,
    fontFace: theme.bodyFont,
    color: theme.accentColor,
    align: 'center',
    valign: 'middle',
  });
}

function renderRecommendations(slide: PptxGenJS.Slide, content: SlideContent, theme: ThemeConfig) {
  const s = resolveTextStyle(theme, content.textStyle);
  addShapeAccent(slide, theme);

  slide.addText(content.title, {
    x: theme.marginX + 0.2,
    y: theme.marginY,
    w: 9,
    h: 0.8,
    fontSize: s.titleFontSize,
    fontFace: s.titleFontFamily,
    color: s.titleColor,
    bold: s.titleBold,
    italic: s.titleItalic,
  });

  const items = content.bullets || [];
  if (items.length === 0) return;

  const maxItems = Math.min(items.length, 5);
  const itemH = 0.8;
  const gap = 0.15;
  const startY = 1.6;
  const cardW = 8.5;

  for (let i = 0; i < maxItems; i++) {
    const y = startY + i * (itemH + gap);

    slide.addShape('rect', {
      x: theme.marginX + 0.3,
      y,
      w: cardW,
      h: itemH,
      fill: { color: darken(theme.bgColor, 0.04) },
      rectRadius: 0.08,
    });

    slide.addShape('rect', {
      x: theme.marginX + 0.3,
      y,
      w: 0.06,
      h: itemH,
      fill: { color: theme.accentColor },
    });

    slide.addText(`${i + 1}.`, {
      x: theme.marginX + 0.55,
      y,
      w: 0.35,
      h: itemH,
      fontSize: theme.bodyFontSize,
      fontFace: theme.titleFont,
      color: theme.accentColor,
      bold: true,
      valign: 'middle',
    });

    slide.addText(items[i], {
      x: theme.marginX + 0.95,
      y,
      w: cardW - 0.8,
      h: itemH,
      fontSize: theme.bulletFontSize,
      fontFace: theme.bodyFont,
      color: theme.bodyColor,
      valign: 'middle',
      wrap: true,
    });
  }
}

export function generatePptx(slides: SlideContent[], themeId: string, title: string): Promise<Blob> {
  const theme = getTheme(themeId);

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = title;
  pptx.author = 'MindFlow Presentation Generator';

  pptx.defineSlideMaster({
    title: 'MINDFLOW_DEFAULT',
    background: { fill: theme.bgColor },
  });

  for (const content of slides) {
    try {
      const slide = pptx.addSlide({ masterName: 'MINDFLOW_DEFAULT' });

      addSpeakerNotes(slide, content);

      switch (content.layout) {
        case 'cover':
          renderCover(pptx, slide, content, theme);
          break;
        case 'agenda':
          renderAgenda(slide, content, theme);
          break;
        case 'section-divider':
          renderSectionDivider(slide, content, theme);
          break;
        case 'title-bullets':
          renderTitleBullets(slide, content, theme);
          break;
        case 'two-column':
          renderTwoColumn(slide, content, theme);
          break;
        case 'image-text':
          renderImageText(slide, content, theme);
          break;
        case 'big-statement':
          renderBigStatement(slide, content, theme);
          break;
        case 'comparison':
          renderComparison(slide, content, theme);
          break;
        case 'summary':
          renderSummary(slide, content, theme);
          break;
        case 'closing':
          renderClosing(slide, content, theme);
          break;
        case 'chart':
          renderChart(slide, content, theme);
          break;
        case 'table':
          renderTable(slide, content, theme);
          break;
        case 'timeline':
          renderTimeline(slide, content, theme);
          break;
        case 'kpi':
          renderKpi(slide, content, theme);
          break;
        case 'process':
          renderProcess(slide, content, theme);
          break;
        case 'problem-solution':
          renderProblemSolution(slide, content, theme);
          break;
        case 'recommendations':
          renderRecommendations(slide, content, theme);
          break;
        default:
          renderTitleBullets(slide, content, theme);
      }
    } catch (err) {
      console.error('Error rendering slide:', err);
      // Create a fallback slide for errors
      const errorSlide = pptx.addSlide({ masterName: 'MINDFLOW_DEFAULT' });
      errorSlide.addText(`Error rendering slide: ${slides.indexOf(content) + 1}`, {
        x: 1, y: 3, w: 8, h: 1, color: 'FF0000', align: 'center'
      });
    }
  }

  return pptx.write({ outputType: 'blob' }) as Promise<Blob>;
}

export function downloadPptx(blob: Blob, filename: string) {
  // explicitly cast the output to a PowerPoint mime type so browsers don't fallback to .zip given pptx's ZIP XML architecture.
  const pptxBlob = new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  const url = URL.createObjectURL(pptxBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pptx') ? filename : `${filename}.pptx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
