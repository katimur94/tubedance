export type GameMode = 'beat_up' | 'beat_rush' | 'freestyle' | 'club_dance';

export interface GameModeConfig {
  id: GameMode;
  name: string;
  description: string;
  icon: string;
  color: string;
  minPlayers: number;
  maxPlayers: number;
}

export const GAME_MODES: GameModeConfig[] = [
  {
    id: 'beat_up',
    name: 'Beat Up',
    description: 'Klassischer Audition-Modus: Pfeile eingeben, Spacebar im Takt. Level 1-9!',
    icon: 'Zap',
    color: 'from-cyan-500 to-blue-600',
    minPlayers: 1,
    maxPlayers: 6,
  },
  {
    id: 'beat_rush',
    name: 'Beat Rush',
    description: 'Schnelle Pfeile fallen runter — reagiere so schnell wie möglich!',
    icon: 'ArrowDown',
    color: 'from-pink-500 to-purple-600',
    minPlayers: 1,
    maxPlayers: 6,
  },
  {
    id: 'freestyle',
    name: 'Freestyle',
    description: 'Erfinde eigene Pfeil-Kombos für Extrapunkte. Jury bewertet!',
    icon: 'Sparkles',
    color: 'from-yellow-400 to-orange-500',
    minPlayers: 1,
    maxPlayers: 6,
  },
  {
    id: 'club_dance',
    name: 'Club Dance',
    description: 'Kooperativer Modus — tanzt zusammen synchron!',
    icon: 'Users',
    color: 'from-green-400 to-emerald-600',
    minPlayers: 2,
    maxPlayers: 6,
  },
];

export type HitRating = 'Perfect' | 'Great' | 'Cool' | 'Bad' | 'Miss';
export type LetterGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export function getLetterGrade(accuracy: number): LetterGrade {
  if (accuracy >= 95) return 'S';
  if (accuracy >= 85) return 'A';
  if (accuracy >= 70) return 'B';
  if (accuracy >= 55) return 'C';
  if (accuracy >= 40) return 'D';
  return 'F';
}

export const GRADE_COLORS: Record<LetterGrade, string> = {
  S: 'text-yellow-300 drop-shadow-[0_0_20px_rgba(253,224,71,0.8)]',
  A: 'text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.6)]',
  B: 'text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]',
  C: 'text-purple-400',
  D: 'text-orange-400',
  F: 'text-red-500',
};

// Original Audition scoring: Level × 100, modified by hit quality
// BeatUpMode uses this directly (level * 100 * modifier)
// Other modes keep flat points for simplicity
export const HIT_POINTS: Record<HitRating, number> = {
  Perfect: 150, // Level×100×1.5 equivalent base for non-level modes
  Great: 100,   // Level×100×1.0
  Cool: 50,     // Level×100×0.5
  Bad: 25,      // Level×100×0.25
  Miss: 0,
};

// Score modifiers for level-based calculation
export const SCORE_MODIFIERS: Record<HitRating, number> = {
  Perfect: 1.5,
  Great: 1.0,
  Cool: 0.5,
  Bad: 0.25,
  Miss: 0,
};

// EXP & DEN (original currency names)
export interface GameRewards {
  exp: number;
  den: number; // "Beats" in current system, originally "DEN"
}

// Calculate rewards based on placement (1st-6th) — original Audition style
export function calculatePlacementRewards(placement: number, score: number, maxCombo: number): GameRewards {
  const placementMultiplier = [2.0, 1.5, 1.2, 1.0, 0.8, 0.6][Math.min(placement - 1, 5)];
  const baseExp = Math.floor(score * 0.05 * placementMultiplier);
  const baseDen = Math.floor(score * 0.1 * placementMultiplier) + Math.floor(maxCombo * 2);
  return { exp: baseExp, den: baseDen };
}
