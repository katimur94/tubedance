import React, { useState } from 'react';
import { Avatar } from './Avatar';
import { motion } from 'motion/react';
import { ArrowLeft, Star, Lock } from 'lucide-react';

export interface PlayerProfile {
  level: number;
  exp: number;
  jacket: string;
  pants: string;
  shoes: string;
}

interface LockerRoomProps {
  profile: PlayerProfile;
  onSave: (p: PlayerProfile) => void;
  onBack: () => void;
}

const COLORS = [
  { name: 'Basic Gray', class: 'bg-gray-500', reqLevel: 1 },
  { name: 'Crimson Red', class: 'bg-red-500', reqLevel: 2 },
  { name: 'Ocean Blue', class: 'bg-blue-500', reqLevel: 3 },
  { name: 'Forest Green', class: 'bg-green-500', reqLevel: 4 },
  { name: 'Neon Pink', class: 'bg-pink-500', reqLevel: 6 },
  { name: 'Cyber Cyan', class: 'bg-cyan-400', reqLevel: 8 },
  { name: 'Golden Swag', class: 'bg-yellow-400', reqLevel: 10 },
  { name: 'Void Black', class: 'bg-gray-900', reqLevel: 15 },
  { name: 'God Mode', class: 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500', reqLevel: 20 },
];

export function LockerRoom({ profile, onSave, onBack }: LockerRoomProps) {
  const [activeTab, setActiveTab] = useState<'jacket' | 'pants' | 'shoes'>('jacket');
  const [tempProfile, setTempProfile] = useState(profile);

  const expNeeded = tempProfile.level * 1000;
  const progress = (tempProfile.exp / expNeeded) * 100;

  const handleSelectClass = (cClass: string, reqLevel: number) => {
    if (tempProfile.level < reqLevel) return;
    setTempProfile(p => ({ ...p, [activeTab]: cClass }));
    onSave({ ...tempProfile, [activeTab]: cClass });
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-8 bg-gray-900/90 backdrop-blur-xl border border-gray-800 rounded-3xl shadow-2xl flex flex-col md:flex-row gap-8">
      {/* Left: Avatar & Level Info */}
      <div className="flex flex-col items-center justify-center p-8 bg-gray-800/50 rounded-2xl border border-gray-700 md:w-1/3 relative shrink-0">
        <button onClick={onBack} className="absolute top-4 left-4 p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-colors flex items-center justify-center shadow-lg group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        </button>

        <h2 className="text-2xl font-black text-cyan-400 uppercase tracking-widest mb-6 border-b border-gray-700 w-full text-center pb-2">Locker Room</h2>

        <div className="h-64 flex items-end justify-center mb-8">
          <Avatar 
            jacket={tempProfile.jacket} 
            pants={tempProfile.pants} 
            shoes={tempProfile.shoes} 
            danceState="Perfect" 
          />
        </div>

        <div className="w-full bg-gray-900 p-4 rounded-xl border border-gray-800 relative overflow-hidden">
          <div className="flex justify-between items-end mb-2">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-widest">Level</div>
            <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">{tempProfile.level}</div>
          </div>
          
          <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden shadow-inner">
            <motion.div 
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, type: 'spring' }}
            />
          </div>
          <div className="text-right text-[10px] text-gray-500 mt-1 font-mono font-bold">
            {tempProfile.exp} / {expNeeded} EXP
          </div>
        </div>
      </div>

      {/* Right: Wardrobe Selection */}
      <div className="flex-1 flex flex-col">
        <div className="flex gap-4 mb-6">
          {(['jacket', 'pants', 'shoes'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 font-black text-sm uppercase tracking-widest rounded-xl transition-all ${activeTab === tab ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              {tab === 'jacket' ? 'Jacke' : tab === 'pants' ? 'Hose' : 'Schuhe'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar flex-1 content-start">
          {COLORS.map((item, idx) => {
            const isLocked = tempProfile.level < item.reqLevel;
            const isEquipped = tempProfile[activeTab] === item.class;
            return (
              <motion.button
                key={idx}
                whileHover={!isLocked ? { scale: 1.05 } : {}}
                whileTap={!isLocked ? { scale: 0.95 } : {}}
                onClick={() => handleSelectClass(item.class, item.reqLevel)}
                disabled={isLocked}
                className={`relative p-4 rounded-2xl flex flex-col items-center gap-3 border-2 transition-all ${
                  isEquipped ? 'border-cyan-400 bg-cyan-900/30 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 
                  isLocked ? 'border-gray-800 bg-gray-900/50 opacity-50 cursor-not-allowed' : 
                  'border-gray-700 bg-gray-800 hover:border-gray-500'
                }`}
              >
                <div className={`w-12 h-12 rounded-full border-4 border-gray-900 shadow-lg ${item.class} flex items-center justify-center`}>
                  {isLocked && <Lock size={16} className="text-gray-900" />}
                </div>
                <div className="text-center">
                  <p className={`font-bold text-sm ${isEquipped ? 'text-cyan-400' : 'text-gray-300'}`}>{item.name}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                    {isLocked ? `Ab Level ${item.reqLevel}` : (isEquipped ? 'Ausgerüstet' : 'Verfügbar')}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
