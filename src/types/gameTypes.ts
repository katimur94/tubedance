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
    description: 'Pfeiltasten im Takt drücken. Klassischer Audition-Modus.',
    icon: 'Zap',
    color: 'from-cyan-500 to-blue-600',
    minPlayers: 1,
    maxPlayers: 8,
  },
  {
    id: 'beat_rush',
    name: 'Beat Rush',
    description: 'Schnelle Pfeile fallen runter — reagiere so schnell wie möglich!',
    icon: 'ArrowDown',
    color: 'from-pink-500 to-purple-600',
    minPlayers: 1,
    maxPlayers: 8,
  },
  {
    id: 'freestyle',
    name: 'Freestyle',
    description: 'Erfinde eigene Pfeil-Kombos für Extrapunkte.',
    icon: 'Sparkles',
    color: 'from-yellow-400 to-orange-500',
    minPlayers: 1,
    maxPlayers: 8,
  },
  {
    id: 'club_dance',
    name: 'Club Dance',
    description: 'Kooperativer Modus — tanzt zusammen synchron!',
    icon: 'Users',
    color: 'from-green-400 to-emerald-600',
    minPlayers: 2,
    maxPlayers: 8,
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

export const HIT_POINTS: Record<HitRating, number> = {
  Perfect: 100,
  Great: 80,
  Cool: 50,
  Bad: 20,
  Miss: 0,
};
