/**
 * PlayerProfile — Spielerprofil-Seite mit 3D-Avatar-Preview
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Trophy, Flame, Music, Users, Star, Target, Calendar } from 'lucide-react';
import { AnimatedAvatar } from './AnimatedAvatar';
import { supabase } from '../lib/supabase';
import { type UserRole } from '../lib/roles';
import { RoleBadge } from './RoleBadge';
import type { PlayerProfile as ProfileType } from './LockerRoom';

interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  target: number;
  getCurrent: (stats: ProfileStats, totalEarned: number) => number;
}

const ALL_ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_dance', name: 'Erster Tanz', description: 'Schließe dein erstes Spiel ab', icon: '💃', target: 1, getCurrent: (s) => s.totalGames },
  { id: 'combo_king', name: 'Combo-König', description: 'Erreiche eine 50er Combo', icon: '🔥', target: 50, getCurrent: (s) => s.highestCombo },
  { id: 'perfectionist', name: 'Perfektionist', description: '10 Perfects hintereinander', icon: '⭐', target: 10, getCurrent: (s) => s.highestCombo },
  { id: 'fashionista', name: 'Fashionista', description: '20 Items gekauft', icon: '👗', target: 20, getCurrent: () => 0 },
  { id: 'social_butterfly', name: 'Social Butterfly', description: '10 Freunde hinzugefügt', icon: '🦋', target: 10, getCurrent: () => 0 },
  { id: 'beat_master', name: 'Beat Master', description: '1000 Perfects insgesamt', icon: '🎵', target: 1000, getCurrent: () => 0 },
  { id: 'millionaire', name: 'Millionär', description: '1.000.000 Beats verdient', icon: '💰', target: 1000000, getCurrent: (_, te) => te },
  { id: 'crew_leader', name: 'Crew Leader', description: 'Gründe eine Crew', icon: '👑', target: 1, getCurrent: () => 0 },
  { id: 'marathon', name: 'Marathon-Tänzer', description: 'Spiele 100 Songs', icon: '🏃', target: 100, getCurrent: (s) => s.totalGames },
  { id: 'night_owl', name: 'Nachteule', description: '7 Tage Login-Streak', icon: '🦉', target: 7, getCurrent: (s) => s.dailyStreak },
];

interface PlayerProfileViewProps {
  userId: string;
  profile: ProfileType;
  username: string;
  onBack: () => void;
}

interface ProfileStats {
  totalGames: number;
  highestCombo: number;
  winCount: number;
  totalScore: number;
  dailyStreak: number;
}

export function PlayerProfileView({ userId, profile, username, onBack }: PlayerProfileViewProps) {
  const [stats, setStats] = useState<ProfileStats>({
    totalGames: 0,
    highestCombo: 0,
    winCount: 0,
    totalScore: 0,
    dailyStreak: 0,
  });
  const [profileRole, setProfileRole] = useState<UserRole>('user');
  const [achievements, setAchievements] = useState<{ id: string; name: string; icon: string; unlockedAt: string }[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);

  useEffect(() => {
    const mountedRef = { current: true };
    const currentUserId = userId;

    const loadStats = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('total_games, highest_combo, win_count, daily_streak, role, total_earned')
        .eq('id', currentUserId)
        .single();

      if (!mountedRef.current || currentUserId !== userId) return;

      if (data) {
        setStats({
          totalGames: data.total_games || 0,
          highestCombo: data.highest_combo || 0,
          winCount: data.win_count || 0,
          totalScore: data.total_earned || 0,
          dailyStreak: data.daily_streak || 0,
        });
        setProfileRole(data.role || 'user');
        setTotalEarned(data.total_earned || 0);
      }

      // Try to get more accurate score from leaderboard
      const { data: lb } = await supabase
        .from('leaderboard')
        .select('total_score')
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (!mountedRef.current || currentUserId !== userId) return;
      if (lb && lb.total_score) setStats(s => ({ ...s, totalScore: lb.total_score }));
    };

    const loadAchievements = async () => {
      const { data } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at, achievements(name, icon)')
        .eq('user_id', currentUserId);

      if (!mountedRef.current || currentUserId !== userId) return;

      if (data) {
        setAchievements(
          data.map((a: any) => ({
            id: a.achievement_id,
            name: a.achievements?.name || a.achievement_id,
            icon: a.achievements?.icon || '🏆',
            unlockedAt: new Date(a.unlocked_at).toLocaleDateString('de-DE'),
          }))
        );
      }
    };

    loadStats();
    loadAchievements();

    return () => { mountedRef.current = false; };
  }, [userId]);

  const expNeeded = profile.level * 1000;
  const progress = (profile.exp / expNeeded) * 100;

  const STAT_CARDS = [
    { icon: Music, label: 'Spiele', value: stats.totalGames, color: 'text-pink-400', bg: 'bg-pink-900/30', border: 'border-pink-500/30' },
    { icon: Flame, label: 'Höchste Combo', value: stats.highestCombo, color: 'text-orange-400', bg: 'bg-orange-900/30', border: 'border-orange-500/30' },
    { icon: Trophy, label: 'Siege', value: stats.winCount, color: 'text-yellow-400', bg: 'bg-yellow-900/30', border: 'border-yellow-500/30' },
    { icon: Target, label: 'Total Score', value: stats.totalScore.toLocaleString(), color: 'text-cyan-400', bg: 'bg-cyan-900/30', border: 'border-cyan-500/30' },
    { icon: Calendar, label: 'Login-Streak', value: `${stats.dailyStreak} Tage`, color: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-500/30' },
    { icon: Star, label: 'Achievements', value: achievements.length, color: 'text-purple-400', bg: 'bg-purple-900/30', border: 'border-purple-500/30' },
  ];

  return (
    <div className="fixed inset-0 bg-[#1a0a2e] flex z-50 overflow-hidden font-sans text-white">
      {/* Left: 3D Avatar */}
      <div className="relative w-2/5 h-full flex flex-col justify-end items-center bg-black/20">
        <button onClick={onBack} className="absolute top-8 left-8 py-3 px-6 bg-purple-900/50 hover:bg-pink-600 text-white rounded-full transition-colors flex items-center justify-center shadow-lg z-50 uppercase tracking-widest text-xs font-bold border border-purple-700">
          <ArrowLeft size={16} className="mr-2" /> Zurück
        </button>

        <div className="absolute inset-0 cursor-move">
          <AnimatedAvatar
            modelUrl={profile.rpm_url}
            jacket={profile.jacket} tshirt={profile.tshirt} vest={profile.vest}
            pants={profile.pants} shorts={profile.shorts} shoes={profile.shoes}
            hat={profile.hat} glasses={profile.glasses}
            beard={profile.beard} mustache={profile.mustache} wings={profile.wings}
            body={profile.body} face={profile.face}
            danceState="dancing"
            intensity={1.5}
          />
        </div>

        {/* Name + Level Card */}
        <div className="relative z-10 w-full px-10 pb-8">
          <div className="bg-purple-950/80 backdrop-blur-xl border border-purple-700/50 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-3xl font-black text-white uppercase tracking-wider">{username}</h2>
              <RoleBadge role={profileRole} size="md" />
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="px-3 py-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full text-sm font-black">
                Level {profile.level}
              </span>
            </div>
            <div className="w-full h-2 bg-purple-900 rounded-full overflow-hidden mt-3 border border-purple-700">
              <motion.div animate={{ width: `${progress}%` }} className="h-full bg-gradient-to-r from-pink-500 to-purple-500" />
            </div>
            <p className="text-xs text-right text-purple-500 mt-1 font-mono">{profile.exp} / {expNeeded} EXP</p>
          </div>
        </div>
      </div>

      {/* Right: Stats + Achievements */}
      <div className="w-3/5 h-full bg-purple-950/50 border-l border-purple-800/30 flex flex-col p-10 overflow-y-auto">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 uppercase tracking-widest mb-8">
          Profil
        </h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {STAT_CARDS.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`${card.bg} border ${card.border} rounded-2xl p-5 relative overflow-hidden`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={16} className={card.color} />
                  <span className="text-xs text-purple-400 font-bold uppercase tracking-widest">{card.label}</span>
                </div>
                <p className={`text-2xl font-black ${card.color}`}>{card.value}</p>
              </div>
            );
          })}
        </div>

        {/* Achievements — shows ALL with progress */}
        <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3">
          <Star size={20} className="text-yellow-400" /> Achievements
          <span className="text-sm text-purple-400 font-bold normal-case tracking-normal">
            {achievements.length}/{ALL_ACHIEVEMENTS.length} freigeschaltet
          </span>
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {ALL_ACHIEVEMENTS.map(a => {
            const unlocked = achievements.find(u => u.id === a.id);
            const current = a.getCurrent(stats, totalEarned);
            const pct = Math.min(100, (current / a.target) * 100);

            return (
              <div key={a.id} className={`p-4 rounded-2xl border relative overflow-hidden ${
                unlocked
                  ? 'bg-yellow-950/30 border-yellow-500/30'
                  : 'bg-gray-900/40 border-gray-700/30'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-2xl ${unlocked ? '' : 'grayscale opacity-50'}`}>{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${unlocked ? 'text-yellow-200' : 'text-gray-400'}`}>{a.name}</p>
                    <p className="text-[10px] text-purple-500">{a.description}</p>
                  </div>
                  {unlocked && <span className="text-yellow-500 text-xs font-mono shrink-0">{unlocked.unlockedAt}</span>}
                </div>
                {/* Progress bar */}
                {!unlocked && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-purple-400">{current.toLocaleString()} / {a.target.toLocaleString()}</span>
                      <span className="text-purple-500">{Math.floor(pct)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
                {unlocked && (
                  <div className="mt-1 text-[10px] text-yellow-600 font-bold uppercase tracking-wider">Freigeschaltet</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
