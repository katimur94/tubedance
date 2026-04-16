/**
 * BeatUpMode — ORIGINALGETREU Audition Online (Alaplaya 2008-2012)
 *
 * GROSSE Pfeile (120px+), Level 1-9, Chance-Modus, Finish Move
 * Alles LAUT, BUNT, FLASHY — wie im Original!
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Flame, Zap, RotateCcw, Crown } from 'lucide-react';
import { SyncBar } from '../SyncBar';
import { type HitRating, type LetterGrade, getLetterGrade, GRADE_COLORS } from '../../types/gameTypes';
import { SoundEngine } from '../../utils/audio';

const soundEngine = new SoundEngine();

const DIRECTIONS_4 = ['Up', 'Down', 'Left', 'Right'] as const;
const DIRECTIONS_8 = ['Up', 'Down', 'Left', 'Right', 'UpLeft', 'UpRight', 'DownLeft', 'DownRight'] as const;
type Direction4 = (typeof DIRECTIONS_4)[number];
type Direction8 = (typeof DIRECTIONS_8)[number];
type Direction = Direction4 | Direction8;

const REVERSE_DIR: Record<string, string> = {
  Up: 'Down', Down: 'Up', Left: 'Right', Right: 'Left',
  UpLeft: 'DownRight', UpRight: 'DownLeft', DownLeft: 'UpRight', DownRight: 'UpLeft',
};

interface ArrowNote {
  direction: Direction;
  isChance: boolean;
}

interface BeatUpModeProps {
  bpm: number;
  onHit: (rating: HitRating, points: number) => void;
  onMiss: () => void;
  combo: number;
  round: number;
  use8Keys?: boolean;
}

// Big SVG arrows — like the original Audition
function ArrowSVG({ direction, size = 80, className = '' }: { direction: string; size?: number; className?: string }) {
  const rotations: Record<string, number> = {
    Up: 0, Right: 90, Down: 180, Left: 270,
    UpRight: 45, DownRight: 135, DownLeft: 225, UpLeft: 315,
  };
  const rot = rotations[direction] ?? 0;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
      <g transform={`rotate(${rot} 50 50)`}>
        {/* Arrow body */}
        <polygon
          points="50,10 80,50 65,50 65,85 35,85 35,50 20,50"
          fill="currentColor"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
        />
        {/* Inner highlight */}
        <polygon
          points="50,18 72,48 62,48 62,80 38,80 38,48 28,48"
          fill="rgba(255,255,255,0.15)"
        />
      </g>
    </svg>
  );
}

const KEY_MAP_4: Record<string, Direction> = {
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
};
const KEY_MAP_8: Record<string, Direction> = {
  ...KEY_MAP_4,
  Numpad8: 'Up', Numpad2: 'Down', Numpad4: 'Left', Numpad6: 'Right',
  Numpad7: 'UpLeft', Numpad9: 'UpRight', Numpad1: 'DownLeft', Numpad3: 'DownRight',
};

function generateSequence(level: number, isFinishMove: boolean, chanceMode: boolean, use8Keys: boolean): ArrowNote[] {
  const dirs = use8Keys ? DIRECTIONS_8 : DIRECTIONS_4;
  const length = isFinishMove ? Math.min(level + 2, 11) : Math.min(level, 9);
  return Array.from({ length }, () => {
    const direction = dirs[Math.floor(Math.random() * dirs.length)] as Direction;
    const isChance = chanceMode && level >= 6 && Math.random() < 0.4;
    return { direction, isChance };
  });
}

export function BeatUpMode({ bpm, onHit, onMiss, combo, round, use8Keys = false }: BeatUpModeProps) {
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<ArrowNote[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sequenceReady, setSequenceReady] = useState(false);
  const [errorHighlight, setErrorHighlight] = useState(false);
  const [chanceMode, setChanceMode] = useState(false);
  const [showGrade, setShowGrade] = useState<LetterGrade | null>(null);
  const [roundRatings, setRoundRatings] = useState<HitRating[]>([]);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showLevelDown, setShowLevelDown] = useState(false);
  const [isFinishMove, setIsFinishMove] = useState(false);
  const [hitFlash, setHitFlash] = useState<string | null>(null);
  const [perfectStreak, setPerfectStreak] = useState(0);
  const [showSRank, setShowSRank] = useState(false);

  const errorTimeoutRef = useRef<any>(null);
  const gradeTimeoutRef = useRef<any>(null);
  const levelAnimRef = useRef<any>(null);
  const keyMap = use8Keys ? KEY_MAP_8 : KEY_MAP_4;

  const resetSequence = useCallback(() => {
    const finish = level >= 9;
    setIsFinishMove(finish);
    const newSeq = generateSequence(level, finish, chanceMode, use8Keys);
    setSequence(newSeq);
    setCurrentIndex(0);
    setSequenceReady(false);
    setErrorHighlight(false);
  }, [level, chanceMode, use8Keys]);

  // Regenerate sequence when round or level changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { resetSequence(); }, [round, level, chanceMode, use8Keys]);

  // Chance Mode Toggle (keyboard shortcut: Delete key)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'c') && level >= 6) setChanceMode(prev => !prev);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [level]);

  // Arrow Key Input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (sequenceReady) return;
      const direction = keyMap[e.code] || keyMap[e.key];
      if (!direction || currentIndex >= sequence.length) return;
      e.preventDefault();

      const note = sequence[currentIndex];
      const expectedDir = note.isChance ? REVERSE_DIR[note.direction] : note.direction;

      if (direction === expectedDir) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        if (nextIndex === sequence.length) setSequenceReady(true);
      } else {
        clearTimeout(errorTimeoutRef.current);
        setErrorHighlight(true);
        errorTimeoutRef.current = setTimeout(() => {
          setCurrentIndex(0);
          setErrorHighlight(false);
        }, 300);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sequence, currentIndex, sequenceReady, keyMap]);

  const handleSyncHit = (result: string) => {
    if (result === 'LOCKED' || !sequenceReady) { handleMissResult(); return; }
    const rating = result as HitRating;
    if (rating === 'Miss') { handleMissResult(); return; }

    const modifiers: Record<string, number> = { Perfect: 1.5, Great: 1.0, Cool: 0.5, Bad: 0.25 };
    let points = Math.floor(level * 100 * (modifiers[rating] || 0));
    if (sequence.some(n => n.isChance)) points = Math.floor(points * 1.5);
    if (isFinishMove) points *= 2;

    setHitFlash(rating);
    setTimeout(() => setHitFlash(null), 500);

    // Sound feedback
    soundEngine.init();
    const soundMap: Record<string, 'perfect' | 'great' | 'cool' | 'bad'> = { Perfect: 'perfect', Great: 'great', Cool: 'cool', Bad: 'bad' };
    soundEngine.playHit(soundMap[rating] || 'cool');

    // Perfect streak tracking
    if (rating === 'Perfect') {
      setPerfectStreak(s => {
        const newStreak = s + 1;
        // S-Rank: Perfect finish move at level 9
        if (isFinishMove && newStreak >= 3) {
          setShowSRank(true);
          soundEngine.playCombo();
          setTimeout(() => setShowSRank(false), 2500);
        }
        return newStreak;
      });
    } else {
      setPerfectStreak(0);
    }

    onHit(rating, points);

    const newRatings = [...roundRatings, rating];
    setRoundRatings(newRatings);
    const avgAccuracy = newRatings.reduce((acc, r) => {
      const s: Record<string, number> = { Perfect: 100, Great: 80, Cool: 60, Bad: 30, Miss: 0 };
      return acc + (s[r] || 0);
    }, 0) / newRatings.length;
    const grade = getLetterGrade(avgAccuracy);
    setShowGrade(grade);
    if (gradeTimeoutRef.current) clearTimeout(gradeTimeoutRef.current);
    gradeTimeoutRef.current = setTimeout(() => setShowGrade(null), 1500);

    if (level < 9) {
      setLevel(l => l + 1);
      setShowLevelUp(true);
      clearTimeout(levelAnimRef.current);
      levelAnimRef.current = setTimeout(() => setShowLevelUp(false), 1000);
    }
    resetSequence();
  };

  const handleMissResult = () => {
    soundEngine.init();
    soundEngine.playMiss();
    setPerfectStreak(0);
    onMiss();
    if (level > 1) {
      setLevel(l => Math.max(1, l - 1));
      setShowLevelDown(true);
      clearTimeout(levelAnimRef.current);
      levelAnimRef.current = setTimeout(() => setShowLevelDown(false), 1000);
    }
    setRoundRatings(prev => [...prev, 'Miss']);
    resetSequence();
  };

  // Arrow colors based on state
  const getArrowColor = (note: ArrowNote, i: number) => {
    if (errorHighlight) return 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]';
    if (i < currentIndex) {
      return note.isChance
        ? 'text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.5)] opacity-50'
        : 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)] opacity-50';
    }
    if (i === currentIndex && !sequenceReady) {
      return note.isChance
        ? 'text-red-400 drop-shadow-[0_0_25px_rgba(239,68,68,0.9)] scale-110'
        : 'text-cyan-300 drop-shadow-[0_0_25px_rgba(6,182,212,0.9)] scale-110';
    }
    return note.isChance
      ? 'text-red-600 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]'
      : 'text-gray-400';
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full relative">

      {/* ═══ TOP BAR: Level + Chance ═══ */}
      <div className="flex items-center justify-between w-full max-w-4xl px-2">
        {/* Level */}
        <div className={`flex items-center gap-3 px-5 py-2 rounded-2xl border-2 font-black uppercase tracking-widest transition-all ${
          isFinishMove
            ? 'bg-blue-900/80 border-blue-400 text-blue-200 shadow-[0_0_30px_rgba(59,130,246,0.6)] text-lg'
            : level >= 7
            ? 'bg-purple-900/80 border-purple-400 text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.5)] text-base'
            : level >= 4
            ? 'bg-cyan-900/80 border-cyan-400 text-cyan-200 text-sm'
            : 'bg-gray-900/80 border-gray-500 text-gray-200 text-sm'
        }`}>
          {isFinishMove ? (
            <><Star size={20} fill="currentColor" className="text-blue-300 animate-pulse" /> FINISH MOVE</>
          ) : (
            <><Zap size={18} /> Lv.{level}</>
          )}
        </div>

        {/* Level dots */}
        <div className="flex gap-1">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${
              i < level
                ? i >= 7 ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]'
                  : i >= 4 ? 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.5)]'
                  : 'bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.5)]'
                : 'bg-gray-700'
            }`} />
          ))}
        </div>

        {/* Chance */}
        <button
          onClick={() => level >= 6 && setChanceMode(!chanceMode)}
          disabled={level < 6}
          className={`px-4 py-2 rounded-2xl border-2 text-xs font-black uppercase tracking-widest transition-all ${
            chanceMode
              ? 'bg-red-900/80 border-red-400 text-red-200 shadow-[0_0_25px_rgba(239,68,68,0.5)] animate-pulse'
              : level >= 6
              ? 'bg-gray-900/80 border-gray-600 text-gray-400 hover:border-red-400 hover:text-red-300'
              : 'bg-gray-900/40 border-gray-800 text-gray-700 cursor-not-allowed'
          }`}
        >
          {chanceMode ? '🔴 CHANCE ON' : 'CHANCE'}
        </button>
      </div>

      {/* ═══ LEVEL UP / DOWN ANIMATION ═══ */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 30 }}
            animate={{ scale: 1.5, opacity: 1, y: -20 }}
            exit={{ scale: 0.8, opacity: 0, y: -60 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="absolute -top-16 z-40 font-black text-4xl uppercase tracking-widest text-green-400 drop-shadow-[0_0_30px_rgba(74,222,128,1)]"
          >
            ▲ LEVEL UP!
          </motion.div>
        )}
        {showLevelDown && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: -30 }}
            animate={{ scale: 1.5, opacity: 1, y: 20 }}
            exit={{ scale: 0.8, opacity: 0, y: 60 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="absolute -top-16 z-40 font-black text-4xl uppercase tracking-widest text-red-400 drop-shadow-[0_0_30px_rgba(248,113,113,1)]"
          >
            ▼ MISS!
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ FINISH MOVE BANNER ═══ */}
      <AnimatePresence>
        {isFinishMove && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ scaleX: 0, opacity: 0 }}
            className="flex items-center gap-4 px-10 py-3 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-700 rounded-full text-white font-black uppercase tracking-[0.3em] text-base shadow-[0_0_50px_rgba(59,130,246,0.6)] border-2 border-blue-300/50"
          >
            <Star size={22} fill="currentColor" className="text-yellow-300 animate-spin" style={{ animationDuration: '3s' }} />
            FINISH MOVE — {sequence.length} ARROWS — 2× PUNKTE!
            <Star size={22} fill="currentColor" className="text-yellow-300 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ S-RANK ANNOUNCEMENT ═══ */}
      <AnimatePresence>
        {showSRank && (
          <motion.div
            initial={{ scale: 0, rotate: -20, opacity: 0 }}
            animate={{ scale: 1.5, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
            className="fixed top-1/4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 rounded-3xl border-4 border-yellow-300 shadow-[0_0_80px_rgba(250,204,21,0.8)] text-black font-black text-4xl uppercase tracking-[0.3em]"
          >
            <Crown size={40} className="text-yellow-900" /> S-RANK! <Crown size={40} className="text-yellow-900" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ PERFECT STREAK ═══ */}
      <AnimatePresence>
        {perfectStreak >= 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-8 right-4 z-30 px-4 py-1 bg-yellow-900/80 border border-yellow-500/50 rounded-full text-yellow-300 text-xs font-black uppercase tracking-widest"
          >
            {perfectStreak}x PERFECT STREAK
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ LETTER GRADE POPUP ═══ */}
      <AnimatePresence>
        {showGrade && (
          <motion.div
            initial={{ scale: 4, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.3, opacity: 0, rotate: 15 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
            className={`fixed top-1/3 left-1/2 -translate-x-1/2 z-50 text-[180px] font-black ${GRADE_COLORS[showGrade]}`}
          >
            {showGrade}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ ARROW SEQUENCE — BIG & BOLD LIKE ORIGINAL ═══ */}
      <div className={`relative w-full max-w-4xl mx-auto rounded-3xl border-2 backdrop-blur-md transition-all duration-200 ${
        errorHighlight
          ? 'bg-red-950/70 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)]'
          : sequenceReady
          ? 'bg-emerald-950/50 border-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.5)]'
          : isFinishMove
          ? 'bg-blue-950/50 border-blue-400/60 shadow-[0_0_40px_rgba(59,130,246,0.4)]'
          : chanceMode
          ? 'bg-red-950/30 border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
          : 'bg-gray-950/70 border-gray-600/40 shadow-[0_0_20px_rgba(0,0,0,0.8)]'
      }`}>

        {/* Top label */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-1 bg-gray-900 border border-gray-600 rounded-full text-xs font-black uppercase tracking-[0.2em] text-gray-300 z-10 whitespace-nowrap">
          Level {level} {isFinishMove && '★ FINISH MOVE'} {chanceMode && '🔴 CHANCE MODE'}
        </div>

        {/* Arrow row */}
        <div className="flex items-center justify-center gap-1 px-4 py-6 min-h-[130px]">
          {sequence.map((note, i) => {
            const isCompleted = i < currentIndex;
            const isCurrent = i === currentIndex && !sequenceReady;

            return (
              <motion.div
                key={`${round}-${level}-${i}`}
                initial={{ opacity: 0, scale: 0.3, y: -20 }}
                animate={{
                  opacity: 1,
                  scale: isCurrent ? 1.15 : isCompleted ? 0.75 : 1,
                  y: 0,
                }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 20 }}
                className={`relative flex items-center justify-center transition-all duration-150 ${getArrowColor(note, i)}`}
              >
                <ArrowSVG
                  direction={note.direction}
                  size={sequence.length > 8 ? 70 : sequence.length > 6 ? 85 : 100}
                />

                {/* Chance reverse indicator */}
                {note.isChance && !isCompleted && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                    <RotateCcw size={10} className="text-white" />
                  </div>
                )}

                {/* Completed indicator */}
                {isCompleted && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`absolute top-0 right-0 w-5 h-5 rounded-full flex items-center justify-center ${
                      note.isChance ? 'bg-orange-400' : 'bg-emerald-400'
                    }`}
                  >
                    <span className="text-[10px] text-black font-black">✓</span>
                  </motion.div>
                )}

                {/* Current pulse glow */}
                {isCurrent && (
                  <motion.div
                    animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.9, 1.1, 0.9] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className={`absolute inset-0 rounded-xl ${
                      note.isChance ? 'bg-red-500/20' : 'bg-cyan-500/20'
                    } blur-sm`}
                  />
                )}
              </motion.div>
            );
          })}

          {/* SPACE prompt */}
          {sequenceReady && (
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: [1, 1.15, 1], rotate: 0 }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className={`ml-4 px-6 py-3 rounded-2xl font-black text-lg uppercase tracking-widest ${
                isFinishMove
                  ? 'bg-blue-500 text-white shadow-[0_0_30px_rgba(59,130,246,0.7)]'
                  : 'bg-gradient-to-r from-emerald-500 to-green-400 text-black shadow-[0_0_25px_rgba(52,211,153,0.6)]'
              }`}
            >
              ► SPACE!
            </motion.div>
          )}
        </div>
      </div>

      {/* ═══ COMBO DISPLAY ═══ */}
      {combo >= 3 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`flex items-center gap-3 px-6 py-2 rounded-2xl font-black uppercase tracking-widest ${
            combo >= 50
              ? 'bg-yellow-900/60 border-2 border-yellow-400 text-yellow-300 text-lg shadow-[0_0_30px_rgba(250,204,21,0.5)]'
              : combo >= 30
              ? 'bg-orange-900/60 border-2 border-orange-400 text-orange-300 text-base shadow-[0_0_25px_rgba(251,146,60,0.4)]'
              : combo >= 15
              ? 'bg-pink-900/60 border-2 border-pink-400 text-pink-300 text-sm shadow-[0_0_20px_rgba(236,72,153,0.3)]'
              : 'bg-gray-900/60 border border-cyan-500/50 text-cyan-300 text-sm'
          }`}
        >
          {combo >= 15 && <Flame size={20} className="animate-pulse" />}
          <span>{combo}× COMBO</span>
          {combo >= 50 ? ' UNSTOPPABLE!' : combo >= 30 ? ' INFERNO!' : combo >= 15 ? ' ON FIRE!' : ''}
          {combo >= 15 && <Flame size={20} className="animate-pulse" />}
        </motion.div>
      )}

      {/* ═══ BEAT BAR ═══ */}
      <div className="w-full max-w-4xl">
        <SyncBar
          bpm={bpm}
          onHit={handleSyncHit}
          locked={!sequenceReady}
          level={level}
          isFinishMove={isFinishMove}
          chanceMode={chanceMode}
        />
      </div>
    </div>
  );
}
