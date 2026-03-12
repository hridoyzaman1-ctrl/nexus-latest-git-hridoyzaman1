import type { AudioMetrics } from '@/types/presentationCoach';

const DEFAULT_METRICS: AudioMetrics = {
  volumeLevel: 0,
  isSpeaking: false,
  silenceDuration: 0,
  speakingDuration: 0,
  volumeConsistency: 80,
  clipping: false,
  estimatedWPM: 0,
  pauseQuality: 70,
  totalSpeakingTime: 0,
  totalSilenceTime: 0,
  transcriptAvailable: false,
  transcript: '',
};

let audioContext: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;
let dataArray: Uint8Array<ArrayBuffer> | null = null;
let recognition: any = null;

let volumeHistory: number[] = [];
let speakingSegments: { start: number; end: number }[] = [];
let currentSpeakingStart: number | null = null;
let lastSpeakingTime = 0;
let totalSpeakingMs = 0;
let totalSilenceMs = 0;
let silenceStartTime = 0;
let lastUpdateTime = 0;
let wordCount = 0;
let sessionStartTime = 0;
let transcript = '';
let transcriptAvailable = false;

const SILENCE_THRESHOLD = 15;
const CLIPPING_THRESHOLD = 245;
const VOLUME_HISTORY_SIZE = 30;

export function initAudioAnalyzer(stream: MediaStream): boolean {
  try {
    audioContext = new AudioContext();
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.8;

    sourceNode = audioContext.createMediaStreamSource(stream);
    sourceNode.connect(analyserNode);

    dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    volumeHistory = [];
    speakingSegments = [];
    currentSpeakingStart = null;
    lastSpeakingTime = 0;
    totalSpeakingMs = 0;
    totalSilenceMs = 0;
    silenceStartTime = Date.now();
    lastUpdateTime = Date.now();
    wordCount = 0;
    sessionStartTime = Date.now();
    transcript = '';
    transcriptAvailable = false;

    initSpeechRecognition();

    return true;
  } catch (e) {
    console.warn('Audio analyzer init failed:', e);
    return false;
  }
}

function initSpeechRecognition() {
  try {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      transcriptAvailable = true;
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
          const words = result[0].transcript.trim().split(/\s+/);
          wordCount += words.length;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        transcript += finalTranscript;
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('Speech recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      try {
        if (audioContext && audioContext.state !== 'closed') {
          recognition?.start();
        }
      } catch {}
    };

    recognition.start();
  } catch {
    // Speech recognition not available
  }
}

export function getAudioMetrics(): AudioMetrics {
  if (!analyserNode || !dataArray) return DEFAULT_METRICS;

  const now = Date.now();
  const dt = now - lastUpdateTime;
  lastUpdateTime = now;

  analyserNode.getByteFrequencyData(dataArray);

  let sum = 0;
  let maxVal = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i];
    if (dataArray[i] > maxVal) maxVal = dataArray[i];
  }
  const avgVolume = sum / dataArray.length;
  const normalizedVolume = Math.min(100, (avgVolume / 128) * 100);

  volumeHistory.push(normalizedVolume);
  if (volumeHistory.length > VOLUME_HISTORY_SIZE) volumeHistory.shift();

  const isSpeaking = avgVolume > SILENCE_THRESHOLD;
  const isClipping = maxVal > CLIPPING_THRESHOLD;

  if (isSpeaking) {
    if (!currentSpeakingStart) {
      currentSpeakingStart = now;
      if (silenceStartTime > 0) {
        totalSilenceMs += now - silenceStartTime;
        silenceStartTime = 0;
      }
    }
    totalSpeakingMs += dt;
    lastSpeakingTime = now;
  } else {
    if (currentSpeakingStart) {
      speakingSegments.push({ start: currentSpeakingStart, end: now });
      currentSpeakingStart = null;
      silenceStartTime = now;
    }
    totalSilenceMs += dt;
  }

  const currentSilenceDuration = !isSpeaking && silenceStartTime > 0 ? (now - silenceStartTime) / 1000 : 0;
  const currentSpeakingDuration = isSpeaking && currentSpeakingStart ? (now - currentSpeakingStart) / 1000 : 0;

  const volumeStdDev = (() => {
    if (volumeHistory.length < 5) return 0;
    const speakingVols = volumeHistory.filter(v => v > 5);
    if (speakingVols.length < 3) return 0;
    const mean = speakingVols.reduce((a, b) => a + b, 0) / speakingVols.length;
    const variance = speakingVols.reduce((a, b) => a + (b - mean) ** 2, 0) / speakingVols.length;
    return Math.sqrt(variance);
  })();
  const volumeConsistency = Math.min(100, Math.max(0, Math.round(100 - volumeStdDev * 2)));

  const elapsedMin = (now - sessionStartTime) / 60000;
  let estimatedWPM = 0;
  if (transcriptAvailable && wordCount > 0 && elapsedMin > 0.1) {
    estimatedWPM = Math.round(wordCount / elapsedMin);
  } else if (elapsedMin > 0.1) {
    const speakingMin = totalSpeakingMs / 60000;
    if (speakingMin > 0.05) {
      estimatedWPM = Math.round(130 * (speakingMin / elapsedMin));
    }
  }

  const avgPauseLength = speakingSegments.length > 1
    ? (totalSilenceMs / Math.max(1, speakingSegments.length - 1)) / 1000
    : 0;
  let pauseQuality = 70;
  if (avgPauseLength > 0) {
    if (avgPauseLength >= 0.5 && avgPauseLength <= 3) pauseQuality = 90;
    else if (avgPauseLength < 0.5) pauseQuality = 60;
    else if (avgPauseLength > 5) pauseQuality = 40;
    else pauseQuality = 55;
  }

  return {
    volumeLevel: normalizedVolume,
    isSpeaking,
    silenceDuration: currentSilenceDuration,
    speakingDuration: currentSpeakingDuration,
    volumeConsistency,
    clipping: isClipping,
    estimatedWPM,
    pauseQuality,
    totalSpeakingTime: totalSpeakingMs / 1000,
    totalSilenceTime: totalSilenceMs / 1000,
    transcriptAvailable,
    transcript: transcript.trim(),
  };
}

export function destroyAudioAnalyzer() {
  try { recognition?.stop(); } catch {}
  recognition = null;
  try { sourceNode?.disconnect(); } catch {}
  try { analyserNode?.disconnect(); } catch {}
  try { audioContext?.close(); } catch {}
  audioContext = null;
  analyserNode = null;
  sourceNode = null;
  dataArray = null;
  volumeHistory = [];
  speakingSegments = [];
}
