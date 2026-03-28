import { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubeEvent } from 'react-youtube';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Trophy, SkipForward, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SyncBar } from './SyncBar';
import { SequenceInput } from './SequenceInput';
import { Avatar3D } from './Avatar3D';
import { PlayerAvatar } from './PlayerAvatar';
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
  danceState?: 'idle' | 'dancing' | 'miss';
  intensity?: number;
}

export default function Game({ playlist, mode, roomCode, userId, username, profile, onBack, onGameEnd }: GameProps) {
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [gamePhase, setGamePhase] = useState<'ready' | 'playing' | 'song_ended' | 'gameover'>('ready');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [leaderboard, setLeaderboard] = useState<PlayerScore[]>([]);
  const [sequenceReady, setSequenceReady] = useState(false);
  const [seqResetTrigger, setSeqResetTrigger] = useState(0);
  
  // 3D Avatar state
  const [avatarDance, setAvatarDance] = useState<'idle' | 'dancing' | 'miss'>('idle');
  const [intensity, setIntensity] = useState(1);
  
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
      setLeaderboard([{ userId, username, score: 0, profile, danceState: 'idle', intensity: 1 }]);

      return () => { supabase.removeChannel(channel); };
    }
  }, [mode, roomCode, userId, username]);

  // Broadcast score/dance updates
  useEffect(() => {
    if (channelRef.current && userId && username) {
      channelRef.current.send({
        type: 'broadcast', event: 'score_update',
        payload: { userId, username, score, profile, danceState: avatarDance, intensity }
      });
      setLeaderboard(prev => prev.map(p => p.userId === userId ? { ...p, score, danceState: avatarDance, intensity } : p).sort((a,b) => b.score - a.score));
    }
  }, [score, avatarDance, intensity, userId, username]);

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
      setCombo(0);
      setMultiplier(1);
    } else {
      setGamePhase('gameover');
    }
  };

  const handleSequenceComplete = (isComplete: boolean) => setSequenceReady(isComplete);

  const handleHit = (result: string) => {
    if (result === 'Miss' || result === 'LOCKED' || !sequenceReady) {
      setAvatarDance('miss');
      setCombo(0);
      setMultiplier(1);
      setIntensity(1);
      setSeqResetTrigger(prev => prev + 1);
      setSequenceReady(false);
      return;
    }

    let points = 0;
    if (result === 'Perfect') points = 100;
    else if (result === 'Great') points = 80;
    else if (result === 'Cool') points = 50;
    else if (result === 'Bad') points = 20;

    // Combo calculation
    setCombo(prev => {
      const newCombo = prev + 1;
      const newMultiplier = Math.floor(newCombo / 10) + 1;
      setMultiplier(newMultiplier);
      
      // The higher the combo, the harder the robot dances! Max intensity 3
      const newIntensity = Math.min(3, 1 + newCombo * 0.1);
      setIntensity(newIntensity);

      setAvatarDance('dancing');
      setScore(s => s + (points * newMultiplier));
      return newCombo;
    });

    setSeqResetTrigger(prev => prev + 1);
    setSequenceReady(false);
  };

  const currentLevelProgress = Math.floor(score / 10);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col font-sans">
      
      {/* YouTube Background */}
      {currentSong ? (
        <div className={`absolute inset-0 z-0 opacity-50 pointer-events-none flex items-center justify-center overflow-hidden transition-all duration-1000 ${gamePhase !== 'playing' ? 'blur-3xl opacity-10' : ''}`}>
          <YouTube 
            videoId={currentSong.video_id} 
            opts={{ width: '100%', height: '100%', playerVars: { autoplay: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, showinfo: 0, start: 10 } }}
            onReady={(e) => { playerRef.current = e.target; if (gamePhase === 'playing') e.target.playVideo(); else e.target.pauseVideo(); e.target.setVolume(100); }}
            onStateChange={e => { if (e.data === 0) setGamePhase('song_ended'); }}
            onError={() => setGamePhase('song_ended')}
            className="w-[150vw] h-[150vh] min-w-[100vw] min-h-[100vh] scale-110 pointer-events-none" 
            iframeClassName="w-full h-full object-cover pointer-events-none" 
          />
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
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
           <div className="bg-gray-900/80 px-8 py-5 rounded-3xl border border-gray-700 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md pointer-events-auto">
            <p className="text-sm text-cyan-400 font-extrabold uppercase tracking-[0.2em] mb-1">SCORE</p>
            <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-white drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">{score.toString().padStart(6, '0')}</h2>
           </div>
           
           <AnimatePresence>
             {combo > 2 && (
               <motion.div 
                 initial={{ opacity: 0, scale: 0.5, x: 50 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.8 }}
                 className={`py-3 px-6 rounded-2xl flex items-center gap-3 border shadow-2xl pointer-events-auto mt-2 ${multiplier > 1 ? 'bg-gradient-to-r from-pink-600 to-purple-600 border-pink-400' : 'bg-gray-900/80 border-cyan-500'}`}
               >
                  <span className="text-xs text-white uppercase tracking-widest font-black">COMBO</span>
                  <span className="text-3xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">{combo}</span>
                  {multiplier > 1 && (
                     <span className="ml-2 px-2 py-1 bg-white text-pink-600 text-xs font-black uppercase tracking-widest rounded shadow-inner">
                        x{multiplier} MULTI
                     </span>
                  )}
               </motion.div>
             )}
           </AnimatePresence>

           {nextSong && (
             <div className="bg-gray-900/80 py-2 px-6 rounded-full flex items-center gap-2 border border-gray-700 shadow-lg mt-2 pointer-events-auto">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Nächster Song:</span>
                <span className="text-sm font-bold truncate text-gray-200">{nextSong.title}</span>
             </div>
           )}
        </div>
      </div>

      {/* Realtime Leaderboard + Avatars */}
      {mode === 'audition' && roomCode && (
        <div className="absolute top-24 left-6 z-20 w-80">
          <div className="bg-gray-900/80 backdrop-blur-md rounded-3xl p-5 border border-gray-700 shadow-2xl">
            <h3 className="flex items-center gap-2 text-cyan-400 font-black mb-4 uppercase tracking-[0.2em] text-sm border-b border-gray-700 pb-3">
               <Trophy size={16} /> Live Rangliste
            </h3>
            <div className="space-y-3">
              <AnimatePresence>
                {leaderboard.map((p, index) => (
                  <motion.div key={p.userId} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    className={`relative p-3 rounded-2xl border flex items-center gap-3 ${p.userId === userId ? 'bg-gradient-to-r from-cyan-900/60 to-blue-900/40 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-gray-800/60 border-gray-700'}`}>
                    
                    {p.profile && (
                      <div className="w-14 h-14 rounded-full bg-black/50 border-2 border-gray-700 relative overflow-hidden flex items-center justify-center shrink-0">
                        {p.profile.rpm_url ? (
                           <div className="scale-[0.5] origin-top"><PlayerAvatar modelUrl={p.profile.rpm_url} danceState={p.danceState || 'idle'} intensity={p.intensity || 1} bpm={currentSong?.bpm || 120} /></div>
                        ) : (
                           <Avatar3D jacket={p.profile.jacket} pants={p.profile.pants} shoes={p.profile.shoes} danceState={p.danceState || 'idle'} intensity={p.intensity || 1} bpm={currentSong ? (currentSong.bpm || 120) : 120} />
                        )}
                      </div>
                    )}
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <span className="font-bold text-sm text-gray-100 truncate flex items-center gap-1">
                        <span className="text-cyan-500 font-mono font-black mr-1">#{index+1}</span> {p.username}
                      </span>
                      <span className="font-mono font-black text-lg text-cyan-300 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">{p.score}</span>
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
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-32 pointer-events-none">
          
          {/* Main 3D Avatar Showcase */}
          <div className="mb-4 pointer-events-auto relative w-full h-[35vh] flex justify-center items-end">
             {profile.rpm_url ? (
                <PlayerAvatar 
                   modelUrl={profile.rpm_url}
                   danceState={avatarDance} 
                   intensity={intensity}
                   bpm={currentSong.bpm || 120}
                />
             ) : (
                <Avatar3D 
                  jacket={profile.jacket} 
                  pants={profile.pants} 
                  shoes={profile.shoes} 
                  danceState={avatarDance} 
                  intensity={intensity}
                  bpm={currentSong.bpm || 120}
                />
             )}
          </div>

          <div className="mb-12 pointer-events-auto">
            <SequenceInput onSequenceComplete={handleSequenceComplete} resetTrigger={seqResetTrigger} />
          </div>

          <div className="pointer-events-auto w-full max-w-3xl px-6">
            <SyncBar bpm={currentSong.bpm || 120} onHit={handleHit} locked={!sequenceReady} />
          </div>
        </div>
      )}

      {/* Ready State */}
      {gamePhase === 'ready' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xl">
          <div className="bg-gray-900/90 border border-cyan-500/30 p-16 rounded-[40px] shadow-[0_0_60px_rgba(6,182,212,0.3)] flex flex-col items-center text-center max-w-3xl">
            <p className="text-cyan-400 font-black uppercase tracking-[0.4em] mb-4">Macht euch bereit</p>
            <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-white mb-12 uppercase leading-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
              {currentSong ? currentSong.title : 'Kein Song geladen'}
            </h2>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setGamePhase('playing'); try { playerRef.current?.playVideo(); } catch(e) {} }}
              className="px-20 py-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-full font-black text-3xl tracking-[0.2em] uppercase shadow-[0_0_40px_rgba(6,182,212,0.6)]">
              STARTEN
            </motion.button>
          </div>
        </div>
      )}

      {/* Song Ended Screen */}
      {gamePhase === 'song_ended' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
          <div className="bg-gray-900/90 p-12 rounded-[40px] border border-gray-700 text-center max-w-2xl w-full shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mb-6 uppercase tracking-widest drop-shadow-[0_0_15px_rgba(74,222,128,0.3)]">Song Erledigt!</h2>
            <div className="text-8xl font-mono font-black text-white mb-2 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">{score.toString().padStart(6, '0')}</div>
            <p className="text-cyan-400 font-black text-xl mb-10 uppercase tracking-widest flex items-center justify-center gap-2">
               <Trophy size={20} /> + {currentLevelProgress} EXP
            </p>

            <div className="flex gap-4 justify-center">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleNextSong} 
                className="flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-2xl text-white font-black uppercase tracking-widest shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                <SkipForward size={24} /> Nächster Track
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onGameEnd(currentLevelProgress)} 
                className="flex items-center justify-center gap-3 px-8 py-5 bg-gray-800 hover:bg-red-900/80 rounded-2xl text-gray-300 hover:text-white font-black uppercase tracking-widest border border-gray-700 hover:border-red-500 transition-colors">
                <XCircle size={24} /> Verlassen
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gamePhase === 'gameover' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl">
          <div className="bg-gray-900/90 p-16 rounded-[40px] border-2 border-gray-800 text-center max-w-3xl w-full shadow-[0_0_80px_rgba(0,0,0,1)]">
            <h2 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-500 mb-8 uppercase tracking-widest">Playlist Beendet</h2>
            <p className="text-gray-400 text-2xl font-black uppercase tracking-[0.3em] mb-4">Total Score</p>
            <div className="text-[120px] leading-none font-mono font-black text-white mb-4 drop-shadow-[0_0_50px_rgba(255,255,255,0.4)]">{score}</div>
            <p className="text-cyan-400 font-black text-3xl mb-16 uppercase tracking-widest">+ {currentLevelProgress} EXP</p>

            <div className="flex justify-center">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onGameEnd(currentLevelProgress)} 
                className="px-12 py-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-2xl text-white font-black text-2xl uppercase tracking-[0.2em] shadow-[0_0_40px_rgba(6,182,212,0.5)] transition-colors">
                Menü & EXP Speichern
              </motion.button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
