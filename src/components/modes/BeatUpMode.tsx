/**
 * BeatUpMode — Klassischer Audition-Modus (verbessert)
 *
 * Spielmechanik:
 * 1. Eine Reihe von Pfeilen (4-8, steigend) wird angezeigt
 * 2. Spieler gibt die Pfeile in der richtigen Reihenfolge ein
 * 3. Spacebar im richtigen Moment drücken (SyncBar)
 * 4. Bewertung: Perfect > Great > Cool > Bad > Miss
 * 5. Finish Move nach jeder 4. erfolgreichen Runde (8-12 Pfeile)
 * 6. Buchstaben-Bewertungen (S, A, B, C, D, F) pro Runde
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Star, Flame } from 'lucide-react';
import { SyncBar } from '../SyncBar';
import { type HitRating, type LetterGrade, getLetterGrade, GRADE_COLORS, HIT_POINTS } from '../../types/gameTypes';

const DIRECTIONS = ['Up', 'Down', 'Left', 'Right'] as const;
type Direction = (typeof DIRECTIONS)[number];

interface BeatUpModeProps {
  bpm: number;
  onHit: (rating: HitRating, points: number) => void;
  onMiss: () => void;
  combo: number;
  round: number;
}

const DIRECTION_ICONS = {
  Up: ArrowUp,
  Down: ArrowDown,
  Left: ArrowLeft,
  Right: ArrowRight,
};

function generateSequence(round: number, isFinishMove: boolean): Direction[] {
  const baseLength = Math.min(4 + Math.floor(round / 2), 8);
  const length = isFinishMove ? Math.min(baseLength + 4, 12) : baseLength;
  return Array.from({ length }, () => DIRECTIONS[Math.floor(Math.random() * 4)]);
}

export function BeatUpMode({ bpm, onHit, onMiss, combo, round }: BeatUpModeProps) {
  const [sequence, setSequence] = useState<Direction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sequenceReady, setSequenceReady] = useState(false);
  const [errorHighlight, setErrorHighlight] = useState(false);
  const [roundRatings, setRoundRatings] = useState<HitRating[]>([]);
  const [showGrade, setShowGrade] = useState<LetterGrade | null>(null);
  const [successfulRounds, setSuccessfulRounds] = useState(0);
  const errorTimeoutRef = useRef<any>(null);
  const isFinishMove = successfulRounds > 0 && successfulRounds % 4 === 0;

  const resetSequence = useCallback(() => {
    const newSeq = generateSequence(round, isFinishMove);
    setSequence(newSeq);
    setCurrentIndex(0);
    setSequenceReady(false);
    setErrorHighlight(false);
  }, [round, isFinishMove]);

  useEffect(() => {
    resetSequence();
  }, [round]);

  // Keyboard input for sequence
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sequenceReady) return;

      const keyMap: Record<string, Direction> = {
        ArrowUp: 'Up',
        ArrowDown: 'Down',
        ArrowLeft: 'Left',
        ArrowRight: 'Right',
      };

      const direction = keyMap[e.key];
      if (!direction || currentIndex >= sequence.length) return;

      e.preventDefault();

      if (sequence[currentIndex] === direction) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        if (nextIndex === sequence.length) {
          setSequenceReady(true);
        }
      } else {
        clearTimeout(errorTimeoutRef.current);
        setErrorHighlight(true);
        errorTimeoutRef.current = setTimeout(() => {
          setCurrentIndex(0);
          setErrorHighlight(false);
        }, 300);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sequence, currentIndex, sequenceReady]);

  const handleSyncHit = (result: string) => {
    if (result === 'LOCKED' || !sequenceReady) {
      onMiss();
      resetSequence();
      return;
    }

    const rating = result as HitRating;
    if (rating === 'Miss') {
      onMiss();
      resetSequence();
      return;
    }

    const points = HIT_POINTS[rating] * (isFinishMove ? 2 : 1);
    onHit(rating, points);

    // Track round ratings
    const newRatings = [...roundRatings, rating];
    setRoundRatings(newRatings);

    // Calculate round grade
    const avgAccuracy = newRatings.reduce((acc, r) => {
      const scores: Record<string, number> = { Perfect: 100, Great: 80, Cool: 60, Bad: 30, Miss: 0 };
      return acc + (scores[r] || 0);
    }, 0) / newRatings.length;

    const grade = getLetterGrade(avgAccuracy);
    setShowGrade(grade);
    setTimeout(() => setShowGrade(null), 1500);

    setSuccessfulRounds(s => s + 1);
    resetSequence();
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Finish Move Banner */}
      <AnimatePresence>
        {isFinishMove && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-full text-white font-black uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(250,204,21,0.5)] border border-yellow-400/50"
          >
            <Star size={18} fill="currentColor" />
            FINISH MOVE — 2x PUNKTE!
            <Star size={18} fill="currentColor" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Letter Grade Popup */}
      <AnimatePresence>
        {showGrade && (
          <motion.div
            initial={{ scale: 3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className={`absolute top-1/3 z-30 text-[120px] font-black ${GRADE_COLORS[showGrade]}`}
          >
            {showGrade}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sequence Display — Audition-style box */}
      <div className={`relative flex items-center gap-2 px-6 py-4 rounded-2xl backdrop-blur-xl border-2 transition-all duration-200 ${
        errorHighlight
          ? 'bg-red-950/60 border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.4)]'
          : sequenceReady
          ? 'bg-emerald-950/60 border-emerald-400/80 shadow-[0_0_30px_rgba(52,211,153,0.4)]'
          : 'bg-gray-900/80 border-gray-600/50 shadow-[0_0_20px_rgba(0,0,0,0.5)]'
      }`}>
        {/* Round Info */}
        <div className="absolute -top-3 left-4 px-3 py-0.5 bg-gray-800 border border-gray-600 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400">
          Runde {round + 1} {isFinishMove && '★ FINISH'}
        </div>

        {sequence.map((dir, i) => {
          const Icon = DIRECTION_ICONS[dir];
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex && !sequenceReady;

          return (
            <motion.div
              key={`${round}-${i}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`relative w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all duration-150 ${
                errorHighlight
                  ? 'border-red-500 bg-red-900/50 text-red-400'
                  : isCompleted
                  ? 'border-emerald-400 bg-emerald-900/50 text-emerald-400 scale-90'
                  : isCurrent
                  ? 'border-cyan-400 bg-cyan-900/30 text-cyan-300 scale-110 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                  : 'border-gray-600 bg-gray-800/50 text-gray-500'
              }`}
            >
              <Icon size={24} strokeWidth={3} />
              {isCompleted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full flex items-center justify-center"
                >
                  <span className="text-[8px] text-black font-black">✓</span>
                </motion.div>
              )}
            </motion.div>
          );
        })}

        {/* Sequence ready indicator */}
        {sequenceReady && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="ml-3 px-4 py-2 bg-emerald-500 text-black rounded-xl font-black text-xs uppercase tracking-widest"
          >
            SPACE!
          </motion.div>
        )}
      </div>

      {/* Combo Fire Effect */}
      {combo >= 10 && (
        <div className="flex items-center gap-2 text-orange-400">
          <Flame size={16} className="animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest">
            {combo >= 50 ? 'INFERNO!' : combo >= 30 ? 'ON FIRE!' : 'HEISS!'}
          </span>
          <Flame size={16} className="animate-pulse" />
        </div>
      )}

      {/* SyncBar */}
      <div className="w-full max-w-3xl">
        <SyncBar bpm={bpm} onHit={handleSyncHit} locked={!sequenceReady} />
      </div>
    </div>
  );
}
