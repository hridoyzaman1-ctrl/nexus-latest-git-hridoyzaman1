import { useState } from 'react';
import { getLocalStorage, setLocalStorage } from '@/hooks/useLocalStorage';
import { ChevronDown, ChevronUp, Trash2, Download, FileText, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { SavedAISummary } from '@/components/AISummarizer';

interface Props {
  documentId: string;
  notes?: { id: string; title: string; content: string; updatedAt: string }[];
  onDeleteNote?: (id: string) => void;
}

export default function SavedNotesAndSummaries({ documentId, notes = [], onDeleteNote }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [viewingContent, setViewingContent] = useState<{ title: string; content: string } | null>(null);
  const [summariesState, setSummariesState] = useState<SavedAISummary[]>(() =>
    getLocalStorage<SavedAISummary[]>('aiSummaries', []).filter(s => s.documentId === documentId)
  );

  const summaries = summariesState;
  const totalCount = summaries.length + notes.length;

  if (totalCount === 0) return null;

  const downloadFile = (title: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${title}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const deleteSummary = (id: string) => {
    const all = getLocalStorage<SavedAISummary[]>('aiSummaries', []);
    const updated = all.filter(s => s.id !== id);
    setLocalStorage('aiSummaries', updated);
    setSummariesState(updated.filter(s => s.documentId === documentId));
    toast('Summary deleted');
  };

  if (viewingContent) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[200] bg-background flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
          <button onClick={() => setViewingContent(null)} className="text-xs text-primary font-medium">← Back</button>
          <span className="text-xs font-semibold truncate flex-1">{viewingContent.title}</span>
          <button onClick={() => downloadFile(viewingContent.title, viewingContent.content)} className="p-1 text-muted-foreground hover:text-primary">
            <Download className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{viewingContent.content}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mt-2">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors w-full">
        <FileText className="w-3 h-3" />
        <span>Your Saved Notes & Summaries ({totalCount})</span>
        {expanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-1.5 space-y-1">
              {notes.map(note => (
                <div key={note.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-secondary/50 group">
                  <button onClick={() => setViewingContent({ title: note.title, content: note.content })} className="text-[10px] font-medium truncate flex-1 text-left hover:text-primary transition-colors">
                    📝 {note.title}
                  </button>
                  <span className="text-[8px] text-muted-foreground shrink-0">{new Date(note.updatedAt).toLocaleDateString()}</span>
                  <button onClick={() => setViewingContent({ title: note.title, content: note.content })} className="p-0.5 text-muted-foreground hover:text-primary" title="View note">
                    <Eye className="w-2.5 h-2.5" />
                  </button>
                  <button onClick={() => downloadFile(note.title, note.content)} className="p-0.5 text-muted-foreground hover:text-primary" title="Download">
                    <Download className="w-2.5 h-2.5" />
                  </button>
                  {onDeleteNote && (
                    <button onClick={() => onDeleteNote(note.id)} className="p-0.5 text-muted-foreground hover:text-destructive" title="Delete">
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))}
              {summaries.map(s => (
                <div key={s.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-violet-500/5 group">
                  <button onClick={() => setViewingContent({ title: s.title, content: s.content })} className="text-[10px] font-medium truncate flex-1 text-left hover:text-violet-600 transition-colors">
                    ✨ {s.title}
                  </button>
                  <span className="text-[8px] text-muted-foreground shrink-0">{new Date(s.createdAt).toLocaleDateString()}</span>
                  <button onClick={() => setViewingContent({ title: s.title, content: s.content })} className="p-0.5 text-muted-foreground hover:text-violet-600" title="View summary">
                    <Eye className="w-2.5 h-2.5" />
                  </button>
                  <button onClick={() => downloadFile(s.title, s.content)} className="p-0.5 text-muted-foreground hover:text-primary" title="Download">
                    <Download className="w-2.5 h-2.5" />
                  </button>
                  <button onClick={() => deleteSummary(s.id)} className="p-0.5 text-muted-foreground hover:text-destructive" title="Delete">
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
