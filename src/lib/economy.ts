import { supabase } from './supabase';

// ─── Currency Types ───
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ShopItem {
  id: string;
  name: string;
  nameDE: string;
  category: 'jacket' | 'tshirt' | 'vest' | 'pants' | 'shorts' | 'shoes' | 'hat' | 'glasses' | 'beard' | 'mustache' | 'wings' | 'accessory' | 'effect' | 'set';
  rarity: Rarity;
  price: number;
  premiumPrice?: number;
  preview: string;
  description: string;
  unlockLevel?: number;
  isNew?: boolean;
  isSale?: boolean;
  salePercent?: number;
  /** For sets: list of item IDs included */
  setItems?: string[];
}

export interface WalletState {
  beats: number;
  diamonds: number; // Premium currency
  totalEarned: number;
  totalSpent: number;
}

export interface OwnedItem {
  itemId: string;
  purchasedAt: number;
}

export interface TransactionRecord {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  currency: 'beats' | 'diamonds';
  reason: string;
  timestamp: number;
}

// ─── Rarity Config ───
export const RARITY_CONFIG: Record<Rarity, { label: string; color: string; glow: string; border: string; bg: string; textColor: string }> = {
  common:    { label: 'Common',    color: 'text-gray-300',   glow: '',                                          border: 'border-gray-600',    bg: 'bg-gray-800',      textColor: '#d1d5db' },
  rare:      { label: 'Rare',      color: 'text-blue-400',   glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]',    border: 'border-blue-500/50', bg: 'bg-blue-950/30',   textColor: '#60a5fa' },
  epic:      { label: 'Epic',      color: 'text-purple-400', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.4)]',    border: 'border-purple-500/50', bg: 'bg-purple-950/30', textColor: '#c084fc' },
  legendary: { label: 'Legendary', color: 'text-yellow-400', glow: 'shadow-[0_0_25px_rgba(250,204,21,0.5)]',    border: 'border-yellow-500/50', bg: 'bg-yellow-950/30', textColor: '#facc15' },
};

// ─── SHOP CATALOG ───
export const SHOP_CATALOG: ShopItem[] = [
  // ── Jackets ──
  { id: 'j_neon_racer',     name: 'Neon Racer',        nameDE: 'Neon Racer',        category: 'jacket',    rarity: 'rare',      price: 2500,  preview: 'bg-gradient-to-r from-cyan-500 to-blue-500',     description: 'Leuchtende Neon-Rennfahrerjacke', isNew: true },
  { id: 'j_cyber_punk',     name: 'Cyber Punk',        nameDE: 'Cyber Punk',        category: 'jacket',    rarity: 'epic',      price: 5000,  preview: 'bg-gradient-to-r from-pink-500 to-purple-600',   description: 'Cyberpunk-Lederjacke mit Glitch-Effekt' },
  { id: 'j_galaxy_coat',    name: 'Galaxy Coat',       nameDE: 'Galaxie-Mantel',    category: 'jacket',    rarity: 'legendary', price: 15000, preview: 'bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500', description: 'Ein Mantel gewebt aus Sternennebeln', unlockLevel: 15 },
  { id: 'j_streetwear',     name: 'Street King',       nameDE: 'Street King',       category: 'jacket',    rarity: 'common',    price: 800,   preview: 'bg-gray-700',       description: 'Lässige Streetwear-Jacke' },
  { id: 'j_flame_hoodie',   name: 'Flame Hoodie',      nameDE: 'Flammen-Hoodie',    category: 'jacket',    rarity: 'rare',      price: 3000,  preview: 'bg-gradient-to-r from-orange-500 to-red-600',    description: 'Hoodie mit animiertem Flammen-Print', isSale: true, salePercent: 20 },
  { id: 'j_arctic_puffer',  name: 'Arctic Puffer',     nameDE: 'Arctic Puffer',     category: 'jacket',    rarity: 'rare',      price: 2800,  preview: 'bg-gradient-to-r from-sky-200 to-blue-300',      description: 'Ultra-warme Arctic-Winterjacke' },
  { id: 'j_holo_vest',      name: 'Holo Vest',         nameDE: 'Holo-Weste',        category: 'jacket',    rarity: 'epic',      price: 6500,  preview: 'bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-500', description: 'Holographische Weste die im Licht schimmert', unlockLevel: 8 },
  { id: 'j_military_tac',   name: 'Tac Ops',           nameDE: 'Tac Ops',           category: 'jacket',    rarity: 'common',    price: 1000,  preview: 'bg-green-900',      description: 'Taktische Einsatzjacke' },

  // ── Pants ──
  { id: 'p_neon_jogger',    name: 'Neon Jogger',       nameDE: 'Neon-Jogginghose',  category: 'pants',     rarity: 'rare',      price: 2000,  preview: 'bg-gradient-to-r from-green-400 to-emerald-500', description: 'Jogginghose mit Neon-Streifen', isNew: true },
  { id: 'p_cargo_black',    name: 'Cargo Noir',        nameDE: 'Cargo Noir',        category: 'pants',     rarity: 'common',    price: 600,   preview: 'bg-gray-900',       description: 'Schwarze Cargo-Hose mit extra Taschen' },
  { id: 'p_glitch_denim',   name: 'Glitch Denim',      nameDE: 'Glitch-Jeans',      category: 'pants',     rarity: 'epic',      price: 4500,  preview: 'bg-gradient-to-r from-violet-600 to-fuchsia-500', description: 'Jeans mit holographischem Glitch-Muster' },
  { id: 'p_track_gold',     name: 'Gold Tracks',       nameDE: 'Gold Tracks',       category: 'pants',     rarity: 'legendary', price: 12000, preview: 'bg-gradient-to-r from-yellow-400 to-amber-500',  description: 'Trainingshose mit goldenen Seitenstreifen', unlockLevel: 12 },
  { id: 'p_skater_ripped',  name: 'Ripped Skater',     nameDE: 'Ripped Skater',     category: 'pants',     rarity: 'common',    price: 700,   preview: 'bg-blue-900',       description: 'Zerrissene Skater-Jeans' },
  { id: 'p_techwear',       name: 'Tech Wear',         nameDE: 'Tech Wear',         category: 'pants',     rarity: 'rare',      price: 2200,  preview: 'bg-gradient-to-r from-gray-700 to-gray-500',     description: 'Futuristische Techwear-Hose', isSale: true, salePercent: 15 },

  // ── Shoes ──
  { id: 's_air_glow',       name: 'Air Glow',          nameDE: 'Air Glow',          category: 'shoes',     rarity: 'rare',      price: 1800,  preview: 'bg-gradient-to-r from-cyan-400 to-blue-400',     description: 'Sneakers mit leuchtender Sohle' },
  { id: 's_retro_high',     name: 'Retro High',        nameDE: 'Retro High',        category: 'shoes',     rarity: 'common',    price: 500,   preview: 'bg-red-700',        description: 'Klassische High-Top Sneakers' },
  { id: 's_chrome_boots',   name: 'Chrome Boots',      nameDE: 'Chrome Boots',      category: 'shoes',     rarity: 'epic',      price: 4000,  preview: 'bg-gradient-to-r from-gray-300 to-gray-500',     description: 'Verspiegelte Chrome-Stiefel', isNew: true },
  { id: 's_plasma_kicks',   name: 'Plasma Kicks',      nameDE: 'Plasma Kicks',      category: 'shoes',     rarity: 'legendary', price: 10000, preview: 'bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400', description: 'Schuhe mit Plasma-Energie-Effekt', unlockLevel: 10 },
  { id: 's_skate_pros',     name: 'Skate Pro',         nameDE: 'Skate Pro',         category: 'shoes',     rarity: 'common',    price: 600,   preview: 'bg-gray-600',       description: 'Flache Skateboard-Schuhe' },
  { id: 's_hovermax',       name: 'HoverMax',          nameDE: 'HoverMax',          category: 'shoes',     rarity: 'rare',      price: 2500,  preview: 'bg-gradient-to-r from-emerald-500 to-teal-500',  description: 'Futuristische Hover-Sneakers' },

  // ── Accessories ──
  { id: 'a_led_shades',     name: 'LED Shades',        nameDE: 'LED-Brille',        category: 'accessory', rarity: 'rare',      price: 1500,  preview: 'bg-gradient-to-r from-red-500 to-pink-500',      description: 'Sonnenbrille mit LED-Lichtern' },
  { id: 'a_halo_ring',      name: 'Halo Ring',         nameDE: 'Halo-Ring',         category: 'accessory', rarity: 'legendary', price: 20000, preview: 'bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400', description: 'Schwebender leuchtender Heiligenschein', unlockLevel: 20 },
  { id: 'a_headphones',     name: 'DJ Headphones',     nameDE: 'DJ-Kopfhörer',      category: 'accessory', rarity: 'common',    price: 900,   preview: 'bg-gray-500',       description: 'Overear-DJ-Kopfhörer' },
  { id: 'a_chain_gold',     name: 'Gold Chain',        nameDE: 'Goldkette',         category: 'accessory', rarity: 'epic',      price: 5500,  preview: 'bg-gradient-to-r from-yellow-500 to-amber-600',  description: 'Massive goldene Halskette' },

  // ── T-Shirts ──
  { id: 't_neon_glow',      name: 'Neon Glow Tee',     nameDE: 'Neon-Glow-Shirt',   category: 'tshirt',    rarity: 'rare',      price: 1800,  preview: 'bg-gradient-to-r from-emerald-400 to-cyan-400',  description: 'T-Shirt mit leuchtendem Neon-Print', isNew: true },
  { id: 't_band_metal',     name: 'Metal Band Tee',    nameDE: 'Metal-Band-Shirt',  category: 'tshirt',    rarity: 'common',    price: 600,   preview: 'bg-gray-900',       description: 'Klassisches Metal-Band T-Shirt' },
  { id: 't_tie_dye',        name: 'Tie Dye',           nameDE: 'Batik-Shirt',       category: 'tshirt',    rarity: 'rare',      price: 1500,  preview: 'bg-gradient-to-r from-pink-400 via-yellow-300 to-blue-400', description: 'Buntes Batik-Muster' },
  { id: 't_hologram',       name: 'Hologram Tee',      nameDE: 'Hologramm-Shirt',   category: 'tshirt',    rarity: 'epic',      price: 4500,  preview: 'bg-gradient-to-r from-violet-500 via-cyan-400 to-pink-500', description: 'Shirt mit holographischem Effekt', unlockLevel: 7 },

  // ── Vests ──
  { id: 'v_biker',          name: 'Biker Vest',        nameDE: 'Biker-Weste',       category: 'vest',      rarity: 'rare',      price: 2200,  preview: 'bg-gray-800',       description: 'Klassische Biker-Lederweste' },
  { id: 'v_tactical',       name: 'Tactical Vest',     nameDE: 'Taktische Weste',   category: 'vest',      rarity: 'epic',      price: 4000,  preview: 'bg-green-900',      description: 'Militärische Taktikweste', unlockLevel: 6 },
  { id: 'v_shimmer',        name: 'Shimmer Vest',      nameDE: 'Schimmer-Weste',    category: 'vest',      rarity: 'legendary', price: 12000, preview: 'bg-gradient-to-r from-fuchsia-400 to-indigo-400', description: 'Holographische Disco-Weste', unlockLevel: 14 },

  // ── Shorts ──
  { id: 'sh_basketball',    name: 'Basketball Shorts',  nameDE: 'Basketball-Shorts', category: 'shorts',    rarity: 'common',    price: 500,   preview: 'bg-red-700',        description: 'Sportliche Basketball-Shorts' },
  { id: 'sh_swim_neon',     name: 'Neon Swim',         nameDE: 'Neon-Badeshorts',   category: 'shorts',    rarity: 'rare',      price: 1500,  preview: 'bg-gradient-to-r from-yellow-400 to-pink-500', description: 'Leuchtende Badeshorts', isNew: true },
  { id: 'sh_cargo_black',   name: 'Cargo Short',       nameDE: 'Cargo-Shorts',      category: 'shorts',    rarity: 'common',    price: 700,   preview: 'bg-stone-800',      description: 'Schwarze Cargo-Shorts' },

  // ── Hats ──
  { id: 'h_snapback_fire',  name: 'Fire Snapback',     nameDE: 'Flammen-Snapback',  category: 'hat',       rarity: 'rare',      price: 2000,  preview: 'bg-gradient-to-r from-orange-500 to-red-600',   description: 'Snapback mit Flammen-Design', isNew: true },
  { id: 'h_beanie_neon',    name: 'Neon Beanie',       nameDE: 'Neon-Muetze',       category: 'hat',       rarity: 'rare',      price: 1800,  preview: 'bg-gradient-to-r from-green-400 to-cyan-400',   description: 'Leuchtende Neon-Mütze' },
  { id: 'h_tophat_gold',    name: 'Gold Top Hat',      nameDE: 'Gold-Zylinder',     category: 'hat',       rarity: 'legendary', price: 18000, preview: 'bg-gradient-to-r from-yellow-300 to-amber-500', description: 'Vergoldeter Luxus-Zylinder', unlockLevel: 18 },
  { id: 'h_crown_diamond',  name: 'Diamond Crown',     nameDE: 'Diamant-Krone',     category: 'hat',       rarity: 'legendary', price: 30000, preview: 'bg-gradient-to-r from-cyan-200 via-white to-cyan-200', description: 'Krone besetzt mit Diamanten', unlockLevel: 25, premiumPrice: 80 },
  { id: 'h_fedora',         name: 'Fedora',            nameDE: 'Fedora',            category: 'hat',       rarity: 'common',    price: 900,   preview: 'bg-stone-700',      description: 'Klassischer Fedora-Hut' },

  // ── Glasses ──
  { id: 'g_vr_headset',     name: 'VR Headset',        nameDE: 'VR-Brille',         category: 'glasses',   rarity: 'epic',      price: 5500,  preview: 'bg-gradient-to-r from-blue-600 to-purple-600',  description: 'Futuristische VR-Brille', unlockLevel: 9, isNew: true },
  { id: 'g_monocle',        name: 'Gold Monocle',      nameDE: 'Gold-Monokel',      category: 'glasses',   rarity: 'epic',      price: 6000,  preview: 'bg-amber-500',      description: 'Vergoldetes Monokel für Gentlemen' },
  { id: 'g_pixel_shades',   name: 'Pixel Shades',      nameDE: 'Pixel-Brille',      category: 'glasses',   rarity: 'rare',      price: 2000,  preview: 'bg-emerald-600',    description: 'Verpixelte Thug-Life-Brille' },

  // ── Beards ──
  { id: 'b_viking',         name: 'Viking Beard',      nameDE: 'Wikingerbart',      category: 'beard',     rarity: 'epic',      price: 3500,  preview: 'bg-amber-800',      description: 'Mächtiger Wikingerbart mit Zöpfen', unlockLevel: 8 },
  { id: 'b_santa',          name: 'Santa Beard',       nameDE: 'Weihnachtsbart',    category: 'beard',     rarity: 'legendary', price: 8000,  preview: 'bg-gray-100',       description: 'Flauschiger weißer Weihnachtsbart', unlockLevel: 15 },

  // ── Mustaches ──
  { id: 'm_curly',          name: 'Curly Stache',      nameDE: 'Schnörkelbart',     category: 'mustache',  rarity: 'rare',      price: 1500,  preview: 'bg-stone-700',      description: 'Aufwendig gezwirbelter Schnurrbart' },
  { id: 'm_walrus',         name: 'Walrus',            nameDE: 'Walross-Bart',      category: 'mustache',  rarity: 'epic',      price: 3000,  preview: 'bg-stone-600',      description: 'Imposanter Walross-Schnurrbart', unlockLevel: 6 },

  // ── Wings ──
  { id: 'w_angel_gold',     name: 'Gold Angel Wings',  nameDE: 'Gold-Engelsflügel', category: 'wings',     rarity: 'legendary', price: 20000, preview: 'bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400', description: 'Majestätische goldene Engelsflügel', unlockLevel: 20 },
  { id: 'w_butterfly',      name: 'Butterfly Wings',   nameDE: 'Schmetterlingsflügel', category: 'wings', rarity: 'epic',      price: 8000,  preview: 'bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400', description: 'Schimmernde Schmetterlingsflügel', unlockLevel: 10 },
  { id: 'w_bat',            name: 'Bat Wings',         nameDE: 'Fledermausflügel',  category: 'wings',     rarity: 'rare',      price: 4000,  preview: 'bg-gray-900',       description: 'Dunkle Fledermausflügel' },
  { id: 'w_cyber',          name: 'Cyber Wings',       nameDE: 'Cyber-Flügel',      category: 'wings',     rarity: 'legendary', price: 25000, preview: 'bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500', description: 'Mechanische Cyber-Flügel mit LED', unlockLevel: 22, premiumPrice: 60 },

  // ── Complete Sets ──
  { id: 'set_street_king',  name: 'Street King Set',   nameDE: 'Street-King-Set',   category: 'set',       rarity: 'epic',      price: 8000,  preview: 'bg-gradient-to-r from-gray-800 to-gray-600',    description: 'Komplettes Streetwear-Outfit: Jacke + Hose + Schuhe + Snapback', unlockLevel: 5, setItems: ['j_streetwear', 'p_cargo_black', 's_retro_high', 'h_snapback_fire'] },
  { id: 'set_neon_dancer',  name: 'Neon Dancer Set',   nameDE: 'Neon-Dancer-Set',   category: 'set',       rarity: 'legendary', price: 20000, preview: 'bg-gradient-to-r from-cyan-400 via-pink-400 to-purple-400', description: 'Leuchtendes Neon-Outfit: T-Shirt + Jogger + Schuhe + LED-Brille', unlockLevel: 12, setItems: ['t_neon_glow', 'p_neon_jogger', 's_air_glow', 'g_pixel_shades'], isNew: true },
  { id: 'set_royal',        name: 'Royal Set',         nameDE: 'Royal-Set',         category: 'set',       rarity: 'legendary', price: 50000, preview: 'bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500', description: 'Königliches Komplett-Set: Gold-Jacke + Gold-Hose + Gold-Schuhe + Krone + Engelsflügel', unlockLevel: 25, setItems: ['j_galaxy_coat', 'p_track_gold', 's_plasma_kicks', 'h_crown_diamond', 'w_angel_gold'], premiumPrice: 100 },

  // ── Effects ──
  { id: 'e_sparkle_trail',  name: 'Sparkle Trail',     nameDE: 'Funken-Spur',       category: 'effect',    rarity: 'epic',      price: 7000,  preview: 'bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-400', description: 'Funkenspur beim Tanzen', isNew: true },
  { id: 'e_smoke_aura',     name: 'Smoke Aura',        nameDE: 'Rauch-Aura',        category: 'effect',    rarity: 'rare',      price: 3000,  preview: 'bg-gradient-to-r from-gray-500 to-gray-700',     description: 'Mysteriöse Rauchaura um deinen Avatar' },
  { id: 'e_fire_dance',     name: 'Fire Dance',        nameDE: 'Feuer-Tanz',        category: 'effect',    rarity: 'legendary', price: 25000, preview: 'bg-gradient-to-r from-orange-500 via-red-500 to-yellow-400', description: 'Dein Avatar tanzt in Flammen!', unlockLevel: 25, premiumPrice: 50 },
  { id: 'e_butterflies',    name: 'Butterfly Swarm',   nameDE: 'Schmetterlinge',    category: 'effect',    rarity: 'epic',      price: 8000,  preview: 'bg-gradient-to-r from-pink-400 to-fuchsia-400',  description: 'Ein Schwarm pinker Schmetterlinge umkreist dich', isNew: true },
  { id: 'e_eye_lightning',  name: 'Eye Lightning',     nameDE: 'Augen-Blitze',      category: 'effect',    rarity: 'rare',      price: 4500,  preview: 'bg-cyan-400',       description: 'Aus deinen Augen schießen dauerhaft Blitze' },
  { id: 'e_music_notes',    name: 'Rhythm Notes',      nameDE: 'Tanz-Noten',        category: 'effect',    rarity: 'rare',      price: 4000,  preview: 'bg-gradient-to-r from-blue-400 to-cyan-400',     description: 'Fliegende leuchtende Musiknoten' },
  { id: 'e_black_hole',     name: 'Dark Matter',       nameDE: 'Dunkle Materie',    category: 'effect',    rarity: 'legendary', price: 30000, preview: 'bg-gradient-to-r from-purple-900 via-black to-fuchsia-900', description: 'Gefährliche kosmische Energie', unlockLevel: 20 },
  { id: 'e_cyber_matrix',   name: 'Digital Matrix',    nameDE: 'Matrix-Code',       category: 'effect',    rarity: 'epic',      price: 15000, preview: 'bg-gradient-to-b from-green-400 to-emerald-600', description: 'Digitaler animierter Matrix-Code' },
  { id: 'e_admin_aura',     name: 'Super Saiyan Aura', nameDE: 'Super Saiyajin Aura', category: 'effect', rarity: 'legendary', price: 0,     preview: 'bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500', description: 'Goldene SSJ-Aura mit Blitzen und Saiyajin-Frisur. Nur für Admins!', unlockLevel: 999 },
];

// ─── Beats Earning Formulas ───
export function calculateBeatsEarned(score: number, combo: number, multiplier: number, songCount: number): number {
  const baseBeats = Math.floor(score * 0.1);
  const comboBonus = Math.floor(combo * 2);
  const multiBonus = Math.floor(multiplier * 50);
  const songBonus = songCount * 100;
  return baseBeats + comboBonus + multiBonus + songBonus;
}

// ─── Local Wallet ───
const WALLET_KEY = 'tubedance_wallet';
const OWNED_KEY = 'tubedance_owned_items';
const TX_KEY = 'tubedance_transactions';

export function getLocalWallet(): WalletState {
  const saved = localStorage.getItem(WALLET_KEY);
  return saved ? JSON.parse(saved) : { beats: 500, diamonds: 5, totalEarned: 500, totalSpent: 0 };
}

export function saveLocalWallet(wallet: WalletState) {
  localStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
  // Immediately persist to Supabase
  if (_cachedUserId) {
    supabase.from('profiles').update({
      coins: wallet.beats,
      diamonds: wallet.diamonds,
      total_earned: wallet.totalEarned,
      total_spent: wallet.totalSpent,
    }).eq('id', _cachedUserId).then(() => {}, () => {});
  }
}

export function getOwnedItems(): OwnedItem[] {
  const saved = localStorage.getItem(OWNED_KEY);
  return saved ? JSON.parse(saved) : [];
}

export function saveOwnedItems(items: OwnedItem[]) {
  localStorage.setItem(OWNED_KEY, JSON.stringify(items));
  // Immediately persist to Supabase
  if (_cachedUserId) {
    supabase.from('profiles').update({ owned_items: JSON.stringify(items) }).eq('id', _cachedUserId).then(() => {}, () => {});
  }
}

export function getTransactions(): TransactionRecord[] {
  const saved = localStorage.getItem(TX_KEY);
  return saved ? JSON.parse(saved) : [];
}

export function addTransaction(tx: Omit<TransactionRecord, 'id' | 'timestamp'>) {
  const txs = getTransactions();
  txs.unshift({ ...tx, id: crypto.randomUUID(), timestamp: Date.now() });
  // Keep last 100
  if (txs.length > 100) txs.length = 100;
  localStorage.setItem(TX_KEY, JSON.stringify(txs));
  // Immediately persist to Supabase
  if (_cachedUserId) {
    supabase.from('profiles').update({ transactions_json: JSON.stringify(txs) }).eq('id', _cachedUserId).then(() => {}, () => {});
  }
}

// Set by App.tsx when user role is known
let _currentUserRole: string = 'user';
export function setEconomyUserRole(role: string) { _currentUserRole = role; }
export function isAdminEconomy(): boolean { return _currentUserRole === 'admin' || _currentUserRole === 'gamemaster'; }

export function purchaseItem(itemId: string): { success: boolean; error?: string } {
  const item = SHOP_CATALOG.find(i => i.id === itemId);
  if (!item) return { success: false, error: 'Item nicht gefunden' };

  const owned = getOwnedItems();
  if (owned.find(o => o.itemId === itemId)) return { success: false, error: 'Bereits im Besitz' };

  // Admins get everything for free
  if (!isAdminEconomy()) {
    const wallet = getLocalWallet();
    const finalPrice = item.isSale && item.salePercent ? Math.floor(item.price * (1 - item.salePercent / 100)) : item.price;

    if (wallet.beats < finalPrice) return { success: false, error: 'Nicht genug Beats' };

    wallet.beats -= finalPrice;
    wallet.totalSpent += finalPrice;
    saveLocalWallet(wallet);

    addTransaction({ type: 'spend', amount: finalPrice, currency: 'beats', reason: `Kauf: ${item.nameDE}` });
  } else {
    addTransaction({ type: 'spend', amount: 0, currency: 'beats', reason: `Admin-Kauf: ${item.nameDE}` });
  }

  owned.push({ itemId, purchasedAt: Date.now() });
  saveOwnedItems(owned);

  // Auto-sync to Supabase
  autoSync();

  return { success: true };
}

export function earnBeats(amount: number, reason: string) {
  const wallet = getLocalWallet();
  wallet.beats += amount;
  wallet.totalEarned += amount;
  saveLocalWallet(wallet);
  addTransaction({ type: 'earn', amount, currency: 'beats', reason });
  // Auto-sync to Supabase
  autoSync();
}

// ─── Supabase Sync (for logged-in users) ───
// NOTE: DB column is 'coins' (from migration), mapped to 'beats' in frontend
// Core columns that always exist after migration 001:
const CORE_WALLET_COLS = 'coins, diamonds, total_earned, total_spent, owned_items';

export async function syncWalletToSupabase(userId: string) {
  const wallet = getLocalWallet();
  const owned = getOwnedItems();

  try {
    // Read server values first so we never overwrite gifts/admin changes
    const { data: server } = await supabase.from('profiles').select(CORE_WALLET_COLS).eq('id', userId).single();

    const mergedBeats = Math.max(wallet.beats, server?.coins ?? 0);
    const mergedDiamonds = Math.max(wallet.diamonds, server?.diamonds ?? 0);
    const mergedEarned = Math.max(wallet.totalEarned, server?.total_earned ?? 0);
    const mergedSpent = Math.max(wallet.totalSpent, server?.total_spent ?? 0);

    // Merge owned items (union)
    let mergedOwnedStr = JSON.stringify(owned);
    if (server?.owned_items) {
      try {
        const serverItems: OwnedItem[] = JSON.parse(server.owned_items);
        const localIds = new Set(owned.map(i => i.itemId));
        const merged = [...owned];
        for (const si of serverItems) {
          if (!localIds.has(si.itemId)) merged.push(si);
        }
        mergedOwnedStr = JSON.stringify(merged);
        // Also update local
        saveOwnedItems(merged);
      } catch(e) {}
    }

    // Update local with merged values
    saveLocalWallet({ beats: mergedBeats, diamonds: mergedDiamonds, totalEarned: mergedEarned, totalSpent: mergedSpent });

    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      coins: mergedBeats,
      diamonds: mergedDiamonds,
      total_earned: mergedEarned,
      total_spent: mergedSpent,
      owned_items: mergedOwnedStr,
    });
    if (error) console.warn('Wallet sync error:', error.message);

    // Try syncing optional columns (may not exist if migration 002 wasn't run)
    const txs = getTransactions();
    const dailyState = localStorage.getItem('tubedance_daily_login');
    await supabase.from('profiles').update({
      transactions_json: JSON.stringify(txs),
      daily_login_json: dailyState || null,
    }).eq('id', userId).then(() => {}, () => {});
  } catch(e) {
    console.warn('Wallet sync failed', e);
  }
}

export async function loadWalletFromSupabase(userId: string): Promise<boolean> {
  try {
    // Only query core columns that are guaranteed to exist
    const { data, error } = await supabase.from('profiles').select(CORE_WALLET_COLS).eq('id', userId).single();
    if (error) {
      console.warn('Wallet load query error:', error.message);
      return false;
    }
    if (data && data.coins !== null && data.coins !== undefined) {
      saveLocalWallet({
        beats: data.coins,
        diamonds: data.diamonds || 0,
        totalEarned: data.total_earned || 0,
        totalSpent: data.total_spent || 0,
      });
      if (data.owned_items) {
        try { saveOwnedItems(JSON.parse(data.owned_items)); } catch(e) {}
      }

      // Try loading optional columns (may not exist)
      const { data: extra } = await supabase.from('profiles').select('transactions_json, daily_login_json').eq('id', userId).single();
      if (extra) {
        if (extra.transactions_json) {
          try { localStorage.setItem(TX_KEY, extra.transactions_json); } catch(e) {}
        }
        if (extra.daily_login_json) {
          try { localStorage.setItem('tubedance_daily_login', extra.daily_login_json); } catch(e) {}
        }
      }
      return true;
    }
  } catch(e) { console.warn('Wallet load failed', e); }
  return false;
}

// ─── Smart Merge: picks up gifts/admin changes from server ───
export async function syncWalletFromServer(userId: string): Promise<void> {
  try {
    const { data, error } = await supabase.from('profiles').select(CORE_WALLET_COLS).eq('id', userId).single();
    if (error || !data) {
      console.warn('syncWalletFromServer failed:', error?.message);
      return;
    }

    const local = getLocalWallet();
    const serverBeats = data.coins ?? 0;
    const serverDiamonds = data.diamonds ?? 0;

    // Take the HIGHER value — this preserves both local earnings AND server-side gifts
    const mergedWallet: WalletState = {
      beats: Math.max(local.beats, serverBeats),
      diamonds: Math.max(local.diamonds, serverDiamonds),
      totalEarned: Math.max(local.totalEarned, data.total_earned || 0),
      totalSpent: Math.max(local.totalSpent, data.total_spent || 0),
    };
    saveLocalWallet(mergedWallet);

    // Merge owned items (union of local + server)
    if (data.owned_items) {
      try {
        const serverItems: OwnedItem[] = JSON.parse(data.owned_items);
        const localItems = getOwnedItems();
        const localIds = new Set(localItems.map(i => i.itemId));
        for (const si of serverItems) {
          if (!localIds.has(si.itemId)) {
            localItems.push(si);
          }
        }
        saveOwnedItems(localItems);
      } catch(e) {}
    }

    // Push the merged state back to server
    await syncWalletToSupabase(userId);
  } catch(e) {
    console.warn('syncWalletFromServer failed', e);
  }
}

// Helper: get current logged-in userId (if any)
let _cachedUserId: string | null = null;
let _walletLoaded = false; // prevent autoSync from overwriting server before initial load
export function setEconomyUserId(uid: string | null) {
  _cachedUserId = uid;
  if (!uid) _walletLoaded = false;
}
export function markWalletLoaded() { _walletLoaded = true; }
function autoSync() {
  // Only sync TO server AFTER we've loaded FROM server first
  if (_cachedUserId && _walletLoaded) syncWalletToSupabase(_cachedUserId);
}

// ─── Admin RPC Wrappers ───
import type { UserRole } from './roles';

export async function adminGiftBeats(targetUserId: string, amount: number, reason: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('admin_gift_beats', { target_user_id: targetUserId, amount, reason });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function adminGiftItem(targetUserId: string, itemId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('admin_gift_item', { target_user_id: targetUserId, item_id: itemId });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function adminSetRole(targetUserId: string, newRole: UserRole): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('admin_set_role', { target_user_id: targetUserId, new_role: newRole });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
