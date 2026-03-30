/**
 * FriendsList — Freundesliste mit Supabase Realtime Presence
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, UserPlus, Check, X, Search, Circle, ArrowLeft, MessageSquare, Gamepad2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { type UserRole } from '../lib/roles';
import { RoleBadge } from './RoleBadge';

interface Friend {
  id: string;
  friendId: string;
  username: string;
  level: number;
  role: UserRole;
  status: 'pending' | 'accepted' | 'blocked';
  isOnline: boolean;
  isIncoming: boolean;
}

interface FriendsListProps {
  userId: string;
  username: string;
  onBack: () => void;
  onInvite?: (friendId: string) => void;
}

export function FriendsList({ userId, username, onBack, onInvite }: FriendsListProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; level: number; role: UserRole }[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(!!data.session);
    });
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadFriends();
    } else {
      setLoading(false);
    }
  }, [userId, isAuthenticated]);

  const loadFriends = async () => {
    setLoading(true);
    // Outgoing friendships
    const { data: outgoing } = await supabase
      .from('friendships')
      .select('id, friend_id, status, profiles!friendships_friend_id_fkey(username, level, role)')
      .eq('user_id', userId);

    // Incoming friendships
    const { data: incoming } = await supabase
      .from('friendships')
      .select('id, user_id, status, profiles!friendships_user_id_fkey(username, level, role)')
      .eq('friend_id', userId);

    const friendList: Friend[] = [];

    outgoing?.forEach((f: any) => {
      friendList.push({
        id: f.id,
        friendId: f.friend_id,
        username: f.profiles?.username || 'Unbekannt',
        level: f.profiles?.level || 1,
        role: f.profiles?.role || 'user',
        status: f.status,
        isOnline: false,
        isIncoming: false,
      });
    });

    incoming?.forEach((f: any) => {
      friendList.push({
        id: f.id,
        friendId: f.user_id,
        username: f.profiles?.username || 'Unbekannt',
        level: f.profiles?.level || 1,
        role: f.profiles?.role || 'user',
        status: f.status,
        isOnline: false,
        isIncoming: true,
      });
    });

    setFriends(friendList);
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    if (!isAuthenticated) {
      setError('Du musst angemeldet sein, um Freunde zu suchen.');
      return;
    }
    setSearching(true);
    setError(null);
    try {
      // Use RPC to search profiles, bypassing RLS restrictions on the profiles table.
      // If the RPC doesn't exist, fall back to a direct query.
      let results: any[] = [];
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('search_profiles', { search_term: searchQuery.trim(), current_user_id: userId });
      if (rpcError) {
        // Fallback: direct query (works if profiles has a permissive SELECT policy)
        const { data, error: searchError } = await supabase
          .from('profiles')
          .select('id, username, level, role')
          .ilike('username', `%${searchQuery.trim()}%`)
          .neq('id', userId)
          .limit(10);
        if (searchError) throw searchError;
        results = data || [];
      } else {
        results = rpcData || [];
      }
      setSearchResults(results.map((d: any) => ({ id: d.id, username: d.username, level: d.level ?? 1, role: d.role || 'user' })));
      setHasSearched(true);
    } catch (err: any) {
      setError(err?.message || 'Suche fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (targetId: string) => {
    if (!isAuthenticated) {
      setError('Du musst angemeldet sein, um Freundschaftsanfragen zu senden.');
      return;
    }
    setError(null);
    try {
      // Check if a friendship already exists in either direction
      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${userId},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${userId})`);
      if (existing && existing.length > 0) {
        setError('Es besteht bereits eine Freundschaftsanfrage oder Freundschaft.');
        return;
      }
      const { error: insertError } = await supabase.from('friendships').insert({
        user_id: userId,
        friend_id: targetId,
        status: 'pending',
      });
      if (insertError) throw insertError;
      setSearchResults(prev => prev.filter(r => r.id !== targetId));
      loadFriends();
    } catch (err: any) {
      setError(err?.message || 'Freundschaftsanfrage konnte nicht gesendet werden.');
    }
  };

  const acceptRequest = async (friendshipId: string) => {
    setError(null);
    try {
      const { error: updateError } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
      if (updateError) throw updateError;
      loadFriends();
    } catch (err: any) {
      setError(err?.message || 'Anfrage konnte nicht angenommen werden.');
    }
  };

  const rejectRequest = async (friendshipId: string) => {
    setError(null);
    try {
      const { error: deleteError } = await supabase.from('friendships').delete().eq('id', friendshipId);
      if (deleteError) throw deleteError;
      loadFriends();
    } catch (err: any) {
      setError(err?.message || 'Anfrage konnte nicht abgelehnt werden.');
    }
  };

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const pendingRequests = friends.filter(f => f.status === 'pending');
  const incomingRequests = pendingRequests.filter(f => f.isIncoming);

  return (
    <div className="fixed inset-0 bg-[#1a0a2e] flex flex-col z-50 overflow-hidden font-sans text-white">
      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-purple-800/50 bg-purple-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-purple-900/50 hover:bg-pink-600 rounded-2xl transition-all group border border-purple-700">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <Users size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                Freunde
              </h1>
              <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">{acceptedFriends.length} Freunde</p>
            </div>
          </div>
        </div>

        {incomingRequests.length > 0 && (
          <div className="px-4 py-2 bg-pink-600/20 border border-pink-500/30 rounded-2xl">
            <span className="text-pink-300 font-black text-sm">{incomingRequests.length} Anfrage{incomingRequests.length > 1 ? 'n' : ''}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="relative z-20 flex gap-2 px-8 py-4 border-b border-purple-800/30 bg-purple-950/50 backdrop-blur-md">
        {(['friends', 'requests', 'search'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === tab
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.3)] border border-pink-400/50'
                : 'bg-purple-900/30 hover:bg-purple-900/50 text-gray-400 border border-purple-700/30'
            }`}
          >
            {tab === 'friends' ? 'Freunde' : tab === 'requests' ? `Anfragen${incomingRequests.length > 0 ? ` (${incomingRequests.length})` : ''}` : 'Suchen'}
          </button>
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="relative z-20 mx-8 mt-4 px-4 py-3 bg-red-900/40 border border-red-500/40 rounded-xl text-red-300 text-sm font-bold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-8 py-6">
        {!isAuthenticated && (
          <div className="flex flex-col items-center justify-center py-20">
            <Users size={48} className="text-purple-700 mb-4" />
            <p className="text-purple-400 font-bold uppercase tracking-wider">Anmeldung erforderlich</p>
            <p className="text-purple-600 text-sm mt-2">Du musst angemeldet sein, um die Freundesliste zu nutzen.</p>
          </div>
        )}
        {isAuthenticated && <AnimatePresence mode="wait">
          {activeTab === 'friends' && (
            <motion.div key="friends" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {acceptedFriends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Users size={48} className="text-purple-700 mb-4" />
                  <p className="text-purple-400 font-bold uppercase tracking-wider">Noch keine Freunde</p>
                  <p className="text-purple-600 text-sm mt-2">Nutze die Suche um Spieler zu finden!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {acceptedFriends.map(friend => (
                    <motion.div key={friend.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-4 p-4 bg-purple-950/50 border border-purple-800/30 rounded-2xl">
                      <div className="relative w-12 h-12 bg-purple-900/50 rounded-full flex items-center justify-center border border-purple-700/50">
                        <span className="text-lg font-black text-purple-300">{friend.username.slice(0, 2).toUpperCase()}</span>
                        <Circle
                          size={10}
                          className={`absolute -bottom-0.5 -right-0.5 ${friend.isOnline ? 'fill-green-400 text-green-400' : 'fill-gray-600 text-gray-600'}`}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-bold flex items-center gap-1.5">{friend.username} <RoleBadge role={friend.role} size="sm" /></p>
                        <p className="text-purple-500 text-xs font-bold">Level {friend.level}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 bg-purple-900/50 hover:bg-purple-800 rounded-xl text-purple-400 hover:text-white transition-colors border border-purple-700/30">
                          <MessageSquare size={16} />
                        </button>
                        {onInvite && (
                          <button onClick={() => onInvite(friend.friendId)} className="p-2 bg-cyan-900/50 hover:bg-cyan-600 rounded-xl text-cyan-400 hover:text-white transition-colors border border-cyan-500/30">
                            <Gamepad2 size={16} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'requests' && (
            <motion.div key="requests" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {incomingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <UserPlus size={48} className="text-purple-700 mb-4" />
                  <p className="text-purple-400 font-bold uppercase tracking-wider">Keine offenen Anfragen</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incomingRequests.map(req => (
                    <motion.div key={req.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-4 p-4 bg-purple-950/50 border border-pink-500/20 rounded-2xl">
                      <div className="w-12 h-12 bg-pink-900/30 rounded-full flex items-center justify-center border border-pink-500/30">
                        <span className="text-lg font-black text-pink-300">{req.username.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-bold">{req.username}</p>
                        <p className="text-pink-400 text-xs font-bold">Möchte dein Freund werden</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => acceptRequest(req.id)} className="p-2 bg-green-900/50 hover:bg-green-600 rounded-xl text-green-400 hover:text-white transition-colors border border-green-500/30">
                          <Check size={16} />
                        </button>
                        <button onClick={() => rejectRequest(req.id)} className="p-2 bg-red-900/50 hover:bg-red-600 rounded-xl text-red-400 hover:text-white transition-colors border border-red-500/30">
                          <X size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'search' && (
            <motion.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex gap-3 mb-6">
                <div className="flex-1 relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500" />
                  <input
                    type="text"
                    placeholder="Spielername suchen..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-12 pr-4 py-3 bg-purple-950/50 border border-purple-700/30 rounded-xl text-white placeholder-purple-600 focus:border-pink-500 outline-none"
                  />
                </div>
                <button onClick={handleSearch} className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl font-black uppercase tracking-wider text-sm hover:from-pink-500 hover:to-purple-500 transition-all">
                  Suchen
                </button>
              </div>

              {searching && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-purple-400 text-sm font-bold">Suche läuft...</p>
                </div>
              )}

              {!searching && hasSearched && searchResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Search size={48} className="text-purple-700 mb-4" />
                  <p className="text-purple-400 font-bold uppercase tracking-wider">Keine Spieler gefunden</p>
                  <p className="text-purple-600 text-sm mt-2">Versuche einen anderen Suchbegriff.</p>
                </div>
              )}

              <div className="space-y-3">
                {searchResults.map(user => {
                  const alreadyFriend = friends.some(f => f.friendId === user.id);
                  return (
                    <motion.div key={user.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-4 p-4 bg-purple-950/50 border border-purple-800/30 rounded-2xl">
                      <div className="w-12 h-12 bg-purple-900/50 rounded-full flex items-center justify-center border border-purple-700/50">
                        <span className="text-lg font-black text-purple-300">{user.username.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-bold flex items-center gap-1.5">{user.username} <RoleBadge role={user.role} size="sm" /></p>
                        <p className="text-purple-500 text-xs font-bold">Level {user.level}</p>
                      </div>
                      {alreadyFriend ? (
                        <span className="px-3 py-1 bg-green-900/30 border border-green-500/30 rounded-lg text-green-400 text-xs font-black uppercase">Freund</span>
                      ) : (
                        <button onClick={() => sendRequest(user.id)} className="flex items-center gap-2 px-4 py-2 bg-pink-600/20 hover:bg-pink-600 border border-pink-500/30 rounded-xl text-pink-300 hover:text-white text-xs font-black uppercase tracking-wider transition-all">
                          <UserPlus size={14} /> Hinzufügen
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>}
      </div>
    </div>
  );
}
