import { useState, useRef, useEffect, useCallback } from 'react';
import { StudyMaterial, StudyNote } from '@/types';
import { getStudyFile } from '@/lib/studyStorage';
import { ArrowLeft, Maximize2, Minimize2, StickyNote, Download, Check, Play, Pause, Volume2, VolumeX, RotateCcw, RotateCw } from 'lucide-react';
import RotateIcon from './RotateIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';
import { cn } from '@/lib/utils';

// Helper to format seconds to MM:SS
const formatTime = (time: number) => {
  if (isNaN(time)) return '0:00';
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface Props {
  material: StudyMaterial;
  onBack: () => void;
  notes: StudyNote[];
  onSaveNote: (note: StudyNote) => void;
  onDeleteNote?: (id: string) => void;
  timerOverlay?: React.ReactNode;
  sessionId: string;
}

export default function StudyVideoPlayer({ material, onBack, notes, onSaveNote, timerOverlay, sessionId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Custom Controls State
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [landscapeMode, setLandscapeMode] = useState(false);

  // Notes UI State
  const [showNotes, setShowNotes] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);

  // Load video from IndexedDB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getStudyFile(material.id);
        if (!cancelled && data?.videoBlob) {
          const blob = new Blob([data.videoBlob], { type: data.videoType || 'video/mp4' });
          const url = URL.createObjectURL(blob);
          setVideoUrl(url);
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [material.id]);

  useEffect(() => {
    return () => { if (videoUrl) URL.revokeObjectURL(videoUrl); };
  }, [videoUrl]);

  // Handle auto-hide controls
  const triggerControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    triggerControls();
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, [triggerControls]);

  // Fullscreen sync
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (document.fullscreenElement && (screen.orientation as any)?.lock) {
        (screen.orientation as any).lock('landscape').catch(() => { });
      } else if (!document.fullscreenElement && (screen.orientation as any)?.unlock) {
        (screen.orientation as any).unlock();
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Video Events
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    triggerControls();
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100 || 0);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleSeek = (values: number[]) => {
    if (!videoRef.current) return;
    const time = (values[0] / 100) * duration;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
    setProgress(values[0]);
    triggerControls();
  };

  const skipTime = (amount: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += amount;
    triggerControls();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
    triggerControls();
  };

  const toggleFullscreen = async () => {
    if (!playerContainerRef.current) return;
    if (!isFullscreen) {
      try { await playerContainerRef.current.requestFullscreen(); } catch (e) { console.error(e); }
    } else {
      try { await document.exitFullscreen(); } catch (e) { console.error(e); }
    }
    triggerControls();
  };

  const toggleLandscape = async () => {
    if (!landscapeMode) {
      try {
        await playerContainerRef.current?.requestFullscreen?.();
        await (screen.orientation as any)?.lock?.('landscape');
      } catch { }
      setLandscapeMode(true);
    } else {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        (screen.orientation as any)?.unlock?.();
      } catch { }
      setLandscapeMode(false);
    }
    triggerControls();
  };

  // Notes Auto-save logic
  const saveCurrentNote = useCallback(() => {
    if (!noteContent.trim()) return;
    const title = noteTitle.trim() || `Notes - ${material.name} - ${new Date().toLocaleDateString()}`;
    const now = new Date().toISOString();
    const note: StudyNote = {
      id: activeNoteId || crypto.randomUUID(),
      sessionId,
      materialId: material.id,
      title,
      content: noteContent,
      createdAt: activeNoteId ? (notes.find(n => n.id === activeNoteId)?.createdAt || now) : now,
      updatedAt: now,
    };
    onSaveNote(note);
    if (!activeNoteId) setActiveNoteId(note.id);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }, [noteContent, noteTitle, activeNoteId, material, sessionId, notes, onSaveNote]);

  useEffect(() => {
    if (!noteContent.trim()) return;
    const t = setInterval(saveCurrentNote, 10000);
    return () => clearInterval(t);
  }, [saveCurrentNote, noteContent]);

  const downloadNotes = () => {
    if (!noteContent.trim()) return;
    const title = noteTitle.trim() || `Notes - ${material.name}`;
    const blob = new Blob([noteContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${title}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const isDesktop = window.innerWidth > 768;

  return (
    <motion.div
      ref={playerContainerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "fixed inset-0 z-[100] flex flex-col bg-black overflow-hidden",
        landscapeMode && !document.fullscreenElement && "landscape-css-rotate"
      )}
      style={landscapeMode && !document.fullscreenElement ? {
        width: '100vh', height: '100vw',
        position: 'fixed' as const, top: '50%', left: '50%',
        marginTop: '-50vw', marginLeft: '-50vh',
        transform: 'rotate(90deg)', transformOrigin: 'center',
        zIndex: 200, background: 'black',
      } : undefined}
    >
      <PageOnboardingTooltips pageId="study-video" />

      {/* Top Header - Auto Hides with Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-0 inset-x-0 z-50 flex items-center gap-2 px-4 py-3 bg-gradient-to-b from-black/80 to-transparent text-white"
          >
            <button onClick={() => { saveCurrentNote(); onBack(); }} className="p-2 -ml-2 rounded-full hover:bg-white/20 transition-colors pointer-events-auto">
              <ArrowLeft className="w-5 h-5 drop-shadow-md" />
            </button>
            <div className="flex-1 min-w-0 pointer-events-auto">
              <span className="text-sm font-semibold truncate block drop-shadow-md">{material.name}</span>
            </div>
            {timerOverlay && <div className="scale-90 origin-right drop-shadow-md pointer-events-auto">{timerOverlay}</div>}

            {!isFullscreen && (
              <>
                <button
                  data-tour="reader-rotate"
                  onClick={toggleLandscape}
                  className={`p-2 rounded-full transition-colors flex items-center justify-center pointer-events-auto ${landscapeMode ? 'bg-primary text-primary-foreground' : 'hover:bg-white/20'}`}
                  title="Force Landscape"
                >
                  <RotateIcon active={landscapeMode} size={18} />
                </button>
                <button data-tour="reader-notes" onClick={() => setShowNotes(!showNotes)} className={`p-2 rounded-full transition-colors flex flex-col items-center gap-0.5 pointer-events-auto ${showNotes ? 'bg-primary text-primary-foreground' : 'hover:bg-white/20'}`}>
                  <StickyNote className="w-4 h-4 drop-shadow-md" />
                  <span className="text-[8px] font-medium leading-none drop-shadow-md lg:hidden">Note</span>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Video & Notes Area */}
      <div className={cn("flex-1 flex w-full h-full", showNotes && !isFullscreen && isDesktop ? "flex-row" : "flex-col")}>

        {/* Video Player Container */}
        <div
          className={cn("relative bg-black flex items-center justify-center group w-full", showNotes && !isFullscreen ? (isDesktop ? "w-2/3 h-full" : "h-[45vh] lg:h-[60vh] shrink-0") : "flex-1")}
          onMouseMove={triggerControls}
          onClick={() => isDesktop && togglePlay()}
        >
          {loading ? (
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          ) : videoUrl ? (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                className="w-full h-full object-contain pointer-events-none"
                onClick={e => e.stopPropagation()}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
              >
                Your browser does not support the video tag.
              </video>

              {/* Central Tap Area for Mobile / Overlay Controls */}
              <div
                className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
              >
                <AnimatePresence>
                  {showControls && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="flex items-center justify-center gap-6 sm:gap-12 drop-shadow-lg pointer-events-auto"
                      onClick={(e) => { e.stopPropagation(); triggerControls(); }}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); skipTime(-10); }}
                        className="p-3 sm:p-4 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all active:scale-95"
                      >
                        <RotateCcw className="w-6 h-6 sm:w-8 sm:h-8" />
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                        className="p-4 sm:p-6 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all active:scale-95 scale-110 sm:scale-125"
                      >
                        {isPlaying ? <Pause className="w-8 h-8 sm:w-10 sm:h-10 fill-current" /> : <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />}
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); skipTime(10); }}
                        className="p-3 sm:p-4 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all active:scale-95"
                      >
                        <RotateCw className="w-6 h-6 sm:w-8 sm:h-8" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom Control Bar */}
              <AnimatePresence>
                {showControls && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-4 pb-safe pt-12 flex flex-col gap-2"
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Time & Scrubber */}
                    <div className="flex items-center gap-3 w-full group/slider">
                      <span className="text-xs font-medium text-white/90 font-mono w-10 text-right shrink-0">{formatTime(currentTime)}</span>

                      <div className="flex-1 relative flex items-center h-6" onClick={(e) => e.stopPropagation()}>
                        <Slider
                          value={[progress]}
                          max={100}
                          step={0.1}
                          onValueChange={handleSeek}
                          className="w-full cursor-pointer [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:opacity-0 group-hover/slider:[&_[role=slider]]:opacity-100 transition-opacity"
                        />
                      </div>

                      <span className="text-xs font-medium text-white/90 font-mono w-10 shrink-0">{formatTime(duration)}</span>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1">
                        <button onClick={togglePlay} className="p-2 text-white hover:text-primary transition-colors">
                          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                        </button>
                        <button onClick={toggleMute} className="p-2 text-white hover:text-primary transition-colors">
                          {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {isFullscreen && (
                          <button onClick={() => setShowNotes(!showNotes)} className={`p-2 rounded-full transition-colors flex items-center gap-2 ${showNotes ? 'text-primary' : 'text-white hover:text-primary'}`}>
                            <StickyNote className="w-4 h-4" />
                            <span className="text-xs font-medium hidden sm:inline">Notes</span>
                          </button>
                        )}
                        <button onClick={toggleFullscreen} className="p-2 text-white hover:text-primary transition-colors">
                          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="text-center text-white/60 p-4">
              <p className="text-sm">Video could not be loaded.</p>
              <p className="text-xs mt-1">The file may have been corrupted or removed.</p>
            </div>
          )}
        </div>

        {/* Notes panel */}
        <AnimatePresence>
          {showNotes && (
            <motion.div
              initial={isDesktop ? { width: 0, opacity: 0 } : { height: 0, opacity: 0 }}
              animate={isDesktop ? { width: '33.333333%', opacity: 1 } : { height: 'auto', opacity: 1 }}
              exit={isDesktop ? { width: 0, opacity: 0 } : { height: 0, opacity: 0 }}
              className={cn(
                "bg-background flex flex-col z-[105]",
                isDesktop ? "border-l border-border" : "flex-1 border-t border-border"
              )}
            >
              <div className="px-4 py-3 flex items-center gap-2 border-b border-border shrink-0 bg-secondary/30">
                <StickyNote className="w-4 h-4 text-primary shrink-0" />
                <Input
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  placeholder={`Notes - ${material.name}`}
                  className="text-sm h-8 bg-transparent border-0 focus-visible:ring-0 flex-1 px-1 font-medium text-foreground"
                />

                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="outline" className="h-7 text-[11px] px-2" onClick={downloadNotes} title="Download notes text file">
                    <Download className="w-3.5 h-3.5 mr-1" />
                    <span className="hidden sm:inline">DL</span>
                  </Button>
                  <Button size="sm" className="h-7 text-[11px] px-3 font-semibold" onClick={saveCurrentNote}>
                    💾 Save
                  </Button>
                </div>
              </div>

              <div className="relative flex-1 p-2">
                <Textarea
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  placeholder="Take notes while watching... (auto-saves every 10s)"
                  className="w-full h-full resize-none border-0 text-sm focus-visible:ring-0 p-3 bg-transparent text-foreground leading-relaxed"
                />
                <AnimatePresence>
                  {noteSaved && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute bottom-4 right-6 bg-green-500/10 text-green-500 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-md shadow-sm border border-green-500/20"
                    >
                      <Check className="w-3.5 h-3.5" /> Saved
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
