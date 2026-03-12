import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Video, Upload, FileText, Clipboard,
  X, Film, Play, RefreshCw, Trash2, ChevronRight,
} from 'lucide-react';
import Layout from '@/components/Layout';
import MediaGenerationModal from '@/components/MediaGenerationModal';
import MediaPlayer from '@/components/MediaPlayer';
import { getAllMediaItems, deleteMediaItem, type GeneratedMediaItem } from '@/lib/mediaStorage';
import { extractPdfText } from '@/lib/extractText';

interface StudioSource {
  id: string;
  name: string;
  type: 'pdf' | 'txt' | 'paste';
  text: string;
  wordCount: number;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
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

export default function VideoStudio() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLTextAreaElement>(null);

  const [source, setSource] = useState<StudioSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSourceId, setModalSourceId] = useState('');
  const [items, setItems] = useState<GeneratedMediaItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const refreshItems = useCallback(() => {
    setItems(getAllMediaItems().filter(m => m.sourceModule === 'video-studio'));
  }, []);

  useEffect(() => { refreshItems(); }, [refreshItems]);

  const processFile = async (file: File) => {
    if (!file.name.match(/\.(pdf|txt|md)$/i)) {
      setError('Only PDF, TXT, or MD files are supported.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const name = file.name.replace(/\.[^.]+$/, '');
      let text = '';
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const base64 = await fileToBase64(file);
        text = await extractPdfText(base64, undefined, 1, 9999);
      } else {
        text = await fileToText(file);
      }
      if (!text.trim()) throw new Error('No readable text found in this file.');
      setSource({
        id: `vs-${Date.now()}`,
        name,
        type: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt',
        text,
        wordCount: countWords(text),
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to read file.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
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
    setSource({ id: `vs-${Date.now()}`, name: 'Pasted Content', type: 'paste', text, wordCount: countWords(text) });
    setPasteMode(false);
    setPasteText('');
  };

  const openModal = () => {
    if (!source) return;
    setModalSourceId(source.id);
    setModalOpen(true);
  };

  const getSourceText = useCallback(async (_f: number, _t: number): Promise<string> => {
    return source?.text ?? '';
  }, [source]);

  const handleDelete = (id: string) => {
    deleteMediaItem(id);
    refreshItems();
    if (expandedId === id) setExpandedId(null);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background pb-24">
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Video className="w-4 h-4 text-purple-500" />
              </div>
              <h1 className="text-xl font-bold">Video Studio</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload any document → generate visual slideshow video
            </p>
          </div>
        </div>

        <div className="px-4 space-y-4 mt-2">
          {!pasteMode ? (
            <>
              {!source ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    dragging
                      ? 'border-purple-400 bg-purple-500/10'
                      : 'border-border hover:border-purple-400/60 hover:bg-muted/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.md"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                  {loading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-muted-foreground">Extracting text…</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-purple-500/15 flex items-center justify-center">
                        <Upload className="w-7 h-7 text-purple-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-base">Drop a file or tap to upload</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, TXT, or Markdown · any size</p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center mt-1">
                        {['Scene-by-scene slides', 'Canvas animation', 'Downloadable WebM'].map(tag => (
                          <span key={tag} className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-medium border border-purple-500/20">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{source.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {source.wordCount.toLocaleString()} words · {source.type.toUpperCase()}
                      </p>
                    </div>
                    <button
                      onClick={() => setSource(null)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3 max-h-20 overflow-hidden line-clamp-3">
                    {source.text.slice(0, 300)}…
                  </div>
                  <button
                    onClick={openModal}
                    className="w-full py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Film className="w-4 h-4" />
                    Generate Video
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-center text-muted-foreground">
                    All 4 modes available · starts with Video mode
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {!source && (
                <button
                  onClick={() => setPasteMode(true)}
                  className="w-full py-3 rounded-xl border border-border hover:bg-muted/50 flex items-center justify-center gap-2 text-sm text-muted-foreground transition-colors"
                >
                  <Clipboard className="w-4 h-4" />
                  Or paste text directly
                </button>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">Paste your text</p>
                <button onClick={() => { setPasteMode(false); setPasteText(''); }} className="p-1.5 rounded-lg hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                ref={pasteRef}
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder="Paste your document text here…"
                className="w-full h-40 bg-muted/50 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setPasteMode(false); setPasteText(''); }}
                  className="flex-1 py-2.5 rounded-xl border border-border hover:bg-muted text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasteConfirm}
                  disabled={!pasteText.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
                >
                  Use This Text
                </button>
              </div>
            </div>
          )}

          {items.length > 0 && (
            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Generated ({items.length})
                </h2>
                <button onClick={refreshItems} className="p-1 rounded hover:bg-muted">
                  <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              {items.map(item => (
                <div key={item.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                  {expandedId === item.id ? (
                    <div className="p-1">
                      <MediaPlayer
                        item={item}
                        onDelete={() => handleDelete(item.id)}
                      />
                      <button
                        onClick={() => setExpandedId(null)}
                        className="w-full py-2 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
                      >
                        ↑ Collapse
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setExpandedId(item.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
                        {item.mode === 'video'
                          ? <Play className="w-4 h-4 text-purple-500" />
                          : <Film className="w-4 h-4 text-purple-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{item.mode} · {item.wordCount} words</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
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
          sourceModule="video-studio"
          getSourceText={getSourceText}
          totalPages={0}
          initialMode="video"
        />
      )}
    </Layout>
  );
}
