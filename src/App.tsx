import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Play, Users, Bot, Heart, Music, Gauge, Zap, AudioWaveform } from 'lucide-react';
import Game from './components/Game';
import { TapBPMDetector } from './utils/audio';

const MODES = [
  { id: 'solo', title: 'Solo', description: 'Rekordjagd für einen Spieler', icon: Play, color: 'from-pink-500 to-rose-500', shadow: 'shadow-pink-500/50' },
  { id: 'pve', title: 'VS KI', description: 'Mensch gegen Maschine', icon: Bot, color: 'from-cyan-500 to-blue-500', shadow: 'shadow-cyan-500/50' },
  { id: 'pvp', title: 'Duell', description: 'Lokaler Multiplayer (PvP)', icon: Users, color: 'from-green-500 to-emerald-500', shadow: 'shadow-green-500/50' },
  { id: 'coop', title: 'Couple Mode', description: 'Zusammen spielen (Co-op)', icon: Heart, color: 'from-purple-500 to-fuchsia-500', shadow: 'shadow-purple-500/50' },
];

const DIFFICULTIES = [
  { id: 'easy', label: 'Leicht', emoji: '🌟', description: 'Für Einsteiger', color: 'from-green-500 to-emerald-500', shadow: 'shadow-green-500/50' },
  { id: 'normal', label: 'Normal', emoji: '⚡', description: 'Ausgewogen', color: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/50' },
  { id: 'hard', label: 'Schwer', emoji: '🔥', description: 'Für Profis', color: 'from-orange-500 to-red-500', shadow: 'shadow-orange-500/50' },
  { id: 'extreme', label: 'Extrem', emoji: '💀', description: 'Wahnsinn!', color: 'from-red-600 to-rose-600', shadow: 'shadow-red-600/50' },
];

export default function App() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('normal');
  const [rhythmMode, setRhythmMode] = useState<'audio' | 'bpm'>('audio');
  const [bpm, setBpm] = useState(120);
  const [gameState, setGameState] = useState<'menu' | 'playing'>('menu');
  const [gameKey, setGameKey] = useState(0);
  const tapDetector = useRef(new TapBPMDetector());
  const [tapBpm, setTapBpm] = useState<number | null>(null);

  const handleTap = () => {
    const detected = tapDetector.current.tap();
    if (detected) {
      setTapBpm(detected);
      setBpm(detected);
    }
  };

  const isValidUrl = (url: string) => {
    return /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))[\w-]{11}/.test(url);
  };

  const canStart = isValidUrl(youtubeUrl) && selectedMode && (rhythmMode === 'audio' || (bpm >= 60 && bpm <= 300));

  const handleStart = () => {
    if (!canStart) return;
    setGameState('playing');
  };

  if (gameState === 'playing') {
    return (
      <Game
        key={gameKey}
        youtubeUrl={youtubeUrl}
        mode={selectedMode!}
        difficulty={selectedDifficulty}
        rhythmMode={rhythmMode}
        bpm={bpm}
        onBack={() => setGameState('menu')}
        onRestart={() => setGameKey(k => k + 1)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-pink-500/30 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-[128px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-4xl flex flex-col items-center"
      >
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]">
          TubeDance
        </h1>
        <p className="text-gray-400 text-lg md:text-xl mb-10 tracking-wide uppercase font-semibold">
          Rhythm is a Dancer
        </p>

        {/* YouTube Input */}
        <div className="w-full max-w-2xl mb-8 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-cyan-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
          <div className={`relative flex items-center bg-gray-900 rounded-xl p-2 border transition-colors ${
            youtubeUrl && !isValidUrl(youtubeUrl) ? 'border-red-500/50' : 'border-gray-800 focus-within:border-pink-500/50'
          }`}>
            <Music className="w-6 h-6 text-gray-500 ml-3 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Füge einen YouTube-Link ein..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="w-full bg-transparent text-white placeholder-gray-500 outline-none p-3 text-lg"
            />
          </div>
          {youtubeUrl && !isValidUrl(youtubeUrl) && (
            <p className="text-red-400 text-sm mt-2 ml-2">Ungültiger YouTube-Link</p>
          )}
        </div>

        {/* Rhythm Mode */}
        <div className="w-full max-w-2xl mb-8">
          <div className="flex items-center gap-2 mb-3">
            <AudioWaveform className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-400 uppercase tracking-widest font-semibold">Rhythmus-Erkennung</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setRhythmMode('audio')}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                rhythmMode === 'audio' ? 'border-pink-500/50 bg-gray-900 shadow-lg shadow-pink-500/20' : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
              }`}>
              <div className="text-2xl mb-1">🎵</div>
              <div className={`font-bold ${rhythmMode === 'audio' ? 'text-white' : 'text-gray-300'}`}>Audio-Analyse</div>
              <div className={`text-xs ${rhythmMode === 'audio' ? 'text-pink-300' : 'text-gray-500'}`}>Pfeile reagieren auf die Musik</div>
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setRhythmMode('bpm')}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                rhythmMode === 'bpm' ? 'border-cyan-500/50 bg-gray-900 shadow-lg shadow-cyan-500/20' : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
              }`}>
              <div className="text-2xl mb-1">⚡</div>
              <div className={`font-bold ${rhythmMode === 'bpm' ? 'text-white' : 'text-gray-300'}`}>Manuell (BPM)</div>
              <div className={`text-xs ${rhythmMode === 'bpm' ? 'text-cyan-300' : 'text-gray-500'}`}>Fester Takt per BPM-Eingabe</div>
            </motion.button>
          </div>

          {rhythmMode === 'bpm' && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500 uppercase tracking-widest">BPM eingeben oder tippen</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex items-center bg-gray-900 rounded-xl p-2 border border-gray-800 focus-within:border-pink-500/50 transition-colors flex-1">
                  <input type="number" min={60} max={300} value={bpm}
                    onChange={(e) => setBpm(Math.max(60, Math.min(300, parseInt(e.target.value) || 120)))}
                    className="w-full bg-transparent text-white outline-none p-3 text-lg text-center font-mono font-bold" />
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} onClick={handleTap}
                  className="px-6 py-4 bg-gray-900 border border-gray-800 rounded-xl text-white font-bold uppercase tracking-wider hover:border-pink-500/50 hover:bg-gray-800 transition-all whitespace-nowrap">
                  <Zap className="w-5 h-5 inline mr-2" />TAP
                </motion.button>
              </div>
              {tapBpm && <p className="text-pink-400 text-sm mt-2 ml-2">Erkannt: {tapBpm} BPM</p>}
            </div>
          )}
          {rhythmMode === 'audio' && (
            <p className="text-gray-500 text-xs ml-1">Beim Start wird dein Browser fragen, welchen Tab du teilen möchtest — wähle <strong className="text-gray-300">diesen Tab</strong> aus.</p>
          )}
        </div>

        {/* Difficulty */}
        <div className="w-full mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-400 uppercase tracking-widest font-semibold">Schwierigkeit</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DIFFICULTIES.map((diff) => {
              const isSelected = selectedDifficulty === diff.id;
              return (
                <motion.button
                  key={diff.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedDifficulty(diff.id)}
                  className={`relative p-4 rounded-xl border-2 text-center transition-all overflow-hidden group ${
                    isSelected
                      ? `border-transparent bg-gray-900 ${diff.shadow} shadow-lg`
                      : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
                  }`}
                >
                  {isSelected && <div className={`absolute inset-0 bg-gradient-to-br ${diff.color} opacity-10`} />}
                  <div className="relative z-10">
                    <div className="text-2xl mb-1">{diff.emoji}</div>
                    <div className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-gray-300'}`}>{diff.label}</div>
                    <div className={`text-xs ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>{diff.description}</div>
                  </div>
                  {isSelected && <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${diff.color}`} />}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Game Modes */}
        <div className="w-full mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-400 uppercase tracking-widest font-semibold">Spielmodus</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = selectedMode === mode.id;
              return (
                <motion.button
                  key={mode.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`relative p-5 rounded-2xl border-2 text-left transition-all overflow-hidden group ${
                    isSelected
                      ? `border-transparent bg-gray-900 shadow-[0_0_30px_rgba(0,0,0,0.5)] ${mode.shadow}`
                      : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
                  }`}
                >
                  {isSelected && <div className={`absolute inset-0 bg-gradient-to-br ${mode.color} opacity-10`} />}
                  <div className={`absolute inset-0 bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                  <div className="relative z-10 flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${isSelected ? `bg-gradient-to-br ${mode.color}` : 'bg-gray-800'}`}>
                      <Icon className={`w-7 h-7 ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-white transition-colors'}`} />
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold mb-1 ${isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>{mode.title}</h3>
                      <p className={isSelected ? 'text-gray-300' : 'text-gray-500'}>{mode.description}</p>
                    </div>
                  </div>
                  {isSelected && <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${mode.color}`} />}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Start Button */}
        <motion.button
          whileHover={{ scale: canStart ? 1.05 : 1 }}
          whileTap={{ scale: canStart ? 0.95 : 1 }}
          onClick={handleStart}
          disabled={!canStart}
          className={`px-12 py-4 rounded-full font-bold text-xl uppercase tracking-widest transition-all ${
            canStart
              ? 'bg-white text-black hover:shadow-[0_0_40px_rgba(255,255,255,0.4)]'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          Let's Dance
        </motion.button>
      </motion.div>
    </div>
  );
}
