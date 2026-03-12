"use client";
import { motion } from "framer-motion";

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}

export function ProgressRing({
  percentage,
  size = 80,
  strokeWidth = 6,
  color = "#17B8A5",
  className = "",
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-autronis-border, #2A3538)"
          strokeWidth={strokeWidth}
        />
        {/* Foreground animated ring */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset:
              circumference - (Math.min(Math.max(percentage, 0), 100) / 100) * circumference,
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "center",
          }}
        />
      </svg>
      {/* Center text */}
      <span
        className="absolute text-autronis-text-primary font-semibold tabular-nums"
        style={{ fontSize: size * 0.2 }}
      >
        {Math.round(percentage)}%
      </span>
    </div>
  );
}
