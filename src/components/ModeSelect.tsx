/**
 * ModeSelect — Spielmodus-Auswahl (Audition-Style)
 */

import { motion } from 'motion/react';
import { Zap, ArrowDown, Sparkles, Users, ArrowLeft } from 'lucide-react';
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

export function ModeSelect({ onSelect, onBack }: ModeSelectProps) {
  return (
    <div className="w-full max-w-4xl mx-auto z-10">
      <button
        onClick={onBack}
        className="mb-8 flex items-center gap-2 px-6 py-3 bg-gray-900 border border-gray-700 rounded-full hover:bg-gray-800 transition-colors uppercase tracking-widest text-xs font-black text-gray-400 hover:text-white"
      >
        <ArrowLeft size={16} /> Zurück
      </button>

      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 uppercase tracking-wider mb-3">
          Spielmodus
        </h1>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Wähle deinen Style</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {GAME_MODES.map((mode, i) => {
          const Icon = ICONS[mode.icon] || Zap;

          return (
            <motion.button
              key={mode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(mode.id)}
              className={`relative overflow-hidden bg-gray-900/80 backdrop-blur-xl border border-gray-700 hover:border-white/30 rounded-[32px] p-8 text-left transition-all group`}
            >
              {/* Gradient overlay on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />

              <div className="relative z-10 flex items-start gap-6">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${mode.color} flex items-center justify-center shadow-lg shrink-0`}>
                  <Icon size={28} className="text-white" />
                </div>

                <div className="flex-1">
                  <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
                    {mode.name}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-4">
                    {mode.description}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400">
                      {mode.minPlayers === 1 ? 'Solo' : `${mode.minPlayers}+`} Spieler
                    </span>
                    <span className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Max {mode.maxPlayers}
                    </span>
                    {mode.id === 'club_dance' && (
                      <span className="px-3 py-1 bg-green-900/50 border border-green-500/30 rounded-full text-[10px] font-black uppercase tracking-widest text-green-400">
                        Co-Op
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
