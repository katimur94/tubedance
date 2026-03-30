/**
 * Leaderboard — Globale Rangliste
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Trophy, Crown, Medal, Flame, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { type UserRole } from '../lib/roles';
import { RoleBadge } from './RoleBadge';

interface LeaderboardEntry {
  userId: string;
  username: string;
  totalScore: number;
  totalGames: number;
  highestCombo: number;
  winCount: number;
  level: number;
  role: UserRole;
}

interface LeaderboardProps {
  userId: string;
  onBack: () => void;
}

type TimeFilter = 'all' | 'monthly' | 'weekly';

export function Leaderboard({ userId, onBack }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);

  // Request counter to prevent race conditions when rapidly switching filters
  const requestIdRef = useRef(0);

  useEffect(() => {
    loadLeaderboard();
  }, [timeFilter]);

  const getDateThreshold = (filter: TimeFilter): string | null => {
    if (filter === 'all') return null;
    const now = new Date();
    if (filter === 'weekly') {
      now.setDate(now.getDate() - 7);
    } else if (filter === 'monthly') {
      now.setDate(now.getDate() - 30);
    }
    return now.toISOString();
  };

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);

    const currentRequestId = ++requestIdRef.current;
    const dateThreshold = getDateThreshold(timeFilter);

    // Try with JOIN first, fallback to separate queries if it fails
    let query = supabase
      .from('leaderboard')
      .select('user_id, username, total_score, total_games, highest_combo, win_count, updated_at')
      .order('total_score', { ascending: false })
      .limit(100);

    if (dateThreshold) {
      query = query.gt('updated_at', dateThreshold);
    }

    let { data, error: fetchError } = await query;

    // Stale request — discard results
    if (currentRequestId !== requestIdRef.current) return;

    if (fetchError || !data || data.length === 0) {
      // Fallback: load from profiles directly (leaderboard table might not exist)
      let profileQuery = supabase
        .from('profiles')
        .select('id, username, level, role, total_games, highest_combo, win_count, updated_at')
        .order('highest_combo', { ascending: false })
        .limit(100);

      if (dateThreshold) {
        profileQuery = profileQuery.gt('updated_at', dateThreshold);
      }

      const { data: profileData, error: profileError } = await profileQuery;

      // Stale request — discard results
      if (currentRequestId !== requestIdRef.current) return;

      if (profileError) {
        setError('Rangliste konnte nicht geladen werden. Bitte versuche es erneut.');
        setLoading(false);
        return;
      }

      if (profileData) {
        const mapped = profileData
          .filter((p: any) => (p.total_games || 0) > 0)
          .map((p: any, i: number) => {
            const entry: LeaderboardEntry = {
              userId: p.id,
              username: p.username || 'Unbekannt',
              totalScore: 0,
              totalGames: p.total_games || 0,
              highestCombo: p.highest_combo || 0,
              winCount: p.win_count || 0,
              level: p.level || 1,
              role: p.role || 'user',
            };
            if (p.id === userId) setMyRank(i + 1);
            return entry;
          });
        setEntries(mapped);
      }
    } else {
      // Leaderboard data found — enrich with profile info
      const userIds = data.map((e: any) => e.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, level, role')
        .in('id', userIds);

      // Stale request — discard results
      if (currentRequestId !== requestIdRef.current) return;

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      const mapped = data.map((e: any, i: number) => {
        const prof = profileMap.get(e.user_id);
        const entry: LeaderboardEntry = {
          userId: e.user_id,
          username: e.username || prof?.username || 'Unbekannt',
          totalScore: e.total_score || 0,
          totalGames: e.total_games || 0,
          highestCombo: e.highest_combo || 0,
          winCount: e.win_count || 0,
          level: prof?.level || 1,
          role: prof?.role || 'user',
        };
        if (e.user_id === userId) setMyRank(i + 1);
        return entry;
      });
      setEntries(mapped);
    }

    setLoading(false);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={18} className="text-yellow-400" />;
    if (rank === 2) return <Medal size={18} className="text-gray-300" />;
    if (rank === 3) return <Medal size={18} className="text-amber-600" />;
    return <span className="text-gray-500 font-mono font-bold text-sm">#{rank}</span>;
  };

  return (
    <div className="fixed inset-0 bg-[#1a0a2e] flex flex-col z-50 overflow-hidden font-sans text-white">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-yellow-600/8 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/8 rounded-full blur-[200px]" />
      </div>

      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-purple-800/50 bg-purple-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-purple-900/50 hover:bg-pink-600 rounded-2xl transition-all group border border-purple-700">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(250,204,21,0.4)]">
              <Trophy size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400">
                Rangliste
              </h1>
              <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Top 100 Tänzer</p>
            </div>
          </div>
        </div>

        {myRank && (
          <div className="px-5 py-2 bg-purple-900/50 border border-purple-700/50 rounded-2xl">
            <span className="text-purple-400 text-xs font-black uppercase tracking-widest">Dein Rang: </span>
            <span className="text-yellow-400 font-black text-lg">#{myRank}</span>
          </div>
        )}
      </div>

      {/* Time Filter */}
      <div className="relative z-20 flex gap-2 px-8 py-4 border-b border-purple-800/30 bg-purple-950/50 backdrop-blur-md">
        {([
          { id: 'all' as TimeFilter, label: 'Alle Zeit', icon: Trophy },
          { id: 'monthly' as TimeFilter, label: 'Monatlich', icon: Calendar },
          { id: 'weekly' as TimeFilter, label: 'Wöchentlich', icon: Flame },
        ]).map(filter => {
          const Icon = filter.icon;
          return (
            <button
              key={filter.id}
              onClick={() => setTimeFilter(filter.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                timeFilter === filter.id
                  ? 'bg-gradient-to-r from-yellow-600 to-amber-600 text-white shadow-[0_0_15px_rgba(250,204,21,0.3)] border border-yellow-400/50'
                  : 'bg-purple-900/30 hover:bg-purple-900/50 text-gray-400 border border-purple-700/30'
              }`}
            >
              <Icon size={14} />
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Leaderboard Table */}
      <div className="relative z-10 flex-1 overflow-y-auto px-8 py-6">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-purple-700 border-t-pink-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-purple-400 font-bold">Lade Rangliste...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <Trophy size={48} className="text-red-700 mx-auto mb-4" />
            <p className="text-red-400 font-bold uppercase tracking-wider">{error}</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20">
            <Trophy size={48} className="text-purple-700 mx-auto mb-4" />
            <p className="text-purple-400 font-bold uppercase tracking-wider">Noch keine Einträge</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const rank = i + 1;
              const isMe = entry.userId === userId;
              const isTop3 = rank <= 3;

              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors ${
                    isMe
                      ? 'bg-gradient-to-r from-pink-950/50 to-purple-950/50 border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.15)]'
                      : isTop3
                      ? 'bg-yellow-950/20 border-yellow-500/20'
                      : 'bg-purple-950/30 border-purple-800/30'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-10 flex items-center justify-center">
                    {getRankIcon(rank)}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${isMe ? 'text-pink-300' : 'text-white'}`}>{entry.username}</span>
                      <RoleBadge role={entry.role} size="sm" />
                      {isMe && <span className="text-[9px] text-pink-400 font-black uppercase bg-pink-900/30 px-2 py-0.5 rounded">Du</span>}
                    </div>
                    <span className="text-purple-500 text-xs font-bold">Level {entry.level}</span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-xs text-purple-500 font-bold">Combo</p>
                      <p className="text-orange-400 font-black">{entry.highestCombo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-purple-500 font-bold">Spiele</p>
                      <p className="text-cyan-400 font-black">{entry.totalGames}</p>
                    </div>
                    <div>
                      <p className="text-xs text-purple-500 font-bold">Score</p>
                      <p className={`font-black text-lg ${isTop3 ? 'text-yellow-400 text-glow-gold' : 'text-white'}`}>
                        {entry.totalScore.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
