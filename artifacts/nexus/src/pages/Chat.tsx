import { useState, useRef, useEffect, useCallback } from 'react';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';
import { logError } from '@/lib/logger';
import { useLocalStorage, isDemoMode } from '@/hooks/useLocalStorage';
import { setLocalStorage } from '@/hooks/useLocalStorage';
import { ChatMessage } from '@/types';
import { getKiraGreeting } from '@/lib/kira';
import { chatWithKira, KIRA_SYSTEM_PROMPT, LongCatMessage } from '@/lib/longcat';
import { ArrowLeft, Send, Sparkles, Trash2, Volume2, VolumeX, WifiOff, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { audioRegistry } from '@/lib/audioRegistry';

const quickPrompts = [
  "Having a rough day 😓",
  "I need a motivation boost 💪",
  "Feeling anxious about something",
  "Help me get stuff done 🚀",
  "Can't sleep, brain won't shut up",
  "Just want to talk about my day",
];

/** Strip emojis for cleaner TTS output */
function stripEmojis(text: string): string {
  return text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').replace(/\s{2,}/g, ' ').trim();
}

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>('chat_messages', []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasGreeted] = useLocalStorage<boolean>('kira_chat_greeted', false);
  const [, setGreeted] = useLocalStorage<boolean>('kira_chat_greeted', false);


  useEffect(() => {
    if (!hasGreeted && messages.length === 0) {
      const greeting: ChatMessage = {
        id: crypto.randomUUID(), role: 'assistant',
        content: getKiraGreeting(),
        createdAt: new Date().toISOString(),
      };
      setMessages([greeting]);
      setGreeted(true);
    }
  }, [hasGreeted, messages.length, setMessages, setGreeted]);

  // Auto-send mood from greeting popup
  useEffect(() => {
    const pending = localStorage.getItem('mindflow_kira_pending_mood');
    if (pending) {
      const mood = JSON.parse(pending) as string;
      localStorage.removeItem('mindflow_kira_pending_mood');
      const timer = setTimeout(() => send(mood), 600);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => { audioRegistry.stopSpeech(); };
  }, []);

  const toggleSpeak = useCallback((msgId: string, text: string) => {
    if (speakingId === msgId) {
      audioRegistry.stopSpeech();
      setSpeakingId(null);
      return;
    }

    audioRegistry.stopSpeech();
    const cleaned = stripEmojis(text);
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to pick a nice female voice
    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Samantha') || v.name.includes('Google US English') ||
      v.name.includes('Microsoft Zira') || v.name.includes('Karen')
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(msgId);
    speechSynthesis.speak(utterance);
  }, [speakingId]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setLocalStorage('lastChatTimestamp', new Date().toISOString());
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text.trim(), createdAt: new Date().toISOString() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const historyForApi: LongCatMessage[] = [
        { role: 'system', content: KIRA_SYSTEM_PROMPT },
        ...updatedMessages.slice(-20).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      const aiResponse = await chatWithKira(historyForApi);

      const reply: ChatMessage = {
        id: crypto.randomUUID(), role: 'assistant',
        content: aiResponse,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, reply]);
    } catch (err) {
      logError('Chat API error', err);
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      const errorReply: ChatMessage = {
        id: crypto.randomUUID(), role: 'assistant',
        content: isOffline 
          ? "I'm having trouble reaching the network right now. 💜 Check your connection, and I'll be ready to chat as soon as you're back!"
          : "I'm having a little trouble connecting right now. 💜 Please try again in a moment — I'm still here for you!",
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorReply]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    speechSynthesis.cancel();
    setSpeakingId(null);
    setMessages([]);
    setGreeted(false);
  };

  return (
    <div className="px-4 pt-12 pb-4 flex flex-col h-[100dvh] max-h-[100dvh]">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display leading-tight" data-tour="chat-header">Kira</h1>
            <p className="text-[10px] text-muted-foreground">Your Personal Buddy ✨</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={clearChat}><Trash2 className="w-4 h-4 text-muted-foreground" /></Button>
        <button onClick={() => navigate('/')} className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title="Close chat">
          <X className="w-4 h-4" />
        </button>
      </div>

      <PageOnboardingTooltips pageId="chat" />


      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.length === 0 && (
          <div className="space-y-2 mt-4">
            <div className="text-center space-y-2 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto text-2xl">
                🌟
              </div>
              <h2 className="text-lg font-bold font-display">Hey, I'm Kira! 👋</h2>
              <p className="text-xs text-muted-foreground max-w-[280px] mx-auto">Your friend who actually listens. No judgment, no agenda — just real talk.</p>
            </div>
            <p className="text-xs text-muted-foreground text-center mb-3">Try talking to me about:</p>
            <div className="grid grid-cols-2 gap-2">
              {quickPrompts.map(q => (
                <button key={q} onClick={() => send(q)} className="glass rounded-xl p-2.5 text-left text-xs hover:bg-card/80 transition-colors">{q}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mr-2 mt-1 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
            )}
            <div className={`max-w-[75%] ${msg.role === 'user' ? '' : 'group'}`}>
              <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'glass'}`}>
                {msg.content}
              </div>
              {msg.role === 'assistant' && (
                <button
                  onClick={() => toggleSpeak(msg.id, msg.content)}
                  className={`mt-1 ml-1 flex items-center gap-1 text-[10px] transition-all ${speakingId === msg.id
                    ? 'text-primary'
                    : 'text-muted-foreground/60 hover:text-muted-foreground'
                    }`}
                >
                  {speakingId === msg.id ? (
                    <>
                      <VolumeX className="w-3 h-3" />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3 h-3" />
                      <span>Read aloud</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mr-2 mt-1 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <div className="glass rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder={isDemoMode ? "Interactive Demo - Chat Disabled" : "Talk to Kira..."}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send(input)}
          className="bg-secondary border-0 flex-1"
          disabled={loading || isDemoMode}
        />
        <button onClick={() => send(input)} disabled={loading || isDemoMode} className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center active:scale-90 disabled:opacity-50">
          <Send className="w-4 h-4 text-primary-foreground" />
        </button>
      </div>
    </div>
  );
}