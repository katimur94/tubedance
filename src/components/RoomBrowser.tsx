/**
 * RoomBrowser — Audition-style Raum-Browser mit Raum-Liste, Quick Join, und Erstellung
 * 
 * Leader Features:
 * - Spieler kicken
 * - Krone (Leadership) weitergeben
 * - Raum schließen/löschen
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Play, Plus, Search, RefreshCw, Lock, Zap,
  ArrowDown, Sparkles, Copy, Crown, Check, X,
  ShieldAlert, ArrowRightLeft, Trash2, MoreVertical,
  AlertTriangle, DoorOpen, LogIn, Circle, MessageSquare,
  Music, ListMusic, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Chat } from './Chat';
import { RoleBadge } from './RoleBadge';
import { GAME_MODES, type GameMode } from '../types/gameTypes';
import { type UserRole } from '../lib/roles';
import type { PlayerProfile } from './LockerRoom';
import { LOCAL_PRESETS, type PlaylistSong, type Playlist } from './PlaylistManager';

interface GameRoom {
  id: string;
  room_code: string;
  name: string;
  host_id: string;
  host_name?: string;
  mode: GameMode;
  max_players: number;
  current_players: number;
  is_playing: boolean;
  is_locked: boolean;
}

interface RoomBrowserProps {
  userId: string;
  username: string;
  profile: PlayerProfile;
  userRole?: UserRole;
  onGameStart: (roomCode: string, playlistId: string | null, mode: GameMode, songs?: PlaylistSong[]) => void;
  onBack: () => void;
}

const MODE_ICONS: Record<string, typeof Zap> = { beat_up: Zap, beat_rush: ArrowDown, freestyle: Sparkles, club_dance: Users };

export function RoomBrowser({ userId, username, profile, userRole = 'user', onGameStart, onBack }: RoomBrowserProps) {
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [inRoom, setInRoom] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<{ id: string; name: string; ready: boolean; profile?: PlayerProfile; role?: UserRole }[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>('beat_up');
  const [roomName, setRoomName] = useState('');
  const [filterMode, setFilterMode] = useState<GameMode | 'all'>('all');

  // Join by code
  const [joinCode, setJoinCode] = useState('');

  // Playlist / Song selection (Leader picks)
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [selectedSongs, setSelectedSongs] = useState<PlaylistSong[]>([]);
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [songPickerExpanded, setSongPickerExpanded] = useState<string | null>(null); // expanded playlist id

  // Global lobby presence
  const [onlinePlayers, setOnlinePlayers] = useState<{ id: string; name: string; role?: UserRole }[]>([]);
  const lobbyChannelRef = useRef<any>(null);

  // Leader management state
  const [hostId, setHostId] = useState<string | null>(null);
  const [playerMenuOpen, setPlayerMenuOpen] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [kickedNotice, setKickedNotice] = useState<string | null>(null);
  const [crownNotice, setCrownNotice] = useState<string | null>(null);

  const channelRef = useRef<any>(null);
  // Refs to avoid stale closures inside Supabase realtime callbacks
  const hostIdRef = useRef<string | null>(null);
  const isHostRef = useRef(false);
  const inRoomRef = useRef<string | null>(null);
  const selectedSongsRef = useRef<PlaylistSong[]>([]);
  const hostLookupDone = useRef(false); // prevent repeated DB lookups for host

  // Keep refs in sync with state
  useEffect(() => { hostIdRef.current = hostId; }, [hostId]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => { inRoomRef.current = inRoom; }, [inRoom]);
  useEffect(() => { selectedSongsRef.current = selectedSongs; }, [selectedSongs]);

  // Track whether this is the initial load vs. background auto-refresh
  const isInitialLoad = useRef(true);

  useEffect(() => {
    loadRooms();
    // Poll every 3s — fast enough to feel instant, Realtime below is a bonus
    const interval = setInterval(() => loadRooms(true), 3000);

    // Realtime: instant room list updates (requires Realtime enabled on game_rooms in Supabase Dashboard)
    const roomChanges = supabase.channel('room_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms' }, () => {
        loadRooms(true);
      })
      .subscribe();

    // Global lobby presence — shows who's in the multiplayer lobby
    const lobbyChannel = supabase.channel('lobby:global', {
      config: { presence: { key: userId } },
    });
    lobbyChannel.on('broadcast', { event: 'room_update' }, () => {
      // Another player created/deleted a room — refresh list instantly
      loadRooms(true);
    });
    lobbyChannel.on('presence', { event: 'sync' }, () => {
      const state = lobbyChannel.presenceState();
      const players: { id: string; name: string; role?: UserRole }[] = [];
      for (const [key, value] of Object.entries(state)) {
        const v = (value as any)[0];
        players.push({ id: key, name: v.name, role: v.role });
      }
      setOnlinePlayers(players);
    });
    lobbyChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await lobbyChannel.track({ name: username, role: userRole });
      }
    });
    lobbyChannelRef.current = lobbyChannel;

    return () => {
      clearInterval(interval);
      supabase.removeChannel(roomChanges);
      supabase.removeChannel(lobbyChannel);
    };
  }, []);

  // Close player menu when clicking outside
  useEffect(() => {
    const handler = () => setPlayerMenuOpen(null);
    if (playerMenuOpen) {
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [playerMenuOpen]);

  const loadRooms = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Clean up stale rooms from this user on first load
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        try {
          await supabase.from('game_rooms').delete()
            .eq('host_id', userId)
            .eq('is_playing', false);
        } catch { /* ignore cleanup failures */ }
      }

      const { data, error } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('is_playing', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('[RoomBrowser] loadRooms error:', error.message);
      } else if (data) {
        setRooms(data.map((r: any) => ({
          id: r.id,
          room_code: r.room_code,
          name: r.name || `Raum ${r.room_code}`,
          host_id: r.host_id,
          mode: r.mode || 'beat_up',
          max_players: r.max_players || 8,
          current_players: 0,
          is_playing: r.is_playing,
          is_locked: r.is_locked || false,
        })));
      }
    } catch (err) {
      console.warn('[RoomBrowser] loadRooms failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const name = roomName.trim() || `${username}'s Raum`;

    setCreating(true);
    setCreateError(null);
    try {
      // Ensure we have a valid session before DB operations
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Try refreshing the session first
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        session = refreshData?.session ?? null;
        if (!session || refreshError) {
          setCreateError('Session abgelaufen. Bitte lade die Seite neu (F5).');
          setCreating(false);
          return;
        }
      }

      // Clean up stale rooms from this user — AWAIT so INSERT doesn't race
      await supabase.from('game_rooms').delete()
        .eq('host_id', userId)
        .eq('is_playing', false);

      const { error } = await supabase.from('game_rooms').insert({
        room_code: code,
        host_id: userId,
        name,
        mode: selectedMode,
        is_playing: false,
        is_locked: false,
        max_players: 8,
      });

      if (error) {
        console.warn('[RoomBrowser] createRoom DB error:', error.message);
        setCreateError(`Raum konnte nicht erstellt werden: ${error.message}`);
        setCreating(false);
        return;
      }
    } catch (err: any) {
      console.warn('[RoomBrowser] createRoom failed:', err);
      const msg = err?.name === 'AbortError'
        ? 'Server antwortet nicht. Bitte lade die Seite neu (F5).'
        : (err?.message || 'Verbindungsfehler. Bitte prüfe deine Internetverbindung.');
      setCreateError(msg);
      setCreating(false);
      return;
    }

    setCreating(false);
    setInRoom(code);
    setIsHost(true);
    setHostId(userId);
    setShowCreate(false);
    joinChannel(code, true);

    // Notify all lobby players that a new room exists
    if (lobbyChannelRef.current) {
      lobbyChannelRef.current.send({ type: 'broadcast', event: 'room_update', payload: {} });
    }
  };



  const joinRoom = (code: string) => {
    setInRoom(code);
    setIsHost(false);
    joinChannel(code, false);
  };

  const joinByCode = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length >= 4) {
      joinRoom(code);
      setJoinCode('');
    }
  };

  const quickJoin = () => {
    const available = rooms.filter(r => !r.is_playing && !r.is_locked && r.current_players < r.max_players);
    if (available.length > 0) {
      const random = available[Math.floor(Math.random() * available.length)];
      joinRoom(random.room_code);
    } else {
      setSelectedMode('beat_up');
      setRoomName('Quick Match');
      createRoom();
    }
  };

  const joinChannel = (code: string, asHost: boolean) => {
    // Clean up any existing channels first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(`room:${code}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activePlayers: any[] = [];
        for (const [key, value] of Object.entries(state)) {
          // Use the LAST presence entry (most recent) instead of first
          const entries = value as any[];
          const v = entries[entries.length - 1];
          // For the current user, always use local ready state (no roundtrip delay)
          const ready = key === userId ? isReadyRef.current : (v.ready === true);
          activePlayers.push({ id: key, name: v.name, ready, profile: v.profile, role: v.role });
        }
        setPlayers(activePlayers);

        // Use refs to get the latest values (avoid stale closures)
        const currentHostId = hostIdRef.current;

        // Auto-close: if no players remain and we were previously in the room, delete it
        // Check inRoomRef.current to avoid deleting the room milliseconds after creating it before we tracked in
        if (activePlayers.length === 0 && inRoomRef.current) {
          supabase.from('game_rooms').delete().eq('room_code', code).then(() => {}, () => {});
          return;
        }

        // Determine host from presence data
        if (activePlayers.length > 0) {
          const hostStillHere = currentHostId ? activePlayers.find((p: any) => p.id === currentHostId) : null;

          if (currentHostId && !hostStillHere) {
            // Host is gone — promote the first remaining player
            const newLeader = activePlayers[0];
            const newLeaderId = newLeader.id;
            setHostId(newLeaderId);
            if (newLeaderId === userId) {
              setIsHost(true);
              setCrownNotice('Der Leader hat den Raum verlassen. Du bist jetzt der Leader!');
              setTimeout(() => setCrownNotice(null), 3000);
              supabase.from('game_rooms').update({ host_id: userId }).eq('room_code', code).then(() => {}, () => {});
            } else {
              setIsHost(false);
              setCrownNotice(`${newLeader.name} ist jetzt der Leader!`);
              setTimeout(() => setCrownNotice(null), 3000);
            }
          } else if (!currentHostId && !hostLookupDone.current) {
            // We don't know the host yet — check DB once (not on every sync)
            hostLookupDone.current = true;
            supabase.from('game_rooms').select('host_id').eq('room_code', code).maybeSingle().then(({ data }) => {
              if (data) {
                const dbHostHere = activePlayers.find((p: any) => p.id === data.host_id);
                if (dbHostHere) {
                  setHostId(data.host_id);
                  setIsHost(data.host_id === userId);
                } else if (activePlayers.length > 0) {
                  // DB host not present — promote first player
                  const newLeader = activePlayers[0];
                  setHostId(newLeader.id);
                  setIsHost(newLeader.id === userId);
                  supabase.from('game_rooms').update({ host_id: newLeader.id }).eq('room_code', code).then(() => {}, () => {});
                }
              } else {
                // Room doesn't exist in DB — just pick first player as host
                if (activePlayers.length > 0) {
                  setHostId(activePlayers[0].id);
                  setIsHost(activePlayers[0].id === userId);
                }
              }
            });
          }
        }
      })
      .on('broadcast', { event: 'kick' }, (payload) => {
        if (payload.payload.targetId === userId) {
          setKickedNotice(payload.payload.reason || 'Du wurdest vom Leader aus dem Raum entfernt.');
          setTimeout(() => {
            leaveRoom();
            setKickedNotice(null);
          }, 3000);
        }
      })
      .on('broadcast', { event: 'crown_transfer' }, (payload) => {
        const newHostId = payload.payload.newHostId;
        const newHostName = payload.payload.newHostName;
        setHostId(newHostId);
        if (newHostId === userId) {
          setIsHost(true);
          setCrownNotice('Du bist jetzt der Leader! 👑');
          setTimeout(() => setCrownNotice(null), 3000);
        } else {
          setIsHost(false);
          setCrownNotice(`${newHostName} ist jetzt der Leader!`);
          setTimeout(() => setCrownNotice(null), 3000);
        }
      })
      .on('broadcast', { event: 'room_closed' }, () => {
        // Use ref to avoid stale closure
        if (!isHostRef.current) {
          setKickedNotice('Der Raum wurde vom Leader geschlossen.');
          setTimeout(() => {
            leaveRoom();
            setKickedNotice(null);
          }, 3000);
        }
      })
      .on('broadcast', { event: 'playlist_selected' }, (payload) => {
        // Leader selected a playlist — update local state for all players
        const songs = payload.payload.songs || [];
        setSelectedSongs(songs);
        setSelectedPlaylist({ id: 'remote', title: payload.payload.playlistTitle, is_preset: true, created_by: null });
      })
      .on('broadcast', { event: 'game_start' }, (payload) => {
        // Broadcast-based start — songs are sent directly so all clients use the same playlist
        const songs = payload.payload.songs || [];
        onGameStart(code, null, payload.payload.mode || 'beat_up', songs);
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `room_code=eq.${code}`,
      }, (payload) => {
        if (payload.new.is_playing) {
          onGameStart(code, payload.new.playlist_id, payload.new.mode || 'beat_up', selectedSongsRef.current);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ name: username, online_at: new Date().toISOString(), ready: false, profile, role: userRole });
          // Load host_id from DB on join
          if (!asHost) {
            const { data } = await supabase.from('game_rooms').select('host_id').eq('room_code', code).maybeSingle();
            if (data) {
              setHostId(data.host_id);
              setIsHost(data.host_id === userId);
            }
          }
        }
      });

    channelRef.current = channel;
  };

  const isReadyRef = useRef(false);

  const toggleReady = () => {
    const newReady = !isReadyRef.current;
    isReadyRef.current = newReady;
    setIsReady(newReady);
    if (channelRef.current) {
      channelRef.current.track({ name: username, ready: newReady, profile, role: userRole });
    }
  };

  const startGame = async () => {
    if (!inRoom) return;
    const allReady = players.length >= 2 && players.every(p => p.ready);
    if (!allReady) return;
    await supabase.from('game_rooms').update({ is_playing: true }).eq('room_code', inRoom);
  };

  // Auto-start: when all players are ready (minimum 2), any client triggers the DB update
  // The update is idempotent (setting is_playing=true twice is harmless)
  // and the postgres_changes listener on the channel fires onGameStart for everyone
  const autoStartFired = useRef(false);
  useEffect(() => {
    if (!inRoom || players.length < 2) { autoStartFired.current = false; return; }
    const allReady = players.every(p => p.ready);
    if (allReady && !autoStartFired.current) {
      autoStartFired.current = true;
      const timer = setTimeout(() => {
        const songs = selectedSongsRef.current;
        console.log('[RoomBrowser] Auto-start: all ready, starting game with', songs.length, 'songs');
        // Update DB
        supabase.from('game_rooms').update({ is_playing: true }).eq('room_code', inRoom)
          .then(({ error }) => {
            if (error) {
              console.warn('[RoomBrowser] Auto-start DB update failed:', error.message);
              autoStartFired.current = false;
            }
          });
        // Broadcast start with songs directly — all clients get the same playlist
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'game_start',
            payload: { mode: selectedMode, songs },
          });
        }
        // Fallback: start locally after 2s if neither listener fires
        setTimeout(() => {
          onGameStart(inRoom, null, selectedMode, songs);
        }, 2000);
      }, 1500);
      return () => { clearTimeout(timer); autoStartFired.current = false; };
    }
    if (!allReady) { autoStartFired.current = false; }
  }, [players, inRoom]);

  const leaveRoom = () => {
    const currentInRoom = inRoomRef.current || inRoom;
    const currentIsHost = isHostRef.current || isHost;
    const channelToRemove = channelRef.current;
    channelRef.current = null;

    // If we're the host, transfer crown to next player before leaving
    if (currentIsHost && channelToRemove && players.length > 1) {
      const nextPlayer = players.find(p => p.id !== userId);
      if (nextPlayer) {
        // Update DB FIRST (synchronous source of truth)
        if (currentInRoom) {
          supabase.from('game_rooms').update({ host_id: nextPlayer.id }).eq('room_code', currentInRoom).then(() => {}, () => {});
        }
        // Broadcast crown transfer, then remove channel after a delay so it arrives
        channelToRemove.send({
          type: 'broadcast',
          event: 'crown_transfer',
          payload: { newHostId: nextPlayer.id, newHostName: nextPlayer.name },
        });
        // Delay channel removal so the broadcast can be delivered
        setTimeout(() => supabase.removeChannel(channelToRemove), 500);
      } else {
        supabase.removeChannel(channelToRemove);
      }
    } else {
      // If we're the last player, delete the room from DB (auto-close)
      if (players.length <= 1 && currentInRoom) {
        supabase.from('game_rooms').delete().eq('room_code', currentInRoom).then(() => {}, () => {});
      }
      if (channelToRemove) {
        supabase.removeChannel(channelToRemove);
      }
    }

    // Notify lobby that room list changed
    if (lobbyChannelRef.current) {
      lobbyChannelRef.current.send({ type: 'broadcast', event: 'room_update', payload: {} });
    }

    setInRoom(null);
    setIsHost(false);
    setIsReady(false);
    isReadyRef.current = false;
    hostLookupDone.current = false;
    setPlayers([]);
    setHostId(null);
    setPlayerMenuOpen(null);
    setShowCloseConfirm(false);
  };

  // ── Leader Actions ──

  const kickPlayer = (targetId: string) => {
    if (!isHost || !channelRef.current || targetId === userId) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'kick',
      payload: { targetId, reason: 'Du wurdest vom Leader aus dem Raum entfernt.' },
    });
    setPlayerMenuOpen(null);
  };

  const transferCrown = async (newHostId: string) => {
    if (!isHost || !channelRef.current || !inRoom || newHostId === userId) return;
    const newHostPlayer = players.find(p => p.id === newHostId);
    
    // Update DB
    await supabase.from('game_rooms').update({ host_id: newHostId }).eq('room_code', inRoom);

    // Broadcast to all players
    channelRef.current.send({
      type: 'broadcast',
      event: 'crown_transfer',
      payload: { newHostId, newHostName: newHostPlayer?.name || 'Unbekannt' },
    });

    // Update local state
    setHostId(newHostId);
    setIsHost(false);
    setPlayerMenuOpen(null);
  };

  const closeRoom = async () => {
    if (!isHost || !inRoom) return;

    // Broadcast room closure to all players
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'room_closed',
        payload: {},
      });
    }

    // Delete the room from DB
    await supabase.from('game_rooms').delete().eq('room_code', inRoom);

    // Leave the room locally
    leaveRoom();
  };

  const filteredRooms = filterMode === 'all' ? rooms : rooms.filter(r => r.mode === filterMode);

  // ── Kicked / Crown Notice Overlay ──
  const noticeOverlay = (kickedNotice || crownNotice) && (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-2xl font-black uppercase tracking-wider flex items-center gap-3 shadow-2xl border ${
        kickedNotice
          ? 'bg-gradient-to-r from-red-900 to-red-800 text-red-200 border-red-500/50'
          : 'bg-gradient-to-r from-yellow-900 to-amber-800 text-yellow-200 border-yellow-500/50'
      }`}
    >
      {kickedNotice ? <ShieldAlert size={20} /> : <Crown size={20} />}
      {kickedNotice || crownNotice}
    </motion.div>
  );

  // ── In Room View ──
  if (inRoom) {
    const allReady = players.length >= 2 && players.every(p => p.ready);

    return (
      <div className="fixed inset-0 bg-[#1a0a2e] flex z-50 font-sans text-white">
        <AnimatePresence>{noticeOverlay}</AnimatePresence>

        {/* Left: Player Avatars on Stage */}
        <div className="flex-1 relative flex flex-col items-center justify-center">
          {/* Top Bar */}
          <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={leaveRoom} className="px-5 py-2 bg-purple-900/50 hover:bg-red-600 border border-purple-700 rounded-full text-sm font-black uppercase tracking-widest transition-colors">
                Verlassen
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-900/50 border border-purple-700/50 rounded-full">
                <span className="text-purple-400 text-xs font-black uppercase tracking-widest">Code:</span>
                <span className="text-cyan-400 font-mono font-black text-lg tracking-widest">{inRoom}</span>
                <button onClick={() => navigator.clipboard.writeText(inRoom)} className="p-1 hover:bg-purple-800 rounded text-purple-400">
                  <Copy size={14} />
                </button>
              </div>
              {isHost && (
                <div className="flex items-center gap-1 px-3 py-2 bg-yellow-900/30 border border-yellow-500/30 rounded-full">
                  <Crown size={14} className="text-yellow-400" />
                  <span className="text-yellow-300 text-xs font-black uppercase tracking-widest">Leader</span>
                </div>
              )}
            </div>

            {/* Host: Close Room Button */}
            {isHost && (
              <div className="relative">
                {showCloseConfirm ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-900/80 backdrop-blur-xl border border-red-500/50 rounded-2xl shadow-2xl"
                  >
                    <AlertTriangle size={16} className="text-red-400" />
                    <span className="text-sm font-bold text-red-200">Raum wirklich schließen?</span>
                    <button
                      onClick={closeRoom}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-white text-xs font-black uppercase tracking-wider transition-colors"
                    >
                      Ja
                    </button>
                    <button
                      onClick={() => setShowCloseConfirm(false)}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-xs font-black uppercase tracking-wider transition-colors"
                    >
                      Nein
                    </button>
                  </motion.div>
                ) : (
                  <button
                    onClick={() => setShowCloseConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-800/50 border border-red-500/30 hover:border-red-400/50 rounded-full text-red-400 hover:text-red-300 transition-all text-sm font-black uppercase tracking-widest"
                  >
                    <Trash2 size={14} />
                    <span className="hidden sm:inline">Raum schließen</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Player Count */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-900/30 border border-purple-700/30 rounded-full">
              <Users size={14} className="text-purple-400" />
              <span className="text-purple-300 font-black text-sm">{players.length} Spieler im Raum</span>
            </div>
          </div>

          {/* Avatare auf der Bühne */}
          <div className="flex items-end gap-8 flex-wrap justify-center px-8">
            {players.map((p) => {
              const isThisHost = p.id === hostId;
              const isMe = p.id === userId;

              return (
                <div key={p.id} className="flex flex-col items-center relative group">
                  {/* Player Card */}
                  <div className={`w-32 h-40 rounded-2xl overflow-hidden border-2 bg-gradient-to-b from-purple-900/60 to-black/60 relative transition-all flex items-center justify-center ${
                    isThisHost ? 'border-yellow-500/70 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-purple-700/50'
                  }`}>
                    {/* Lightweight avatar placeholder (no 3D renderer to save GPU) */}
                    <div className="text-5xl select-none">
                      {p.profile?.rpm_url ? '🧑' : '🤖'}
                    </div>
                    {p.ready && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                    {isThisHost && (
                      <div className="absolute top-2 left-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                        <Crown size={12} className="text-black" />
                      </div>
                    )}

                    {/* Host context menu trigger — shown on other players */}
                    {isHost && !isMe && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlayerMenuOpen(playerMenuOpen === p.id ? null : p.id);
                        }}
                        className="absolute bottom-2 right-2 w-7 h-7 bg-gray-900/80 hover:bg-pink-600 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-gray-700 hover:border-pink-400"
                      >
                        <MoreVertical size={14} />
                      </button>
                    )}
                  </div>

                  {/* Player Name */}
                  <div className="mt-2 flex items-center gap-1 flex-wrap justify-center">
                    <span className={`text-sm font-bold ${isMe ? 'text-cyan-300' : 'text-purple-200'}`}>
                      {p.name} {isMe && '(Du)'}
                    </span>
                    {p.role && p.role !== 'user' && <RoleBadge role={p.role} size="sm" />}
                  </div>
                  <span className={`text-xs font-black uppercase ${p.ready ? 'text-green-400' : 'text-gray-600'}`}>
                    {p.ready ? (isThisHost ? 'Leader ✓' : 'Bereit ✓') : (isThisHost ? 'Leader' : 'Wartet...')}
                  </span>

                  {/* ── Context Menu (Kick / Crown) ── */}
                  <AnimatePresence>
                    {playerMenuOpen === p.id && isHost && !isMe && (
                      <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        className="absolute top-full mt-2 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden min-w-[180px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => transferCrown(p.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-yellow-300 hover:bg-yellow-900/30 transition-colors text-left"
                        >
                          <Crown size={16} className="text-yellow-400" />
                          Zum Leader machen
                        </button>
                        <div className="h-px bg-gray-800" />
                        <button
                          onClick={() => kickPlayer(p.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-900/30 transition-colors text-left"
                        >
                          <DoorOpen size={16} className="text-red-400" />
                          Aus Raum kicken
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Song Picker (Leader & all players see selection) */}
          <div className="mt-6 w-full max-w-xl px-8">
            {/* Current selection display */}
            <div className="flex items-center gap-3 mb-3">
              <Music size={16} className="text-pink-400" />
              <span className="text-sm font-bold text-purple-300">
                {selectedSongs.length > 0
                  ? `${selectedPlaylist?.title || 'Playlist'} — ${selectedSongs.length} Songs`
                  : 'Kein Song ausgewählt (Default wird genutzt)'}
              </span>
              {selectedSongs.length > 0 && selectedSongs[0] && (
                <span className="text-xs text-purple-500 truncate max-w-[200px]">
                  ({selectedSongs[0].title}{selectedSongs.length > 1 ? ` +${selectedSongs.length - 1}` : ''})
                </span>
              )}
            </div>

            {/* Song picker toggle (Leader only) */}
            {isHost && (
              <>
                <button
                  onClick={() => setShowSongPicker(!showSongPicker)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-900/50 hover:bg-purple-800/50 border border-purple-700/30 rounded-xl text-sm font-bold text-purple-300 transition-colors w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <ListMusic size={14} />
                    Song / Playlist wählen
                  </span>
                  {showSongPicker ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                <AnimatePresence>
                  {showSongPicker && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 bg-purple-950/80 border border-purple-700/30 rounded-xl max-h-64 overflow-y-auto">
                        {LOCAL_PRESETS.map(preset => (
                          <div key={preset.id}>
                            {/* Playlist header */}
                            <button
                              onClick={() => setSongPickerExpanded(songPickerExpanded === preset.id ? null : preset.id)}
                              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold hover:bg-purple-800/30 transition-colors ${
                                selectedPlaylist?.id === preset.id ? 'text-pink-300 bg-pink-900/20' : 'text-purple-200'
                              }`}
                            >
                              <span>{preset.title}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPlaylist(preset);
                                    setSelectedSongs(preset.songs || []);
                                    setShowSongPicker(false);
                                    // Broadcast playlist selection to other players
                                    if (channelRef.current) {
                                      channelRef.current.send({
                                        type: 'broadcast',
                                        event: 'playlist_selected',
                                        payload: { playlistTitle: preset.title, songCount: preset.songs?.length || 0, songs: preset.songs || [] },
                                      });
                                    }
                                  }}
                                  className="px-2 py-1 bg-pink-600/50 hover:bg-pink-500 rounded-lg text-xs text-white font-black uppercase"
                                >
                                  Alle
                                </button>
                                {songPickerExpanded === preset.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </div>
                            </button>

                            {/* Song list */}
                            <AnimatePresence>
                              {songPickerExpanded === preset.id && preset.songs && (
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: 'auto' }}
                                  exit={{ height: 0 }}
                                  className="overflow-hidden"
                                >
                                  {preset.songs.map(song => (
                                    <button
                                      key={song.id}
                                      onClick={() => {
                                        setSelectedPlaylist(preset);
                                        setSelectedSongs([song]);
                                        setShowSongPicker(false);
                                        if (channelRef.current) {
                                          channelRef.current.send({
                                            type: 'broadcast',
                                            event: 'playlist_selected',
                                            payload: { playlistTitle: song.title, songCount: 1, songs: [song] },
                                          });
                                        }
                                      }}
                                      className="w-full flex items-center gap-3 px-6 py-2 text-xs hover:bg-purple-800/30 transition-colors text-left"
                                    >
                                      <Play size={10} className="text-purple-500 shrink-0" />
                                      <span className="text-purple-300 truncate">{song.title}</span>
                                      {song.bpm && <span className="text-purple-600 text-[10px] shrink-0">{song.bpm} BPM</span>}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>

          {/* Controls */}
          <div className="mt-4 flex gap-4">
            {/* Everyone can toggle ready */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleReady}
              className={`px-12 py-4 rounded-2xl font-black text-xl uppercase tracking-widest ${
                isReady
                  ? 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600'
              }`}
            >
              {isReady ? '✓ Bereit!' : 'Bereit?'}
            </motion.button>

            {/* Auto-start hint */}
            {players.length >= 2 && (
              <div className="flex items-center px-4 text-sm text-purple-400 font-bold">
                {allReady
                  ? <span className="text-green-400 animate-pulse">Spiel startet...</span>
                  : <span>{players.filter(p => p.ready).length}/{players.length} bereit</span>
                }
              </div>
            )}
          </div>
        </div>

        {/* Right: Chat */}
        <div className="w-80 border-l border-purple-800/30 p-4 flex flex-col">
          <Chat channelName={inRoom} userId={userId} username={username} minimizable={false} />
        </div>
      </div>
    );
  }

  // ── Room Browser ──
  return (
    <div className="fixed inset-0 bg-[#1a0a2e] flex z-50 font-sans text-white">
      {/* Left: Room List */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 bg-purple-900/50 hover:bg-purple-800 border border-purple-700/30 rounded-xl text-purple-400">
                <ArrowDown size={16} className="rotate-90" />
              </button>
              <div>
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 uppercase tracking-wider">
                  Multiplayer Lobby
                </h1>
                <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mt-1">{rooms.length} Räume &middot; {onlinePlayers.length} Spieler online</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={quickJoin}
              className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center gap-2">
              <Zap size={14} /> Quick Match
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(236,72,153,0.3)] flex items-center gap-2">
              <Plus size={14} /> Raum erstellen
            </motion.button>
            <button onClick={() => loadRooms(false)} className="p-2.5 bg-purple-900/50 hover:bg-purple-800 border border-purple-700/30 rounded-xl text-purple-400 transition-colors">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Join by Code */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && joinByCode()}
              placeholder="Raum-Code eingeben..."
              maxLength={8}
              className="flex-1 bg-purple-900/30 border border-purple-700/30 rounded-xl px-4 py-2.5 text-white placeholder-purple-600 focus:border-cyan-500 outline-none text-sm font-mono tracking-widest uppercase"
            />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={joinByCode}
              disabled={joinCode.trim().length < 4}
              className={`px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-black uppercase tracking-wider text-xs flex items-center gap-2 ${joinCode.trim().length < 4 ? 'opacity-40' : ''}`}>
              <LogIn size={14} /> Beitreten
            </motion.button>
          </div>
        </div>

        {/* Mode Filters */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterMode === 'all' ? 'bg-pink-600 text-white' : 'bg-purple-900/30 text-purple-400 border border-purple-700/30'}`}>
            Alle
          </button>
          {GAME_MODES.map(m => (
            <button key={m.id} onClick={() => setFilterMode(m.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterMode === m.id ? 'bg-pink-600 text-white' : 'bg-purple-900/30 text-purple-400 border border-purple-700/30'}`}>
              {m.name}
            </button>
          ))}
        </div>

        {/* Room List */}
        <div className="space-y-2">
          {filteredRooms.length === 0 ? (
            <div className="text-center py-16">
              <Users size={48} className="text-purple-700 mx-auto mb-4" />
              <p className="text-purple-400 font-bold uppercase tracking-wider">Keine offenen Räume</p>
              <p className="text-purple-600 text-sm mt-2">Erstelle einen neuen Raum!</p>
            </div>
          ) : (
            filteredRooms.map(room => {
              const ModeIcon = MODE_ICONS[room.mode] || Zap;
              const modeConfig = GAME_MODES.find(m => m.id === room.mode);

              return (
                <motion.div key={room.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-4 bg-purple-950/50 border border-purple-800/30 rounded-2xl hover:border-purple-600/50 transition-colors group cursor-pointer"
                  onClick={() => joinRoom(room.room_code)}>
                  {/* Mode Icon */}
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${modeConfig?.color || 'from-cyan-500 to-blue-600'} flex items-center justify-center shadow-lg`}>
                    <ModeIcon size={18} className="text-white" />
                  </div>

                  {/* Room Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-bold text-sm">{room.name}</h3>
                      {room.is_locked && <Lock size={11} className="text-yellow-400" />}
                    </div>
                    <p className="text-purple-500 text-xs font-bold">{modeConfig?.name || room.mode} — <span className="font-mono">{room.room_code}</span></p>
                  </div>

                  {/* Player Count */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/30 rounded-lg border border-purple-700/30">
                    <Users size={12} className="text-purple-400" />
                    <span className="text-purple-300 font-black text-xs">{room.current_players}/{room.max_players}</span>
                  </div>

                  {/* Join Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => { e.stopPropagation(); joinRoom(room.room_code); }}
                    className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-black uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] opacity-0 group-hover:opacity-100 transition-all"
                  >
                    Beitreten
                  </motion.button>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Sidebar: Online Players + Global Chat */}
      <div className="w-80 border-l border-purple-800/30 flex flex-col bg-purple-950/30">
        {/* Online Players */}
        <div className="p-4 border-b border-purple-800/30">
          <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Circle size={8} className="text-green-400 fill-green-400" /> {onlinePlayers.length} Online
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {onlinePlayers.map(p => (
              <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-purple-900/30 transition-colors">
                <Circle size={6} className="text-green-400 fill-green-400 flex-shrink-0" />
                <span className={`text-xs font-bold truncate ${p.id === userId ? 'text-cyan-300' : 'text-purple-200'}`}>
                  {p.name} {p.id === userId && '(Du)'}
                </span>
                {p.role && p.role !== 'user' && <RoleBadge role={p.role} size="sm" />}
              </div>
            ))}
            {onlinePlayers.length === 0 && (
              <p className="text-purple-600 text-xs text-center py-2">Niemand online</p>
            )}
          </div>
        </div>

        {/* Global Lobby Chat */}
        <div className="flex-1 min-h-0">
          <Chat channelName="lobby:chat" userId={userId} username={username} userRole={userRole} minimizable={false} />
        </div>
      </div>

      {/* Create Room Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-xl"
            onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-purple-950 border border-purple-700/50 rounded-[32px] p-8 max-w-md w-full mx-4 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-white uppercase tracking-wider">Neuer Raum</h2>
                <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-purple-800 rounded-xl text-purple-400">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-black text-purple-400 uppercase tracking-widest mb-2 block">Raum-Name</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={e => setRoomName(e.target.value)}
                    placeholder={`${username}'s Raum`}
                    className="w-full bg-purple-900/30 border border-purple-700/30 rounded-xl px-4 py-3 text-white placeholder-purple-600 focus:border-pink-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-purple-400 uppercase tracking-widest mb-2 block">Spielmodus</label>
                  <div className="grid grid-cols-2 gap-2">
                    {GAME_MODES.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMode(m.id)}
                        className={`p-3 rounded-xl text-xs font-black uppercase tracking-wider text-left transition-all ${
                          selectedMode === m.id
                            ? `bg-gradient-to-r ${m.color} text-white shadow-lg`
                            : 'bg-purple-900/30 text-purple-400 border border-purple-700/30 hover:border-purple-500'
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>

                {createError && (
                  <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-xl text-red-300 text-sm font-bold text-center">
                    {createError}
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: creating ? 1 : 1.02 }}
                  whileTap={{ scale: creating ? 1 : 0.98 }}
                  onClick={createRoom}
                  disabled={creating}
                  className={`w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 rounded-2xl text-white font-black text-lg uppercase tracking-widest shadow-[0_0_30px_rgba(236,72,153,0.4)] flex items-center justify-center gap-3 ${creating ? 'opacity-60 cursor-wait' : ''}`}
                >
                  {creating && <RefreshCw size={18} className="animate-spin" />}
                  {creating ? 'Wird erstellt...' : 'Raum erstellen'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
