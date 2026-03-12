import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TooltipStep } from '@/lib/onboardingTooltips';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpotlightTooltipProps {
  steps: TooltipStep[];
  onDismiss: () => void;
}

export default function SpotlightTooltip({ steps, onDismiss }: SpotlightTooltipProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: string }>({ top: 0, left: 0, placement: 'bottom' });
  const overlayRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const total = steps.length;

  const updatePosition = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);

      // Calculate tooltip position
      const padding = 12;
      const tooltipWidth = Math.min(280, window.innerWidth - 32);
      const placement = step.placement || 'bottom';

      let top = 0;
      let left = 0;

      switch (placement) {
        case 'top':
          top = rect.top - padding - 8;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'bottom':
          top = rect.bottom + padding;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2;
          left = rect.left - tooltipWidth - padding;
          break;
        case 'right':
          top = rect.top + rect.height / 2;
          left = rect.right + padding;
          break;
      }

      // Keep tooltip within viewport
      left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
      top = Math.max(16, Math.min(top, window.innerHeight - 160));

      setTooltipPos({ top, left, placement });
    } else {
      // Fallback: center if element not found
      setTargetRect(null);
      setTooltipPos({ top: window.innerHeight / 2 - 60, left: window.innerWidth / 2 - 140, placement: 'bottom' });
    }
  }, [step]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [updatePosition, currentStep]);

  const next = () => {
    if (currentStep < total - 1) setCurrentStep(currentStep + 1);
    else onDismiss();
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const spotlightPadding = 6;

  return createPortal(
    <div ref={overlayRef} className="fixed inset-0 z-[9999]" onClick={(e) => { if (e.target === overlayRef.current) onDismiss(); }}>
      {/* Dark overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - spotlightPadding}
                y={targetRect.top - spotlightPadding}
                width={targetRect.width + spotlightPadding * 2}
                height={targetRect.height + spotlightPadding * 2}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.65)"
          mask="url(#spotlight-mask)"
          style={{ pointerEvents: 'all' }}
        />
      </svg>

      {/* Highlight ring around target */}
      {targetRect && (
        <div
          className="absolute rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-transparent pointer-events-none"
          style={{
            top: targetRect.top - spotlightPadding,
            left: targetRect.left - spotlightPadding,
            width: targetRect.width + spotlightPadding * 2,
            height: targetRect.height + spotlightPadding * 2,
          }}
        />
      )}

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute z-10 w-[280px] bg-card border border-border rounded-2xl p-4 shadow-2xl"
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
        >
          {/* Close */}
          <button
            onClick={onDismiss}
            className="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>

          {/* Content */}
          <div className="pr-6">
            <p className="text-sm font-bold">{step.title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
            <span className="text-[10px] text-muted-foreground">{currentStep + 1} / {total}</span>
            <div className="flex gap-1.5">
              {currentStep > 0 && (
                <button onClick={prev} className="w-7 h-7 rounded-lg flex items-center justify-center bg-secondary hover:bg-secondary/80 transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={next}
                className="h-7 px-3 rounded-lg flex items-center justify-center gap-1 bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                {currentStep === total - 1 ? 'Got it!' : 'Next'}
                {currentStep < total - 1 && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
}
