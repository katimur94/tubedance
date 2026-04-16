/**
 * StageBackground — Animierter Disco-Club Hintergrund
 *
 * Audition Online hatte immer eine stilisierte Tanzfläche mit:
 * - Leuchtenden Bodenkacheln (Disco Floor)
 * - Sich bewegende Lichteffekte
 * - Neon-Farben die zum BPM pulsieren
 * - Spotlights und Laser
 */

import { useEffect, useRef } from 'react';

interface StageBackgroundProps {
  bpm: number;
  intensity?: number; // 0-3, higher = more effects
  isPlaying?: boolean;
}

export function StageBackground({ bpm, intensity = 1, isPlaying = true }: StageBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;
    const beatInterval = (60 / bpm) * 1000;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (time: number) => {
      if (cancelled) return;
      const W = canvas.width;
      const H = canvas.height;

      // Dark background
      ctx.fillStyle = '#0a0515';
      ctx.fillRect(0, 0, W, H);

      const beatPhase = (time % beatInterval) / beatInterval;
      const pulse = Math.sin(beatPhase * Math.PI * 2) * 0.5 + 0.5;
      const slowPhase = (time % 8000) / 8000;

      // ── Disco Floor (perspective grid at bottom) ──
      const floorY = H * 0.55;
      const floorH = H - floorY;

      // Floor gradient
      const floorGrad = ctx.createLinearGradient(0, floorY, 0, H);
      floorGrad.addColorStop(0, 'rgba(30,0,60,0.3)');
      floorGrad.addColorStop(1, 'rgba(10,0,20,0.8)');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, floorY, W, floorH);

      // Disco floor tiles (perspective)
      const cols = 12;
      const rows = 6;
      const tileColors = [
        [255, 105, 180], // Pink
        [0, 200, 255],   // Cyan
        [168, 85, 247],  // Purple
        [250, 204, 21],  // Gold
        [52, 211, 153],  // Emerald
        [239, 68, 68],   // Red
      ];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Perspective projection
          const progress = row / rows;
          const perspective = 0.3 + progress * 0.7;
          const xCenter = W / 2;
          const tileW = (W / cols) * perspective;
          const x = xCenter + (col - cols / 2) * tileW;
          const y = floorY + (floorH / rows) * row;
          const tileH = (floorH / rows) * perspective * 0.9;

          // Animated color
          const colorIdx = (col + row + Math.floor(time / 500)) % tileColors.length;
          const [r, g, b] = tileColors[colorIdx];

          // Pulse on beat
          const tilePulse = ((col + row) % 3 === Math.floor(beatPhase * 3)) ? 0.15 + pulse * 0.15 : 0.04;
          const alpha = tilePulse * (isPlaying ? intensity : 0.3);

          ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.fillRect(x, y, tileW - 2, tileH - 1);

          // Tile border
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.5})`;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, tileW - 2, tileH - 1);
        }
      }

      // ── Spotlights ──
      if (isPlaying) {
        // Left spotlight
        const spotAngle1 = Math.sin(slowPhase * Math.PI * 2) * 0.3;
        const spotX1 = W * 0.2 + Math.sin(time / 2000) * W * 0.15;
        const spotGrad1 = ctx.createRadialGradient(spotX1, 0, 0, spotX1, H * 0.5, H * 0.6);
        spotGrad1.addColorStop(0, `rgba(255,105,180,${0.08 * intensity})`);
        spotGrad1.addColorStop(1, 'rgba(255,105,180,0)');
        ctx.fillStyle = spotGrad1;
        ctx.fillRect(0, 0, W, H);

        // Right spotlight
        const spotX2 = W * 0.8 + Math.cos(time / 2500) * W * 0.15;
        const spotGrad2 = ctx.createRadialGradient(spotX2, 0, 0, spotX2, H * 0.5, H * 0.6);
        spotGrad2.addColorStop(0, `rgba(0,200,255,${0.07 * intensity})`);
        spotGrad2.addColorStop(1, 'rgba(0,200,255,0)');
        ctx.fillStyle = spotGrad2;
        ctx.fillRect(0, 0, W, H);

        // Center spotlight (gold, on beat)
        if (pulse > 0.7) {
          const centerGrad = ctx.createRadialGradient(W / 2, H * 0.2, 0, W / 2, H * 0.5, H * 0.4);
          centerGrad.addColorStop(0, `rgba(250,204,21,${0.04 * pulse * intensity})`);
          centerGrad.addColorStop(1, 'rgba(250,204,21,0)');
          ctx.fillStyle = centerGrad;
          ctx.fillRect(0, 0, W, H);
        }
      }

      // ── Laser beams ──
      if (isPlaying && intensity >= 2) {
        const laserCount = Math.min(intensity, 4);
        for (let i = 0; i < laserCount; i++) {
          const lx = W * 0.3 + (i / laserCount) * W * 0.4;
          const angle = Math.sin(time / 1500 + i * 1.5) * 0.4;
          const endX = lx + Math.sin(angle) * H;
          const endY = H;

          ctx.beginPath();
          ctx.moveTo(lx, 0);
          ctx.lineTo(endX, endY);
          const laserColor = tileColors[i % tileColors.length];
          ctx.strokeStyle = `rgba(${laserColor[0]},${laserColor[1]},${laserColor[2]},${0.06 * intensity})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // ── Side walls (subtle neon strips) ──
      // Left wall strip
      const wallGrad1 = ctx.createLinearGradient(0, 0, 30, 0);
      wallGrad1.addColorStop(0, `rgba(168,85,247,${0.1 + pulse * 0.05})`);
      wallGrad1.addColorStop(1, 'rgba(168,85,247,0)');
      ctx.fillStyle = wallGrad1;
      ctx.fillRect(0, 0, 30, H);

      // Right wall strip
      const wallGrad2 = ctx.createLinearGradient(W, 0, W - 30, 0);
      wallGrad2.addColorStop(0, `rgba(236,72,153,${0.1 + pulse * 0.05})`);
      wallGrad2.addColorStop(1, 'rgba(236,72,153,0)');
      ctx.fillStyle = wallGrad2;
      ctx.fillRect(W - 30, 0, 30, H);

      // ── Top ambient glow ──
      const topGlow = ctx.createLinearGradient(0, 0, 0, H * 0.3);
      topGlow.addColorStop(0, `rgba(30,0,60,${0.5 + pulse * 0.1})`);
      topGlow.addColorStop(1, 'rgba(30,0,60,0)');
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, W, H * 0.3);

      // ── Floating particles ──
      if (isPlaying) {
        const particleCount = Math.floor(intensity * 8) + 5;
        for (let i = 0; i < particleCount; i++) {
          const px = (Math.sin(time / 3000 + i * 2.1) * 0.5 + 0.5) * W;
          const py = (Math.cos(time / 4000 + i * 1.7) * 0.5 + 0.5) * H * 0.6;
          const pSize = 1.5 + Math.sin(time / 1000 + i) * 1;
          const pAlpha = 0.2 + Math.sin(time / 800 + i * 0.7) * 0.15;
          const color = tileColors[i % tileColors.length];

          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${pAlpha})`;
          ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [bpm, intensity, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full z-0"
      style={{ imageRendering: 'auto' }}
    />
  );
}
