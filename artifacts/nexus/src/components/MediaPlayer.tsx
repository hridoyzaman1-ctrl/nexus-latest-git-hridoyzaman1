// Compact re-playable media player for a saved GeneratedMediaItem
// Audio: Web Speech API TTS
// Video: renders scenes on a canvas with TTS sync

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Pause, RotateCcw, Download, Trash2, Edit3, Check, X, Video, Headphones, Mic, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TTSController, getAvailableVoices, renderSceneToCanvas } from '@/lib/contentMediaEngine';
import { getVideoBlob, updateMediaTitle, deleteMediaItem, type GeneratedMediaItem } from '@/lib/mediaStorage';

interface MediaPlayerProps {
  item: GeneratedMediaItem;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

const MODE_ICONS = {
  summary: FileText,
  explainer: Headphones,
  podcast: Mic,
  video: Video,
};

const MODE_COLORS = {
  summary:   'hsl(199,89%,48%)',
  explainer: 'hsl(245,58%,62%)',
  podcast:   'hsl(340,82%,52%)',
  video:     'hsl(291,64%,42%)',
};

export default function MediaPlayer({ item, onDelete, compact = false }: MediaPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [chunk, setChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const ttsRef = useRef<TTSController | null>(null);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [title, setTitle] = useState(item.title);

  const [currentScene, setCurrentScene] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const Icon = MODE_ICONS[item.mode];
  const color = MODE_COLORS[item.mode];

  // Draw video scene when currentScene changes
  useEffect(() => {
    if (item.mode === 'video' && item.scenes && canvasRef.current) {
      const scene = item.scenes[currentScene];
      if (scene) renderSceneToCanvas(canvasRef.current, scene);
    }
  }, [currentScene, item.mode, item.scenes]);

  const handlePlay = () => {
    if (paused && ttsRef.current) {
      ttsRef.current.resume();
      setPlaying(true);
      setPaused(false);
      resumeSceneAdvance();
      return;
    }

    ttsRef.current?.stop();
    clearSceneTimer();

    const voices = getAvailableVoices();
    const voice = voices.find(v => v.name === item.voiceName || v.voiceURI === item.voiceName)
      ?? voices.find(v => v.lang.startsWith(item.language?.slice(0, 2) ?? 'en'))
      ?? null;

    const ctrl = new TTSController({
      voice,
      rate: item.voiceRate ?? 1,
      pitch: item.voicePitch ?? 1,
      lang: item.language ?? 'en-US',
      onChunkStart: (idx, total) => { setChunk(idx + 1); setTotalChunks(total); },
      onEnd: () => { setPlaying(false); setPaused(false); setChunk(0); clearSceneTimer(); },
      onError: (msg) => { toast.error(msg); setPlaying(false); clearSceneTimer(); },
    });
    ttsRef.current = ctrl;
    ctrl.start(item.script);
    setPlaying(true);
    setPaused(false);
    setChunk(0);

    // Advance scenes for video mode
    if (item.mode === 'video' && item.scenes && item.scenes.length > 0) {
      setCurrentScene(0);
      startSceneAdvance();
    }
  };

  const handlePause = () => {
    ttsRef.current?.pause();
    setPlaying(false);
    setPaused(true);
    clearSceneTimer();
  };

  const handleStop = () => {
    ttsRef.current?.stop();
    setPlaying(false);
    setPaused(false);
    setChunk(0);
    setCurrentScene(0);
    clearSceneTimer();
  };

  const startSceneAdvance = () => {
    if (!item.scenes || item.scenes.length === 0) return;
    let idx = 0;
    const advance = () => {
      idx = (idx + 1) % item.scenes!.length;
      setCurrentScene(idx);
    };
    const totalDur = item.scenes.reduce((acc, s) => acc + s.duration, 0) * 1000;
    const avgInterval = totalDur / item.scenes.length;
    sceneTimerRef.current = setInterval(advance, Math.max(3000, avgInterval));
  };

  const resumeSceneAdvance = () => {
    if (item.mode === 'video' && item.scenes && item.scenes.length > 0) {
      clearSceneTimer();
      startSceneAdvance();
    }
  };

  const clearSceneTimer = () => {
    if (sceneTimerRef.current) {
      clearInterval(sceneTimerRef.current);
      sceneTimerRef.current = null;
    }
  };

  useEffect(() => () => {
    ttsRef.current?.stop();
    clearSceneTimer();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleDownloadScript = () => {
    const blob = new Blob([`${title}\n\n${item.script}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.sourceName.replace(/\s+/g, '_')}_${item.mode}_script.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadVideo = async () => {
    const blob = await getVideoBlob(item.id, item.videoMimeType ?? 'video/webm');
    if (!blob) { toast.error('Video file not found'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.sourceName.replace(/\s+/g, '_')}_video.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmtDur = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const date = new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

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
          {!playing ? (
            <button onClick={handlePlay} className="p-1 rounded-lg hover:bg-primary/10 text-primary transition-colors">
              <Play className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button onClick={handlePause} className="p-1 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
              <Pause className="w-3.5 h-3.5" />
            </button>
          )}
          {(playing || paused) && (
            <button onClick={handleStop} className="p-1 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
              <Square className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
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

      {/* Video canvas preview */}
      {item.mode === 'video' && item.scenes && item.scenes.length > 0 && (
        <div className="rounded-xl overflow-hidden border border-border/30 bg-black" style={{ aspectRatio: '16/9' }}>
          <canvas ref={canvasRef} width={480} height={270} className="w-full" style={{ display: 'block' }} />
        </div>
      )}

      {/* Playback controls */}
      <div className="flex items-center gap-2">
        {!playing ? (
          <Button size="sm" onClick={handlePlay} className="flex-1 rounded-xl h-8 gap-1.5 text-xs">
            <Play className="w-3.5 h-3.5" /> {paused ? 'Resume' : 'Play Audio'}
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={handlePause} className="flex-1 rounded-xl h-8 gap-1.5 text-xs">
            <Pause className="w-3.5 h-3.5" /> Pause
          </Button>
        )}
        {(playing || paused) && (
          <Button size="sm" variant="ghost" onClick={handleStop} className="rounded-xl h-8 w-8 p-0">
            <Square className="w-3 h-3" />
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => { handleStop(); setTimeout(handlePlay, 100); }} className="rounded-xl h-8 w-8 p-0" title="Restart">
          <RotateCcw className="w-3 h-3" />
        </Button>
      </div>

      {playing && totalChunks > 0 && (
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
  );
}
