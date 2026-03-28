import { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubeEvent } from 'react-youtube';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Trophy, SkipForward, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SyncBar } from './SyncBar';
import { SequenceInput } from './SequenceInput';
import { Avatar } from './Avatar';
import { PlayerProfile } from './LockerRoom';

interface PlaylistSong { video_id: string; title: string; bpm: number }
interface GameProps {
  playlist: PlaylistSong[];
  mode: string;
  roomCode?: string;
  userId?: string;
  username?: string;
  profile: PlayerProfile;
  onBack: () => void;
  onGameEnd: (exp: number) => void;
}

interface PlayerScore {
  userId: string;
  username: string;
  score: number;
  profile?: PlayerProfile;
  danceState?: 'idle' | 'Perfect' | 'Great' | 'Cool' | 'Bad' | 'Miss';
}

export default function Game({ playlist, mode, roomCode, userId, username, profile, onBack, onGameEnd }: GameProps) {
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [gamePhase, setGamePhase] = useState<'ready' | 'playing' | 'song_ended' | 'gameover'>('ready');
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<PlayerScore[]>([]);
  const [sequenceReady, setSequenceReady] = useState(false);
  const [seqResetTrigger, setSeqResetTrigger] = useState(0);
  const [avatarDance, setAvatarDance] = useState<'idle' | 'Perfect' | 'Great' | 'Cool' | 'Bad' | 'Miss'>('idle');
  
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
            return prev.map(p => p.userId === payload.payload.userId ? { ...p, ...payload.payload } : p).sort((a,b) => b.score - a.score);
          }
          return [...prev, payload.payload].sort((a,b) => b.score - a.score);
        });
      });

      channel.subscribe();
      channelRef.current = channel;
      setLeaderboard([{ userId, username, score: 0, profile, danceState: 'idle' }]);

      return () => { supabase.removeChannel(channel); };
    }
  }, [mode, roomCode, userId, username]);

  // Broadcast score/dance updates
  useEffect(() => {
    if (channelRef.current && userId && username) {
      channelRef.current.send({
        type: 'broadcast', event: 'score_update',
        payload: { userId, username, score, profile, danceState: avatarDance }
      });
      setLeaderboard(prev => prev.map(p => p.userId === userId ? { ...p, score, danceState: avatarDance } : p).sort((a,b) => b.score - a.score));
    }
  }, [score, avatarDance, userId, username]);

  // Handle Video Timeout
  useEffect(() => {
    let interval: any;
    if (gamePhase === 'playing') {
      interval = setInterval(() => {
        if (playerRef.current?.getCurrentTime && playerRef.current?.getDuration) {
          const duration = playerRef.current.getDuration();
          if (duration > 0 && playerRef.current.getCurrentTime() >= duration - 10) {
            setGamePhase('song_ended');
            try { playerRef.current.pauseVideo(); } catch(e) {}
          }
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [gamePhase]);

  const handleNextSong = () => {
    if (currentSongIndex + 1 < playlist.length) {
      setCurrentSongIndex(prev => prev + 1);
      setSeqResetTrigger(prev => prev + 1);
      setGamePhase('ready');
    } else {
      setGamePhase('gameover');
    }
  };

  const handleSequenceComplete = (isComplete: boolean) => setSequenceReady(isComplete);

  const handleHit = (result: string) => {
    if (result === 'Miss' || result === 'LOCKED' || !sequenceReady) {
      setAvatarDance('Miss');
      setSeqResetTrigger(prev => prev + 1);
      setSequenceReady(false);
      return;
    }

    let points = 0;
    if (result === 'Perfect') points = 100;
    else if (result === 'Great') points = 80;
    else if (result === 'Cool') points = 50;
    else if (result === 'Bad') points = 20;

    setAvatarDance(result as 'Perfect' | 'Great' | 'Cool' | 'Bad');
    setScore(prev => prev + points);
    setSeqResetTrigger(prev => prev + 1);
    setSequenceReady(false);
  };

  const currentLevelProgress = Math.floor(score / 10); // 10% of score is EXP

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col font-sans">
      
      {/* YouTube Background */}
      {currentSong ? (
        <div className={`absolute inset-0 z-0 opacity-40 pointer-events-none flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${gamePhase !== 'playing' ? 'blur-md opacity-20' : ''}`}>
          <YouTube 
            videoId={currentSong.video_id} 
            opts={{ width: '100%', height: '100%', playerVars: { autoplay: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, showinfo: 0, start: 10 } }}
            onReady={(e) => { playerRef.current = e.target; if (gamePhase === 'playing') e.target.playVideo(); else e.target.pauseVideo(); e.target.setVolume(100); }}
            onStateChange={e => { if (e.data === 0) setGamePhase('song_ended'); }}
            onError={() => setGamePhase('song_ended')}
            className="w-[150vw] h-[150vh] min-w-[100vw] min-h-[100vh] scale-105 pointer-events-none" 
            iframeClassName="w-full h-full object-cover pointer-events-none" 
          />
          <div className="absolute bottom-0 left-0 w-full h-2/3 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none"></div>
        </div>
      ) : (
        <div className="absolute inset-0 z-0 flex items-center justify-center text-gray-600">Keine Playlist gefunden.</div>
      )}

      {/* Header Info */}
      <div className="absolute top-0 left-0 w-full p-6 z-20 flex justify-between items-start pointer-events-none">
        <button onClick={onBack} className="pointer-events-auto flex items-center gap-2 px-5 py-2 bg-gray-900/80 border border-gray-700 text-white rounded-full hover:bg-pink-600 transition-all backdrop-blur-md text-sm uppercase tracking-widest font-bold shadow-lg">
          <ArrowLeft size={16} /> Verlassen
        </button>

        <div className="text-right flex flex-col items-end gap-2">
           <div className="bg-gray-900/80 px-6 py-4 rounded-2xl border border-gray-700 shadow-2xl backdrop-blur-md pointer-events-auto">
            <p className="text-xs text-cyan-400 font-extrabold uppercase tracking-[0.2em] mb-1">SCORE</p>
            <h2 className="text-5xl font-black text-white drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">{score.toString().padStart(6, '0')}</h2>
           </div>
           {nextSong && (
             <div className="bg-gray-900/80 py-2 px-4 rounded-full flex items-center gap-2 border border-gray-700 shadow-lg mt-2 pointer-events-auto">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Nächster Song:</span>
                <span className="text-xs font-bold truncate text-gray-200 max-w-[200px]">{nextSong.title}</span>
             </div>
           )}
        </div>
      </div>

      {/* Realtime Leaderboard + Avatars */}
      {mode === 'audition' && roomCode && (
        <div className="absolute top-24 left-6 z-20 w-72">
          <div className="bg-gray-900/80 backdrop-blur-md rounded-3xl p-4 border border-gray-700 shadow-2xl">
            <h3 className="flex items-center gap-2 text-cyan-400 font-black mb-4 uppercase tracking-[0.2em] text-sm border-b border-gray-700 pb-3">
               <Trophy size={16} /> Live Rangliste
            </h3>
            <div className="space-y-3">
              <AnimatePresence>
                {leaderboard.map((p, index) => (
                  <motion.div key={p.userId} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    className={`relative p-3 rounded-2xl border flex items-center gap-3 ${p.userId === userId ? 'bg-cyan-900/40 border-cyan-500/50 shadow-inner' : 'bg-gray-800/60 border-gray-700'}`}>
                    {/* Mini Avatar */}
                    {p.profile && (
                      <div className="w-10 h-10 rounded-full bg-gray-900 border border-gray-700 relative overflow-hidden flex items-center justify-center shrink-0">
                        <Avatar jacket={p.profile.jacket} pants={p.profile.pants} shoes={p.profile.shoes} danceState={p.danceState || 'idle'} size={0.3} />
                      </div>
                    )}
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <span className="font-bold text-xs text-gray-100 truncate flex items-center gap-1">
                        <span className="text-gray-500 font-mono">#{index+1}</span> {p.username}
                      </span>
                      <span className="font-mono font-black text-cyan-300 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">{p.score}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* Main Game Area */}
      {gamePhase === 'playing' && currentSong && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-24 pointer-events-none">
          
          {/* Main Avatar Showcase */}
          <div className="mb-8 pointer-events-none">
            <Avatar 
              jacket={profile.jacket} 
              pants={profile.pants} 
              shoes={profile.shoes} 
              danceState={avatarDance} 
              size={1}
            />
          </div>

          <div className="mb-12 pointer-events-auto">
            <SequenceInput onSequenceComplete={handleSequenceComplete} resetTrigger={seqResetTrigger} />
          </div>

          <div className="pointer-events-auto w-full max-w-2xl px-6">
            <SyncBar bpm={currentSong.bpm || 120} onHit={handleHit} locked={!sequenceReady} />
          </div>
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
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setGamePhase('playing'); try { playerRef.current?.playVideo(); } catch(e) {} }}
              className="px-16 py-5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full font-black text-2xl tracking-[0.2em] uppercase shadow-[0_0_40px_rgba(6,182,212,0.6)] border border-cyan-400/50">
              STARTEN
            </motion.button>
          </div>
        </div>
      )}

      {/* Song Ended Screen */}
      {gamePhase === 'song_ended' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
          <div className="bg-gray-900/90 p-10 rounded-3xl border border-gray-700 text-center max-w-xl w-full shadow-2xl">
            <h2 className="text-4xl font-black text-green-400 mb-6 uppercase tracking-widest drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]">Song Erledigt!</h2>
            <div className="text-7xl font-mono font-black text-white mb-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{score.toString().padStart(6, '0')}</div>
            <p className="text-cyan-400 font-bold mb-8 uppercase tracking-widest">+ {currentLevelProgress} EXP gesammelt</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleNextSong} 
                className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-white font-black uppercase tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                <SkipForward size={20} /> Weiter
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onGameEnd(currentLevelProgress)} 
                className="flex items-center justify-center gap-2 px-8 py-4 bg-gray-800 hover:bg-red-900/50 rounded-xl text-gray-300 hover:text-red-400 font-bold uppercase tracking-widest border border-gray-700 hover:border-red-500/50 transition-colors">
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
            <p className="text-gray-400 text-xl font-bold uppercase tracking-[0.2em] mb-2">Total Score</p>
            <div className="text-8xl font-mono font-black text-white mb-2 drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">{score}</div>
            <p className="text-cyan-400 font-bold mb-12 uppercase tracking-widest">+ {currentLevelProgress} EXP gesammelt</p>

            <div className="flex gap-6 justify-center">
              <button onClick={() => onGameEnd(currentLevelProgress)} className="px-10 py-4 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white font-black text-xl uppercase tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-colors">
                Menü & EXP Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
