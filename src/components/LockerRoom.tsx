import React, { useState } from 'react';
import { Avatar3D } from './Avatar3D';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Edit2, Check } from 'lucide-react';

export interface PlayerProfile {
  level: number;
  exp: number;
  jacket: string;
  pants: string;
  shoes: string;
  rpm_url?: string;
}

interface LockerRoomProps {
  profile: PlayerProfile;
  username: string;
  onSave: (p: PlayerProfile, newUsername?: string) => void;
  onBack: () => void;
}

const WARDROBE = {
  jacket: [
    { id: 'leather_black', name: 'Black Leather', reqLevel: 1, preview: 'bg-gray-900' },
    { id: 'camo_green', name: 'Jungle Camo', reqLevel: 1, preview: 'bg-green-800' },
    { id: 'plaid_red', name: 'Lumberjack', reqLevel: 2, preview: 'bg-red-600' },
    { id: 'tracksuit_red', name: 'Red Tracksuit', reqLevel: 3, preview: 'bg-red-500' },
    { id: 'swag_gold', name: 'Golden Swag', reqLevel: 10, preview: 'bg-yellow-400' },
  ],
  pants: [
    { id: 'denim_blue', name: 'Blue Denim', reqLevel: 1, preview: 'bg-blue-800' },
    { id: 'denim_black', name: 'Black Denim', reqLevel: 1, preview: 'bg-gray-800' },
    { id: 'tracksuit_black', name: 'Adidas Style', reqLevel: 2, preview: 'bg-black' },
    { id: 'camo_green', name: 'Camo Pants', reqLevel: 4, preview: 'bg-green-800' },
  ],
  shoes: [
    { id: 'shoes_sneakers', name: 'White Sneakers', reqLevel: 1, preview: 'bg-gray-200' },
    { id: 'shoes_boots', name: 'Brown Boots', reqLevel: 1, preview: 'bg-amber-900' },
    { id: 'swag_gold', name: 'Golden Kicks', reqLevel: 10, preview: 'bg-yellow-400' },
  ]
};

export function LockerRoom({ profile, username, onSave, onBack }: LockerRoomProps) {
  const [activeTab, setActiveTab] = useState<'jacket' | 'pants' | 'shoes'>('jacket');
  const [tempProfile, setTempProfile] = useState(profile);
  const [tempName, setTempName] = useState(username);
  const [isEditingName, setIsEditingName] = useState(false);

  // Auto patch legacy profile IDs (bg-gray-500 -> leather_black)
  if (tempProfile.jacket.startsWith('bg-')) tempProfile.jacket = 'leather_black';
  if (tempProfile.pants.startsWith('bg-')) tempProfile.pants = 'denim_blue';
  if (tempProfile.shoes.startsWith('bg-')) tempProfile.shoes = 'shoes_sneakers';

  const expNeeded = tempProfile.level * 1000;
  const progress = (tempProfile.exp / expNeeded) * 100;

  const handleSelect = (itemId: string, reqLevel: number) => {
    if (tempProfile.level < reqLevel) return;
    const newProfile = { ...tempProfile, [activeTab]: itemId };
    setTempProfile(newProfile);
    onSave(newProfile, tempName);
  };

  const handleNameSave = () => {
    setIsEditingName(false);
    onSave(tempProfile, tempName);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-black flex w-full h-full z-50 overflow-hidden font-sans text-white">
      
      {/* LEFT HALF: Huge 3D View */}
      <div className="relative w-1/2 h-full flex flex-col justify-end pb-12 items-center bg-black/40">
        <button onClick={onBack} className="absolute top-8 left-8 py-3 px-6 bg-gray-800/80 hover:bg-cyan-600 text-white rounded-full transition-colors flex items-center justify-center shadow-lg group z-50 uppercase tracking-widest text-xs font-bold border border-gray-600">
          <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Menü
        </button>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="absolute inset-0 cursor-move">
          <Avatar3D 
            jacket={tempProfile.jacket} 
            pants={tempProfile.pants} 
            shoes={tempProfile.shoes} 
            danceState="dancing" 
            intensity={1}
          />
        </div>
        
        {/* Name / Level Badge overlayed at bottom of left half */}
        <div className="relative z-10 w-full px-12 pb-8">
           <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-3xl p-6 shadow-2xl flex items-center justify-between">
             <div className="flex-1">
                {isEditingName ? (
                  <div className="flex items-center gap-3">
                    <input 
                      type="text" autoFocus value={tempName} onChange={e => setTempName(e.target.value)}
                      className="bg-black/50 border border-cyan-500 text-2xl font-black text-cyan-400 px-4 py-2 rounded-xl outline-none w-64 uppercase"
                      onKeyDown={e => e.key === 'Enter' && handleNameSave()}
                    />
                    <button onClick={handleNameSave} className="p-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                      <Check size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 group">
                    <h2 className="text-4xl font-black text-white uppercase tracking-wider">{tempName}</h2>
                    <button onClick={() => setIsEditingName(true)} className="p-2 bg-gray-800 hover:bg-cyan-900 rounded-xl text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit2 size={16} />
                    </button>
                  </div>
                )}
                
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm mt-3">Level {tempProfile.level}</p>
                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden mt-2 border border-gray-700">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" />
                </div>
                <p className="text-xs text-right text-gray-500 mt-1 font-mono">{tempProfile.exp} / {expNeeded} EXP</p>
             </div>
           </div>
        </div>
      </div>

      {/* RIGHT HALF: Wardrobe Menu */}
      <div className="w-1/2 h-full bg-gray-900/95 backdrop-blur-3xl border-l border-gray-800 flex flex-col p-10 overflow-y-auto">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 uppercase tracking-widest mb-10">
           Outfit
        </h1>

        <div className="flex gap-4 mb-8">
          {(['jacket', 'pants', 'shoes'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 px-6 rounded-2xl uppercase tracking-widest font-black transition-all ${activeTab === tab ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] border border-cyan-400' : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {WARDROBE[activeTab].map(item => {
              const isLocked = tempProfile.level < item.reqLevel;
              const isEquipped = tempProfile[activeTab] === item.id;

              return (
                <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={item.id}>
                  <button
                    disabled={isLocked}
                    onClick={() => handleSelect(item.id, item.reqLevel)}
                    className={`w-full aspect-[4/3] rounded-3xl p-6 flex flex-col items-center justify-center gap-4 transition-all relative overflow-hidden group border ${
                      isEquipped ? 'bg-cyan-900/30 border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.2)]'
                    : isLocked ? 'bg-gray-900/50 border-gray-800 opacity-50 cursor-not-allowed'
                    : 'bg-gray-800 hover:bg-gray-700 border-gray-600 hover:border-gray-500'}`}
                  >
                    {isLocked && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                        <div className="px-4 py-2 bg-red-900/80 border border-red-500 rounded-full text-white font-black uppercase text-xs tracking-widest max-w-[80%] text-center">
                          Ab Level {item.reqLevel}
                        </div>
                      </div>
                    )}
                    
                    <div className={`w-16 h-16 rounded-2xl ${item.preview} shadow-lg ring-4 ring-black/20 group-hover:scale-110 transition-transform`} />
                    <span className="font-bold text-gray-200 uppercase tracking-widest text-sm text-center">{item.name}</span>
                    {isEquipped && <span className="absolute top-4 right-4 text-cyan-400"><Check size={20} /></span>}
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
