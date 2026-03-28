import { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubeEvent } from 'react-youtube';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Users, Trophy, Play, SkipForward, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SyncBar } from './SyncBar';
import { SequenceInput } from './SequenceInput';

interface PlaylistSong { video_id: string; title: string; bpm: number }
interface GameProps {
  playlist: PlaylistSong[];
  mode: string;
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
  const [gamePhase, setGamePhase] = useState<'ready' | 'playing' | 'song_ended' | 'gameover'>('ready');
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<PlayerScore[]>([]);
  const [sequenceReady, setSequenceReady] = useState(false);
  const [seqResetTrigger, setSeqResetTrigger] = useState(0);
  
  const playerRef = useRef<any>(null);
  const channelRef = useRef<any>(null);

  const currentSong = playlist[currentSongIndex];
  const nextSong = playlist[currentSongIndex + 1];

  // Multiplayer Broadcast Setup
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

      setLeaderboard([{ userId, username, score: 0 }]);

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [mode, roomCode, userId, username]);

  // Broadcast score updates
  useEffect(() => {
    if (channelRef.current && userId && username) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'score_update',
        payload: { userId, username, score }
      });
      setLeaderboard(prev => prev.map(p => p.userId === userId ? { ...p, score } : p).sort((a,b) => b.score - a.score));
    }
  }, [score, userId, username]);

  // Automatically end song 10 seconds before its actual end (to avoid YouTube related videos & outro)
  useEffect(() => {
    let interval: any;
    if (gamePhase === 'playing') {
      interval = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime && playerRef.current.getDuration) {
          const currentTime = playerRef.current.getCurrentTime();
          const duration = playerRef.current.getDuration();
          if (duration > 0 && currentTime >= duration - 10) {
            setGamePhase('song_ended');
            try { playerRef.current.pauseVideo(); } catch(e) {}
          }
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [gamePhase]);

  const handleYoutubeStateChange = (e: YouTubeEvent) => {
    if (e.data === 0) { // ENDED
      setGamePhase('song_ended');
    }
  };

  const handleYoutubeError = (e: YouTubeEvent) => {
    console.error("YouTube Player Error", e.data);
    // Skips video if broken or processing
    setGamePhase('song_ended');
  };

  const handleNextSong = () => {
    if (currentSongIndex + 1 < playlist.length) {
      setCurrentSongIndex(prev => prev + 1);
      setSeqResetTrigger(prev => prev + 1);
      setGamePhase('ready');
    } else {
      setGamePhase('gameover');
    }
  };

  const handleSequenceComplete = (isComplete: boolean) => {
    setSequenceReady(isComplete);
  };

  const handleHit = (result: string) => {
    if (result === 'Miss' || result === 'LOCKED' || !sequenceReady) {
      // Failed hit or pressed space without finishing sequence
      setSeqResetTrigger(prev => prev + 1);
      setSequenceReady(false);
      return;
    }

    let points = 0;
    if (result === 'Perfect') points = 100;
    else if (result === 'Great') points = 80;
    else if (result === 'Cool') points = 50;
    else if (result === 'Bad') points = 20;

    // Direct score update. Works in offline because it doesn't rely on Supabase.
    setScore(prev => prev + points);
    setSeqResetTrigger(prev => prev + 1);
    setSequenceReady(false);
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col font-sans">
      
      {/* YouTube Background */}
      {currentSong ? (
        <div className={`absolute inset-0 z-0 opacity-40 pointer-events-none flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${gamePhase !== 'playing' ? 'blur-md opacity-20' : ''}`}>
          <YouTube 
            videoId={currentSong.video_id} 
            opts={{ 
              width: '100%', height: '100%', 
              playerVars: { 
                autoplay: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, showinfo: 0, 
                start: 10 // Skips the first 10 seconds 
              } 
            }}
            onReady={(e) => { 
                playerRef.current = e.target; 
                if (gamePhase === 'playing') e.target.playVideo(); else e.target.pauseVideo(); 
                e.target.setVolume(100);
            }}
            onStateChange={handleYoutubeStateChange}
            onError={handleYoutubeError}
            className="w-[150vw] h-[150vh] min-w-[100vw] min-h-[100vh] scale-105 pointer-events-none" 
            iframeClassName="w-full h-full object-cover pointer-events-none" 
          />
          {/* Black gradient overlay over the bottom to hide YouTube logos and give space to the UI */}
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
        </div>
      ) : (
        <div className="absolute inset-0 z-0 flex items-center justify-center text-gray-600">Keine Playlist gefunden.</div>
      )}

      {/* Header Info */}
      <div className="absolute top-0 left-0 w-full p-6 z-20 flex justify-between items-start">
        <button onClick={onBack} className="flex items-center gap-2 px-5 py-2 bg-gray-900/80 border border-gray-700 text-white rounded-full hover:bg-pink-600 transition-all backdrop-blur-md text-sm uppercase tracking-widest font-bold shadow-lg">
          <ArrowLeft size={16} /> Verlassen
        </button>

        <div className="text-right flex flex-col items-end gap-2">
           <div className="bg-gray-900/80 px-6 py-4 rounded-2xl border border-gray-700 shadow-2xl backdrop-blur-md">
            <p className="text-xs text-cyan-400 font-extrabold uppercase tracking-[0.2em] mb-1">SCORE</p>
            <h2 className="text-5xl font-black text-white drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">{score.toString().padStart(6, '0')}</h2>
           </div>
           
           {nextSong && (
             <div className="bg-gray-900/80 py-2 px-4 rounded-full flex items-center gap-2 border border-gray-700 shadow-lg mt-2">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Nächster Song:</span>
                <span className="text-xs font-bold truncate text-gray-200 max-w-[200px]">{nextSong.title}</span>
             </div>
           )}
        </div>
      </div>

      {/* Leaderboard (Realtime) */}
      {mode === 'audition' && roomCode && (
        <div className="absolute top-32 left-6 z-20 w-64">
          <div className="bg-gray-900/80 backdrop-blur-md rounded-2xl p-4 border border-gray-700 shadow-2xl">
            <h3 className="flex items-center gap-2 text-cyan-400 font-black mb-4 uppercase tracking-[0.2em] text-sm border-b border-gray-700 pb-3">
               <Trophy size={16} /> Live Rangliste
            </h3>
            <div className="space-y-2">
              <AnimatePresence>
                {leaderboard.map((player, index) => (
                  <motion.div 
                    key={player.userId}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center justify-between p-3 rounded-xl ${player.userId === userId ? 'bg-cyan-900/60 border border-cyan-500/50' : 'bg-gray-800/80 border border-transparent'}`}
                  >
                    <div className="flex items-center gap-2 shrink-0 overflow-hidden">
                      <span className="font-mono text-gray-500 text-xs font-black">#{index + 1}</span>
                      <span className="font-bold text-sm text-gray-100 truncate">{player.username}</span>
                    </div>
                    <span className="font-mono font-black text-cyan-300 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)] ml-2">{player.score}</span>
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
          
          <div className="mb-16">
            <SequenceInput 
              onSequenceComplete={handleSequenceComplete} 
              resetTrigger={seqResetTrigger} 
            />
          </div>

          <SyncBar 
            bpm={currentSong.bpm || 120} 
            onHit={handleHit} 
            locked={!sequenceReady}
          />

        </div>
      )}

      {/* Ready State */}
      {gamePhase === 'ready' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl">
          <div className="bg-gray-900/80 border border-gray-700 p-12 rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-2xl">
            <p className="text-cyan-400 font-bold uppercase tracking-[0.3em] mb-4">Macht euch bereit</p>
            <h2 className="text-5xl font-black text-white mb-10 tracking-widest uppercase shadow-black drop-shadow-lg leading-tight">
              {currentSong ? currentSong.title : 'Kein Song geladen'}
            </h2>
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setGamePhase('playing'); try { playerRef.current?.playVideo(); } catch(e) {} }}
              className="px-16 py-5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full font-black text-2xl tracking-[0.2em] uppercase shadow-[0_0_40px_rgba(6,182,212,0.6)] border border-cyan-400/50"
            >
              STARTEN
            </motion.button>
          </div>
        </div>
      )}

      {/* Song Ended Mid-Screen (Ask to continue) */}
      {gamePhase === 'song_ended' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
          <div className="bg-gray-900/90 p-10 rounded-3xl border border-gray-700 text-center max-w-xl w-full shadow-2xl">
            <h2 className="text-4xl font-black text-green-400 mb-6 uppercase tracking-widest drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]">Song Erledigt!</h2>
            <div className="text-7xl font-mono font-black text-white mb-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{score.toString().padStart(6, '0')}</div>
            
            <p className="text-gray-400 font-semibold mb-8">Was möchtest du als Nächstes tun?</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button 
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={handleNextSong} 
                className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-white font-black uppercase tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              >
                <SkipForward size={20} /> Weiter
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={onBack} 
                className="flex items-center justify-center gap-2 px-8 py-4 bg-gray-800 hover:bg-red-900/50 rounded-xl text-gray-300 hover:text-red-400 font-bold uppercase tracking-widest border border-gray-700 hover:border-red-500/50 transition-colors"
              >
                <XCircle size={20} /> Es reicht
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gamePhase === 'gameover' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
          <div className="bg-gray-900/90 p-12 rounded-3xl border border-gray-700 text-center max-w-2xl w-full shadow-2xl">
            <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-500 mb-6 uppercase tracking-widest">Playlist Beendet</h2>
            <p className="text-gray-400 text-xl font-bold uppercase tracking-[0.2em] mb-4">Total Score</p>
            <div className="text-8xl font-mono font-black text-white mb-12 drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">{score}</div>
            
            <div className="flex gap-6 justify-center">
              <button 
                onClick={onRestart} 
                className="px-10 py-4 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white font-black text-xl uppercase tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-colors"
              >
                Nochmal
              </button>
              <button 
                onClick={onBack} 
                className="px-10 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl text-white font-black text-xl uppercase tracking-widest border border-gray-600 transition-colors"
              >
                Menü
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
