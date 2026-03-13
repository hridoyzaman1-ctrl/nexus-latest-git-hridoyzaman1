/**
 * bgmEngine.ts
 *
 * Synthesises looping background music tracks using the Web Audio API
 * OfflineAudioContext — no external files, no network, works offline.
 *
 * Each track is rendered to an AudioBuffer that can be fed into a
 * BufferSourceNode with loop=true so it plays continuously under narration.
 *
 * Volume guidance (applied by callers):
 *   narration / TTS → gain 1.0   (full volume — must stay clearly audible)
 *   BGM             → gain 0.22  (≈ 22 % — present but never overpowering)
 *
 * Fade-in  : 0.1 s ramp at the very start   (avoids a click)
 * Fade-out : 3 s ramp before the video ends  (natural close, not abrupt)
 */

export type BgmId = 'none' | 'corporate' | 'calm' | 'uplifting';

export interface BgmTrack {
  id: BgmId;
  name: string;
  description: string;
}

export const BGM_TRACKS: BgmTrack[] = [
  { id: 'none',      name: 'No Music',    description: 'No background music'   },
  { id: 'corporate', name: 'Corporate',   description: 'Professional & bright' },
  { id: 'calm',      name: 'Calm Focus',  description: 'Relaxing & ambient'    },
  { id: 'uplifting', name: 'Uplifting',   description: 'Positive & energetic'  },
];

// ─── Synthesis helpers ────────────────────────────────────────────────────────

/**
 * Schedules one note into an OfflineAudioContext.
 * Two slightly-detuned oscillators (8 cents apart) give a light chorus effect.
 * A lowpass filter removes harsh high partials → warmer, presentable sound.
 * ADSR envelope avoids clicks and mimics instrument dynamics.
 */
function scheduleNote(
  ctx: OfflineAudioContext,
  freq: number,
  startTime: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'triangle',
): void {
  if (startTime >= ctx.length / ctx.sampleRate) return; // past end of buffer
  const safeEnd = Math.min(startTime + duration, ctx.length / ctx.sampleRate - 0.005);
  if (safeEnd <= startTime) return;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1350;
  filter.Q.value = 0.6;
  filter.connect(ctx.destination);

  for (const detuneCents of [0, 8]) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detuneCents;

    const gain = ctx.createGain();
    const atk = Math.min(0.07, (safeEnd - startTime) * 0.12);
    const rel = Math.min(0.22, (safeEnd - startTime) * 0.28);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume * 0.5, startTime + atk);
    gain.gain.setValueAtTime(volume * 0.4, safeEnd - rel);
    gain.gain.linearRampToValueAtTime(0, safeEnd);

    osc.connect(gain);
    gain.connect(filter);
    osc.start(startTime);
    osc.stop(safeEnd + 0.01);
  }
}

// ─── Track generators ─────────────────────────────────────────────────────────

/**
 * Corporate — I–V–vi–IV in C major, 96 BPM, 4-bar loop (10 s).
 * Bass note + ascending arpeggio on each chord.
 * Bright, professional feel suitable for business presentations.
 */
function generateCorporate(ctx: OfflineAudioContext, totalSecs: number): void {
  const beat = 60 / 96;   // ≈ 0.625 s per beat
  const barDur = beat * 4; // 2.5 s per bar

  // Chord: bass root (sine) + 3-note arpeggio (triangle)
  const chords: Array<{ arp: [number, number, number]; bass: number }> = [
    { arp: [261.63, 329.63, 392.00], bass: 130.81 }, // C major
    { arp: [392.00, 493.88, 587.33], bass: 196.00 }, // G major
    { arp: [220.00, 261.63, 329.63], bass: 110.00 }, // A minor
    { arp: [174.61, 220.00, 261.63], bass: 87.31  }, // F major
  ];

  let t = 0;
  let ci = 0;
  while (t < totalSecs) {
    const chord = chords[ci % chords.length];
    const chordDur = barDur;

    // Sustained bass note
    scheduleNote(ctx, chord.bass, t, chordDur * 0.88, 0.30, 'sine');

    // Arpeggio: root on beat 1, 3rd on beat 2, 5th on beat 3
    chord.arp.forEach((freq, ni) => {
      scheduleNote(ctx, freq, t + ni * beat, beat * 0.82, 0.20, 'triangle');
    });
    // Repeat root note on beat 4 for drive
    scheduleNote(ctx, chord.arp[0], t + 3 * beat, beat * 0.72, 0.15, 'triangle');

    t += chordDur;
    ci++;
  }
}

/**
 * Calm Focus — A-minor pentatonic, 60 BPM, slow 4-bar loop (16 s).
 * Gentle sine-wave melody, long note durations, overlapping tones.
 * Relaxing and unobtrusive — ideal for study-style presentations.
 */
function generateCalm(ctx: OfflineAudioContext, totalSecs: number): void {
  const beat = 60 / 60; // 1 s per beat
  // A-minor pentatonic: A3, C4, E4, G4, A4
  const scale = [220.00, 261.63, 329.63, 392.00, 440.00];
  const pattern = [0, 2, 4, 3, 1, 2, 4, 1, 3, 2, 0, 4];

  let t = 0;
  let pi = 0;
  while (t < totalSecs) {
    const freq = scale[pattern[pi % pattern.length]];
    const dur = beat * 1.85; // overlap for legato feel
    scheduleNote(ctx, freq, t, Math.min(dur, totalSecs - t), 0.26, 'sine');

    // Low drone bass every 4 beats
    if (pi % 4 === 0) {
      scheduleNote(ctx, 110.00, t, Math.min(beat * 3.6, totalSecs - t), 0.18, 'sine');
    }

    t += beat;
    pi++;
  }
}

/**
 * Uplifting — I–V–vi–IV in G major, 108 BPM, 4-bar loop (≈ 8.9 s).
 * Faster 8th-note arpeggio, brighter chord voicings.
 * Positive, forward-moving energy.
 */
function generateUplifting(ctx: OfflineAudioContext, totalSecs: number): void {
  const beat = 60 / 108;  // ≈ 0.556 s per beat
  const eighth = beat / 2; // ≈ 0.278 s per 8th note
  const barDur = beat * 4;

  const chords: Array<{ arp: [number, number, number]; bass: number }> = [
    { arp: [392.00, 493.88, 587.33], bass: 196.00 }, // G major
    { arp: [293.66, 369.99, 440.00], bass: 146.83 }, // D major
    { arp: [329.63, 392.00, 493.88], bass: 164.81 }, // E minor
    { arp: [261.63, 329.63, 392.00], bass: 130.81 }, // C major
  ];

  let t = 0;
  let ci = 0;
  while (t < totalSecs) {
    const chord = chords[ci % chords.length];

    // Bass on beat 1
    scheduleNote(ctx, chord.bass, t, barDur * 0.85, 0.28, 'sine');

    // 8th-note arpeggio across the bar
    for (let i = 0; i < 8; i++) {
      const noteTime = t + i * eighth;
      if (noteTime >= totalSecs) break;
      const freq = chord.arp[i % chord.arp.length];
      scheduleNote(ctx, freq, noteTime, eighth * 0.78, 0.17, 'triangle');
    }

    t += barDur;
    ci++;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns the exact loop duration (seconds) for a track — a whole number of bars. */
function loopSecsForTrack(trackId: string): number {
  switch (trackId) {
    case 'corporate': return 10.0;              // 4 bars @ 96 BPM  (exact)
    case 'calm':      return 16.0;              // 4 bars @ 60 BPM  (exact)
    case 'uplifting': return (16 * 60) / 108;  // 4 bars @ 108 BPM (≈ 8.889 s)
    default:          return 10.0;
  }
}

/**
 * Pre-renders a BGM track to an AudioBuffer using OfflineAudioContext.
 * The caller should use this as a looping BufferSourceNode (loop=true, loopEnd=buffer.duration).
 *
 * @param trackId  One of 'corporate' | 'calm' | 'uplifting' | 'none'
 * @param sampleRate  Should match the live AudioContext sampleRate (default 44100)
 * @returns AudioBuffer or null if trackId is 'none'
 */
export async function renderBgmBuffer(
  trackId: string,
  sampleRate = 44100,
): Promise<AudioBuffer | null> {
  if (!trackId || trackId === 'none') return null;

  const loopSecs = loopSecsForTrack(trackId);
  const frameCount = Math.ceil(loopSecs * sampleRate);
  const ctx = new OfflineAudioContext(2, frameCount, sampleRate);

  if (trackId === 'corporate') generateCorporate(ctx, loopSecs);
  else if (trackId === 'calm')      generateCalm(ctx, loopSecs);
  else if (trackId === 'uplifting') generateUplifting(ctx, loopSecs);

  return ctx.startRendering();
}

/** BGM_VOLUME: default BGM level — raised so it is clearly audible alongside narration */
export const BGM_VOLUME = 0.45;
/** Fade-out duration in seconds applied at the end of the video */
export const BGM_FADE_SECS = 3.0;

/**
 * Plays a short preview of a BGM track (default 7 s) so the user can hear
 * what each track sounds like before generating video.
 * Returns a { stop } handle so the caller can cancel it early.
 */
export async function previewBgmTrack(
  trackId: string,
  durationSecs = 7,
  volume = BGM_VOLUME,
): Promise<{ stop: () => void }> {
  if (!trackId || trackId === 'none') return { stop: () => {} };

  let ctx: AudioContext | null = null;
  let src: AudioBufferSourceNode | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cleanup = () => {
    if (timer) clearTimeout(timer);
    try { src?.stop(); } catch {}
    ctx?.close().catch(() => {});
  };

  try {
    ctx = new AudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    const buffer = await renderBgmBuffer(trackId, ctx.sampleRate);
    if (!buffer) { cleanup(); return { stop: () => {} }; }

    src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.loopEnd = buffer.duration;

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.1);
    gain.gain.setValueAtTime(volume, now + Math.max(0.1, durationSecs - 0.8));
    gain.gain.linearRampToValueAtTime(0, now + durationSecs);

    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);

    timer = setTimeout(cleanup, (durationSecs + 0.3) * 1000);

    return { stop: cleanup };
  } catch {
    cleanup();
    return { stop: () => {} };
  }
}
