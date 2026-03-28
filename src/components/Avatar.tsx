import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AvatarProps {
  jacket: string; // Tailwind color classes e.g. 'bg-red-500'
  pants: string;
  shoes: string;
  headgear?: string;
  danceState: 'idle' | 'Perfect' | 'Great' | 'Cool' | 'Bad' | 'Miss';
  size?: number;
}

const DANCE_VARIANTS = {
  idle: { y: [0, -4, 0], rotate: [0, 2, -2, 0], transition: { repeat: Infinity, duration: 2 } },
  Perfect: { 
    y: [0, -60, -40, 0], 
    rotate: [0, 360, 360, 360], 
    scale: [1, 1.2, 0.9, 1],
    transition: { duration: 0.7, ease: "easeOut" } 
  },
  Great: { 
    y: [0, -30, 0], 
    rotate: [0, -15, 15, 0],
    scale: [1, 1.1, 1],
    transition: { duration: 0.5 } 
  },
  Cool: { 
    x: [0, -20, 20, 0], 
    y: [0, -10, 0],
    rotate: [0, 10, -10, 0],
    transition: { duration: 0.4 } 
  },
  Bad: { 
    rotate: [0, 5, -5, 0], 
    scale: [1, 0.95, 1],
    transition: { duration: 0.3 } 
  },
  Miss: { 
    y: [0, 15, 15], 
    scaleY: [1, 0.8, 0.8], 
    rotate: [0, 10, 10],
    transition: { duration: 0.4 } 
  }
};

export function Avatar({ jacket, pants, shoes, headgear = 'bg-gray-200', danceState, size = 1 }: AvatarProps) {
  const [animState, setAnimState] = useState(danceState);

  useEffect(() => {
    setAnimState(danceState);
    if (danceState !== 'idle' && danceState !== 'Miss') {
      const t = setTimeout(() => setAnimState('idle'), 800);
      return () => clearTimeout(t);
    }
  }, [danceState]);

  return (
    <motion.div 
      className="relative flex flex-col items-center justify-end origin-bottom"
      style={{ transform: `scale(${size})`, width: '120px', height: '180px' }}
      variants={DANCE_VARIANTS}
      animate={animState}
    >
      {/* Head */}
      <div className={`w-16 h-16 rounded-full ${headgear} shadow-inner absolute top-0 z-20 flex items-center justify-center border-4 border-gray-900 overflow-hidden`}>
        {/* Simple Eyes that react */}
        <div className="flex gap-2 mb-2">
          {animState === 'Miss' ? (
            <>
               <span className="text-xl font-black text-gray-800">X</span>
               <span className="text-xl font-black text-gray-800">X</span>
            </>
          ) : animState === 'Perfect' ? (
            <>
               <span className="text-xl font-black text-gray-800">^</span>
               <span className="text-xl font-black text-gray-800">^</span>
            </>
          ) : (
            <>
               <div className="w-2 h-3 bg-gray-800 rounded-full" />
               <div className="w-2 h-3 bg-gray-800 rounded-full" />
            </>
          )}
        </div>
      </div>

      {/* Body / Jacket */}
      <div className={`w-20 h-20 ${jacket} rounded-3xl absolute top-[50px] z-10 border-4 border-gray-900 shadow-lg flex justify-between`}>
        {/* Sleeves / Arms */}
        <motion.div 
          className={`w-6 h-16 ${jacket} rounded-full absolute -left-4 top-2 border-4 border-gray-900 origin-top`}
          animate={{ rotate: animState === 'Perfect' ? [0, 180, 0] : animState === 'Great' ? [0, 45, 0] : [0, 5, -5, 0] }}
          transition={{ duration: 0.5, repeat: animState === 'idle' ? Infinity : 0 }}
        />
        <motion.div 
          className={`w-6 h-16 ${jacket} rounded-full absolute -right-4 top-2 border-4 border-gray-900 origin-top`}
          animate={{ rotate: animState === 'Perfect' ? [0, -180, 0] : animState === 'Great' ? [0, -45, 0] : [0, -5, 5, 0] }}
          transition={{ duration: 0.5, repeat: animState === 'idle' ? Infinity : 0, delay: 0.1 }}
        />
        {/* Zipper / Detail */}
        <div className="w-1 h-full bg-gray-900/20 mx-auto" />
      </div>

      {/* Legs / Pants */}
      <div className="w-16 h-16 absolute top-[120px] z-0 flex justify-between px-1">
        <motion.div 
          className={`w-6 h-full ${pants} border-4 border-gray-900 rounded-b-xl origin-top`}
          animate={{ rotate: animState === 'Cool' ? [0, 15, 0] : animState === 'Perfect' ? [0, -20, 0] : 0 }}
        />
        <motion.div 
          className={`w-6 h-full ${pants} border-4 border-gray-900 rounded-b-xl origin-top`}
          animate={{ rotate: animState === 'Cool' ? [0, -15, 0] : animState === 'Perfect' ? [0, 20, 0] : 0 }}
        />
      </div>

      {/* Shoes */}
      <div className="w-20 absolute top-[170px] z-10 flex justify-between">
        <div className={`w-8 h-5 ${shoes} border-4 border-gray-900 rounded-full -ml-1`} />
        <div className={`w-8 h-5 ${shoes} border-4 border-gray-900 rounded-full -mr-1`} />
      </div>

    </motion.div>
  );
}
