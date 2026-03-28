import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Play, Copy, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MultiplayerLobbyProps {
  onGameStart: (roomCode: string, playlistId: string | null) => void;
  userId: string;
  username: string;
}

export function MultiplayerLobby({ onGameStart, userId, username }: MultiplayerLobbyProps) {
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<{ id: string, name: string }[]>([]);
  const [inRoom, setInRoom] = useState(false);
  const [loading, setLoading] = useState(false);

  // Leave room on unmount
  useEffect(() => {
    return () => {
      if (roomCode) {
        supabase.removeAllChannels();
      }
    };
  }, [roomCode]);

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createRoom = async () => {
    setLoading(true);
    const code = generateCode();
    
    // We optionally assign a playlist later or default null
    const { error } = await supabase.from('game_rooms').insert([{
      room_code: code,
      host_id: userId,
      is_playing: false
    }]);

    if (!error) {
      setRoomCode(code);
      setIsHost(true);
      joinRealtimeChannel(code);
    } else {
      alert("Fehler beim Erstellen des Raums: " + error.message);
    }
    setLoading(false);
  };

  const joinRoom = async () => {
    if (!inputCode) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', inputCode.toUpperCase())
      .single();

    if (error || !data) {
      alert("Raum nicht gefunden!");
      setLoading(false);
      return;
    }

    setRoomCode(data.room_code);
    setIsHost(false);
    joinRealtimeChannel(data.room_code);
    setLoading(false);
  };

  const joinRealtimeChannel = (code: string) => {
    setInRoom(true);
    const channel = supabase.channel(`room:${code}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activePlayers: any[] = [];
        for (const [key, value] of Object.entries(state)) {
          // @ts-ignore
          activePlayers.push({ id: key, name: value[0].name });
        }
        setPlayers(activePlayers);
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'game_rooms', 
        filter: `room_code=eq.${code}` 
      }, (payload) => {
        if (payload.new.is_playing) {
          onGameStart(code, payload.new.playlist_id);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ name: username, online_at: new Date().toISOString() });
        }
      });
  };

  const startGame = async () => {
    if (!isHost) return;
    
    // For now we just start with null playlist, the app will handle it.
    // Ideally the host selected a playlist before creating the room.
    const { error } = await supabase
      .from('game_rooms')
      .update({ is_playing: true })
      .eq('room_code', roomCode);
    
    if (error) {
      alert("Fehler beim Starten: " + error.message);
    }
  };

  if (inRoom) {
    return (
      <div className="w-full max-w-2xl mx-auto p-1 bg-gradient-to-br from-cyan-500/30 to-purple-500/30 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.15)]">
        <div className="bg-gray-900 rounded-[22px] p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-500 animate-pulse" />
          
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black mb-2 tracking-tight">RAUM CODE</h2>
            <div className="flex items-center justify-center gap-4">
              <span className="text-6xl font-mono text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] tracking-widest">{roomCode}</span>
              <button onClick={() => navigator.clipboard.writeText(roomCode)} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white">
                <Copy size={24} />
              </button>
            </div>
            <p className="mt-4 text-gray-400">Warte auf weitere Spieler...</p>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 mb-8 border border-gray-700/50">
            <div className="flex items-center gap-3 mb-4 text-gray-400 font-bold uppercase tracking-wider text-sm border-b border-gray-700 pb-2">
              <Users size={18} /> {players.length} Spieler verbunden
            </div>
            <div className="grid grid-cols-2 gap-4">
              <AnimatePresence>
                {players.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-3 bg-gray-800 p-3 rounded-lg border border-gray-700"
                  >
                    <div className="w-8 h-8 rounded-full bg-cyan-900/50 flex items-center justify-center border border-cyan-500/30">
                      {p.name.substring(0,2).toUpperCase()}
                    </div>
                    <span className="font-semibold">{p.name} {p.id === userId && <span className="text-gray-500 text-sm">(Du)</span>}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {isHost ? (
            <button
              onClick={startGame}
              className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xl rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all uppercase tracking-widest flex items-center justify-center gap-3"
            >
              <Play fill="currentColor" /> Spiel starten
            </button>
          ) : (
            <div className="w-full py-4 text-center text-gray-500 font-bold tracking-widest uppercase border border-gray-800 rounded-xl bg-gray-800/30">
              Warten auf Host...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto p-8 bg-gray-900 border border-gray-800 rounded-2xl text-white shadow-2xl">
      <h2 className="text-3xl font-black mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">MULTIPLAYER</h2>
      
      <div className="space-y-8">
        <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700">
          <h3 className="text-lg font-bold mb-4 text-gray-300">Raum beitreten</h3>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="6-stelliger Code"
              maxLength={6}
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-2xl font-mono text-center tracking-[0.5em] focus:border-cyan-500 outline-none uppercase placeholder:tracking-normal placeholder:text-gray-600"
            />
            <button
              onClick={joinRoom}
              disabled={inputCode.length !== 6 || loading}
              className="px-6 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold transition-colors flex items-center justify-center"
            >
              <ArrowRight size={24} />
            </button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-800"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-gray-900 text-gray-500 font-bold uppercase">oder</span>
          </div>
        </div>

        <button
          onClick={createRoom}
          disabled={loading}
          className="w-full py-4 border-2 border-cyan-500/30 text-cyan-400 font-bold rounded-xl hover:bg-cyan-500/10 hover:border-cyan-500 transition-all uppercase tracking-widest"
        >
          {loading ? 'Lade...' : 'Neuen Raum erstellen'}
        </button>
      </div>
    </div>
  );
}
