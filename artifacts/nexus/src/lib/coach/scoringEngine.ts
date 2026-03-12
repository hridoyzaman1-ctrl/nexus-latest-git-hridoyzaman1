import type { VisionMetrics, AudioMetrics, SectionScore } from '@/types/presentationCoach';
import { SCORING_WEIGHTS } from './constants';

interface AccumulatedMetrics {
  postureScores: number[];
  eyeContactScores: number[];
  gestureScores: number[];
  volumeLevels: number[];
  volumeConsistencies: number[];
  pauseQualities: number[];
  estimatedWPMs: number[];
  clippingCount: number;
  totalFrames: number;
  faceDetectedFrames: number;
  bodyVisibleFrames: number;
  facingCameraFrames: number;
  excessiveMovementFrames: number;
}

export function createAccumulator(): AccumulatedMetrics {
  return {
    postureScores: [],
    eyeContactScores: [],
    gestureScores: [],
    volumeLevels: [],
    volumeConsistencies: [],
    pauseQualities: [],
    estimatedWPMs: [],
    clippingCount: 0,
    totalFrames: 0,
    faceDetectedFrames: 0,
    bodyVisibleFrames: 0,
    facingCameraFrames: 0,
    excessiveMovementFrames: 0,
  };
}

export function accumulateFrame(acc: AccumulatedMetrics, vision: VisionMetrics, audio: AudioMetrics) {
  acc.totalFrames++;
  acc.postureScores.push(vision.postureScore);
  acc.eyeContactScores.push(vision.eyeContactScore);
  acc.gestureScores.push(vision.gestureScore);
  acc.volumeLevels.push(audio.volumeLevel);
  acc.volumeConsistencies.push(audio.volumeConsistency);
  acc.pauseQualities.push(audio.pauseQuality);
  if (audio.estimatedWPM > 0) acc.estimatedWPMs.push(audio.estimatedWPM);
  if (audio.clipping) acc.clippingCount++;
  if (vision.faceDetected) acc.faceDetectedFrames++;
  if (vision.bodyVisible) acc.bodyVisibleFrames++;
  if (vision.facingCamera) acc.facingCameraFrames++;
  if (vision.excessiveMovement) acc.excessiveMovementFrames++;

  const maxHistory = 1000;
  if (acc.postureScores.length > maxHistory) {
    acc.postureScores = acc.postureScores.slice(-maxHistory);
    acc.eyeContactScores = acc.eyeContactScores.slice(-maxHistory);
    acc.gestureScores = acc.gestureScores.slice(-maxHistory);
    acc.volumeLevels = acc.volumeLevels.slice(-maxHistory);
    acc.volumeConsistencies = acc.volumeConsistencies.slice(-maxHistory);
    acc.pauseQualities = acc.pauseQualities.slice(-maxHistory);
  }
}

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function clamp(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

export function calculateScores(
  acc: AccumulatedMetrics,
  elapsedSeconds: number,
  targetDurationSeconds: number
): Record<string, SectionScore> {
  if (acc.totalFrames === 0) {
    const empty: SectionScore = { score: 0, label: '', explanation: 'Not enough data' };
    return {
      posture: { ...empty, label: 'Posture' },
      eyeContact: { ...empty, label: 'Eye Contact' },
      gestureControl: { ...empty, label: 'Gesture Control' },
      speechDelivery: { ...empty, label: 'Speech Delivery' },
      speechPace: { ...empty, label: 'Speech Pace' },
      timeManagement: { ...empty, label: 'Time Management' },
      overallPresence: { ...empty, label: 'Overall Presence' },
    };
  }

  const postureAvg = clamp(avg(acc.postureScores));
  const bodyVisRate = acc.bodyVisibleFrames / acc.totalFrames;
  const postureScore = clamp(postureAvg * 0.7 + bodyVisRate * 100 * 0.3);
  const postureExplanation = postureScore >= 80
    ? 'Excellent posture maintained throughout. Shoulders balanced and minimal slouching.'
    : postureScore >= 60
    ? 'Good posture overall. Some moments of imbalance or forward lean detected.'
    : postureScore >= 40
    ? 'Posture needs attention. Frequent slouching or uneven shoulders observed.'
    : 'Significant posture issues detected. Focus on sitting/standing straight with balanced shoulders.';

  const eyeAvg = clamp(avg(acc.eyeContactScores));
  const facingRate = acc.facingCameraFrames / Math.max(1, acc.faceDetectedFrames);
  const faceDetectRate = acc.faceDetectedFrames / acc.totalFrames;
  const eyeScore = clamp(eyeAvg * 0.5 + facingRate * 100 * 0.3 + faceDetectRate * 100 * 0.2);
  const eyeExplanation = eyeScore >= 80
    ? 'Strong eye contact maintained. You looked at the camera consistently.'
    : eyeScore >= 60
    ? 'Good eye contact with some look-away moments. Try maintaining camera focus more consistently.'
    : eyeScore >= 40
    ? 'Eye contact needs improvement. You looked away from the camera frequently.'
    : 'Minimal eye contact detected. Practice looking directly at the camera while speaking.';

  const gestureAvg = clamp(avg(acc.gestureScores));
  const excessRate = acc.excessiveMovementFrames / acc.totalFrames;
  const gestureScore = clamp(gestureAvg * 0.7 + (1 - excessRate) * 100 * 0.3);
  const gestureExplanation = gestureScore >= 80
    ? 'Gestures were natural and well-controlled. Good balance between movement and stillness.'
    : gestureScore >= 60
    ? 'Gesture use was acceptable. Watch for occasional excessive hand movement.'
    : gestureScore >= 40
    ? 'Gestures were either too frequent or too stiff. Aim for natural, purposeful movements.'
    : 'Gesture control needs significant work. Either too much movement or not enough.';

  const volConsAvg = clamp(avg(acc.volumeConsistencies));
  const pauseAvg = clamp(avg(acc.pauseQualities));
  const clippingRate = acc.clippingCount / acc.totalFrames;
  const speechDeliveryScore = clamp(volConsAvg * 0.4 + pauseAvg * 0.4 + (1 - clippingRate) * 100 * 0.2);
  const speechDeliveryExplanation = speechDeliveryScore >= 80
    ? 'Excellent speech delivery. Voice was steady, clear, and well-paced with good pauses.'
    : speechDeliveryScore >= 60
    ? 'Good delivery overall. Some inconsistency in volume or pause timing noted.'
    : speechDeliveryScore >= 40
    ? 'Delivery needs improvement. Work on voice steadiness and pause quality.'
    : 'Speech delivery had significant issues. Focus on maintaining consistent volume and adding purposeful pauses.';

  const avgWPM = avg(acc.estimatedWPMs);
  let paceScore: number;
  if (avgWPM === 0) {
    paceScore = 50;
  } else if (avgWPM >= 120 && avgWPM <= 160) {
    paceScore = clamp(90 + (10 - Math.abs(140 - avgWPM) * 0.5));
  } else if (avgWPM >= 100 && avgWPM <= 180) {
    paceScore = clamp(70 + (20 - Math.abs(140 - avgWPM) * 0.5));
  } else {
    paceScore = clamp(Math.max(20, 60 - Math.abs(140 - avgWPM) * 0.5));
  }
  const paceLabel = avgWPM > 0 ? `~${Math.round(avgWPM)} WPM` : 'estimated';
  const speechPaceExplanation = paceScore >= 80
    ? `Great speaking pace (${paceLabel}). Natural rhythm that is easy to follow.`
    : paceScore >= 60
    ? `Acceptable pace (${paceLabel}). ${avgWPM > 160 ? 'Try slowing down slightly.' : avgWPM < 120 ? 'Consider picking up the pace a bit.' : 'Minor variations detected.'}`
    : paceScore >= 40
    ? `Pace needs adjustment (${paceLabel}). ${avgWPM > 180 ? 'Speaking too fast for audience comprehension.' : 'Speaking too slowly may lose audience attention.'}`
    : `Significant pace issues (${paceLabel}). Practice speaking at a more moderate pace.`;

  let timeScore: number;
  const overtime = Math.max(0, elapsedSeconds - targetDurationSeconds);
  if (targetDurationSeconds <= 0) {
    timeScore = 80;
  } else {
    const ratio = elapsedSeconds / targetDurationSeconds;
    if (ratio >= 0.85 && ratio <= 1.05) {
      timeScore = 95;
    } else if (ratio >= 0.7 && ratio <= 1.15) {
      timeScore = 80;
    } else if (ratio < 0.7) {
      timeScore = clamp(50 + ratio * 30);
    } else {
      timeScore = clamp(Math.max(10, 80 - (overtime / 60) * 20));
    }
  }
  const timeExplanation = timeScore >= 80
    ? 'Excellent time management. You stayed within the target duration.'
    : timeScore >= 60
    ? `Good time awareness. ${overtime > 0 ? `You went over by ${Math.round(overtime)}s.` : 'Finished earlier than planned.'}`
    : timeScore >= 40
    ? `Time management needs work. ${overtime > 0 ? `Overtime of ${Math.round(overtime)}s affected your score.` : 'Finished significantly early.'}`
    : `Significant time management issues. ${overtime > 60 ? `You exceeded your target by over ${Math.round(overtime / 60)} minutes.` : 'Well outside target duration.'}`;

  const weighted =
    postureScore * SCORING_WEIGHTS.posture +
    eyeScore * SCORING_WEIGHTS.eyeContact +
    gestureScore * SCORING_WEIGHTS.gestureControl +
    speechDeliveryScore * SCORING_WEIGHTS.speechDelivery +
    paceScore * SCORING_WEIGHTS.speechPace +
    timeScore * SCORING_WEIGHTS.timeManagement +
    ((postureScore + eyeScore + gestureScore + speechDeliveryScore) / 4) * SCORING_WEIGHTS.overallPresence;

  const overallScore = clamp(weighted);
  const overallExplanation = overallScore >= 80
    ? 'Outstanding overall presence. You demonstrated strong command across all areas.'
    : overallScore >= 60
    ? 'Good overall presence with room for improvement in specific areas.'
    : overallScore >= 40
    ? 'Your presence needs work. Focus on the areas highlighted for improvement.'
    : 'Overall presence needs significant development. Practice regularly to build confidence.';

  return {
    posture: { score: postureScore, label: 'Posture', explanation: postureExplanation },
    eyeContact: { score: eyeScore, label: 'Eye Contact', explanation: eyeExplanation },
    gestureControl: { score: gestureScore, label: 'Gesture Control', explanation: gestureExplanation },
    speechDelivery: { score: speechDeliveryScore, label: 'Speech Delivery', explanation: speechDeliveryExplanation },
    speechPace: { score: paceScore, label: 'Speech Pace', explanation: speechPaceExplanation },
    timeManagement: { score: timeScore, label: 'Time Management', explanation: timeExplanation },
    overallPresence: { score: overallScore, label: 'Overall Presence', explanation: overallExplanation },
  };
}

export function calculateOverallScore(scores: Record<string, SectionScore>): number {
  let weighted = 0;
  const w = SCORING_WEIGHTS;
  weighted += (scores.posture?.score || 0) * w.posture;
  weighted += (scores.eyeContact?.score || 0) * w.eyeContact;
  weighted += (scores.gestureControl?.score || 0) * w.gestureControl;
  weighted += (scores.speechDelivery?.score || 0) * w.speechDelivery;
  weighted += (scores.speechPace?.score || 0) * w.speechPace;
  weighted += (scores.timeManagement?.score || 0) * w.timeManagement;
  weighted += (scores.overallPresence?.score || 0) * w.overallPresence;
  return clamp(weighted);
}
