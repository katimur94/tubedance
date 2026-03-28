import { useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, User, RotateCcw, ArrowLeft } from 'lucide-react';
import { SoundEngine, BeatScheduler, AudioAnalyzer } from '../utils/audio';

interface GameProps {
  youtubeUrl: string;
  mode: string;
  difficulty: string;
  rhythmMode: 'audio' | 'bpm';
  bpm: number;
  onBack: () => void;
  onRestart: () => void;
}

interface Arrow {
  id: number; col: number; y: number; speed: number;
  hitAttempted?: boolean;
  isHold: boolean; holdLength: number; // px
  holdActive: boolean; holdFailed: boolean;
}
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }
interface PlayerState { id: number; isAI: boolean; score: number; combo: number; arrows: Arrow[]; activeKeys: boolean[]; aiReleaseTimers: number[]; }
interface Feedback { text: string; color: string; id: number; }
interface HitStats { perfect: number; great: number; good: number; miss: number; maxCombo: number; holds: number; }

function extractVideoId(url: string) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}

const COLORS = ['#ec4899', '#06b6d4', '#10b981', '#f43f5e'];
const DIRS = [Math.PI, Math.PI / 2, -Math.PI / 2, 0];

interface DC { speed: number; hitRange: number; spawnChance: number; doubleChance: number; subBeats: number; minInt: number; holdChance: number; maxPS: number; holdMin: number; holdMax: number; }
const DIFFS: Record<string, DC> = {
  easy:    { speed: 200, hitRange: 120, spawnChance: 0.7,  doubleChance: 0,    subBeats: 1, minInt: 600, holdChance: 0.05, maxPS: 2,  holdMin: 0.5, holdMax: 1.0 },
  normal:  { speed: 320, hitRange: 100, spawnChance: 0.85, doubleChance: 0.15, subBeats: 1, minInt: 400, holdChance: 0.12, maxPS: 4,  holdMin: 0.5, holdMax: 1.5 },
  hard:    { speed: 450, hitRange: 80,  spawnChance: 0.95, doubleChance: 0.3,  subBeats: 2, minInt: 250, holdChance: 0.2,  maxPS: 6,  holdMin: 0.5, holdMax: 2.0 },
  extreme: { speed: 580, hitRange: 60,  spawnChance: 1.0,  doubleChance: 0.45, subBeats: 2, minInt: 150, holdChance: 0.3,  maxPS: 10, holdMin: 0.5, holdMax: 2.5 },
};

function getRank(a: number) {
  if (a >= 95) return { letter: 'S', color: '#fbbf24', glow: 'rgba(251,191,36,0.6)' };
  if (a >= 85) return { letter: 'A', color: '#34d399', glow: 'rgba(52,211,153,0.6)' };
  if (a >= 70) return { letter: 'B', color: '#60a5fa', glow: 'rgba(96,165,250,0.6)' };
  if (a >= 50) return { letter: 'C', color: '#a78bfa', glow: 'rgba(167,139,250,0.6)' };
  if (a >= 30) return { letter: 'D', color: '#fb923c', glow: 'rgba(251,146,60,0.6)' };
  return { letter: 'F', color: '#f87171', glow: 'rgba(248,113,113,0.6)' };
}

const COMBO_MS = [10, 25, 50, 100];

export default function Game({ youtubeUrl, mode, difficulty, rhythmMode, bpm, onBack, onRestart }: GameProps) {
  const videoId = extractVideoId(youtubeUrl);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<any>(null);
  const soundRef = useRef(new SoundEngine());
  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  const diff = DIFFS[difficulty] || DIFFS.normal;
  const numPlayers = mode === 'solo' ? 1 : 2;

  const [gamePhase, setGamePhase] = useState<'ready' | 'countdown' | 'playing' | 'paused' | 'gameover'>('ready');
  const [countdown, setCountdown] = useState(3);
  const [scores, setScores] = useState<number[]>(Array(numPlayers).fill(0));
  const [combos, setCombos] = useState<number[]>(Array(numPlayers).fill(0));
  const [feedbacks, setFeedbacks] = useState<(Feedback | null)[]>(Array(numPlayers).fill(null));
  const [comboFlash, setComboFlash] = useState<string | null>(null);
  const [finalStats, setFinalStats] = useState<{ scores: number[]; stats: HitStats[]; health: number } | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [audioMode, setAudioMode] = useState(rhythmMode === 'audio');
  const [audioNote, setAudioNote] = useState('');

  const phaseRef = useRef(gamePhase);
  phaseRef.current = gamePhase;

  const gs = useRef({
    players: Array.from({ length: numPlayers }).map((_, i) => ({
      id: i, isAI: mode === 'pve' && i === 1, score: 0, combo: 0,
      arrows: [] as Arrow[], activeKeys: [false, false, false, false], aiReleaseTimers: [0, 0, 0, 0],
    })) as PlayerState[],
    particles: [] as Particle[],
    sharedHealth: 100,
    stats: Array.from({ length: numPlayers }).map(() => ({ perfect: 0, great: 0, good: 0, miss: 0, maxCombo: 0, holds: 0 })) as HitStats[],
    lastMs: Array(numPlayers).fill(0),
  });

  useEffect(() => {
    const t = feedbacks.map((fb, i) => fb ? setTimeout(() => setFeedbacks(p => { const n = [...p]; n[i] = null; return n; }), 400) : null);
    return () => t.forEach(x => x && clearTimeout(x));
  }, [feedbacks]);

  useEffect(() => { if (comboFlash) { const t = setTimeout(() => setComboFlash(null), 1200); return () => clearTimeout(t); } }, [comboFlash]);

  // Countdown
  useEffect(() => {
    if (gamePhase !== 'countdown') return;
    soundRef.current.playTick();
    const iv = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(iv);
          soundRef.current.playGo();
          setGamePhase('playing');
          if (playerRef.current) { playerRef.current.unMute(); playerRef.current.setVolume(100); playerRef.current.playVideo(); }
          return 0;
        }
        soundRef.current.playTick();
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [gamePhase]);

  // Cleanup analyzer on unmount
  useEffect(() => () => { analyzerRef.current?.destroy(); }, []);

  const endGame = () => {
    const st = gs.current;
    if (playerRef.current) try { playerRef.current.pauseVideo(); } catch {}
    analyzerRef.current?.destroy();
    setFinalStats({ scores: st.players.map(p => Math.floor(p.score)), stats: [...st.stats], health: st.sharedHealth });
    setGamePhase('gameover');
  };

  const handleStart = async () => {
    soundRef.current.init();
    if (rhythmMode === 'audio') {
      setAudioNote('Wähle diesen Tab im Dialog...');
      const analyzer = new AudioAnalyzer();
      const ok = await analyzer.init();
      if (ok) {
        analyzerRef.current = analyzer;
        setAudioMode(true);
        setAudioNote('✅ Audio-Analyse aktiv');
      } else {
        setAudioMode(false);
        setAudioNote('⚠️ Audio-Analyse nicht verfügbar – BPM-Modus (120 BPM)');
      }
    }
    setGamePhase('countdown');
  };

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number, lastTime = 0, arrowId = 0;
    const state = gs.current;
    const beatSched = new BeatScheduler(bpm, diff.subBeats);

    const resize = () => { canvas.width = canvas.parentElement?.clientWidth || window.innerWidth; canvas.height = canvas.parentElement?.clientHeight || window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const spawnP = (x: number, y: number, c: string) => { for (let i = 0; i < 20; i++) state.particles.push({ x, y, vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, life: 1, color: c, size: Math.random() * 6 + 2 }); };

    const makeArrow = (col: number, isHold: boolean, holdDur: number): Arrow => ({
      id: arrowId++, col, y: -60, speed: diff.speed,
      isHold, holdLength: isHold ? holdDur * diff.speed : 0,
      holdActive: false, holdFailed: false,
    });

    const checkHit = (pIdx: number, col: number) => {
      const player = state.players[pIdx];
      const targetY = canvas.height - 120;
      let ci = -1, md = Infinity;
      for (let i = 0; i < player.arrows.length; i++) {
        const a = player.arrows[i];
        if (a.col === col && !a.holdActive && !a.holdFailed) {
          const d = Math.abs(a.y - targetY);
          if (d < diff.hitRange && d < md) { md = d; ci = i; }
        }
      }
      if (ci === -1) return;

      const arrow = player.arrows[ci];
      if (!arrow.isHold) player.arrows.splice(ci, 1);
      else arrow.holdActive = true; // start hold

      let text = '', color = '', pts = 0;
      if (md < 20) { text = 'PERFECT'; color = '#ec4899'; pts = 100; state.stats[pIdx].perfect++; soundRef.current.playHit('perfect'); }
      else if (md < 45) { text = 'GREAT'; color = '#06b6d4'; pts = 50; state.stats[pIdx].great++; soundRef.current.playHit('great'); }
      else if (md < 75) { text = 'GOOD'; color = '#10b981'; pts = 20; state.stats[pIdx].good++; soundRef.current.playHit('good'); }
      else { text = 'MISS'; color = '#ef4444'; pts = 0; state.stats[pIdx].miss++; player.combo = 0; if (mode === 'coop') state.sharedHealth = Math.max(0, state.sharedHealth - 5); soundRef.current.playMiss(); if (arrow.isHold) { arrow.holdActive = false; arrow.holdFailed = true; } }

      if (pts > 0) {
        player.combo++;
        player.score += pts * (1 + Math.floor(player.combo / 10) * 0.1);
        if (mode === 'coop') state.sharedHealth = Math.min(100, state.sharedHealth + 2);
        if (player.combo > state.stats[pIdx].maxCombo) state.stats[pIdx].maxCombo = player.combo;
        const sp = 80, cx = numPlayers === 1 ? canvas.width / 2 : (pIdx === 0 ? canvas.width / 3 : canvas.width * 2 / 3);
        spawnP(cx - sp * 1.5 + col * sp, targetY, color);
        for (const ms of COMBO_MS) {
          if (player.combo === ms && state.lastMs[pIdx] < ms) {
            state.lastMs[pIdx] = ms;
            soundRef.current.playCombo();
            setComboFlash({ 10: 'COMBO x10!', 25: 'ON FIRE! 🔥', 50: 'AMAZING! ⚡', 100: 'LEGENDARY! 👑' }[ms] || `x${ms}!`);
          }
        }
      }
      setScores(p => { const n = [...p]; n[pIdx] = Math.floor(player.score); return n; });
      setCombos(p => { const n = [...p]; n[pIdx] = player.combo; return n; });
      setFeedbacks(p => { const n = [...p]; n[pIdx] = { text, color, id: Date.now() }; return n; });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'Escape') {
        if (phaseRef.current === 'playing') { setGamePhase('paused'); try { playerRef.current?.pauseVideo(); } catch {} }
        else if (phaseRef.current === 'paused') { setGamePhase('playing'); try { playerRef.current?.playVideo(); } catch {} }
        return;
      }
      if (phaseRef.current !== 'playing') return;
      let p1 = -1, p2 = -1;
      switch (e.key) { case 'a': case 'A': p1 = 0; break; case 's': case 'S': p1 = 1; break; case 'w': case 'W': p1 = 2; break; case 'd': case 'D': p1 = 3; break; }
      switch (e.key) { case 'ArrowLeft': p2 = 0; break; case 'ArrowDown': p2 = 1; break; case 'ArrowUp': p2 = 2; break; case 'ArrowRight': p2 = 3; break; }
      if (mode === 'solo') { const c = p1 !== -1 ? p1 : p2; if (c !== -1) { state.players[0].activeKeys[c] = true; checkHit(0, c); } }
      else { if (p1 !== -1) { state.players[0].activeKeys[p1] = true; checkHit(0, p1); } if (p2 !== -1 && !state.players[1].isAI) { state.players[1].activeKeys[p2] = true; checkHit(1, p2); } }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      let p1 = -1, p2 = -1;
      switch (e.key) { case 'a': case 'A': p1 = 0; break; case 's': case 'S': p1 = 1; break; case 'w': case 'W': p1 = 2; break; case 'd': case 'D': p1 = 3; break; }
      switch (e.key) { case 'ArrowLeft': p2 = 0; break; case 'ArrowDown': p2 = 1; break; case 'ArrowUp': p2 = 2; break; case 'ArrowRight': p2 = 3; break; }
      if (mode === 'solo') { const c = p1 !== -1 ? p1 : p2; if (c !== -1) state.players[0].activeKeys[c] = false; }
      else { if (p1 !== -1) state.players[0].activeKeys[p1] = false; if (p2 !== -1 && !state.players[1].isAI) state.players[1].activeKeys[p2] = false; }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const drawArrow = (x: number, y: number, sz: number, dir: number, col: string, isTarget = false, isActive = false) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(DIRS[dir]);
      const w = sz;
      ctx.beginPath(); ctx.moveTo(-w/2, -w/4); ctx.lineTo(0, -w/4); ctx.lineTo(0, -w/2); ctx.lineTo(w/2, 0); ctx.lineTo(0, w/2); ctx.lineTo(0, w/4); ctx.lineTo(-w/2, w/4); ctx.closePath();
      if (isTarget) {
        ctx.strokeStyle = isActive ? '#fff' : 'rgba(255,255,255,0.2)'; ctx.lineWidth = isActive ? 6 : 4; ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = isActive ? 4 : 2;
        if (isActive) { ctx.shadowColor = col; ctx.shadowBlur = 20; }
        ctx.stroke();
      } else { ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 15; ctx.fill(); }
      ctx.restore();
    };

    const drawHoldBar = (x: number, headY: number, holdLen: number, col: string, active: boolean, failed: boolean) => {
      const barW = 22, tailY = headY - holdLen;
      ctx.save();
      if (failed) { ctx.fillStyle = '#444'; ctx.globalAlpha = 0.25; }
      else if (active) { ctx.fillStyle = col; ctx.globalAlpha = 0.7; ctx.shadowColor = col; ctx.shadowBlur = 12; }
      else { ctx.fillStyle = col; ctx.globalAlpha = 0.3; }
      ctx.beginPath(); ctx.roundRect(x - barW / 2, tailY, barW, holdLen, barW / 2); ctx.fill();
      // Pulsing glow for active holds
      if (active) { ctx.globalAlpha = 0.15 + Math.sin(Date.now() / 100) * 0.1; ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x - barW, tailY, barW * 2, holdLen, barW); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.restore();
    };

    const updateAI = (time: number) => {
      const tY = canvas.height - 120;
      state.players.forEach((p, pi) => {
        if (!p.isAI) return;
        for (let i = 0; i < 4; i++) if (p.activeKeys[i] && time > p.aiReleaseTimers[i]) p.activeKeys[i] = false;
        p.arrows.forEach(a => {
          if (a.holdActive && !p.activeKeys[a.col]) { /* AI always holds */ p.activeKeys[a.col] = true; p.aiReleaseTimers[a.col] = time + 200; }
          const d = Math.abs(a.y - tY);
          if (d < 30 && !a.hitAttempted && !a.holdActive) {
            a.hitAttempted = true;
            if (Math.random() < 0.85) { p.activeKeys[a.col] = true; p.aiReleaseTimers[a.col] = time + (a.isHold ? a.holdLength / a.speed * 1000 + 200 : 100); checkHit(pi, a.col); }
          }
        });
      });
    };

    const render = (time: number) => {
      const dt = lastTime === 0 ? 0.016 : Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const tY = canvas.height - 120, aSz = 60, sp = 80, tw = sp * 3;
      const phase = phaseRef.current;

      if (phase === 'playing') {
        updateAI(time);

        // Spawn arrows
        if (analyzerRef.current?.active) {
          // Audio-reactive spawning
          const events = analyzerRef.current.analyze(time, diff.minInt, diff.maxPS);
          for (const ev of events) {
            state.players.forEach(p => p.arrows.push(makeArrow(ev.col, ev.isHold, ev.holdDur || (diff.holdMin + Math.random() * (diff.holdMax - diff.holdMin)))));
          }
        } else {
          // BPM-based spawning
          const beats = beatSched.update(time);
          for (let b = 0; b < beats; b++) {
            if (Math.random() < diff.spawnChance) {
              const col = Math.floor(Math.random() * 4);
              const isHold = Math.random() < diff.holdChance;
              const holdDur = diff.holdMin + Math.random() * (diff.holdMax - diff.holdMin);
              state.players.forEach(p => {
                p.arrows.push(makeArrow(col, isHold, holdDur));
                if (!isHold && Math.random() < diff.doubleChance) p.arrows.push(makeArrow((col + 2) % 4, false, 0));
              });
            }
          }
        }

        if (mode === 'coop' && state.sharedHealth <= 0) endGame();
      }

      // Draw & update per player
      state.players.forEach((player, pIdx) => {
        const cx = numPlayers === 1 ? canvas.width / 2 : (pIdx === 0 ? canvas.width / 3 : canvas.width * 2 / 3);
        const sx = cx - tw / 2;

        // Lane lines
        for (let i = 0; i < 4; i++) { ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx + i * sp, 0); ctx.lineTo(sx + i * sp, canvas.height); ctx.stroke(); }
        // Targets
        for (let i = 0; i < 4; i++) drawArrow(sx + i * sp, tY, aSz, i, COLORS[i], true, player.activeKeys[i]);

        if (phase === 'playing') {
          for (let i = player.arrows.length - 1; i >= 0; i--) {
            const a = player.arrows[i];
            a.y += a.speed * dt;
            const ax = sx + a.col * sp;

            // Hold state management
            if (a.isHold) {
              const tailY = a.y - a.holdLength;
              if (a.holdActive && !player.activeKeys[a.col]) {
                // Released early
                a.holdActive = false; a.holdFailed = true;
                player.combo = 0; state.lastMs[pIdx] = 0;
                soundRef.current.playMiss();
                setCombos(p => { const n = [...p]; n[pIdx] = 0; return n; });
                setFeedbacks(p => { const n = [...p]; n[pIdx] = { text: 'LOSGELASSEN!', color: '#ef4444', id: Date.now() }; return n; });
              }
              if (a.holdActive && tailY >= tY) {
                // Hold completed!
                const mult = 1 + Math.floor(player.combo / 10) * 0.1;
                player.score += 150 * mult; player.combo++; state.stats[pIdx].holds++;
                if (player.combo > state.stats[pIdx].maxCombo) state.stats[pIdx].maxCombo = player.combo;
                spawnP(ax, tY, '#fbbf24');
                soundRef.current.playHit('perfect');
                player.arrows.splice(i, 1);
                setScores(p => { const n = [...p]; n[pIdx] = Math.floor(player.score); return n; });
                setCombos(p => { const n = [...p]; n[pIdx] = player.combo; return n; });
                setFeedbacks(p => { const n = [...p]; n[pIdx] = { text: 'HOLD! ✨', color: '#fbbf24', id: Date.now() }; return n; });
                continue;
              }
              if (!a.holdActive && !a.holdFailed && a.y > tY + diff.hitRange) {
                // Head missed
                player.arrows.splice(i, 1); player.combo = 0; state.stats[pIdx].miss++; state.lastMs[pIdx] = 0;
                if (mode === 'coop') state.sharedHealth = Math.max(0, state.sharedHealth - 5);
                soundRef.current.playMiss();
                setCombos(p => { const n = [...p]; n[pIdx] = 0; return n; });
                setFeedbacks(p => { const n = [...p]; n[pIdx] = { text: 'MISS', color: '#ef4444', id: Date.now() }; return n; });
                continue;
              }
              if (a.holdFailed && (a.y - a.holdLength) > tY + 75) { player.arrows.splice(i, 1); continue; }

              // Draw hold
              drawHoldBar(ax, a.y, a.holdLength, COLORS[a.col], a.holdActive, a.holdFailed);
              drawArrow(ax, a.y, aSz, a.col, a.holdFailed ? '#666' : COLORS[a.col]);
            } else {
              // Normal arrow
              if (a.y > tY + 75) {
                player.arrows.splice(i, 1); player.combo = 0; state.stats[pIdx].miss++; state.lastMs[pIdx] = 0;
                if (mode === 'coop') state.sharedHealth = Math.max(0, state.sharedHealth - 5);
                soundRef.current.playMiss();
                setCombos(p => { const n = [...p]; n[pIdx] = 0; return n; });
                setFeedbacks(p => { const n = [...p]; n[pIdx] = { text: 'MISS', color: '#ef4444', id: Date.now() }; return n; });
                continue;
              }
              drawArrow(ax, a.y, aSz, a.col, COLORS[a.col]);
            }
          }
        }
      });

      // Particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx * dt * 60; p.y += p.vy * dt * 60; p.life -= dt * 1.2;
        if (p.life <= 0) { state.particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      }

      // Combo glow
      state.players.forEach((player, pIdx) => {
        if (player.combo >= 10) {
          const cx = numPlayers === 1 ? canvas.width / 2 : (pIdx === 0 ? canvas.width / 3 : canvas.width * 2 / 3);
          const g = ctx.createRadialGradient(cx, tY, 0, cx, tY, 300);
          g.addColorStop(0, `rgba(236,72,153,${Math.min(0.15, player.combo * 0.002)})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g; ctx.fillRect(cx - 300, tY - 300, 600, 600);
        }
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => { window.removeEventListener('resize', resize); window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); cancelAnimationFrame(animId); };
  }, [mode, numPlayers, bpm, difficulty, audioMode]);

  const results = (pIdx: number) => {
    if (!finalStats) return { accuracy: 0, rank: getRank(0), total: 0 };
    const s = finalStats.stats[pIdx];
    const total = s.perfect + s.great + s.good + s.miss;
    const accuracy = total > 0 ? Math.round(((s.perfect + s.great + s.good) / total) * 100) : 0;
    return { accuracy, rank: getRank(accuracy), total };
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col">
      {/* YouTube */}
      {videoId ? (
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none flex items-center justify-center overflow-hidden">
          <YouTube videoId={videoId} opts={{ width: '100%', height: '100%', playerVars: { autoplay: 0, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, showinfo: 0, mute: 0 } }}
            onReady={(e) => { playerRef.current = e.target; }}
            onEnd={() => { if (phaseRef.current === 'playing') endGame(); }}
            onError={() => setVideoError(true)}
            className="w-[150vw] h-[150vh] min-w-[100vw] min-h-[100vh]" iframeClassName="w-full h-full object-cover pointer-events-none" />
        </div>
      ) : <div className="absolute inset-0 z-0 flex items-center justify-center text-gray-600 text-2xl font-bold">Ungültige YouTube-URL</div>}

      {/* Ready */}
      {gamePhase === 'ready' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm gap-6">
          {videoError && <div className="text-red-400 font-bold text-lg bg-red-900/50 px-6 py-3 rounded-xl border border-red-500/50">Video nicht ladbar – Spiel startet trotzdem!</div>}
          <div className="text-gray-400 text-lg mb-2 text-center">
            {mode === 'solo' ? 'WASD oder Pfeiltasten' : 'P1: WASD • P2: Pfeiltasten'}
            <span className="block text-sm mt-1 text-gray-500">ESC = Pause • Halte-Pfeile: Taste gedrückt halten!</span>
          </div>
          {audioNote && <div className="text-sm text-cyan-400 bg-cyan-900/30 px-4 py-2 rounded-lg">{audioNote}</div>}
          <motion.button initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={handleStart}
            className="px-10 py-5 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-full font-black text-3xl tracking-widest uppercase shadow-[0_0_40px_rgba(236,72,153,0.6)] border-2 border-pink-400">
            Bereit?
          </motion.button>
        </div>
      )}

      {/* Countdown */}
      <AnimatePresence>
        {gamePhase === 'countdown' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
            {audioNote && <div className="absolute top-20 text-sm text-cyan-400 bg-cyan-900/30 px-4 py-2 rounded-lg">{audioNote}</div>}
            <motion.div key={countdown} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.4 }}
              className="text-9xl font-black text-white" style={{ textShadow: '0 0 40px rgba(236,72,153,0.8), 0 0 80px rgba(6,182,212,0.5)' }}>
              {countdown > 0 ? countdown : 'GO!'}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pause */}
      {gamePhase === 'paused' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md gap-6">
          <h2 className="text-7xl font-black text-white tracking-tighter" style={{ textShadow: '0 0 30px rgba(255,255,255,0.3)' }}>PAUSE</h2>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setGamePhase('playing'); try { playerRef.current?.playVideo(); } catch {} }}
            className="px-8 py-3 bg-white text-black rounded-full font-bold text-xl uppercase tracking-widest">Weiterspielen</motion.button>
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors uppercase tracking-widest text-sm">Zurück zum Menü</button>
        </div>
      )}

      {/* Game Over */}
      {gamePhase === 'gameover' && finalStats && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6 overflow-y-auto">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}
            className="bg-gray-900/90 rounded-3xl p-8 md:p-12 border border-gray-800 max-w-2xl w-full">
            <h2 className="text-4xl md:text-5xl font-black text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-500">ERGEBNIS</h2>
            <div className={`flex ${numPlayers > 1 ? 'gap-8' : 'justify-center'} mb-8`}>
              {Array.from({ length: numPlayers }).map((_, pi) => {
                const r = results(pi); const s = finalStats.stats[pi];
                return (
                  <div key={pi} className="flex-1 text-center">
                    {numPlayers > 1 && <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">{pi === 0 ? 'Spieler 1' : (mode === 'pve' ? 'KI' : 'Spieler 2')}</p>}
                    <div className="text-8xl font-black mb-2" style={{ color: r.rank.color, textShadow: `0 0 30px ${r.rank.glow}` }}>{r.rank.letter}</div>
                    <div className="text-3xl font-black text-white mb-4">{finalStats.scores[pi].toString().padStart(6, '0')}</div>
                    <div className="space-y-2 text-left max-w-[200px] mx-auto">
                      <div className="flex justify-between"><span className="text-pink-400">Perfect</span><span className="text-white font-bold">{s.perfect}</span></div>
                      <div className="flex justify-between"><span className="text-cyan-400">Great</span><span className="text-white font-bold">{s.great}</span></div>
                      <div className="flex justify-between"><span className="text-green-400">Good</span><span className="text-white font-bold">{s.good}</span></div>
                      <div className="flex justify-between"><span className="text-red-400">Miss</span><span className="text-white font-bold">{s.miss}</span></div>
                      {s.holds > 0 && <div className="flex justify-between"><span className="text-yellow-400">Holds ✨</span><span className="text-white font-bold">{s.holds}</span></div>}
                      <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between"><span className="text-gray-400">Max Combo</span><span className="text-yellow-400 font-bold">{s.maxCombo}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Genauigkeit</span><span className="text-white font-bold">{r.accuracy}%</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
            {mode === 'pvp' && finalStats.scores[0] !== finalStats.scores[1] && (
              <div className="text-center text-2xl font-black mb-6" style={{ color: finalStats.scores[0] > finalStats.scores[1] ? '#ec4899' : '#06b6d4' }}>
                {finalStats.scores[0] > finalStats.scores[1] ? '🏆 Spieler 1 gewinnt!' : '🏆 Spieler 2 gewinnt!'}
              </div>
            )}
            {mode === 'coop' && <div className="text-center text-xl font-bold mb-6" style={{ color: finalStats.health > 0 ? '#a78bfa' : '#f87171' }}>{finalStats.health > 0 ? '💜 Zusammen geschafft!' : '💔 Game Over'}</div>}
            <div className="flex gap-4 justify-center">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onRestart} className="px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-full font-bold text-lg uppercase tracking-widest flex items-center gap-2"><RotateCcw className="w-5 h-5" /> Nochmal</motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onBack} className="px-8 py-3 bg-gray-800 text-white rounded-full font-bold text-lg uppercase tracking-widest flex items-center gap-2 border border-gray-700"><ArrowLeft className="w-5 h-5" /> Menü</motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dancing Characters */}
      <div className="absolute bottom-20 left-0 w-full flex justify-center gap-32 z-0 opacity-40 pointer-events-none">
        <motion.div animate={{ y: [0, -30, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 0.5, ease: 'easeInOut' }} className="text-pink-500 drop-shadow-[0_0_30px_rgba(236,72,153,0.8)]"><User size={160} strokeWidth={1.5} /></motion.div>
        {mode === 'pve' && <motion.div animate={{ y: [0, -30, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 0.5, ease: 'easeInOut', delay: 0.25 }} className="text-cyan-500 drop-shadow-[0_0_30px_rgba(6,182,212,0.8)]"><Bot size={160} strokeWidth={1.5} /></motion.div>}
        {(mode === 'pvp' || mode === 'coop') && <motion.div animate={{ y: [0, -30, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 0.5, ease: 'easeInOut', delay: 0.25 }} className="text-green-500 drop-shadow-[0_0_30px_rgba(16,185,129,0.8)]"><User size={160} strokeWidth={1.5} /></motion.div>}
      </div>

      {/* Scores */}
      <div className="absolute top-0 left-0 w-full p-4 z-20 flex justify-between items-start">
        <button onClick={() => { if (gamePhase === 'playing') { setGamePhase('paused'); try { playerRef.current?.pauseVideo(); } catch {} } else onBack(); }}
          className="px-5 py-2 bg-gray-900/80 border border-gray-700 text-white rounded-full hover:bg-pink-600 hover:border-pink-500 transition-all backdrop-blur-md text-sm">
          {gamePhase === 'playing' ? '⏸ Pause' : 'Zurück'}
        </button>
        <div className="flex gap-6">
          {scores.map((score, i) => (
            <div key={i} className="text-right bg-gray-900/50 p-3 rounded-2xl border border-gray-800 backdrop-blur-md min-w-[150px]">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">
                {numPlayers === 1 ? 'Score' : (i === 0 ? 'P1 (WASD)' : (mode === 'pve' ? 'AI Bot' : 'P2 (Arrows)'))}
              </p>
              <h2 className="text-2xl font-black text-white">{score.toString().padStart(6, '0')}</h2>
              <p className={`font-mono font-bold text-sm tracking-widest ${combos[i] > 10 ? (i === 0 ? 'text-pink-400' : 'text-cyan-400') : 'text-gray-400'}`}>
                COMBO x{combos[i]}
                {combos[i] >= 10 && <span className="text-yellow-400 ml-2">×{(1 + Math.floor(combos[i] / 10) * 0.1).toFixed(1)}</span>}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Co-op Health */}
      {mode === 'coop' && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-80 h-5 bg-gray-900/80 rounded-full border border-gray-700 overflow-hidden backdrop-blur-md z-20">
          <motion.div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" animate={{ width: `${Math.max(0, gs.current.sharedHealth)}%` }} transition={{ type: 'spring', bounce: 0 }} />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white uppercase tracking-widest drop-shadow-md">Love Meter</span>
        </div>
      )}

      {/* Combo Flash */}
      <AnimatePresence>
        {comboFlash && (
          <motion.div key={comboFlash} initial={{ scale: 0.5, opacity: 0, y: 30 }} animate={{ scale: 1.5, opacity: 1, y: 0 }} exit={{ scale: 2, opacity: 0 }} transition={{ duration: 0.6 }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 text-5xl md:text-7xl font-black text-yellow-400 pointer-events-none whitespace-nowrap"
            style={{ textShadow: '0 0 30px rgba(251,191,36,0.8), 0 0 60px rgba(251,191,36,0.4)' }}>{comboFlash}</motion.div>
        )}
      </AnimatePresence>

      {/* Hit Feedback */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        {feedbacks.map((fb, idx) => {
          if (!fb) return null;
          const left = numPlayers === 1 ? '50%' : (idx === 0 ? '33.33%' : '66.66%');
          return (
            <AnimatePresence key={`${idx}-${fb.id}`}>
              <motion.div initial={{ opacity: 0, scale: 0.5, y: 20 }} animate={{ opacity: 1, scale: 1.2, y: 0 }} exit={{ opacity: 0, scale: 1.5, filter: 'blur(10px)' }} transition={{ duration: 0.3 }}
                className="absolute top-1/2 text-5xl md:text-7xl font-black italic tracking-tighter uppercase"
                style={{ color: fb.color, textShadow: `0 0 20px ${fb.color}, 0 0 40px ${fb.color}`, left, transform: 'translateX(-50%)' }}>{fb.text}</motion.div>
            </AnimatePresence>
          );
        })}
      </div>

      {/* Canvas */}
      <div className="relative z-10 flex-1 w-full h-full"><canvas ref={canvasRef} className="w-full h-full block" /></div>
    </div>
  );
}
