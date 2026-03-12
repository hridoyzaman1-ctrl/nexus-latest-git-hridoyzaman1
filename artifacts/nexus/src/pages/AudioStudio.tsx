import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Headphones, Upload, FileText, Clipboard,
  X, Mic, BookOpen, ChevronRight, Trash2, RefreshCw,
  Sparkles, Loader2, Wand2,
} from 'lucide-react';
import Layout from '@/components/Layout';
import MediaGenerationModal from '@/components/MediaGenerationModal';
import MediaPlayer from '@/components/MediaPlayer';
import { getAllMediaItems, deleteMediaItem, type GeneratedMediaItem } from '@/lib/mediaStorage';
import { extractPdfText } from '@/lib/extractText';
import { chatWithStudioAI } from '@/lib/longcat';

interface StudioSource {
  id: string;
  name: string;
  type: 'pdf' | 'txt' | 'paste' | 'describe';
  text: string;
  wordCount: number;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { resolve((reader.result as string).split(',')[1]); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

type InputMode = 'upload' | 'paste' | 'describe';

export default function AudioStudio() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [source, setSource] = useState<StudioSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [pasteText, setPasteText] = useState('');
  const [describeText, setDescribeText] = useState('');
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSourceId, setModalSourceId] = useState('');
  const [items, setItems] = useState<GeneratedMediaItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const refreshItems = useCallback(() => {
    setItems(getAllMediaItems().filter(m => m.sourceModule === 'audio-studio'));
  }, []);

  useEffect(() => { refreshItems(); }, [refreshItems]);

  const processFile = async (file: File) => {
    if (!file.name.match(/\.(pdf|txt|md)$/i)) { setError('Only PDF, TXT, or MD files are supported.'); return; }
    setLoading(true); setError(null);
    try {
      const name = file.name.replace(/\.[^.]+$/, '');
      let text = file.name.toLowerCase().endsWith('.pdf')
        ? await extractPdfText(await fileToBase64(file), undefined, 1, 9999)
        : await fileToText(file);
      if (!text.trim()) throw new Error('No readable text found in this file.');
      setSource({ id: `as-${Date.now()}`, name, type: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt', text, wordCount: countWords(text) });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to read file.');
    } finally { setLoading(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handlePasteConfirm = () => {
    const text = pasteText.trim();
    if (!text) return;
    setSource({ id: `as-${Date.now()}`, name: 'Pasted Content', type: 'paste', text, wordCount: countWords(text) });
    setPasteText('');
    setInputMode('upload');
  };

  const handleDescribeEnhance = async () => {
    const desc = describeText.trim();
    if (!desc) return;
    setAiEnhancing(true); setAiHint(null); setError(null);
    try {
      const script = await chatWithStudioAI([
        {
          role: 'system',
          content: `You are a professional content writer and scriptwriter. The user will give you a description of what they want to create as an audio script. Write a comprehensive, well-structured, engaging script covering the topic thoroughly. Use clear headings, flowing prose, and an educational yet conversational tone. Aim for 400-700 words. Do NOT include speaker names, stage directions, or meta-commentary — just the script content itself.`,
        },
        {
          role: 'user',
          content: `Write a full audio script for: ${desc}`,
        },
      ], { maxTokens: 1200, temperature: 0.72 });
      const title = desc.length > 55 ? desc.slice(0, 55) + '…' : desc;
      setSource({ id: `as-${Date.now()}`, name: title, type: 'describe', text: script, wordCount: countWords(script) });
      setDescribeText('');
      setInputMode('upload');
    } catch {
      setError('AI generation failed. Check your connection and try again, or use your description as-is.');
      setAiHint(null);
    } finally { setAiEnhancing(false); }
  };

  const handleUseDescriptionAsIs = () => {
    const text = describeText.trim();
    if (!text) return;
    setSource({ id: `as-${Date.now()}`, name: text.slice(0, 55), type: 'describe', text, wordCount: countWords(text) });
    setDescribeText('');
    setInputMode('upload');
  };

  const openModal = () => {
    if (!source) return;
    setModalSourceId(source.id);
    setModalOpen(true);
  };

  const getSourceText = useCallback(async (_f: number, _t: number): Promise<string> => source?.text ?? '', [source]);

  const handleDelete = (id: string) => {
    deleteMediaItem(id);
    refreshItems();
    if (expandedId === id) setExpandedId(null);
  };

  const modeIcon = { summary: FileText, explainer: BookOpen, podcast: Mic };

  const inputTabs: { id: InputMode; label: string; icon: typeof Upload }[] = [
    { id: 'upload', label: 'Upload File', icon: Upload },
    { id: 'paste', label: 'Paste Text', icon: Clipboard },
    { id: 'describe', label: 'Describe', icon: Sparkles },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-background pb-24" data-tour="audio-studio-page">
        <div className="px-4 pt-4 pb-2 flex items-center gap-3" data-tour="audio-studio-header">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Headphones className="w-4 h-4 text-blue-500" />
              </div>
              <h1 className="text-xl font-bold">Audio Studio</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Upload, paste, or describe → generate narrated audio</p>
          </div>
        </div>

        <div className="px-4 space-y-3 mt-2">
          {aiHint && (
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-2.5 text-xs text-blue-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              {aiHint}
              <button onClick={() => setAiHint(null)} className="ml-auto"><X className="w-3 h-3" /></button>
            </div>
          )}

          {/* Input mode tabs */}
          {!source && (
            <div className="flex rounded-xl bg-muted/50 p-1 gap-1" data-tour="audio-studio-input-tabs">
              {inputTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setInputMode(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${inputMode === tab.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Upload tab */}
          {!source && inputMode === 'upload' && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                data-tour="audio-studio-upload"
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragging ? 'border-blue-400 bg-blue-500/10' : 'border-border hover:border-blue-400/60 hover:bg-muted/40'}`}
              >
                <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md" className="hidden" onChange={handleFileInput} />
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    <p className="text-sm text-muted-foreground">Extracting text…</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/15 flex items-center justify-center">
                      <Upload className="w-7 h-7 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-base">Drop a file or tap to upload</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, TXT, or Markdown · any size</p>
                    </div>
                  </div>
                )}
              </div>
              {error && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0" />{error}
                </div>
              )}
            </>
          )}

          {/* Paste tab */}
          {!source && inputMode === 'paste' && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-medium">Paste your text</p>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder="Paste your document, article, or notes here…"
                className="w-full h-44 bg-muted/50 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                autoFocus
              />
              <button
                onClick={handlePasteConfirm}
                disabled={!pasteText.trim()}
                className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
              >
                Use This Text
              </button>
            </div>
          )}

          {/* Describe tab */}
          {!source && inputMode === 'describe' && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3" data-tour="audio-studio-describe">
              <div>
                <p className="text-sm font-semibold">Describe what you want</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tell us the topic and Kira will write the full script for you</p>
              </div>
              <textarea
                value={describeText}
                onChange={e => setDescribeText(e.target.value)}
                placeholder="e.g. &quot;A 5-minute audio summary about black holes for high school students&quot; or &quot;An explainer about the French Revolution with key dates and causes&quot;"
                className="w-full h-36 bg-muted/50 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                autoFocus
              />
              {error && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive flex items-center gap-1.5">
                  <X className="w-3.5 h-3.5 shrink-0" />{error}
                </div>
              )}
              <button
                onClick={handleDescribeEnhance}
                disabled={!describeText.trim() || aiEnhancing}
                className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {aiEnhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {aiEnhancing ? 'Kira is writing your script…' : '✨ Generate Script with AI'}
              </button>
              <button
                onClick={handleUseDescriptionAsIs}
                disabled={!describeText.trim() || aiEnhancing}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Or use my description as-is (skip AI)
              </button>
            </div>
          )}

          {/* Source card (loaded content) */}
          {source && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3" data-tour="audio-studio-source">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                  {source.type === 'describe' ? <Sparkles className="w-5 h-5 text-blue-500" /> : <FileText className="w-5 h-5 text-blue-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{source.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {source.wordCount.toLocaleString()} words ·{' '}
                    {source.type === 'describe' ? 'AI Generated' : source.type === 'paste' ? 'Pasted' : source.type.toUpperCase()}
                  </p>
                </div>
                <button onClick={() => setSource(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3 max-h-20 overflow-hidden line-clamp-3">
                {source.text.slice(0, 300)}…
              </div>
              <button
                onClick={openModal}
                data-tour="audio-studio-generate"
                className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Headphones className="w-4 h-4" />
                Generate Audio
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Generated items */}
          {items.length > 0 && (
            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Generated ({items.length})</h2>
                <button onClick={refreshItems} className="p-1 rounded hover:bg-muted">
                  <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
              {items.map(item => (
                <div key={item.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                  {expandedId === item.id ? (
                    <div className="p-1">
                      <MediaPlayer item={item} onDelete={() => handleDelete(item.id)} />
                      <button onClick={() => setExpandedId(null)} className="w-full py-2 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
                        ↑ Collapse
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setExpandedId(item.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                        {(() => { const Icon = modeIcon[item.mode as keyof typeof modeIcon] ?? Headphones; return <Icon className="w-4 h-4 text-blue-500" />; })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{item.mode} · {item.wordCount} words</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); handleDelete(item.id); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalOpen && source && (
        <MediaGenerationModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); refreshItems(); }}
          sourceId={modalSourceId}
          sourceName={source.name}
          sourceModule="audio-studio"
          getSourceText={getSourceText}
          totalPages={0}
          initialMode="summary"
        />
      )}
    </Layout>
  );
}
