import { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubeEvent } from 'react-youtube';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Users, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SyncBar } from './SyncBar';
import { SequenceInput } from './SequenceInput';

interface PlaylistSong { video_id: string; title: string; bpm: number }
interface GameProps {
  playlist: PlaylistSong[];
  mode: string; // 'solo', 'pvp', 'pve', 'coop', 'audition'
  roomCode?: string;
  userId?: string;
  username?: string;
  onBack: () => void;
  onRestart: () => void;
}

interface PlayerScore {
  userId: string;
  username: string;
  score: number;
}

export default function Game({ playlist, mode, roomCode, userId, username, onBack, onRestart }: GameProps) {
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [gamePhase, setGamePhase] = useState<'ready' | 'playing' | 'gameover'>('ready');
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<PlayerScore[]>([]);
  const [sequenceReady, setSequenceReady] = useState(false);
  const [seqResetTrigger, setSeqResetTrigger] = useState(0);
  
  const playerRef = useRef<any>(null);
  const channelRef = useRef<any>(null);

  const currentSong = playlist[currentSongIndex];
  const nextSong = playlist[currentSongIndex + 1];

  useEffect(() => {
    if (mode === 'audition' && roomCode && userId && username) {
      const channel = supabase.channel(`game:${roomCode}`);
      
      channel.on('broadcast', { event: 'score_update' }, (payload) => {
        setLeaderboard(prev => {
          const exists = prev.find(p => p.userId === payload.payload.userId);
          if (exists) {
            return prev.map(p => p.userId === payload.payload.userId ? { ...p, score: payload.payload.score } : p).sort((a,b) => b.score - a.score);
          }
          return [...prev, payload.payload].sort((a,b) => b.score - a.score);
        });
      });

      channel.subscribe();
      channelRef.current = channel;

      // Add self
      setLeaderboard([{ userId, username, score: 0 }]);

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [mode, roomCode, userId, username]);

  useEffect(() => {
    if (channelRef.current && userId && username) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'score_update',
        payload: { userId, username, score }
      });
      // Update self in local leaderboard
      setLeaderboard(prev => {
        const lp = prev.map(p => p.userId === userId ? { ...p, score } : p).sort((a,b) => b.score - a.score);
        return lp;
      });
    }
  }, [score, userId, username]);

  const handleYoutubeStateChange = (e: YouTubeEvent) => {
    // 0 = ENDED
    if (e.data === 0) {
      if (currentSongIndex + 1 < playlist.length) {
        setCurrentSongIndex(prev => prev + 1);
        setSeqResetTrigger(prev => prev + 1);
      } else {
        setGamePhase('gameover');
      }
    }
  };

  const handleSequenceComplete = (isComplete: boolean) => {
    setSequenceReady(isComplete);
  };

  const handleHit = (result: string) => {
    if (result === 'Miss' || !sequenceReady) {
      // Failed hit or pressed space without finishing sequence
      setSeqResetTrigger(prev => prev + 1);
      setSequenceReady(false);
      return;
    }

    // Success hit
    let points = 0;
    if (result === 'Perfect') points = 100;
    if (result === 'Great') points = 80;
    if (result === 'Cool') points = 50;
    if (result === 'Bad') points = 20;

    setScore(prev => prev + points);
    setSeqResetTrigger(prev => prev + 1);
    setSequenceReady(false);
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col font-sans">
      {/* YouTube Background */}
      {currentSong ? (
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none flex items-center justify-center overflow-hidden">
          <YouTube 
            videoId={currentSong.video_id} 
            opts={{ 
              width: '100%', height: '100%', 
              playerVars: { autoplay: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, showinfo: 0 } 
            }}
            onReady={(e) => { playerRef.current = e.target; if (gamePhase === 'playing') e.target.playVideo(); else e.target.pauseVideo(); }}
            onStateChange={handleYoutubeStateChange}
            className="w-[150vw] h-[150vh] min-w-[100vw] min-h-[100vh]" 
            iframeClassName="w-full h-full object-cover pointer-events-none" 
          />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 flex items-center justify-center text-gray-600">Keine Playlist gefunden.</div>
      )}

      {/* Header Info */}
      <div className="absolute top-0 left-0 w-full p-6 z-20 flex justify-between items-start">
        <button onClick={onBack} className="flex items-center gap-2 px-5 py-2 bg-gray-900/80 border border-gray-700 text-white rounded-full hover:bg-pink-600 transition-all backdrop-blur-md text-sm uppercase tracking-widest">
          <ArrowLeft size={16} /> Verlassen
        </button>

        <div className="text-right flex flex-col items-end gap-2">
           <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800 backdrop-blur-md">
            <p className="text-xs text-cyan-400 uppercase tracking-widest mb-1">Punkte</p>
            <h2 className="text-4xl font-black text-white">{score.toString().padStart(6, '0')}</h2>
           </div>
           
           {nextSong && (
             <div className="bg-gray-900/80 py-2 px-4 rounded-lg flex items-center gap-2 border border-gray-700 max-w-sm">
                <span className="text-xs text-gray-400 uppercase tracking-widest">Nächster Song:</span>
                <span className="text-sm font-semibold truncate text-white">{nextSong.title}</span>
             </div>
           )}
        </div>
      </div>

      {/* Leaderboard (Realtime) */}
      {mode === 'audition' && roomCode && (
        <div className="absolute top-24 left-6 z-20 w-64">
          <div className="bg-gray-900/70 backdrop-blur-md rounded-xl p-4 border border-gray-700 shadow-xl">
            <h3 className="flex items-center gap-2 text-cyan-400 font-bold mb-4 uppercase tracking-widest text-sm border-b border-gray-700 pb-2">
               <Trophy size={16} /> Live Rangliste
            </h3>
            <div className="space-y-3">
              <AnimatePresence>
                {leaderboard.map((player, index) => (
                  <motion.div 
                    key={player.userId}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center justify-between p-2 rounded-lg ${player.userId === userId ? 'bg-cyan-900/50 border border-cyan-500/30' : 'bg-gray-800'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-gray-500 text-xs">#{index + 1}</span>
                      <span className="font-semibold text-sm text-gray-200 truncate max-w-[100px]">{player.username}</span>
                    </div>
                    <span className="font-mono font-bold text-cyan-300">{player.score}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* Main Game Area */}
      {gamePhase === 'playing' && currentSong && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-32">
          
          <div className="mb-12">
            <SequenceInput 
              onSequenceComplete={handleSequenceComplete} 
              resetTrigger={seqResetTrigger} 
            />
          </div>

          <SyncBar 
            bpm={currentSong.bpm || 120} 
            onHit={handleHit} 
          />

        </div>
      )}

      {/* Ready State */}
      {gamePhase === 'ready' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
          <h2 className="text-5xl font-black text-white mb-8 tracking-widest uppercase shadow-black drop-shadow-lg text-center">
            {currentSong ? currentSong.title : 'Bereit?'}
          </h2>
          <motion.button 
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { setGamePhase('playing'); playerRef.current?.playVideo(); }}
            className="px-12 py-4 bg-cyan-600 text-white rounded-full font-black text-2xl tracking-widest uppercase shadow-[0_0_30px_rgba(6,182,212,0.6)]"
          >
            START
          </motion.button>
        </div>
      )}

      {/* Game Over */}
      {gamePhase === 'gameover' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="bg-gray-900 p-12 rounded-3xl border border-gray-700 text-center max-w-lg w-full">
            <h2 className="text-5xl font-black text-cyan-400 mb-6 uppercase tracking-widest">Playlist Beendet</h2>
            <div className="text-7xl font-mono text-white mb-8 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">{score}</div>
            
            <div className="flex gap-4 justify-center">
              <button onClick={onRestart} className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-bold uppercase tracking-widest">Nochmal</button>
              <button onClick={onBack} className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-bold uppercase tracking-widest border border-gray-600">Verlassen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
