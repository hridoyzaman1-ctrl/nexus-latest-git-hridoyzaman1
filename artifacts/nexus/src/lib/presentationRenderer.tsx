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

export function renderSlidePreviewContent(slide: SlideContent, theme: ReturnType<typeof getTheme>) {
    const bodyColor = `#${theme.bodyColor}`;
    const accentColor = `#${theme.accentColor}`;

    if (slide.chartConfig) {
        return (
            <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" style={{ color: accentColor }} />
                    <span className="text-[9px] font-medium" style={{ color: accentColor }}>
                        {slide.chartConfig.type.toUpperCase()} CHART: {slide.chartConfig.title}
                    </span>
                </div>
                <div className="flex items-end gap-0.5 h-10">
                    {slide.chartConfig.datasets[0] && slide.chartConfig.labels.map((l, i) => {
                        const maxVal = Math.max(...(slide.chartConfig!.datasets[0]?.values || [1]));
                        const val = slide.chartConfig!.datasets[0]?.values[i] || 0;
                        const h = Math.max(4, (val / maxVal) * 36);
                        return (
                            <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
                                <div className="rounded-sm w-full" style={{ height: `${h}px`, backgroundColor: accentColor, opacity: 0.6 + (i * 0.1) }} />
                                <span className="text-[7px] truncate w-full text-center" style={{ color: bodyColor }}>{l}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (slide.tableConfig) {
        return (
            <div className="mt-2 overflow-hidden rounded text-[8px]">
                <div className="flex gap-px" style={{ backgroundColor: accentColor }}>
                    {slide.tableConfig.headers.map((h, i) => (
                        <div key={i} className="flex-1 px-1 py-0.5 font-bold text-white truncate">{h}</div>
                    ))}
                </div>
                {slide.tableConfig.rows.slice(0, 3).map((row, ri) => (
                    <div key={ri} className="flex gap-px" style={{ backgroundColor: theme.darkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                        {row.map((cell, ci) => (
                            <div key={ci} className="flex-1 px-1 py-0.5 truncate" style={{ color: bodyColor }}>{cell}</div>
                        ))}
                    </div>
                ))}
                {slide.tableConfig.rows.length > 3 && (
                    <div className="text-center py-0.5" style={{ color: bodyColor }}>+{slide.tableConfig.rows.length - 3} more rows</div>
                )}
            </div>
        );
    }

    if (slide.timelineConfig) {
        return (
            <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" style={{ color: accentColor }} />
                    <span className="text-[9px] font-medium" style={{ color: accentColor }}>TIMELINE</span>
                </div>
                <div className="space-y-0.5">
                    {slide.timelineConfig.items.slice(0, 4).map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: accentColor }} />
                            <span className="text-[8px] font-medium" style={{ color: accentColor }}>{item.date}</span>
                            <span className="text-[8px] truncate" style={{ color: bodyColor }}>{item.title}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (slide.kpiConfig) {
        return (
            <div className="mt-2 grid grid-cols-2 gap-1">
                {slide.kpiConfig.items.slice(0, 4).map((item, i) => (
                    <div key={i} className="rounded p-1.5" style={{ backgroundColor: theme.darkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                        <div className="text-[10px] font-bold" style={{ color: accentColor }}>{item.value}</div>
                        <div className="text-[7px] truncate" style={{ color: bodyColor }}>{item.label}</div>
                        {item.change && <div className="text-[7px]" style={{ color: item.change.startsWith('+') || item.change.startsWith('up') ? '#22c55e' : '#ef4444' }}>{item.change}</div>}
                    </div>
                ))}
            </div>
        );
    }

    return null;
}
