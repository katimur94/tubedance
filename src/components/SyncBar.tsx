import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'motion/react';

interface SyncBarProps {
  bpm: number;
  onHit: (result: string) => void;
}

export function SyncBar({ bpm, onHit }: SyncBarProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const startTimeRef = useRef(performance.now());
  const requestRef = useRef<number>(0);
  const positionRef = useRef(0);

  // Measure duration in ms = (60 / bpm) * 4 beats * 1000
  const duration = (60 / bpm) * 4 * 1000;

  const animate = (time: number) => {
    const elapsed = time - startTimeRef.current;
    let progress = (elapsed % duration) / duration;
    positionRef.current = progress;

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    startTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(requestRef.current);
  }, [bpm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        evaluateHit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bpm]);

  const evaluateHit = () => {
    const pos = positionRef.current;

    // The perfect target is roughly at 0.9 (assuming the 4th beat is the target)
    // Or let's just make the target exactly 1.0 (end of loop) or 0.875 (middle of 4th section).
    // Let's place the perfect area between 0.9 and 1.0. Target = 0.95
    const target = 0.95;
    const distance = Math.abs(pos - target);

    let result = 'Miss';
    if (distance < 0.03) result = 'Perfect';
    else if (distance < 0.07) result = 'Great';
    else if (distance < 0.12) result = 'Cool';
    else if (distance < 0.2) result = 'Bad';

    // Show feedback temporarily
    setFeedback(result);
    setTimeout(() => setFeedback(null), 800);

    onHit(result);
  };

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Feedback Display */}
      <div className="h-8">
        {feedback && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className={`font-bold text-2xl uppercase tracking-widest ${
              feedback === 'Perfect' ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]' :
              feedback === 'Great' ? 'text-green-400' :
              feedback === 'Cool' ? 'text-blue-400' :
              feedback === 'Bad' ? 'text-orange-400' : 'text-red-500'
            }`}
          >
            {feedback}
          </motion.div>
        )}
      </div>

      {/* The Bar */}
      <div className="relative w-full max-w-2xl h-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-full overflow-hidden flex items-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
        {/* Quarter Dividers */}
        <div className="absolute inset-0 flex">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-1 border-r border-gray-600/50 h-full" />
          ))}
          <div className="flex-1" />
        </div>

        {/* Target Area (Perfect) */}
        <div
          className="absolute h-full bg-cyan-500/30 border-l-2 border-r-2 border-cyan-400/80 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
          style={{ left: '90%', width: '10%' }}
        />

        {/* Moving Marker */}
        <motion.div
          className="absolute h-10 w-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] -translate-x-1/2"
          animate={{
            left: ['0%', '100%'],
          }}
          transition={{
            duration: duration / 1000,
            ease: "linear",
            repeat: Infinity,
          }}
        />
      </div>
      
      <p className="text-gray-400 text-sm tracking-widest uppercase">Spacebar to Sync</p>
    </div>
  );
}
