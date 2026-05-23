"use client";

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import './TrueFocus.css';

interface TrueFocusProps {
  sentence?: string;
  separator?: string;
  manualMode?: boolean;
  blurAmount?: number;
  borderColor?: string;
  glowColor?: string;
  animationDuration?: number;
  pauseBetweenAnimations?: number;
}

const TrueFocus: React.FC<TrueFocusProps> = ({
  sentence = 'True Focus',
  separator = ' ',
  manualMode = false,
  blurAmount = 5,
  borderColor = '#14b8a6',
  glowColor = 'rgba(20, 184, 166, 0.6)',
  animationDuration = 0.5,
  pauseBetweenAnimations = 1
}) => {
  const words = sentence.split(separator);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastActiveIndex, setLastActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [focusRect, setFocusRect] = useState({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    if (!manualMode) {
      const interval = setInterval(
        () => {
          setCurrentIndex(prev => (prev + 1) % words.length);
        },
        (animationDuration + pauseBetweenAnimations) * 1000
      );

      return () => clearInterval(interval);
    }
  }, [manualMode, animationDuration, pauseBetweenAnimations, words.length]);

  useEffect(() => {
    if (currentIndex === null || currentIndex === -1) return;

    if (!wordRefs.current[currentIndex] || !containerRef.current) return;

    const parentRect = containerRef.current.getBoundingClientRect();
    const activeRef = wordRefs.current[currentIndex];
    if (!activeRef) return;
    const activeRect = activeRef.getBoundingClientRect();

    setFocusRect({
      x: activeRect.left - parentRect.left,
      y: activeRect.top - parentRect.top,
      width: activeRect.width,
      height: activeRect.height
    });
  }, [currentIndex, words.length]);

  const handleMouseEnter = (index: number) => {
    if (manualMode) {
      setLastActiveIndex(index);
      setCurrentIndex(index);
    }
  };

  const handleMouseLeave = () => {
    if (manualMode) {
      setCurrentIndex(lastActiveIndex !== null ? lastActiveIndex : 0);
    }
  };

  return (
    <div className="focus-container" ref={containerRef}>
      {words.map((word, index) => {
        const isActive = index === currentIndex;
        return (
          <span
            key={index}
            ref={el => { wordRefs.current[index] = el; }}
            className={`focus-word ${manualMode ? 'manual' : ''} ${isActive && !manualMode ? 'active' : ''}`}
            style={{
              filter: isActive ? 'blur(0px)' : `blur(${blurAmount}px)`,
              transition: `filter ${animationDuration}s ease`
            }}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
          >
            {word}
          </span>
        );
      })}

      <motion.div
        className="focus-frame"
        animate={{
          x: focusRect.x,
          y: focusRect.y,
          width: focusRect.width,
          height: focusRect.height,
          opacity: currentIndex >= 0 ? 1 : 0
        }}
        transition={{
          duration: animationDuration
        }}
        style={{
          // Set CSS custom properties safely
          color: borderColor,
          borderColor: borderColor,
          boxShadow: `0px 0px 4px ${glowColor}`
        } as React.CSSProperties}
      >
        <span className="corner top-left" style={{ borderColor }}></span>
        <span className="corner top-right" style={{ borderColor }}></span>
        <span className="corner bottom-left" style={{ borderColor }}></span>
        <span className="corner bottom-right" style={{ borderColor }}></span>
      </motion.div>
    </div>
  );
};

export default TrueFocus;
