"use client";

import { motion } from "framer-motion";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({ data, width = 80, height = 30, className = "" }: SparklineProps) {
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((value, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((value - min) / range) * (height - 4) - 2,
  }));

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  // Trend: compare last value to first
  const trending = data[data.length - 1] >= data[0];
  const strokeColor = trending ? "#22C55E" : "#EF4444";

  // Fill path (area under curve)
  const fillD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id={`sparkGrad-${trending ? "up" : "down"}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={fillD}
        fill={`url(#sparkGrad-${trending ? "up" : "down"})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      />
      <motion.path
        d={pathD}
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </svg>
  );
}
