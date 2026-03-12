import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useLocalStorage, getLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';

export interface MusicTrack {
  id: string;
  name: string;
  url: string;
  isCustom: boolean;
}

export interface AudioPreferences {
  defaultTrackId: string;
  defaultVolume: number;
  autoplay: boolean;
}

export const DEFAULT_AUDIO_PREFS: AudioPreferences = {
  defaultTrackId: '',
  defaultVolume: 0.7,
  autoplay: false,
};

// Real audio files (CC0 licensed from BigSoundBank & rse/soundfx)
export const BUILTIN_TRACKS: MusicTrack[] = [
  { id: 'stronger', name: '💪 Stronger Every Day', url: '/audio/Stronger%20Every%20Day_%20Transform%20Pain%20Into%20Power.mp3', isCustom: false },
  { id: 'believer', name: '🔥 Believer', url: '/audio/Imagine%20Dragons%20-%20Believer.mp3', isCustom: false },
  { id: 'yoga', name: '🧘‍♀️ Yoga', url: '/audio/Yoga.mp3', isCustom: false },
  { id: 'chill', name: '🍃 Chill', url: '/audio/Chill.mp3', isCustom: false },
  { id: 'flute', name: '🎐 Flute', url: '/audio/Flute.mp3', isCustom: false },
  { id: 'piano', name: '🎹 Peaceful Piano', url: '/audio/Peaceful%20Piano.mp3', isCustom: false },
  { id: 'melody', name: '🎶 Melody', url: '/audio/Melody.mp3', isCustom: false },
  { id: 'cafe', name: '☕ Cafe', url: '/audio/Cafe.mp3', isCustom: false },
  { id: 'quietphase', name: '✨ Quietphase Meditation', url: '/audio/Quietphase%20Meditation.mp3', isCustom: false },
];

interface MusicPlayerState {
  isPlaying: boolean;
  currentTrack: MusicTrack | null;
  volume: number;
  tracks: MusicTrack[];
  showMiniPlayer: boolean;
  glassmorphism: boolean;
}

interface MusicPlayerContextType extends MusicPlayerState {
  play: (track: MusicTrack) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  addCustomTrack: (file: File) => void;
  removeCustomTrack: (id: string) => void;
  removeBuiltinTrack: (id: string) => void;
  toggleGlassmorphism: () => void;
  closeMiniPlayer: () => void;
  getAnalyserNode: () => AnalyserNode | null;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | null>(null);

export function useMusicPlayer() {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) throw new Error('useMusicPlayer must be used inside MusicPlayerProvider');
  return ctx;
}

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [customTracks, setCustomTracks] = useLocalStorage<Array<{ id: string; name: string }>>('customMusicTracks', []);
  const [deletedBuiltinTracks, setDeletedBuiltinTracks] = useLocalStorage<string[]>('deletedBuiltinTracks', []);
  const audioPrefs = getLocalStorage<AudioPreferences>('audioPreferences', DEFAULT_AUDIO_PREFS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [volume, setVolumeState] = useState(audioPrefs.defaultVolume);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [glassmorphism, setGlassmorphism] = useState(true);
  const autoplayDoneRef = useRef(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const objectUrlsRef = useRef<Map<string, string>>(new Map());
  const playSessionIdRef = useRef<number>(0);

  const ensureAudioCtx = useCallback(async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      gainNodeRef.current = audioCtxRef.current.createGain();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      gainNodeRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioCtxRef.current.destination);
    }

    if (audioCtxRef.current.state === 'suspended') {
      try {
        await audioCtxRef.current.resume();
      } catch {
        // Ignore, play() will provide visible feedback below if blocked.
      }
    }

    return audioCtxRef.current;
  }, []);

  const stopCurrent = useCallback(() => {
    if (mediaSourceRef.current) {
      try {
        mediaSourceRef.current.disconnect();
      } catch {
        // Safe disconnect no-op.
      }
      mediaSourceRef.current = null;
    }

    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current = null;
    }
  }, []);

  const CROSSFADE_MS = 800;

  const play = useCallback((track: MusicTrack) => {
    const sessionId = ++playSessionIdRef.current;

    // Immediately update UI so user knows track was selected and doesn't spam click
    setCurrentTrack(track);
    setIsPlaying(true);
    setShowMiniPlayer(true);

    // 1. Create and start playing synchronously to preserve user gesture
    const audio = new Audio(track.url);
    audio.loop = true;
    audio.preload = 'auto';
    audio.setAttribute('playsinline', 'true');
    audio.muted = false;

    // Start play immediately while we have the user gesture token
    const playPromise = audio.play().catch(err => {
      console.error('Immediate play failed:', err);
      // Don't throw here, just swallow and let the async block handle state reset if it's the active session
    });

    void (async () => {
      try {
        const ctx = await ensureAudioCtx();

        // Crossfade: fade out old audio over CROSSFADE_MS
        const oldAudio = audioElementRef.current;
        const oldSource = mediaSourceRef.current;
        if (oldAudio && gainNodeRef.current) {
          const fadeGain = ctx.createGain();
          fadeGain.gain.setValueAtTime(gainNodeRef.current.gain.value, ctx.currentTime);
          fadeGain.gain.linearRampToValueAtTime(0, ctx.currentTime + CROSSFADE_MS / 1000);
          if (oldSource) {
            try { oldSource.disconnect(); } catch { /* no-op */ }
            oldSource.connect(fadeGain);
            fadeGain.connect(ctx.destination);
          }
          setTimeout(() => {
            oldAudio.pause();
            oldAudio.currentTime = 0;
            try { fadeGain.disconnect(); } catch { /* no-op */ }
          }, CROSSFADE_MS);
        } else {
          stopCurrent();
        }
        mediaSourceRef.current = null;
        audioElementRef.current = null;

        // Connect through Web Audio API for analyser visualization
        try {
          const mediaSource = ctx.createMediaElementSource(audio);
          mediaSource.connect(gainNodeRef.current!);
          mediaSourceRef.current = mediaSource;
        } catch {
          audio.volume = volume;
        }

        // Fade in new track
        if (gainNodeRef.current) {
          gainNodeRef.current.gain.setValueAtTime(0, ctx.currentTime);
          gainNodeRef.current.gain.linearRampToValueAtTime(volume, ctx.currentTime + CROSSFADE_MS / 1000);
        }

        await playPromise;

        // If the user clicked another track while this one was buffering, ABORT!
        if (sessionId !== playSessionIdRef.current) {
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
          return;
        }

        audioElementRef.current = audio;

      } catch (err) {
        if (sessionId === playSessionIdRef.current) {
          setIsPlaying(false);
          setCurrentTrack(null);
          toast.error('Could not play this audio clip. Tap again to retry.');
        }
        return;
      }
    })();
  }, [ensureAudioCtx, stopCurrent, volume]);

  const pause = useCallback(() => {
    if (audioElementRef.current) audioElementRef.current.pause();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    if (!audioElementRef.current) return;

    // Start play synchronously to preserve user gesture
    const playPromise = audioElementRef.current.play().catch(err => {
      console.error('Immediate resume failed:', err);
      throw err;
    });

    void (async () => {
      try {
        if (audioCtxRef.current?.state === 'suspended') {
          await audioCtxRef.current.resume();
        }
        await playPromise;
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
        toast.error('Audio resume was blocked. Tap play to retry.');
      }
    })();
  }, []);

  const stop = useCallback(() => {
    playSessionIdRef.current++; // invalidates any pending play promises
    stopCurrent();
    setIsPlaying(false);
    setCurrentTrack(null);
    setShowMiniPlayer(false);
  }, [stopCurrent]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (gainNodeRef.current) gainNodeRef.current.gain.value = v;
    if (audioElementRef.current) audioElementRef.current.volume = v;
  }, []);

  const addCustomTrack = useCallback((file: File) => {
    const id = crypto.randomUUID();
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.set(id, url);
    const name = file.name.replace(/\.[^.]+$/, '');
    setCustomTracks(prev => [...prev, { id, name }]);
  }, [setCustomTracks]);

  const removeCustomTrack = useCallback((id: string) => {
    const url = objectUrlsRef.current.get(id);
    if (url) { URL.revokeObjectURL(url); objectUrlsRef.current.delete(id); }
    setCustomTracks(prev => prev.filter(t => t.id !== id));
    if (currentTrack?.id === id) stop();
  }, [setCustomTracks, currentTrack, stop]);

  const removeBuiltinTrack = useCallback((id: string) => {
    setDeletedBuiltinTracks(prev => [...prev, id]);
    if (currentTrack?.id === id) stop();
  }, [setDeletedBuiltinTracks, currentTrack, stop]);

  const allTracks: MusicTrack[] = [
    ...BUILTIN_TRACKS.filter(t => !deletedBuiltinTracks.includes(t.id)),
    ...customTracks.map(t => ({
      id: t.id,
      name: `🎵 ${t.name}`,
      url: objectUrlsRef.current.get(t.id) || '',
      isCustom: true,
    })).filter(t => t.url),
  ];

  // Autoplay on mount if preference is set
  useEffect(() => {
    if (autoplayDoneRef.current) return;
    autoplayDoneRef.current = true;
    if (audioPrefs.autoplay && audioPrefs.defaultTrackId) {
      const track = allTracks.find(t => t.id === audioPrefs.defaultTrackId);
      if (track) {
        // Small delay to let AudioContext init after user gesture
        setTimeout(() => play(track), 500);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      stopCurrent();
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, [stopCurrent]);

  const playNext = useCallback(() => {
    if (!currentTrack) return;
    const idx = allTracks.findIndex(t => t.id === currentTrack.id);
    const next = allTracks[(idx + 1) % allTracks.length];
    if (next) play(next);
  }, [currentTrack, allTracks, play]);

  const playPrevious = useCallback(() => {
    if (!currentTrack) return;
    const idx = allTracks.findIndex(t => t.id === currentTrack.id);
    const prev = allTracks[(idx - 1 + allTracks.length) % allTracks.length];
    if (prev) play(prev);
  }, [currentTrack, allTracks, play]);

  return (
    <MusicPlayerContext.Provider value={{
      isPlaying, currentTrack, volume, tracks: allTracks, showMiniPlayer, glassmorphism,
      play, pause, resume, stop, setVolume, playNext, playPrevious, addCustomTrack, removeCustomTrack, removeBuiltinTrack,
      toggleGlassmorphism: () => setGlassmorphism(g => !g),
      closeMiniPlayer: () => { stop(); setShowMiniPlayer(false); },
      getAnalyserNode: () => analyserRef.current,
    }}>
      {children}
    </MusicPlayerContext.Provider>
  );
}
