/**
 * SyncBar — Audition Online "Beat Bar" — FETT & AUFFÄLLIG
 *
 * Großer horizontaler Balken, leuchtende Kugel von links nach rechts.
 * 4 Beats im 4/4-Takt. Hit-Zone am rechten Ende.
 * UNMÖGLICH zu übersehen — wie im Original!
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SyncBarProps {
  bpm: number;
  onHit: (result: string) => void;
  locked?: boolean;
  level?: number;
  isFinishMove?: boolean;
  chanceMode?: boolean;
}

const RATING_STYLES: Record<string, { className: string; text: string }> = {
  Perfect: { className: 'rating-perfect text-5xl', text: 'PERFECT!' },
  Great: { className: 'rating-great text-4xl', text: 'GREAT!' },
  Cool: { className: 'rating-cool text-3xl', text: 'COOL' },
  Bad: { className: 'rating-bad text-3xl', text: 'BAD' },
  Miss: { className: 'rating-miss text-3xl', text: 'MISS...' },
  'PFEILE!': { className: 'text-gray-500 text-2xl', text: '⬆ PFEILE EINGEBEN! ⬆' },
};

export function SyncBar({ bpm, onHit, locked, level = 1, isFinishMove = false, chanceMode = false }: SyncBarProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackKey, setFeedbackKey] = useState(0);
  const [beatPulse, setBeatPulse] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const positionRef = useRef(0);
  const startTimeRef = useRef(performance.now());
  const animFrameRef = useRef<number>(0);
  const cancelledRef = useRef(false);
  const lastBeatRef = useRef(-1);

  const duration = (60 / bpm) * 4 * 1000;
  const BAR_HEIGHT = 64; // Bigger bar!

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    cancelledRef.current = false;
    startTimeRef.current = performance.now();

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    const draw = (time: number) => {
      if (cancelledRef.current) return;

      const elapsed = time - startTimeRef.current;
      const progress = (elapsed % duration) / duration;
      positionRef.current = progress;

      // Beat pulse detection
      const currentBeat = Math.floor(progress * 4);
      if (currentBeat !== lastBeatRef.current) {
        lastBeatRef.current = currentBeat;
        setBeatPulse(true);
        setTimeout(() => setBeatPulse(false), 100);
      }

      ctx.clearRect(0, 0, W, H);

      const barY = 8;
      const barH = H - 16;
      const barRadius = barH / 2;

      // ── Bar Background with gradient ──
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(4, barY, W - 8, barH, barRadius);
      const bgGrad = ctx.createLinearGradient(0, barY, 0, barY + barH);
      if (isFinishMove) {
        bgGrad.addColorStop(0, 'rgba(30,58,138,0.8)');
        bgGrad.addColorStop(1, 'rgba(17,24,39,0.9)');
      } else if (chanceMode) {
        bgGrad.addColorStop(0, 'rgba(127,29,29,0.7)');
        bgGrad.addColorStop(1, 'rgba(17,24,39,0.9)');
      } else {
        bgGrad.addColorStop(0, 'rgba(30,15,60,0.8)');
        bgGrad.addColorStop(1, 'rgba(10,5,30,0.9)');
      }
      ctx.fillStyle = bgGrad;
      ctx.fill();

      // Border glow
      ctx.strokeStyle = isFinishMove ? 'rgba(96,165,250,0.6)' : chanceMode ? 'rgba(248,113,113,0.5)' : 'rgba(168,85,247,0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner shadow
      const innerShadow = ctx.createLinearGradient(0, barY, 0, barY + 10);
      innerShadow.addColorStop(0, 'rgba(0,0,0,0.4)');
      innerShadow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = innerShadow;
      ctx.fillRect(8, barY + 2, W - 16, 10);
      ctx.restore();

      // ── Beat Dividers (big, visible) ──
      for (let i = 1; i <= 3; i++) {
        const x = 4 + (W - 8) * (i / 4);
        ctx.beginPath();
        ctx.moveTo(x, barY + 6);
        ctx.lineTo(x, barY + barH - 6);
        ctx.strokeStyle = 'rgba(168,85,247,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Beat number label
        ctx.fillStyle = 'rgba(168,85,247,0.5)';
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`${i}`, x, barY - 2);
      }
      // Beat 4 label
      ctx.fillStyle = isFinishMove ? 'rgba(96,165,250,0.8)' : 'rgba(250,204,21,0.7)';
      ctx.font = 'bold 16px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('4', 4 + (W - 8) * 0.9, barY - 2);

      // ── Hit Zone (right side, 85-95%) ──
      const hitStart = 4 + (W - 8) * 0.85;
      const hitEnd = 4 + (W - 8) * 0.95;
      const hitW = hitEnd - hitStart;
      const hitCenterX = hitStart + hitW / 2;

      // Zone glow
      const zoneGlow = ctx.createRadialGradient(hitCenterX, barY + barH / 2, 0, hitCenterX, barY + barH / 2, hitW * 1.5);
      if (isFinishMove) {
        zoneGlow.addColorStop(0, 'rgba(59,130,246,0.4)');
        zoneGlow.addColorStop(1, 'rgba(59,130,246,0)');
      } else if (chanceMode) {
        zoneGlow.addColorStop(0, 'rgba(239,68,68,0.4)');
        zoneGlow.addColorStop(1, 'rgba(239,68,68,0)');
      } else {
        zoneGlow.addColorStop(0, 'rgba(250,204,21,0.3)');
        zoneGlow.addColorStop(1, 'rgba(250,204,21,0)');
      }
      ctx.fillStyle = zoneGlow;
      ctx.fillRect(hitStart - 20, barY - 10, hitW + 40, barH + 20);

      // Zone fill
      ctx.save();
      ctx.beginPath();
      ctx.rect(hitStart, barY + 2, hitW, barH - 4);
      ctx.clip();
      const zoneFill = ctx.createLinearGradient(hitStart, barY, hitEnd, barY);
      if (isFinishMove) {
        zoneFill.addColorStop(0, 'rgba(59,130,246,0.15)');
        zoneFill.addColorStop(0.5, 'rgba(59,130,246,0.35)');
        zoneFill.addColorStop(1, 'rgba(59,130,246,0.15)');
      } else if (chanceMode) {
        zoneFill.addColorStop(0, 'rgba(239,68,68,0.15)');
        zoneFill.addColorStop(0.5, 'rgba(239,68,68,0.3)');
        zoneFill.addColorStop(1, 'rgba(239,68,68,0.15)');
      } else {
        zoneFill.addColorStop(0, 'rgba(250,204,21,0.1)');
        zoneFill.addColorStop(0.5, 'rgba(250,204,21,0.25)');
        zoneFill.addColorStop(1, 'rgba(250,204,21,0.1)');
      }
      ctx.fillStyle = zoneFill;
      ctx.fillRect(hitStart, barY + 2, hitW, barH - 4);
      ctx.restore();

      // Zone borders
      ctx.beginPath();
      ctx.rect(hitStart, barY + 2, hitW, barH - 4);
      ctx.strokeStyle = isFinishMove ? 'rgba(96,165,250,0.9)' : chanceMode ? 'rgba(248,113,113,0.9)' : 'rgba(250,204,21,0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Perfect center line
      const perfectX = hitStart + hitW / 2;
      ctx.beginPath();
      ctx.moveTo(perfectX, barY + 4);
      ctx.lineTo(perfectX, barY + barH - 4);
      ctx.strokeStyle = isFinishMove ? 'rgba(147,197,253,1)' : chanceMode ? 'rgba(252,165,165,1)' : 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // ── Ball (LARGE, IMPOSSIBLE TO MISS) ──
      const ballAreaStart = 4;
      const ballAreaWidth = W - 8;
      const ballX = ballAreaStart + progress * ballAreaWidth;
      const ballY = barY + barH / 2;
      const ballRadius = barH * 0.42;

      // Trail
      for (let t = 5; t >= 1; t--) {
        const trailProgress = Math.max(0, progress - t * 0.008);
        const trailX = ballAreaStart + trailProgress * ballAreaWidth;
        const alpha = 0.06 * (6 - t);
        ctx.beginPath();
        ctx.arc(trailX, ballY, ballRadius * (0.5 + t * 0.06), 0, Math.PI * 2);
        ctx.fillStyle = isFinishMove
          ? `rgba(96,165,250,${alpha})`
          : chanceMode
          ? `rgba(248,113,113,${alpha})`
          : `rgba(255,255,255,${alpha})`;
        ctx.fill();
      }

      // Ball outer glow
      const outerGlow = ctx.createRadialGradient(ballX, ballY, 0, ballX, ballY, ballRadius * 3);
      if (isFinishMove) {
        outerGlow.addColorStop(0, 'rgba(59,130,246,0.5)');
        outerGlow.addColorStop(1, 'rgba(59,130,246,0)');
      } else if (chanceMode) {
        outerGlow.addColorStop(0, 'rgba(239,68,68,0.5)');
        outerGlow.addColorStop(1, 'rgba(239,68,68,0)');
      } else {
        outerGlow.addColorStop(0, 'rgba(255,255,255,0.5)');
        outerGlow.addColorStop(1, 'rgba(255,255,255,0)');
      }
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius * 3, 0, Math.PI * 2);
      ctx.fillStyle = outerGlow;
      ctx.fill();

      // Ball body
      const ballGrad = ctx.createRadialGradient(
        ballX - ballRadius * 0.3, ballY - ballRadius * 0.3, 0,
        ballX, ballY, ballRadius
      );
      if (isFinishMove) {
        ballGrad.addColorStop(0, '#bfdbfe');
        ballGrad.addColorStop(0.4, '#3b82f6');
        ballGrad.addColorStop(1, '#1e3a8a');
      } else if (chanceMode) {
        ballGrad.addColorStop(0, '#fecaca');
        ballGrad.addColorStop(0.4, '#ef4444');
        ballGrad.addColorStop(1, '#991b1b');
      } else {
        ballGrad.addColorStop(0, '#ffffff');
        ballGrad.addColorStop(0.3, '#f0f0f0');
        ballGrad.addColorStop(0.7, '#a0a0a0');
        ballGrad.addColorStop(1, '#606060');
      }
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
      ctx.fillStyle = ballGrad;
      ctx.fill();

      // Ball specular highlight
      ctx.beginPath();
      ctx.ellipse(ballX - ballRadius * 0.2, ballY - ballRadius * 0.25, ballRadius * 0.4, ballRadius * 0.25, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fill();

      // Ball border
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
      ctx.strokeStyle = isFinishMove ? 'rgba(147,197,253,0.6)' : chanceMode ? 'rgba(252,165,165,0.6)' : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // ── Level on bar ──
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`Lv.${level}`, 16, barY + barH / 2 + 5);

      // ── "SPACE" text on right ──
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText('SPACE ►', W - 16, barY + barH / 2 + 4);

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelledRef.current = true;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [bpm, duration, isFinishMove, chanceMode, level]);

  // Keyboard
  const lockedRef = useRef(locked);
  useEffect(() => { lockedRef.current = locked; }, [locked]);
  const onHitRef = useRef(onHit);
  useEffect(() => { onHitRef.current = onHit; }, [onHit]);

  // Debounce flag — prevents spacebar spam exploit
  const canHitRef = useRef(true);
  const hitCooldownRef = useRef<any>(null);

  const evaluateHit = useCallback(() => {
    const pos = positionRef.current;
    const target = 0.90;
    const distance = Math.abs(pos - target);

    // Tighter timing windows (more like Audition Online)
    let result = 'Miss';
    if (distance < 0.015) result = 'Perfect';
    else if (distance < 0.04) result = 'Great';
    else if (distance < 0.08) result = 'Cool';
    else if (distance < 0.14) result = 'Bad';

    setFeedback(result);
    setFeedbackKey(k => k + 1);
    setTimeout(() => setFeedback(null), 1000);
    onHitRef.current(result);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (lockedRef.current) {
          setFeedback('PFEILE!');
          setFeedbackKey(k => k + 1);
          setTimeout(() => setFeedback(null), 800);
          onHitRef.current('LOCKED');
          return;
        }
        // Debounce: ignore rapid presses within 150ms
        if (!canHitRef.current) return;
        canHitRef.current = false;
        clearTimeout(hitCooldownRef.current);
        hitCooldownRef.current = setTimeout(() => { canHitRef.current = true; }, 150);
        evaluateHit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      clearTimeout(hitCooldownRef.current);
    };
  }, [evaluateHit]);

  return (
    <div className="w-full flex flex-col items-center gap-1">
      {/* ═══ HIT RATING POPUP ═══ */}
      <div className="h-16 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {feedback && (
            <motion.div
              key={feedbackKey}
              initial={{ scale: 0.2, opacity: 0, y: 15 }}
              animate={{ scale: 1.1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: -15 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
              className={`font-black uppercase tracking-[0.15em] ${RATING_STYLES[feedback]?.className || 'text-gray-400 text-2xl'}`}
            >
              {RATING_STYLES[feedback]?.text || feedback}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ BEAT BAR ═══ */}
      <div className={`relative w-full max-w-4xl transition-all ${
        beatPulse ? 'scale-[1.01]' : 'scale-100'
      } ${
        isFinishMove ? 'shadow-[0_0_40px_rgba(59,130,246,0.5)]' :
        chanceMode ? 'shadow-[0_0_35px_rgba(239,68,68,0.4)]' :
        'shadow-[0_0_25px_rgba(168,85,247,0.3)]'
      }`} style={{ transition: 'transform 0.08s ease-out' }}>
        <canvas
          ref={canvasRef}
          className="w-full rounded-full"
          style={{ height: `${BAR_HEIGHT}px` }}
        />
      </div>

      {/* Helper */}
      <p className={`text-[11px] tracking-[0.3em] uppercase font-bold mt-1 ${
        isFinishMove ? 'text-blue-400 animate-pulse' : chanceMode ? 'text-red-400' : 'text-purple-500'
      }`}>
        {isFinishMove ? '★ FINISH — Drücke SPACE im perfekten Moment! ★' :
         chanceMode ? '🔴 CHANCE MODE — SPACE drücken!' :
         '[ SPACE ] wenn der Ball die Zone trifft'}
      </p>
    </div>
  );
}
