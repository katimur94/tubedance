/**
 * HitVFX — MASSIVE Audition Online Hit Effects
 *
 * Im Original war ALLES flashy — bei Perfect explodierte der Bildschirm
 * in Gold und Sternen. Wir machen das genauso.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { type HitRating } from '../types/gameTypes';

interface HitVFXProps {
  lastRating: HitRating | null;
  combo: number;
  triggerKey: number;
}

export function HitVFX({ lastRating, combo, triggerKey }: HitVFXProps) {
  const [screenShake, setScreenShake] = useState(false);

  // Screen shake on Perfect or high combo milestones
  useEffect(() => {
    if (lastRating === 'Perfect' || (combo > 0 && combo % 10 === 0 && combo >= 10)) {
      setScreenShake(true);
      const timer = setTimeout(() => setScreenShake(false), 200);
      return () => clearTimeout(timer);
    }
  }, [triggerKey]);

  return (
    <>
      {/* Screen shake container — applied to entire game */}
      {screenShake && (
        <style>{`
          .game-container { animation: screen-shake 0.2s ease-out; }
          @keyframes screen-shake {
            0%, 100% { transform: translate(0, 0); }
            25% { transform: translate(-3px, 2px); }
            50% { transform: translate(3px, -2px); }
            75% { transform: translate(-2px, -1px); }
          }
        `}</style>
      )}

      <div className="absolute inset-0 pointer-events-none overflow-hidden">

        {/* ═══ PERFECT — MASSIVE GOLDEN EXPLOSION ═══ */}
        <AnimatePresence>
          {lastRating === 'Perfect' && (
            <>
              {/* Full screen golden flash */}
              <motion.div
                key={`perfect-flash-${triggerKey}`}
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 bg-gradient-to-b from-yellow-400/30 via-yellow-500/10 to-transparent"
              />

              {/* Expanding golden ring 1 */}
              <motion.div
                key={`ring1-${triggerKey}`}
                initial={{ opacity: 1, scale: 0.2 }}
                animate={{ opacity: 0, scale: 3 }}
                transition={{ duration: 0.8 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-4 border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.8)]"
              />

              {/* Expanding ring 2 */}
              <motion.div
                key={`ring2-${triggerKey}`}
                initial={{ opacity: 0.8, scale: 0.4 }}
                animate={{ opacity: 0, scale: 2.5 }}
                transition={{ duration: 0.7, delay: 0.05 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-2 border-amber-300"
              />

              {/* Star burst particles — 12 directions */}
              {Array.from({ length: 12 }, (_, i) => {
                const angle = (i / 12) * Math.PI * 2;
                const dist = 35;
                return (
                  <motion.div
                    key={`star-${triggerKey}-${i}`}
                    initial={{ opacity: 1, scale: 1, x: '50vw', y: '50vh' }}
                    animate={{
                      opacity: 0,
                      scale: 0.3,
                      x: `${50 + Math.cos(angle) * dist}vw`,
                      y: `${50 + Math.sin(angle) * dist}vh`,
                    }}
                    transition={{ duration: 0.6 + i * 0.02, ease: 'easeOut' }}
                    className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: 0, top: 0 }}
                  >
                    <div className="w-full h-full text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,1)]">
                      ★
                    </div>
                  </motion.div>
                );
              })}

              {/* Vertical light pillar */}
              <motion.div
                key={`pillar-${triggerKey}`}
                initial={{ opacity: 0.4, scaleY: 0 }}
                animate={{ opacity: 0, scaleY: 1 }}
                transition={{ duration: 0.5 }}
                className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-full bg-gradient-to-b from-yellow-400/20 via-yellow-300/10 to-transparent origin-bottom"
              />
            </>
          )}
        </AnimatePresence>

        {/* ═══ GREAT — GREEN FLASH + SPARKLE ═══ */}
        <AnimatePresence>
          {lastRating === 'Great' && (
            <>
              <motion.div
                key={`great-flash-${triggerKey}`}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="absolute inset-0 bg-gradient-to-b from-green-400/20 via-transparent to-transparent"
              />
              <motion.div
                key={`great-ring-${triggerKey}`}
                initial={{ opacity: 0.7, scale: 0.3 }}
                animate={{ opacity: 0, scale: 2 }}
                transition={{ duration: 0.5 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-3 border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.6)]"
              />
            </>
          )}
        </AnimatePresence>

        {/* ═══ COOL — CYAN PULSE ═══ */}
        <AnimatePresence>
          {lastRating === 'Cool' && (
            <motion.div
              key={`cool-${triggerKey}`}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-cyan-500/10"
            />
          )}
        </AnimatePresence>

        {/* ═══ BAD — ORANGE WARNING ═══ */}
        <AnimatePresence>
          {lastRating === 'Bad' && (
            <motion.div
              key={`bad-${triggerKey}`}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 shadow-[inset_0_0_60px_rgba(251,146,60,0.2)]"
            />
          )}
        </AnimatePresence>

        {/* ═══ MISS — RED VIGNETTE + CRACK ═══ */}
        <AnimatePresence>
          {lastRating === 'Miss' && (
            <>
              <motion.div
                key={`miss-vignette-${triggerKey}`}
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 shadow-[inset_0_0_120px_rgba(239,68,68,0.4)]"
              />
              <motion.div
                key={`miss-flash-${triggerKey}`}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-red-900/20"
              />
            </>
          )}
        </AnimatePresence>

        {/* ═══ COMBO AURA (10+) ═══ */}
        {combo >= 10 && (
          <>
            {/* Bottom neon rings (perspective) */}
            <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2" style={{ perspective: '400px' }}>
              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.4, 0.7, 0.4],
                }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className={`w-80 h-10 rounded-full border-2 ${
                  combo >= 50 ? 'border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.6)]' :
                  combo >= 30 ? 'border-orange-400 shadow-[0_0_30px_rgba(251,146,60,0.5)]' :
                  'border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.4)]'
                }`}
                style={{ transform: 'rotateX(65deg)' }}
              />
              {combo >= 20 && (
                <motion.div
                  animate={{
                    scale: [1.15, 1, 1.15],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 w-96 h-12 rounded-full border-2 ${
                    combo >= 50 ? 'border-pink-400 shadow-[0_0_30px_rgba(236,72,153,0.4)]' :
                    'border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.3)]'
                  }`}
                  style={{ transform: 'rotateX(65deg)' }}
                />
              )}
            </div>

            {/* Screen edge glow */}
            <motion.div
              animate={{ opacity: [0.05, 0.2, 0.05] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={`absolute inset-0 ${
                combo >= 50 ? 'shadow-[inset_0_0_100px_rgba(250,204,21,0.25)]' :
                combo >= 30 ? 'shadow-[inset_0_0_80px_rgba(251,146,60,0.2)]' :
                combo >= 20 ? 'shadow-[inset_0_0_60px_rgba(168,85,247,0.15)]' :
                'shadow-[inset_0_0_40px_rgba(6,182,212,0.1)]'
              }`}
            />
          </>
        )}

        {/* ═══ COMBO MILESTONE BURST (every 10) ═══ */}
        <AnimatePresence>
          {combo > 0 && combo % 10 === 0 && combo >= 10 && (
            <motion.div
              key={`milestone-${combo}`}
              initial={{ opacity: 1, scale: 0.5 }}
              animate={{ opacity: 0, scale: 2.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border-4 border-pink-400 shadow-[0_0_60px_rgba(236,72,153,0.5)]"
            />
          )}
        </AnimatePresence>

        {/* ═══ SATURATION BOOST on high combos ═══ */}
        {combo >= 30 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backdropFilter: `saturate(${Math.min(1.5, 1 + combo * 0.005)})`,
            }}
          />
        )}
      </div>
    </>
  );
}
