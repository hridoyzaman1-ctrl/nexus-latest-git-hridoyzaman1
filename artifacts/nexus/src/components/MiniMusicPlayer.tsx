import { useState, useRef, useEffect, useCallback } from 'react';
import { useMusicPlayer, MusicTrack } from '@/contexts/MusicPlayerContext';
import { Play, Pause, X, Volume2, VolumeX, SkipBack, SkipForward, ChevronUp, ChevronDown, Timer, Music2, Check } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

/* ─── Audio-Reactive Orb Visualizer ─── */
function OrbVisualizer({ getAnalyser, playing }: { getAnalyser: () => AnalyserNode | null; playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const baseR = Math.min(w, h) * 0.22;
      const analyser = getAnalyser();
      const t = Date.now() * 0.001;

      if (analyser && playing) {
        const bufLen = analyser.frequencyBinCount;
        const freqData = new Uint8Array(bufLen);
        const timeData = new Uint8Array(bufLen);
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);

        const avgFreq = freqData.reduce((a, b) => a + b, 0) / bufLen / 255;
        const bassEnergy = freqData.slice(0, 8).reduce((a, b) => a + b, 0) / 8 / 255;
        const midEnergy = freqData.slice(8, 40).reduce((a, b) => a + b, 0) / 32 / 255;
        const highEnergy = freqData.slice(40, 80).reduce((a, b) => a + b, 0) / 40 / 255;

        for (let ring = 3; ring >= 0; ring--) {
          const ringR = baseR + ring * 12 + bassEnergy * 20;
          const alpha = 0.08 + avgFreq * 0.12 - ring * 0.02;
          const hueShift = ring * 30 + t * 20;
          ctx.beginPath();
          for (let i = 0; i <= 360; i++) {
            const angle = (i * Math.PI) / 180;
            const freqIdx = Math.floor((i / 360) * bufLen * 0.5);
            const amp = (freqData[freqIdx] || 0) / 255;
            const wobble = Math.sin(angle * 3 + t * 2) * 4 * amp;
            const r = ringR + wobble + amp * 15;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fillStyle = `hsla(${245 + hueShift}, 70%, ${55 + ring * 5}%, ${alpha})`;
          ctx.fill();
        }

        const orbR = baseR + bassEnergy * 12;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR);
        gradient.addColorStop(0, `hsla(245, 80%, 75%, ${0.6 + avgFreq * 0.4})`);
        gradient.addColorStop(0.5, `hsla(280, 70%, 60%, ${0.3 + midEnergy * 0.3})`);
        gradient.addColorStop(1, `hsla(245, 60%, 50%, 0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        const particleCount = 24;
        for (let i = 0; i < particleCount; i++) {
          const angle = (i / particleCount) * Math.PI * 2 + t * 0.5;
          const fi = Math.floor((i / particleCount) * bufLen * 0.3);
          const amp = (freqData[fi] || 0) / 255;
          if (amp < 0.15) continue;
          const dist = baseR + 20 + amp * 30;
          const px = cx + Math.cos(angle) * dist;
          const py = cy + Math.sin(angle) * dist;
          const pR = 1.5 + amp * 3;
          const pGrad = ctx.createRadialGradient(px, py, 0, px, py, pR * 2);
          pGrad.addColorStop(0, `hsla(${245 + i * 8}, 80%, 70%, ${amp * 0.9})`);
          pGrad.addColorStop(1, `hsla(${245 + i * 8}, 80%, 70%, 0)`);
          ctx.beginPath();
          ctx.arc(px, py, pR * 2, 0, Math.PI * 2);
          ctx.fillStyle = pGrad;
          ctx.fill();
        }

        ctx.beginPath();
        const waveR = baseR - 8;
        for (let i = 0; i < bufLen; i++) {
          const angle = (i / bufLen) * Math.PI * 2;
          const v = (timeData[i] - 128) / 128;
          const r = waveR + v * 15;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `hsla(200, 80%, 70%, ${0.3 + highEnergy * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        const breathe = Math.sin(t * 0.8) * 0.15 + 1;
        const idleR = baseR * breathe;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, idleR);
        g.addColorStop(0, 'hsla(245, 60%, 65%, 0.25)');
        g.addColorStop(0.7, 'hsla(245, 50%, 55%, 0.08)');
        g.addColorStop(1, 'hsla(245, 40%, 50%, 0)');
        ctx.beginPath();
        ctx.arc(cx, cy, idleR, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [getAnalyser, playing]);

  return <canvas ref={canvasRef} className="w-full h-full absolute inset-0 pointer-events-none" />;
}

/* ─── Frequency Bars (mini, for collapsed view) ─── */
function MiniBars({ getAnalyser, playing }: { getAnalyser: () => AnalyserNode | null; playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      const analyser = getAnalyser();
      const barCount = 16;
      if (analyser && playing) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const step = Math.floor(data.length / barCount);
        for (let i = 0; i < barCount; i++) {
          const val = data[i * step] / 255;
          const barH = Math.max(2, val * h * 0.9);
          const x = (i / barCount) * w;
          const bw = (w / barCount) - 1;
          const grad = ctx.createLinearGradient(x, h, x, h - barH);
          grad.addColorStop(0, `hsla(${245 + i * 6}, 75%, 65%, 0.8)`);
          grad.addColorStop(1, `hsla(${245 + i * 6}, 75%, 65%, 0.15)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, h - barH, bw, barH, 1);
          ctx.fill();
        }
      } else {
        for (let i = 0; i < barCount; i++) {
          const val = Math.sin(Date.now() * 0.002 + i * 0.5) * 0.15 + 0.2;
          const barH = val * h;
          const x = (i / barCount) * w;
          const bw = (w / barCount) - 1;
          ctx.fillStyle = `hsla(245, 50%, 60%, 0.2)`;
          ctx.beginPath();
          ctx.roundRect(x, h - barH, bw, barH, 1);
          ctx.fill();
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [getAnalyser, playing]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

/* ─── Sleep Timer Options ─── */
const SLEEP_OPTIONS = [
  { label: '15m', seconds: 15 * 60 },
  { label: '30m', seconds: 30 * 60 },
  { label: '1h', seconds: 60 * 60 },
  { label: 'Off', seconds: 0 },
] as const;

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ─── Main Mini Player ─── */
export default function MiniMusicPlayer() {
  const {
    isPlaying, currentTrack, volume, showMiniPlayer, glassmorphism, tracks,
    pause, resume, stop, setVolume, closeMiniPlayer, play,
    playNext, playPrevious, getAnalyserNode,
  } = useMusicPlayer();

  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'visualizer' | 'tracks'>('visualizer');
  const [sleepSeconds, setSleepSeconds] = useState(0);
  const [sleepRemaining, setSleepRemaining] = useState(0);
  const sleepRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Sleep timer logic
  const startSleepTimer = useCallback((secs: number) => {
    if (sleepRef.current) clearInterval(sleepRef.current);
    if (secs === 0) {
      setSleepSeconds(0);
      setSleepRemaining(0);
      return;
    }
    setSleepSeconds(secs);
    setSleepRemaining(secs);
    sleepRef.current = setInterval(() => {
      setSleepRemaining(prev => {
        if (prev <= 1) {
          clearInterval(sleepRef.current!);
          setSleepSeconds(0);
          // Auto-stop playback
          closeMiniPlayer();
          toast('😴 Sleep timer ended — playback stopped');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [closeMiniPlayer]);

  useEffect(() => {
    return () => { if (sleepRef.current) clearInterval(sleepRef.current); };
  }, []);

  if (!showMiniPlayer || !currentTrack) return null;

  return (
    <AnimatePresence>
      {/* Backdrop overlay when expanded */}
      {expanded && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[49] bg-black/40 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        />
      )}
      <div className="fixed bottom-[5.5rem] left-0 right-0 z-50 flex justify-center px-4">
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          drag={expanded ? 'y' : false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          onDragEnd={(_e, info) => {
            if (info.offset.y > 80 || info.velocity.y > 300) {
              setExpanded(false);
            }
          }}
          className={`w-full max-w-[420px] rounded-2xl overflow-hidden shadow-lg ${
            glassmorphism
              ? 'bg-card/50 backdrop-blur-2xl border border-border/40'
              : 'bg-card border border-border'
          } dark:bg-card/50 dark:backdrop-blur-2xl bg-secondary/95 backdrop-blur-xl border border-border/60`}
          style={{
            boxShadow: isPlaying
              ? '0 -2px 40px -8px hsl(var(--primary) / 0.35), 0 8px 32px -8px hsl(var(--primary) / 0.15)'
              : '0 4px 20px -6px hsl(0 0% 0% / 0.2)',
            touchAction: expanded ? 'none' : 'auto',
          }}
        >
        {/* Drag handle indicator */}
        {expanded && (
          <div className="flex justify-center pt-2 pb-0">
            <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
          </div>
        )}
        {/* Expanded panel (renders above collapsed bar) */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              {/* Tab switcher */}
              <div className="flex gap-1 px-4 py-2" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setActiveTab('visualizer')}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${activeTab === 'visualizer' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}
                >
                  ✨ Visualizer
                </button>
                <button
                  onClick={() => setActiveTab('tracks')}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${activeTab === 'tracks' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}
                >
                  <Music2 className="w-3 h-3 inline mr-1" />Tracks
                </button>
              </div>

              {activeTab === 'visualizer' ? (
                <div className="relative w-full h-36">
                  <OrbVisualizer getAnalyser={getAnalyserNode} playing={isPlaying} />
                </div>
              ) : (
                <div className="px-4 max-h-36 overflow-y-auto space-y-1 pb-1" onClick={e => e.stopPropagation()}>
                  {tracks.map(track => (
                    <button
                      key={track.id}
                      onClick={() => play(track)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-colors ${
                        currentTrack.id === track.id ? 'bg-primary/15' : 'hover:bg-secondary/50'
                      }`}
                    >
                      <span className="text-xs flex-1 truncate">{track.name}</span>
                      {currentTrack.id === track.id && (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Controls */}
              <div className="px-4 pb-2 pt-2 space-y-2.5" onClick={e => e.stopPropagation()}>
                {/* Volume */}
                <div className="flex items-center gap-2.5">
                  <button onClick={() => setVolume(volume > 0 ? 0 : 0.7)} className="shrink-0">
                    {volume === 0 ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <Slider value={[volume * 100]} onValueChange={([v]) => setVolume(v / 100)} max={100} step={1} className="flex-1" />
                  <span className="text-[10px] text-muted-foreground w-7 text-right">{Math.round(volume * 100)}%</span>
                </div>

                {/* Sleep timer */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Timer className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[10px] text-muted-foreground shrink-0">Sleep</span>
                  <div className="flex gap-1 flex-1 min-w-0">
                    {SLEEP_OPTIONS.map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => startSleepTimer(opt.seconds)}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                          (opt.seconds === 0 && sleepSeconds === 0) || (opt.seconds > 0 && sleepSeconds === opt.seconds)
                            ? 'bg-primary/15 text-primary'
                            : 'bg-secondary/50 text-muted-foreground'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {sleepRemaining > 0 && (
                    <span className="text-[10px] text-primary font-mono shrink-0">{formatCountdown(sleepRemaining)}</span>
                  )}
                </div>

                {/* Close / Stop */}
                <div className="flex justify-center">
                  <button
                    onClick={closeMiniPlayer}
                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-destructive transition-colors px-3 py-1.5 rounded-lg hover:bg-destructive/10"
                  >
                    <X className="w-3 h-3" /> Stop & Close
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed: compact bar */}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-primary/5">
            <MiniBars getAnalyser={getAnalyserNode} playing={isPlaying} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{currentTrack.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {sleepRemaining > 0
                ? `⏱ ${formatCountdown(sleepRemaining)}`
                : isPlaying ? 'Now playing' : 'Paused'
              }
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={playPrevious} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-all">
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button onClick={isPlaying ? pause : resume} className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center active:scale-90 transition-transform">
              {isPlaying ? <Pause className="w-4 h-4 text-primary" /> : <Play className="w-4 h-4 text-primary ml-0.5" />}
            </button>
            <button onClick={playNext} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-all">
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={closeMiniPlayer} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive active:scale-90 transition-all" title="Close player">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="shrink-0 text-muted-foreground/50">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </div>

        {/* Animated glow bar */}
        {isPlaying && (
          <motion.div
            className="h-[2px] w-full"
            style={{
              background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), hsl(280 70% 60%), hsl(var(--primary)), transparent)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </motion.div>
      </div>
    </AnimatePresence>
  );
}
