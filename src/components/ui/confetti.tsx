"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiProps {
  active: boolean;
  onComplete?: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  delay: number;
}

const COLORS = ["#17B8A5", "#4DC9B4", "#22C55E", "#3B82F6", "#A855F7", "#F59E0B", "#EF4444"];

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 400,
    y: -(Math.random() * 300 + 100),
    rotation: Math.random() * 720 - 360,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: Math.random() * 8 + 4,
    delay: Math.random() * 0.3,
  }));
}

export function Confetti({ active, onComplete }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (active) {
      setParticles(generateParticles(40));
      const timeout = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timeout);
    }
    setParticles([]);
  }, [active, onComplete]);

  return (
    <AnimatePresence>
      {particles.length > 0 && (
        <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0 }}
              animate={{
                x: p.x,
                y: p.y,
                rotate: p.rotation,
                opacity: [1, 1, 0],
                scale: [0, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                delay: p.delay,
                ease: "easeOut",
              }}
              style={{
                position: "absolute",
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                borderRadius: Math.random() > 0.5 ? "50%" : "2px",
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

interface CheckBurstProps {
  active: boolean;
}

export function CheckBurst({ active }: CheckBurstProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 1] }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <motion.circle
              cx="12"
              cy="12"
              r="10"
              stroke="#22C55E"
              strokeWidth="2"
              fill="rgba(34,197,94,0.1)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3 }}
            />
            <motion.path
              d="M8 12l3 3 5-5"
              stroke="#22C55E"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
