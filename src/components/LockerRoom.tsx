import { useState, useMemo } from 'react';
import { AnimatedAvatar } from './AnimatedAvatar';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Edit2, Check, User, Shirt, Sparkles, Smile, Crown, Package, Backpack, X } from 'lucide-react';
import { SHOP_CATALOG, getOwnedItems } from '../lib/economy';

// ─── Types ──────────────────────────────────────────────────────────
export interface BodyParams {
  gender: 'male' | 'female';
  height: number;
  muscles: number;
  bodyFat: number;
  headSize: number;
  skinColor: string;
}

export interface FaceParams {
  eyeStyle: 'normal' | 'happy' | 'cool' | 'angry' | 'sad' | 'wink';
  eyeColor: string;
  mouthStyle: 'smile' | 'neutral' | 'open' | 'grin' | 'pout';
  hairStyle: 'none' | 'short' | 'long' | 'spike' | 'ponytail';
  hairColor: string;
}

export const DEFAULT_BODY: BodyParams = {
  gender: 'male', height: 1, muscles: 0.3, bodyFat: 0.2, headSize: 1, skinColor: '#f3f4f6',
};

export const DEFAULT_FACE: FaceParams = {
  eyeStyle: 'normal', eyeColor: '#22d3ee', mouthStyle: 'smile', hairStyle: 'long', hairColor: '#1f2937'
};

export interface PlayerProfile {
  level: number;
  exp: number;
  jacket: string;
  tshirt: string;
  vest: string;
  pants: string;
  shorts: string;
  shoes: string;
  hat: string;
  glasses: string;
  beard: string;
  mustache: string;
  wings: string;
  effect: string;
  accessory: string;
  body: BodyParams;
  face: FaceParams;
  rpm_url?: string;
}

interface LockerRoomProps {
  profile: PlayerProfile;
  username: string;
  onSave: (p: PlayerProfile, newUsername?: string) => void;
  onBack: () => void;
}

// ─── Wardrobe Data ──────────────────────────────────────────────────
type ClothingTab = 'jacket' | 'tshirt' | 'vest' | 'pants' | 'shorts' | 'shoes' | 'hat' | 'glasses' | 'beard' | 'mustache' | 'wings' | 'accessory' | 'effect';

interface WardrobeItem {
  id: string;
  name: string;
  preview: string;
  reqLevel: number;
}

const WARDROBE: Partial<Record<ClothingTab, WardrobeItem[]>> = {
  jacket: [
    { id: 'none', name: 'Keine', preview: 'bg-gray-800 border border-dashed border-gray-600', reqLevel: 1 },
    { id: 'leather_black', name: 'Black Leather', preview: 'bg-gray-900', reqLevel: 1 },
    { id: 'camo_green', name: 'Jungle Camo', preview: 'bg-green-800', reqLevel: 1 },
    { id: 'plaid_red', name: 'Lumberjack', preview: 'bg-red-600', reqLevel: 2 },
    { id: 'tracksuit_red', name: 'Red Tracksuit', preview: 'bg-red-500', reqLevel: 3 },
    { id: 'swag_gold', name: 'Golden Swag', preview: 'bg-yellow-400', reqLevel: 10 },
  ],
  tshirt: [
    { id: 'none', name: 'Keines', preview: 'bg-gray-800 border border-dashed border-gray-600', reqLevel: 1 },
    { id: 'tshirt_white', name: 'Weiss', preview: 'bg-gray-100', reqLevel: 1 },
    { id: 'tshirt_black', name: 'Schwarz', preview: 'bg-gray-900', reqLevel: 1 },
    { id: 'tshirt_red', name: 'Rot', preview: 'bg-red-600', reqLevel: 1 },
    { id: 'tshirt_blue', name: 'Blau', preview: 'bg-blue-600', reqLevel: 1 },
    { id: 'tshirt_neon', name: 'Neon', preview: 'bg-emerald-500', reqLevel: 3 },
    { id: 'tshirt_stripe', name: 'Gestreift', preview: 'bg-blue-900', reqLevel: 2 },
  ],
  vest: [
    { id: 'none', name: 'Keine', preview: 'bg-gray-800 border border-dashed border-gray-600', reqLevel: 1 },
    { id: 'vest_leather', name: 'Leder', preview: 'bg-stone-800', reqLevel: 3 },
    { id: 'vest_denim', name: 'Denim', preview: 'bg-blue-800', reqLevel: 2 },
    { id: 'vest_neon', name: 'Neon', preview: 'bg-gradient-to-r from-fuchsia-400 to-indigo-400', reqLevel: 5 },
  ],
  pants: [
    { id: 'none', name: 'Keine', preview: 'bg-gray-800 border border-dashed border-gray-600', reqLevel: 1 },
    { id: 'denim_blue', name: 'Blue Denim', preview: 'bg-blue-800', reqLevel: 1 },
    { id: 'denim_black', name: 'Black Denim', preview: 'bg-gray-800', reqLevel: 1 },
    { id: 'tracksuit_black', name: 'Adidas Style', preview: 'bg-black', reqLevel: 2 },
    { id: 'camo_green', name: 'Camo Pants', preview: 'bg-green-800', reqLevel: 4 },
  ],
  shorts: [
    { id: 'none', name: 'Keine', preview: 'bg-gray-800 border border-dashed border-gray-600', reqLevel: 1 },
    { id: 'shorts_cargo', name: 'Cargo', preview: 'bg-lime-700', reqLevel: 1 },
    { id: 'shorts_denim', name: 'Denim', preview: 'bg-blue-500', reqLevel: 1 },
    { id: 'shorts_sport', name: 'Sport', preview: 'bg-gray-900', reqLevel: 2 },
  ],
  shoes: [
    { id: 'shoes_sneakers', name: 'White Sneakers', preview: 'bg-gray-200', reqLevel: 1 },
    { id: 'shoes_boots', name: 'Brown Boots', preview: 'bg-amber-900', reqLevel: 1 },
    { id: 'swag_gold', name: 'Golden Kicks', preview: 'bg-yellow-400', reqLevel: 10 },
  ],
  hat: [
    { id: 'none', name: 'Keinen', preview: 'bg-gray-800 border border-dashed border-gray-600', reqLevel: 1 },
    { id: 'hat_snapback', name: 'Snapback', preview: 'bg-gray-900', reqLevel: 1 },
    { id: 'hat_beanie', name: 'Beanie', preview: 'bg-purple-800', reqLevel: 2 },
    { id: 'hat_tophat', name: 'Zylinder', preview: 'bg-slate-900', reqLevel: 8 },
    { id: 'hat_crown', name: 'Krone', preview: 'bg-gradient-to-r from-yellow-400 to-amber-500', reqLevel: 15 },
  ],
  glasses: [
    { id: 'none', name: 'Keine', preview: 'bg-gray-800 border border-dashed border-gray-600', reqLevel: 1 },
    { id: 'glasses_shades', name: 'Shades', preview: 'bg-slate-900', reqLevel: 1 },
    { id: 'glasses_nerd', name: 'Nerd', preview: 'bg-slate-800', reqLevel: 2 },
    { id: 'glasses_led', name: 'LED', preview: 'bg-gradient-to-r from-red-500 via-cyan-400 to-purple-500', reqLevel: 5 },
    { id: 'glasses_aviator', name: 'Aviator', preview: 'bg-amber-700', reqLevel: 3 },
  ],
  beard: [
    { id: 'none', name: 'Keinen', preview: 'bg-gray-800 border border-dashed border-gray-600', reqLevel: 1 },
    { id: 'beard_stubble', name: 'Stoppeln', preview: 'bg-stone-600', reqLevel: 1 },
    { id: 'beard_goatee', name: 'Goatee', preview: 'bg-stone-800', reqLevel: 2 },
    { id: 'beard_full', name: 'Vollbart', preview: 'bg-amber-900', reqLevel: 3 },
  ],
  mustache: [
    { id: 'none', name: 'Keinen', preview: 'bg-gray-800 border border-dashed border-gray-600', reqLevel: 1 },
    { id: 'mustache_thin', name: 'Duenn', preview: 'bg-stone-900', reqLevel: 1 },
    { id: 'mustache_handlebar', name: 'Handlebar', preview: 'bg-stone-700', reqLevel: 3 },
  ],
  wings: [
    { id: 'none', name: 'Keine', preview: 'bg-gray-800 border border-dashed border-gray-600', reqLevel: 1 },
    { id: 'wings_angel', name: 'Engel', preview: 'bg-gray-100', reqLevel: 10 },
    { id: 'wings_demon', name: 'Daemon', preview: 'bg-red-950', reqLevel: 12 },
    { id: 'wings_neon', name: 'Neon', preview: 'bg-gradient-to-r from-cyan-400 to-purple-500', reqLevel: 15 },
  ],
};

const SKIN_COLORS = ['#f3f4f6', '#fde68a', '#fdba74', '#d4a574', '#a0845c', '#8b6b4a', '#6b4423', '#4a2c17'];
const EYE_COLORS = ['#22d3ee', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#22c55e', '#f59e0b', '#f3f4f6'];

type EditorCategory = 'body' | 'face' | 'inventory';

const CATEGORY_CONFIG: { id: EditorCategory; label: string; icon: typeof User }[] = [
  { id: 'inventory', label: 'Inventar', icon: Package },
  { id: 'body', label: 'Koerper', icon: User },
  { id: 'face', label: 'Gesicht', icon: Smile },
];

const CLOTHING_TABS: { id: ClothingTab | 'sets'; label: string; category: EditorCategory }[] = [
  { id: 'jacket', label: 'Jacken', category: 'inventory' },
  { id: 'tshirt', label: 'T-Shirts', category: 'inventory' },
  { id: 'vest', label: 'Westen', category: 'inventory' },
  { id: 'pants', label: 'Hosen', category: 'inventory' },
  { id: 'shorts', label: 'Shorts', category: 'inventory' },
  { id: 'shoes', label: 'Schuhe', category: 'inventory' },
  { id: 'hat', label: 'Huete', category: 'inventory' },
  { id: 'glasses', label: 'Brillen', category: 'inventory' },
  { id: 'beard', label: 'Bart', category: 'inventory' },
  { id: 'mustache', label: 'Schnurrbart', category: 'inventory' },
  { id: 'wings', label: 'Fluegel', category: 'inventory' },
  { id: 'accessory', label: 'Accessoire', category: 'inventory' },
  { id: 'effect', label: 'Effekte', category: 'inventory' },
  { id: 'sets', label: 'Sets', category: 'inventory' },
];

// ─── Equipment Slots ────────────────────────────────────────────────
const EQUIPMENT_SLOTS: { slot: ClothingTab; label: string; icon: string; row: 'top' | 'mid' | 'bot' }[] = [
  { slot: 'hat', label: 'Kopf', icon: '🎩', row: 'top' },
  { slot: 'glasses', label: 'Augen', icon: '👓', row: 'top' },
  { slot: 'beard', label: 'Bart', icon: '🧔', row: 'top' },
  { slot: 'mustache', label: 'Schnurr', icon: '👨', row: 'top' },
  { slot: 'jacket', label: 'Jacke', icon: '🧥', row: 'mid' },
  { slot: 'tshirt', label: 'Shirt', icon: '👕', row: 'mid' },
  { slot: 'vest', label: 'Weste', icon: '🦺', row: 'mid' },
  { slot: 'wings', label: 'Fluegel', icon: '🪽', row: 'mid' },
  { slot: 'accessory', label: 'Acce', icon: '💎', row: 'mid' },
  { slot: 'effect', label: 'Effekt', icon: '✨', row: 'mid' },
  { slot: 'pants', label: 'Hose', icon: '👖', row: 'bot' },
  { slot: 'shorts', label: 'Shorts', icon: '🩳', row: 'bot' },
  { slot: 'shoes', label: 'Schuhe', icon: '👟', row: 'bot' },
];

function getItemName(slot: ClothingTab, id: string): string {
  if (!id || id === 'none') return '—';
  // Check shop catalog first
  const shopItem = SHOP_CATALOG.find(i => i.id === id);
  if (shopItem) return shopItem.name;
  const items = WARDROBE[slot];
  return items?.find(i => i.id === id)?.name || id;
}

// ─── Component ──────────────────────────────────────────────────────
export function LockerRoom({ profile, username, onSave, onBack }: LockerRoomProps) {
  const [activeCategory, setActiveCategory] = useState<EditorCategory>('body');
  const [activeTab, setActiveTab] = useState<ClothingTab | 'sets'>('jacket');
  const [tempProfile, setTempProfile] = useState<PlayerProfile>({
    ...profile,
    body: profile.body || DEFAULT_BODY,
    face: profile.face || DEFAULT_FACE,
    tshirt: profile.tshirt || 'none',
    vest: profile.vest || 'none',
    shorts: profile.shorts || 'none',
    hat: profile.hat || 'none',
    glasses: profile.glasses || 'none',
    beard: profile.beard || 'none',
    mustache: profile.mustache || 'none',
    wings: profile.wings || 'none',
    effect: profile.effect || 'none',
    accessory: profile.accessory || 'none',
  });
  const [tempName, setTempName] = useState(username);
  const [isEditingName, setIsEditingName] = useState(false);

  const expNeeded = tempProfile.level * 1000;
  const progress = (tempProfile.exp / expNeeded) * 100;

  // Build dynamic wardrobe based on purchased items
  const dynamicWardrobe = useMemo(() => {
    const defaultStarters = ['none', 'leather_black', 'denim_blue', 'shoes_sneakers'];
    const ownedIds = new Set(getOwnedItems().map(o => o.itemId));
    
    const result: Record<string, WardrobeItem[]> = {};
    
    // Default categories
    for (const key in WARDROBE) {
      result[key] = (WARDROBE[key as ClothingTab] || []).filter(item => defaultStarters.includes(item.id));
    }
    
    // Sets category
    result['sets'] = [];

    // Add SHOP_CATALOG items
    SHOP_CATALOG.forEach(item => {
      if (ownedIds.has(item.id)) {
        const cat = item.category === 'set' ? 'sets' : item.category;
        if (!result[cat]) result[cat] = [];
        result[cat].push({
          id: item.id,
          name: item.name,
          preview: item.preview,
          reqLevel: item.unlockLevel || 1,
        });
      }
    });

    return result;
  }, []);

  const save = (p: PlayerProfile) => {
    setTempProfile(p);
    onSave(p, tempName);
  };

  const handleClothingSelect = (tab: ClothingTab | 'sets', itemId: string, reqLevel: number) => {
    if (tempProfile.level < reqLevel) return;
    
    if (tab === 'sets') {
      const setItem = SHOP_CATALOG.find(i => i.id === itemId);
      if (setItem && setItem.setItems) {
        let updated = { ...tempProfile };
        setItem.setItems.forEach(setId => {
          const part = SHOP_CATALOG.find(i => i.id === setId);
          if (part && CLOTHING_TABS.find(t => t.id === part.category)) {
            updated[part.category as ClothingTab] = part.id;
            if (part.category === 'shorts' && updated.shorts !== 'none') updated.pants = 'none';
            if (part.category === 'pants' && updated.pants !== 'none') updated.shorts = 'none';
          }
        });
        save(updated);
      }
      return;
    }

    // Shorts and pants are mutually exclusive
    let updated = { ...tempProfile, [tab]: itemId };
    if (tab === 'shorts' && itemId !== 'none') updated.pants = 'none';
    if (tab === 'pants' && itemId !== 'none') updated.shorts = 'none';
    save(updated);
  };

  const handleBodyChange = (key: keyof BodyParams, value: any) => {
    const newBody = { ...tempProfile.body, [key]: value };
    save({ ...tempProfile, body: newBody });
  };

  const handleFaceChange = (key: keyof FaceParams, value: any) => {
    const newFace = { ...tempProfile.face, [key]: value };
    save({ ...tempProfile, face: newFace });
  };

  const handleNameSave = () => {
    setIsEditingName(false);
    onSave(tempProfile, tempName);
  };

  const visibleTabs = CLOTHING_TABS.filter(t => t.category === activeCategory);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#1a0a2e] to-black flex w-full h-full z-50 overflow-hidden font-sans text-white">

      {/* LEFT: 3D Preview */}
      <div className="relative w-[45%] h-full flex flex-col justify-end pb-8 items-center bg-black/30">
        <button onClick={onBack} className="absolute top-8 left-8 py-3 px-6 bg-purple-900/80 hover:bg-pink-600 text-white rounded-full transition-colors flex items-center justify-center shadow-lg group z-50 uppercase tracking-widest text-xs font-bold border border-purple-700">
          <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Menu
        </button>

        {/* ═══ EQUIPMENT SLOTS PANEL (PERMANENT) ═══ */}
        <div className="absolute left-6 top-24 z-40 w-56 bottom-40 overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-purple-950/80 backdrop-blur-xl border border-purple-600/50 rounded-2xl p-3 shadow-2xl">
            <h3 className="text-[10px] font-black text-pink-400 uppercase tracking-[0.2em] mb-3">Ausruestung</h3>
            <div className="space-y-1">
              {EQUIPMENT_SLOTS.map(es => {
                const equipped = (tempProfile as any)[es.slot] as string;
                const hasItem = equipped && equipped !== 'none';
                return (
                  <div key={es.slot}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-[10px] ${
                      hasItem ? 'bg-pink-900/30 border border-pink-500/30' : 'bg-purple-900/20 border border-purple-700/20'
                    }`}
                  >
                    <span className="text-sm w-5 text-center">{es.icon}</span>
                    <span className="text-[9px] text-purple-400 font-bold uppercase w-12 shrink-0">{es.label}</span>
                    <span className={`flex-1 font-bold truncate ${hasItem ? 'text-white' : 'text-gray-600'}`}>
                      {getItemName(es.slot, equipped)}
                    </span>
                    {hasItem && (
                      <button
                        onClick={() => handleClothingSelect(es.slot, 'none', 1)}
                        className="p-0.5 rounded bg-red-900/50 hover:bg-red-600 text-red-300 hover:text-white transition-colors"
                        title="Ablegen"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══ 3D AVATAR PREVIEW ═══ */}
        <div className="absolute inset-0 z-0">
          <AnimatedAvatar
            modelUrl={tempProfile.rpm_url}
            jacket={tempProfile.jacket} tshirt={tempProfile.tshirt} vest={tempProfile.vest}
            pants={tempProfile.pants} shorts={tempProfile.shorts} shoes={tempProfile.shoes}
            hat={tempProfile.hat} glasses={tempProfile.glasses}
            beard={tempProfile.beard} mustache={tempProfile.mustache} wings={tempProfile.wings}
            effect={tempProfile.effect} accessory={tempProfile.accessory}
            body={tempProfile.body} face={tempProfile.face}
            danceState="idle" intensity={1} bpm={120}
          />
        </div>

        {/* Name / Level */}
        <div className="relative z-10 w-full px-10 pb-4">
          <div className="bg-purple-950/80 backdrop-blur-xl border border-purple-700/50 rounded-3xl p-5 shadow-2xl flex items-center justify-between">
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-3">
                  <input type="text" autoFocus value={tempName} onChange={e => setTempName(e.target.value)}
                    className="bg-black/50 border border-pink-500 text-2xl font-black text-pink-400 px-4 py-2 rounded-xl outline-none w-64 uppercase"
                    onKeyDown={e => e.key === 'Enter' && handleNameSave()} />
                  <button onClick={handleNameSave} className="p-3 bg-pink-600 hover:bg-pink-500 rounded-xl text-white shadow-[0_0_15px_rgba(236,72,153,0.5)]">
                    <Check size={20} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4 group">
                  <h2 className="text-3xl font-black text-white uppercase tracking-wider">{tempName}</h2>
                  <button onClick={() => setIsEditingName(true)} className="p-2 bg-purple-800 hover:bg-pink-900 rounded-xl text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 size={16} />
                  </button>
                </div>
              )}
              <p className="text-purple-400 font-bold uppercase tracking-widest text-sm mt-2">Level {tempProfile.level}</p>
              <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden mt-2 border border-gray-700">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-gradient-to-r from-pink-500 to-purple-500" />
              </div>
              <p className="text-xs text-right text-gray-500 mt-1 font-mono">{tempProfile.exp} / {expNeeded} EXP</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Editor Panel */}
      <div className="w-[55%] h-full bg-purple-950/60 backdrop-blur-3xl border-l border-purple-800/50 flex flex-col overflow-hidden">

        {/* Category Tabs */}
        <div className="flex gap-2 p-6 pb-0">
          {CATEGORY_CONFIG.map(cat => {
            const Icon = cat.icon;
            return (
              <button key={cat.id} onClick={() => { setActiveCategory(cat.id); if (cat.id === 'inventory') setActiveTab('jacket'); }}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black uppercase tracking-wider text-xs transition-all ${
                  activeCategory === cat.id
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] border border-pink-400/50'
                    : 'bg-purple-900/30 hover:bg-purple-900/50 text-gray-400 border border-purple-700/30'
                }`}>
                <Icon size={16} /> {cat.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ═══ BODY EDITOR ═══ */}
          {activeCategory === 'body' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 uppercase tracking-widest">Koerper</h2>

              {/* Gender */}
              <div>
                <label className="text-xs font-black text-purple-400 uppercase tracking-widest mb-2 block">Geschlecht</label>
                <div className="flex gap-3">
                  {(['male', 'female'] as const).map(g => (
                    <button key={g} onClick={() => handleBodyChange('gender', g)}
                      className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-wider text-sm transition-all ${
                        tempProfile.body.gender === g
                          ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border border-pink-400/50'
                          : 'bg-purple-900/30 text-gray-400 border border-purple-700/30 hover:bg-purple-900/50'
                      }`}>
                      {g === 'male' ? 'Maennlich' : 'Weiblich'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              {[
                { key: 'height' as const, label: 'Groesse', min: 0.8, max: 1.2, step: 0.05 },
                { key: 'muscles' as const, label: 'Muskeln', min: 0, max: 1, step: 0.1 },
                { key: 'bodyFat' as const, label: 'Koerperfett', min: 0, max: 1, step: 0.1 },
                { key: 'headSize' as const, label: 'Kopfgroesse', min: 0.7, max: 1.3, step: 0.05 },
              ].map(slider => (
                <div key={slider.key}>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-black text-purple-400 uppercase tracking-widest">{slider.label}</label>
                    <span className="text-xs font-mono text-gray-400">{tempProfile.body[slider.key].toFixed(2)}</span>
                  </div>
                  <input type="range" min={slider.min} max={slider.max} step={slider.step}
                    value={tempProfile.body[slider.key]}
                    onChange={e => handleBodyChange(slider.key, parseFloat(e.target.value))}
                    className="w-full h-2 bg-purple-900 rounded-full appearance-none cursor-pointer accent-pink-500"
                  />
                </div>
              ))}

              {/* Skin Color */}
              <div>
                <label className="text-xs font-black text-purple-400 uppercase tracking-widest mb-3 block">Hautfarbe</label>
                <div className="flex gap-3 flex-wrap">
                  {SKIN_COLORS.map(color => (
                    <button key={color} onClick={() => handleBodyChange('skinColor', color)}
                      className={`w-12 h-12 rounded-xl transition-all ${tempProfile.body.skinColor === color ? 'ring-4 ring-pink-500 scale-110' : 'ring-2 ring-gray-700 hover:ring-gray-500'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ FACE EDITOR ═══ */}
          {activeCategory === 'face' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 uppercase tracking-widest">Gesicht & Mimik</h2>

              {/* Eye Style */}
              <div>
                <label className="text-xs font-black text-purple-400 uppercase tracking-widest mb-3 block">Augenstil</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['normal', 'happy', 'cool', 'angry', 'sad', 'wink'] as const).map(style => (
                    <button key={style} onClick={() => handleFaceChange('eyeStyle', style)}
                      className={`py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-all ${
                        tempProfile.face.eyeStyle === style
                          ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border border-pink-400/50'
                          : 'bg-purple-900/30 text-gray-400 border border-purple-700/30 hover:bg-purple-900/50'
                      }`}>
                      {style === 'normal' ? 'Normal' : style === 'happy' ? 'Froehlich' : style === 'cool' ? 'Cool' : style === 'angry' ? 'Wuetend' : style === 'sad' ? 'Traurig' : 'Zwinkern'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Eye Color */}
              <div>
                <label className="text-xs font-black text-purple-400 uppercase tracking-widest mb-3 block">Augenfarbe</label>
                <div className="flex gap-3 flex-wrap">
                  {EYE_COLORS.map(color => (
                    <button key={color} onClick={() => handleFaceChange('eyeColor', color)}
                      className={`w-12 h-12 rounded-full transition-all ${tempProfile.face.eyeColor === color ? 'ring-4 ring-pink-500 scale-110' : 'ring-2 ring-gray-700 hover:ring-gray-500'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Hair Style */}
              <div>
                <label className="text-xs font-black text-purple-400 uppercase tracking-widest mb-3 block">Frisur</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['none', 'short', 'long', 'spike', 'ponytail'] as const).map(style => (
                    <button key={style} onClick={() => handleFaceChange('hairStyle', style)}
                      className={`py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-all ${
                        tempProfile.face.hairStyle === style
                          ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border border-pink-400/50'
                          : 'bg-purple-900/30 text-gray-400 border border-purple-700/30 hover:bg-purple-900/50'
                      }`}>
                      {style === 'none' ? 'Glatze' : style === 'short' ? 'Kurz' : style === 'long' ? 'Lang' : style === 'spike' ? 'Spikes' : 'Zopf'}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Hair Color */}
              <div>
                <label className="text-xs font-black text-purple-400 uppercase tracking-widest mb-3 block">Haarfarbe</label>
                <div className="flex gap-3 flex-wrap">
                  {['#1f2937', '#fcd34d', '#ea580c', '#b91c1c', '#f472b6', '#3b82f6', '#22c55e', '#d1d5db'].map(color => (
                    <button key={color} onClick={() => handleFaceChange('hairColor', color)}
                      className={`w-12 h-12 rounded-full transition-all ${tempProfile.face.hairColor === color ? 'ring-4 ring-pink-500 scale-110' : 'ring-2 ring-gray-700 hover:ring-gray-500'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Mouth Style */}
              <div>
                <label className="text-xs font-black text-purple-400 uppercase tracking-widest mb-3 block">Mundform</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['smile', 'neutral', 'open', 'grin', 'pout'] as const).map(style => (
                    <button key={style} onClick={() => handleFaceChange('mouthStyle', style)}
                      className={`py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-all ${
                        tempProfile.face.mouthStyle === style
                          ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border border-pink-400/50'
                          : 'bg-purple-900/30 text-gray-400 border border-purple-700/30 hover:bg-purple-900/50'
                      }`}>
                      {style === 'smile' ? 'Laecheln' : style === 'neutral' ? 'Neutral' : style === 'open' ? 'Offen' : style === 'grin' ? 'Grinsen' : 'Schmollmund'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ INVENTORY (CLOTHING, SETS, EFFECTS, ACCESSORIES) ═══ */}
          {activeCategory === 'inventory' && (
            <div className="space-y-5">
              {/* Sub-tabs */}
              <div className="flex gap-2 flex-wrap">
                {visibleTabs.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-[0_0_10px_rgba(250,204,21,0.3)]'
                        : 'bg-purple-900/30 text-gray-400 border border-purple-700/30 hover:bg-purple-900/50'
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {dynamicWardrobe[activeTab]?.map(item => {
                    const isLocked = tempProfile.level < item.reqLevel;
                    
                    let isEquipped = false;
                    if (activeTab === 'sets') {
                       const setItem = SHOP_CATALOG.find(i => i.id === item.id);
                       if (setItem && setItem.setItems) {
                         isEquipped = setItem.setItems.every(setId => {
                           const part = SHOP_CATALOG.find(i => i.id === setId);
                           return part && (tempProfile as any)[part.category] === part.id;
                         });
                       }
                    } else {
                       const currentValue = (tempProfile as any)[activeTab];
                       isEquipped = currentValue === item.id;
                    }

                    return (
                      <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={item.id}>
                        <button disabled={isLocked}
                          onClick={() => handleClothingSelect(activeTab as ClothingTab | 'sets', item.id, item.reqLevel)}
                          className={`w-full aspect-square rounded-2xl p-3 flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden group border ${
                            isEquipped ? 'bg-pink-900/30 border-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.2)]'
                          : isLocked ? 'bg-gray-900/50 border-gray-800 opacity-40 cursor-not-allowed'
                          : 'bg-purple-900/20 hover:bg-purple-900/40 border-purple-700/30 hover:border-purple-500/50'}`}
                        >
                          {isLocked && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                              <span className="px-3 py-1 bg-red-900/80 border border-red-500 rounded-full text-white font-black uppercase text-[9px] tracking-widest">
                                Lv.{item.reqLevel}
                              </span>
                            </div>
                          )}
                          <div className={`w-14 h-14 rounded-xl ${item.preview} shadow-lg group-hover:scale-110 transition-transform`} />
                          <span className="font-bold text-gray-300 uppercase tracking-wider text-[10px] text-center leading-tight">{item.name}</span>
                          {isEquipped && <span className="absolute top-2 right-2 text-pink-400"><Check size={16} /></span>}
                        </button>
                      </motion.div>
                    );
                  })}
                  {(!dynamicWardrobe[activeTab] || dynamicWardrobe[activeTab].length === 0) && (
                    <div className="col-span-3 py-10 flex flex-col items-center justify-center opacity-50">
                      <Sparkles size={32} className="mb-2" />
                      <p className="text-xs uppercase tracking-widest font-bold">Keine Items</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
