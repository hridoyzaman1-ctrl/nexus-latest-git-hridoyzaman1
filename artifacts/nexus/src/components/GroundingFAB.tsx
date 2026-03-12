import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wind, X, Heart } from 'lucide-react';

type Phase = 'inhale' | 'hold' | 'exhale';
const PHASE_DURATIONS: Record<Phase, number> = { inhale: 4, hold: 4, exhale: 6 };
const PHASE_COLORS: Record<Phase, string> = {
  inhale: 'hsl(199, 89%, 48%)',
  hold: 'hsl(38, 92%, 50%)',
  exhale: 'hsl(152, 69%, 45%)',
};

export default function GroundingFAB() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<Phase>('inhale');
  const [counter, setCounter] = useState(4);
  const [cycles, setCycles] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (!active) return;
    let currentPhase: Phase = 'inhale';
    let currentCount = PHASE_DURATIONS.inhale;
    setPhase('inhale');
    setCounter(PHASE_DURATIONS.inhale);

    intervalRef.current = setInterval(() => {
      currentCount--;
      if (currentCount <= 0) {
        if (currentPhase === 'inhale') { currentPhase = 'hold'; currentCount = PHASE_DURATIONS.hold; }
        else if (currentPhase === 'hold') { currentPhase = 'exhale'; currentCount = PHASE_DURATIONS.exhale; }
        else {
          currentPhase = 'inhale';
          currentCount = PHASE_DURATIONS.inhale;
          setCycles(c => c + 1);
        }
        setPhase(currentPhase);
      }
      setCounter(currentCount);
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [active]);

  const stop = () => {
    setActive(false);
    clearInterval(intervalRef.current);
    setCycles(0);
  };

  const close = () => {
    stop();
    setOpen(false);
  };

  return (
    <>
      {/* FAB button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-[5.5rem] right-4 z-40 w-12 h-12 rounded-full bg-primary/90 backdrop-blur-xl flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            style={{ boxShadow: '0 4px 20px -4px hsl(var(--primary) / 0.5)' }}
            aria-label="Quick grounding exercise"
          >
            <Wind className="w-5 h-5 text-primary-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-[5.5rem] right-4 z-40 w-56 rounded-2xl bg-card/95 backdrop-blur-2xl border border-border/50 p-4 space-y-3"
            style={{ boxShadow: '0 8px 40px -8px hsl(var(--primary) / 0.3)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold">Quick Breathe</span>
              </div>
              <button onClick={close} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Breathing circle */}
            <div className="flex justify-center">
              <motion.div
                animate={{
                  width: active ? (phase === 'exhale' ? 64 : phase === 'hold' ? 88 : 88) : 72,
                  height: active ? (phase === 'exhale' ? 64 : phase === 'hold' ? 88 : 88) : 72,
                }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
                className="rounded-full flex items-center justify-center"
                style={{
                  background: (active ? PHASE_COLORS[phase] : 'hsl(var(--primary))') + '18',
                  border: `2px solid ${active ? PHASE_COLORS[phase] : 'hsl(var(--primary))'}`,
                }}
              >
                <div className="text-center">
                  <p className="text-xl font-bold font-display">{active ? counter : '—'}</p>
                  <p className="text-[10px] capitalize" style={{ color: active ? PHASE_COLORS[phase] : 'hsl(var(--muted-foreground))' }}>
                    {active ? phase : 'Ready'}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Cycle counter */}
            {active && cycles > 0 && (
              <p className="text-center text-[10px] text-muted-foreground">{cycles} cycle{cycles > 1 ? 's' : ''} complete</p>
            )}

            {/* Info */}
            <div className="flex justify-center gap-3 text-[10px] text-muted-foreground">
              <span style={{ color: PHASE_COLORS.inhale }}>4s In</span>
              <span style={{ color: PHASE_COLORS.hold }}>4s Hold</span>
              <span style={{ color: PHASE_COLORS.exhale }}>6s Out</span>
            </div>

            {/* Button */}
            <button
              onClick={() => active ? stop() : setActive(true)}
              className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors ${
                active
                  ? 'bg-destructive/15 text-destructive hover:bg-destructive/25'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {active ? 'Stop' : 'Start Breathing'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
