import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { getLocalStorage, isDemoMode } from '@/hooks/useLocalStorage';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

export default function KiraChatFAB() {
  const navigate = useNavigate();
  const location = useLocation();
  const [shouldPulse, setShouldPulse] = useState(false);
  const { showMiniPlayer } = useMusicPlayer();

  useEffect(() => {
    // Check if user hasn't chatted in 2+ hours
    const lastChat = getLocalStorage<string>('lastChatTimestamp', '');
    if (!lastChat) {
      setShouldPulse(true);
      return;
    }
    const elapsed = Date.now() - new Date(lastChat).getTime();
    setShouldPulse(elapsed > 2 * 60 * 60 * 1000); // 2 hours

    const interval = setInterval(() => {
      const ts = getLocalStorage<string>('lastChatTimestamp', '');
      const diff = ts ? Date.now() - new Date(ts).getTime() : Infinity;
      setShouldPulse(diff > 2 * 60 * 60 * 1000);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isDemoMode) return null;

  // Hide on chat page and during onboarding
  // Hide on chat, onboarding, and all study pages (study AI buddy replaces Kira there)
  if (location.pathname === '/chat' || location.pathname === '/onboarding' || location.pathname === '/study') return null;

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
      onClick={() => navigate('/chat')}
      className={`fixed w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg glow-md z-[45] active:scale-95 transition-all duration-300 ${shouldPulse ? 'animate-[kira-pulse_2.5s_ease-in-out_infinite]' : ''}`}
      style={{ 
        right: 'max(1rem, calc((100vw - 480px) / 2 + 1rem))',
        bottom: showMiniPlayer ? '10.5rem' : '5.5rem',
      }}
      aria-label="Chat with Kira"
    >
      <Sparkles className="w-5 h-5 text-primary-foreground" />
    </motion.button>
  );
}
