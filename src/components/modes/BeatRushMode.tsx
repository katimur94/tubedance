/**
 * BeatRushMode — DDR/StepMania-Style
 *
 * 4 Spalten (←↑↓→), Pfeile fallen von oben nach unten.
 * Spieler drückt die richtige Taste, wenn der Pfeil die Trefferzone erreicht.
 * Timing-Fenster: Perfect (±30ms), Great (±60ms), Cool (±100ms), Bad (±150ms), Miss
 *
 * Arrow rendering uses requestAnimationFrame + canvas for smooth 60fps animation.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { type HitRating, HIT_POINTS } from '../../types/gameTypes';
import { SoundEngine } from '../../utils/audio';

const soundEngine = new SoundEngine();

interface FallingArrow {
  id: number;
  column: number; // 0=Left, 1=Up, 2=Down, 3=Right
  targetTime: number; // performance.now() timestamp when it should be hit
  hit: boolean;
  rating?: HitRating;
}

interface BeatRushModeProps {
  bpm: number;
  onHit: (rating: HitRating, points: number) => void;
  onMiss: () => void;
  isPlaying: boolean;
}

const COLUMNS = [
  { key: 'ArrowLeft', icon: ArrowLeft, label: '←' },
  { key: 'ArrowUp', icon: ArrowUp, label: '↑' },
  { key: 'ArrowDown', icon: ArrowDown, label: '↓' },
  { key: 'ArrowRight', icon: ArrowRight, label: '→' },
];

const COL_COLORS = ['#06b6d4', '#22c55e', '#a855f7', '#ec4899']; // cyan, green, purple, pink

// Timing windows in ms
const TIMING = { Perfect: 30, Great: 60, Cool: 100, Bad: 150 };
const FALL_DURATION = 2000; // ms from top to hit zone
const HIT_ZONE_PCT = 0.82; // 82% from top

export function BeatRushMode({ bpm, onHit, onMiss, isPlaying }: BeatRushModeProps) {
  const [pressedColumns, setPressedColumns] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<{ col: number; rating: HitRating; id: number } | null>(null);
  const [laneGlow, setLaneGlow] = useState<Record<number, HitRating>>({});

  // All arrow state lives in refs for 60fps canvas rendering (no React re-renders needed)
  const arrowsRef = useRef<FallingArrow[]>([]);
  const nextIdRef = useRef(0);
  const hitIdsRef = useRef<Set<number>>(new Set());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Stable callback refs (avoid stale closures)
  const onHitRef = useRef(onHit);
  const onMissRef = useRef(onMiss);
  useEffect(() => { onHitRef.current = onHit; }, [onHit]);
  useEffect(() => { onMissRef.current = onMiss; }, [onMiss]);

  const feedbackTimerRef = useRef<any>(null);
  const laneGlowTimers = useRef<Record<number, any>>({});
  const spawnTimerRef = useRef<any>(null);

  // ── Spawn arrows based on BPM ──
  useEffect(() => {
    if (!isPlaying) return;
    const beatInterval = (60 / bpm) * 1000;
    const spawnInterval = beatInterval / 2;

    const spawn = () => {
      const now = performance.now();
      const numArrows = Math.random() < 0.15 ? 2 : 1;
      const cols = new Set<number>();
      while (cols.size < numArrows) cols.add(Math.floor(Math.random() * 4));

      for (const col of cols) {
        arrowsRef.current.push({
          id: nextIdRef.current++,
          column: col,
          targetTime: now + FALL_DURATION,
          hit: false,
        });
      }
    };

    spawn();
    spawnTimerRef.current = setInterval(spawn, spawnInterval);
    return () => clearInterval(spawnTimerRef.current);
  }, [bpm, isPlaying]);

  // ── Canvas animation loop (smooth 60fps) ──
  useEffect(() => {
    if (!isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;
    let missQueue = 0;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (time: number) => {
      if (cancelled) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) { animRef.current = requestAnimationFrame(draw); return; }

      const W = rect.width;
      const H = rect.height;
      const hitY = H * HIT_ZONE_PCT;
      const colW = W / 4;
      const arrowSize = Math.min(48, colW * 0.7);

      ctx.clearRect(0, 0, W, H);

      // Draw lane lines
      ctx.strokeStyle = 'rgba(128,128,128,0.1)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * colW, 0);
        ctx.lineTo(i * colW, H);
        ctx.stroke();
      }

      // Draw hit zone line
      ctx.strokeStyle = 'rgba(168,85,247,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, hitY);
      ctx.lineTo(W, hitY);
      ctx.stroke();

      // Draw hit zone glow
      const glowGrad = ctx.createLinearGradient(0, hitY - 30, 0, hitY + 30);
      glowGrad.addColorStop(0, 'rgba(168,85,247,0)');
      glowGrad.addColorStop(0.5, 'rgba(168,85,247,0.06)');
      glowGrad.addColorStop(1, 'rgba(168,85,247,0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, hitY - 30, W, 60);

      // Draw arrows + cleanup missed
      missQueue = 0;
      const now = performance.now();
      const kept: FallingArrow[] = [];

      for (const arrow of arrowsRef.current) {
        if (arrow.hit || hitIdsRef.current.has(arrow.id)) {
          // Keep hit arrows briefly for visual fade, then remove
          if (now - arrow.targetTime > 300) {
            hitIdsRef.current.delete(arrow.id);
            continue;
          }
          kept.push(arrow);
          continue;
        }

        // Check if missed
        if (now - arrow.targetTime > TIMING.Bad + 50) {
          missQueue++;
          continue;
        }

        kept.push(arrow);

        // Calculate position
        const progress = 1 - (arrow.targetTime - now) / FALL_DURATION;
        const y = progress * hitY;

        if (y < -arrowSize) continue;

        const x = arrow.column * colW + colW / 2;
        const color = COL_COLORS[arrow.column];

        // Arrow body (rounded rect)
        const half = arrowSize / 2;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x - half, y - half, arrowSize, arrowSize, 8);
        ctx.fill();

        // Arrow glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        // Draw arrow icon (triangle pointing up)
        const iconSize = arrowSize * 0.4;
        ctx.beginPath();
        const rotations = [Math.PI * 1.5, 0, Math.PI, Math.PI * 0.5]; // left, up, down, right
        const rot = rotations[arrow.column];
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.moveTo(0, -iconSize);
        ctx.lineTo(iconSize * 0.7, iconSize * 0.3);
        ctx.lineTo(-iconSize * 0.7, iconSize * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.shadowBlur = 0;
      }

      arrowsRef.current = kept;

      // Fire miss callbacks outside of draw (via microtask)
      if (missQueue > 0) {
        const count = missQueue;
        queueMicrotask(() => {
          soundEngine.init();
          soundEngine.playMiss();
          for (let i = 0; i < count; i++) onMissRef.current();
        });
      }

      // Bottom glow line
      const bottomY = hitY + H * 0.03;
      const lineGrad = ctx.createLinearGradient(0, bottomY, W, bottomY);
      lineGrad.addColorStop(0, 'rgba(6,182,212,0.3)');
      lineGrad.addColorStop(0.5, 'rgba(168,85,247,0.3)');
      lineGrad.addColorStop(1, 'rgba(236,72,153,0.3)');
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, bottomY);
      ctx.lineTo(W, bottomY);
      ctx.stroke();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isPlaying]);

  // ── Keyboard handler ──
  useEffect(() => {
    if (!isPlaying) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const colIndex = COLUMNS.findIndex(c => c.key === e.key);
      if (colIndex === -1) return;
      e.preventDefault();

      setPressedColumns(prev => new Set(prev).add(colIndex));

      // Find closest unhit arrow in this column
      const now = performance.now();
      let closest: FallingArrow | null = null;
      let closestDiff = Infinity;

      for (const a of arrowsRef.current) {
        if (a.column !== colIndex || a.hit || hitIdsRef.current.has(a.id)) continue;
        const diff = Math.abs(a.targetTime - now);
        if (diff < closestDiff) { closest = a; closestDiff = diff; }
      }

      if (!closest || closestDiff > TIMING.Bad) return;

      let rating: HitRating;
      if (closestDiff <= TIMING.Perfect) rating = 'Perfect';
      else if (closestDiff <= TIMING.Great) rating = 'Great';
      else if (closestDiff <= TIMING.Cool) rating = 'Cool';
      else rating = 'Bad';

      // Mark as hit atomically
      hitIdsRef.current.add(closest.id);
      closest.hit = true;
      closest.rating = rating;

      // Callbacks
      const points = HIT_POINTS[rating];
      onHitRef.current(rating, points);

      // Sound
      soundEngine.init();
      const soundMap: Record<string, 'perfect' | 'great' | 'cool' | 'bad'> = { Perfect: 'perfect', Great: 'great', Cool: 'cool', Bad: 'bad' };
      soundEngine.playHit(soundMap[rating] || 'cool');

      // Lane glow
      clearTimeout(laneGlowTimers.current[colIndex]);
      setLaneGlow(prev => ({ ...prev, [colIndex]: rating }));
      laneGlowTimers.current[colIndex] = setTimeout(() => {
        setLaneGlow(prev => { const n = { ...prev }; delete n[colIndex]; return n; });
      }, 200);

      // Feedback
      setFeedback({ col: colIndex, rating, id: closest.id });
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => setFeedback(null), 500);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const colIndex = COLUMNS.findIndex(c => c.key === e.key);
      if (colIndex === -1) return;
      e.preventDefault();
      setPressedColumns(prev => { const n = new Set(prev); n.delete(colIndex); return n; });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearTimeout(feedbackTimerRef.current);
      Object.values(laneGlowTimers.current).forEach(t => clearTimeout(t));
    };
  }, [isPlaying]);

  return (
    <div ref={containerRef} className="relative w-full max-w-lg mx-auto h-[50vh] overflow-hidden rounded-2xl border border-gray-800/50 bg-gray-950/50 backdrop-blur-sm">
      {/* Canvas for smooth arrow rendering */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Lane glow overlays (React layer, on top of canvas) */}
      <div className="absolute inset-0 flex z-[1] pointer-events-none">
        {COLUMNS.map((_, i) => {
          const glowRating = laneGlow[i];
          const glowColor = glowRating === 'Perfect' ? 'bg-yellow-500/20'
            : glowRating === 'Great' ? 'bg-green-500/15'
            : glowRating === 'Cool' ? 'bg-blue-500/10'
            : glowRating ? 'bg-orange-500/10' : '';
          return <div key={i} className={`flex-1 transition-colors duration-150 ${glowColor}`} />;
        })}
      </div>

      {/* Hit Zone buttons (React layer) */}
      <div className="absolute left-0 right-0 h-16 flex items-center z-10" style={{ top: `${HIT_ZONE_PCT * 100}%`, transform: 'translateY(-50%)' }}>
        {COLUMNS.map((col, i) => {
          const isPressed = pressedColumns.has(i);
          const Icon = col.icon;
          const color = COL_COLORS[i];

          return (
            <div key={i} className="flex-1 flex items-center justify-center">
              <div
                className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-75`}
                style={{
                  backgroundColor: isPressed ? color : 'rgba(17,24,39,0.8)',
                  borderColor: isPressed ? color : 'rgba(75,85,99,1)',
                  boxShadow: isPressed ? `0 0 20px ${color}88` : 'none',
                  transform: isPressed ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                <Icon size={28} strokeWidth={3} className={isPressed ? 'text-white' : 'text-gray-400'} style={!isPressed ? { color } : undefined} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Hit Feedback text */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            key={feedback.id}
            initial={{ scale: 0.5, opacity: 0, y: 5 }}
            animate={{ scale: 1.3, opacity: 1, y: -10 }}
            exit={{ scale: 0.8, opacity: 0, y: -25 }}
            className="absolute z-20 flex items-center justify-center pointer-events-none"
            style={{
              top: `${HIT_ZONE_PCT * 100 - 12}%`,
              left: `${feedback.col * 25}%`,
              width: '25%',
            }}
          >
            <span
              className={`font-black text-xl uppercase tracking-widest ${
                feedback.rating === 'Perfect'
                  ? 'text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.9)]'
                  : feedback.rating === 'Great'
                  ? 'text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.8)]'
                  : feedback.rating === 'Cool'
                  ? 'text-blue-400 drop-shadow-[0_0_12px_rgba(59,130,246,0.7)]'
                  : 'text-orange-400'
              }`}
            >
              {feedback.rating}!
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
