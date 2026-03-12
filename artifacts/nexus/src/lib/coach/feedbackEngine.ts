import type { VisionMetrics, AudioMetrics, CoachingCard } from '@/types/presentationCoach';
import { FEEDBACK_COOLDOWN_MS, MAX_COACHING_CARDS } from './constants';

interface FeedbackState {
  lastFeedbackTime: Record<string, number>;
  activeCards: CoachingCard[];
  cardCounter: number;
}

let state: FeedbackState = {
  lastFeedbackTime: {},
  activeCards: [],
  cardCounter: 0,
};

export function resetFeedbackEngine() {
  state = { lastFeedbackTime: {}, activeCards: [], cardCounter: 0 };
}

function canShow(key: string, now: number): boolean {
  const last = state.lastFeedbackTime[key] || 0;
  return now - last > FEEDBACK_COOLDOWN_MS;
}

function createCard(message: string, type: CoachingCard['type'], priority: number): CoachingCard {
  return {
    id: `card-${++state.cardCounter}`,
    message,
    type,
    priority,
    timestamp: Date.now(),
  };
}

export function generateFeedback(
  vision: VisionMetrics,
  audio: AudioMetrics,
  elapsedSeconds: number,
  targetDuration: number,
): CoachingCard[] {
  const now = Date.now();
  const candidates: CoachingCard[] = [];

  if (!vision.faceDetected && canShow('no-face', now)) {
    candidates.push(createCard('Make sure your face is visible to the camera', 'warning', 10));
    state.lastFeedbackTime['no-face'] = now;
  }

  if (vision.faceDetected && !vision.facingCamera && canShow('eye-contact', now)) {
    candidates.push(createCard('Try looking at the camera more', 'suggestion', 8));
    state.lastFeedbackTime['eye-contact'] = now;
  }

  if (vision.faceDetected && vision.facingCamera && vision.eyeContactScore > 80 && canShow('good-eye', now)) {
    candidates.push(createCard('Great eye contact — keep it up!', 'positive', 3));
    state.lastFeedbackTime['good-eye'] = now;
  }

  if (vision.postureScore < 50 && canShow('posture-low', now)) {
    candidates.push(createCard('Sit a bit straighter — your posture dipped', 'suggestion', 7));
    state.lastFeedbackTime['posture-low'] = now;
  }

  if (vision.postureScore > 80 && canShow('posture-good', now)) {
    candidates.push(createCard('Good steady posture', 'positive', 2));
    state.lastFeedbackTime['posture-good'] = now;
  }

  if (vision.excessiveMovement && canShow('gesture-excess', now)) {
    candidates.push(createCard('Your hands are moving a lot — try to gesture more deliberately', 'suggestion', 6));
    state.lastFeedbackTime['gesture-excess'] = now;
  }

  if (vision.gestureScore > 80 && vision.handsVisible && canShow('gesture-good', now)) {
    candidates.push(createCard('Nice natural gestures', 'positive', 2));
    state.lastFeedbackTime['gesture-good'] = now;
  }

  if (audio.estimatedWPM > 170 && canShow('pace-fast', now)) {
    candidates.push(createCard('Slow down slightly — you\'re speaking quite fast', 'suggestion', 7));
    state.lastFeedbackTime['pace-fast'] = now;
  }

  if (audio.estimatedWPM > 0 && audio.estimatedWPM < 100 && audio.totalSpeakingTime > 30 && canShow('pace-slow', now)) {
    candidates.push(createCard('Pick up the pace a bit to keep energy up', 'suggestion', 5));
    state.lastFeedbackTime['pace-slow'] = now;
  }

  if (audio.estimatedWPM >= 120 && audio.estimatedWPM <= 160 && canShow('pace-good', now)) {
    candidates.push(createCard('Nice speaking pace', 'positive', 2));
    state.lastFeedbackTime['pace-good'] = now;
  }

  if (audio.silenceDuration > 5 && canShow('long-silence', now)) {
    candidates.push(createCard('Long pause detected — continue when ready', 'warning', 8));
    state.lastFeedbackTime['long-silence'] = now;
  }

  if (audio.clipping && canShow('clipping', now)) {
    candidates.push(createCard('Voice level is peaking — try speaking a bit softer', 'suggestion', 5));
    state.lastFeedbackTime['clipping'] = now;
  }

  if (audio.volumeLevel < 5 && audio.silenceDuration < 2 && !audio.isSpeaking && canShow('low-volume', now)) {
    candidates.push(createCard('Speak up a bit — your voice level is low', 'suggestion', 6));
    state.lastFeedbackTime['low-volume'] = now;
  }

  if (audio.volumeConsistency > 85 && audio.isSpeaking && canShow('voice-clear', now)) {
    candidates.push(createCard('Voice level is clear and consistent', 'positive', 2));
    state.lastFeedbackTime['voice-clear'] = now;
  }

  if (targetDuration > 0) {
    const remaining = targetDuration - elapsedSeconds;
    if (remaining <= 30 && remaining > 25 && canShow('time-warning', now)) {
      candidates.push(createCard('30 seconds remaining — start wrapping up', 'warning', 9));
      state.lastFeedbackTime['time-warning'] = now;
    }
    if (remaining < 0 && canShow('overtime', now)) {
      candidates.push(createCard('You\'re going over your target time', 'warning', 10));
      state.lastFeedbackTime['overtime'] = now;
    }
  }

  candidates.sort((a, b) => b.priority - a.priority);

  const expiry = 6000;
  state.activeCards = state.activeCards.filter(c => now - c.timestamp < expiry);

  const newCards = candidates.slice(0, MAX_COACHING_CARDS - state.activeCards.length);
  state.activeCards = [...state.activeCards, ...newCards].slice(0, MAX_COACHING_CARDS);

  return [...state.activeCards];
}

export function getActiveCards(): CoachingCard[] {
  return [...state.activeCards];
}

export function dismissCard(id: string) {
  state.activeCards = state.activeCards.filter(c => c.id !== id);
}
