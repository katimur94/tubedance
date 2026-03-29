/**
 * AdminPanel — Gamemaster/Admin-Verwaltung
 * Beats schenken, Items schenken, Rollen vergeben
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Search, Coins, Gift, ShieldAlert, Crown, ChevronDown,
  Check, X, User, ArrowLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SHOP_CATALOG, adminGiftBeats, adminGiftItem, adminSetRole } from '../lib/economy';
import { type UserRole, ROLE_CONFIG, canManageRoles } from '../lib/roles';
import { RoleBadge } from './RoleBadge';

interface AdminPanelProps {
  userRole: UserRole;
  onBack: () => void;
}

interface SearchResult {
  id: string;
  username: string;
  level: number;
  role: UserRole;
  coins: number;
}

const ALL_ROLES: UserRole[] = ['user', 'supporter', 'moderator', 'gamemaster', 'admin'];

export function AdminPanel({ userRole, onBack }: AdminPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);

  // Gift beats
  const [giftAmount, setGiftAmount] = useState('');
  const [giftReason, setGiftReason] = useState('');
  const [giftResult, setGiftResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Gift item
  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemResult, setItemResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Set role
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');
  const [roleResult, setRoleResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [activeTab, setActiveTab] = useState<'beats' | 'items' | 'roles'>('beats');

  const searchUsers = async () => {
    if (searchQuery.trim().length < 2) return;
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, level, role, coins')
      .ilike('username', `%${searchQuery.trim()}%`)
      .limit(10);

    if (data) {
      setResults(data.map((d: any) => ({
        id: d.id,
        username: d.username || 'Unbekannt',
        level: d.level || 1,
        role: d.role || 'user',
        coins: d.coins || 0,
      })));
    }
    setSearching(false);
  };

  const selectUser = (user: SearchResult) => {
    setSelected(user);
    setSelectedRole(user.role);
    setGiftResult(null);
    setItemResult(null);
    setRoleResult(null);
  };

  const handleGiftBeats = async () => {
    if (!selected || !giftAmount) return;
    const amount = parseInt(giftAmount);
    if (isNaN(amount) || amount <= 0) {
      setGiftResult({ ok: false, msg: 'Ungültiger Betrag' });
      return;
    }
    const reason = giftReason.trim() || `Geschenk vom ${ROLE_CONFIG[userRole].labelDE}`;
    const res = await adminGiftBeats(selected.id, amount, reason);
    if (res.success) {
      setGiftResult({ ok: true, msg: `${amount} Beats an ${selected.username} gesendet!` });
      setGiftAmount('');
      setGiftReason('');
      setSelected({ ...selected, coins: selected.coins + amount });
    } else {
      setGiftResult({ ok: false, msg: res.error || 'Fehler' });
    }
  };

  const handleGiftItem = async () => {
    if (!selected || !selectedItemId) return;
    const item = SHOP_CATALOG.find(i => i.id === selectedItemId);
    if (!item) return;
    const res = await adminGiftItem(selected.id, selectedItemId);
    if (res.success) {
      setItemResult({ ok: true, msg: `${item.nameDE} an ${selected.username} geschenkt!` });
      setSelectedItemId('');
    } else {
      setItemResult({ ok: false, msg: res.error || 'Fehler' });
    }
  };

  const handleSetRole = async () => {
    if (!selected || selectedRole === selected.role) return;
    const res = await adminSetRole(selected.id, selectedRole);
    if (res.success) {
      setRoleResult({ ok: true, msg: `${selected.username} ist jetzt ${ROLE_CONFIG[selectedRole].labelDE}!` });
      setSelected({ ...selected, role: selectedRole });
    } else {
      setRoleResult({ ok: false, msg: res.error || 'Fehler' });
    }
  };

  const tabs = [
    { id: 'beats' as const, label: 'Beats schenken', icon: Coins },
    { id: 'items' as const, label: 'Items schenken', icon: Gift },
    ...(canManageRoles(userRole) ? [{ id: 'roles' as const, label: 'Rollen vergeben', icon: Crown }] : []),
  ];

  return (
    <div className="w-full max-w-4xl mx-auto z-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-3 bg-purple-900/50 hover:bg-purple-800 border border-purple-700/30 rounded-2xl text-purple-400">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400 uppercase tracking-wider flex items-center gap-3">
            <ShieldAlert size={32} /> Admin Panel
          </h1>
          <p className="text-purple-400 text-sm font-bold uppercase tracking-widest mt-1">Spieler verwalten</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchUsers()}
              placeholder="Spielername suchen..."
              className="w-full bg-purple-900/30 border border-purple-700/30 rounded-2xl pl-11 pr-4 py-3 text-white placeholder-purple-600 focus:border-pink-500 outline-none"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={searchUsers}
            disabled={searching}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm"
          >
            {searching ? '...' : 'Suchen'}
          </motion.button>
        </div>

        {/* Search Results */}
        {results.length > 0 && !selected && (
          <div className="mt-3 space-y-2">
            {results.map(user => (
              <motion.button
                key={user.id}
                whileHover={{ scale: 1.01 }}
                onClick={() => selectUser(user)}
                className="w-full flex items-center gap-4 p-4 bg-purple-900/30 border border-purple-700/30 rounded-2xl hover:border-pink-500/50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-purple-800 rounded-full flex items-center justify-center">
                  <User size={18} className="text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{user.username}</span>
                    <RoleBadge role={user.role} />
                  </div>
                  <span className="text-purple-500 text-xs font-bold">Level {user.level} &middot; {user.coins} Beats</span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Selected User Card */}
      {selected && (
        <div className="mb-6">
          <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-purple-900/50 to-pink-900/30 border border-purple-700/50 rounded-2xl">
            <div className="w-14 h-14 bg-purple-800 rounded-full flex items-center justify-center">
              <User size={24} className="text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-white text-lg font-black">{selected.username}</span>
                <RoleBadge role={selected.role} size="md" />
              </div>
              <span className="text-purple-400 text-sm font-bold">Level {selected.level} &middot; {selected.coins} Beats</span>
            </div>
            <button onClick={() => { setSelected(null); setGiftResult(null); setItemResult(null); setRoleResult(null); }}
              className="p-2 hover:bg-purple-800 rounded-xl text-purple-400">
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4 mb-4">
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    activeTab === t.id
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                      : 'bg-purple-900/30 text-purple-400 border border-purple-700/30 hover:border-purple-500'
                  }`}
                >
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-6 bg-purple-900/20 border border-purple-700/30 rounded-2xl space-y-4">
            {activeTab === 'beats' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-purple-400 uppercase tracking-widest mb-2 block">Betrag (Beats)</label>
                    <input
                      type="number"
                      value={giftAmount}
                      onChange={e => setGiftAmount(e.target.value)}
                      placeholder="z.B. 1000"
                      min="1"
                      className="w-full bg-purple-900/30 border border-purple-700/30 rounded-xl px-4 py-3 text-white placeholder-purple-600 focus:border-pink-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-purple-400 uppercase tracking-widest mb-2 block">Grund (optional)</label>
                    <input
                      type="text"
                      value={giftReason}
                      onChange={e => setGiftReason(e.target.value)}
                      placeholder="z.B. Event-Gewinn"
                      className="w-full bg-purple-900/30 border border-purple-700/30 rounded-xl px-4 py-3 text-white placeholder-purple-600 focus:border-pink-500 outline-none"
                    />
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGiftBeats}
                  className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-black rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Coins size={16} /> Beats senden
                </motion.button>
                {giftResult && (
                  <div className={`p-3 rounded-xl text-sm font-bold text-center ${giftResult.ok ? 'bg-green-900/50 border border-green-500/50 text-green-300' : 'bg-red-900/50 border border-red-500/50 text-red-300'}`}>
                    {giftResult.ok ? <Check size={14} className="inline mr-1" /> : <X size={14} className="inline mr-1" />}
                    {giftResult.msg}
                  </div>
                )}
              </>
            )}

            {activeTab === 'items' && (
              <>
                <div>
                  <label className="text-xs font-black text-purple-400 uppercase tracking-widest mb-2 block">Item auswählen</label>
                  <div className="relative">
                    <select
                      value={selectedItemId}
                      onChange={e => setSelectedItemId(e.target.value)}
                      className="w-full bg-purple-900/30 border border-purple-700/30 rounded-xl px-4 py-3 text-white appearance-none focus:border-pink-500 outline-none cursor-pointer"
                    >
                      <option value="">— Item wählen —</option>
                      {SHOP_CATALOG.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.nameDE} ({item.category}) — {item.price} Beats
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-500 pointer-events-none" />
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGiftItem}
                  disabled={!selectedItemId}
                  className={`w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 ${!selectedItemId ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Gift size={16} /> Item schenken
                </motion.button>
                {itemResult && (
                  <div className={`p-3 rounded-xl text-sm font-bold text-center ${itemResult.ok ? 'bg-green-900/50 border border-green-500/50 text-green-300' : 'bg-red-900/50 border border-red-500/50 text-red-300'}`}>
                    {itemResult.ok ? <Check size={14} className="inline mr-1" /> : <X size={14} className="inline mr-1" />}
                    {itemResult.msg}
                  </div>
                )}
              </>
            )}

            {activeTab === 'roles' && canManageRoles(userRole) && (
              <>
                <div>
                  <label className="text-xs font-black text-purple-400 uppercase tracking-widest mb-2 block">Neue Rolle</label>
                  <div className="grid grid-cols-5 gap-2">
                    {ALL_ROLES.map(r => {
                      const cfg = ROLE_CONFIG[r];
                      return (
                        <button
                          key={r}
                          onClick={() => setSelectedRole(r)}
                          className={`p-3 rounded-xl text-center transition-all border ${
                            selectedRole === r
                              ? `${cfg.bgColor} ${cfg.borderColor} ${cfg.color} ${cfg.glow}`
                              : 'bg-purple-900/30 border-purple-700/30 text-purple-500 hover:border-purple-500'
                          }`}
                        >
                          <div className="text-lg">{cfg.emoji || '👤'}</div>
                          <div className="text-[10px] font-black uppercase tracking-wider mt-1">{cfg.labelDE}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSetRole}
                  disabled={selectedRole === selected.role}
                  className={`w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-black rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 ${selectedRole === selected.role ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Crown size={16} /> Rolle zuweisen
                </motion.button>
                {roleResult && (
                  <div className={`p-3 rounded-xl text-sm font-bold text-center ${roleResult.ok ? 'bg-green-900/50 border border-green-500/50 text-green-300' : 'bg-red-900/50 border border-red-500/50 text-red-300'}`}>
                    {roleResult.ok ? <Check size={14} className="inline mr-1" /> : <X size={14} className="inline mr-1" />}
                    {roleResult.msg}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
