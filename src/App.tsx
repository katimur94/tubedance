import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Users, Shield, ArrowLeft, Trophy } from 'lucide-react';
import Game from './components/Game';
import { PlaylistManager } from './components/PlaylistManager';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { supabase } from './lib/supabase';

const ANALYTICS = {
  id: crypto.randomUUID(),
  name: 'Dancer_' + Math.floor(Math.random() * 9999)
};

export default function App() {
  const [view, setView] = useState<'menu' | 'playlist_single' | 'lobby' | 'game'>('menu');
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [roomCode, setRoomCode] = useState<string>('');
  const [mode, setMode] = useState<'audition' | 'solo'>('audition');

  const handleSelectPlaylistSingle = (songs: any[]) => {
    if (songs && songs.length > 0) {
      setPlaylist(songs);
      setMode('solo');
      setView('game');
    } else {
      alert("Diese Playlist ist leer!");
    }
  };

  const handleMultiplayerStart = async (code: string, playlistId: string | null) => {
    setRoomCode(code);
    setMode('audition');
    if (playlistId) {
      const { data } = await supabase.from('playlist_songs').select('*').eq('playlist_id', playlistId).order('position');
      setPlaylist(data || []);
    } else {
      // Mock Fallback
      setPlaylist([{ video_id: 'YEy6i9p2y1A', title: 'Default Test Song', bpm: 120 }]);
    }
    setView('game');
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 flex flex-col items-center justify-center p-6 relative overflow-x-hidden">
      
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Header View Management */}
      {view !== 'menu' && view !== 'game' && (
        <button 
          onClick={() => setView('menu')}
          className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded-full hover:bg-gray-800 transition-colors uppercase tracking-widest text-xs font-bold"
        >
          <ArrowLeft size={16} /> Zurück zum Menü
        </button>
      )}

      {/* View Routing */}
      <AnimatePresence mode="wait">
        {view === 'menu' && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
            className="w-full max-w-5xl z-10 flex flex-col items-center"
          >
            <div className="text-center mb-16">
              <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                TUBEDANCE
              </h1>
              <p className="text-gray-400 text-xl tracking-[0.3em] font-semibold mt-4">
                AUDITION UPDATE
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
              <motion.div 
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setView('playlist_single')}
                className="bg-gray-900/60 backdrop-blur-md border border-gray-800 hover:border-cyan-500/50 rounded-[32px] p-8 cursor-pointer group transition-all"
              >
                <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 border border-cyan-500/30 group-hover:scale-110 transition-transform">
                  <Play className="text-cyan-400 w-10 h-10" fill="currentColor" />
                </div>
                <h3 className="text-3xl font-black mb-2 text-white group-hover:text-cyan-400 transition-colors">Offline Modus</h3>
                <p className="text-gray-400 leading-relaxed font-medium">Spiel alleine deine YouTube-Playlists. Rhythmus und Timing sind entscheidend.</p>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setView('lobby')}
                className="bg-gray-900/60 backdrop-blur-md border border-gray-800 hover:border-purple-500/50 rounded-[32px] p-8 cursor-pointer group transition-all"
              >
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/30 group-hover:scale-110 transition-transform">
                  <Users className="text-purple-400 w-10 h-10" fill="currentColor" />
                </div>
                <h3 className="text-3xl font-black mb-2 text-white group-hover:text-purple-400 transition-colors">Multiplayer</h3>
                <p className="text-gray-400 leading-relaxed font-medium">Tritt Lobbys bei, tanze in Echtzeit gegen andere und steige im Live-Leaderboard auf.</p>
              </motion.div>
            </div>
          </motion.div>
        )}

        {view === 'playlist_single' && (
          <motion.div key="playlist" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full z-10 pt-16">
            <PlaylistManager onSelectPlaylist={handleSelectPlaylistSingle} />
          </motion.div>
        )}

        {view === 'lobby' && (
          <motion.div key="lobby" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full z-10 pt-16">
            <MultiplayerLobby 
              onGameStart={handleMultiplayerStart} 
              userId={ANALYTICS.id} 
              username={ANALYTICS.name} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {view === 'game' && (
        <div className="fixed inset-0 z-50">
          <Game 
            playlist={playlist}
            mode={mode}
            roomCode={roomCode}
            userId={ANALYTICS.id}
            username={ANALYTICS.name}
            onBack={() => setView('menu')}
            onRestart={() => setView('menu')}
          />
        </div>
      )}

      {/* Simple Env Check Warning */}
      {!import.meta.env.VITE_SUPABASE_URL && view === 'menu' && (
        <div className="absolute bottom-6 bg-red-900/50 border border-red-500/50 text-red-200 px-6 py-3 rounded-xl flex items-center gap-3 font-bold z-50">
          <Shield /> .env Supabase Variablen fehlen!
        </div>
      )}
    </div>
  );
}
