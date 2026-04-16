/**
 * RoomBrowser — Audition-style Raum-Browser mit 20 festen Räumen, Quick Join, und Custom Rooms
 *
 * Fixed Rooms: 5 Räume pro Modus (Beat Up, Beat Rush, Freestyle, Club Dance)
 * Leader = der am längsten im Raum befindliche Spieler (earliest joiner)
 *
 * Leader Features:
 * - Spieler kicken
 * - Krone (Leadership) weitergeben
 * - Raum schließen (nur Custom Rooms)
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

// ── Fixed Room Configuration ──

interface FixedRoom {
  channelName: string;
  displayName: string;
  mode: GameMode;
  index: number;
}

const FIXED_ROOMS: FixedRoom[] = (['beat_up', 'beat_rush', 'freestyle', 'club_dance'] as GameMode[]).flatMap(mode =>
  Array.from({ length: 5 }, (_, i) => ({
    channelName: `fixed:${mode}:${i + 1}`,
    displayName: `${mode.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} #${i + 1}`,
    mode,
    index: i + 1,
  }))
);

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
  rejoinRoomCode?: string | null;
  onGameStart: (roomCode: string, playlistId: string | null, mode: GameMode, songs?: PlaylistSong[], liveJoin?: boolean, startedAt?: number) => void;
  onBack: () => void;
}

const MODE_ICONS: Record<string, typeof Zap> = { beat_up: Zap, beat_rush: ArrowDown, freestyle: Sparkles, club_dance: Users };

export function RoomBrowser({ userId, username, profile, userRole = 'user', rejoinRoomCode, onGameStart, onBack }: RoomBrowserProps) {
  // Track status of fixed rooms (player count + playing state) from lobby broadcasts
  const [fixedRoomStatus, setFixedRoomStatus] = useState<Record<string, { count: number; playing: boolean }>>({});
  const [roomIsPlaying, setRoomIsPlaying] = useState(false); // true if a game is already running in this room
  const [roomStartedAt, setRoomStartedAt] = useState(0); // timestamp when the room's game started
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [inRoom, setInRoom] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<{ id: string; name: string; ready: boolean; profile?: PlayerProfile; role?: UserRole; joined_at?: number }[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>('beat_up');
  const [roomName, setRoomName] = useState('');
  const [filterMode, setFilterMode] = useState<GameMode | 'all'>('beat_up');

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
  const [contextMenu, setContextMenu] = useState<{ playerId: string; playerName: string; x: number; y: number } | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [kickedNotice, setKickedNotice] = useState<string | null>(null);
  const [crownNotice, setCrownNotice] = useState<string | null>(null);

  const channelRef = useRef<any>(null);
  // Refs to avoid stale closures inside Supabase realtime callbacks
  const hostIdRef = useRef<string | null>(null);
  const isHostRef = useRef(false);
  const inRoomRef = useRef<string | null>(null);
  const selectedSongsRef = useRef<PlaylistSong[]>([]);
  const isFixedRoomRef = useRef(false);
  const gameCheckCleanup = useRef<(() => void) | null>(null);
  const hadPlayersRef = useRef(false); // track if we ever saw players (prevents auto-delete on join)

  // Keep refs in sync with state
  useEffect(() => { hostIdRef.current = hostId; }, [hostId]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => { inRoomRef.current = inRoom; }, [inRoom]);
  useEffect(() => { selectedSongsRef.current = selectedSongs; }, [selectedSongs]);

  const mountedRef = useRef(true);

  // Auto-rejoin room after returning from a game
  const rejoinHandled = useRef(false);
  useEffect(() => {
    if (rejoinRoomCode && !rejoinHandled.current) {
      rejoinHandled.current = true;
      // Reset ready state but keep songs (they're locked to the room)
      setIsReady(false);
      isReadyRef.current = false;
      autoStartFired.current = false;
      setRoomIsPlaying(false);
      setInRoom(rejoinRoomCode);

      // Listen on the game channel to detect if anyone is still playing
      // Clean up previous check if any
      if (gameCheckCleanup.current) gameCheckCleanup.current();

      const gameCheckCh = supabase.channel(`game:${rejoinRoomCode}`);
      let lastPositionTime = 0;
      let stopped = false;
      const cleanup = () => {
        if (stopped) return;
        stopped = true;
        clearInterval(checkInterval);
        try { supabase.removeChannel(gameCheckCh); } catch {}
        gameCheckCleanup.current = null;
      };
      gameCheckCleanup.current = cleanup;

      gameCheckCh.on('broadcast', { event: 'song_position' }, (payload) => {
        if (stopped) return;
        lastPositionTime = Date.now();
        setRoomIsPlaying(true);
        // Save the room's start timestamp for sync
        if (payload.payload?.startedAt) {
          setRoomStartedAt(payload.payload.startedAt);
        }
        if (payload.payload?.songTitle && payload.payload?.videoId) {
          const liveSong = {
            video_id: payload.payload.videoId,
            title: payload.payload.songTitle,
            bpm: payload.payload.bpm || 120,
            id: 'live',
            position: 0,
          };
          setSelectedSongs([liveSong]);
        }
      });
      gameCheckCh.subscribe();

      // Periodically check if broadcasts stopped (= nobody playing anymore)
      const checkInterval = setInterval(() => {
        if (lastPositionTime > 0 && Date.now() - lastPositionTime > 6000) {
          setRoomIsPlaying(false);
          cleanup();
        }
      }, 3000);
      // Initial timeout: if no broadcast after 5s, nobody is playing
      setTimeout(() => {
        if (lastPositionTime === 0 && !stopped) {
          setRoomIsPlaying(false);
          cleanup();
        }
      }, 5000);

      const isFixed = rejoinRoomCode.startsWith('fixed:');
      isFixedRoomRef.current = isFixed;

      if (isFixed) {
        const fixedRoom = FIXED_ROOMS.find(r => r.channelName === rejoinRoomCode);
        setSelectedMode(fixedRoom?.mode || 'beat_up');
        setIsHost(false);
        joinChannel(rejoinRoomCode, false, true);
      } else {
        // Check DB to determine if we're still the host
        supabase.from('game_rooms').select('host_id').eq('room_code', rejoinRoomCode).maybeSingle().then(({ data }) => {
          const amHost = data?.host_id === userId;
          setIsHost(amHost);
          setHostId(data?.host_id || userId);
          joinChannel(rejoinRoomCode, amHost, false);
        }, () => {
          // Room might be gone — just join as non-host
          setIsHost(false);
          joinChannel(rejoinRoomCode, false, false);
        });
      }
    }
  }, [rejoinRoomCode]);

  useEffect(() => {
    mountedRef.current = true;

    // Global lobby presence — shows who's in the multiplayer lobby
    const lobbyChannel = supabase.channel('lobby:global', {
      config: { presence: { key: userId } },
    });
    lobbyChannel.on('presence', { event: 'sync' }, () => {
      const state = lobbyChannel.presenceState();
      const lobbyPlayers: { id: string; name: string; role?: UserRole }[] = [];
      for (const [key, value] of Object.entries(state)) {
        const v = (value as any)[0];
        lobbyPlayers.push({ id: key, name: v.name, role: v.role });
      }
      setOnlinePlayers(lobbyPlayers);
    });
    // Listen for room status updates from players in rooms
    lobbyChannel.on('broadcast', { event: 'room_status' }, (payload) => {
      const { channelName, count, playing } = payload.payload;
      if (channelName) {
        setFixedRoomStatus(prev => ({ ...prev, [channelName]: { count: count || 0, playing: !!playing } }));
      }
    });
    lobbyChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await lobbyChannel.track({ name: username, role: userRole });
      }
    });
    lobbyChannelRef.current = lobbyChannel;

    return () => {
      mountedRef.current = false;
      lobbyChannel.unsubscribe().then(() => supabase.removeChannel(lobbyChannel)).catch(() => supabase.removeChannel(lobbyChannel));
    };
  }, []);

  // Close player menu / context menu when clicking outside
  useEffect(() => {
    const handler = () => { setPlayerMenuOpen(null); setContextMenu(null); };
    if (playerMenuOpen || contextMenu) {
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [playerMenuOpen, contextMenu]);

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
    isFixedRoomRef.current = false;
    joinChannel(code, true, false);
  };

  const joinFixedRoom = (room: FixedRoom) => {
    setInRoom(room.channelName);
    setSelectedMode(room.mode);
    setIsHost(false);
    isFixedRoomRef.current = true;
    joinChannel(room.channelName, false, true);
  };

  const joinRoom = (code: string) => {
    setInRoom(code);
    setIsHost(false);
    isFixedRoomRef.current = false;
    joinChannel(code, false, false);
  };

  const joinByCode = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length >= 4) {
      joinRoom(code);
      setJoinCode('');
    }
  };

  const quickJoin = () => {
    // Pick a random fixed room to join
    const randomRoom = FIXED_ROOMS[Math.floor(Math.random() * FIXED_ROOMS.length)];
    joinFixedRoom(randomRoom);
  };

  const joinChannel = (code: string, asHost: boolean, isFixed: boolean) => {
    // Clean up any existing channels first
    if (channelRef.current) {
      try { supabase.removeChannel(channelRef.current); } catch {}
      channelRef.current = null;
    }

    // Also remove any leftover channel with the same room name
    const existing = supabase.getChannels().find(ch => ch.topic === `realtime:room:${code}`);
    if (existing) {
      try { supabase.removeChannel(existing); } catch {}
    }

    isFixedRoomRef.current = isFixed;

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
          if (!Array.isArray(entries) || entries.length === 0) continue;
          const v = entries[entries.length - 1];
          if (!v) continue;
          // For the current user, always use local ready state (no roundtrip delay)
          const ready = key === userId ? isReadyRef.current : (v.ready === true);
          activePlayers.push({ id: key, name: v.name, ready, profile: v.profile, role: v.role, joined_at: v.joined_at });
        }
        setPlayers(activePlayers);

        // Broadcast room status to lobby (throttled — only when player count changes)
        if (lobbyChannelRef.current && code.startsWith('fixed:')) {
          const countKey = `_lastBroadcastCount_${code}`;
          const lastCount = (window as any)[countKey] || 0;
          if (activePlayers.length !== lastCount) {
            (window as any)[countKey] = activePlayers.length;
            lobbyChannelRef.current.send({
              type: 'broadcast',
              event: 'room_status',
              payload: { channelName: code, count: activePlayers.length, playing: false },
            });
          }
        }

        // Use refs to get the latest values (avoid stale closures)
        const currentHostId = hostIdRef.current;
        const currentIsFixed = isFixedRoomRef.current;

        if (currentIsFixed) {
          // ── Fixed Room Leader Logic ──
          // Leader = longest-staying player (earliest joined_at)
          if (activePlayers.length > 0) {
            const sorted = [...activePlayers].sort((a, b) => (a.joined_at || 0) - (b.joined_at || 0));
            const leader = sorted[0]; // earliest joiner still present
            setHostId(leader.id);
            setIsHost(leader.id === userId);
          } else {
            setHostId(null);
            setIsHost(false);
          }
        } else {
          // ── Custom Room Leader Logic (DB-backed) ──

          // Auto-close: if no players remain and we had players for >3s, delete the room
          // Delay prevents race condition where room is deleted before host finishes joining
          if (activePlayers.length > 0) {
            hadPlayersRef.current = true;
          }
          if (activePlayers.length === 0 && inRoomRef.current && hadPlayersRef.current) {
            // Wait 3 seconds to confirm room is truly empty (prevents join race)
            setTimeout(() => {
              const state = channelRef.current?.presenceState?.();
              const stillEmpty = !state || Object.keys(state).length === 0;
              if (stillEmpty) {
                supabase.from('game_rooms').delete().eq('room_code', code).then(() => {}, (err: any) => console.warn('[RoomBrowser] auto-close failed:', err));
              }
            }, 3000);
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
            } else if (!currentHostId) {
              // We don't know the host yet — check DB once
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
              }, (err) => {
                console.warn('[RoomBrowser] host lookup failed:', err);
              });
            }
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
          setCrownNotice('Du bist jetzt der Leader!');
          setTimeout(() => setCrownNotice(null), 3000);
        } else {
          setIsHost(false);
          setCrownNotice(`${newHostName} ist jetzt der Leader!`);
          setTimeout(() => setCrownNotice(null), 3000);
        }
      })
      .on('broadcast', { event: 'room_closed' }, () => {
        // Use ref to avoid stale closure — only applies to custom rooms
        if (!isHostRef.current && !isFixedRoomRef.current) {
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
        const songs = payload.payload.songs || [];
        const startedAt = payload.payload.startedAt || Date.now();
        const isLateJoin = (Date.now() - startedAt) > 5000;
        onGameStart(code, null, payload.payload.mode || 'beat_up', songs, isLateJoin, startedAt);
      })
      .on('broadcast', { event: 'game_active' }, (payload) => {
        // Another player is already in a game in this room — show "live join" option
        if (payload.payload.playing) {
          setRoomIsPlaying(true);
        }
      });

    // Only listen for DB changes on custom rooms
    if (!isFixed) {
      channel.on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `room_code=eq.${code}`,
      }, (payload) => {
        if (payload.new.is_playing) {
          onGameStart(code, payload.new.playlist_id, payload.new.mode || 'beat_up', selectedSongsRef.current);
        }
      });
    }

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ name: username, online_at: new Date().toISOString(), ready: false, profile, role: userRole, joined_at: Date.now() });
        // Load host_id from DB on join (custom rooms only)
        if (!asHost && !isFixed) {
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
      channelRef.current.track({ name: username, ready: newReady, profile, role: userRole, joined_at: Date.now() });
    }
  };

  const startGame = async () => {
    if (!inRoom) return;
    const allReady = players.length >= 2 && players.every(p => p.ready);
    if (!allReady) return;
    if (!isFixedRoomRef.current) {
      await supabase.from('game_rooms').update({ is_playing: true }).eq('room_code', inRoom);
    }
  };

  // Auto-start: only the HOST triggers DB update + broadcast to avoid race conditions
  const autoStartFired = useRef(false);
  useEffect(() => {
    if (!inRoom || players.length < 2) { autoStartFired.current = false; return; }
    const allReady = players.every(p => p.ready);
    if (allReady && !autoStartFired.current) {
      autoStartFired.current = true;

      // Only the host initiates the start — other clients wait for the broadcast
      if (!isHostRef.current) return;

      const timer = setTimeout(() => {
        const songs = selectedSongsRef.current;
        console.log('[RoomBrowser] Host initiating auto-start with', songs.length, 'songs');
        // Update DB (only host, only custom rooms)
        if (!isFixedRoomRef.current) {
          supabase.from('game_rooms').update({ is_playing: true }).eq('room_code', inRoom)
            .then(({ error }) => {
              if (error) {
                console.warn('[RoomBrowser] Auto-start DB update failed:', error.message);
                autoStartFired.current = false;
              }
            });
        }
        // Broadcast start (only host)
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'game_start',
            payload: { mode: selectedMode, songs, startedAt: Date.now() },
          });
        }
        // Broadcast "playing" status to lobby
        if (lobbyChannelRef.current && isFixedRoomRef.current) {
          lobbyChannelRef.current.send({
            type: 'broadcast',
            event: 'room_status',
            payload: { channelName: inRoom, count: players.length, playing: true },
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
    const currentIsFixed = isFixedRoomRef.current;
    const channelToRemove = channelRef.current;
    channelRef.current = null;

    // Always untrack presence first so other clients see us leave immediately
    const cleanupChannel = (ch: any, delay = 0) => {
      if (!ch) return;
      ch.untrack().then(() => {
        if (delay > 0) {
          setTimeout(() => ch.unsubscribe().then(() => supabase.removeChannel(ch)), delay);
        } else {
          ch.unsubscribe().then(() => supabase.removeChannel(ch));
        }
      }, () => {
        // untrack failed — still clean up
        if (delay > 0) {
          setTimeout(() => supabase.removeChannel(ch), delay);
        } else {
          supabase.removeChannel(ch);
        }
      });
    };

    if (currentIsFixed) {
      // Fixed rooms: no DB operations, just clean up channel
      // Crown transfer via broadcast if host leaving with other players
      if (currentIsHost && channelToRemove && players.length > 1) {
        const nextPlayer = players.find(p => p.id !== userId);
        if (nextPlayer) {
          channelToRemove.send({
            type: 'broadcast',
            event: 'crown_transfer',
            payload: { newHostId: nextPlayer.id, newHostName: nextPlayer.name },
          });
          cleanupChannel(channelToRemove, 500);
        } else {
          cleanupChannel(channelToRemove);
        }
      } else {
        cleanupChannel(channelToRemove);
      }
    } else {
      // Custom rooms: DB operations for host transfer and cleanup
      if (currentIsHost && channelToRemove && players.length > 1) {
        const nextPlayer = players.find(p => p.id !== userId);
        if (nextPlayer) {
          if (currentInRoom) {
            supabase.from('game_rooms').update({ host_id: nextPlayer.id }).eq('room_code', currentInRoom).then(() => {}, (err: any) => console.warn('[RoomBrowser] crown transfer failed:', err));
          }
          channelToRemove.send({
            type: 'broadcast',
            event: 'crown_transfer',
            payload: { newHostId: nextPlayer.id, newHostName: nextPlayer.name },
          });
          cleanupChannel(channelToRemove, 500);
        } else {
          cleanupChannel(channelToRemove);
        }
      } else {
        // If we're the last player, delete the room from DB
        if (players.length <= 1 && currentInRoom) {
          supabase.from('game_rooms').delete().eq('room_code', currentInRoom).then(() => {}, () => {});
        }
        cleanupChannel(channelToRemove);
      }
    }

    setInRoom(null);
    setIsHost(false);
    setIsReady(false);
    isReadyRef.current = false;
    isFixedRoomRef.current = false;
    hadPlayersRef.current = false;
    setRoomIsPlaying(false);
    setRoomStartedAt(0);
    if (gameCheckCleanup.current) gameCheckCleanup.current();
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

    // Update DB (custom rooms only)
    if (!isFixedRoomRef.current) {
      await supabase.from('game_rooms').update({ host_id: newHostId }).eq('room_code', inRoom);
    }

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

    // Only custom rooms can be closed
    if (isFixedRoomRef.current) return;

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

  const filteredFixedRooms = filterMode === 'all' ? FIXED_ROOMS : FIXED_ROOMS.filter(r => r.mode === filterMode);

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
    const isFixedRoom = inRoom.startsWith('fixed:');
    const fixedRoomInfo = FIXED_ROOMS.find(r => r.channelName === inRoom);

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
              {isFixedRoom ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-900/50 border border-purple-700/50 rounded-full">
                  <span className="text-cyan-400 font-black text-lg">{fixedRoomInfo?.displayName}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-900/50 border border-purple-700/50 rounded-full">
                  <span className="text-purple-400 text-xs font-black uppercase tracking-widest">Code:</span>
                  <span className="text-cyan-400 font-mono font-black text-lg tracking-widest">{inRoom}</span>
                  <button onClick={() => navigator.clipboard.writeText(inRoom)} className="p-1 hover:bg-purple-800 rounded text-purple-400">
                    <Copy size={14} />
                  </button>
                </div>
              )}
              {isHost && (
                <div className="flex items-center gap-1 px-3 py-2 bg-yellow-900/30 border border-yellow-500/30 rounded-full">
                  <Crown size={14} className="text-yellow-400" />
                  <span className="text-yellow-300 text-xs font-black uppercase tracking-widest">Leader</span>
                </div>
              )}
            </div>

            {/* Host: Close Room Button (custom rooms only) */}
            {isHost && !isFixedRoom && (
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
              <Music size={16} className={roomIsPlaying ? 'text-orange-400 animate-pulse' : 'text-pink-400'} />
              <span className={`text-sm font-bold ${roomIsPlaying ? 'text-orange-300' : 'text-purple-300'}`}>
                {roomIsPlaying
                  ? `🎵 Spielt gerade: ${selectedSongs[0]?.title || 'Default Song'}`
                  : selectedSongs.length > 0
                    ? `${selectedPlaylist?.title || 'Playlist'} — ${selectedSongs.length} Songs`
                    : 'Kein Song ausgewählt (Default wird genutzt)'}
              </span>
              {!roomIsPlaying && selectedSongs.length > 0 && selectedSongs[0] && (
                <span className="text-xs text-purple-500 truncate max-w-[200px]">
                  ({selectedSongs[0].title}{selectedSongs.length > 1 ? ` +${selectedSongs.length - 1}` : ''})
                </span>
              )}
            </div>

            {/* Song picker toggle (Leader only, hidden when game is playing) */}
            {isHost && !roomIsPlaying && (
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
                            <div
                              onClick={() => setSongPickerExpanded(songPickerExpanded === preset.id ? null : preset.id)}
                              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold hover:bg-purple-800/30 transition-colors cursor-pointer ${
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
                            </div>

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
            {roomIsPlaying ? (
              /* Game is already running — show live join button */
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const songs = selectedSongsRef.current;
                  onGameStart(inRoom!, null, selectedMode, songs.length > 0 ? songs : undefined, true, roomStartedAt || undefined);
                }}
                className="px-12 py-4 rounded-2xl font-black text-xl uppercase tracking-widest bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-400 hover:to-pink-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] animate-pulse"
              >
                🎵 Live beitreten
              </motion.button>
            ) : (
              /* Normal ready toggle */
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
            )}

            {/* Auto-start hint */}
            {!roomIsPlaying && players.length >= 2 && (
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
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400 uppercase tracking-wider">
                  AUDITION LOBBY
                </h1>
                <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mt-1">
                  {filteredFixedRooms.length} Räume &middot; {onlinePlayers.length} Spieler online &middot; Max 6 pro Raum
                </p>
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

        {/* Mode Filter Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(['beat_up', 'beat_rush', 'freestyle', 'club_dance'] as GameMode[]).map(m => {
            const modeConfig = GAME_MODES.find(gm => gm.id === m);
            return (
              <button key={m} onClick={() => setFilterMode(m)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  filterMode === m ? 'bg-pink-600 text-white' : 'bg-purple-900/50 text-purple-300 border border-purple-700/30'
                }`}>
                {modeConfig?.name || m.replace('_', ' ')}
              </button>
            );
          })}
          <button onClick={() => setFilterMode('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              filterMode === 'all' ? 'bg-pink-600 text-white' : 'bg-purple-900/50 text-purple-300 border border-purple-700/30'
            }`}>
            Alle
          </button>
        </div>

        {/* Audition-Style Server List Table */}
        <div className="bg-purple-950/40 border border-purple-700/30 rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[50px_1fr_120px_100px_80px_90px] gap-0 px-4 py-2.5 bg-gradient-to-r from-pink-900/40 to-purple-900/40 border-b border-purple-700/30 text-[10px] font-black text-purple-400 uppercase tracking-[0.15em]">
            <span>#</span>
            <span>Raum</span>
            <span>Modus</span>
            <span>Status</span>
            <span>Spieler</span>
            <span></span>
          </div>

          {/* Room Rows */}
          <div className="divide-y divide-purple-800/20">
            {filteredFixedRooms.map((room, idx) => {
              const ModeIcon = MODE_ICONS[room.mode] || Zap;
              const modeConfig = GAME_MODES.find(m => m.id === room.mode);

              const status = fixedRoomStatus[room.channelName];
              const playerCount = status?.count || 0;
              const isPlaying = status?.playing || false;

              return (
                <motion.div
                  key={room.channelName}
                  whileHover={{ backgroundColor: 'rgba(168,85,247,0.1)' }}
                  onClick={() => joinFixedRoom(room)}
                  className={`grid grid-cols-[50px_1fr_120px_100px_80px_90px] gap-0 px-4 py-3 cursor-pointer transition-all group items-center ${
                    playerCount > 0
                      ? isPlaying ? 'bg-pink-950/10' : 'bg-purple-950/20'
                      : ''
                  }`}
                >
                  {/* Room Number */}
                  <span className="text-purple-500 font-mono text-xs font-bold">{idx + 1}</span>

                  {/* Room Name */}
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${modeConfig?.color || 'from-cyan-500 to-blue-600'} flex items-center justify-center shadow-md`}>
                      <ModeIcon size={12} className="text-white" />
                    </div>
                    <span className="text-white font-bold text-sm truncate">{room.displayName}</span>
                  </div>

                  {/* Mode */}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md w-fit ${
                    room.mode === 'beat_up' ? 'text-cyan-400 bg-cyan-900/30' :
                    room.mode === 'beat_rush' ? 'text-pink-400 bg-pink-900/30' :
                    room.mode === 'freestyle' ? 'text-yellow-400 bg-yellow-900/30' :
                    'text-green-400 bg-green-900/30'
                  }`}>
                    {modeConfig?.name || room.mode}
                  </span>

                  {/* Status */}
                  <span className={`text-xs font-bold ${
                    isPlaying ? 'text-orange-400' : playerCount > 0 ? 'text-green-400' : 'text-gray-600'
                  }`}>
                    {isPlaying ? '♪ Playing' : playerCount > 0 ? '● Waiting' : '○ Empty'}
                  </span>

                  {/* Player Count */}
                  <div className="flex items-center gap-1">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 6 }, (_, i) => (
                        <div key={i} className={`w-1.5 h-3 rounded-sm ${
                          i < playerCount ? 'bg-green-400' : 'bg-gray-700'
                        }`} />
                      ))}
                    </div>
                    <span className={`text-[10px] font-mono font-bold ml-1 ${playerCount > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                      {playerCount}/6
                    </span>
                  </div>

                  {/* Join Button */}
                  <div className="flex justify-end">
                    <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                      JOIN
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
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
              <div key={p.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-purple-900/30 transition-colors relative group"
                onContextMenu={(e) => {
                  if (p.id === userId) return;
                  e.preventDefault();
                  setContextMenu({ playerId: p.id, playerName: p.name, x: e.clientX, y: e.clientY });
                }}
              >
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

          {/* Context Menu for online players */}
          {contextMenu && (
            <div
              className="fixed z-[100] bg-purple-950 border border-purple-600/50 rounded-xl shadow-2xl py-1 min-w-[180px]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button
                onClick={async () => {
                  try {
                    // Check if already friends or pending
                    const { data: existing } = await supabase.from('friendships')
                      .select('id')
                      .or(`and(user_id.eq.${userId},friend_id.eq.${contextMenu.playerId}),and(user_id.eq.${contextMenu.playerId},friend_id.eq.${userId})`)
                      .maybeSingle();
                    if (existing) {
                      setContextMenu(null);
                      return;
                    }
                    await supabase.from('friendships').insert({
                      user_id: userId,
                      friend_id: contextMenu.playerId,
                      status: 'pending',
                    });
                  } catch {}
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2 text-sm text-purple-200 hover:bg-purple-800/50 flex items-center gap-2"
              >
                <Users size={14} /> Freund hinzufügen
              </button>
              <button
                onClick={() => setContextMenu(null)}
                className="w-full text-left px-4 py-2 text-sm text-purple-400 hover:bg-purple-800/50"
              >
                Abbrechen
              </button>
            </div>
          )}
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

                <div className="p-3 bg-purple-900/30 border border-purple-700/30 rounded-xl">
                  <p className="text-purple-400 text-xs text-center">Teile den Code mit Freunden zum Beitreten!</p>
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
