import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import type { Presentation } from '@/types/presentation';
import { getTheme } from '@/lib/presentationThemes';
import { renderTextWithBreaks, renderSlidePreviewContent } from '@/lib/presentationRenderer';
import { getTextAreaWidth } from '@/lib/slideEngine';

interface PresentationViewerProps {
    presentation: Presentation;
    onClose: () => void;
}

export default function PresentationViewer({ presentation, onClose }: PresentationViewerProps) {
    const [presentingSlideIdx, setPresentingSlideIdx] = useState(0);
    const [presenterScale, setPresenterScale] = useState(1);
    const [isLandscape, setIsLandscape] = useState(
        typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false
    );
    const [isRotating, setIsRotating] = useState(false);

    const currentSlide = presentation.slides[presentingSlideIdx];
    const theme = getTheme(presentation.themeId);
    const slideImages = currentSlide?.images || [];

    // --- Orientation detection ---
    const updateOrientation = useCallback(() => {
        setIsLandscape(window.innerWidth > window.innerHeight);
    }, []);

    useEffect(() => {
        window.addEventListener('resize', updateOrientation);
        if (screen.orientation) {
            screen.orientation.addEventListener('change', updateOrientation);
        }
        return () => {
            window.removeEventListener('resize', updateOrientation);
            if (screen.orientation) {
                screen.orientation.removeEventListener('change', updateOrientation);
            }
        };
    }, [updateOrientation]);

    // --- Auto-rotate handler ---
    const handleRotate = async () => {
        setIsRotating(true);
        try {
            if (screen.orientation && (screen.orientation as any).lock) {
                const current = screen.orientation.type;
                if (current.startsWith('portrait')) {
                    await (screen.orientation as any).lock('landscape');
                } else {
                    await (screen.orientation as any).lock('portrait');
                }
            } else {
                // Fallback: just note we can't force rotate on this device
                // The icon still serves as a hint to the user
            }
        } catch {
            // Screen orientation lock not supported or denied — silently ignore
        }
        setTimeout(() => setIsRotating(false), 600);
    };

    // --- Keyboard navigation ---
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && presentingSlideIdx > 0) {
                setPresentingSlideIdx(presentingSlideIdx - 1);
            } else if ((e.key === 'ArrowRight' || e.key === ' ') && presentingSlideIdx < presentation.slides.length - 1) {
                e.preventDefault();
                setPresentingSlideIdx(presentingSlideIdx + 1);
            } else if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [presentingSlideIdx, presentation.slides.length, onClose]);

    // --- Touch swipe ---
    const touchStartX = useRef<number>(0);
    const touchEndX = useRef<number>(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
    };
    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };
    const handleTouchEnd = () => {
        if (!touchStartX.current || !touchEndX.current) return;
        const distance = touchStartX.current - touchEndX.current;
        if (distance > 50 && presentingSlideIdx < presentation.slides.length - 1) {
            setPresentingSlideIdx(prev => prev + 1);
        } else if (distance < -50 && presentingSlideIdx > 0) {
            setPresentingSlideIdx(prev => prev - 1);
        }
        touchStartX.current = 0;
        touchEndX.current = 0;
    };

    // --- Dynamic scale for slide (800x450 canvas) ---
    useEffect(() => {
        const updateScale = () => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const isMobile = vw < 768;

            // Reserve space for UI controls
            const uiBarHeight = isMobile ? 56 : 0; // bottom bar on mobile
            const topBarHeight = 56; // top controls

            const availW = vw - (isMobile ? 0 : 80);
            const availH = vh - topBarHeight - (isMobile ? uiBarHeight + 8 : 0);

            const scaleX = availW / 800;
            const scaleY = availH / 450;
            setPresenterScale(Math.min(scaleX, scaleY, 1.5)); // cap at 1.5x
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        if (screen.orientation) {
            screen.orientation.addEventListener('change', () => setTimeout(updateScale, 100));
        }
        return () => {
            window.removeEventListener('resize', updateScale);
        };
    }, []);

    if (!currentSlide) return null;

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (presentingSlideIdx < presentation.slides.length - 1) setPresentingSlideIdx(presentingSlideIdx + 1);
    };
    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (presentingSlideIdx > 0) setPresentingSlideIdx(presentingSlideIdx - 1);
    };

    const ts = currentSlide.textStyle || {};
    const titleStyle: Record<string, string | number | undefined> = {
        color: ts.titleColor || `#${theme.titleColor}`,
        fontWeight: (ts.titleBold === 'bold' || !ts.titleBold) ? 'bold' : 'normal',
        fontStyle: ts.titleItalic === 'italic' ? 'italic' : 'normal',
        textAlign: ts.titleAlign || 'left',
        fontFamily: ts.titleFontFamily || theme.titleFont,
        fontSize: ts.titleFontSize ? `${Math.min(ts.titleFontSize * 0.45, 18) * 1.5}px` : '24px',
    };
    const bodyStyle: Record<string, string | number | undefined> = {
        color: ts.bodyColor || `#${theme.bodyColor}`,
        fontWeight: ts.bodyBold === 'bold' ? 'bold' : 'normal',
        fontStyle: ts.bodyItalic === 'italic' ? 'italic' : 'normal',
        textAlign: ts.bodyAlign || 'left',
        fontFamily: ts.bodyFontFamily || theme.bodyFont,
        fontSize: ts.bodyFontSize ? `${ts.bodyFontSize * 1.2}px` : '18px',
    };
    const bulletStyle: Record<string, string | number | undefined> = {
        ...bodyStyle,
        color: ts.bulletColor || ts.bodyColor || `#${theme.bodyColor}`,
        fontSize: ts.bulletFontSize ? `${ts.bulletFontSize * 1.2}px` : '18px',
    };
    const accentColor = ts.accentColor || `#${theme.accentColor}`;
    const textWidthPct = getTextAreaWidth(currentSlide.layout, slideImages);
    const textWidthStyle = textWidthPct < 100 ? { maxWidth: `${textWidthPct}%` } : {};

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden select-none"
            style={{ backgroundColor: `#${theme.bgColor}` }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* ── Top bar: Back button + slide counter + rotate ── */}
            <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2 bg-black/30 backdrop-blur-sm">
                {/* Back / close button */}
                <button
                    onClick={onClose}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 text-white text-xs font-medium backdrop-blur-md hover:bg-black/70 transition-colors border border-white/10 shadow-lg"
                    aria-label="Back"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Back</span>
                </button>

                {/* Slide counter */}
                <span className="text-xs font-mono font-bold text-white/80 bg-black/30 px-3 py-1 rounded-full">
                    {presentingSlideIdx + 1} / {presentation.slides.length}
                </span>

                {/* Rotate button — mobile only */}
                <button
                    onClick={handleRotate}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/40 text-white text-xs font-medium backdrop-blur-md hover:bg-black/70 transition-colors border border-white/10 shadow-lg md:hidden"
                    aria-label="Rotate screen"
                    title={isLandscape ? 'Switch to portrait' : 'Switch to landscape'}
                >
                    <RotateCcw className={`w-4 h-4 transition-transform duration-500 ${isRotating ? 'rotate-180' : ''}`} />
                    <span className="hidden xs:inline">{isLandscape ? 'Portrait' : 'Landscape'}</span>
                </button>

                {/* Desktop: empty right placeholder for alignment */}
                <div className="hidden md:block w-20" />
            </div>

            {/* Desktop side click zones */}
            <div className="absolute inset-y-0 left-0 w-[15%] z-10 cursor-pointer hidden md:block" onClick={handlePrev} />
            <div className="absolute inset-y-0 right-0 w-[15%] z-10 cursor-pointer hidden md:block" onClick={handleNext} />

            {/* ── Slide canvas ── */}
            <div
                className="relative overflow-hidden w-[800px] h-[450px] mt-12"
                style={{
                    color: `#${theme.titleColor}`,
                    transform: `scale(${presenterScale})`,
                    transformOrigin: 'center center',
                    backgroundColor: `#${theme.bgColor}`,
                }}
            >
                <div className="p-8 w-full h-full relative" style={{ boxSizing: 'border-box' }}>
                    <div className="relative z-[1]" style={{ ...textWidthStyle, height: '100%' }}>
                        <p style={{ ...titleStyle, marginBottom: '12px' }}>{renderTextWithBreaks(currentSlide.title)}</p>
                        {currentSlide.subtitle && <p className="opacity-70 mb-4" style={{ ...bodyStyle, fontSize: '16px' }}>{renderTextWithBreaks(currentSlide.subtitle)}</p>}
                        {currentSlide.bullets && currentSlide.bullets.length > 0 && (
                            <ul className="space-y-2 mt-4">
                                {currentSlide.bullets.map((b, i) => (
                                    <li key={i} className="opacity-90 flex items-start gap-2" style={bulletStyle}>
                                        <span className="mt-1">&#8226;</span> <span>{renderTextWithBreaks(b)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {currentSlide.statement && <p className="mt-8 opacity-90" style={{ ...titleStyle, fontSize: '32px', lineHeight: '1.4' }}>{renderTextWithBreaks(currentSlide.statement)}</p>}

                        {currentSlide.leftColumn && (
                            <div className="mt-6 grid grid-cols-2 gap-8">
                                <div>
                                    {currentSlide.leftLabel && <p className="font-bold mb-2 uppercase tracking-wide" style={{ color: accentColor, fontSize: '14px' }}>{currentSlide.leftLabel}</p>}
                                    {currentSlide.leftColumn.map((item, i) => (
                                        <p key={i} className="opacity-80 mb-2" style={bulletStyle}>&#8226; {renderTextWithBreaks(item)}</p>
                                    ))}
                                </div>
                                <div>
                                    {currentSlide.rightLabel && <p className="font-bold mb-2 uppercase tracking-wide" style={{ color: accentColor, fontSize: '14px' }}>{currentSlide.rightLabel}</p>}
                                    {(currentSlide.rightColumn || []).map((item, i) => (
                                        <p key={i} className="opacity-80 mb-2" style={bulletStyle}>&#8226; {renderTextWithBreaks(item)}</p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {currentSlide.agendaItems && (
                            <div className="mt-6 space-y-3">
                                {currentSlide.agendaItems.map((item, i) => (
                                    <p key={i} className="opacity-80 flex items-center gap-3" style={bodyStyle}>
                                        <span className="font-bold text-xl" style={{ color: accentColor }}>{String(i + 1).padStart(2, '0')}</span>
                                        {item}
                                    </p>
                                ))}
                            </div>
                        )}

                        {currentSlide.summaryPoints && (
                            <div className="mt-6 space-y-3">
                                {currentSlide.summaryPoints.map((point, i) => (
                                    <p key={i} className="opacity-80 flex items-center gap-3" style={bodyStyle}>
                                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm text-white font-bold flex-shrink-0"
                                            style={{ backgroundColor: accentColor }}>{i + 1}</span>
                                        {point}
                                    </p>
                                ))}
                            </div>
                        )}
                        <div className="mt-6" style={{ transform: 'scale(1.5)', transformOrigin: 'top left' }}>
                            {renderSlidePreviewContent(currentSlide, theme)}
                        </div>
                    </div>

                    {slideImages.map(img => (
                        <div key={img.id}
                            className="absolute z-[5]"
                            style={{
                                left: `${img.x}%`, top: `${img.y}%`, width: `${img.width}%`, height: `${img.height}%`,
                                borderRadius: `${img.borderRadius}px`, opacity: img.opacity / 100,
                            }}>
                            {img.dataUrl && (
                                <img src={img.dataUrl} alt={img.label} className="w-full h-full pointer-events-none" draggable={false}
                                    style={{ objectFit: img.fit, borderRadius: `${img.borderRadius}px` }} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Mobile bottom nav bar ── */}
            <div className="absolute bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-6 py-3 bg-black/30 backdrop-blur-sm md:hidden">
                <button
                    onClick={handlePrev}
                    disabled={presentingSlideIdx === 0}
                    className="w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center border border-white/10 disabled:opacity-30 active:scale-90 transition-all"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xs font-mono font-semibold text-white/90 min-w-[3rem] text-center">
                    {presentingSlideIdx + 1} / {presentation.slides.length}
                </span>
                <button
                    onClick={handleNext}
                    disabled={presentingSlideIdx === presentation.slides.length - 1}
                    className="w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center border border-white/10 disabled:opacity-30 active:scale-90 transition-all"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Desktop: slide counter bottom-left */}
            <div className="absolute bottom-4 left-4 z-50 opacity-40 hover:opacity-100 transition-opacity cursor-default pointer-events-none text-xs font-mono font-bold hidden md:block" style={{ color: `#${theme.titleColor}` }}>
                {presentingSlideIdx + 1} / {presentation.slides.length}
            </div>
        </div>
    );
}
