import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Video, Upload, FileText, Clipboard,
  X, Film, Play, RefreshCw, Trash2, ChevronRight,
  Sparkles, Loader2, Wand2,
} from 'lucide-react';
import MediaGenerationModal from '@/components/MediaGenerationModal';
import MediaPlayer from '@/components/MediaPlayer';
import { getAllMediaItems, deleteMediaItem, type GeneratedMediaItem } from '@/lib/mediaStorage';
import { extractPdfText } from '@/lib/extractText';
import { chatWithStudioAI } from '@/lib/longcat';
import { sanitiseAIScript } from '@/lib/contentMediaEngine';

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

export default function VideoStudio() {
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
  const [language, setLanguage] = useState<'en' | 'bn'>('en');

  // Two-step script preview
  const [selectedMode, setSelectedMode] = useState<'video' | 'summary' | 'explainer' | 'podcast'>('video');
  const [aiScript, setAiScript] = useState<string | null>(null);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [modalPreScript, setModalPreScript] = useState<string | undefined>(undefined);

  const refreshItems = useCallback(() => {
    setItems(getAllMediaItems().filter(m => m.sourceModule === 'video-studio'));
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
      setSource({ id: `vs-${Date.now()}`, name, type: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt', text, wordCount: countWords(text) });
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
    setSource({ id: `vs-${Date.now()}`, name: 'Pasted Content', type: 'paste', text, wordCount: countWords(text) });
    setPasteText('');
    setInputMode('upload');
  };

  const handleDescribeEnhance = async () => {
    const desc = describeText.trim();
    if (!desc) return;
    setAiEnhancing(true); setAiHint(null); setError(null);
    try {
      const raw = await chatWithStudioAI([
        {
          role: 'system',
          content: `You are a text-to-speech narrator for a visual slideshow. Output ONLY the exact words that will be spoken aloud — nothing else whatsoever.

STRICT RULES — violations will break the audio:
- Pure natural spoken prose only, exactly as a narrator would say it
- NO markdown of any kind: no **, *, #, _, -, bullet points
- NO stage directions, visual directions, or production notes
- NO brackets [] or parentheses () containing instructions or metadata
- NO title card, preamble, or intro like "Here is your script", "Video Script:", "Script for..."
- NO metadata: no duration, word count, or labels
- NO quotes around the title when you mention it
- Begin immediately with the first spoken sentence of the narration
- Organise naturally into 5–8 clear topic sections with smooth spoken transitions
- Each section should be 2–4 sentences long
- Aim for 400–600 words total${language === 'bn' ? '\n- Write ENTIRELY in Bangla (Bengali language, বাংলা). Every single word must be in Bangla script. Do not use any English words.' : ''}`,
        },
        {
          role: 'user',
          content: `Write a narration about: ${desc}`,
        },
      ], { maxTokens: 1200, temperature: 0.7 });
      const script = sanitiseAIScript(raw);
      const title = desc.length > 55 ? desc.slice(0, 55) + '…' : desc;
      setSource({ id: `vs-${Date.now()}`, name: title, type: 'describe', text: script, wordCount: countWords(script) });
      setDescribeText('');
      setInputMode('upload');
    } catch {
      setError('AI generation failed. Check your connection and try again, or use your description as-is.');
    } finally { setAiEnhancing(false); }
  };

  const handleUseDescriptionAsIs = () => {
    const text = describeText.trim();
    if (!text) return;
    setSource({ id: `vs-${Date.now()}`, name: text.slice(0, 55), type: 'describe', text, wordCount: countWords(text) });
    setDescribeText('');
    setInputMode('upload');
  };

  const handleGenerateAIScript = async () => {
    if (!source) return;
    setGeneratingScript(true);
    setAiScript(null);
    setScriptError(null);
    const modeInstructions: Record<string, string> = {
      video:    'Write flowing spoken narration for a visual slideshow (3-4 minutes when read aloud). Organise into 5-8 clear sections with smooth transitions.',
      summary:  'Write a concise spoken summary (2-3 minutes when read aloud). Cover all main points clearly.',
      explainer:'Write a structured spoken explainer (4-5 minutes when read aloud). Walk through key concepts step by step.',
      podcast:  'Write an engaging conversational podcast episode (6-8 minutes when read aloud). Sound natural and enthusiastic.',
    };
    const langNote = language === 'bn' ? '\nWrite ENTIRELY in Bangla (বাংলা). Every single word must be in Bangla script.' : '';
    try {
      const raw = await chatWithStudioAI([
        {
          role: 'system',
          content: `You are a professional script writer.
STRICT RULES:
- Write ONLY the exact words spoken aloud
- Do NOT include titles, file names, "Script:", preambles, or markdown
- Do NOT use asterisks, hyphens, bullets, or formatting characters
- Do NOT include [stage directions] or (production notes)
- Begin IMMEDIATELY with the first spoken sentence
- ${modeInstructions[selectedMode]}${langNote}`,
        },
        { role: 'user', content: `CONTENT:\n${source.text.slice(0, 6000)}` },
      ], { maxTokens: 2000, temperature: 0.7 });
      setAiScript(sanitiseAIScript(raw));
    } catch {
      setScriptError('AI script generation failed. You can still generate directly below.');
    } finally {
      setGeneratingScript(false);
    }
  };

  const openModalWithScript = () => {
    if (!source) return;
    setModalSourceId(source.id);
    setModalPreScript(aiScript ?? undefined);
    setModalOpen(true);
  };

  const openModalDirect = () => {
    if (!source) return;
    setModalSourceId(source.id);
    setModalPreScript(undefined);
    setModalOpen(true);
  };

  const getSourceText = useCallback(async (_f: number, _t: number): Promise<string> => source?.text ?? '', [source]);

  const handleDelete = (id: string) => {
    deleteMediaItem(id);
    refreshItems();
    if (expandedId === id) setExpandedId(null);
  };

  const inputTabs: { id: InputMode; label: string; icon: typeof Upload }[] = [
    { id: 'upload', label: 'Upload File', icon: Upload },
    { id: 'paste', label: 'Paste Text', icon: Clipboard },
    { id: 'describe', label: 'Describe', icon: Sparkles },
  ];

  return (
    <>
      <div className="min-h-screen bg-background pb-24" data-tour="video-studio-page">
        <div className="px-4 pt-4 pb-2 flex items-center gap-3" data-tour="video-studio-header">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Video className="w-4 h-4 text-purple-500" />
              </div>
              <h1 className="text-xl font-bold">Video Studio</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Upload, paste, or describe → generate visual slideshow video</p>
          </div>
          <div className="flex items-center bg-muted/60 rounded-xl p-0.5 gap-0.5 flex-shrink-0">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${language === 'en' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}
            >EN</button>
            <button
              onClick={() => setLanguage('bn')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${language === 'bn' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}
            >বাংলা</button>
          </div>
        </div>

        <div className="px-4 space-y-3 mt-2">
          {aiHint && (
            <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 px-4 py-2.5 text-xs text-purple-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              {aiHint}
              <button onClick={() => setAiHint(null)} className="ml-auto"><X className="w-3 h-3" /></button>
            </div>
          )}

          {/* Input mode tabs */}
          {!source && (
            <div className="flex rounded-xl bg-muted/50 p-1 gap-1" data-tour="video-studio-input-tabs">
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
                data-tour="video-studio-upload"
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragging ? 'border-purple-400 bg-purple-500/10' : 'border-border hover:border-purple-400/60 hover:bg-muted/40'}`}
              >
                <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md" className="hidden" onChange={handleFileInput} />
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
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
                        <span key={tag} className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-medium border border-purple-500/20">{tag}</span>
                      ))}
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
                className="w-full h-44 bg-muted/50 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                autoFocus
              />
              <button
                onClick={handlePasteConfirm}
                disabled={!pasteText.trim()}
                className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
              >
                Use This Text
              </button>
            </div>
          )}

          {/* Describe tab */}
          {!source && inputMode === 'describe' && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3" data-tour="video-studio-describe">
              <div>
                <p className="text-sm font-semibold">Describe your video</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tell us what you want and Kira will create a scene-by-scene script</p>
              </div>
              <textarea
                value={describeText}
                onChange={e => setDescribeText(e.target.value)}
                placeholder="e.g. &quot;A 5-slide video about how photosynthesis works, for middle school students&quot; or &quot;An intro video for a startup that makes eco-friendly packaging&quot;"
                className="w-full h-36 bg-muted/50 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/40"
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
                className="w-full py-3 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
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

          {/* Source card */}
          {source && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3" data-tour="video-studio-source">
              {/* Source info */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
                  {source.type === 'describe' ? <Sparkles className="w-5 h-5 text-purple-500" /> : <FileText className="w-5 h-5 text-purple-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{source.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {source.wordCount.toLocaleString()} words ·{' '}
                    {source.type === 'describe' ? 'AI Generated' : source.type === 'paste' ? 'Pasted' : source.type.toUpperCase()}
                  </p>
                </div>
                <button onClick={() => { setSource(null); setAiScript(null); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3 max-h-16 overflow-hidden line-clamp-3">
                {source.text.slice(0, 280)}…
              </div>

              {/* Mode selector */}
              <div className="grid grid-cols-4 gap-1">
                {([
                  { id: 'video',    label: 'Video',    icon: Film },
                  { id: 'summary',  label: 'Summary',  icon: FileText },
                  { id: 'explainer',label: 'Explain',  icon: Play },
                  { id: 'podcast',  label: 'Podcast',  icon: Sparkles },
                ] as const).map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedMode(m.id); setAiScript(null); setScriptError(null); }}
                    className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-semibold transition-all border ${selectedMode === m.id ? 'bg-purple-500/10 border-purple-500/40 text-purple-400' : 'border-border/40 text-muted-foreground hover:border-purple-400/40'}`}
                  >
                    <m.icon className="w-3.5 h-3.5" />
                    {m.label}
                  </button>
                ))}
              </div>

              {/* AI script preview */}
              {!aiScript && (
                <>
                  {scriptError && (
                    <p className="text-[11px] text-destructive bg-destructive/10 rounded-lg px-3 py-2">{scriptError}</p>
                  )}
                  <button
                    onClick={handleGenerateAIScript}
                    disabled={generatingScript}
                    className="w-full py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 text-sm"
                  >
                    {generatingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {generatingScript ? 'AI is writing your script…' : `✨ Preview AI Script (${selectedMode})`}
                  </button>
                </>
              )}

              {aiScript && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-purple-400 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> AI Script Preview</span>
                    <button onClick={() => { setAiScript(null); setScriptError(null); }} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">↺ Regenerate</button>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3 max-h-32 overflow-y-auto text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {aiScript.slice(0, 600)}{aiScript.length > 600 ? '…' : ''}
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right">{aiScript.trim().split(/\s+/).length} words</p>
                </div>
              )}

              {/* Main CTA */}
              <button
                onClick={openModalWithScript}
                data-tour="video-studio-generate"
                className="w-full py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Film className="w-4 h-4" />
                {aiScript ? `Generate ${selectedMode === 'video' ? 'Video' : 'Audio'} from this Script` : `Generate ${selectedMode === 'video' ? 'Video' : 'Audio'}`}
                <ChevronRight className="w-4 h-4" />
              </button>

              {aiScript && (
                <button onClick={openModalDirect} className="w-full text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1">
                  Or generate with fresh AI (skip preview)
                </button>
              )}
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
                      <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
                        {item.mode === 'video' ? <Play className="w-4 h-4 text-purple-500" /> : <Film className="w-4 h-4 text-purple-500" />}
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
          onClose={() => { setModalOpen(false); setAiScript(null); refreshItems(); }}
          sourceId={modalSourceId}
          sourceName={source.name}
          sourceModule="video-studio"
          getSourceText={getSourceText}
          totalPages={0}
          initialMode={selectedMode}
          language={language}
          preGeneratedScript={modalPreScript}
        />
      )}
    </>
  );
}
