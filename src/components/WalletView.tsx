import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coins, ArrowLeft, TrendingUp, TrendingDown, Clock,
  Gift, ChevronRight, Sparkles, BarChart3
} from 'lucide-react';
import {
  getLocalWallet, getTransactions, getOwnedItems,
  SHOP_CATALOG, RARITY_CONFIG, WalletState, TransactionRecord
} from '../lib/economy';

interface WalletViewProps {
  onBack: () => void;
  onOpenShop: () => void;
}

export function WalletView({ onBack, onOpenShop }: WalletViewProps) {
  const [wallet, setWallet] = useState<WalletState>(getLocalWallet);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [ownedCount, setOwnedCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  useEffect(() => {
    setWallet(getLocalWallet());
    setTransactions(getTransactions());
    setOwnedCount(getOwnedItems().length);
  }, []);

  const recentTx = transactions.slice(0, 20);

  // Stats
  const earningsRate = wallet.totalEarned > 0 ? Math.floor(wallet.totalEarned / Math.max(1, Math.floor((Date.now() - (transactions.at(-1)?.timestamp || Date.now())) / (1000 * 60 * 60)))) : 0;

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50 overflow-hidden font-sans text-white">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-0 w-[600px] h-[600px] bg-yellow-600/10 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-600/8 rounded-full blur-[200px]" />
      </div>

      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-gray-800/80 hover:bg-cyan-600 rounded-2xl transition-all group border border-gray-700">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(250,204,21,0.4)]">
              <Coins size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400">
                Wallet
              </h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Deine Ingame-Finanzen</p>
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenShop}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-2xl font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(236,72,153,0.3)] border border-pink-400/30"
        >
          <Sparkles size={16} />
          Zum Shop
          <ChevronRight size={16} />
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="relative z-20 flex gap-2 px-8 py-4 border-b border-gray-800/50 bg-gray-950/50 backdrop-blur-md">
        {(['overview', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === tab 
                ? 'bg-gradient-to-r from-yellow-600 to-amber-600 text-white shadow-[0_0_15px_rgba(250,204,21,0.3)] border border-yellow-400/50' 
                : 'bg-gray-800/80 hover:bg-gray-700 text-gray-400 border border-gray-700'
            }`}
          >
            {tab === 'overview' ? 'Übersicht' : 'Verlauf'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-8 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' ? (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Main Balance Card */}
              <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-yellow-950/20 border border-yellow-500/20 rounded-[32px] p-10 shadow-[0_0_40px_rgba(250,204,21,0.1)] mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-yellow-500/5 rounded-full blur-[100px]" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-3">Guthaben</p>
                <div className="flex items-end gap-4 mb-2">
                  <motion.h2
                    key={wallet.beats}
                    initial={{ scale: 1.05 }}
                    animate={{ scale: 1 }}
                    className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-400"
                  >
                    {wallet.beats.toLocaleString()}
                  </motion.h2>
                  <span className="text-2xl text-yellow-600 font-black uppercase tracking-widest mb-3">Beats</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-sm font-bold">
                  <Coins size={14} className="text-yellow-600" />
                  <span>Verdient: {wallet.totalEarned.toLocaleString()} | Ausgegeben: {wallet.totalSpent.toLocaleString()}</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                {/* Total Earned */}
                <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-2xl" />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-900/50 border border-green-500/30 rounded-xl flex items-center justify-center">
                      <TrendingUp size={18} className="text-green-400" />
                    </div>
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total verdient</span>
                  </div>
                  <p className="text-3xl font-black text-green-400">{wallet.totalEarned.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1 font-mono">Beats</p>
                </div>

                {/* Total Spent */}
                <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-pink-500/10 rounded-full blur-2xl" />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-pink-900/50 border border-pink-500/30 rounded-xl flex items-center justify-center">
                      <TrendingDown size={18} className="text-pink-400" />
                    </div>
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total ausgegeben</span>
                  </div>
                  <p className="text-3xl font-black text-pink-400">{wallet.totalSpent.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1 font-mono">Beats</p>
                </div>

                {/* Items Owned */}
                <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl" />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-900/50 border border-purple-500/30 rounded-xl flex items-center justify-center">
                      <Gift size={18} className="text-purple-400" />
                    </div>
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Items im Besitz</span>
                  </div>
                  <p className="text-3xl font-black text-purple-400">{ownedCount}</p>
                  <p className="text-xs text-gray-500 mt-1 font-mono">von {SHOP_CATALOG.length} verfügbar</p>
                </div>
              </div>

              {/* Earning Tips */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-8">
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-5 flex items-center gap-2">
                  <BarChart3 size={18} className="text-yellow-400" />
                  So verdienst du Beats
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Song abspielen', beats: '50-200', desc: 'Basis-Belohnung pro Song' },
                    { label: 'Hohe Combos', beats: '×2-×5', desc: 'Mehr Combo = mehr Beats' },
                    { label: 'Perfekte Hits', beats: '+100', desc: 'Perfekt bewertete Treffer' },
                    { label: 'Playlist beenden', beats: '+500', desc: 'Bonus für komplette Playlist' },
                  ].map((tip, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-2xl border border-gray-700/50">
                      <div className="px-3 py-1.5 bg-yellow-900/30 border border-yellow-500/20 rounded-xl">
                        <span className="text-yellow-300 text-sm font-black">{tip.beats}</span>
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">{tip.label}</p>
                        <p className="text-gray-500 text-xs">{tip.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {recentTx.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Clock size={48} className="text-gray-700 mb-4" />
                  <p className="text-gray-500 font-bold uppercase tracking-wider">Noch keine Transaktionen</p>
                  <p className="text-gray-600 text-sm mt-2">Spiel Songs um Beats zu verdienen!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTx.map(tx => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-4 p-4 bg-gray-900/80 border border-gray-800 rounded-2xl"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        tx.type === 'earn' 
                          ? 'bg-green-900/50 border border-green-500/30' 
                          : 'bg-pink-900/50 border border-pink-500/30'
                      }`}>
                        {tx.type === 'earn' ? (
                          <TrendingUp size={18} className="text-green-400" />
                        ) : (
                          <TrendingDown size={18} className="text-pink-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-bold text-sm">{tx.reason}</p>
                        <p className="text-gray-500 text-xs font-mono">{new Date(tx.timestamp).toLocaleString('de-DE')}</p>
                      </div>
                      <span className={`font-black text-lg ${tx.type === 'earn' ? 'text-green-400' : 'text-pink-400'}`}>
                        {tx.type === 'earn' ? '+' : '-'}{tx.amount.toLocaleString()}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
