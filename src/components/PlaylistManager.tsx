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
    id: 'local_sehr_leicht', title: '🟢 Sehr Leicht (~80-95 BPM)', is_preset: true, created_by: null,
    songs: [
      { id: 'p1', video_id: 'AOeY-nDp7hI', title: 'Alan Walker - Fade', bpm: 90, position: 1 },
      { id: 'p2', video_id: 'p7ZsBPK656s', title: 'Syn Cole - Feel Good (Chill Mix)', bpm: 85, position: 2 }
    ]
  },
  {
    id: 'local_leicht', title: '🔵 Leicht (~100-115 BPM)', is_preset: true, created_by: null,
    songs: [
      { id: 'p3', video_id: 'J2X5mJ3HDYE', title: 'NCS Pop Mix', bpm: 105, position: 1 },
      { id: 'p4', video_id: '8vG7F0h2wFM', title: 'Cadmium - Melody', bpm: 110, position: 2 }
    ]
  },
  {
    id: 'local_mittel', title: '🟡 Mittel (~120-135 BPM)', is_preset: true, created_by: null,
    songs: [
      { id: 'p5', video_id: 'TW9d8vYrVFQ', title: 'Elektronomia - Sky High', bpm: 128, position: 1 },
      { id: 'p6', video_id: '6FNHe3kf8_s', title: 'Different Heaven - Nekozilla', bpm: 128, position: 2 }
    ]
  },
  {
    id: 'local_schwer', title: '🟠 Schwer (~140-155 BPM)', is_preset: true, created_by: null,
    songs: [
      { id: 'p7', video_id: 'K4CyUe23A-c', title: 'Cartoon - On & On', bpm: 144, position: 1 },
      { id: 'p8', video_id: 'tX5o2uLw47o', title: 'Unknown Brain - Superhero', bpm: 150, position: 2 }
    ]
  },
  {
    id: 'local_extrem', title: '🔴 Extrem (160+ BPM)', is_preset: true, created_by: null,
    songs: [
      { id: 'p9', video_id: 'uzjNgWav3nk', title: 'NCS Hardstyle / DNB', bpm: 175, position: 1 },
      { id: 'p10', video_id: 'yJg-Y5byMMw', title: 'Aero Chord - Surface', bpm: 190, position: 2 }
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
                  className="flex items-center gap-2 px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play size={18} fill="currentColor" /> Spielen
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {songs.map((song, i) => (
                  <div key={song.id} className="flex items-center gap-4 p-4 bg-gray-900/80 rounded-xl border border-gray-800/50 hover:border-gray-700 transition-colors">
                    <span className="text-gray-500 font-black text-sm w-4">{i + 1}.</span>
                    <span className="flex-1 truncate font-medium text-gray-200">{song.title}</span>
                    <span className="text-cyan-400/80 text-xs font-mono font-bold bg-cyan-900/30 px-2 py-1 rounded">{song.bpm || 120} BPM</span>
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
