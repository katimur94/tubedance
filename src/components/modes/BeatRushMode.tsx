/**
 * BeatRushMode — DDR/StepMania-Style
 *
 * 4 Spalten (←↑↓→), Pfeile fallen von oben nach unten.
 * Spieler drückt die richtige Taste, wenn der Pfeil die Trefferzone erreicht.
 * Timing-Fenster: Perfect (±30ms), Great (±60ms), Cool (±100ms), Bad (±150ms), Miss
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { type HitRating, HIT_POINTS } from '../../types/gameTypes';

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
  { key: 'ArrowLeft', icon: ArrowLeft, label: '←', color: 'cyan' },
  { key: 'ArrowUp', icon: ArrowUp, label: '↑', color: 'green' },
  { key: 'ArrowDown', icon: ArrowDown, label: '↓', color: 'purple' },
  { key: 'ArrowRight', icon: ArrowRight, label: '→', color: 'pink' },
];

const COLUMN_COLORS = [
  { bg: 'bg-cyan-500', glow: 'shadow-[0_0_20px_rgba(6,182,212,0.6)]', text: 'text-cyan-400', border: 'border-cyan-500' },
  { bg: 'bg-green-500', glow: 'shadow-[0_0_20px_rgba(34,197,94,0.6)]', text: 'text-green-400', border: 'border-green-500' },
  { bg: 'bg-purple-500', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.6)]', text: 'text-purple-400', border: 'border-purple-500' },
  { bg: 'bg-pink-500', glow: 'shadow-[0_0_20px_rgba(236,72,153,0.6)]', text: 'text-pink-400', border: 'border-pink-500' },
];

// Timing windows in ms
const TIMING = {
  Perfect: 30,
  Great: 60,
  Cool: 100,
  Bad: 150,
};

const FALL_DURATION = 2000; // ms from top to hit zone
const HIT_ZONE_Y = 85; // % from top

export function BeatRushMode({ bpm, onHit, onMiss, isPlaying }: BeatRushModeProps) {
  const [arrows, setArrows] = useState<FallingArrow[]>([]);
  const [pressedColumns, setPressedColumns] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<{ col: number; rating: HitRating; id: number } | null>(null);
  const nextIdRef = useRef(0);
  const spawnTimerRef = useRef<number | null>(null);
  const arrowsRef = useRef<FallingArrow[]>([]);

  // Keep ref in sync
  useEffect(() => {
    arrowsRef.current = arrows;
  }, [arrows]);

  // Spawn arrows based on BPM
  useEffect(() => {
    if (!isPlaying) return;

    const beatInterval = (60 / bpm) * 1000; // ms per beat
    const spawnInterval = beatInterval / 2; // spawn on every half-beat

    const spawn = () => {
      const now = performance.now();
      // Pick 1-2 random columns
      const numArrows = Math.random() < 0.15 ? 2 : 1;
      const cols = new Set<number>();
      while (cols.size < numArrows) {
        cols.add(Math.floor(Math.random() * 4));
      }

      const newArrows: FallingArrow[] = [...cols].map(col => ({
        id: nextIdRef.current++,
        column: col,
        targetTime: now + FALL_DURATION,
        hit: false,
      }));

      setArrows(prev => [...prev, ...newArrows]);
    };

    // Spawn first arrow immediately
    spawn();
    spawnTimerRef.current = window.setInterval(spawn, spawnInterval);

    return () => {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    };
  }, [bpm, isPlaying]);

  // Clean up old arrows (missed or hit)
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = performance.now();
      setArrows(prev => {
        const kept: FallingArrow[] = [];
        for (const arrow of prev) {
          if (arrow.hit) {
            // Remove hit arrows after animation
            if (now - arrow.targetTime > 500) continue;
            kept.push(arrow);
          } else if (now - arrow.targetTime > TIMING.Bad + 50) {
            // Missed
            onMiss();
          } else {
            kept.push(arrow);
          }
        }
        return kept;
      });
    }, 100);

    return () => clearInterval(cleanup);
  }, [onMiss]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const colIndex = COLUMNS.findIndex(c => c.key === e.key);
      if (colIndex === -1) return;
      e.preventDefault();

      setPressedColumns(prev => new Set(prev).add(colIndex));

      // Find closest unhit arrow in this column
      const now = performance.now();
      const columnArrows = arrowsRef.current
        .filter(a => a.column === colIndex && !a.hit)
        .sort((a, b) => Math.abs(a.targetTime - now) - Math.abs(b.targetTime - now));

      if (columnArrows.length === 0) return;

      const closest = columnArrows[0];
      const diff = Math.abs(now - closest.targetTime);

      let rating: HitRating;
      if (diff <= TIMING.Perfect) rating = 'Perfect';
      else if (diff <= TIMING.Great) rating = 'Great';
      else if (diff <= TIMING.Cool) rating = 'Cool';
      else if (diff <= TIMING.Bad) rating = 'Bad';
      else return; // Too far, ignore

      // Mark as hit
      setArrows(prev =>
        prev.map(a => (a.id === closest.id ? { ...a, hit: true, rating } : a))
      );

      const points = HIT_POINTS[rating];
      onHit(rating, points);

      setFeedback({ col: colIndex, rating, id: closest.id });
      setTimeout(() => setFeedback(null), 500);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const colIndex = COLUMNS.findIndex(c => c.key === e.key);
      if (colIndex === -1) return;
      setPressedColumns(prev => {
        const next = new Set(prev);
        next.delete(colIndex);
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onHit]);

  return (
    <div className="relative w-full max-w-lg mx-auto h-[70vh] overflow-hidden">
      {/* Background lane lines */}
      <div className="absolute inset-0 flex">
        {COLUMNS.map((_, i) => (
          <div key={i} className="flex-1 border-x border-gray-800/30" />
        ))}
      </div>

      {/* Hit Zone */}
      <div
        className="absolute left-0 right-0 h-16 flex items-center z-10"
        style={{ top: `${HIT_ZONE_Y}%` }}
      >
        {COLUMNS.map((col, i) => {
          const colors = COLUMN_COLORS[i];
          const isPressed = pressedColumns.has(i);
          const Icon = col.icon;

          return (
            <div key={i} className="flex-1 flex items-center justify-center">
              <div
                className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-75 ${
                  isPressed
                    ? `${colors.bg} ${colors.glow} ${colors.border} scale-110`
                    : `bg-gray-900/80 border-gray-600 ${colors.text}`
                }`}
              >
                <Icon size={28} strokeWidth={3} className={isPressed ? 'text-white' : ''} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Falling Arrows */}
      {arrows.map(arrow => {
        const now = performance.now();
        const progress = 1 - (arrow.targetTime - now) / FALL_DURATION;
        const topPercent = progress * HIT_ZONE_Y;

        if (topPercent < -10 || arrow.hit) return null;

        const Icon = COLUMNS[arrow.column].icon;
        const colors = COLUMN_COLORS[arrow.column];

        return (
          <div
            key={arrow.id}
            className="absolute flex items-center justify-center transition-none"
            style={{
              top: `${topPercent}%`,
              left: `${arrow.column * 25}%`,
              width: '25%',
            }}
          >
            <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center ${colors.glow}`}>
              <Icon size={24} className="text-white" strokeWidth={3} />
            </div>
          </div>
        );
      })}

      {/* Hit Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            key={feedback.id}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="absolute z-20 flex items-center justify-center"
            style={{
              top: `${HIT_ZONE_Y - 8}%`,
              left: `${feedback.col * 25}%`,
              width: '25%',
            }}
          >
            <span
              className={`font-black text-lg uppercase tracking-widest ${
                feedback.rating === 'Perfect'
                  ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]'
                  : feedback.rating === 'Great'
                  ? 'text-green-400'
                  : feedback.rating === 'Cool'
                  ? 'text-blue-400'
                  : 'text-orange-400'
              }`}
            >
              {feedback.rating}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom glow line */}
      <div
        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-50"
        style={{ top: `${HIT_ZONE_Y + 5}%` }}
      />
    </div>
  );
}
