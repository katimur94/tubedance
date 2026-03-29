import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Users, ArrowLeft, Shirt, LogOut, ShoppingBag, Coins, UserCircle, Heart, Trophy, Gift, ShieldAlert } from 'lucide-react';
import Game from './components/Game';
import { PlaylistManager } from './components/PlaylistManager';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { RoomBrowser } from './components/RoomBrowser';
import { LockerRoom, PlayerProfile, DEFAULT_BODY, DEFAULT_FACE } from './components/LockerRoom';
import { Auth } from './components/Auth';
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

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [guestMode, setGuestMode] = useState(false);
  
  const [view, setView] = useState<'menu' | 'mode_select' | 'playlist_single' | 'lobby' | 'locker' | 'shop' | 'wallet' | 'friends' | 'profile' | 'leaderboard' | 'admin' | 'game'>('menu');
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [showDailyReward, setShowDailyReward] = useState(false);
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

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setEconomyUserId(session.user.id);
        // Load everything from Supabase FIRST (source of truth)
        await loadWalletFromSupabase(session.user.id);
        markWalletLoaded();
        setWalletBeats(getLocalWallet().beats);
        await fetchOnlineProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      setSession(session);
      if (session?.user) {
        setEconomyUserId(session.user.id);
        await loadWalletFromSupabase(session.user.id);
        markWalletLoaded();
        setWalletBeats(getLocalWallet().beats);
        await fetchOnlineProfile(session.user.id);
      } else {
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
        });
      } else {
        setWalletBeats(getLocalWallet().beats);
      }
      // Check if daily reward is available
      const dailyState = localStorage.getItem('tubedance_daily_login');
      if (dailyState) {
        const parsed = JSON.parse(dailyState);
        const today = new Date().toISOString().split('T')[0];
        if (parsed.lastClaim !== today) setShowDailyReward(true);
      } else {
        setShowDailyReward(true);
      }
    }
  }, [view]);

  const fetchOnlineProfile = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
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

      await supabase.from('profiles').upsert({ 
        id: session.user.id, 
        username: newUsername || username,
        body: patchedBody,
        ...rest 
      });
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

  const handleMultiplayerStart = async (code: string, playlistId: string | null, roomGameMode?: GameMode, songs?: any[]) => {
    setRoomCode(code);
    setMode('audition');
    if (roomGameMode) setGameMode(roomGameMode);
    if (songs && songs.length > 0) {
      // Songs passed directly from RoomBrowser (Leader's selection)
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

    // Update game stats + leaderboard + achievements in DB
    const uid = session?.user?.id;
    if (uid) {
      const gameScore = finalScore || earnedExp * 10;
      const gameCombo = maxCombo || 0;
      const gameSongs = songCount || 1;

      // 1. Update profile stats
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

      // 2. Update leaderboard — read existing score first, then add
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

      // 3. Check and unlock achievements
      checkAchievements(uid, {
        totalGames: newTotalGames,
        highestCombo: newHighestCombo,
        totalEarned: newTotalEarned,
        songCount: gameSongs,
      });
    }

    // Return to lobby if multiplayer, otherwise menu
    if (mode === 'audition') {
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
    <div className="min-h-screen bg-[#1a0a2e] text-white font-sans selection:bg-pink-500/30 flex flex-col items-center justify-center p-6 relative overflow-x-hidden">

      {/* Audition-style animated background */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-pink-600/25 rounded-full blur-[150px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px] mix-blend-screen animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px]" />
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

          {view !== 'menu' && view !== 'game' && view !== 'locker' && view !== 'shop' && view !== 'wallet' && view !== 'mode_select' && (
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
                className="w-full max-w-5xl z-10 flex flex-col items-center"
              >
                <div className="text-center mb-16 relative">
                  <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-pink-400 via-purple-400 to-cyan-400 text-glow-pink">
                    AUDITION
                  </h1>
                  <p className="text-pink-300/60 text-sm tracking-[0.5em] font-black mt-2 uppercase">Online Dance Battle</p>
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <p className="text-gray-300 text-xl tracking-[0.4em] font-black border border-pink-500/30 inline-block px-10 py-3 rounded-full bg-purple-950/50 backdrop-blur-md shadow-2xl">
                      LEVEL <span className="text-yellow-400 text-glow-gold">{profile.level}</span> DANCER
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-6 w-full max-w-5xl">
                   
                   {/* ROW 1: GAME MODES */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div whileHover={{ y: -5, scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setView('mode_select')}
                      className="bg-purple-950/50 backdrop-blur-xl border border-pink-500/30 hover:border-pink-400 rounded-[40px] p-8 cursor-pointer shadow-xl hover:shadow-[0_0_30px_rgba(236,72,153,0.4)] transition-all group relative overflow-hidden flex items-center">
                      <div className="absolute right-0 top-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/30 transition-all" />
                      <div className="bg-gradient-to-br from-pink-500 to-purple-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(236,72,153,0.4)] shrink-0 mr-6">
                        <Play className="w-6 h-6 ml-1" fill="currentColor" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-widest leading-none mb-1">Singleplayer</h3>
                        <p className="text-pink-300/60 font-bold text-xs uppercase tracking-wider">WÄHLE DEINEN SPIELMODUS</p>
                      </div>
                    </motion.div>

                    <motion.div whileHover={{ y: -5, scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setView('lobby')}
                      className="bg-purple-950/50 backdrop-blur-xl border border-cyan-500/30 hover:border-cyan-400 rounded-[40px] p-8 cursor-pointer shadow-xl hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all group relative overflow-hidden flex items-center">
                      <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/30 transition-all" />
                      <div className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)] shrink-0 mr-6">
                        <Users className="w-6 h-6" fill="currentColor" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-widest leading-none mb-1">Multiplayer</h3>
                        <p className="text-cyan-300/60 font-bold text-xs uppercase tracking-wider">TRITT GEGEN ANDERE AN</p>
                      </div>
                    </motion.div>
                   </div>

                   {/* ROW 2: FASHION SHOP (NEW!) + WALLET */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                    <motion.div whileHover={{ y: -5, scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setView('shop')}
                      className="bg-gradient-to-br from-pink-950/40 to-purple-950/40 backdrop-blur-xl border border-pink-500/30 hover:border-pink-400 rounded-[40px] p-8 cursor-pointer shadow-xl hover:shadow-[0_0_30px_rgba(236,72,153,0.4)] transition-all group relative overflow-hidden flex items-center">
                      <div className="absolute right-0 top-0 w-40 h-40 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/30 transition-all" />
                      <div className="absolute left-0 bottom-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />
                      <div className="bg-gradient-to-br from-pink-500 to-purple-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(236,72,153,0.4)] shrink-0 mr-6">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-widest leading-none mb-1">Fashion Shop</h3>
                        <p className="text-pink-300/60 font-bold text-xs uppercase tracking-wider">JACKEN, SCHUHE, EFFEKTE & MEHR</p>
                      </div>
                      <span className="absolute top-4 right-6 px-3 py-1 bg-gradient-to-r from-pink-500 to-orange-500 text-[9px] font-black uppercase tracking-widest rounded-full text-white shadow-[0_0_10px_rgba(236,72,153,0.5)] animate-pulse">
                        NEU
                      </span>
                    </motion.div>

                    <motion.div whileHover={{ y: -5, scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setView('wallet')}
                      className="bg-gradient-to-br from-yellow-950/30 to-amber-950/30 backdrop-blur-xl border border-yellow-500/20 hover:border-yellow-400/50 rounded-[40px] p-8 cursor-pointer shadow-xl hover:shadow-[0_0_30px_rgba(250,204,21,0.3)] transition-all group relative overflow-hidden flex items-center">
                      <div className="absolute right-0 top-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl group-hover:bg-yellow-500/20 transition-all" />
                      <div className="bg-gradient-to-br from-yellow-500 to-amber-600 text-black w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(250,204,21,0.4)] shrink-0 mr-6">
                        <Coins className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-widest leading-none mb-1">Wallet</h3>
                        <p className="text-yellow-400/60 font-bold text-xs uppercase tracking-wider">
                          <span className="text-yellow-300 text-lg font-black mr-1">{walletBeats.toLocaleString()}</span> BEATS GUTHABEN
                        </p>
                      </div>
                    </motion.div>
                   </div>

                   {/* ROW 3: CHARACTER EDITOR */}
                   <div className="mt-2">
                    <motion.div whileHover={{ y: -5, scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setView('locker')}
                      className="bg-gradient-to-br from-purple-950/50 to-pink-950/30 backdrop-blur-xl border border-yellow-500/30 hover:border-yellow-400 rounded-[40px] p-8 cursor-pointer shadow-xl hover:shadow-[0_0_30px_rgba(250,204,21,0.3)] transition-all group relative overflow-hidden flex items-center">
                      <div className="absolute right-0 top-0 w-40 h-40 bg-yellow-500/10 rounded-full blur-2xl group-hover:bg-yellow-500/20 transition-all" />
                      <div className="bg-gradient-to-br from-yellow-400 to-amber-500 text-black w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(250,204,21,0.4)] shrink-0 mr-6">
                        <Shirt className="w-6 h-6" fill="currentColor" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-widest leading-none mb-1">Character Editor</h3>
                        <p className="text-yellow-400/60 font-bold text-xs uppercase tracking-wider">KOERPER, KLEIDUNG, ACCESSOIRES & MEHR</p>
                      </div>
                    </motion.div>
                   </div>

                   {/* ROW 4: SOCIAL */}
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    <motion.div whileHover={{ y: -5, scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setView('friends')}
                      className="bg-purple-950/50 backdrop-blur-xl border border-cyan-500/20 hover:border-cyan-400/50 rounded-3xl p-5 cursor-pointer shadow-xl transition-all group flex flex-col items-center text-center">
                      <div className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white w-11 h-11 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] mb-3">
                        <Heart className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-black text-white uppercase tracking-widest leading-tight">Freunde</h3>
                    </motion.div>

                    <motion.div whileHover={{ y: -5, scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setView('profile')}
                      className="bg-purple-950/50 backdrop-blur-xl border border-purple-500/20 hover:border-purple-400/50 rounded-3xl p-5 cursor-pointer shadow-xl transition-all group flex flex-col items-center text-center">
                      <div className="bg-gradient-to-br from-purple-500 to-pink-600 text-white w-11 h-11 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)] mb-3">
                        <UserCircle className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-black text-white uppercase tracking-widest leading-tight">Profil</h3>
                    </motion.div>

                    <motion.div whileHover={{ y: -5, scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setView('leaderboard')}
                      className="bg-purple-950/50 backdrop-blur-xl border border-yellow-500/20 hover:border-yellow-400/50 rounded-3xl p-5 cursor-pointer shadow-xl transition-all group flex flex-col items-center text-center">
                      <div className="bg-gradient-to-br from-yellow-500 to-amber-600 text-black w-11 h-11 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.3)] mb-3">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-black text-white uppercase tracking-widest leading-tight">Rangliste</h3>
                    </motion.div>

                    <motion.div whileHover={{ y: -5, scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setShowDailyReward(true)}
                      className="bg-purple-950/50 backdrop-blur-xl border border-green-500/20 hover:border-green-400/50 rounded-3xl p-5 cursor-pointer shadow-xl transition-all group flex flex-col items-center text-center relative">
                      <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white w-11 h-11 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.3)] mb-3">
                        <Gift className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-black text-white uppercase tracking-widest leading-tight">Daily</h3>
                    </motion.div>

                    {isAdmin(userRole) && (
                      <motion.div whileHover={{ y: -5, scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setView('admin')}
                        className="bg-purple-950/50 backdrop-blur-xl border border-red-500/30 hover:border-red-400/50 rounded-3xl p-5 cursor-pointer shadow-xl transition-all group flex flex-col items-center text-center">
                        <div className="bg-gradient-to-br from-red-500 to-orange-600 text-white w-11 h-11 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.4)] mb-3">
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest leading-tight">Admin</h3>
                      </motion.div>
                    )}
                   </div>
                </div>

                {/* News Ticker */}
                <div className="w-full max-w-5xl mt-12 overflow-hidden rounded-full bg-purple-950/50 border border-purple-500/20 py-2">
                  <div className="animate-ticker whitespace-nowrap text-sm font-bold text-purple-300/60 tracking-wider">
                    🎵 Willkommen bei Audition Online! — Server: EU-West — Neue Items im Fashion Shop verfügbar! — Tanze zum Beat und werde der beste Tänzer! 🎵
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
                  onGameStart={handleMultiplayerStart}
                  onBack={() => setView('menu')}
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
                <FriendsList userId={session?.user?.id || getDeviceId()} username={username} onBack={() => setView('menu')} />
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
                onBack={() => setView(mode === 'audition' ? 'lobby' : 'menu')}
                onGameEnd={handleGameEnd}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
