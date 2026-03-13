// Compact re-playable media player for a saved GeneratedMediaItem.
// • Video items  → opens GeneratedVideoPlayer (real <video> element from WebM blob)
// • Audio items  → Web Speech API TTS with progress bar
// Editing title, downloading script/video, and deleting work for all modes.

import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Pause, RotateCcw, Download, Trash2, Edit3, Check, X, Video, Headphones, Mic, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { TTSController, getAvailableVoices } from '@/lib/contentMediaEngine';
import { getVideoBlob, updateMediaTitle, deleteMediaItem, type GeneratedMediaItem } from '@/lib/mediaStorage';

const GeneratedVideoPlayer = lazy(() => import('@/components/GeneratedVideoPlayer'));

interface MediaPlayerProps {
  item: GeneratedMediaItem;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

const MODE_ICONS = {
  summary:   FileText,
  explainer: Headphones,
  podcast:   Mic,
  video:     Video,
};

const MODE_COLORS = {
  summary:   'hsl(199,89%,48%)',
  explainer: 'hsl(245,58%,62%)',
  podcast:   'hsl(340,82%,52%)',
  video:     'hsl(291,64%,42%)',
};

export default function MediaPlayer({ item, onDelete, compact = false }: MediaPlayerProps) {
  // ── Video state ────────────────────────────────────────────────────────────
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);

  // ── TTS state (audio-only modes) ──────────────────────────────────────────
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused]   = useState(false);
  const [chunk, setChunk]     = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const ttsRef = useRef<TTSController | null>(null);

  // ── Title editing ──────────────────────────────────────────────────────────
  const [editing, setEditing]   = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [title, setTitle]       = useState(item.title);

  const Icon  = MODE_ICONS[item.mode];
  const color = MODE_COLORS[item.mode];
  const isVideoItem = item.mode === 'video' && item.hasVideoBlob;

  // ── TTS helpers ────────────────────────────────────────────────────────────
  const handlePlayTTS = () => {
    if (paused && ttsRef.current) {
      ttsRef.current.resume();
      setPlaying(true);
      setPaused(false);
      return;
    }
    ttsRef.current?.stop();

    const voices = getAvailableVoices();
    const voice  = voices.find(v => v.name === item.voiceName || v.voiceURI === item.voiceName)
      ?? voices.find(v => v.lang.startsWith(item.language?.slice(0, 2) ?? 'en'))
      ?? null;

    const ctrl = new TTSController({
      voice,
      rate:  item.voiceRate  ?? 1,
      pitch: item.voicePitch ?? 1,
      lang:  item.language   ?? 'en-US',
      onChunkStart: (idx, total) => {
        setChunk(idx + 1);
        setTotalChunks(total);
      },
      onEnd: () => {
        setPlaying(false);
        setPaused(false);
        setChunk(0);
      },
      onError: (msg) => { toast.error(msg); setPlaying(false); },
    });
    ttsRef.current = ctrl;
    ctrl.start(item.script);
    setPlaying(true);
    setPaused(false);
    setChunk(0);
  };

  const handlePauseTTS = () => {
    ttsRef.current?.pause();
    setPlaying(false);
    setPaused(true);
  };

  const handleStopTTS = () => {
    ttsRef.current?.stop();
    setPlaying(false);
    setPaused(false);
    setChunk(0);
  };

  useEffect(() => () => { ttsRef.current?.stop(); }, []); // eslint-disable-line

  // ── Title & delete ─────────────────────────────────────────────────────────
  const handleSaveTitle = () => {
    updateMediaTitle(item.id, editTitle);
    setTitle(editTitle);
    setEditing(false);
  };

  const handleDelete = () => {
    ttsRef.current?.stop();
    deleteMediaItem(item.id);
    onDelete?.(item.id);
  };

  // ── Downloads ──────────────────────────────────────────────────────────────
  const handleDownloadScript = () => {
    const blob = new Blob([`${title}\n\n${item.script}`], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${item.sourceName.replace(/\s+/g, '_')}_${item.mode}_script.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadVideo = async () => {
    const blob = await getVideoBlob(item.id, item.videoMimeType ?? 'video/webm');
    if (!blob) { toast.error('Video file not found'); return; }
    const ext = (item.videoMimeType ?? 'video/webm').includes('mp4') ? 'mp4' : 'webm';
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${item.sourceName.replace(/\s+/g, '_')}_video.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const fmtDur = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };
  const date = new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  // ── Compact variant ────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className="flex items-center gap-2 py-2 border-b border-border/30 last:border-0">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{title}</p>
          <p className="text-[10px] text-muted-foreground">{fmtDur(item.estimatedDuration)} · {date}</p>
        </div>
        <div className="flex gap-1">
          {isVideoItem ? (
            <button onClick={() => setVideoPlayerOpen(true)} className="p-1 rounded-lg hover:bg-primary/10 text-primary transition-colors">
              <Play className="w-3.5 h-3.5" />
            </button>
          ) : !playing ? (
            <button onClick={handlePlayTTS} className="p-1 rounded-lg hover:bg-primary/10 text-primary transition-colors">
              <Play className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button onClick={handlePauseTTS} className="p-1 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
              <Pause className="w-3.5 h-3.5" />
            </button>
          )}
          {!isVideoItem && (playing || paused) && (
            <button onClick={handleStopTTS} className="p-1 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
              <Square className="w-3 h-3" />
            </button>
          )}
        </div>
        {videoPlayerOpen && (
          <Suspense fallback={null}>
            <AnimatePresence>
              <GeneratedVideoPlayer item={item} onClose={() => setVideoPlayerOpen(false)} />
            </AnimatePresence>
          </Suspense>
        )}
      </div>
    );
  }

  // ── Full variant ───────────────────────────────────────────────────────────
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-4 space-y-3"
      >
        {/* Header */}
        <div className="flex items-start gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditing(false); }}
                  className="flex-1 text-sm bg-secondary/40 rounded-lg px-2 py-0.5 border border-border/50 outline-none focus:ring-1 focus:ring-primary/50"
                />
                <button onClick={handleSaveTitle} className="p-1 text-success"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setEditing(false)} className="p-1 text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-start gap-1">
                <p className="text-sm font-semibold leading-tight flex-1">{title}</p>
                <button onClick={() => { setEditTitle(title); setEditing(true); }} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {item.mode} · {item.sourceName} · ~{fmtDur(item.estimatedDuration)} · {item.wordCount.toLocaleString()} words · {date}
            </p>
          </div>
        </div>

        {/* Video thumbnail / preview card */}
        {isVideoItem && (
          <button
            onClick={() => setVideoPlayerOpen(true)}
            className="w-full rounded-xl overflow-hidden border border-violet-500/20 bg-black relative group"
            style={{ aspectRatio: '16/9' }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 group-hover:bg-black/40 transition-colors">
              <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-7 h-7 text-white fill-current ml-1" />
              </div>
              <p className="text-white/70 text-xs font-medium">Tap to play video</p>
            </div>
            {/* Gradient background for thumbnail */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/60 via-indigo-900/40 to-black/80 -z-0" />
            <Video className="absolute bottom-3 right-3 w-5 h-5 text-white/20" />
          </button>
        )}

        {/* Playback controls — video mode opens player, audio mode uses TTS */}
        {isVideoItem ? (
          <Button
            size="sm"
            onClick={() => setVideoPlayerOpen(true)}
            className="w-full rounded-xl h-9 gap-2 text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Play Video
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            {!playing ? (
              <Button size="sm" onClick={handlePlayTTS} className="flex-1 rounded-xl h-8 gap-1.5 text-xs">
                <Play className="w-3.5 h-3.5" /> {paused ? 'Resume' : 'Play Audio'}
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={handlePauseTTS} className="flex-1 rounded-xl h-8 gap-1.5 text-xs">
                <Pause className="w-3.5 h-3.5" /> Pause
              </Button>
            )}
            {(playing || paused) && (
              <Button size="sm" variant="ghost" onClick={handleStopTTS} className="rounded-xl h-8 w-8 p-0">
                <Square className="w-3 h-3" />
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => { handleStopTTS(); setTimeout(handlePlayTTS, 100); }} className="rounded-xl h-8 w-8 p-0" title="Restart">
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* TTS progress bar (audio modes only) */}
        {!isVideoItem && playing && totalChunks > 0 && (
          <div className="space-y-1">
            <div className="w-full bg-secondary rounded-full h-1">
              <div className="bg-primary h-1 rounded-full transition-all" style={{ width: `${(chunk / totalChunks) * 100}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground text-right">{chunk}/{totalChunks} segments</p>
          </div>
        )}

        {/* Download / delete */}
        <div className="flex items-center gap-1.5">
          <button onClick={handleDownloadScript} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary/60">
            <Download className="w-3 h-3" /> Script
          </button>
          {item.hasVideoBlob && (
            <button onClick={handleDownloadVideo} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary/60">
              <Download className="w-3 h-3" /> Video
            </button>
          )}
          <div className="flex-1" />
          <button onClick={handleDelete} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-lg hover:bg-destructive/10">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      </motion.div>

      {/* Full-screen video player */}
      {videoPlayerOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[120] bg-black flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        }>
          <AnimatePresence>
            <GeneratedVideoPlayer item={item} onClose={() => setVideoPlayerOpen(false)} />
          </AnimatePresence>
        </Suspense>
      )}
    </>
  );
}
