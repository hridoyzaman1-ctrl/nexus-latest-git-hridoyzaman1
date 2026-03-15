// Alarm sound player using real audio files
import { AlarmSoundType } from '@/types';
import { toast } from 'sonner';

let currentAudio: HTMLAudioElement | null = null;
let isPlaying = false;
let warnedPlayback = false;

const ALARM_FILES: Record<AlarmSoundType, string> = {
  chime: '/audio/Melody.mp3',
  bells: '/audio/Believer.mp3',
  nature: '/audio/Gentle Rain.mp3',
  urgent: '/audio/Stronger Every Day.mp3',
};

export const ALARM_SOUNDS: { value: AlarmSoundType; label: string; emoji: string }[] = [
  { value: 'chime', label: 'Chime', emoji: '🎵' },
  { value: 'bells', label: 'Gentle Bells', emoji: '🔔' },
  { value: 'nature', label: 'Nature', emoji: '🌿' },
  { value: 'urgent', label: 'Urgent Beep', emoji: '🚨' },
];

function notifyPlaybackIssue() {
  if (warnedPlayback) return;
  warnedPlayback = true;
  toast.error('Audio playback is blocked. Tap once and try again.');
}

function createAudio(src: string, volume: number) {
  const audio = new Audio(src);
  audio.volume = volume;
  audio.preload = 'auto';
  audio.setAttribute('playsinline', 'true');
  return audio;
}

export function playAlarmSound(type: AlarmSoundType = 'chime'): void {
  stopAlarmSound();

  const src = ALARM_FILES[type];
  const audio = createAudio(src, 0.85);

  audio.addEventListener('ended', () => {
    isPlaying = false;
    currentAudio = null;
  });

  void audio.play()
    .then(() => {
      warnedPlayback = false;
      isPlaying = true;
      currentAudio = audio;
    })
    .catch((err) => {
      console.warn(`Failed to play alarm sound ${src}:`, err);
      // Fallback if specific file fails
      if (src !== '/audio/Chill.mp3') {
        const fallback = createAudio('/audio/Chill.mp3', 0.85);
        fallback.play().catch(() => notifyPlaybackIssue());
      } else {
        notifyPlaybackIssue();
      }
      isPlaying = false;
      currentAudio = null;
    });
}

export function previewAlarmSound(type: AlarmSoundType): void {
  stopAlarmSound();
  setTimeout(() => playAlarmSound(type), 50);
}

export function stopAlarmSound(): void {
  isPlaying = false;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

export function playNotificationChime(): void {
  const audio = createAudio('/audio/Cafe.mp3', 0.5);
  void audio.play()
    .then(() => {
      warnedPlayback = false;
    })
    .catch(() => {
      notifyPlaybackIssue();
    });
}
