import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

const DIRECTIONS = ['Up', 'Down', 'Left', 'Right'] as const;
type Direction = typeof DIRECTIONS[number];

interface SequenceInputProps {
  onSequenceComplete: (isComplete: boolean) => void;
  resetTrigger: number; // Increment this to force a new sequence and reset
}

export function SequenceInput({ onSequenceComplete, resetTrigger }: SequenceInputProps) {
  const [sequence, setSequence] = useState<Direction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorHighlight, setErrorHighlight] = useState(false);

  // Generate sequence
  const generateSequence = () => {
    const length = Math.floor(Math.random() * 5) + 4; // 4 to 8 arrows
    const newSeq = Array.from({ length }, () => DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]);
    setSequence(newSeq);
    setCurrentIndex(0);
    setErrorHighlight(false);
    onSequenceComplete(false);
  };

  useEffect(() => {
    generateSequence();
  }, [resetTrigger]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow standard arrows
      const keyMap: Record<string, Direction> = {
        ArrowUp: 'Up',
        ArrowDown: 'Down',
        ArrowLeft: 'Left',
        ArrowRight: 'Right',
      };

      const direction = keyMap[e.key];
      if (!direction) return;

      if (currentIndex >= sequence.length) return; // Sequence already completed

      if (sequence[currentIndex] === direction) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        
        if (nextIndex === sequence.length) {
          onSequenceComplete(true);
        }
      } else {
        // Wrong key
        setErrorHighlight(true);
        setTimeout(() => {
          setCurrentIndex(0);
          setErrorHighlight(false);
        }, 300); // 300ms red highlight before reset
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sequence, currentIndex]);

  const renderIcon = (dir: Direction, index: number) => {
    const Icon = dir === 'Up' ? ArrowUp : dir === 'Down' ? ArrowDown : dir === 'Left' ? ArrowLeft : ArrowRight;
    const isCompleted = index < currentIndex;
    
    let colorClass = 'text-gray-500'; // Default
    if (errorHighlight) {
      colorClass = 'text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]';
    } else if (isCompleted) {
      colorClass = 'text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]';
    }

    return (
      <motion.div
        key={index}
        className={`p-2 bg-gray-900 rounded-md border border-gray-700/50 ${colorClass} transition-colors duration-200`}
        animate={isCompleted && !errorHighlight ? { scale: [1, 1.2, 1] } : {}}
      >
        <Icon size={32} />
      </motion.div>
    );
  };

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl backdrop-blur-md bg-white/5 border ${errorHighlight ? 'border-red-500/50 bg-red-500/10' : 'border-white/10'}`}>
      {sequence.map((dir, i) => renderIcon(dir, i))}
    </div>
  );
}
