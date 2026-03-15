import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, Pause, Volume2, VolumeX,
  Maximize2, Minimize2, RotateCcw, RotateCw, Download, Headphones, HeadphoneOff,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { getVideoBlob, type GeneratedMediaItem } from '@/lib/mediaStorage';
import RotateIcon from '@/components/study/RotateIcon';
import { TTSController } from '@/lib/contentMediaEngine';

interface Props {
  item: GeneratedMediaItem;
  onClose: () => void;
}

const fmt = (t: number) => {
  if (!isFinite(t) || isNaN(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function GeneratedVideoPlayer({ item, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [landscapeMode, setLandscapeMode] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [lastVolume, setLastVolume] = useState(1);

  // TTS narration alongside video playback
  const ttsRef = useRef<TTSController | null>(null);
  const ttsStartedRef = useRef(false);
  const [narrationOn, setNarrationOn] = useState(true);

  // Load blob from IndexedDB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const blob = await getVideoBlob(item.id, item.videoMimeType ?? 'video/webm');
        if (!cancelled) {
          if (blob) {
            setVideoUrl(URL.createObjectURL(blob));
          } else {
            setError('Video file not found. It may have been cleared.');
          }
        }
      } catch {
        if (!cancelled) setError('Could not load video.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [item.id, item.videoMimeType]);

  // Revoke object URL on unmount
  useEffect(() => {
    return () => { if (videoUrl) URL.revokeObjectURL(videoUrl); };
  }, [videoUrl]);

  // TTS: start/pause/resume in sync with video play state
  useEffect(() => {
    if (!item.script) return;
    if (isPlaying && narrationOn) {
      if (!ttsRef.current) {
        ttsRef.current = new TTSController({
          volume: isMuted ? 0 : volume
        });
        ttsStartedRef.current = false;
      }
      if (!ttsStartedRef.current) {
        ttsRef.current.start(item.script);
        ttsStartedRef.current = true;
      } else {
        ttsRef.current.resume();
      }
    } else if (!isPlaying) {
      ttsRef.current?.pause();
    }
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // TTS: stop when narration is toggled off
  useEffect(() => {
    if (!narrationOn) {
      ttsRef.current?.stop();
      ttsRef.current = null;
      ttsStartedRef.current = false;
    }
  }, [narrationOn]);

  // TTS: stop on unmount
  useEffect(() => {
    return () => { ttsRef.current?.stop(); };
  }, []);

  // Fullscreen change sync
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (document.fullscreenElement) {
        (screen.orientation as any)?.lock?.('landscape').catch(() => {});
      } else {
        (screen.orientation as any)?.unlock?.();
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Auto-hide controls
  const showControlsFor = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  useEffect(() => () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) { videoRef.current.pause(); }
    else { videoRef.current.play(); }
    showControlsFor();
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    const d = videoRef.current.duration;
    setCurrentTime(t);
    setProgress(d > 0 ? (t / d) * 100 : 0);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleSeek = (vals: number[]) => {
    if (!videoRef.current || !isFinite(duration)) return;
    const t = (vals[0] / 100) * duration;
    videoRef.current.currentTime = t;
    setCurrentTime(t);
    setProgress(vals[0]);
    showControlsFor();
    // Restart TTS from beginning on seek
    if (narrationOn && item.script) {
      ttsRef.current?.stop();
      ttsRef.current = null;
      ttsStartedRef.current = false;
      if (isPlaying) {
        const ctrl = new TTSController({
          volume: isMuted ? 0 : volume
        });
        ttsRef.current = ctrl;
        ttsStartedRef.current = true;
        ctrl.start(item.script);
      }
    }
  };

  const skip = (secs: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + secs));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(duration > 0 ? (newTime / duration) * 100 : 0);
    showControlsFor();

    // Restart TTS from beginning on skip to maintain sync (current TTSController doesn't support seeking)
    if (narrationOn && item.script) {
      ttsRef.current?.stop();
      ttsRef.current = null;
      ttsStartedRef.current = false;
      if (isPlaying) {
        const ctrl = new TTSController({
          volume: isMuted ? 0 : volume
        });
        ttsRef.current = ctrl;
        ttsStartedRef.current = true;
        ctrl.start(item.script);
      }
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
    if (newMuted) {
      setLastVolume(volume);
      setVolume(0);
    } else {
      setVolume(lastVolume > 0 ? lastVolume : 1);
    }
    showControlsFor();
  };

  const handleVolumeChange = (vals: number[]) => {
    const v = vals[0];
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
    }
    ttsRef.current?.setVolume(v);
    setIsMuted(v === 0);
    if (v > 0) setLastVolume(v);
    showControlsFor();
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      try { await containerRef.current.requestFullscreen(); } catch {}
    } else {
      try { await document.exitFullscreen(); } catch {}
    }
    showControlsFor();
  };

  const toggleLandscape = async () => {
    if (!landscapeMode) {
      try {
        await containerRef.current?.requestFullscreen?.();
        await (screen.orientation as any)?.lock?.('landscape');
      } catch {}
      setLandscapeMode(true);
    } else {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        (screen.orientation as any)?.unlock?.();
      } catch {}
      setLandscapeMode(false);
    }
    showControlsFor();
  };

  const handleDownload = async () => {
    const blob = await getVideoBlob(item.id, item.videoMimeType ?? 'video/webm');
    if (!blob) return;
    const ext = (item.videoMimeType ?? 'video/webm').includes('mp4') ? 'mp4' : 'webm';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.sourceName.replace(/\s+/g, '_')}_${item.mode}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-black flex flex-col overflow-hidden"
      style={landscapeMode && !document.fullscreenElement ? {
        width: '100vh', height: '100vw',
        position: 'fixed', top: '50%', left: '50%',
        marginTop: '-50vw', marginLeft: '-50vh',
        transform: 'rotate(90deg)', transformOrigin: 'center',
        zIndex: 200,
      } : undefined}
      onMouseMove={showControlsFor}
      onTouchStart={showControlsFor}
    >
      {/* Top bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: -48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -48, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute top-0 inset-x-0 z-50 flex items-center gap-2 px-4 py-3 bg-gradient-to-b from-black/90 to-transparent text-white pointer-events-auto"
          >
            <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-white/20 transition-colors">
              <ArrowLeft className="w-5 h-5 drop-shadow-md" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate drop-shadow-md">{item.title || item.sourceName}</p>
              <p className="text-[10px] text-white/60 capitalize">{item.mode} · {item.sourceName}</p>
            </div>
            {!isFullscreen && (
              <button
                onClick={toggleLandscape}
                className={cn(
                  'p-2 rounded-full transition-colors flex items-center justify-center',
                  landscapeMode ? 'bg-primary text-primary-foreground' : 'hover:bg-white/20'
                )}
                title="Landscape mode"
              >
                <RotateIcon active={landscapeMode} size={18} />
              </button>
            )}
            <button onClick={handleDownload} className="p-2 rounded-full hover:bg-white/20 transition-colors" title="Download video">
              <Download className="w-4 h-4 drop-shadow-md" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video area */}
      <div
        className="flex-1 relative flex items-center justify-center bg-black"
        onClick={() => { togglePlay(); showControlsFor(); }}
      >
        {loading && (
          <div className="flex flex-col items-center gap-3 text-white/60">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Loading video…</p>
          </div>
        )}

        {error && !loading && (
          <div className="text-center text-white/60 p-6">
            <p className="text-sm">{error}</p>
            <button onClick={onClose} className="mt-3 text-xs text-primary underline">Close</button>
          </div>
        )}

        {videoUrl && !loading && (
          <video
            ref={videoRef}
            src={videoUrl}
            playsInline
            className="w-full h-full object-contain pointer-events-none"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => { setIsPlaying(false); setShowControls(true); }}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onClick={e => e.stopPropagation()}
          />
        )}

        {/* Centre play/pause + skip overlay */}
        {videoUrl && !loading && (
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-10 flex items-center justify-center gap-8 pointer-events-none"
              >
                <button
                  onClick={e => { e.stopPropagation(); skip(-10); }}
                  className="p-3 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-all active:scale-90 pointer-events-auto"
                >
                  <RotateCcw className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); togglePlay(); }}
                  className="p-5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-all active:scale-90 pointer-events-auto"
                >
                  {isPlaying
                    ? <Pause className="w-9 h-9 fill-current" />
                    : <Play className="w-9 h-9 fill-current ml-1" />}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); skip(10); }}
                  className="p-3 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-all active:scale-90 pointer-events-auto"
                >
                  <RotateCw className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Bottom controls */}
      {videoUrl && !loading && (
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ y: 56, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 56, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-4 pb-6 pt-10 flex flex-col gap-2 pointer-events-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Seek bar */}
              <div className="flex items-center gap-3 w-full group/slider">
                <span className="text-xs font-mono text-white/80 w-10 text-right shrink-0">{fmt(currentTime)}</span>
                <div className="flex-1 flex items-center h-6">
                  <Slider
                    value={[progress]}
                    max={100}
                    step={0.05}
                    onValueChange={handleSeek}
                    className="w-full cursor-pointer [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:opacity-0 group-hover/slider:[&_[role=slider]]:opacity-100 transition-opacity"
                  />
                </div>
                <span className="text-xs font-mono text-white/80 w-10 shrink-0">{fmt(duration)}</span>
              </div>

              {/* Action row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button onClick={togglePlay} className="p-2 text-white hover:text-primary transition-colors">
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                  </button>
                  <div className="flex items-center gap-1 group/vol">
                    <button onClick={toggleMute} className="p-2 text-white hover:text-primary transition-colors">
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <div className="w-0 overflow-hidden group-hover/vol:w-20 group-hover/vol:ml-1 group-hover/vol:mr-2 transition-all duration-300 flex items-center">
                      <Slider
                        value={[volume]}
                        max={1}
                        step={0.01}
                        onValueChange={handleVolumeChange}
                        className="w-20 cursor-pointer"
                      />
                    </div>
                  </div>
                  {item.script && (
                    <button
                      onClick={() => setNarrationOn(v => !v)}
                      className={cn('p-2 rounded transition-colors text-xs flex items-center gap-1', narrationOn ? 'text-primary' : 'text-white/50 hover:text-white/80')}
                      title={narrationOn ? 'AI narration on — tap to mute' : 'AI narration off — tap to enable'}
                    >
                      {narrationOn ? <Headphones className="w-4 h-4" /> : <HeadphoneOff className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <button onClick={toggleFullscreen} className="p-2 text-white hover:text-primary transition-colors">
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}
