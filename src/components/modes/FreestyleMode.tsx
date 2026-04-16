/**
 * FreestyleMode — Freier Tanz-Modus
 *
 * Kein vorgegebenes Pattern. Spieler drückt beliebige Pfeiltasten zum Beat.
 * Punkte basieren auf: Timing zum Beat, Kombinations-Komplexität, Variation.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Sparkles, Music, TrendingUp } from 'lucide-react';
import { type HitRating, HIT_POINTS } from '../../types/gameTypes';
import { SoundEngine } from '../../utils/audio';

const soundEngine = new SoundEngine();

interface FreestyleModeProps {
  bpm: number;
  onHit: (rating: HitRating, points: number) => void;
  onMiss: () => void;
  isPlaying: boolean;
}

const DIRECTION_KEYS = ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'] as const;
const DIRECTION_ICONS = [ArrowLeft, ArrowUp, ArrowDown, ArrowRight];
const DIRECTION_LABELS = ['←', '↑', '↓', '→'];

interface ComboEntry {
  direction: number;
  timestamp: number;
  beatAccuracy: number;
}

export function FreestyleMode({ bpm, onHit, onMiss, isPlaying }: FreestyleModeProps) {
  const [recentInputs, setRecentInputs] = useState<ComboEntry[]>([]);
  const [currentComboLength, setCurrentComboLength] = useState(0);
  const [uniqueDirections, setUniqueDirections] = useState(new Set<number>());
  const [feedback, setFeedback] = useState<{ rating: HitRating; id: number } | null>(null);
  const [beatPulse, setBeatPulse] = useState(false);
  const [juryScore, setJuryScore] = useState(0);
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());
  const [juryTierAnnounce, setJuryTierAnnounce] = useState<string | null>(null);
  const feedbackIdRef = useRef(0);
  const feedbackTimerRef = useRef<any>(null);
  const juryTierTimer = useRef<any>(null);
  const startTimeRef = useRef(performance.now());
  const lastDirectionRef = useRef(-1);
  const repeatCountRef = useRef(0);
  const lastJuryTier = useRef('');

  const beatInterval = (60 / bpm) * 1000; // ms per beat

  // Beat pulse indicator
  useEffect(() => {
    if (!isPlaying) return;
    startTimeRef.current = performance.now();

    const interval = setInterval(() => {
      setBeatPulse(true);
      setTimeout(() => setBeatPulse(false), 100);
    }, beatInterval);

    return () => clearInterval(interval);
  }, [bpm, isPlaying]);

  // Calculate how close a timestamp is to the nearest beat
  const getBeatAccuracy = useCallback(
    (timestamp: number): number => {
      const elapsed = timestamp - startTimeRef.current;
      const beatPosition = elapsed / beatInterval;
      const distToNearestBeat = Math.abs(beatPosition - Math.round(beatPosition));
      return 1 - distToNearestBeat * 2; // 1.0 = perfect on beat, 0.0 = between beats
    },
    [beatInterval]
  );

  // Keyboard handler
  useEffect(() => {
    if (!isPlaying) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const dirIndex = DIRECTION_KEYS.indexOf(e.key as any);
      if (dirIndex === -1) return;
      e.preventDefault();

      setPressedKeys(prev => new Set(prev).add(dirIndex));

      const now = performance.now();
      const accuracy = getBeatAccuracy(now);

      // Determine rating based on beat accuracy
      let rating: HitRating;
      if (accuracy >= 0.9) rating = 'Perfect';
      else if (accuracy >= 0.75) rating = 'Great';
      else if (accuracy >= 0.5) rating = 'Cool';
      else if (accuracy >= 0.3) rating = 'Bad';
      else rating = 'Miss';

      // Variety bonus: reward switching directions, penalize repeats
      let varietyMultiplier = 1;
      if (dirIndex === lastDirectionRef.current) {
        varietyMultiplier = Math.max(0.3, 1 - repeatCountRef.current * 0.2);
        repeatCountRef.current++;
      } else {
        repeatCountRef.current = 0;
        varietyMultiplier = 1.2; // Bonus for switching
      }
      lastDirectionRef.current = dirIndex;

      // Combo complexity bonus
      const newUnique = new Set(uniqueDirections).add(dirIndex);
      setUniqueDirections(newUnique);
      const complexityBonus = Math.min(newUnique.size * 0.1, 0.4);

      // Calculate points
      const basePoints = HIT_POINTS[rating];
      const finalPoints = Math.floor(basePoints * varietyMultiplier * (1 + complexityBonus));

      // Sound feedback
      soundEngine.init();
      if (rating === 'Miss') {
        soundEngine.playMiss();
        onMiss();
        setUniqueDirections(new Set());
        setJuryScore(s => Math.max(0, s - 5));
      } else {
        const soundMap: Record<string, 'perfect' | 'great' | 'cool' | 'bad'> = { Perfect: 'perfect', Great: 'great', Cool: 'cool', Bad: 'bad' };
        soundEngine.playHit(soundMap[rating] || 'cool');
        onHit(rating, finalPoints);
        setCurrentComboLength(c => c + 1);
        setJuryScore(s => {
          const newScore = Math.min(100, s + finalPoints * 0.05);
          // Jury tier announcement
          const tiers = [
            { min: 80, label: 'FANTASTISCH!' },
            { min: 60, label: 'SUPER!' },
            { min: 40, label: 'GUT!' },
            { min: 20, label: 'WEITER SO!' },
          ];
          const tier = tiers.find(t => newScore >= t.min);
          if (tier && tier.label !== lastJuryTier.current) {
            lastJuryTier.current = tier.label;
            clearTimeout(juryTierTimer.current);
            setJuryTierAnnounce(tier.label);
            if (newScore >= 60) soundEngine.playCombo();
            juryTierTimer.current = setTimeout(() => setJuryTierAnnounce(null), 2000);
          }
          return newScore;
        });
      }

      // Entry for visual trail
      const entry: ComboEntry = { direction: dirIndex, timestamp: now, beatAccuracy: accuracy };
      setRecentInputs(prev => [...prev.slice(-15), entry]);

      // Feedback
      const id = feedbackIdRef.current++;
      setFeedback({ rating, id });
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => setFeedback(null), 400);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const dirIndex = DIRECTION_KEYS.indexOf(e.key as any);
      if (dirIndex === -1) return;
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.delete(dirIndex);
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, [isPlaying, bpm, uniqueDirections, getBeatAccuracy, onHit, onMiss]);

  // Jury verdict
  const juryVerdict = juryScore >= 80 ? 'FANTASTISCH!' : juryScore >= 60 ? 'SUPER!' : juryScore >= 40 ? 'GUT!' : juryScore >= 20 ? 'WEITER SO!' : 'ZEIG WAS DU KANNST!';

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      {/* Beat Indicator */}
      <div className="flex items-center gap-4">
        <Music size={18} className={`transition-all ${beatPulse ? 'text-yellow-400 scale-125' : 'text-gray-600 scale-100'}`} />
        <div className="flex gap-1">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-3 h-8 rounded-full transition-all duration-75 ${
                beatPulse && i === 0 ? 'bg-yellow-400 scale-y-125' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
        <span className="text-gray-500 text-xs font-mono">{bpm} BPM</span>
      </div>

      {/* Main input area */}
      <div className="relative flex items-center justify-center gap-6">
        {DIRECTION_KEYS.map((_, i) => {
          const Icon = DIRECTION_ICONS[i];
          const isPressed = pressedKeys.has(i);

          return (
            <motion.div
              key={i}
              animate={isPressed ? { scale: 1.2 } : { scale: 1 }}
              className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-colors duration-75 ${
                isPressed
                  ? 'bg-gradient-to-br from-cyan-500 to-blue-600 border-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.6)] text-white'
                  : 'bg-gray-900/80 border-gray-600 text-gray-500'
              }`}
            >
              <Icon size={28} strokeWidth={3} />
            </motion.div>
          );
        })}
      </div>

      {/* Recent inputs trail */}
      <div className="flex items-center gap-1 h-10 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {recentInputs.slice(-12).map((entry, i) => {
            const Icon = DIRECTION_ICONS[entry.direction];
            const opacity = 0.3 + (i / 12) * 0.7;
            return (
              <motion.div
                key={entry.timestamp}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity }}
                exit={{ scale: 0, opacity: 0 }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  entry.beatAccuracy >= 0.9
                    ? 'bg-yellow-500/30 text-yellow-400'
                    : entry.beatAccuracy >= 0.5
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'bg-gray-700/30 text-gray-500'
                }`}
              >
                <Icon size={16} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            key={feedback.id}
            initial={{ scale: 0.5, opacity: 0, y: 10 }}
            animate={{ scale: 1.2, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            className={`text-2xl font-black uppercase tracking-widest ${
              feedback.rating === 'Perfect'
                ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]'
                : feedback.rating === 'Great'
                ? 'text-green-400'
                : feedback.rating === 'Cool'
                ? 'text-blue-400'
                : feedback.rating === 'Bad'
                ? 'text-orange-400'
                : 'text-red-500'
            }`}
          >
            {feedback.rating}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Jury Tier Announcement */}
      <AnimatePresence>
        {juryTierAnnounce && (
          <motion.div
            key={juryTierAnnounce}
            initial={{ scale: 0.5, opacity: 0, y: 10 }}
            animate={{ scale: 1.3, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 250, damping: 15 }}
            className={`text-3xl font-black uppercase tracking-widest ${
              juryTierAnnounce === 'FANTASTISCH!' ? 'text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.8)]'
              : juryTierAnnounce === 'SUPER!' ? 'text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.8)]'
              : juryTierAnnounce === 'GUT!' ? 'text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]'
              : 'text-purple-400'
            }`}
          >
            {juryTierAnnounce}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Jury Score Bar */}
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-purple-400" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Jury-Wertung</span>
          </div>
          <span className="text-sm font-black text-purple-300">{juryVerdict}</span>
        </div>
        <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-600 via-pink-500 to-yellow-400 rounded-full"
            animate={{ width: `${juryScore}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>
      </div>

      {/* Variation Meter */}
      <div className="flex items-center gap-3">
        <TrendingUp size={14} className="text-cyan-500" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Variation</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`w-6 h-2 rounded-full transition-all ${
              uniqueDirections.has(i) ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'bg-gray-700'
            }`} />
          ))}
        </div>
        <span className="text-[10px] font-mono text-gray-500">{uniqueDirections.size}/4</span>
      </div>

      {/* Instructions */}
      <p className="text-gray-600 text-xs uppercase tracking-widest font-bold">
        Druecke Pfeiltasten zum Beat — variiere fuer mehr Punkte!
      </p>
    </div>
  );
}
