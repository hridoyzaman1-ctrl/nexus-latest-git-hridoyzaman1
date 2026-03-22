// Alarm sound player using real audio files
import { AlarmSoundType } from '@/types';
import { toast } from 'sonner';
import { audioRegistry } from './audioRegistry';

let currentAudio: HTMLAudioElement | null = null;
let isPlaying = false;
let warnedPlayback = false;

const ALARM_FILES: Record<AlarmSoundType, string> = {
  chime: '/audio/chime.mp3',
  bells: '/audio/bells.mp3',
  nature: '/audio/nature.mp3',
  urgent: '/audio/urgent.mp3',
};

export const ALARM_SOUNDS: { value: AlarmSoundType; label: string; emoji: string }[] = [
  { value: 'chime', label: 'Lo-Fi Alarm', emoji: '🎵' },
  { value: 'bells', label: 'Funny Alarm', emoji: '🔔' },
  { value: 'nature', label: 'Electronic Alarm', emoji: '🌿' },
  { value: 'urgent', label: 'EAS Thailand', emoji: '🚨' },
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

export function playAlarmSound(type: AlarmSoundType = 'chime', loop: boolean = true): void {
  stopAlarmSound();

  const src = ALARM_FILES[type];
  const audio = createAudio(src, 1.0); // Full volume for alarms
  audio.loop = loop;

  audio.addEventListener('ended', () => {
    if (!audio.loop) {
      isPlaying = false;
      audioRegistry.unregister(audio);
      if (currentAudio === audio) currentAudio = null;
    }
  });

  void audio.play()
    .then(() => {
      warnedPlayback = false;
      isPlaying = true;
      currentAudio = audio;
      audioRegistry.register(audio);
    })
    .catch((err) => {
      console.warn(`Failed to play alarm sound ${src}:`, err);
      notifyPlaybackIssue();
      isPlaying = false;
      currentAudio = null;
    });
}

export function previewAlarmSound(type: AlarmSoundType): void {
  stopAlarmSound();
  // Play without loop for preview, or stop manually after 5s
  setTimeout(() => {
    playAlarmSound(type, false);
    // Explicitly stop after 5 seconds as requested
    setTimeout(() => {
      stopAlarmSound();
    }, 5000);
  }, 50);
}

export function stopAlarmSound(): void {
  isPlaying = false;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    audioRegistry.unregister(currentAudio);
    currentAudio = null;
  }
}

export function playNotificationChime(): void {
  const audio = createAudio('/audio/chime.mp3', 0.5);
  audioRegistry.register(audio);
  void audio.play()
    .then(() => {
      warnedPlayback = false;
    })
    .catch(() => {
      audioRegistry.unregister(audio);
      notifyPlaybackIssue();
    });
}
