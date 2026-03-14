import { useState, useEffect } from 'react';
import { chatWithLongCat, type LongCatMessage } from '@/lib/longcat';
import { getLocalStorage, setLocalStorage, isDemoMode } from '@/hooks/useLocalStorage';
import { Sparkles, Loader2, Trash2, Save, X, BookOpen, Brain, MessageCircle, Download, Pencil, WifiOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export interface SavedAISummary {
  id: string;
  documentId: string;
  documentName: string;
  mode: 'summary' | 'detailed' | 'simple';
  pageRange: string;
  content: string;
  title: string;
  createdAt: string;
}

const MODES = [
  { id: 'summary' as const, label: '📋 Quick Summary', icon: BookOpen, desc: 'Key points & main topics' },
  { id: 'detailed' as const, label: '🔬 Deep Dive', icon: Brain, desc: 'Thorough explanation with details' },
  { id: 'simple' as const, label: '💡 ELI5 Breakdown', icon: MessageCircle, desc: 'Simple language with examples' },
];

function getModePrompt(mode: 'summary' | 'detailed' | 'simple'): string {
  const completionRule = `CRITICAL: Your response MUST end with a complete, properly punctuated sentence. The very last character must be a period, exclamation mark, question mark, or language-appropriate sentence terminator (e.g. । for Bangla). Never cut off mid-sentence, mid-word, or mid-thought under any circumstances. If space is running short, wrap up with a brief concluding sentence before stopping.`;
  switch (mode) {
    case 'summary':
      return `You are an expert summarizer. Provide a comprehensive summary covering ALL main topics, key points, and important takeaways from the given text. Use clear headings and bullet points. Be thorough but concise.\n\n${completionRule}`;
    case 'detailed':
      return `You are an expert educator. Provide a VERY detailed explanation of all concepts in the given text. Break down complex ideas, provide additional context, elaborate on key terms, explain relationships between concepts, and give thorough analysis. Use headings, subheadings, and structured formatting. Be as detailed and informative as possible.\n\n${completionRule}`;
    case 'simple':
      return `You are a friendly teacher who explains things so anyone can understand. Take the given text and explain ALL concepts in very simple, everyday language. Use real-world analogies, relatable examples, and a conversational tone. Imagine explaining to a curious friend who has no background in this topic. Make complex ideas feel easy and approachable. Use emojis sparingly to keep it friendly.\n\n${completionRule}`;
  }
}

interface Props {
  documentId: string;
  documentName: string;
  getPageText: (startPage: number, endPage: number) => Promise<string>;
  totalPages: number;
  isInReader?: boolean;
  landscapeMode?: boolean;
}

export default function AISummarizer({ documentId, documentName, getPageText, totalPages, isInReader = false, landscapeMode = false }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'summary' | 'detailed' | 'simple' | null>(null);
  const [pageStart, setPageStart] = useState('1');
  const [pageEnd, setPageEnd] = useState(String(Math.min(totalPages, 30)));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [saved, setSaved] = useState<SavedAISummary[]>([]);
  const [saveTitle, setSaveTitle] = useState('');
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');



  useEffect(() => {
    const all = getLocalStorage<SavedAISummary[]>('aiSummaries', []);
    setSaved(all.filter(s => s.documentId === documentId));
  }, [documentId]);

  const generate = async (selectedMode: 'summary' | 'detailed' | 'simple') => {
    if (isDemoMode) {
      toast.error('AI Summarization is disabled in demo mode.');
      return;
    }
    const start = Math.max(1, parseInt(pageStart) || 1);
    const end = Math.min(totalPages, parseInt(pageEnd) || totalPages);
    if (end - start + 1 > 30) { toast.error('Max 30 pages at a time.'); return; }
    if (start > end) { toast.error('Start page must be ≤ end page.'); return; }

    setMode(selectedMode);
    setLoading(true);
    setResult('');
    setSaveTitle('');

    try {
      const text = await getPageText(start, end);
      if (!text || text.trim().length < 20) {
        toast.error('Could not extract enough text from these pages.');
        setLoading(false);
        return;
      }
      // Image-based PDF detection
      if (text.startsWith('[Info]')) {
        toast.error('This is an image-based document (no text layer). AI cannot process images/comics/scanned files.', { duration: 5000 });
        setResult(text);
        setLoading(false);
        return;
      }

      const messages: LongCatMessage[] = [
        { role: 'system', content: getModePrompt(selectedMode) },
        { role: 'user', content: `Document: "${documentName}"\nPages ${start}-${end}:\n\n${text.slice(0, 8000)}` },
      ];

      const response = await chatWithLongCat(messages, { maxTokens: 1200, temperature: 0.4 });
      setResult(response);
    } catch { toast.error('AI generation failed. Please try again.'); }
    setLoading(false);
  };

  const saveResult = () => {
    if (!result || !mode) return;
    const title = saveTitle.trim() || `${MODES.find(m => m.id === mode)?.label} - ${documentName} (p${pageStart}-${pageEnd})`;
    const entry: SavedAISummary = {
      id: crypto.randomUUID(), documentId, documentName, mode,
      pageRange: `${pageStart}-${pageEnd}`, content: result, title,
      createdAt: new Date().toISOString(),
    };
    const all = getLocalStorage<SavedAISummary[]>('aiSummaries', []);
    const updated = [...all, entry];
    setLocalStorage('aiSummaries', updated);
    setSaved(updated.filter(s => s.documentId === documentId));
    toast.success('Saved!');
  };

  const deleteSaved = (id: string) => {
    const all = getLocalStorage<SavedAISummary[]>('aiSummaries', []);
    const updated = all.filter(s => s.id !== id);
    setLocalStorage('aiSummaries', updated);
    setSaved(updated.filter(s => s.documentId === documentId));
    toast('Deleted');
  };

  const downloadSaved = (s: SavedAISummary) => {
    const blob = new Blob([`${s.title}\n${'='.repeat(40)}\nMode: ${MODES.find(m => m.id === s.mode)?.label}\nPages: ${s.pageRange}\nDate: ${new Date(s.createdAt).toLocaleString()}\n\n${s.content}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${s.title}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const renameSaved = (id: string, newTitle: string) => {
    const all = getLocalStorage<SavedAISummary[]>('aiSummaries', []);
    const updated = all.map(s => s.id === id ? { ...s, title: newTitle.trim() || s.title } : s);
    setLocalStorage('aiSummaries', updated);
    setSaved(updated.filter(s => s.documentId === documentId));
    setEditingTitleId(null);
    toast.success('Renamed');
  };

  const modeLabel = mode ? MODES.find(m => m.id === mode)?.label : '';

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-full bg-gradient-to-r from-violet-500/15 to-fuchsia-500/15 text-violet-600 dark:text-violet-400 hover:from-violet-500/25 hover:to-fuchsia-500/25 transition-all font-medium"
        title="AI Summarizer & Explainer">
        <Sparkles className="w-3 h-3" />
        AI Summarize{saved.length > 0 ? ` (${saved.length})` : ''}
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
        className={`rounded-2xl border border-border overflow-hidden ${isInReader ? 'fixed inset-x-2 bottom-14 z-[150] max-h-[75vh] flex flex-col shadow-2xl bg-background' : 'bg-card shadow-lg'
          }`}
        style={landscapeMode && isInReader ? { bottom: '3.5rem', left: '0.5rem', right: '0.5rem' } : undefined}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 shrink-0">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span className="text-xs font-semibold flex-1">AI Summarizer & Explainer</span>
          {saved.length > 0 && (
            <button onClick={() => setShowSaved(!showSaved)} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-600">
              {showSaved ? 'New' : `Saved (${saved.length})`}
            </button>
          )}
          <button onClick={() => { setOpen(false); setResult(''); setMode(null); }} className="p-1 rounded-lg hover:bg-black/10 text-foreground/80 hover:text-foreground transition-colors" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-3 py-2.5 space-y-3" style={{ maxHeight: isInReader ? '60vh' : '400px' }}>
          {showSaved ? (
            <div className="space-y-2">
              {saved.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No saved summaries yet.</p>
              ) : (
                saved.map(s => (
                  <div key={s.id} className="rounded-xl border border-border p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      {editingTitleId === s.id ? (
                        <div className="flex items-center gap-1 flex-1">
                          <Input value={editTitleValue} onChange={e => setEditTitleValue(e.target.value)} className="h-6 text-[10px] flex-1 bg-background border border-border text-foreground focus-visible:ring-1" autoFocus onKeyDown={e => e.key === 'Enter' && renameSaved(s.id, editTitleValue)} />
                          <button onClick={() => renameSaved(s.id, editTitleValue)} className="p-0.5 text-success"><Save className="w-3 h-3" /></button>
                          <button onClick={() => setEditingTitleId(null)} className="p-0.5 text-muted-foreground"><X className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-semibold truncate flex-1">{s.title || `${MODES.find(m => m.id === s.mode)?.label} • Pages ${s.pageRange}`}</span>
                      )}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <span className="text-[9px] text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</span>
                        <button onClick={() => { setEditingTitleId(s.id); setEditTitleValue(s.title || ''); }} className="p-0.5 text-muted-foreground hover:text-primary" title="Rename">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => downloadSaved(s)} className="p-0.5 text-muted-foreground hover:text-primary" title="Download">
                          <Download className="w-3 h-3" />
                        </button>
                        <button onClick={() => deleteSaved(s.id)} className="p-0.5 text-muted-foreground hover:text-destructive" title="Delete">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[9px] text-muted-foreground">{MODES.find(m => m.id === s.mode)?.label} • Pages {s.pageRange}</p>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap text-foreground">{s.content}</p>
                  </div>
                ))
              )}
            </div>
          ) : result ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-semibold text-violet-600">{modeLabel} • Pages {pageStart}-{pageEnd}</span>
                <div className="flex-1" />
                <button onClick={() => { setResult(''); setMode(null); }} className="text-[10px] px-2 py-1 rounded-full bg-secondary text-muted-foreground">New</button>
              </div>
              {/* Save with name - at top */}
              <div className="flex items-center gap-2">
                <Input value={saveTitle} onChange={e => setSaveTitle(e.target.value)} placeholder="Name (optional)" className="h-7 text-[10px] flex-1 bg-background border border-border text-foreground focus-visible:ring-1" />
                <button onClick={saveResult} className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-success/15 text-success hover:bg-success/25 shrink-0">
                  <Save className="w-3 h-3" /> Save
                </button>
              </div>
              <div className="rounded-xl bg-secondary/50 p-3">
                <p className="text-xs leading-relaxed whitespace-pre-wrap text-foreground">{result}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Page Range (max 30 pages)</label>
                <div className="flex items-center gap-2">
                  <Input type="number" value={pageStart} onChange={e => setPageStart(e.target.value)} min={1} max={totalPages} className="h-8 text-xs w-20 bg-background border border-border text-foreground focus-visible:ring-1" placeholder="From" />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input type="number" value={pageEnd} onChange={e => setPageEnd(e.target.value)} min={1} max={totalPages} className="h-8 text-xs w-20 bg-background border border-border text-foreground focus-visible:ring-1" placeholder="To" />
                  <span className="text-[10px] text-muted-foreground">of {totalPages}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  Choose Analysis Type
                  {isDemoMode && <span className="text-destructive flex items-center gap-1">Demo Mode</span>}
                </label>
                <div className="space-y-1.5">
                  {MODES.map(m => (
                    <button key={m.id} onClick={() => generate(m.id)} disabled={loading || isDemoMode}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-violet-400/50 hover:bg-violet-500/5 transition-all text-left disabled:opacity-50">
                      <div className="p-1.5 rounded-lg bg-violet-500/10 shrink-0"><m.icon className="w-4 h-4 text-violet-500" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">{m.label}</p>
                        <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-2 py-6">
              <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
              <p className="text-xs text-muted-foreground">Analyzing pages {pageStart}-{pageEnd}…</p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
