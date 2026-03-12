"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface HeatmapData {
  datum: string;
  uren: number;
}

interface ActivityHeatmapProps {
  data: HeatmapData[];
  className?: string;
}

const DAGEN = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
const CELL_SIZE = 12;
const CELL_GAP = 2;

function getWeekOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

function getColor(uren: number, maxUren: number): string {
  if (uren === 0) return "var(--border)";
  const intensity = Math.min(uren / maxUren, 1);
  if (intensity < 0.25) return "rgba(23,184,165,0.2)";
  if (intensity < 0.5) return "rgba(23,184,165,0.4)";
  if (intensity < 0.75) return "rgba(23,184,165,0.65)";
  return "rgba(23,184,165,0.9)";
}

export function ActivityHeatmap({ data, className = "" }: ActivityHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ datum: string; uren: number; x: number; y: number } | null>(null);

  // Build lookup
  const lookup = new Map<string, number>();
  let maxUren = 1;
  for (const item of data) {
    lookup.set(item.datum, item.uren);
    if (item.uren > maxUren) maxUren = item.uren;
  }

  // Generate 52 weeks of cells
  const nu = new Date();
  const cells: { datum: string; uren: number; week: number; dag: number }[] = [];

  for (let i = 364; i >= 0; i--) {
    const d = new Date(nu);
    d.setDate(d.getDate() - i);
    const datumStr = d.toISOString().slice(0, 10);
    const dagVanWeek = (d.getDay() + 6) % 7; // Monday = 0
    const weekIdx = Math.floor((364 - i) / 7);

    cells.push({
      datum: datumStr,
      uren: lookup.get(datumStr) || 0,
      week: weekIdx,
      dag: dagVanWeek,
    });
  }

  const totalWeeks = Math.max(...cells.map((c) => c.week)) + 1;
  const svgWidth = totalWeeks * (CELL_SIZE + CELL_GAP) + 30;
  const svgHeight = 7 * (CELL_SIZE + CELL_GAP) + 20;

  return (
    <div className={`relative ${className}`}>
      <svg width={svgWidth} height={svgHeight} className="overflow-visible">
        {/* Day labels */}
        {DAGEN.map((dag, i) => (
          <text
            key={dag}
            x={0}
            y={i * (CELL_SIZE + CELL_GAP) + CELL_SIZE + 14}
            className="text-[9px] fill-autronis-text-secondary"
            style={{ fontSize: "9px", fill: "var(--text-secondary)" }}
          >
            {i % 2 === 0 ? dag : ""}
          </text>
        ))}

        {/* Cells */}
        {cells.map((cell, idx) => (
          <motion.rect
            key={cell.datum}
            x={cell.week * (CELL_SIZE + CELL_GAP) + 26}
            y={cell.dag * (CELL_SIZE + CELL_GAP) + 8}
            width={CELL_SIZE}
            height={CELL_SIZE}
            rx={2}
            fill={getColor(cell.uren, maxUren)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.001, duration: 0.3 }}
            className="cursor-pointer"
            onMouseEnter={(e) => {
              const rect = (e.target as SVGRectElement).getBoundingClientRect();
              setTooltip({
                datum: cell.datum,
                uren: cell.uren,
                x: rect.left + rect.width / 2,
                y: rect.top,
              });
            }}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-autronis-card border border-autronis-border rounded-lg px-3 py-2 text-xs shadow-lg pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y - 40,
            transform: "translateX(-50%)",
          }}
        >
          <span className="text-autronis-text-primary font-medium">
            {tooltip.uren.toFixed(1)} uur
          </span>
          <span className="text-autronis-text-secondary ml-1.5">
            {new Date(tooltip.datum).toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-2 ml-7">
        <span className="text-[10px] text-autronis-text-secondary">Minder</span>
        {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
          <div
            key={intensity}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: getColor(intensity * maxUren, maxUren) }}
          />
        ))}
        <span className="text-[10px] text-autronis-text-secondary">Meer</span>
      </div>
    </div>
  );
}
