import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'motion/react';

interface SyncBarProps {
  bpm: number;
  onHit: (result: string) => void;
  locked?: boolean;
}

export function SyncBar({ bpm, onHit, locked }: SyncBarProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const startTimeRef = useRef(performance.now());
  const requestRef = useRef<number>(0);
  const positionRef = useRef(0);
  const cancelledRef = useRef(false);

  // Measure duration in ms = (60 / bpm) * 4 beats * 1000
  const duration = (60 / bpm) * 4 * 1000;

  useEffect(() => {
    cancelledRef.current = false;
    startTimeRef.current = performance.now();
    const dur = (60 / bpm) * 4 * 1000;

    const animate = (time: number) => {
      if (cancelledRef.current) return;
      const elapsed = time - startTimeRef.current;
      let progress = (elapsed % dur) / dur;
      positionRef.current = progress;

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      cancelledRef.current = true;
      cancelAnimationFrame(requestRef.current);
    };
  }, [bpm]);

  const lockedRef = useRef(locked);
  useEffect(() => { lockedRef.current = locked; }, [locked]);
  const onHitRef = useRef(onHit);
  useEffect(() => { onHitRef.current = onHit; }, [onHit]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (lockedRef.current) {
           setFeedback('PFEILE!');
           setTimeout(() => setFeedback(null), 800);
           onHitRef.current('LOCKED');
           return;
        }
        evaluateHit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bpm]);

  const evaluateHit = () => {
    const pos = positionRef.current;

    // Perfect target at 90% — aligned with visual target indicator
    const target = 0.90;
    const distance = Math.abs(pos - target);

    let result = 'Miss';
    if (distance < 0.03) result = 'Perfect';
    else if (distance < 0.07) result = 'Great';
    else if (distance < 0.12) result = 'Cool';
    else if (distance < 0.2) result = 'Bad';

    // Show feedback temporarily
    setFeedback(result);
    setTimeout(() => setFeedback(null), 800);

    onHitRef.current(result);
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
          style={{ left: '87%', width: '6%' }}
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
