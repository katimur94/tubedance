import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Users, Shield, ArrowLeft, Shirt, LogOut } from 'lucide-react';
import Game from './components/Game';
import { PlaylistManager } from './components/PlaylistManager';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { LockerRoom, PlayerProfile } from './components/LockerRoom';
import { Auth } from './components/Auth';
import { supabase } from './lib/supabase';

const getDeviceId = () => {
  let id = localStorage.getItem('tubedance_device_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('tubedance_device_id', id); }
  return id;
}

const DEFAULT_PROFILE: PlayerProfile = {
  level: 1, exp: 0,
  jacket: 'bg-gray-500', pants: 'bg-gray-500', shoes: 'bg-gray-500'
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [guestMode, setGuestMode] = useState(false);
  
  const [view, setView] = useState<'menu' | 'playlist_single' | 'lobby' | 'locker' | 'game'>('menu');
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [roomCode, setRoomCode] = useState<string>('');
  const [mode, setMode] = useState<'audition' | 'solo'>('audition');

  const [profile, setProfile] = useState<PlayerProfile>(() => {
    const saved = localStorage.getItem('tubedance_profile');
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });

  const [username, setUsername] = useState('Dancer_' + Math.floor(Math.random() * 9999));

  // Supabase Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchOnlineProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      if (session?.user) fetchOnlineProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchOnlineProfile = async (uid: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (data) {
      const p = { level: data.level, exp: data.exp, jacket: data.jacket, pants: data.pants, shoes: data.shoes };
      setProfile(p);
      localStorage.setItem('tubedance_profile', JSON.stringify(p));
      if (data.username) setUsername(data.username);
    } else {
      // First time login - Create Profile
      const baseName = session?.user?.email?.split('@')[0] || username;
      setUsername(baseName);
      await supabase.from('profiles').upsert({ id: uid, username: baseName, ...profile });
    }
  };

  const handleProfileUpdate = async (newProfile: PlayerProfile) => {
    setProfile(newProfile);
    localStorage.setItem('tubedance_profile', JSON.stringify(newProfile));
    
    if (session?.user) {
      await supabase.from('profiles').upsert({ 
        id: session.user.id, 
        username,
        ...newProfile 
      });
    }
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

  const handleMultiplayerStart = async (code: string, playlistId: string | null) => {
    setRoomCode(code);
    setMode('audition');
    if (playlistId) {
      const { data } = await supabase.from('playlist_songs').select('*').eq('playlist_id', playlistId).order('position');
      setPlaylist(data || []);
    } else {
      setPlaylist([{ video_id: 'K4DyBUG242c', title: 'Default Test Song', bpm: 120 }]);
    }
    setView('game');
  };

  const handleGameEnd = (earnedExp: number) => {
    let newExp = profile.exp + earnedExp;
    let newLevel = profile.level;
    let expNeeded = newLevel * 1000;
    
    while (newExp >= expNeeded) {
      newExp -= expNeeded;
      newLevel++;
      expNeeded = newLevel * 1000;
    }
    
    handleProfileUpdate({ ...profile, level: newLevel, exp: newExp });
    setView('menu');
  };

  const handleLogout = () => {
    supabase.auth.signOut();
    setGuestMode(false);
  };

  const requireAuth = !session && !guestMode;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 flex flex-col items-center justify-center p-6 relative overflow-x-hidden">
      
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-cyan-600/20 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-pink-600/20 rounded-full blur-[150px] mix-blend-screen" />
      </div>

      {requireAuth ? (
        <Auth onLogin={() => setGuestMode(true)} />
      ) : (
        <>
          {/* Main Top Header Controls */}
          {view === 'menu' && (
             <div className="absolute top-6 right-6 z-50 flex items-center gap-4">
               {session ? (
                 <div className="flex items-center gap-3">
                   <div className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-full text-sm font-bold shadow-lg">
                      Eingeloggt als <span className="text-cyan-400">{username}</span>
                   </div>
                   <button onClick={handleLogout} className="p-2 bg-red-900/50 hover:bg-red-600 border border-red-500/50 text-white rounded-full transition-colors" title="Ausloggen">
                     <LogOut size={16} />
                   </button>
                 </div>
               ) : (
                 <button onClick={() => setGuestMode(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-full text-sm font-bold shadow-lg text-white">
                   Gastmodus beenden
                 </button>
               )}
             </div>
          )}

          {view !== 'menu' && view !== 'game' && (
            <button 
              onClick={() => setView('menu')}
              className="absolute top-6 left-6 z-50 flex items-center gap-2 px-6 py-3 bg-gray-900 border border-cyan-500/50 rounded-full hover:bg-cyan-900/50 transition-colors uppercase tracking-widest text-xs font-black shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            >
              <ArrowLeft size={16} /> Zurück
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
                <div className="text-center mb-16 relative">
                  <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-blue-500 to-pink-500 drop-shadow-[0_0_30px_rgba(236,72,153,0.5)]">
                    TUBEDANCE
                  </h1>
                  <p className="text-gray-300 text-2xl tracking-[0.4em] font-black mt-6 border border-gray-700 inline-block px-10 py-3 rounded-full bg-gray-900/50 backdrop-blur-md shadow-2xl">
                    LEVEL <span className="text-yellow-400">{profile.level}</span> DANCER
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
                  {/* Single Player */}
                  <motion.div whileHover={{ y: -5, scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setView('playlist_single')}
                    className="bg-gray-900/80 backdrop-blur-xl border border-gray-700 hover:border-cyan-400 rounded-[40px] p-10 cursor-pointer shadow-xl hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all group relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/30 transition-all" />
                    <div className="bg-cyan-500 text-black w-20 h-20 rounded-full flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-10 h-10 ml-2" fill="currentColor" />
                    </div>
                    <h3 className="text-3xl font-black mb-3 text-white group-hover:text-cyan-400 transition-colors uppercase tracking-widest">Singleplayer</h3>
                    <p className="text-gray-400 leading-relaxed font-bold text-sm">Spiele alle Playlists, farme offline heftige EXP für dein Profil und brich Highscores.</p>
                  </motion.div>

                  {/* Multiplayer */}
                  <motion.div whileHover={{ y: -5, scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setView('lobby')}
                    className="bg-gray-900/80 backdrop-blur-xl border border-gray-700 hover:border-pink-500 rounded-[40px] p-10 cursor-pointer shadow-xl hover:shadow-[0_0_30px_rgba(236,72,153,0.4)] transition-all group relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/30 transition-all" />
                    <div className="bg-pink-500 text-black w-20 h-20 rounded-full flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform">
                      <Users className="w-10 h-10" fill="currentColor" />
                    </div>
                    <h3 className="text-3xl font-black mb-3 text-white group-hover:text-pink-400 transition-colors uppercase tracking-widest">Multiplayer</h3>
                    <p className="text-gray-400 leading-relaxed font-bold text-sm">Tritt gegen andere Tänzer an! Zeige ihnen deinen 3D-Avatar im Live-Ranking.</p>
                  </motion.div>

                  {/* Locker Room */}
                  <motion.div whileHover={{ y: -5, scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => setView('locker')}
                    className="bg-gray-900/80 backdrop-blur-xl border border-gray-700 hover:border-yellow-400 rounded-[40px] p-10 cursor-pointer shadow-xl hover:shadow-[0_0_30px_rgba(250,204,21,0.4)] transition-all group relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl group-hover:bg-yellow-400/30 transition-all" />
                    <div className="bg-yellow-400 text-black w-20 h-20 rounded-full flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform">
                      <Shirt className="w-10 h-10" fill="currentColor" />
                    </div>
                    <h3 className="text-3xl font-black mb-3 text-white group-hover:text-yellow-400 transition-colors uppercase tracking-widest">Locker Room</h3>
                    <p className="text-gray-400 leading-relaxed font-bold text-sm">Hol dir frische Farben für deinen 3D-Bot. Neue Styles gibt es beim Level-Up.</p>
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
                  userId={session?.user?.id || getDeviceId()} 
                  username={username} 
                />
              </motion.div>
            )}

            {view === 'locker' && (
              <motion.div key="locker" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full z-10 pt-6">
                <LockerRoom profile={profile} onSave={handleProfileUpdate} onBack={() => setView('menu')} />
              </motion.div>
            )}
          </AnimatePresence>

          {view === 'game' && (
            <div className="fixed inset-0 z-50">
              <Game 
                playlist={playlist}
                mode={mode}
                roomCode={roomCode}
                userId={session?.user?.id || getDeviceId()}
                username={username}
                profile={profile}
                onBack={() => setView('menu')}
                onGameEnd={handleGameEnd}
              />
            </div>
          )}

          {/* Simple Env Check Warning */}
          {!import.meta.env.VITE_SUPABASE_URL && view === 'menu' && (
            <div className="absolute bottom-6 bg-red-900/50 border border-red-500/50 text-red-200 px-6 py-3 rounded-xl flex items-center gap-3 font-bold z-50 shadow-2xl">
              <Shield /> .env Supabase Variablen fehlen!
            </div>
          )}
        </>
      )}
    </div>
  );
}
