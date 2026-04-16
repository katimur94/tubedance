import { useState, useEffect, useRef, Component, type ReactNode, type ErrorInfo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Users, ArrowLeft, Shirt, LogOut, ShoppingBag, Coins, UserCircle, Heart, Trophy, Gift, ShieldAlert, Music, Zap } from 'lucide-react';
import Game from './components/Game';
import { PlaylistManager } from './components/PlaylistManager';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { RoomBrowser } from './components/RoomBrowser';
import { LockerRoom, PlayerProfile, DEFAULT_BODY, DEFAULT_FACE } from './components/LockerRoom';
import { Auth } from './components/Auth';
import { AnimatedAvatar } from './components/AnimatedAvatar';
import { FashionShop } from './components/FashionShop';
import { WalletView } from './components/WalletView';
import { ModeSelect } from './components/ModeSelect';
import { FriendsList } from './components/FriendsList';
import { PlayerProfileView } from './components/PlayerProfile';
import { Leaderboard } from './components/Leaderboard';
import { DailyRewards } from './components/DailyRewards';
import { AdminPanel } from './components/AdminPanel';
import { supabase } from './lib/supabase';
import { getLocalWallet, earnBeats, calculateBeatsEarned, loadWalletFromSupabase, syncWalletToSupabase, syncWalletFromServer, setEconomyUserId, markWalletLoaded, setEconomyUserRole } from './lib/economy';
import { type GameMode } from './types/gameTypes';
import { type UserRole, isAdmin } from './lib/roles';
import { RoleBadge } from './components/RoleBadge';

const getDeviceId = () => {
  let id = localStorage.getItem('tubedance_device_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('tubedance_device_id', id); }
  return id;
}

const DEFAULT_PROFILE: PlayerProfile = {
  level: 1, exp: 0,
  jacket: 'leather_black', tshirt: 'none', vest: 'none',
  pants: 'denim_blue', shorts: 'none', shoes: 'shoes_sneakers',
  hat: 'none', glasses: 'none', beard: 'none', mustache: 'none', wings: 'none',
  effect: 'none', accessory: 'none', body: DEFAULT_BODY, face: DEFAULT_FACE,
};

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#1a0a2e] text-white flex flex-col items-center justify-center p-6">
          <h1 className="text-3xl font-black mb-4 text-red-400">Etwas ist schiefgelaufen</h1>
          <p className="text-gray-400 mb-6 max-w-md text-center">{this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-pink-600 hover:bg-pink-500 rounded-full font-black uppercase tracking-widest text-sm transition-colors"
          >
            Neu laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [guestMode, setGuestMode] = useState(false);
  
  const [view, setView] = useState<'menu' | 'mode_select' | 'playlist_single' | 'lobby' | 'locker' | 'shop' | 'wallet' | 'friends' | 'profile' | 'leaderboard' | 'admin' | 'game'>('menu');
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [showDailyReward, setShowDailyReward] = useState(false);
  const dailyCheckedRef = useRef(false);
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [roomCode, setRoomCode] = useState<string>('');
  const [mode, setMode] = useState<'audition' | 'solo'>('audition');
  const [gameMode, setGameMode] = useState<GameMode>('beat_up');
  const [walletBeats, setWalletBeats] = useState(getLocalWallet().beats);

  const [profile, setProfile] = useState<PlayerProfile>(() => {
    const saved = localStorage.getItem('tubedance_profile');
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });

  const [username, setUsername] = useState(() => {
    const saved = localStorage.getItem('tubedance_username');
    if (saved) return saved;
    const generated = 'Dancer_' + Math.floor(Math.random() * 9999);
    localStorage.setItem('tubedance_username', generated);
    return generated;
  });

  const authInitializing = useRef(false);

  useEffect(() => {
    const loadAuthData = async (session: any) => {
      if (authInitializing.current) return;
      authInitializing.current = true;
      try {
        setSession(session);
        if (session?.user) {
          setEconomyUserId(session.user.id);
          await loadWalletFromSupabase(session.user.id);
          markWalletLoaded();
          setWalletBeats(getLocalWallet().beats);
          await fetchOnlineProfile(session.user.id);
        }
      } finally {
        authInitializing.current = false;
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      loadAuthData(session);
    }).catch((err) => {
      console.error('Failed to get session:', err);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (authInitializing.current) {
        // Only update session state; skip duplicate data loading
        setSession(session);
        if (!session?.user) setEconomyUserId(null);
        return;
      }
      if (session?.user) {
        await loadAuthData(session);
      } else {
        setSession(session);
        setEconomyUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Refresh wallet from Supabase when returning to menu + check daily reward
  useEffect(() => {
    if (view === 'menu') {
      // Sync wallet FROM Supabase so gifts/admin changes are picked up
      const uid = session?.user?.id;
      if (uid) {
        syncWalletFromServer(uid).then(() => {
          setWalletBeats(getLocalWallet().beats);
        }).catch((err) => console.warn('[App] wallet sync failed:', err));
      } else {
        setWalletBeats(getLocalWallet().beats);
      }
      // Check if daily reward is available (only once per session, on first menu visit)
      if (view === 'menu' && !dailyCheckedRef.current) {
        dailyCheckedRef.current = true;
        const dailyState = localStorage.getItem('tubedance_daily_login');
        if (dailyState) {
          try {
            const parsed = JSON.parse(dailyState);
            const today = new Date().toISOString().split('T')[0];
            if (parsed.lastClaim !== today) setShowDailyReward(true);
          } catch { /* corrupted localStorage */ }
        } else {
          setShowDailyReward(true);
        }
      }
    }
  }, [view]);

  const fetchOnlineProfile = async (uid: string) => {
    let data: any = null;
    try {
      const result = await supabase.from('profiles').select('*').eq('id', uid).single();
      data = result.data;
    } catch (err) {
      console.warn('[App] fetchOnlineProfile failed:', err);
      return;
    }
    if (data) {
      const p: PlayerProfile = {
        ...DEFAULT_PROFILE,
        level: data.level || 1,
        exp: data.exp || 0,
        jacket: data.jacket || 'leather_black',
        tshirt: data.tshirt || 'none',
        vest: data.vest || 'none',
        pants: data.pants || 'denim_blue',
        shorts: data.shorts || 'none',
        shoes: data.shoes || 'shoes_sneakers',
        hat: data.hat || 'none',
        glasses: data.glasses || 'none',
        beard: data.beard || 'none',
        mustache: data.mustache || 'none',
        wings: data.wings || 'none',
        effect: data.effect || 'none',
        accessory: data.accessory || 'none',
        body: data.body ? (typeof data.body === 'string' ? JSON.parse(data.body) : data.body) : DEFAULT_PROFILE.body,
        face: data.face ? (typeof data.face === 'string' ? JSON.parse(data.face) : data.face) : DEFAULT_PROFILE.face,
        rpm_url: data.rpm_url,
      };

      // Unpack effect and accessory if stored in body
      if (p.body && (p.body as any)._effect) p.effect = (p.body as any)._effect;
      if (p.body && (p.body as any)._accessory) p.accessory = (p.body as any)._accessory;
      setProfile(p);
      localStorage.setItem('tubedance_profile', JSON.stringify(p));
      const role = data.role || 'user';
      setUserRole(role);
      setEconomyUserRole(role);

      // Admin perks: max level, infinite beats, all items unlocked
      if (role === 'admin' || role === 'gamemaster') {
        p.level = 999;
        p.exp = 0;
        setProfile(p);
        localStorage.setItem('tubedance_profile', JSON.stringify(p));
        // Give admins infinite beats
        const wallet = getLocalWallet();
        if (wallet.beats < 99999999) {
          wallet.beats = 99999999;
          localStorage.setItem('tubedance_wallet', JSON.stringify(wallet));
          setWalletBeats(99999999);
        }
        // Auto-grant all shop items to admins (so they can equip anything)
        const { getOwnedItems, saveOwnedItems, SHOP_CATALOG } = await import('./lib/economy');
        const owned = getOwnedItems();
        const ownedSet = new Set(owned.map(o => o.itemId));
        let added = false;
        for (const item of SHOP_CATALOG) {
          if (!ownedSet.has(item.id)) {
            owned.push({ itemId: item.id, purchasedAt: Date.now() });
            added = true;
          }
        }
        if (added) saveOwnedItems(owned);
      }

      if (data.username) {
        setUsername(data.username);
        localStorage.setItem('tubedance_username', data.username);
      }
    } else {
      const baseName = session?.user?.email?.split('@')[0] || username;
      setUsername(baseName);
      await supabase.from('profiles').upsert({ id: uid, username: baseName, ...profile });
    }
  };

  const handleProfileUpdate = async (newProfile: PlayerProfile, newUsername?: string) => {
    setProfile(newProfile);
    localStorage.setItem('tubedance_profile', JSON.stringify(newProfile));
    
    if (newUsername) {
      setUsername(newUsername);
      localStorage.setItem('tubedance_username', newUsername);
    }

    if (session?.user) {
      // Pack effect/accessory into 'body' so we don't need SQL schema migrations!
      const { effect, accessory, body, ...rest } = newProfile;
      const patchedBody = typeof body === 'object' ? { ...body, _effect: effect, _accessory: accessory } : body;

      const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        username: newUsername || username,
        body: patchedBody,
        ...rest
      });
      if (error) console.warn('[Profile] Save failed, will retry on next update:', error.message);
    }
  };

  const handleModeSelect = (selectedMode: GameMode) => {
    setGameMode(selectedMode);
    setView('playlist_single');
  };

  const handleSelectPlaylistSingle = (songs: any[]) => {
    if (songs && songs.length > 0) {
      setPlaylist(songs);
      setMode('solo');
      setView('game');
    } else {
      alert("Diese Playlist ist leer!");
    }
  };

  const [liveJoin, setLiveJoin] = useState(false);
  const [gameStartedAt, setGameStartedAt] = useState(0);
  const handleMultiplayerStart = async (code: string, playlistId: string | null, roomGameMode?: GameMode, songs?: any[], isLiveJoin?: boolean, startedAt?: number) => {
    setRoomCode(code);
    setMode('audition');
    setLiveJoin(!!isLiveJoin);
    setGameStartedAt(startedAt || (isLiveJoin ? 0 : Date.now()));
    if (roomGameMode) setGameMode(roomGameMode);
    if (songs && songs.length > 0) {
      setPlaylist(songs);
    } else if (playlistId) {
      const { data } = await supabase.from('playlist_songs').select('*').eq('playlist_id', playlistId).order('position');
      setPlaylist(data || []);
    } else {
      setPlaylist([{ video_id: 'K4DyBUG242c', title: 'Default Test Song', bpm: 120 }]);
    }
    setView('game');
  };

  const handleGameEnd = async (earnedExp: number, finalScore?: number, maxCombo?: number, multiplier?: number, songCount?: number) => {
    // EXP system
    let newExp = profile.exp + earnedExp;
    let newLevel = profile.level;
    let expNeeded = newLevel * 1000;

    while (newExp >= expNeeded) {
      newExp -= expNeeded;
      newLevel++;
      expNeeded = newLevel * 1000;
    }

    handleProfileUpdate({ ...profile, level: newLevel, exp: newExp }, username);

    // Economy: Earn Beats
    const beatsEarned = calculateBeatsEarned(
      finalScore || earnedExp * 10,
      maxCombo || 0,
      multiplier || 1,
      songCount || 1
    );

    if (beatsEarned > 0) {
      earnBeats(beatsEarned, `Gameplay: ${songCount || 1} Song(s) beendet`);
      setWalletBeats(getLocalWallet().beats);
    }

    // Update game stats + leaderboard + achievements in DB (non-blocking)
    const uid = session?.user?.id;
    if (uid) {
      const gameScore = finalScore || earnedExp * 10;
      const gameCombo = maxCombo || 0;
      const gameSongs = songCount || 1;

      // Fire-and-forget: DB updates should not block navigation
      (async () => {
        try {
          const { data: currentProfile } = await supabase.from('profiles')
            .select('total_games, highest_combo, win_count, total_earned')
            .eq('id', uid).maybeSingle();

          const prevGames = currentProfile?.total_games || 0;
          const prevCombo = currentProfile?.highest_combo || 0;
          const prevEarned = currentProfile?.total_earned || 0;
          const newTotalGames = prevGames + 1;
          const newHighestCombo = Math.max(prevCombo, gameCombo);
          const newTotalEarned = prevEarned + beatsEarned;

          await supabase.from('profiles').update({
            total_games: newTotalGames,
            highest_combo: newHighestCombo,
            total_earned: newTotalEarned,
          }).eq('id', uid);

          const { data: existingLb } = await supabase.from('leaderboard')
            .select('total_score')
            .eq('user_id', uid)
            .maybeSingle();
          const prevScore = existingLb?.total_score || 0;

          await supabase.from('leaderboard').upsert({
            user_id: uid,
            username: username,
            total_score: prevScore + gameScore,
            total_games: newTotalGames,
            highest_combo: newHighestCombo,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

          checkAchievements(uid, {
            totalGames: newTotalGames,
            highestCombo: newHighestCombo,
            totalEarned: newTotalEarned,
            songCount: gameSongs,
          });
        } catch (err) {
          console.warn('[App] Failed to save game stats:', err);
        }
      })();
    }

    // Navigate immediately — don't wait for DB updates
    if (mode === 'audition') {
      // Reset room to "waiting" so players can rejoin (only for custom rooms, not fixed)
      if (roomCode && !roomCode.startsWith('fixed:')) {
        supabase.from('game_rooms').update({ is_playing: false }).eq('room_code', roomCode).then(() => {}, () => {});
      }
      setView('lobby');
    } else {
      setView('menu');
    }
  };

  const checkAchievements = async (uid: string, stats: { totalGames: number; highestCombo: number; totalEarned: number; songCount: number }) => {
    // Load already unlocked achievements
    const { data: unlocked } = await supabase.from('user_achievements').select('achievement_id').eq('user_id', uid);
    const unlockedIds = new Set((unlocked || []).map(a => a.achievement_id));

    // Achievement conditions: [id, condition]
    const checks: [string, boolean][] = [
      ['first_dance', stats.totalGames >= 1],
      ['combo_king', stats.highestCombo >= 50],
      ['marathon', stats.totalGames >= 100],
      ['millionaire', stats.totalEarned >= 1000000],
    ];

    for (const [achievementId, met] of checks) {
      if (met && !unlockedIds.has(achievementId)) {
        await supabase.from('user_achievements').insert({
          user_id: uid,
          achievement_id: achievementId,
          unlocked_at: new Date().toISOString(),
        });
      }
    }
  };

  const handleLogout = () => {
    // Clear UI state FIRST so the user sees immediate logout
    const userId = session?.user?.id;
    setSession(null);
    setGuestMode(false);
    setView('menu');

    // Then clean up supabase in background (fire-and-forget)
    if (userId) {
      syncWalletToSupabase(userId).catch(() => {});
    }
    supabase.auth.signOut().catch(() => {});
  };

  const requireAuth = !session && !guestMode;

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-[#1a0a2e] text-white font-sans selection:bg-pink-500/30 flex flex-col items-center justify-center p-6 relative overflow-x-hidden">

      {/* Audition-style FLASHY animated background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Moving color blobs */}
        <div className="absolute top-[10%] left-[15%] w-[700px] h-[700px] bg-pink-600/20 rounded-full blur-[180px] mix-blend-screen animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute bottom-[10%] right-[15%] w-[700px] h-[700px] bg-purple-600/15 rounded-full blur-[180px] mix-blend-screen animate-pulse" style={{ animationDuration: '5s' }} />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '4s' }} />

        {/* Disco floor grid at bottom */}
        <div className="absolute bottom-0 left-0 w-full h-[40%] opacity-20" style={{ perspective: '600px' }}>
          <div className="w-full h-full" style={{ transform: 'rotateX(60deg)', transformOrigin: 'bottom center' }}>
            <div className="w-full h-full" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(168,85,247,0.15) 0px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, rgba(236,72,153,0.1) 0px, transparent 1px, transparent 60px)',
              backgroundSize: '60px 60px',
            }} />
          </div>
        </div>

        {/* Side neon strips */}
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-pink-500/40 to-transparent" />
        <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-cyan-500/40 to-transparent" />

        {/* Top light beam */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-purple-500/5 to-transparent" style={{ clipPath: 'polygon(40% 0%, 60% 0%, 80% 100%, 20% 100%)' }} />
      </div>

      {requireAuth ? (
        <Auth onLogin={() => setGuestMode(true)} />
      ) : (
        <>
          {/* Top bar — always visible on menu */}
          {view === 'menu' && (
             <div className="absolute top-6 right-6 z-50 flex items-center gap-4">
               {/* Wallet mini-display */}
               <button 
                 onClick={() => setView('wallet')}
                 className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-900/40 to-amber-900/40 border border-yellow-500/30 rounded-full text-sm font-bold shadow-lg hover:border-yellow-400/60 transition-all group"
               >
                 <Coins size={16} className="text-yellow-400 group-hover:rotate-12 transition-transform" />
                 <span className="text-yellow-300 font-black">{walletBeats.toLocaleString()}</span>
                 <span className="text-yellow-600 text-[10px] uppercase font-bold">Beats</span>
               </button>

               {session ? (
                 <div className="flex items-center gap-3">
                   <div className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                      Eingeloggt als <span className="text-cyan-400">{username}</span>
                      <RoleBadge role={userRole} />
                   </div>
                   <button onClick={handleLogout} className="p-2 bg-red-900/50 hover:bg-red-600 border border-red-500/50 text-white rounded-full transition-colors" title="Ausloggen">
                     <LogOut size={16} />
                   </button>
                 </div>
               ) : (
                 <button onClick={handleLogout} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-full text-sm font-bold shadow-lg text-white">
                   Gastmodus beenden
                 </button>
               )}
             </div>
          )}

          {view !== 'menu' && view !== 'game' && view !== 'locker' && view !== 'shop' && view !== 'wallet' && view !== 'mode_select' && view !== 'lobby' && (
            <button 
              onClick={() => setView('menu')}
              className="absolute top-6 left-6 z-50 flex items-center gap-2 px-6 py-3 bg-gray-900 border border-cyan-500/50 rounded-full hover:bg-cyan-900/50 transition-colors uppercase tracking-widest text-xs font-black shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            >
              <ArrowLeft size={16} /> Zurück
            </button>
          )}

          <AnimatePresence mode="wait">
            {view === 'menu' && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
                className="w-full max-w-6xl z-10 flex flex-col items-center"
              >
                {/* ═══ TITLE + AVATAR HEADER ═══ */}
                <div className="w-full flex items-center justify-between mb-8">
                  {/* Left: Avatar Preview */}
                  <div className="w-48 h-64 rounded-3xl overflow-hidden border-2 border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.2)] bg-gradient-to-b from-purple-900/40 to-black/40 relative flex-shrink-0">
                    <AnimatedAvatar
                      modelUrl={profile.rpm_url}
                      jacket={profile.jacket} tshirt={profile.tshirt} vest={profile.vest}
                      pants={profile.pants} shorts={profile.shorts} shoes={profile.shoes}
                      hat={profile.hat} glasses={profile.glasses}
                      beard={profile.beard} mustache={profile.mustache} wings={profile.wings}
                      effect={profile.effect} accessory={profile.accessory}
                      body={profile.body} face={profile.face}
                      danceState="dancing"
                      intensity={1.5}
                      bpm={120}
                    />
                    {/* Neon ring at bottom */}
                    <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-purple-500/20 to-transparent" />
                  </div>

                  {/* Center: Title */}
                  <div className="text-center flex-1 px-6 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] bg-pink-500/10 rounded-full blur-[100px] pointer-events-none" />
                    <h1 className="text-7xl md:text-[9rem] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-pink-300 via-pink-500 to-purple-600 leading-none relative" style={{ WebkitTextStroke: '1px rgba(255,105,180,0.3)' }}>
                      AUDITION
                    </h1>
                    <div className="flex items-center justify-center gap-3 -mt-1">
                      <div className="h-px flex-1 max-w-24 bg-gradient-to-r from-transparent to-pink-500/50" />
                      <p className="text-pink-400 text-xs tracking-[0.6em] font-black uppercase animate-neon">
                        Online Dance Battle
                      </p>
                      <div className="h-px flex-1 max-w-24 bg-gradient-to-l from-transparent to-pink-500/50" />
                    </div>
                  </div>

                  {/* Right: Player Info Panel */}
                  <div className="flex-shrink-0 panel-audition px-6 py-5 flex flex-col items-center gap-3 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400 text-[10px] font-black uppercase tracking-widest">Level</span>
                      <span className="text-3xl font-black text-yellow-400 text-glow-gold">{profile.level}</span>
                    </div>
                    <div className="w-full h-px bg-purple-700/50" />
                    <span className="text-white font-black text-sm tracking-widest uppercase">{username}</span>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-900/30 border border-yellow-500/20 rounded-full">
                      <Coins size={14} className="text-yellow-400" />
                      <span className="text-yellow-300 font-black text-sm">{walletBeats.toLocaleString()}</span>
                      <span className="text-yellow-600 text-[8px] font-bold uppercase">Beats</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 w-full max-w-6xl">

                   {/* ═══ ROW 1: MAIN GAME BUTTONS — BIG & FLASHY ═══ */}
                   <div className="grid grid-cols-2 gap-4">
                    <motion.div whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.96 }} onClick={() => setView('mode_select')}
                      className="panel-audition relative overflow-hidden p-6 cursor-pointer hover:shadow-[0_0_40px_rgba(236,72,153,0.4)] transition-all group flex items-center gap-5">
                      <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/5 to-pink-500/0 group-hover:via-pink-500/15 transition-all" />
                      <div className="bg-gradient-to-br from-pink-500 to-purple-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(236,72,153,0.5)] shrink-0 relative">
                        <Play className="w-7 h-7 ml-1" fill="currentColor" />
                        <div className="absolute -inset-1 rounded-2xl border border-pink-400/30 group-hover:border-pink-400/60 transition-all" />
                      </div>
                      <div className="relative">
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider leading-none mb-1">Singleplayer</h3>
                        <p className="text-pink-300/50 font-bold text-[11px] uppercase tracking-wider">Wähle deinen Spielmodus</p>
                      </div>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-500/20 group-hover:text-pink-400/40 transition-all">
                        <Music size={48} />
                      </div>
                    </motion.div>

                    <motion.div whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.96 }} onClick={() => setView('lobby')}
                      className="panel-audition relative overflow-hidden p-6 cursor-pointer hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] transition-all group flex items-center gap-5">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 group-hover:via-cyan-500/15 transition-all" />
                      <div className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.5)] shrink-0 relative">
                        <Users className="w-7 h-7" />
                        <div className="absolute -inset-1 rounded-2xl border border-cyan-400/30 group-hover:border-cyan-400/60 transition-all" />
                      </div>
                      <div className="relative">
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider leading-none mb-1">Multiplayer</h3>
                        <p className="text-cyan-300/50 font-bold text-[11px] uppercase tracking-wider">Tritt gegen andere an!</p>
                      </div>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-500/20 group-hover:text-cyan-400/40 transition-all">
                        <Zap size={48} />
                      </div>
                    </motion.div>
                   </div>

                   {/* ═══ ROW 2: SHOP + WARDROBE + WALLET ═══ */}
                   <div className="grid grid-cols-3 gap-4">
                    <motion.div whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.96 }} onClick={() => setView('shop')}
                      className="panel-audition relative overflow-hidden p-5 cursor-pointer hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] transition-all group flex items-center gap-4">
                      <div className="bg-gradient-to-br from-pink-500 to-purple-600 text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(236,72,153,0.4)] shrink-0">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white uppercase tracking-wider leading-none mb-0.5">Fashion Shop</h3>
                        <p className="text-pink-300/40 font-bold text-[10px] uppercase tracking-wider">Jacken, Schuhe, Effekte</p>
                      </div>
                      <span className="absolute top-2 right-3 px-2 py-0.5 bg-gradient-to-r from-pink-500 to-orange-500 text-[8px] font-black uppercase tracking-widest rounded-full text-white shadow-[0_0_8px_rgba(236,72,153,0.5)] animate-pulse">
                        NEU
                      </span>
                    </motion.div>

                    <motion.div whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.96 }} onClick={() => setView('locker')}
                      className="panel-audition relative overflow-hidden p-5 cursor-pointer hover:shadow-[0_0_30px_rgba(250,204,21,0.3)] transition-all group flex items-center gap-4">
                      <div className="bg-gradient-to-br from-yellow-400 to-amber-500 text-black w-12 h-12 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.4)] shrink-0">
                        <Shirt className="w-5 h-5" fill="currentColor" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white uppercase tracking-wider leading-none mb-0.5">Garderobe</h3>
                        <p className="text-yellow-400/40 font-bold text-[10px] uppercase tracking-wider">Outfit anpassen</p>
                      </div>
                    </motion.div>

                    <motion.div whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.96 }} onClick={() => setView('wallet')}
                      className="panel-audition relative overflow-hidden p-5 cursor-pointer hover:shadow-[0_0_30px_rgba(250,204,21,0.2)] transition-all group flex items-center gap-4">
                      <div className="bg-gradient-to-br from-yellow-500 to-amber-600 text-black w-12 h-12 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.4)] shrink-0">
                        <Coins className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white uppercase tracking-wider leading-none mb-0.5">Wallet</h3>
                        <p className="text-yellow-300/60 font-bold text-[10px] uppercase tracking-wider">
                          <span className="text-yellow-300 text-base font-black">{walletBeats.toLocaleString()}</span> Beats
                        </p>
                      </div>
                    </motion.div>
                   </div>

                   {/* ═══ ROW 3: SOCIAL BUTTONS ═══ */}
                   <div className="grid grid-cols-5 gap-3">
                    {[
                      { label: 'Freunde', icon: Heart, color: 'from-cyan-500 to-blue-600', border: 'border-cyan-500/20 hover:border-cyan-400/50', shadow: 'rgba(6,182,212,0.3)', action: () => setView('friends') },
                      { label: 'Profil', icon: UserCircle, color: 'from-purple-500 to-pink-600', border: 'border-purple-500/20 hover:border-purple-400/50', shadow: 'rgba(168,85,247,0.3)', action: () => setView('profile') },
                      { label: 'Rangliste', icon: Trophy, color: 'from-yellow-500 to-amber-600 text-black', border: 'border-yellow-500/20 hover:border-yellow-400/50', shadow: 'rgba(250,204,21,0.3)', action: () => setView('leaderboard') },
                      { label: 'Daily', icon: Gift, color: 'from-green-500 to-emerald-600', border: 'border-green-500/20 hover:border-green-400/50', shadow: 'rgba(34,197,94,0.3)', action: () => setShowDailyReward(true) },
                      ...(isAdmin(userRole) ? [{ label: 'Admin', icon: ShieldAlert, color: 'from-red-500 to-orange-600', border: 'border-red-500/30 hover:border-red-400/50', shadow: 'rgba(239,68,68,0.4)', action: () => setView('admin') }] : []),
                    ].map(item => (
                      <motion.div key={item.label} whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={item.action}
                        className={`panel-audition ${item.border} p-4 cursor-pointer shadow-xl transition-all group flex flex-col items-center text-center`}>
                        <div className={`bg-gradient-to-br ${item.color} text-white w-10 h-10 rounded-full flex items-center justify-center shadow-[0_0_12px_${item.shadow}] mb-2`}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <h3 className="text-[11px] font-black text-white uppercase tracking-widest leading-tight">{item.label}</h3>
                      </motion.div>
                    ))}
                   </div>
                </div>

                {/* News Ticker — Audition style bottom bar */}
                <div className="w-full max-w-6xl mt-8 overflow-hidden rounded-2xl panel-audition py-2.5 px-4 border-pink-500/10">
                  <div className="animate-ticker whitespace-nowrap text-sm font-bold tracking-wider">
                    <span className="text-pink-400">★</span>
                    <span className="text-purple-300/70 mx-2">Willkommen bei Audition Online!</span>
                    <span className="text-pink-400">★</span>
                    <span className="text-cyan-300/60 mx-2">Server: EU-West</span>
                    <span className="text-pink-400">★</span>
                    <span className="text-yellow-300/60 mx-2">Neue Items im Fashion Shop!</span>
                    <span className="text-pink-400">★</span>
                    <span className="text-green-300/60 mx-2">Daily Rewards nicht vergessen!</span>
                    <span className="text-pink-400">★</span>
                    <span className="text-purple-300/70 mx-2">Tanze zum Beat und werde der beste Tänzer!</span>
                    <span className="text-pink-400">★</span>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'mode_select' && (
              <motion.div key="mode_select" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full z-10 pt-16 flex justify-center">
                <ModeSelect onSelect={handleModeSelect} onBack={() => setView('menu')} />
              </motion.div>
            )}

            {view === 'playlist_single' && (
              <motion.div key="playlist" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full z-10 pt-16">
                <PlaylistManager onSelectPlaylist={handleSelectPlaylistSingle} />
              </motion.div>
            )}

            {view === 'lobby' && (
              <motion.div key="lobby" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full z-10 pt-16">
                <RoomBrowser
                  userId={session?.user?.id || getDeviceId()}
                  username={username}
                  profile={profile}
                  userRole={userRole}
                  rejoinRoomCode={mode === 'audition' ? roomCode : null}
                  onGameStart={handleMultiplayerStart}
                  onBack={() => { setRoomCode(''); setView('menu'); }}
                />
              </motion.div>
            )}

            {view === 'locker' && (
              <motion.div key="locker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50">
                <LockerRoom profile={profile} username={username} onSave={handleProfileUpdate} onBack={() => setView('menu')} />
              </motion.div>
            )}

            {view === 'shop' && (
              <motion.div key="shop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50">
                <FashionShop playerLevel={profile.level} profile={profile} onBack={() => setView('menu')} />
              </motion.div>
            )}

            {view === 'wallet' && (
              <motion.div key="wallet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50">
                <WalletView onBack={() => setView('menu')} onOpenShop={() => setView('shop')} />
              </motion.div>
            )}

            {view === 'friends' && (
              <motion.div key="friends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50">
                {session?.user ? (
                  <FriendsList userId={session.user.id} username={username} onBack={() => setView('menu')} />
                ) : (
                  <div className="min-h-screen bg-[#1a0a2e] flex flex-col items-center justify-center gap-4 text-white">
                    <p className="text-gray-400 text-sm uppercase tracking-widest font-bold">Account erforderlich</p>
                    <p className="text-gray-500 text-xs">Freundesliste ist nur mit einem Account verfuegbar.</p>
                    <button onClick={() => setView('menu')} className="px-6 py-3 bg-pink-600 hover:bg-pink-500 rounded-full font-black uppercase tracking-widest text-xs">Zurueck</button>
                  </div>
                )}
              </motion.div>
            )}

            {view === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50">
                <PlayerProfileView userId={session?.user?.id || getDeviceId()} profile={profile} username={username} onBack={() => setView('menu')} />
              </motion.div>
            )}

            {view === 'leaderboard' && (
              <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50">
                <Leaderboard userId={session?.user?.id || getDeviceId()} onBack={() => setView('menu')} />
              </motion.div>
            )}

            {view === 'admin' && isAdmin(userRole) && (
              <motion.div key="admin" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full z-10 pt-16">
                <AdminPanel userRole={userRole} onBack={() => setView('menu')} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Daily Rewards Popup */}
          <AnimatePresence>
            {showDailyReward && (
              <DailyRewards onClose={() => { setShowDailyReward(false); setWalletBeats(getLocalWallet().beats); }} />
            )}
          </AnimatePresence>

          {view === 'game' && (
            <div className="fixed inset-0 z-50">
              <Game
                playlist={playlist}
                mode={mode}
                gameMode={gameMode}
                roomCode={roomCode}
                userId={session?.user?.id || getDeviceId()}
                username={username}
                profile={profile}
                liveJoin={liveJoin}
                gameStartedAt={gameStartedAt}
                onBack={() => setView(mode === 'audition' ? 'lobby' : 'menu')}
                onGameEnd={handleGameEnd}
              />
            </div>
          )}
        </>
      )}
    </div>
    </ErrorBoundary>
  );
}
