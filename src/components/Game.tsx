import { useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Trophy, SkipForward, XCircle, Coins, Flame } from 'lucide-react';
import { calculateBeatsEarned } from '../lib/economy';
import { supabase } from '../lib/supabase';
import { AnimatedAvatar } from './AnimatedAvatar';
import { BeatUpMode } from './modes/BeatUpMode';
import { BeatRushMode } from './modes/BeatRushMode';
import { FreestyleMode } from './modes/FreestyleMode';
import { PlayerProfile } from './LockerRoom';
import { type GameMode, type HitRating, type LetterGrade, getLetterGrade, GRADE_COLORS } from '../types/gameTypes';

interface PlaylistSong { video_id: string; title: string; bpm: number }
interface GameProps {
  playlist: PlaylistSong[];
  mode: string;
  gameMode?: GameMode;
  roomCode?: string;
  userId?: string;
  username?: string;
  profile: PlayerProfile;
  onBack: () => void;
  onGameEnd: (exp: number, finalScore?: number, maxCombo?: number, multiplier?: number, songCount?: number) => void;
}

interface PlayerScore {
  userId: string;
  username: string;
  score: number;
  combo: number;
  profile?: PlayerProfile;
  danceState?: 'idle' | 'dancing' | 'miss';
  intensity?: number;
  lastRating?: HitRating | null;
  lastRatingTime?: number;
}

export default function Game({ playlist, mode, gameMode = 'beat_up', roomCode, userId, username, profile, onBack, onGameEnd }: GameProps) {
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [gamePhase, setGamePhase] = useState<'ready' | 'playing' | 'song_ended' | 'gameover'>('ready');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [maxCombo, setMaxCombo] = useState(0);
  const [leaderboard, setLeaderboard] = useState<PlayerScore[]>([]);
  const [round, setRound] = useState(0);

  // 3D Avatar state
  const [avatarDance, setAvatarDance] = useState<'idle' | 'dancing' | 'miss'>('idle');
  const [intensity, setIntensity] = useState(1);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Hit rating stats
  const [hitCounts, setHitCounts] = useState<Record<HitRating, number>>({ Perfect: 0, Great: 0, Cool: 0, Bad: 0, Miss: 0 });
  const [currentGrade, setCurrentGrade] = useState<LetterGrade>('C');
  const [lastRating, setLastRating] = useState<HitRating | null>(null);
  const lastRatingTimer = useRef<any>(null);

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
            return prev.map(p => p.userId === payload.payload.userId ? { ...p, ...payload.payload } : p).sort((a, b) => b.score - a.score);
          }
          return [...prev, payload.payload].sort((a, b) => b.score - a.score);
        });
      });

      channel.subscribe();
      channelRef.current = channel;
      setLeaderboard([{ userId, username, score: 0, combo: 0, profile, danceState: 'idle', intensity: 1, lastRating: null, lastRatingTime: 0 }]);

      return () => { supabase.removeChannel(channel); };
    }
  }, [mode, roomCode, userId, username]);

  // Broadcast score/dance updates
  useEffect(() => {
    if (channelRef.current && userId && username) {
      channelRef.current.send({
        type: 'broadcast', event: 'score_update',
        payload: { userId, username, score, combo, profile, danceState: avatarDance, intensity, lastRating, lastRatingTime: Date.now() }
      });
      setLeaderboard(prev => prev.map(p => p.userId === userId ? { ...p, score, combo, danceState: avatarDance, intensity, lastRating, lastRatingTime: Date.now() } : p).sort((a, b) => b.score - a.score));
    }
  }, [score, avatarDance, intensity, combo, lastRating, userId, username]);

  // Handle Video Timeout
  useEffect(() => {
    let interval: any;
    if (gamePhase === 'playing') {
      interval = setInterval(() => {
        if (playerRef.current?.getCurrentTime && playerRef.current?.getDuration) {
          const duration = playerRef.current.getDuration();
          const currentTime = playerRef.current.getCurrentTime();
          if (duration > 20 && currentTime >= duration - 10) {
            setGamePhase('song_ended');
            try { playerRef.current.pauseVideo(); } catch (e) { }
          }
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [gamePhase]);

  // Auto-start countdown in multiplayer — synchronized via broadcast
  const syncStartHandled = useRef(false);
  useEffect(() => {
    if (mode === 'audition' && gamePhase === 'ready' && countdown === null && !syncStartHandled.current) {
      syncStartHandled.current = true;

      if (channelRef.current) {
        // Listen for sync_countdown from another player
        channelRef.current.on('broadcast', { event: 'sync_countdown' }, () => {
          if (countdown === null && gamePhase === 'ready') {
            setCountdown(3);
            setAvatarDance('dancing');
          }
        });

        // First player to arrive broadcasts the sync signal after a short delay
        const timer = setTimeout(() => {
          channelRef.current?.send({
            type: 'broadcast', event: 'sync_countdown', payload: {},
          });
          // Also start locally
          setCountdown(3);
          setAvatarDance('dancing');
        }, 2000);
        return () => clearTimeout(timer);
      } else {
        // No channel (fallback) — just start after delay
        const timer = setTimeout(() => {
          setCountdown(3);
          setAvatarDance('dancing');
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [mode, gamePhase, countdown]);

  // Countdown Logic
  useEffect(() => {
    let timer: any;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      timer = setTimeout(() => {
        setCountdown(null);
        setGamePhase('playing');
        try { playerRef.current?.playVideo(); } catch (e) { }
      }, 800);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Update live grade
  useEffect(() => {
    const totalHits = Object.values(hitCounts).reduce((a, b) => a + b, 0);
    if (totalHits === 0) return;
    const perfectPercent = ((hitCounts.Perfect * 100 + hitCounts.Great * 80 + hitCounts.Cool * 60 + hitCounts.Bad * 30) / totalHits);
    setCurrentGrade(getLetterGrade(perfectPercent));
  }, [hitCounts]);

  const handleNextSong = () => {
    if (currentSongIndex + 1 < playlist.length) {
      setCurrentSongIndex(prev => prev + 1);
      setGamePhase('ready');
      setCombo(0);
      setMultiplier(1);
      setRound(0);
      setHitCounts({ Perfect: 0, Great: 0, Cool: 0, Bad: 0, Miss: 0 });
      syncStartHandled.current = false;
    } else {
      setGamePhase('gameover');
    }
  };

  const handleHit = (rating: HitRating, points: number) => {
    setHitCounts(prev => ({ ...prev, [rating]: prev[rating] + 1 }));
    setLastRating(rating);
    clearTimeout(lastRatingTimer.current);
    lastRatingTimer.current = setTimeout(() => setLastRating(null), 1200);

    setCombo(prev => {
      const newCombo = prev + 1;
      const newMultiplier = Math.floor(newCombo / 10) + 1;
      setMultiplier(newMultiplier);
      setMaxCombo(mc => Math.max(mc, newCombo));
      const newIntensity = Math.min(3, 1 + newCombo * 0.1);
      setIntensity(newIntensity);
      setAvatarDance('dancing');
      setScore(s => s + (points * newMultiplier));
      return newCombo;
    });

    setRound(r => r + 1);
  };

  const handleMiss = () => {
    setHitCounts(prev => ({ ...prev, Miss: prev.Miss + 1 }));
    setLastRating('Miss');
    clearTimeout(lastRatingTimer.current);
    lastRatingTimer.current = setTimeout(() => setLastRating(null), 1200);
    setAvatarDance('miss');
    setCombo(0);
    setMultiplier(1);
    setIntensity(1);
  };

  const currentLevelProgress = Math.floor(score / 10);
  const beatsPreview = calculateBeatsEarned(score, maxCombo, multiplier, currentSongIndex + 1);

  // Render the correct game mode
  const renderGameMode = () => {
    const bpm = currentSong?.bpm || 120;

    switch (gameMode) {
      case 'beat_rush':
        return (
          <BeatRushMode
            bpm={bpm}
            onHit={handleHit}
            onMiss={handleMiss}
            isPlaying={gamePhase === 'playing'}
          />
        );
      case 'freestyle':
        return (
          <FreestyleMode
            bpm={bpm}
            onHit={handleHit}
            onMiss={handleMiss}
            isPlaying={gamePhase === 'playing'}
          />
        );
      case 'beat_up':
      default:
        return (
          <BeatUpMode
            bpm={bpm}
            onHit={handleHit}
            onMiss={handleMiss}
            combo={combo}
            round={round}
          />
        );
    }
  };

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
            onError={() => {
              // Skip to next song silently instead of aborting the game
              if (currentSongIndex + 1 < playlist.length) {
                setCurrentSongIndex(prev => prev + 1);
              } else {
                // Last song failed — restart from first song
                setCurrentSongIndex(0);
              }
            }}
            className="w-[150vw] h-[150vh] min-w-[100vw] min-h-[100vh] scale-110 pointer-events-none"
            iframeClassName="w-full h-full object-cover pointer-events-none"
          />
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black to-transparent pointer-events-none" />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 flex items-center justify-center text-gray-600">Keine Playlist gefunden.</div>
      )}

      {/* Header Info */}
      <div className="absolute top-0 left-0 w-full p-6 z-20 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-3 pointer-events-auto">
          <button onClick={onBack} className="flex items-center gap-2 px-5 py-2 bg-gray-900/80 border border-gray-700 text-white rounded-full hover:bg-pink-600 transition-all backdrop-blur-md text-sm uppercase tracking-widest font-bold shadow-lg">
            <ArrowLeft size={16} /> Verlassen
          </button>
          {/* BPM + Mode indicator */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-gray-900/80 border border-gray-700 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 backdrop-blur-md">
              {currentSong?.bpm || '?'} BPM
            </span>
            <span className="px-3 py-1 bg-gradient-to-r from-pink-900/60 to-purple-900/60 border border-pink-500/30 rounded-full text-[10px] font-black uppercase tracking-widest text-pink-300 backdrop-blur-md">
              {gameMode.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="text-right flex flex-col items-end gap-2">
          <div className="bg-gray-900/80 px-8 py-5 rounded-3xl border border-gray-700 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md pointer-events-auto">
            <p className="text-sm text-cyan-400 font-extrabold uppercase tracking-[0.2em] mb-1">SCORE</p>
            <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-white drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">{score.toString().padStart(6, '0')}</h2>
          </div>

          {/* Live Grade */}
          <div className="pointer-events-auto">
            <span className={`text-5xl font-black ${GRADE_COLORS[currentGrade]}`}>
              {currentGrade}
            </span>
          </div>

          <AnimatePresence>
            {combo > 2 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, x: 50 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.8 }}
                className={`py-3 px-6 rounded-2xl flex items-center gap-3 border shadow-2xl pointer-events-auto ${multiplier > 1 ? 'bg-gradient-to-r from-pink-600 to-purple-600 border-pink-400' : 'bg-gray-900/80 border-cyan-500'}`}
              >
                {combo >= 10 && <Flame size={18} className="text-orange-400 animate-pulse" />}
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

      {/* ── BATTLE STAGE: All players visible ── */}
      {(gamePhase === 'playing' || countdown !== null) && currentSong && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-24 pointer-events-none">

          {/* Multi-Player Battle Stage */}
          <div className="mb-4 pointer-events-auto relative w-full flex justify-center items-end px-4" style={{ height: mode === 'audition' && leaderboard.length > 1 ? '50vh' : '45vh' }}>
            {mode === 'audition' && leaderboard.length > 1 ? (
              /* ── Multiplayer: All players side by side ── */
              <div className="flex items-end justify-center gap-2 w-full h-full">
                {leaderboard.map((p, index) => {
                  const isMe = p.userId === userId;
                  const avatarProfile = isMe ? profile : p.profile;
                  const ratingColors: Record<string, string> = {
                    Perfect: 'text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.9)]',
                    Great: 'text-green-300 drop-shadow-[0_0_15px_rgba(134,239,172,0.9)]',
                    Cool: 'text-blue-300 drop-shadow-[0_0_15px_rgba(147,197,253,0.9)]',
                    Bad: 'text-orange-300 drop-shadow-[0_0_15px_rgba(253,186,116,0.9)]',
                    Miss: 'text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.9)]',
                  };
                  const playerRating = isMe ? lastRating : p.lastRating;
                  const playerCombo = isMe ? combo : (p.combo || 0);
                  const playerDance = isMe ? avatarDance : (p.danceState || 'idle');
                  const playerIntensity = isMe ? intensity : (p.intensity || 1);
                  // Size: current user gets more space
                  const avatarWidth = isMe ? 'w-56' : 'w-48';
                  const avatarHeight = isMe ? 'h-full' : 'h-[90%]';

                  return (
                    <div key={p.userId} className={`flex flex-col items-center relative ${avatarWidth}`}>
                      {/* Floating Hit Rating */}
                      <AnimatePresence>
                        {playerRating && (
                          <motion.div
                            key={`${p.userId}-${playerRating}-${isMe ? lastRating : p.lastRatingTime}`}
                            initial={{ opacity: 0, y: 10, scale: 0.5 }}
                            animate={{ opacity: 1, y: -10, scale: 1 }}
                            exit={{ opacity: 0, y: -40, scale: 0.8 }}
                            transition={{ duration: 0.4 }}
                            className={`absolute -top-2 z-30 text-2xl font-black uppercase tracking-wider ${ratingColors[playerRating] || 'text-white'}`}
                          >
                            {playerRating}!
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Combo badge */}
                      {playerCombo > 2 && (
                        <div className="absolute top-6 z-20">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            playerCombo >= 20 ? 'bg-pink-500/80 text-white' : playerCombo >= 10 ? 'bg-orange-500/80 text-white' : 'bg-gray-700/80 text-gray-200'
                          }`}>
                            {playerCombo}x
                          </span>
                        </div>
                      )}

                      {/* 3D Avatar */}
                      <div className={`${avatarHeight} w-full rounded-2xl overflow-hidden relative ${
                        isMe ? 'border-2 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'border border-purple-700/30'
                      }`}>
                        {avatarProfile && (
                          <AnimatedAvatar
                            modelUrl={avatarProfile.rpm_url}
                            jacket={avatarProfile.jacket} tshirt={avatarProfile.tshirt} vest={avatarProfile.vest}
                            pants={avatarProfile.pants} shorts={avatarProfile.shorts} shoes={avatarProfile.shoes}
                            hat={avatarProfile.hat} glasses={avatarProfile.glasses}
                            beard={avatarProfile.beard} mustache={avatarProfile.mustache} wings={avatarProfile.wings}
                            effect={avatarProfile.effect} accessory={avatarProfile.accessory}
                            body={avatarProfile.body} face={avatarProfile.face}
                            danceState={playerDance}
                            intensity={playerIntensity}
                            bpm={currentSong.bpm || 120}
                          />
                        )}

                        {/* Rank badge */}
                        <div className={`absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                          index === 0 ? 'bg-yellow-500 text-black' : index === 1 ? 'bg-gray-400 text-black' : 'bg-orange-700 text-white'
                        }`}>
                          #{index + 1}
                        </div>
                      </div>

                      {/* Name + Score below avatar */}
                      <div className="mt-1 text-center w-full">
                        <p className={`text-xs font-bold truncate ${isMe ? 'text-cyan-300' : 'text-purple-300'}`}>
                          {p.username}{isMe ? ' (Du)' : ''}
                        </p>
                        <p className="text-sm font-mono font-black text-white">{p.score.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── Singleplayer: Just own avatar ── */
              <AnimatedAvatar
                modelUrl={profile.rpm_url}
                jacket={profile.jacket} tshirt={profile.tshirt} vest={profile.vest}
                pants={profile.pants} shorts={profile.shorts} shoes={profile.shoes}
                hat={profile.hat} glasses={profile.glasses}
                beard={profile.beard} mustache={profile.mustache} wings={profile.wings}
                effect={profile.effect} accessory={profile.accessory}
                body={profile.body} face={profile.face}
                danceState={avatarDance}
                intensity={intensity}
                bpm={currentSong.bpm || 120}
              />
            )}
          </div>

          {/* Game Mode UI — only render when actually playing (not during countdown) */}
          {gamePhase === 'playing' && (
            <div className="pointer-events-auto w-full flex justify-center px-6">
              {renderGameMode()}
            </div>
          )}
        </div>
      )}

      {/* Ready State — only shown in singleplayer; multiplayer auto-starts */}
      {gamePhase === 'ready' && countdown === null && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-purple-950/90 via-black/80 to-black/90 backdrop-blur-xl">
          {/* Decorative rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} className="w-[700px] h-[700px] border border-pink-500/10 rounded-full" />
            <motion.div animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: 'linear' }} className="absolute w-[500px] h-[500px] border border-cyan-500/10 rounded-full" />
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 25, repeat: Infinity, ease: 'linear' }} className="absolute w-[900px] h-[900px] border border-purple-500/5 rounded-full" />
          </div>

          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="relative bg-purple-950/80 border border-pink-500/30 p-16 rounded-[48px] shadow-[0_0_80px_rgba(236,72,153,0.15)] flex flex-col items-center text-center max-w-3xl backdrop-blur-2xl">

            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(236,72,153,0.5)]">
              <span className="text-3xl">🎵</span>
            </motion.div>

            <p className="text-pink-400 font-black uppercase tracking-[0.5em] mb-3 text-sm">Macht euch bereit</p>
            <h2 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-white to-cyan-300 mb-4 uppercase leading-tight">
              {currentSong ? currentSong.title : 'Kein Song geladen'}
            </h2>

            <div className="flex items-center gap-4 mb-10">
              <span className="px-4 py-2 bg-purple-900/60 border border-purple-500/30 rounded-full text-xs font-black uppercase tracking-widest text-purple-300">
                {currentSong?.bpm || '?'} BPM
              </span>
              <span className="px-4 py-2 bg-pink-900/40 border border-pink-500/30 rounded-full text-xs font-black uppercase tracking-widest text-pink-300">
                {gameMode.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setCountdown(3); setAvatarDance('dancing'); }}
              className="px-20 py-6 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:from-pink-400 hover:via-purple-400 hover:to-cyan-400 text-white rounded-full font-black text-2xl tracking-[0.3em] uppercase shadow-[0_0_50px_rgba(236,72,153,0.4)] relative overflow-hidden">
              <span className="relative z-10">STARTEN</span>
              <motion.div animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </motion.button>
          </motion.div>
        </motion.div>
      )}

      {/* Countdown Overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
            {/* Pulsing ring */}
            <motion.div
              key={`ring-${countdown}`}
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 0.8 }}
              className={`absolute w-40 h-40 rounded-full border-4 ${countdown === 0 ? 'border-green-400' : countdown === 1 ? 'border-red-400' : countdown === 2 ? 'border-yellow-400' : 'border-cyan-400'}`}
            />
            {/* Second ring */}
            <motion.div
              key={`ring2-${countdown}`}
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className={`absolute w-32 h-32 rounded-full border-2 ${countdown === 0 ? 'border-green-300' : 'border-white/30'}`}
            />
            {/* Number */}
            <motion.div
              key={countdown}
              initial={{ scale: 3, opacity: 0, rotateZ: -20 }}
              animate={{ scale: 1, opacity: 1, rotateZ: 0 }}
              exit={{ scale: 0.3, opacity: 0, rotateZ: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {countdown > 0 ? (
                <span className={`text-[220px] font-black leading-none ${
                  countdown === 3 ? 'text-cyan-400 drop-shadow-[0_0_60px_rgba(6,182,212,0.8)]'
                  : countdown === 2 ? 'text-yellow-400 drop-shadow-[0_0_60px_rgba(250,204,21,0.8)]'
                  : 'text-red-400 drop-shadow-[0_0_60px_rgba(248,113,113,0.8)]'
                }`}>{countdown}</span>
              ) : (
                <div className="flex flex-col items-center">
                  <motion.span
                    initial={{ letterSpacing: '0.5em' }}
                    animate={{ letterSpacing: '0.2em' }}
                    className="text-[160px] font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-300 to-cyan-400 leading-none drop-shadow-[0_0_80px_rgba(52,211,153,0.8)]"
                  >GO!</motion.span>
                  <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.3 }}
                    className="h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent mt-4" />
                </div>
              )}
            </motion.div>
            {/* Background flash */}
            <motion.div
              key={`flash-${countdown}`}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className={`absolute inset-0 ${countdown === 0 ? 'bg-green-500/20' : 'bg-white/5'}`}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Song Ended Screen */}
      {gamePhase === 'song_ended' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-purple-950/95 via-black/90 to-black/95 backdrop-blur-xl">

          {/* Confetti-like sparkles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div key={i}
                initial={{ y: -20, x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), opacity: 1, rotate: 0 }}
                animate={{ y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 20, opacity: 0, rotate: 360 * (Math.random() > 0.5 ? 1 : -1) }}
                transition={{ duration: 2 + Math.random() * 3, delay: Math.random() * 1.5, repeat: Infinity }}
                className={`absolute w-2 h-2 rounded-full ${['bg-pink-400', 'bg-cyan-400', 'bg-yellow-400', 'bg-purple-400', 'bg-green-400'][i % 5]}`}
              />
            ))}
          </div>

          <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', damping: 20 }}
            className="relative bg-purple-950/80 border border-purple-500/30 p-12 rounded-[48px] text-center max-w-2xl w-full mx-4 shadow-[0_0_80px_rgba(168,85,247,0.2)] backdrop-blur-2xl overflow-hidden">

            {/* Glow background */}
            <div className="absolute inset-0 pointer-events-none">
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full blur-[120px] opacity-20 ${
                currentGrade === 'S' ? 'bg-yellow-400' : currentGrade === 'A' ? 'bg-green-400' : currentGrade === 'B' ? 'bg-blue-400' : 'bg-gray-400'
              }`} />
            </div>

            <div className="relative z-10">
              <motion.p initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                className="text-pink-400 font-black uppercase tracking-[0.5em] mb-2 text-sm">Song Erledigt</motion.p>

              {/* Animated Grade Reveal */}
              <motion.div initial={{ scale: 0, rotateZ: -30 }} animate={{ scale: 1, rotateZ: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.4 }}
                className={`text-[130px] font-black leading-none mb-2 ${GRADE_COLORS[currentGrade]} drop-shadow-[0_0_40px_currentColor]`}>
                {currentGrade}
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                className="text-5xl font-mono font-black text-white mb-6">{score.toString().padStart(6, '0')}</motion.div>

              {/* Hit breakdown — styled bars */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
                className="grid grid-cols-5 gap-3 mb-8 px-4">
                {([
                  { label: 'Perfect', count: hitCounts.Perfect, color: 'from-yellow-500 to-amber-500', text: 'text-yellow-300' },
                  { label: 'Great', count: hitCounts.Great, color: 'from-green-500 to-emerald-500', text: 'text-green-300' },
                  { label: 'Cool', count: hitCounts.Cool, color: 'from-blue-500 to-cyan-500', text: 'text-blue-300' },
                  { label: 'Bad', count: hitCounts.Bad, color: 'from-orange-500 to-amber-600', text: 'text-orange-300' },
                  { label: 'Miss', count: hitCounts.Miss, color: 'from-red-500 to-pink-600', text: 'text-red-300' },
                ] as const).map(h => (
                  <div key={h.label} className="flex flex-col items-center">
                    <span className={`text-2xl font-black ${h.text}`}>{h.count}</span>
                    <div className={`w-full h-1.5 rounded-full bg-gradient-to-r ${h.color} mt-1`} />
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">{h.label}</span>
                  </div>
                ))}
              </motion.div>

              {/* Rewards */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
                className="flex items-center justify-center gap-6 mb-8">
                <div className="flex items-center gap-2 px-5 py-3 bg-cyan-900/30 border border-cyan-500/30 rounded-2xl">
                  <Trophy size={18} className="text-cyan-400" />
                  <span className="text-cyan-300 font-black text-lg">+{currentLevelProgress} EXP</span>
                </div>
                <div className="flex items-center gap-2 px-5 py-3 bg-yellow-900/30 border border-yellow-500/30 rounded-2xl">
                  <Coins size={18} className="text-yellow-400" />
                  <span className="text-yellow-300 font-black text-lg">+{beatsPreview} Beats</span>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 }}
                className="flex gap-4 justify-center">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleNextSong}
                  className="flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-2xl text-white font-black uppercase tracking-widest shadow-[0_0_30px_rgba(236,72,153,0.3)]">
                  <SkipForward size={22} /> Naechster Track
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onGameEnd(currentLevelProgress, score, maxCombo, multiplier, currentSongIndex + 1)}
                  className="flex items-center justify-center gap-3 px-8 py-5 bg-purple-900/50 hover:bg-red-900/50 rounded-2xl text-gray-300 hover:text-white font-black uppercase tracking-widest border border-purple-700/50 hover:border-red-500/50 transition-colors">
                  <XCircle size={22} /> Verlassen
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Game Over */}
      {gamePhase === 'gameover' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-purple-950/95 via-black/95 to-black backdrop-blur-xl overflow-hidden">

          {/* Animated background rays */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              className="w-[1200px] h-[1200px] opacity-10">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="absolute top-1/2 left-1/2 w-[600px] h-1 bg-gradient-to-r from-pink-500 to-transparent origin-left"
                  style={{ transform: `rotate(${i * 30}deg)` }} />
              ))}
            </motion.div>
          </div>

          {/* Confetti */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(30)].map((_, i) => (
              <motion.div key={i}
                initial={{ y: -20, x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), opacity: 1, scale: Math.random() * 0.5 + 0.5 }}
                animate={{ y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 20, opacity: 0, rotate: 720 * (Math.random() > 0.5 ? 1 : -1) }}
                transition={{ duration: 3 + Math.random() * 4, delay: Math.random() * 2, repeat: Infinity }}
                className={`absolute w-3 h-3 ${i % 3 === 0 ? 'rounded-full' : i % 3 === 1 ? 'rounded-none rotate-45' : 'rounded-sm'} ${
                  ['bg-pink-400', 'bg-cyan-400', 'bg-yellow-400', 'bg-purple-400', 'bg-green-400', 'bg-amber-400'][i % 6]
                }`}
              />
            ))}
          </div>

          <motion.div initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', damping: 18 }}
            className="relative bg-purple-950/80 border border-pink-500/20 p-14 rounded-[48px] text-center max-w-3xl w-full mx-4 shadow-[0_0_100px_rgba(236,72,153,0.15)] backdrop-blur-2xl">

            <div className="relative z-10">
              <motion.p initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="text-pink-400 font-black uppercase tracking-[0.5em] mb-2 text-sm">Playlist Beendet</motion.p>

              <motion.h2 initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring' }}
                className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400 mb-4 uppercase tracking-widest">
                Ergebnis
              </motion.h2>

              {/* Grade with glow animation */}
              <motion.div initial={{ scale: 0, rotateZ: -45 }} animate={{ scale: 1, rotateZ: 0 }}
                transition={{ type: 'spring', stiffness: 150, damping: 12, delay: 0.5 }}>
                <motion.div animate={{ textShadow: ['0 0 40px currentColor', '0 0 80px currentColor', '0 0 40px currentColor'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`text-[160px] font-black leading-none mb-2 ${GRADE_COLORS[currentGrade]}`}>
                  {currentGrade}
                </motion.div>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
                <p className="text-gray-500 text-sm font-black uppercase tracking-[0.4em] mb-1">Total Score</p>
                <div className="text-[72px] leading-none font-mono font-black text-white mb-6">{score.toLocaleString()}</div>
              </motion.div>

              {/* Stats Row */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
                className="flex items-center justify-center gap-6 mb-6">
                <div className="text-center px-4">
                  <p className="text-3xl font-black text-cyan-400">{maxCombo}</p>
                  <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Max Combo</p>
                </div>
                <div className="w-px h-10 bg-gray-700" />
                <div className="text-center px-4">
                  <p className="text-3xl font-black text-yellow-400">{hitCounts.Perfect}</p>
                  <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Perfects</p>
                </div>
                <div className="w-px h-10 bg-gray-700" />
                <div className="text-center px-4">
                  <p className="text-3xl font-black text-green-400">{hitCounts.Great}</p>
                  <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Greats</p>
                </div>
                <div className="w-px h-10 bg-gray-700" />
                <div className="text-center px-4">
                  <p className="text-3xl font-black text-red-400">{hitCounts.Miss}</p>
                  <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Misses</p>
                </div>
              </motion.div>

              {/* Rewards */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
                className="flex items-center justify-center gap-6 mb-10">
                <div className="flex items-center gap-2 px-6 py-4 bg-cyan-900/30 border border-cyan-500/30 rounded-2xl">
                  <Trophy size={22} className="text-cyan-400" />
                  <span className="text-cyan-300 font-black text-2xl">+{currentLevelProgress} EXP</span>
                </div>
                <div className="flex items-center gap-2 px-6 py-4 bg-yellow-900/30 border border-yellow-500/30 rounded-2xl">
                  <Coins size={22} className="text-yellow-400" />
                  <span className="text-yellow-300 font-black text-2xl">+{beatsPreview} Beats</span>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }}>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => onGameEnd(currentLevelProgress, score, maxCombo, multiplier, currentSongIndex + 1)}
                  className="px-14 py-6 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:from-pink-400 hover:via-purple-400 hover:to-cyan-400 rounded-2xl text-white font-black text-xl uppercase tracking-[0.2em] shadow-[0_0_50px_rgba(236,72,153,0.3)] relative overflow-hidden">
                  <span className="relative z-10">Menu & EXP Speichern</span>
                  <motion.div animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
