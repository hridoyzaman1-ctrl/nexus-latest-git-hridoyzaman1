import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { setLocalStorage } from '@/hooks/useLocalStorage';
import { UserProfile } from '@/types';
import { getKiraStartupMessage, getKiraStartupQuestion } from '@/lib/kira';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { avatars, avatarColors } from '@/lib/avatars';
import { useNavigate } from 'react-router-dom';
import { getLocalStorage, isDemoMode } from '@/hooks/useLocalStorage';

export default function KiraGreetingPopup({ disabled }: { disabled?: boolean }) {
  const navigate = useNavigate();
  const [profile] = useLocalStorage<UserProfile>('profile', { name: '', age: 0, occupation: '', goalsText: '', avatar: '😊' });
  const [lastGreeted, setLastGreeted] = useLocalStorage<string>('kira_last_greeted', '');
  const [show, setShow] = useState(false);
  const [message] = useState(() => getKiraStartupMessage());
  const [question] = useState(() => getKiraStartupQuestion());

  useEffect(() => {
    if (disabled) return;
    const today = new Date().toDateString();
    // Show greeting once per app session (use sessionStorage) and once per day
    const sessionShown = sessionStorage.getItem('mindflow_kira_shown');
    const tutorialSeen = getLocalStorage<boolean>('tutorialSeen', false);
    // If the app tutorial hasn't been seen yet, defer
    if (!tutorialSeen) return;
    if (!sessionShown || lastGreeted !== today) {
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastGreeted, disabled]);

  const dismiss = () => {
    setShow(false);
    setLastGreeted(new Date().toDateString());
    sessionStorage.setItem('mindflow_kira_shown', 'true');
  };

  if (isDemoMode) return null;
  if (!show) return null;

  const timeOfDay = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  })();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-[420px] glass-strong rounded-3xl p-6 space-y-4 glow-md animate-in zoom-in-95 duration-300">
        {/* Kira Avatar */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-4xl shadow-lg">
              🌟
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-success flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
        </div>

        {/* Greeting */}
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold font-display">
            Good {timeOfDay}, {profile.name || 'there'}! 💜
          </h2>
          <p className="text-xs text-muted-foreground">Kira — Your Personal Buddy ✨</p>
        </div>

        {/* Message */}
        <div className="bg-primary/10 rounded-2xl p-4">
          <p className="text-sm leading-relaxed">{message}</p>
        </div>

        {/* Daily Question */}
        <div className="bg-secondary/50 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">💭 Daily Check-in</p>
          <p className="text-sm font-medium">{question}</p>
        </div>

        {/* Quick Mood Selector */}
        <div>
          <p className="text-xs text-muted-foreground text-center mb-2">How are you feeling?</p>
          <div className="flex justify-center gap-3">
            {[
              { emoji: '😊', label: 'Great', mood: 'great' as const, msg: "I'm feeling great today! 😊" },
              { emoji: '😐', label: 'Okay', mood: 'okay' as const, msg: "I'm feeling just okay today 😐" },
              { emoji: '😔', label: 'Low', mood: 'low' as const, msg: "I'm feeling a bit low today 😔" },
              { emoji: '😰', label: 'Anxious', mood: 'anxious' as const, msg: "I'm feeling anxious right now 😰" },
              { emoji: '😤', label: 'Stressed', mood: 'stressed' as const, msg: "I'm feeling really stressed 😤" },
            ].map(({ emoji, label, mood, msg }) => (
              <button key={label} onClick={() => {
                // Save mood entry to localStorage
                const entries = JSON.parse(localStorage.getItem('mindflow_moodEntries') || '[]');
                entries.push({ id: crypto.randomUUID(), mood, createdAt: new Date().toISOString() });
                localStorage.setItem('mindflow_moodEntries', JSON.stringify(entries));
                setLocalStorage('kira_pending_mood', msg);
                dismiss();
                navigate('/chat');
              }} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-secondary transition-colors active:scale-90">
                <span className="text-2xl">{emoji}</span>
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <Button onClick={dismiss} variant="ghost" size="sm" className="w-full text-muted-foreground">
          <X className="w-4 h-4 mr-1" /> Continue to MindFlow
        </Button>
      </div>
    </div>
  );
}
