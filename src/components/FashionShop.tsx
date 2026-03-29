import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, ShoppingBag, Sparkles, Coins, Diamond, 
  Tag, Lock, Check, Filter, TrendingUp, Star, Zap,
  ChevronDown, AlertTriangle, Gift, Crown
} from 'lucide-react';
import {
  SHOP_CATALOG, RARITY_CONFIG, ShopItem, Rarity,
  getLocalWallet, getOwnedItems, purchaseItem, WalletState, isAdminEconomy
} from '../lib/economy';
import { AnimatedAvatar } from './AnimatedAvatar';
import type { PlayerProfile } from './LockerRoom';

type Category = 'all' | 'jacket' | 'tshirt' | 'vest' | 'pants' | 'shorts' | 'shoes' | 'hat' | 'glasses' | 'beard' | 'mustache' | 'wings' | 'accessory' | 'effect' | 'set';
type SortMode = 'default' | 'price_asc' | 'price_desc' | 'rarity';

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'Alle',
  jacket: 'Jacken',
  tshirt: 'Shirts',
  vest: 'Westen',
  pants: 'Hosen',
  shorts: 'Shorts',
  shoes: 'Schuhe',
  hat: 'Huete',
  glasses: 'Brillen',
  beard: 'Bart',
  mustache: 'Schnurrbart',
  wings: 'Fluegel',
  accessory: 'Accessoires',
  effect: 'Effekte',
  set: 'Sets',
};

const CATEGORY_ICONS: Record<Category, typeof ShoppingBag> = {
  all: ShoppingBag,
  jacket: Tag,
  tshirt: Tag,
  vest: Tag,
  pants: Tag,
  shorts: Tag,
  shoes: Tag,
  hat: Crown,
  glasses: Sparkles,
  beard: Tag,
  mustache: Tag,
  wings: Star,
  accessory: Star,
  effect: Zap,
  set: Gift,
};

// Map shop category to profile clothing key
const CATEGORY_TO_PROFILE_KEY: Record<string, string> = {
  jacket: 'jacket', tshirt: 'tshirt', vest: 'vest', pants: 'pants',
  shorts: 'shorts', shoes: 'shoes', hat: 'hat', glasses: 'glasses',
  beard: 'beard', mustache: 'mustache', wings: 'wings',
  effect: 'effect', accessory: 'accessory',
};

interface FashionShopProps {
  playerLevel: number;
  profile: PlayerProfile;
  onBack: () => void;
}

export function FashionShop({ playerLevel, profile, onBack }: FashionShopProps) {
  const [wallet, setWallet] = useState<WalletState>(getLocalWallet);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set(getOwnedItems().map(o => o.itemId)));
  const [category, setCategory] = useState<Category>('all');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  // Preview: temporarily override a clothing slot on the avatar
  const [previewItem, setPreviewItem] = useState<ShopItem | null>(null);

  useEffect(() => {
    setWallet(getLocalWallet());
    setOwnedIds(new Set(getOwnedItems().map(o => o.itemId)));
  }, []);

  const filteredItems = useMemo(() => {
    let items = [...SHOP_CATALOG];

    if (category !== 'all') items = items.filter(i => i.category === category);
    if (rarityFilter !== 'all') items = items.filter(i => i.rarity === rarityFilter);

    switch (sortMode) {
      case 'price_asc': items.sort((a, b) => a.price - b.price); break;
      case 'price_desc': items.sort((a, b) => b.price - a.price); break;
      case 'rarity': {
        const order: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };
        items.sort((a, b) => order[b.rarity] - order[a.rarity]);
        break;
      }
    }

    return items;
  }, [category, sortMode, rarityFilter]);

  const handlePurchase = (item: ShopItem) => {
    const result = purchaseItem(item.id);
    if (result.success) {
      setWallet(getLocalWallet());
      setOwnedIds(new Set(getOwnedItems().map(o => o.itemId)));
      setPurchaseResult({ success: true, message: `${item.nameDE} erfolgreich gekauft!` });
    } else {
      setPurchaseResult({ success: false, message: result.error || 'Fehler beim Kauf' });
    }
    setShowConfirm(false);
    setTimeout(() => setPurchaseResult(null), 3000);
  };

  const getEffectivePrice = (item: ShopItem) => {
    if (item.isSale && item.salePercent) return Math.floor(item.price * (1 - item.salePercent / 100));
    return item.price;
  };

  const canAfford = (item: ShopItem) => isAdminEconomy() || wallet.beats >= getEffectivePrice(item);
  const meetsLevel = (item: ShopItem) => isAdminEconomy() || !item.unlockLevel || playerLevel >= item.unlockLevel;
  const isOwned = (itemId: string) => ownedIds.has(itemId);

  // Build avatar props with optional preview override
  const avatarOverrides = useMemo(() => {
    const base: Record<string, string> = {
      jacket: profile.jacket || 'leather_black',
      tshirt: profile.tshirt || 'none',
      vest: profile.vest || 'none',
      pants: profile.pants || 'denim_blue',
      shorts: profile.shorts || 'none',
      shoes: profile.shoes || 'shoes_sneakers',
      hat: profile.hat || 'none',
      glasses: profile.glasses || 'none',
      beard: profile.beard || 'none',
      mustache: profile.mustache || 'none',
      wings: profile.wings || 'none',
      effect: profile.effect || 'none',
      accessory: profile.accessory || 'none',
    };
    const active = previewItem || selectedItem;
    if (active) {
      if (active.category === 'set' && active.setItems) {
        // Apply all items from the set
        active.setItems.forEach(itemId => {
          const item = SHOP_CATALOG.find(i => i.id === itemId);
          if (item) {
            const key = CATEGORY_TO_PROFILE_KEY[item.category];
            if (key) {
              base[key] = item.id;
              if (key === 'shorts' && base[key] !== 'none') base.pants = 'none';
              if (key === 'pants' && base[key] !== 'none') base.shorts = 'none';
            }
          }
        });
      } else {
        const key = CATEGORY_TO_PROFILE_KEY[active.category];
        if (key) {
          // Use the shop item id as the clothing texture key
          base[key] = active.id;
          // Shorts/pants exclusivity
          if (key === 'shorts' && base[key] !== 'none') base.pants = 'none';
          if (key === 'pants' && base[key] !== 'none') base.shorts = 'none';
        }
      }
    }
    return base;
  }, [profile, previewItem, selectedItem]);

  const handleItemClick = (item: ShopItem) => {
    setSelectedItem(item);
    setPreviewItem(item);
    setShowConfirm(false);
  };

  const handleCloseDetail = () => {
    setSelectedItem(null);
    setPreviewItem(null);
  };

  return (
    <div className="fixed inset-0 bg-black flex z-50 overflow-hidden font-sans text-white">

      {/* ═══════ LEFT: 3D AVATAR PREVIEW ═══════ */}
      <div className="relative w-[35%] h-full flex flex-col bg-black/60 border-r border-gray-800/50">
        {/* Back button */}
        <button onClick={onBack} className="absolute top-6 left-6 z-50 p-3 bg-gray-800/80 hover:bg-cyan-600 rounded-2xl transition-all group border border-gray-700 hover:border-cyan-400">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        </button>

        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />

        {/* 3D Avatar */}
        <div className="flex-1 cursor-move">
          <AnimatedAvatar
            jacket={avatarOverrides.jacket} tshirt={avatarOverrides.tshirt} vest={avatarOverrides.vest}
            pants={avatarOverrides.pants} shorts={avatarOverrides.shorts} shoes={avatarOverrides.shoes}
            hat={avatarOverrides.hat} glasses={avatarOverrides.glasses}
            beard={avatarOverrides.beard} mustache={avatarOverrides.mustache} wings={avatarOverrides.wings}
            effect={avatarOverrides.effect} accessory={avatarOverrides.accessory}
            body={profile.body} face={profile.face}
            danceState="dancing" intensity={1} bpm={130}
          />
        </div>

        {/* Preview label */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          {(previewItem || selectedItem) ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="px-5 py-2.5 bg-pink-900/80 backdrop-blur-xl border border-pink-500/50 rounded-full shadow-[0_0_20px_rgba(236,72,153,0.3)]"
            >
              <p className="text-xs font-black text-pink-300 uppercase tracking-widest">
                Vorschau: {(previewItem || selectedItem)!.nameDE}
              </p>
            </motion.div>
          ) : (
            <div className="px-5 py-2.5 bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-full">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Klicke ein Item fuer Vorschau</p>
            </div>
          )}
        </div>

        {/* Wallet Display */}
        <div className="absolute top-6 right-6 z-10 flex flex-col gap-2">
          <motion.div key={wallet.beats} initial={{ scale: 1.1 }} animate={{ scale: 1 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-900/60 to-amber-900/60 border border-yellow-500/30 rounded-2xl shadow-lg">
            <Coins size={16} className="text-yellow-400" />
            <span className="text-yellow-300 font-black text-sm">{wallet.beats.toLocaleString()}</span>
            <span className="text-yellow-600 text-[9px] font-bold uppercase">Beats</span>
          </motion.div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-900/60 to-blue-900/60 border border-cyan-500/30 rounded-2xl shadow-lg">
            <Diamond size={14} className="text-cyan-400" />
            <span className="text-cyan-300 font-black text-sm">{wallet.diamonds}</span>
            <span className="text-cyan-600 text-[9px] font-bold uppercase">Gems</span>
          </div>
        </div>
      </div>

      {/* ═══════ RIGHT: SHOP PANEL ═══════ */}
      <div className="w-[65%] h-full flex flex-col overflow-hidden relative">
      
      {/* ═══════ ANIMATED BACKGROUND ═══════ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-pink-600/10 rounded-full blur-[200px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[200px] animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[150px]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      </div>

      {/* ═══════ HEADER ═══════ */}
      <div className="relative z-20 flex items-center px-8 py-5 border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(236,72,153,0.4)]">
              <ShoppingBag size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400">
                Fashion Shop
              </h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Premium Dance Fashion</p>
            </div>
          </div>
      </div>

      {/* ═══════ FILTERS BAR ═══════ */}
      <div className="relative z-20 flex items-center gap-3 px-8 py-4 border-b border-gray-800/50 bg-gray-950/50 backdrop-blur-md overflow-x-auto">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {(Object.keys(CATEGORY_LABELS) as Category[]).map(cat => {
            const Icon = CATEGORY_ICONS[cat];
            const count = cat === 'all' ? SHOP_CATALOG.length : SHOP_CATALOG.filter(i => i.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  category === cat 
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.3)] border border-pink-400/50' 
                    : 'bg-gray-800/80 hover:bg-gray-700 text-gray-400 border border-gray-700'
                }`}
              >
                <Icon size={14} />
                {CATEGORY_LABELS[cat]}
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${category === cat ? 'bg-white/20' : 'bg-gray-700'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Rarity Filter */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Filter size={14} className="text-gray-500 mr-1" />
          <button
            onClick={() => setRarityFilter('all')}
            className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider ${rarityFilter === 'all' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >Alle</button>
          {(['common', 'rare', 'epic', 'legendary'] as Rarity[]).map(r => (
            <button
              key={r}
              onClick={() => setRarityFilter(r)}
              className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                rarityFilter === r 
                  ? `${RARITY_CONFIG[r].bg} ${RARITY_CONFIG[r].color} ${RARITY_CONFIG[r].border} border` 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >{RARITY_CONFIG[r].label}</button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="relative flex-shrink-0">
          <button 
            onClick={() => setShowSortDropdown(!showSortDropdown)} 
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-400 border border-gray-700"
          >
            <TrendingUp size={14} />
            Sortierung
            <ChevronDown size={12} className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showSortDropdown && (
            <div className="absolute top-full right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[180px]">
              {[
                { mode: 'default' as SortMode, label: 'Standard' },
                { mode: 'price_asc' as SortMode, label: 'Preis ↑' },
                { mode: 'price_desc' as SortMode, label: 'Preis ↓' },
                { mode: 'rarity' as SortMode, label: 'Seltenheit' },
              ].map(s => (
                <button
                  key={s.mode}
                  onClick={() => { setSortMode(s.mode); setShowSortDropdown(false); }}
                  className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${sortMode === s.mode ? 'bg-pink-600/20 text-pink-300' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                >{s.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════ MAIN SHOP GRID ═══════ */}
      <div className="relative z-10 flex-1 overflow-y-auto px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, idx) => {
              const owned = isOwned(item.id);
              const affordable = canAfford(item);
              const levelOk = meetsLevel(item);
              const rConf = RARITY_CONFIG[item.rarity];
              const effectivePrice = getEffectivePrice(item);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <button
                    onClick={() => handleItemClick(item)}
                    disabled={owned}
                    className={`w-full rounded-3xl p-1 transition-all duration-300 group relative overflow-hidden ${
                      owned 
                        ? 'opacity-60 cursor-default' 
                        : `hover:scale-[1.03] hover:${rConf.glow} cursor-pointer`
                    }`}
                  >
                    {/* Rarity border glow */}
                    <div className={`absolute inset-0 rounded-3xl border ${rConf.border} ${owned ? '' : rConf.glow}`} />
                    
                    <div className={`relative rounded-[22px] overflow-hidden ${rConf.bg} bg-opacity-50`}>
                      {/* Preview area */}
                      <div className="relative aspect-square flex items-center justify-center overflow-hidden">
                        <div className={`w-24 h-24 rounded-3xl ${item.preview} shadow-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`} />
                        
                        {/* Shimmer effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        
                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                          {item.isNew && (
                            <span className="px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-500 text-[9px] font-black uppercase tracking-wider rounded-full text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                              NEU
                            </span>
                          )}
                          {item.isSale && (
                            <span className="px-2 py-0.5 bg-gradient-to-r from-red-500 to-orange-500 text-[9px] font-black uppercase tracking-wider rounded-full text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                              -{item.salePercent}%
                            </span>
                          )}
                        </div>

                        {/* Rarity badge */}
                        <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${rConf.color} ${rConf.bg} border ${rConf.border}`}>
                          {rConf.label}
                        </span>

                        {/* Owned overlay */}
                        {owned && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-900/80 border border-green-500 rounded-full">
                              <Check size={16} className="text-green-400" />
                              <span className="text-green-300 text-xs font-black uppercase tracking-wider">Im Besitz</span>
                            </div>
                          </div>
                        )}

                        {/* Level lock */}
                        {!levelOk && !owned && (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-1">
                              <Lock size={24} className="text-red-400" />
                              <span className="text-red-300 text-xs font-black uppercase tracking-wider">
                                Level {item.unlockLevel}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Item info */}
                      <div className="p-4 border-t border-gray-800/50">
                        <h3 className="text-sm font-black text-white uppercase tracking-wider truncate">{item.nameDE}</h3>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            <Coins size={14} className="text-yellow-400" />
                            {item.isSale ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-500 text-sm font-bold line-through">{item.price}</span>
                                <span className="text-yellow-300 font-black text-sm">{effectivePrice}</span>
                              </div>
                            ) : (
                              <span className={`font-black text-sm ${affordable || owned ? 'text-yellow-300' : 'text-red-400'}`}>{item.price}</span>
                            )}
                          </div>
                          {item.rarity === 'legendary' && <Crown size={14} className="text-yellow-400" />}
                        </div>
                      </div>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <ShoppingBag size={48} className="text-gray-700 mb-4" />
            <p className="text-gray-500 font-bold uppercase tracking-wider">Keine Items in dieser Kategorie</p>
          </div>
        )}
      </div>

      {/* ═══════ ITEM DETAIL MODAL ═══════ */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-xl"
            onClick={(e) => { if (e.target === e.currentTarget) handleCloseDetail(); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className={`relative bg-gray-900 border ${RARITY_CONFIG[selectedItem.rarity].border} rounded-[32px] overflow-hidden max-w-lg w-full mx-4 ${RARITY_CONFIG[selectedItem.rarity].glow}`}
            >
              {/* Glow background */}
              <div className={`absolute inset-0 ${selectedItem.preview} opacity-10 blur-3xl`} />
              
              {/* Content */}
              <div className="relative">
                {/* Preview */}
                <div className="flex items-center justify-center py-16 relative">
                  <motion.div
                    animate={{ rotate: [0, 3, -3, 0], scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className={`w-40 h-40 rounded-[32px] ${selectedItem.preview} shadow-2xl`}
                  />
                  {/* Rarity badge */}
                  <div className={`absolute top-6 left-6 px-3 py-1.5 rounded-full ${RARITY_CONFIG[selectedItem.rarity].bg} border ${RARITY_CONFIG[selectedItem.rarity].border}`}>
                    <span className={`text-xs font-black uppercase tracking-widest ${RARITY_CONFIG[selectedItem.rarity].color}`}>
                      {RARITY_CONFIG[selectedItem.rarity].label}
                    </span>
                  </div>
                  <button onClick={handleCloseDetail} className="absolute top-6 right-6 p-2 bg-gray-800/80 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors">✕</button>
                </div>

                {/* Details */}
                <div className="p-8 border-t border-gray-800/50">
                  <h2 className="text-3xl font-black text-white uppercase tracking-wider mb-2">{selectedItem.nameDE}</h2>
                  <p className="text-gray-400 mb-6">{selectedItem.description}</p>

                  {/* Category + Level info */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded-lg text-xs font-bold uppercase tracking-wider">
                      {CATEGORY_LABELS[selectedItem.category as Category] || selectedItem.category}
                    </span>
                    {selectedItem.unlockLevel && (
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${meetsLevel(selectedItem) ? 'bg-green-900/50 text-green-400 border border-green-500/30' : 'bg-red-900/50 text-red-400 border border-red-500/30'}`}>
                        {meetsLevel(selectedItem) ? <Check size={12} className="inline mr-1" /> : <Lock size={12} className="inline mr-1" />}
                        Level {selectedItem.unlockLevel} benötigt
                      </span>
                    )}
                  </div>

                  {/* Price + Buy */}
                  {isOwned(selectedItem.id) ? (
                    <div className="flex items-center justify-center gap-3 py-5 px-8 bg-green-900/30 border border-green-500/30 rounded-2xl">
                      <Check size={24} className="text-green-400" />
                      <span className="text-green-300 font-black text-lg uppercase tracking-wider">Bereits im Besitz</span>
                    </div>
                  ) : !meetsLevel(selectedItem) ? (
                    <div className="flex items-center justify-center gap-3 py-5 px-8 bg-red-900/30 border border-red-500/30 rounded-2xl">
                      <Lock size={24} className="text-red-400" />
                      <span className="text-red-300 font-black text-lg uppercase tracking-wider">Level {selectedItem.unlockLevel} benötigt</span>
                    </div>
                  ) : showConfirm ? (
                    <div className="space-y-3">
                      <p className="text-center text-yellow-300 font-bold">Möchtest du wirklich kaufen?</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handlePurchase(selectedItem)}
                          className="flex-1 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-2xl text-white font-black uppercase tracking-wider shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all"
                        >
                          Ja, kaufen!
                        </button>
                        <button
                          onClick={() => setShowConfirm(false)}
                          className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-2xl text-gray-300 font-black uppercase tracking-wider transition-all"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowConfirm(true)}
                      disabled={!canAfford(selectedItem)}
                      className={`w-full py-5 rounded-2xl font-black text-xl uppercase tracking-wider flex items-center justify-center gap-3 transition-all ${
                        canAfford(selectedItem)
                          ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-[0_0_30px_rgba(236,72,153,0.3)]'
                          : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                      }`}
                    >
                      <Coins size={22} className="text-yellow-400" />
                      {selectedItem.isSale ? (
                        <span>
                          <span className="line-through text-gray-400 mr-2 text-base">{selectedItem.price}</span>
                          {getEffectivePrice(selectedItem)}
                        </span>
                      ) : (
                        <span>{selectedItem.price}</span>
                      )}
                      <span className="text-sm ml-1">Beats</span>
                      {!canAfford(selectedItem) && <span className="text-red-400 text-sm ml-2">(zu wenig!)</span>}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>{/* end right panel */}

      {/* ═══════ PURCHASE RESULT TOAST ═══════ */}
      <AnimatePresence>
        {purchaseResult && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] px-8 py-4 rounded-2xl font-black uppercase tracking-wider flex items-center gap-3 shadow-2xl ${
              purchaseResult.success 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border border-green-400/50' 
                : 'bg-gradient-to-r from-red-600 to-pink-600 text-white border border-red-400/50'
            }`}
          >
            {purchaseResult.success ? <Gift size={20} /> : <AlertTriangle size={20} />}
            {purchaseResult.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
