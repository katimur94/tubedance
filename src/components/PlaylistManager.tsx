import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Play, ListVideo, Search, Youtube, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PlaylistSong {
  id: string;
  playlist_id?: string;
  video_id: string;
  title: string;
  bpm: number | null;
  position: number;
}

interface Playlist {
  id: string;
  title: string;
  is_preset: boolean;
  created_by: string | null;
  songs?: PlaylistSong[];
}

const LOCAL_PRESETS: Playlist[] = [
  {
    id: 'local_sehr_leicht', title: '🟢 Sehr Leicht (60-80 BPM)', is_preset: true, created_by: null,
    songs: [
      { id: '1', video_id: '2Vv-BfVoq4g', title: 'Ed Sheeran - Perfect', bpm: 63, position: 1 },
      { id: '2', video_id: '450p7goxZqg', title: 'John Legend - All of Me', bpm: 63, position: 2 },
      { id: '3', video_id: 'tfBVp0Zi2iE', title: 'Adele - Someone Like You', bpm: 67, position: 3 },
      { id: '4', video_id: '1fueZCTYkpA', title: 'Chill Lofi Mix 1', bpm: 70, position: 4 },
      { id: '5', video_id: 'J91ti_MpdHA', title: 'NCS Chill Relax', bpm: 70, position: 5 },
      { id: '6', video_id: 'RBumgq5yVrA', title: 'Passenger - Let Her Go', bpm: 75, position: 6 },
      { id: '7', video_id: 'jGflUbPQfW8', title: 'Cartoon - I Remember U (Chill)', bpm: 75, position: 7 },
      { id: '8', video_id: 'lp-EO5I60KA', title: 'Ed Sheeran - Thinking Out Loud', bpm: 79, position: 8 },
      { id: '9', video_id: 'p7ZsBPK656s', title: 'Syn Cole - Feel Good (Chill Mix)', bpm: 80, position: 9 },
      { id: '10', video_id: 'Z8N_2f2R1-w', title: 'Lofi Mix 2', bpm: 80, position: 10 }
    ]
  },
  {
    id: 'local_leicht', title: '🔵 Leicht (85-115 BPM)', is_preset: true, created_by: null,
    songs: [
      { id: '11', video_id: 'kJQP7kiw5Fk', title: 'Luis Fonsi - Despacito', bpm: 89, position: 1 },
      { id: '12', video_id: 'AOeY-nDp7hI', title: 'Alan Walker - Fade', bpm: 90, position: 2 },
      { id: '13', video_id: 'CGyEd0aKWZE', title: 'Ellie Goulding - Love Me Like You Do', bpm: 95, position: 3 },
      { id: '14', video_id: 'JGwWNGJdvx8', title: 'Ed Sheeran - Shape of You', bpm: 96, position: 4 },
      { id: '15', video_id: 'YQEvdNzX5qU', title: 'Major Lazer - Lean On', bpm: 98, position: 5 },
      { id: '16', video_id: 'fJ9rUzIMcZQ', title: 'Queen - Bohemian Rhapsody', bpm: 100, position: 6 },
      { id: '17', video_id: 'J2X5mJ3HDYE', title: 'NCS Pop Mix', bpm: 105, position: 7 },
      { id: '18', video_id: 'hLQl3WQQoQ0', title: 'Adele - Rolling in the deep', bpm: 105, position: 8 },
      { id: '19', video_id: '8vG7F0h2wFM', title: 'Cadmium - Melody', bpm: 110, position: 9 },
      { id: '20', video_id: 'OPf0YbXqDm0', title: 'Mark Ronson - Uptown Funk', bpm: 115, position: 10 }
    ]
  },
  {
    id: 'local_mittel', title: '🟡 Mittel (120-135 BPM)', is_preset: true, created_by: null,
    songs: [
      { id: '21', video_id: 'ALZHF5UqnU4', title: 'Marshmello - Alone', bpm: 120, position: 1 },
      { id: '22', video_id: 'nfs8NYg7yQM', title: 'Pharrell Williams - Happy', bpm: 120, position: 2 },
      { id: '23', video_id: 'hT_nvWreIhg', title: 'OneRepublic - Counting Stars', bpm: 122, position: 3 },
      { id: '24', video_id: 'TW9d8vYrVFQ', title: 'Elektronomia - Sky High', bpm: 128, position: 4 },
      { id: '25', video_id: '6FNHe3kf8_s', title: 'Different Heaven - Nekozilla', bpm: 128, position: 5 },
      { id: '26', video_id: '3nQNiWdeH2Q', title: 'Janji - Heroes Tonight', bpm: 128, position: 6 },
      { id: '27', video_id: '4ZvnQ_2BfV0', title: 'Lensko - Let\'s Go!', bpm: 128, position: 7 },
      { id: '28', video_id: 'IIrCDAV3EgI', title: 'Tobu - Hope', bpm: 128, position: 8 },
      { id: '29', video_id: 'bM7SZ5SBzyY', title: 'Alan Walker - The Spectre', bpm: 128, position: 9 },
      { id: '30', video_id: '9bZkp7q19f0', title: 'PSY - GANGNAM STYLE', bpm: 132, position: 10 }
    ]
  },
  {
    id: 'local_schwer', title: '🟠 Schwer (140-155 BPM)', is_preset: true, created_by: null,
    songs: [
      { id: '31', video_id: 'K4CyUe23A-c', title: 'Cartoon - On & On', bpm: 144, position: 1 },
      { id: '32', video_id: 'B2p-jVKpzK8', title: 'TheFatRat - Monody', bpm: 145, position: 2 },
      { id: '33', video_id: 'VHoT4N43jK8', title: 'Skrillex - Bangarang', bpm: 145, position: 3 },
      { id: '34', video_id: 'y6120QOlsfU', title: 'Darude - Sandstorm', bpm: 146, position: 4 },
      { id: '35', video_id: 'tX5o2uLw47o', title: 'Unknown Brain - Superhero', bpm: 150, position: 5 },
      { id: '36', video_id: 'CSvFpBOe8eY', title: 'System Of A Down - Chop Suey!', bpm: 150, position: 6 },
      { id: '37', video_id: 'zDo0H8Fm5c0', title: 'NCS Hard Trap', bpm: 150, position: 7 },
      { id: '38', video_id: 'Oq6IoKz7uTQ', title: 'Nightcore Mix 1', bpm: 150, position: 8 },
      { id: '39', video_id: 'Wb_f6EAdTWM', title: 'Droptek - Boundaries', bpm: 155, position: 9 },
      { id: '40', video_id: 'nfWlot6h_JM', title: 'Taylor Swift - Shake It Off (Speed)', bpm: 160, position: 10 }
    ]
  },
  {
    id: 'local_extrem', title: '🔴 Extrem (160+ BPM)', is_preset: true, created_by: null,
    songs: [
      { id: '41', video_id: 'c-XpOMmQ24A', title: 'Eminem - Rap God', bpm: 164, position: 1 },
      { id: '42', video_id: 'wU2O7yB7Nuk', title: 'Nightcore - Angel With A Shotgun', bpm: 165, position: 2 },
      { id: '43', video_id: 'kXYiU_JCYtU', title: 'Linkin Park - Numb (Rock)', bpm: 170, position: 3 },
      { id: '44', video_id: 'uzjNgWav3nk', title: 'NCS Hardstyle / DNB', bpm: 175, position: 4 },
      { id: '45', video_id: 'aE2GCa-_nyU', title: 'Muzzy - Endgame', bpm: 175, position: 5 },
      { id: '46', video_id: 'yJg-Y5byMMw', title: 'Aero Chord - Surface', bpm: 190, position: 6 },
      { id: '47', video_id: '1wYNFfgrXTI', title: 'Slipknot - Duality', bpm: 190, position: 7 },
      { id: '48', video_id: 'WSeNSzJ2-Jw', title: 'Camellia - Ghost', bpm: 200, position: 8 },
      { id: '49', video_id: 'YVKcmX_x-yA', title: 'DragonForce - Through The Fire And Flames', bpm: 200, position: 9 },
      { id: '50', video_id: 'Jwpj3I37h1c', title: '200 BPM Hardstyle Mix', bpm: 200, position: 10 }
    ]
  }
];

export function PlaylistManager({ onSelectPlaylist }: { onSelectPlaylist: (songs: PlaylistSong[]) => void }) {
  const [activeTab, setActiveTab] = useState<'presets' | 'mine'>('presets');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [songs, setSongs] = useState<PlaylistSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPlaylists();
  }, [activeTab]);

  useEffect(() => {
    if (selectedPlaylist) {
      if (selectedPlaylist.id.startsWith('local_')) {
        setSongs(selectedPlaylist.songs || []);
      } else {
        fetchSongs(selectedPlaylist.id);
      }
    }
  }, [selectedPlaylist]);

  const fetchPlaylists = async () => {
    setLoading(true);
    setSearchTerm('');
    setSelectedPlaylist(null);
    setSongs([]);

    if (activeTab === 'presets') {
      // Use Hardcoded Categories instead of Supabase (for default music without extra setup)
      setPlaylists(LOCAL_PRESETS);
    } else {
      // Fetch user's custom playlists
      const { data, error } = await supabase.from('playlists').select('*').eq('is_preset', false);
      if (!error && data) {
        setPlaylists(data);
      } else {
        setPlaylists([]);
      }
    }
    setLoading(false);
  };

  const fetchSongs = async (playlistId: string) => {
    const { data, error } = await supabase
      .from('playlist_songs')
      .select('*')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: true });

    if (!error && data) setSongs(data);
  };

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleImport = async () => {
    const videoId = extractYoutubeId(importUrl);
    if (!videoId) return alert('Ungültiger YouTube Link');

    try {
      const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
      const metadata = await res.json();
      const title = metadata.title || 'Unknown Title';

      const { data: pData, error: pError } = await supabase
        .from('playlists')
        .insert([{ title: title, is_preset: false }])
        .select()
        .single();
      
      if (pError) throw pError;

      await supabase.from('playlist_songs').insert([{
        playlist_id: pData.id,
        video_id: videoId,
        title: title,
        position: 1,
        bpm: 120 
      }]);
      
      setShowImport(false);
      setImportUrl('');
      if (activeTab === 'mine') fetchPlaylists();
      alert('Playlist erfolgreich importiert!');
    } catch (e: any) {
      console.error(e);
      alert('Fehler beim Importieren: ' + e.message);
    }
  };

  const filteredPlaylists = playlists.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="w-full max-w-5xl mx-auto p-6 bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-3xl shadow-2xl overflow-hidden text-gray-100 flex flex-col h-[80vh]">
      
      {/* Header Tabs */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'presets' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            <Sparkles size={16} /> App Kategorien
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'mine' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            <ListVideo size={16} /> Eigene Playlists
          </button>
        </div>
        
        <button
          onClick={() => setShowImport(!showImport)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/50 rounded-full hover:bg-green-500/30 transition-colors font-semibold text-sm shadow-[0_0_15px_rgba(16,185,129,0.1)]"
        >
          <Plus size={16} /> Import YouTube
        </button>
      </div>

      {/* Import Flyout */}
      <AnimatePresence>
        {showImport && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-6 overflow-hidden">
            <div className="flex gap-2 p-4 bg-gray-800/80 rounded-xl border border-gray-700 shadow-inner">
              <Youtube className="text-red-500 w-8" />
              <input
                type="text" placeholder="YouTube URL pasten..."
                className="flex-1 bg-transparent border-b border-gray-600 focus:border-cyan-500 outline-none px-2 text-white placeholder-gray-500"
                value={importUrl} onChange={e => setImportUrl(e.target.value)}
              />
              <button onClick={handleImport} className="px-6 py-2 bg-cyan-600 font-bold text-white rounded-lg hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-500/30">
                Hinzufügen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 min-h-0">
        {/* Playlist List */}
        <div className="flex flex-col space-y-4 h-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Suchen..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {loading ? (
              <div className="text-center p-8 text-gray-500">Lade...</div>
            ) : filteredPlaylists.length === 0 ? (
              <div className="text-center p-8 text-gray-500 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">Keine gefunden.</div>
            ) : (
              filteredPlaylists.map(p => (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  key={p.id}
                  onClick={() => setSelectedPlaylist(p)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedPlaylist?.id === p.id ? 'bg-gradient-to-r from-cyan-900/60 to-blue-900/40 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-500'}`}
                >
                  <div className="flex items-center gap-3">
                    <ListVideo className={selectedPlaylist?.id === p.id ? 'text-cyan-400' : 'text-gray-400'} />
                    <span className="font-bold text-lg tracking-wide">{p.title}</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Song List */}
        <div className="bg-gray-800/40 rounded-3xl p-6 border border-gray-700 flex flex-col h-full overflow-hidden shadow-inner">
          {selectedPlaylist ? (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center pb-4 border-b border-gray-700/50 mb-4 shrink-0">
                <h3 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">{selectedPlaylist.title}</h3>
                <button
                  onClick={() => onSelectPlaylist(songs)}
                  disabled={songs.length === 0}
                  className="flex items-center gap-2 px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <ListVideo size={16} fill="currentColor" /> Alle Spielen
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {songs.map((song, i) => (
                  <div key={song.id} className="flex items-center gap-4 p-4 bg-gray-900/80 rounded-xl border border-gray-800/50 hover:border-gray-700 transition-colors group">
                    <span className="text-gray-500 font-black text-sm w-4">{i + 1}.</span>
                    <span className="flex-1 truncate font-medium text-gray-200">{song.title}</span>
                    <span className="text-cyan-400/80 text-xs font-mono font-bold bg-cyan-900/30 px-2 py-1 rounded">{song.bpm || 120} BPM</span>
                    
                    {/* Individual Song Play Button */}
                    <button 
                      onClick={() => onSelectPlaylist([song])}
                      className="opacity-0 group-hover:opacity-100 p-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-full shadow-lg transition-all"
                      title="Nur diesen Song spielen"
                    >
                      <Play fill="currentColor" size={14} />
                    </button>
                  </div>
                ))}
                {songs.length === 0 && (
                  <div className="h-full flex items-center justify-center text-gray-500 bg-gray-900/20 rounded-xl border border-dashed border-gray-700">
                    Diese Playlist ist leer. Füge Songs hinzu!
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-6 opacity-60">
              <div className="p-6 bg-gray-800 rounded-full">
                <Search size={48} className="text-gray-600" />
              </div>
              <p className="text-lg font-medium tracking-wide">Wähle eine Kategorie oder Playlist</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
