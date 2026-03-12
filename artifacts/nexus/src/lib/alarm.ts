// Alarm sound player using real audio files
import { AlarmSoundType } from '@/types';
import { toast } from 'sonner';

let currentAudio: HTMLAudioElement | null = null;
let isPlaying = false;
let warnedPlayback = false;

const ALARM_FILES: Record<AlarmSoundType, string> = {
  chime: '/audio/alarm-chime.mp3',
  bells: '/audio/alarm-bells.mp3',
  nature: '/audio/alarm-nature.mp3',
  urgent: '/audio/alarm-urgent.mp3',
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

  const audio = createAudio(ALARM_FILES[type], 0.85);
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
    .catch(() => {
      isPlaying = false;
      currentAudio = null;
      notifyPlaybackIssue();
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
  const audio = createAudio('/audio/notification.mp3', 0.5);
  void audio.play()
    .then(() => {
      warnedPlayback = false;
    })
    .catch(() => {
      notifyPlaybackIssue();
    });
}
