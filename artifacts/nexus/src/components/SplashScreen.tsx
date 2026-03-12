import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles } from 'lucide-react';
import { getLocalStorage } from '@/hooks/useLocalStorage';
import { AccessibilitySettings } from '@/types';
import { defaultAccessibility } from '@/hooks/useAccessibility';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Play splash sound if enabled
    const settings = getLocalStorage<AccessibilitySettings>('accessibilitySettings', defaultAccessibility);
    if (settings.splashSound !== false) {
      const audio = new Audio('/audio/alarm-chime.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
      audioRef.current = audio;
    }

    const timer = setTimeout(() => {
      setVisible(false);
      // Fade out audio
      if (audioRef.current) {
        const fadeOut = setInterval(() => {
          if (audioRef.current && audioRef.current.volume > 0.05) {
            audioRef.current.volume = Math.max(0, audioRef.current.volume - 0.05);
          } else {
            clearInterval(fadeOut);
            audioRef.current?.pause();
          }
        }, 80);
      }
      setTimeout(onFinish, 600);
    }, 4400);
    return () => {
      clearTimeout(timer);
      audioRef.current?.pause();
    };
  }, [onFinish]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background overflow-hidden"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Ambient glow */}
          <motion.div
            className="absolute w-72 h-72 rounded-full opacity-20 blur-3xl"
            style={{ background: 'hsl(var(--primary))' }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.15, 0.3, 0.15] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Logo icon */}
          <motion.div
            className="relative z-10 mb-6"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 150, damping: 15, delay: 0.2 }}
          >
            <motion.div
              className="w-24 h-24 rounded-3xl flex items-center justify-center relative"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))',
                boxShadow: '0 10px 40px hsl(var(--primary) / 0.4)',
              }}
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            >
              <Brain className="w-12 h-12 text-primary-foreground" />
              <motion.div
                className="absolute -top-1 -right-1"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: 'spring' }}
              >
                <Sparkles className="w-5 h-5 text-primary-foreground opacity-80" />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* App name */}
          <motion.div
            className="relative z-10 text-center space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <h1 className="text-3xl font-bold font-display tracking-tight">
              <span className="text-primary">Nexus</span>{' '}
              <span className="text-foreground">MindFlow</span>
            </h1>
            <motion.p
              className="text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
            >
              Your wellbeing, study & life companion
            </motion.p>
          </motion.div>

          {/* Loading dots */}
          <motion.div
            className="relative z-10 flex gap-1.5 mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
          >
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </motion.div>

          {/* Bottom: version & copyright */}
          <motion.div
            className="absolute bottom-8 text-center space-y-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8 }}
          >
            <p className="text-[10px] text-muted-foreground/60">v2.0.0</p>
            <p className="text-[10px] text-muted-foreground/50">
              Developed by Hridoy Zaman
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
