/**
 * DailyRewards — Tägliche Login-Belohnungen mit Streak-System
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Star, Coins, X, Check, Flame } from 'lucide-react';
import { getLocalWallet, saveLocalWallet } from '../lib/economy';
import { supabase } from '../lib/supabase';

interface DailyRewardsProps {
  onClose: () => void;
}

const DAILY_REWARDS = [
  { day: 1, beats: 100, label: '100 Beats', icon: Coins, special: false },
  { day: 2, beats: 150, label: '150 Beats', icon: Coins, special: false },
  { day: 3, beats: 200, label: '200 Beats + Bonus', icon: Gift, special: true },
  { day: 4, beats: 250, label: '250 Beats', icon: Coins, special: false },
  { day: 5, beats: 300, label: '300 Beats', icon: Coins, special: false },
  { day: 6, beats: 400, label: '400 Beats', icon: Star, special: true },
  { day: 7, beats: 500, label: '500 Beats + Rare Item!', icon: Gift, special: true },
];

const DAILY_KEY = 'tubedance_daily_login';

interface DailyState {
  lastClaim: string | null; // ISO date
  streak: number;
}

function getDailyState(): DailyState {
  const saved = localStorage.getItem(DAILY_KEY);
  return saved ? JSON.parse(saved) : { lastClaim: null, streak: 0 };
}

function saveDailyState(state: DailyState) {
  localStorage.setItem(DAILY_KEY, JSON.stringify(state));
  // Persist to Supabase
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      supabase.from('profiles').update({
        daily_login_json: state,
        daily_streak: state.streak,
      }).eq('id', session.user.id).then(() => {}, (err: any) => console.warn('[DailyRewards] save failed:', err));
    }
  });
}

function getLocalDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getToday(): string {
  return getLocalDateStr();
}

function isYesterday(dateStr: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateStr === getLocalDateStr(yesterday);
}

export function DailyRewards({ onClose }: DailyRewardsProps) {
  const [state, setState] = useState<DailyState>(() => getDailyState());
  const [claimed, setClaimed] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);

  const today = getToday();
  const alreadyClaimed = state.lastClaim === today;

  // Calculate current streak position (1-7, cycles)
  const streakDay = ((state.streak - 1) % 7) + 1;

  const canClaim = !alreadyClaimed && !isClaiming;

  const handleClaim = async () => {
    if (!canClaim || isClaiming) return;
    setIsClaiming(true);

    // Calculate reward locally (used for both RPC success fallback and local-only mode)
    let newStreak = state.streak;
    if (state.lastClaim && isYesterday(state.lastClaim)) {
      newStreak = state.streak + 1;
    } else {
      newStreak = 1;
    }
    const dayIndex = ((newStreak - 1) % 7);
    const reward = DAILY_REWARDS[dayIndex];
    const amount = reward.beats;

    try {
      // Try server-side claim first (prevents exploit via localStorage clearing)
      const { data: serverReward, error } = await supabase.rpc('claim_daily_reward');

      if (!error && typeof serverReward === 'number' && serverReward > 0) {
        // Server validated — use server reward amount
        const wallet = getLocalWallet();
        wallet.beats += serverReward;
        wallet.totalEarned += serverReward;
        saveLocalWallet(wallet);

        const newState: DailyState = { lastClaim: today, streak: newStreak };
        saveDailyState(newState);
        setState(newState);
        setRewardAmount(serverReward);
        setClaimed(true);
        return;
      }

      // Server says already claimed today
      if (error && (error.message?.includes('already') || error.message?.includes('Bereits'))) {
        const newState: DailyState = { lastClaim: today, streak: state.streak };
        saveDailyState(newState);
        setState(newState);
        return;
      }
    } catch (err) {
      console.warn('[DailyRewards] RPC unavailable, using local fallback:', err);
    }

    // Fallback: local-only (RPC not deployed or failed)
    const wallet = getLocalWallet();
    wallet.beats += amount;
    wallet.totalEarned += amount;
    saveLocalWallet(wallet);

    const newState: DailyState = { lastClaim: today, streak: newStreak };
    saveDailyState(newState);
    setState(newState);
    setRewardAmount(amount);
    setClaimed(true);
    setIsClaiming(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-xl"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-purple-950 border border-purple-700/50 rounded-[32px] overflow-hidden max-w-lg w-full mx-4 shadow-[0_0_60px_rgba(168,85,247,0.2)]"
      >
        {/* Header */}
        <div className="relative px-8 pt-8 pb-4 text-center">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-purple-800 rounded-xl text-purple-400">
            <X size={18} />
          </button>
          <Gift size={40} className="text-yellow-400 mx-auto mb-3" />
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400 uppercase tracking-wider">
            Tägliche Belohnung
          </h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Flame size={14} className="text-orange-400" />
            <span className="text-orange-300 font-black text-sm">{state.streak} Tage Streak</span>
            <Flame size={14} className="text-orange-400" />
          </div>
        </div>

        {/* Reward Grid */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-7 gap-2">
            {DAILY_REWARDS.map((reward, i) => {
              const dayNum = i + 1;
              const currentDayIndex = ((state.streak - 1) % 7);
              const isPast = alreadyClaimed ? i <= currentDayIndex : i < currentDayIndex;
              const isCurrent = !alreadyClaimed && i === currentDayIndex;
              const Icon = reward.icon;

              return (
                <div
                  key={dayNum}
                  className={`flex flex-col items-center p-2 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-gradient-to-b from-yellow-900/50 to-amber-900/30 border-yellow-500/50 shadow-[0_0_15px_rgba(250,204,21,0.3)] scale-110'
                      : isPast
                      ? 'bg-green-950/30 border-green-500/20'
                      : 'bg-purple-900/20 border-purple-700/20'
                  }`}
                >
                  <span className="text-[9px] font-black text-purple-400 uppercase mb-1">Tag {dayNum}</span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 ${
                    isPast ? 'bg-green-900/50' : isCurrent ? 'bg-yellow-900/50' : 'bg-purple-800/50'
                  }`}>
                    {isPast ? (
                      <Check size={14} className="text-green-400" />
                    ) : (
                      <Icon size={14} className={isCurrent ? 'text-yellow-400' : 'text-purple-500'} />
                    )}
                  </div>
                  <span className={`text-[10px] font-black ${isCurrent ? 'text-yellow-300' : isPast ? 'text-green-400' : 'text-purple-500'}`}>
                    {reward.beats}
                  </span>
                  {reward.special && (
                    <Star size={8} className={`mt-0.5 ${isCurrent ? 'text-yellow-400' : 'text-purple-600'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Claim Button */}
        <div className="px-8 pb-8 pt-4">
          {claimed ? (
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-center py-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.5, 1] }}
                className="text-5xl mb-3"
              >
                🎉
              </motion.div>
              <p className="text-yellow-400 font-black text-2xl">+{rewardAmount} Beats!</p>
              <p className="text-purple-400 text-sm font-bold mt-2">Komm morgen wieder für mehr!</p>
              <button onClick={onClose} className="mt-4 px-8 py-3 bg-purple-800 hover:bg-purple-700 rounded-xl font-black uppercase tracking-wider text-sm text-purple-200 transition-colors">
                Schließen
              </button>
            </motion.div>
          ) : canClaim ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleClaim}
              className="w-full py-5 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 rounded-2xl text-black font-black text-xl uppercase tracking-widest shadow-[0_0_30px_rgba(250,204,21,0.4)] flex items-center justify-center gap-3"
            >
              <Gift size={24} />
              Belohnung abholen!
            </motion.button>
          ) : (
            <div className="text-center py-4">
              <Check size={32} className="text-green-400 mx-auto mb-2" />
              <p className="text-green-300 font-black uppercase tracking-wider">Heute bereits abgeholt!</p>
              <p className="text-purple-500 text-sm font-bold mt-1">Komm morgen wieder</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
