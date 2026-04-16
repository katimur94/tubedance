/**
 * ModeSelect — Audition Online Spielmodus-Auswahl
 *
 * Originalgetreue Karten mit Mode-Beschreibungen:
 * - Beat Up: Klassiker (Level 1-9, Chance Mode, Finish Move)
 * - Beat Rush: DDR/StepMania-Stil
 * - Freestyle: Freie Kombos
 * - Club Dance: Co-Op
 */

import { motion } from 'motion/react';
import { Zap, ArrowDown, Sparkles, Users, ArrowLeft, Star, Flame, Trophy } from 'lucide-react';
import { GAME_MODES, type GameMode } from '../types/gameTypes';

interface ModeSelectProps {
  onSelect: (mode: GameMode) => void;
  onBack: () => void;
}

const ICONS: Record<string, typeof Zap> = {
  Zap,
  ArrowDown,
  Sparkles,
  Users,
};

const MODE_DETAILS: Record<string, { features: string[]; difficulty: string; highlight?: string }> = {
  beat_up: {
    features: ['Level 1-9 Aufstieg', 'Chance Mode (rote Pfeile)', 'Finish Move bei Lv.9', '4-Key & 8-Key'],
    difficulty: 'Mittel - Schwer',
    highlight: 'KLASSIKER',
  },
  beat_rush: {
    features: ['Fallende Pfeile', 'Schnelle Reflexe', 'BPM-basiert'],
    difficulty: 'Leicht - Mittel',
  },
  freestyle: {
    features: ['Freie Eingabe', 'Jury-Bewertung', 'Kreativitäts-Bonus'],
    difficulty: 'Kreativ',
  },
  club_dance: {
    features: ['Kooperativ', 'Synchron tanzen', 'Team-Score'],
    difficulty: 'Team',
    highlight: 'CO-OP',
  },
};

export function ModeSelect({ onSelect, onBack }: ModeSelectProps) {
  return (
    <div className="w-full max-w-5xl mx-auto z-10 px-4">
      <button
        onClick={onBack}
        className="mb-8 flex items-center gap-2 px-6 py-3 bg-purple-900/50 border border-purple-700/30 rounded-full hover:bg-purple-800/50 transition-colors uppercase tracking-widest text-xs font-black text-purple-400 hover:text-white"
      >
        <ArrowLeft size={16} /> Zurück
      </button>

      <div className="text-center mb-10">
        <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400 uppercase tracking-wider mb-2">
          Spielmodus wählen
        </h1>
        <div className="flex items-center justify-center gap-3">
          <div className="h-px flex-1 max-w-20 bg-gradient-to-r from-transparent to-pink-500/40" />
          <p className="text-purple-400 font-bold uppercase tracking-[0.4em] text-xs">Wähle deinen Tanzstil</p>
          <div className="h-px flex-1 max-w-20 bg-gradient-to-l from-transparent to-pink-500/40" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {GAME_MODES.map((mode, i) => {
          const Icon = ICONS[mode.icon] || Zap;
          const details = MODE_DETAILS[mode.id] || { features: [], difficulty: '' };

          return (
            <motion.button
              key={mode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4, scale: 1.015 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(mode.id)}
              className="panel-audition relative overflow-hidden p-6 text-left transition-all group hover:shadow-[0_0_30px_rgba(236,72,153,0.15)]"
            >
              {/* Gradient overlay on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

              {/* Highlight badge */}
              {details.highlight && (
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    details.highlight === 'KLASSIKER'
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black shadow-[0_0_10px_rgba(250,204,21,0.4)]'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                  }`}>
                    {details.highlight}
                  </span>
                </div>
              )}

              <div className="relative z-10 flex items-start gap-5">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mode.color} flex items-center justify-center shadow-lg shrink-0 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]`}>
                  <Icon size={26} className="text-white" />
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-black text-white uppercase tracking-wider mb-1">
                    {mode.name}
                  </h3>
                  <p className="text-gray-400 text-sm mb-3">
                    {mode.description}
                  </p>

                  {/* Feature list */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {details.features.map(f => (
                      <span key={f} className="px-2 py-0.5 bg-purple-900/50 border border-purple-700/30 rounded-md text-[10px] font-bold text-purple-300">
                        {f}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      {details.difficulty}
                    </span>
                    <span className="text-gray-700">•</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      {mode.minPlayers === 1 ? 'Solo' : `${mode.minPlayers}+`} – Max {mode.maxPlayers}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
