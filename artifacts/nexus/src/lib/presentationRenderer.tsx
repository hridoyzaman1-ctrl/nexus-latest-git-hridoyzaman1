import React from 'react';
import { BarChart3, Clock } from 'lucide-react';
import { SlideContent } from '@/types/presentation';
import { getTheme } from '@/lib/presentationThemes';

export function renderTextWithBreaks(text: string) {
    const parts = text.split('\n');
    if (parts.length <= 1) return text;
    return parts.map((part, i) => (
        <span key={i}>{part}{i < parts.length - 1 && <br />}</span>
    ));
}

/**
 * Render the visual data block (chart / table / timeline / KPI) for a slide.
 *
 * @param large  - When true, render at full-screen viewer scale (bigger fonts /
 *                 taller bars). Default false = compact editor-thumbnail size.
 */
export function renderSlidePreviewContent(
    slide: SlideContent,
    theme: ReturnType<typeof getTheme>,
    large = false,
) {
    const bodyColor = `#${theme.bodyColor}`;
    const accentColor = `#${theme.accentColor}`;
    const cardBg = theme.darkTheme ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.055)';

    if (slide.chartConfig) {
        const barAreaH  = large ? 120 : 36;
        const titleSize = large ? '13px' : '9px';
        const labelSize = large ? '11px' : '7px';
        const iconSize  = large ? 'w-4 h-4' : 'w-3 h-3';
        const gap       = large ? 'gap-1.5' : 'gap-0.5';

        return (
            <div className="space-y-1 rounded-lg p-2" style={{ backgroundColor: cardBg }}>
                <div className="flex items-center gap-1.5">
                    <BarChart3 className={`${iconSize} flex-shrink-0`} style={{ color: accentColor }} />
                    <span className="font-semibold leading-tight" style={{ fontSize: titleSize, color: accentColor }}>
                        {slide.chartConfig.type.toUpperCase()} CHART: {slide.chartConfig.title}
                    </span>
                </div>
                <div className={`flex items-end ${gap} mt-1`} style={{ height: `${barAreaH}px` }}>
                    {slide.chartConfig.datasets[0] && slide.chartConfig.labels.map((l, i) => {
                        const maxVal = Math.max(...(slide.chartConfig!.datasets[0]?.values || [1]));
                        const val = slide.chartConfig!.datasets[0]?.values[i] || 0;
                        const h = Math.max(large ? 10 : 4, (val / maxVal) * (barAreaH - (large ? 20 : 10)));
                        const opacity = 0.75 + (i * 0.05);
                        return (
                            <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
                                <div className="rounded-sm w-full" style={{ height: `${h}px`, backgroundColor: accentColor, opacity: Math.min(opacity, 1) }} />
                                <span className="truncate w-full text-center" style={{ fontSize: labelSize, color: bodyColor }}>{l}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (slide.tableConfig) {
        const cellPad  = large ? 'px-3 py-1.5' : 'px-1 py-0.5';
        const fontSize = large ? '12px' : '8px';
        const maxRows = large ? 10 : 5;
        return (
            <div className="overflow-hidden rounded-lg w-full h-full flex flex-col" style={{ fontSize, backgroundColor: cardBg }}>
                <table className="w-full table-fixed border-collapse">
                    <thead>
                        <tr style={{ backgroundColor: accentColor }}>
                            {slide.tableConfig.headers.map((h, i) => (
                                <th key={i} className={`${cellPad} font-bold text-white text-left truncate border-r border-white/10 last:border-0`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {slide.tableConfig.rows.slice(0, maxRows).map((row, ri) => (
                            <tr key={ri} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                {row.map((cell, ci) => (
                                    <td key={ci} className={`${cellPad} truncate border-r border-white/5 last:border-0`} style={{ color: bodyColor }}>{cell}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {slide.tableConfig.rows.length > maxRows && (
                    <div className="text-center py-1 mt-auto opacity-60 bg-black/5" style={{ color: bodyColor, fontSize: large ? '10px' : '7px' }}>
                        +{slide.tableConfig.rows.length - maxRows} more rows
                    </div>
                )}
            </div>
        );
    }

    if (slide.timelineConfig) {
        const labelSize = large ? '12px' : '8px';
        const dotSize   = large ? 'w-3 h-3' : 'w-1.5 h-1.5';
        const iconSize  = large ? 'w-4 h-4' : 'w-3 h-3';
        return (
            <div className="space-y-1.5 rounded-lg p-2" style={{ backgroundColor: cardBg }}>
                <div className="flex items-center gap-1.5">
                    <Clock className={`${iconSize} flex-shrink-0`} style={{ color: accentColor }} />
                    <span className="font-semibold uppercase tracking-wide" style={{ fontSize: large ? '13px' : '9px', color: accentColor }}>TIMELINE</span>
                </div>
                <div className={`space-y-${large ? 2 : 1}`}>
                    {slide.timelineConfig.items.slice(0, large ? 6 : 4).map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                            <div className={`${dotSize} rounded-full flex-shrink-0 mt-0.5`} style={{ backgroundColor: accentColor }} />
                            <div>
                                <span className="font-semibold" style={{ fontSize: labelSize, color: accentColor }}>{item.date} </span>
                                <span style={{ fontSize: labelSize, color: bodyColor }}>{item.title}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (slide.kpiConfig) {
        const valSize   = large ? '22px' : '10px';
        const labelSize = large ? '11px' : '7px';
        const pad       = large ? 'p-3' : 'p-1.5';
        return (
            <div className={`grid ${slide.kpiConfig.items.length > 2 ? 'grid-cols-2' : 'grid-cols-2'} gap-2`}>
                {slide.kpiConfig.items.slice(0, 4).map((item, i) => (
                    <div key={i} className={`rounded-lg ${pad}`} style={{ backgroundColor: cardBg }}>
                        <div className="font-bold leading-none" style={{ fontSize: valSize, color: accentColor }}>{item.value}</div>
                        <div className="mt-1 truncate opacity-80" style={{ fontSize: labelSize, color: bodyColor }}>{item.label}</div>
                        {item.change && (
                            <div className="mt-0.5 font-medium" style={{ fontSize: labelSize, color: item.change.startsWith('+') || /up/i.test(item.change) ? '#22c55e' : '#ef4444' }}>
                                {item.change}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    return null;
}
