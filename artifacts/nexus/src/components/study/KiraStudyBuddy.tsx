import { useState, useRef, useEffect, useCallback } from 'react';
import { logError } from '@/lib/logger';
import { useLocalStorage, isDemoMode } from '@/hooks/useLocalStorage';
import { studyAIChat, type StudyAIMessage } from '@/lib/studyAI';
import { GraduationCap, X, Send, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageDataUrl?: string; // base64 data URL for attached images
  createdAt: string;
}

const STUDY_BUDDY_SYSTEM = `You are "Study AI" 🎓 — a friendly, smart study companion for students. You help with homework, explain concepts, solve problems, and answer questions about study materials.

RULES:
- Be concise but thorough. Use clear explanations with examples.
- For math/science: Show step-by-step solutions.
- For languages: Explain grammar, vocabulary, and provide examples.
- For any subject: Break down complex topics into simple parts.
- If an image is described, analyze it and answer based on the visual content.
- Use emojis naturally but sparingly (1-2 per message).
- Keep responses focused and under 300 words unless a detailed explanation is needed.
- Never say "I'm an AI" — you are Study AI, a study companion.
- Be encouraging and supportive. Help build confidence in learning.
- If you don't know something, say so honestly and suggest where to look.`;

interface Props {
  /** Optional context about what material is currently being read */
  materialContext?: string;
  /** Material name for context */
  materialName?: string;
  /** Whether the reader is in landscape/rotated mode */
  landscapeMode?: boolean;
}

export default function KiraStudyBuddy({ materialContext, materialName, landscapeMode }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useLocalStorage<ChatMsg[]>('studyBuddyMessages', []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const sendMessage = async () => {
    if (isDemoMode) {
      toast.error('Study AI is disabled in demo mode.');
      return;
    }
    const text = input.trim();
    if (!text) return;
    if (loading) return;

    // Build user message
    const userContent = text;

    const userMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userContent,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build AI messages
      const aiMessages: StudyAIMessage[] = [
        { role: 'system', content: STUDY_BUDDY_SYSTEM + (materialContext ? `\n\nThe student is currently reading: "${materialName || 'a study material'}". Here is some context from the material:\n${materialContext.slice(0, 1500)}` : '') },
      ];

      // Include last 10 messages for context
      const recentMsgs = [...messages.slice(-10), userMsg];
      for (const m of recentMsgs) {
        let content = m.content;
        // Legacy support: if an old message had an image URL, add a note
        if (m.imageDataUrl) {
          content = `[The student shared an image/screenshot for reference] ${content}`;
        }
        aiMessages.push({ role: m.role, content });
      }

      const reply = await studyAIChat(aiMessages, { maxTokens: 800 });

      const assistantMsg: ChatMsg = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply,
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      toast.error('Failed to get response. Please try again.');
      logError('Study buddy error', err);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success('Chat cleared');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* FAB toggle */}
      <button
        data-tour="study-buddy-fab"
        onClick={() => setOpen(!open)}
        className={`${landscapeMode ? 'absolute' : 'fixed'} z-[110] w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${open ? 'bg-destructive text-destructive-foreground' : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
          }`}
        style={landscapeMode
          ? { bottom: '1rem', left: '1rem' }
          : { bottom: '7.5rem', right: 'max(1rem, calc((100vw - 480px) / 2 + 1rem))' }
        }
        title="Study AI"
      >
        {open ? <X className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`${landscapeMode ? 'absolute' : 'fixed'} z-[110] rounded-2xl border shadow-2xl flex flex-col overflow-hidden`}
            style={{
              ...(landscapeMode
                ? { bottom: '4rem', left: '1rem', width: 'min(340px, 50%)', height: 'min(60%, 400px)' }
                : { bottom: '8.5rem', right: '0.75rem', width: 'calc(100vw - 24px)', maxWidth: '24rem', height: 'min(70vh, 520px)' }
              ),
              background: 'hsl(var(--card))',
              borderColor: 'hsl(var(--border))',
            }}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground">Study AI</h3>
                <p className="text-[10px] text-muted-foreground">🎓 Homework help & study companion</p>
              </div>
              <button onClick={clearChat} className="p-1.5 rounded-lg hover:bg-secondary" title="Clear chat">
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground" title="Close chat">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2 opacity-60">
                  <GraduationCap className="w-8 h-8 text-emerald-500" />
                  <p className="text-xs text-center text-muted-foreground">
                    {isDemoMode ? (
                      <>
                        <strong>Study AI</strong> 🎓<br />
                        AI features are disabled in demo mode.
                      </>
                    ) : (
                      <>
                        Hi! I'm <strong>Study AI</strong> 🎓<br />
                        Ask me anything about your lessons,<br />
                        homework, or attach a screenshot!
                      </>
                    )}
                  </p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-secondary text-secondary-foreground rounded-bl-sm'
                      }`}
                  >
                    {msg.imageDataUrl && (
                      <img
                        src={msg.imageDataUrl}
                        alt="Attached"
                        className="rounded-lg mb-2 max-h-32 object-contain w-full"
                      />
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <span className="block text-[9px] mt-1 opacity-50">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="border-t px-3 py-2 flex items-end gap-2" style={{ borderColor: 'hsl(var(--border))' }}>
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your lesson..."
                className="min-h-[36px] max-h-[100px] text-xs resize-none border rounded-xl bg-background"
                rows={1}
              />
              <button
                onClick={sendMessage}
                disabled={loading || isDemoMode || !input.trim()}
                className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 shrink-0 self-end"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
