import { useRef, useEffect } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

interface Props {
  className?: string;
  glassmorphism?: boolean;
}

export default function AudioVisualizer({ className = '', glassmorphism = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isPlaying, getAnalyserNode } = useMusicPlayer();
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const analyser = getAnalyserNode();
      if (!analyser || !isPlaying) {
        // Idle: gentle wave
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const y = h / 2 + Math.sin(x * 0.02 + Date.now() * 0.001) * 10;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'hsla(245, 58%, 62%, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      // Bars
      const barWidth = (w / bufferLength) * 2.5;
      const colors = [
        'hsla(245, 58%, 62%,',  // primary
        'hsla(199, 89%, 48%,',  // info
        'hsla(280, 60%, 55%,',  // purple
        'hsla(152, 69%, 45%,',  // success
      ];

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * h * 0.8;
        const x = i * barWidth;
        const colorIdx = Math.floor((i / bufferLength) * colors.length);
        const alpha = glassmorphism ? '0.6)' : '0.9)';
        
        const gradient = ctx.createLinearGradient(x, h, x, h - barHeight);
        gradient.addColorStop(0, colors[colorIdx % colors.length] + alpha);
        gradient.addColorStop(1, colors[colorIdx % colors.length] + '0.1)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);
      }

      // Waveform overlay
      analyser.getByteTimeDomainData(dataArray);
      ctx.beginPath();
      const sliceWidth = w / bufferLength;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * h) / 2;
        i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * sliceWidth, y);
      }
      ctx.strokeStyle = glassmorphism ? 'hsla(245, 58%, 62%, 0.4)' : 'hsla(245, 58%, 62%, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, getAnalyserNode, glassmorphism]);

  return <canvas ref={canvasRef} className={`w-full ${className}`} style={{ height: '160px' }} />;
}
