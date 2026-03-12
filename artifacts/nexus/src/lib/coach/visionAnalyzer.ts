import type { VisionMetrics } from '@/types/presentationCoach';
import { ANALYSIS_FPS, MAX_IMAGE_SIZE } from './constants';

const DEFAULT_METRICS: VisionMetrics = {
  postureScore: 70,
  eyeContactScore: 70,
  gestureScore: 70,
  shoulderBalance: 80,
  headStability: 80,
  facingCamera: true,
  handsVisible: false,
  gestureFrequency: 0,
  excessiveMovement: false,
  bodyVisible: false,
  faceDetected: false,
};

interface FaceMeshResult {
  faceLandmarks?: { x: number; y: number; z: number }[][];
}

interface PoseResult {
  landmarks?: { x: number; y: number; z: number; visibility?: number }[][];
}

let faceMeshTask: any = null;
let poseTask: any = null;
let initialized = false;
let initFailed = false;

const prevNose: { x: number; y: number }[] = [];
const prevWrists: { lx: number; ly: number; rx: number; ry: number }[] = [];
const SMOOTHING_WINDOW = 5;

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export async function initVisionAnalyzer(): Promise<boolean> {
  if (initialized) return true;
  if (initFailed) return false;

  try {
    const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs');
    const { FaceLandmarker, PoseLandmarker, FilesetResolver } = vision;

    const filesetResolver = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );

    const createTasks = async (delegate: 'GPU' | 'CPU') => {
      faceMeshTask = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate,
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      poseTask = await PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate,
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    };

    try {
      await createTasks('GPU');
    } catch {
      console.warn('MediaPipe GPU delegate failed, falling back to CPU');
      await createTasks('CPU');
    }

    initialized = true;
    return true;
  } catch (e) {
    console.warn('MediaPipe initialization failed, using fallback analysis:', e);
    initFailed = true;
    return false;
  }
}

export function analyzeFrame(video: HTMLVideoElement, timestamp: number): VisionMetrics {
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    return DEFAULT_METRICS;
  }

  if (!initialized || !faceMeshTask || !poseTask) {
    return analyzeFallback(video);
  }

  try {
    const faceResults: FaceMeshResult = faceMeshTask.detectForVideo(video, timestamp);
    const poseResults: PoseResult = poseTask.detectForVideo(video, timestamp);

    const metrics = { ...DEFAULT_METRICS };

    if (faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
      const face = faceResults.faceLandmarks[0];
      metrics.faceDetected = true;

      const nose = face[1];
      const leftEye = face[33];
      const rightEye = face[263];
      const chin = face[152];
      const forehead = face[10];

      const eyeMidX = (leftEye.x + rightEye.x) / 2;
      const eyeMidY = (leftEye.y + rightEye.y) / 2;
      const noseDeltaX = Math.abs(nose.x - eyeMidX);
      const noseDeltaZ = Math.abs(nose.z);

      const headYaw = noseDeltaX * 200;
      const headPitch = Math.abs(nose.y - eyeMidY - 0.05) * 100;
      const headTilt = Math.abs(leftEye.y - rightEye.y) * 200;

      metrics.facingCamera = headYaw < 25 && headPitch < 20;

      const eyeContactRaw = Math.max(0, 100 - headYaw * 3 - headPitch * 2 - noseDeltaZ * 50);
      metrics.eyeContactScore = Math.min(100, Math.round(eyeContactRaw));

      prevNose.push({ x: nose.x, y: nose.y });
      if (prevNose.length > SMOOTHING_WINDOW) prevNose.shift();
      const noseJitter = prevNose.length > 1
        ? avg(prevNose.slice(1).map((p, i) => Math.hypot(p.x - prevNose[i].x, p.y - prevNose[i].y)))
        : 0;
      metrics.headStability = Math.min(100, Math.round(Math.max(0, 100 - noseJitter * 3000)));
    } else {
      metrics.faceDetected = false;
      metrics.eyeContactScore = 30;
      metrics.facingCamera = false;
    }

    if (poseResults.landmarks && poseResults.landmarks.length > 0) {
      const pose = poseResults.landmarks[0];
      metrics.bodyVisible = true;

      const leftShoulder = pose[11];
      const rightShoulder = pose[12];
      if (leftShoulder && rightShoulder) {
        const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
        metrics.shoulderBalance = Math.min(100, Math.round(Math.max(0, 100 - shoulderDiff * 500)));

        const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
        const nose = pose[0];
        if (nose) {
          const torsoLean = Math.abs(nose.x - (leftShoulder.x + rightShoulder.x) / 2);
          const forwardLean = nose.z - (leftShoulder.z + rightShoulder.z) / 2;
          const leanPenalty = torsoLean * 200 + Math.max(0, forwardLean * -100);
          metrics.postureScore = Math.min(100, Math.round(Math.max(0,
            metrics.shoulderBalance * 0.4 + metrics.headStability * 0.3 + Math.max(0, 100 - leanPenalty) * 0.3
          )));
        }
      }

      const leftWrist = pose[15];
      const rightWrist = pose[16];
      if (leftWrist && rightWrist) {
        const wristVis = ((leftWrist.visibility || 0) + (rightWrist.visibility || 0)) / 2;
        metrics.handsVisible = wristVis > 0.5;

        prevWrists.push({ lx: leftWrist.x, ly: leftWrist.y, rx: rightWrist.x, ry: rightWrist.y });
        if (prevWrists.length > SMOOTHING_WINDOW) prevWrists.shift();

        if (prevWrists.length > 1) {
          const movements = prevWrists.slice(1).map((w, i) => {
            const prev = prevWrists[i];
            return Math.hypot(w.lx - prev.lx, w.ly - prev.ly) + Math.hypot(w.rx - prev.rx, w.ry - prev.ry);
          });
          const avgMovement = avg(movements);
          metrics.gestureFrequency = Math.min(100, avgMovement * 500);
          metrics.excessiveMovement = metrics.gestureFrequency > 70;

          const gestureIdeal = 30;
          const gestureDiff = Math.abs(metrics.gestureFrequency - gestureIdeal);
          metrics.gestureScore = Math.min(100, Math.round(Math.max(0, 100 - gestureDiff * 1.5)));
        }
      }
    } else {
      metrics.bodyVisible = false;
      metrics.postureScore = 50;
      metrics.gestureScore = 50;
    }

    return metrics;
  } catch {
    return analyzeFallback(video);
  }
}

function analyzeFallback(video: HTMLVideoElement): VisionMetrics {
  const canvas = document.createElement('canvas');
  canvas.width = MAX_IMAGE_SIZE;
  canvas.height = MAX_IMAGE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return DEFAULT_METRICS;

  ctx.drawImage(video, 0, 0, MAX_IMAGE_SIZE, MAX_IMAGE_SIZE);
  const imageData = ctx.getImageData(0, 0, MAX_IMAGE_SIZE, MAX_IMAGE_SIZE);
  const data = imageData.data;

  let totalBrightness = 0;
  let centerBrightness = 0;
  let centerPixels = 0;
  const cx = MAX_IMAGE_SIZE / 2;
  const cy = MAX_IMAGE_SIZE / 3;
  const radius = MAX_IMAGE_SIZE / 4;

  for (let i = 0; i < data.length; i += 16) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    totalBrightness += brightness;

    const px = (i / 4) % MAX_IMAGE_SIZE;
    const py = Math.floor(i / 4 / MAX_IMAGE_SIZE);
    if (Math.hypot(px - cx, py - cy) < radius) {
      centerBrightness += brightness;
      centerPixels++;
    }
  }

  const avgBrightness = totalBrightness / (data.length / 16);
  const avgCenter = centerPixels > 0 ? centerBrightness / centerPixels : avgBrightness;
  const hasFace = Math.abs(avgCenter - avgBrightness) > 10 || avgCenter > 60;

  return {
    ...DEFAULT_METRICS,
    faceDetected: hasFace,
    facingCamera: hasFace,
    bodyVisible: avgBrightness > 30,
    postureScore: hasFace ? 65 + Math.random() * 15 : 40,
    eyeContactScore: hasFace ? 60 + Math.random() * 20 : 30,
    gestureScore: 60 + Math.random() * 15,
  };
}

export function destroyVisionAnalyzer() {
  try {
    if (faceMeshTask) { faceMeshTask.close(); faceMeshTask = null; }
    if (poseTask) { poseTask.close(); poseTask = null; }
  } catch {}
  initialized = false;
  initFailed = false;
  prevNose.length = 0;
  prevWrists.length = 0;
}

export function getAnalysisFPS(): number {
  return ANALYSIS_FPS;
}
