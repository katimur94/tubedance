import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Play, ListVideo, Search, Youtube } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Playlist {
  id: string;
  title: string;
  is_preset: boolean;
  created_by: string | null;
}

interface PlaylistSong {
  id: string;
  playlist_id: string;
  video_id: string;
  title: string;
  bpm: number | null;
  position: number;
}

export function PlaylistManager({ onSelectPlaylist }: { onSelectPlaylist: (playlistId: string) => void }) {
  const [activeTab, setActiveTab] = useState<'presets' | 'mine'>('presets');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [songs, setSongs] = useState<PlaylistSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState('');

  // Note: For fully working "Meine Playlists", user needs to be authenticated.
  // We'll mock user_id context or assume an anon-user for now.

  useEffect(() => {
    fetchPlaylists();
  }, [activeTab]);

  useEffect(() => {
    if (selectedPlaylist) {
      fetchSongs(selectedPlaylist.id);
    }
  }, [selectedPlaylist]);

  const fetchPlaylists = async () => {
    setLoading(true);
    let query = supabase.from('playlists').select('*');

    if (activeTab === 'presets') {
      query = query.eq('is_preset', true);
    } else {
      // In a real app we'd filter by logged-in user: query.eq('created_by', currentUser.id)
      query = query.eq('is_preset', false); 
    }

    const { data, error } = await query;
    if (!error && data) {
      setPlaylists(data);
    }
    setLoading(false);
  };

  const fetchSongs = async (playlistId: string) => {
    const { data, error } = await supabase
      .from('playlist_songs')
      .select('*')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: true });

    if (!error && data) {
      setSongs(data);
    }
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
      // Fetch metadata using noembed (No API key needed)
      const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
      const metadata = await res.json();
      const title = metadata.title || 'Unknown Title';

      // 1. Create Playlist
      const { data: pData, error: pError } = await supabase
        .from('playlists')
        .insert([{ title: title, is_preset: false }])
        .select()
        .single();
      
      if (pError) throw pError;

      // 2. Add Song
      await supabase
        .from('playlist_songs')
        .insert([{
          playlist_id: pData.id,
          video_id: videoId,
          title: title,
          position: 1,
          bpm: 120 // Default bpm
        }]);
      
      setShowImport(false);
      setImportUrl('');
      fetchPlaylists(); // Refresh
      alert('Playlist erfolgreich importiert!');
    } catch (e: any) {
      console.error(e);
      alert('Fehler beim Importieren: ' + e.message);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-2xl shadow-2xl overflow-hidden text-gray-100">
      
      {/* Header Tabs */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${activeTab === 'presets' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            Presets
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${activeTab === 'mine' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            Meine Playlists
          </button>
        </div>
        
        <button
          onClick={() => setShowImport(!showImport)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/50 rounded-full hover:bg-green-500/30 transition-colors"
        >
          <Plus size={16} /> Import YouTube
        </button>
      </div>

      {/* Import Flyout */}
      <AnimatePresence>
        {showImport && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="flex gap-2 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <Youtube className="text-red-500 w-8" />
              <input
                type="text"
                placeholder="YouTube URL pasten (z.B. https://youtube.com/watch?v=...)"
                className="flex-1 bg-transparent border-b border-gray-600 focus:border-cyan-500 outline-none px-2 text-white"
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
              />
              <button 
                onClick={handleImport}
                className="px-4 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-500 transition-colors"
              >
                Hinzufügen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Playlist List */}
        <div className="space-y-3">
          <h3 className="text-gray-400 font-bold tracking-widest uppercase text-sm mb-4">Verfügbare Playlists</h3>
          {loading ? (
            <div className="text-gray-500">Lade Playlists...</div>
          ) : playlists.length === 0 ? (
            <div className="text-gray-500">Keine Playlists gefunden.</div>
          ) : (
            playlists.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedPlaylist(p)}
                className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedPlaylist?.id === p.id ? 'bg-cyan-900/40 border-cyan-500/50 scale-105' : 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-500'}`}
              >
                <div className="flex items-center gap-3">
                  <ListVideo className={selectedPlaylist?.id === p.id ? 'text-cyan-400' : 'text-gray-400'} />
                  <span className="font-semibold">{p.title}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Song List */}
        <div className="bg-gray-800/30 rounded-2xl p-6 border border-gray-700">
          {selectedPlaylist ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{selectedPlaylist.title}</h3>
                <button
                  onClick={() => onSelectPlaylist(selectedPlaylist.id)}
                  className="flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
                >
                  <Play size={18} fill="currentColor" /> Spielen
                </button>
              </div>
              <div className="space-y-2">
                {songs.map((song, i) => (
                  <div key={song.id} className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                    <span className="text-gray-500 font-mono text-sm w-4">{i + 1}.</span>
                    <span className="flex-1 truncate text-sm">{song.title}</span>
                    <span className="text-cyan-500/50 text-xs font-mono">{song.bpm || 120} BPM</span>
                  </div>
                ))}
                {songs.length === 0 && <div className="text-gray-500 text-sm">Diese Playlist ist leer.</div>}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
              <Search size={48} className="opacity-20" />
              <p>Wähle eine Playlist aus, um die Songs zu sehen</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
