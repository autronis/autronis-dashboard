import type { BannerIllustration } from "@/types/content";

interface BgIllustrationProps {
  type: BannerIllustration;
  width: number;
  height: number;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}

const NEON = "#2DD4A8";
const SW = "2";
const FILL = "rgba(45,212,168,0.04)";

// ─── Illustrations ────────────────────────────────────────────────────────────

function GearIllustration({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  function GearShape({ x, y, radius, teeth }: { x: number; y: number; radius: number; teeth: number }) {
    const outerR = radius;
    const innerR = radius * 0.75;
    const toothW = radius * 0.18;
    const pts: string[] = [];
    for (let i = 0; i < teeth; i++) {
      const a1 = (i / teeth) * Math.PI * 2 - Math.PI / teeth * 0.38;
      const a2 = (i / teeth) * Math.PI * 2 + Math.PI / teeth * 0.38;
      const a3 = ((i + 0.5) / teeth) * Math.PI * 2 - Math.PI / teeth * 0.38;
      const a4 = ((i + 0.5) / teeth) * Math.PI * 2 + Math.PI / teeth * 0.38;
      pts.push(`${x + Math.cos(a1) * innerR},${y + Math.sin(a1) * innerR}`);
      pts.push(`${x + Math.cos(a1) * (outerR + toothW)},${y + Math.sin(a1) * (outerR + toothW)}`);
      pts.push(`${x + Math.cos(a2) * (outerR + toothW)},${y + Math.sin(a2) * (outerR + toothW)}`);
      pts.push(`${x + Math.cos(a2) * innerR},${y + Math.sin(a2) * innerR}`);
      pts.push(`${x + Math.cos(a3) * innerR},${y + Math.sin(a3) * innerR}`);
      pts.push(`${x + Math.cos(a4) * innerR},${y + Math.sin(a4) * innerR}`);
    }
    return (
      <>
        <polygon points={pts.join(" ")} fill={FILL} stroke={NEON} strokeWidth={SW} strokeLinejoin="round" />
        <circle cx={x} cy={y} r={radius * 0.32} fill="none" stroke={NEON} strokeWidth={SW} />
        <circle cx={x} cy={y} r={radius * 0.15} fill={FILL} stroke={NEON} strokeWidth="1.5" />
      </>
    );
  }
  // 3 interlocking gears of different sizes
  const r1 = r * 0.52;
  const r2 = r * 0.36;
  const r3 = r * 0.28;
  const cx1 = cx - r * 0.2;
  const cy1 = cy + r * 0.1;
  const cx2 = cx + r1 + r2 + r * 0.04;
  const cy2 = cy + r * 0.1;
  const cx3 = cx1;
  const cy3 = cy1 - r1 - r3 - r * 0.04;
  return (
    <>
      <GearShape x={cx1} y={cy1} radius={r1} teeth={14} />
      <GearShape x={cx2} y={cy2} radius={r2} teeth={10} />
      <GearShape x={cx3} y={cy3} radius={r3} teeth={8} />
      {/* Connecting lines (mesh indicators) */}
      <line x1={cx1 + r1} y1={cy1} x2={cx2 - r2} y2={cy2} stroke={NEON} strokeWidth="0.8" opacity="0.2" strokeDasharray="4,4" />
      <line x1={cx1} y1={cy1 - r1} x2={cx3} y2={cy3 + r3} stroke={NEON} strokeWidth="0.8" opacity="0.2" strokeDasharray="4,4" />
    </>
  );
}

function BrainIllustration({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const nodes = [
    { x: cx - r * 0.6, y: cy - r * 0.3 }, { x: cx - r * 0.2, y: cy - r * 0.55 },
    { x: cx + r * 0.2, y: cy - r * 0.55 }, { x: cx + r * 0.6, y: cy - r * 0.3 },
    { x: cx - r * 0.72, y: cy + r * 0.08 }, { x: cx - r * 0.25, y: cy + r * 0.12 },
    { x: cx + r * 0.25, y: cy + r * 0.12 }, { x: cx + r * 0.72, y: cy + r * 0.08 },
    { x: cx - r * 0.45, y: cy + r * 0.5 }, { x: cx, y: cy + r * 0.55 },
    { x: cx + r * 0.45, y: cy + r * 0.5 },
    { x: cx - r * 0.1, y: cy - r * 0.15 }, { x: cx + r * 0.1, y: cy - r * 0.15 },
  ];
  const connections = [
    [0,1],[1,2],[2,3],[0,4],[1,5],[2,6],[3,7],[4,5],[5,6],[6,7],
    [4,8],[5,9],[6,9],[7,10],[8,9],[9,10],[1,6],[2,5],[5,11],[6,12],[11,12]
  ];
  // Synaptic arcs
  const arcs = [
    [0,2],[1,3],[4,6],[5,7],[8,10]
  ];
  return (
    <>
      <ellipse cx={cx - r * 0.22} cy={cy} rx={r * 0.52} ry={r * 0.62} fill="none" stroke={NEON} strokeWidth={SW} opacity="0.35" />
      <ellipse cx={cx + r * 0.22} cy={cy} rx={r * 0.52} ry={r * 0.62} fill="none" stroke={NEON} strokeWidth={SW} opacity="0.35" />
      <line x1={cx} y1={cy - r * 0.58} x2={cx} y2={cy + r * 0.58} stroke={NEON} strokeWidth="1" opacity="0.25" strokeDasharray="5,5" />
      {arcs.map(([a, b], i) => {
        const mx = (nodes[a].x + nodes[b].x) / 2;
        const my = (nodes[a].y + nodes[b].y) / 2 - r * 0.12;
        return <path key={`arc-${i}`} d={`M${nodes[a].x},${nodes[a].y} Q${mx},${my} ${nodes[b].x},${nodes[b].y}`} fill="none" stroke={NEON} strokeWidth="0.8" opacity="0.25" strokeDasharray="3,5" />;
      })}
      {connections.map(([a, b], i) => (
        <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} stroke={NEON} strokeWidth="1" opacity="0.45" />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={i < 4 ? r * 0.05 : r * 0.038} fill={NEON} opacity="0.7" />
      ))}
      {/* Tiny pulse dots on connections */}
      {[[cx-r*0.4, cy-r*0.05],[cx+r*0.4, cy-r*0.05],[cx, cy+r*0.3]].map(([x,y],i) => (
        <circle key={`p-${i}`} cx={x} cy={y} r={r*0.022} fill="none" stroke={NEON} strokeWidth="1" opacity="0.4" />
      ))}
    </>
  );
}

function NodesIllustration({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const nodes = [
    { x: cx, y: cy, r: r * 0.1 },
    { x: cx - r * 0.55, y: cy - r * 0.38, r: r * 0.072 },
    { x: cx + r * 0.55, y: cy - r * 0.38, r: r * 0.072 },
    { x: cx - r * 0.62, y: cy + r * 0.32, r: r * 0.08 },
    { x: cx + r * 0.62, y: cy + r * 0.32, r: r * 0.08 },
    { x: cx, y: cy - r * 0.68, r: r * 0.058 },
    { x: cx, y: cy + r * 0.68, r: r * 0.058 },
    { x: cx - r * 0.28, y: cy - r * 0.18, r: r * 0.045 },
    { x: cx + r * 0.28, y: cy - r * 0.18, r: r * 0.045 },
    { x: cx - r * 0.3, y: cy + r * 0.22, r: r * 0.04 },
    { x: cx + r * 0.3, y: cy + r * 0.22, r: r * 0.04 },
    { x: cx - r * 0.78, y: cy - r * 0.05, r: r * 0.035 },
    { x: cx + r * 0.78, y: cy - r * 0.05, r: r * 0.035 },
    { x: cx - r * 0.12, y: cy + r * 0.45, r: r * 0.03 },
    { x: cx + r * 0.15, y: cy - r * 0.45, r: r * 0.03 },
  ];
  const links = [
    [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],
    [1,5],[2,5],[3,6],[4,6],[1,3],[2,4],
    [0,7],[0,8],[0,9],[0,10],
    [1,7],[2,8],[1,11],[2,12],[3,9],[4,10],
    [7,8],[9,10],[11,3],[12,4],[5,14],[6,13]
  ];
  return (
    <>
      {links.map(([a, b], i) => {
        const thick = a === 0 || b === 0;
        return <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} stroke={NEON} strokeWidth={thick ? "1.5" : "0.8"} opacity={thick ? "0.4" : "0.25"} />;
      })}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={n.r} fill={FILL} stroke={NEON} strokeWidth={i === 0 ? "2" : "1.5"} />
      ))}
      {/* Cluster ring around center */}
      <circle cx={cx} cy={cy} r={r * 0.22} fill="none" stroke={NEON} strokeWidth="0.7" opacity="0.2" strokeDasharray="6,6" />
    </>
  );
}

function ChartIllustration({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const baseY = cy + r * 0.55;
  const leftX = cx - r * 0.72;
  const rightX = cx + r * 0.72;

  const line1 = [
    { x: leftX, y: baseY - r * 0.1 },
    { x: cx - r * 0.4, y: baseY - r * 0.32 },
    { x: cx - r * 0.05, y: baseY - r * 0.52 },
    { x: cx + r * 0.25, y: baseY - r * 0.78 },
    { x: rightX, y: baseY - r * 1.1 },
  ];
  const line2 = [
    { x: leftX, y: baseY - r * 0.3 },
    { x: cx - r * 0.45, y: baseY - r * 0.18 },
    { x: cx - r * 0.1, y: baseY - r * 0.42 },
    { x: cx + r * 0.2, y: baseY - r * 0.6 },
    { x: rightX, y: baseY - r * 0.85 },
  ];
  const line1D = line1.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaD = `${line1D} L${rightX},${baseY} L${leftX},${baseY} Z`;
  const gridLines = [0.25, 0.5, 0.75, 1.0].map((f) => baseY - r * 1.1 * f);

  // Bar chart bars
  const bars = [
    { x: cx - r * 0.65, h: r * 0.35 },
    { x: cx - r * 0.35, h: r * 0.55 },
    { x: cx - r * 0.05, h: r * 0.42 },
    { x: cx + r * 0.25, h: r * 0.7 },
    { x: cx + r * 0.53, h: r * 0.9 },
  ];
  const barW = r * 0.2;

  return (
    <>
      {/* Background bars */}
      {bars.map((b, i) => (
        <rect key={`bar-${i}`} x={b.x - barW / 2} y={baseY - b.h} width={barW} height={b.h} fill="rgba(45,212,168,0.05)" stroke={NEON} strokeWidth="1" opacity="0.4" />
      ))}
      {/* Grid lines */}
      {gridLines.map((y, i) => (
        <line key={i} x1={leftX} y1={y} x2={rightX} y2={y} stroke={NEON} strokeWidth="0.7" opacity="0.18" strokeDasharray="7,7" />
      ))}
      {/* Axes */}
      <line x1={leftX} y1={cy - r * 0.65} x2={leftX} y2={baseY} stroke={NEON} strokeWidth={SW} opacity="0.45" />
      <line x1={leftX} y1={baseY} x2={rightX} y2={baseY} stroke={NEON} strokeWidth={SW} opacity="0.45" />
      {/* Area fill */}
      <path d={areaD} fill="rgba(45,212,168,0.05)" stroke="none" />
      {/* Line 2 (secondary) */}
      <path d={line2.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")} fill="none" stroke={NEON} strokeWidth="1" strokeDasharray="6,4" opacity="0.4" />
      {/* Line 1 (primary) */}
      <path d={line1D} fill="none" stroke={NEON} strokeWidth={SW} strokeLinejoin="round" />
      {line1.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={r * 0.04} fill={NEON} opacity="0.75" />
      ))}
      {/* Axis labels ticks */}
      {[0.25, 0.5, 0.75, 1.0].map((f, i) => (
        <line key={`tick-${i}`} x1={leftX - r * 0.06} y1={baseY - r * 1.1 * f} x2={leftX} y2={baseY - r * 1.1 * f} stroke={NEON} strokeWidth="1" opacity="0.3" />
      ))}
    </>
  );
}

function TargetIllustration({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <>
      {/* Target rings */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={NEON} strokeWidth={SW} opacity="0.35" />
      <circle cx={cx} cy={cy} r={r * 0.72} fill="none" stroke={NEON} strokeWidth={SW} opacity="0.45" />
      <circle cx={cx} cy={cy} r={r * 0.46} fill="none" stroke={NEON} strokeWidth={SW} opacity="0.55" />
      <circle cx={cx} cy={cy} r={r * 0.22} fill={FILL} stroke={NEON} strokeWidth={SW} opacity="0.8" />
      {/* Crosshair */}
      <line x1={cx} y1={cy - r * 1.18} x2={cx} y2={cy - r * 0.82} stroke={NEON} strokeWidth={SW} opacity="0.5" />
      <line x1={cx} y1={cy + r * 1.18} x2={cx} y2={cy + r * 0.82} stroke={NEON} strokeWidth={SW} opacity="0.5" />
      <line x1={cx - r * 1.18} y1={cy} x2={cx - r * 0.82} y2={cy} stroke={NEON} strokeWidth={SW} opacity="0.5" />
      <line x1={cx + r * 1.18} y1={cy} x2={cx + r * 0.82} y2={cy} stroke={NEON} strokeWidth={SW} opacity="0.5" />
      {/* Arrow from top-right */}
      <path d={`M${cx + r * 0.75},${cy - r * 0.75} L${cx + r * 0.22},${cy - r * 0.22}`} stroke={NEON} strokeWidth={SW} strokeLinecap="round" opacity="0.9" />
      <path d={`M${cx + r * 0.75},${cy - r * 0.75} L${cx + r * 0.44},${cy - r * 0.75} M${cx + r * 0.75},${cy - r * 0.75} L${cx + r * 0.75},${cy - r * 0.44}`} stroke={NEON} strokeWidth={SW} strokeLinecap="round" opacity="0.9" />
      {/* Magnet shape pulling towards center */}
      <path d={`M${cx - r * 0.88},${cy - r * 0.5} A${r * 0.18},${r * 0.18} 0 0 0 ${cx - r * 0.88},${cy - r * 0.14}`} fill="none" stroke={NEON} strokeWidth="2.5" opacity="0.55" />
      <path d={`M${cx - r * 1.1},${cy - r * 0.5} L${cx - r * 0.88},${cy - r * 0.5} M${cx - r * 1.1},${cy - r * 0.14} L${cx - r * 0.88},${cy - r * 0.14}`} stroke={NEON} strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      {/* Attracted particles */}
      {[0.38, 0.6, 0.82].map((f, i) => (
        <circle key={i} cx={cx - r * f} cy={cy + r * 0.62} r={r * 0.025} fill={NEON} opacity={0.5 - i * 0.1} />
      ))}
    </>
  );
}

function FlowIllustration({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const bw = r * 0.52;
  const bh = r * 0.27;
  const dh = r * 0.28; // diamond half-size

  const startBox = { x: cx, y: cy - r * 0.75 };
  const decision1 = { x: cx, y: cy - r * 0.2 };
  const boxLeft = { x: cx - r * 0.75, y: cy + r * 0.35 };
  const boxRight = { x: cx + r * 0.75, y: cy + r * 0.35 };
  const endBox = { x: cx, y: cy + r * 0.88 };

  function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const len = 10;
    return (
      <>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={NEON} strokeWidth="1.5" opacity="0.55" />
        <path d={`M${x2 - Math.cos(angle - 0.45) * len},${y2 - Math.sin(angle - 0.45) * len} L${x2},${y2} L${x2 - Math.cos(angle + 0.45) * len},${y2 - Math.sin(angle + 0.45) * len}`} fill="none" stroke={NEON} strokeWidth="1.5" opacity="0.55" strokeLinejoin="round" />
      </>
    );
  }

  return (
    <>
      {/* Start box (rounded) */}
      <rect x={startBox.x - bw / 2} y={startBox.y - bh / 2} width={bw} height={bh} rx={bh * 0.5} fill={FILL} stroke={NEON} strokeWidth={SW} />
      {/* Decision diamond */}
      <polygon points={`${decision1.x},${decision1.y - dh} ${decision1.x + dh * 1.4},${decision1.y} ${decision1.x},${decision1.y + dh} ${decision1.x - dh * 1.4},${decision1.y}`} fill={FILL} stroke={NEON} strokeWidth={SW} />
      {/* Branch boxes */}
      <rect x={boxLeft.x - bw / 2} y={boxLeft.y - bh / 2} width={bw} height={bh} rx={bh * 0.18} fill={FILL} stroke={NEON} strokeWidth={SW} />
      <rect x={boxRight.x - bw / 2} y={boxRight.y - bh / 2} width={bw} height={bh} rx={bh * 0.18} fill={FILL} stroke={NEON} strokeWidth={SW} />
      {/* End box (rounded) */}
      <rect x={endBox.x - bw / 2} y={endBox.y - bh / 2} width={bw} height={bh} rx={bh * 0.5} fill={FILL} stroke={NEON} strokeWidth={SW} />
      {/* Arrows */}
      <Arrow x1={startBox.x} y1={startBox.y + bh / 2} x2={decision1.x} y2={decision1.y - dh} />
      <Arrow x1={decision1.x - dh * 1.4} y1={decision1.y} x2={boxLeft.x + bw / 2} y2={boxLeft.y} />
      <Arrow x1={decision1.x + dh * 1.4} y1={decision1.y} x2={boxRight.x - bw / 2} y2={boxRight.y} />
      <Arrow x1={boxLeft.x} y1={boxLeft.y + bh / 2} x2={endBox.x - bw / 4} y2={endBox.y - bh / 2} />
      <Arrow x1={boxRight.x} y1={boxRight.y + bh / 2} x2={endBox.x + bw / 4} y2={endBox.y - bh / 2} />
      {/* Yes/No labels (tiny dots) */}
      <circle cx={decision1.x - r * 0.4} cy={decision1.y + r * 0.04} r={r * 0.022} fill={NEON} opacity="0.5" />
      <circle cx={decision1.x + r * 0.4} cy={decision1.y + r * 0.04} r={r * 0.022} fill={NEON} opacity="0.5" />
    </>
  );
}

function CircuitIllustration({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const yLevels = [cy - r * 0.7, cy - r * 0.35, cy, cy + r * 0.35, cy + r * 0.7];
  const xLevels = [cx - r * 0.85, cx - r * 0.42, cx, cx + r * 0.42, cx + r * 0.85];

  return (
    <>
      {/* Horizontal traces */}
      {yLevels.map((y, i) => (
        <line key={`h-${i}`} x1={cx - r * 0.95} y1={y} x2={cx + r * 0.95} y2={y} stroke={NEON} strokeWidth="0.8" opacity="0.25" />
      ))}
      {/* Vertical traces */}
      {xLevels.map((x, i) => (
        <line key={`v-${i}`} x1={x} y1={cy - r * 0.8} x2={x} y2={cy + r * 0.8} stroke={NEON} strokeWidth="0.8" opacity="0.25" />
      ))}
      {/* Vias at intersections */}
      {yLevels.map((y) =>
        xLevels.map((x, j) => (
          <circle key={`${y}-${x}`} cx={x} cy={y} r={j % 2 === 0 ? r * 0.035 : r * 0.022} fill={FILL} stroke={NEON} strokeWidth="1" opacity="0.6" />
        ))
      )}
      {/* IC chip — center */}
      <rect x={cx - r * 0.2} y={cy - r * 0.28} width={r * 0.4} height={r * 0.56} rx={r * 0.04} fill={FILL} stroke={NEON} strokeWidth={SW} opacity="0.7" />
      {/* IC pins */}
      {[-0.16, -0.04, 0.08].map((yo, i) => (
        <line key={`lpin-${i}`} x1={cx - r * 0.2} y1={cy + yo} x2={cx - r * 0.32} y2={cy + yo} stroke={NEON} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      ))}
      {[-0.16, -0.04, 0.08].map((yo, i) => (
        <line key={`rpin-${i}`} x1={cx + r * 0.2} y1={cy + yo} x2={cx + r * 0.32} y2={cy + yo} stroke={NEON} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      ))}
      {/* Small capacitor-like component */}
      <rect x={cx - r * 0.65} y={cy - r * 0.16} width={r * 0.2} height={r * 0.32} rx={r * 0.03} fill={FILL} stroke={NEON} strokeWidth="1.5" opacity="0.55" />
      {/* Resistor */}
      <rect x={cx + r * 0.45} y={cy - r * 0.24} width={r * 0.28} height={r * 0.14} rx={r * 0.03} fill={FILL} stroke={NEON} strokeWidth="1.5" opacity="0.55" />
      {/* Corner detail dots */}
      {[[-0.8,-0.65],[0.8,-0.65],[-0.8,0.65],[0.8,0.65]].map(([xo,yo],i) => (
        <circle key={`c-${i}`} cx={cx + r * xo} cy={cy + r * yo} r={r * 0.028} fill={NEON} opacity="0.3" />
      ))}
    </>
  );
}

function LightbulbIllustration({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const bulbR = r * 0.5;
  const stemY = cy + bulbR * 0.6;
  const stemH = r * 0.26;
  const rayAngles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  return (
    <>
      {/* Rays */}
      {rayAngles.map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = cx + Math.cos(rad) * (bulbR + r * 0.12);
        const y1 = cy + Math.sin(rad) * (bulbR + r * 0.12);
        const x2 = cx + Math.cos(rad) * (bulbR + r * 0.3);
        const y2 = cy + Math.sin(rad) * (bulbR + r * 0.3);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={NEON} strokeWidth={i % 2 === 0 ? "1.5" : "1"} opacity={i % 2 === 0 ? "0.4" : "0.22"} strokeLinecap="round" />;
      })}
      {/* Bulb */}
      <circle cx={cx} cy={cy} r={bulbR} fill={FILL} stroke={NEON} strokeWidth={SW} />
      {/* Filament */}
      <path d={`M${cx - bulbR * 0.28},${cy + bulbR * 0.12} L${cx - bulbR * 0.1},${cy - bulbR * 0.18} L${cx + bulbR * 0.1},${cy + bulbR * 0.12} L${cx + bulbR * 0.28},${cy - bulbR * 0.18}`} fill="none" stroke={NEON} strokeWidth="1.5" strokeLinejoin="round" opacity="0.85" strokeLinecap="round" />
      {/* Stem/base */}
      <rect x={cx - bulbR * 0.28} y={stemY} width={bulbR * 0.56} height={stemH} rx={bulbR * 0.06} fill={FILL} stroke={NEON} strokeWidth={SW} />
      <rect x={cx - bulbR * 0.22} y={stemY + stemH} width={bulbR * 0.44} height={stemH * 0.42} rx={bulbR * 0.05} fill={FILL} stroke={NEON} strokeWidth="1.5" />
      {/* Idea bubbles floating around */}
      <circle cx={cx + bulbR * 0.95} cy={cy - bulbR * 0.75} r={r * 0.06} fill="none" stroke={NEON} strokeWidth="1.2" opacity="0.4" />
      <circle cx={cx + bulbR * 1.15} cy={cy - bulbR * 1.05} r={r * 0.04} fill="none" stroke={NEON} strokeWidth="1" opacity="0.3" />
      <circle cx={cx - bulbR * 0.92} cy={cy - bulbR * 0.8} r={r * 0.05} fill="none" stroke={NEON} strokeWidth="1" opacity="0.35" />
      {/* Spark dots */}
      {[[1.2, -0.3],[1.3, 0.1],[-1.2, -0.2],[-1.3, 0.15]].map(([xo, yo], i) => (
        <circle key={`sp-${i}`} cx={cx + bulbR * xo} cy={cy + bulbR * yo} r={r * 0.018} fill={NEON} opacity="0.35" />
      ))}
    </>
  );
}

function PuzzleIllustration({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const ps = r * 0.42; // piece size
  const nb = r * 0.1;  // nub radius
  // 6 puzzle pieces: 2x3 grid, with some floating/offset
  const pieces = [
    { x: cx - ps * 1.08, y: cy - ps * 1.6, connected: true },
    { x: cx + ps * 0.08, y: cy - ps * 1.6, connected: true },
    { x: cx - ps * 1.08, y: cy - ps * 0.52, connected: true },
    { x: cx + ps * 0.08, y: cy - ps * 0.52, connected: true },
    { x: cx - ps * 1.08 + r * 0.05, y: cy + ps * 0.62, connected: false },
    { x: cx + ps * 0.08 + r * 0.08, y: cy + ps * 0.58, connected: false },
  ];

  return (
    <>
      {pieces.map((p, i) => (
        <rect
          key={i}
          x={p.x}
          y={p.y}
          width={ps}
          height={ps}
          rx={ps * 0.08}
          fill={FILL}
          stroke={NEON}
          strokeWidth={SW}
          opacity={p.connected ? "0.75" : "0.5"}
        />
      ))}
      {/* Nubs between connected pieces */}
      <circle cx={cx + ps * 0.08 - nb * 0.5} cy={cy - ps * 1.1} r={nb} fill={FILL} stroke={NEON} strokeWidth="1.5" opacity="0.65" />
      <circle cx={cx - ps * 1.08 + ps / 2} cy={cy - ps * 0.52} r={nb} fill={FILL} stroke={NEON} strokeWidth="1.5" opacity="0.65" />
      <circle cx={cx + ps * 0.08 + ps / 2} cy={cy - ps * 0.52} r={nb} fill={FILL} stroke={NEON} strokeWidth="1.5" opacity="0.65" />
      {/* Motion lines on floating pieces */}
      {[0, 1].map((i) => (
        <line key={`ml-${i}`} x1={pieces[4 + i].x - r * 0.08} y1={pieces[4 + i].y + ps / 2} x2={pieces[4 + i].x - r * 0.22} y2={pieces[4 + i].y + ps / 2} stroke={NEON} strokeWidth="1" opacity="0.3" strokeDasharray="3,3" />
      ))}
    </>
  );
}

function CloudIllustration({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const cw = r * 0.9;
  const ch = r * 0.5;
  const baseY = cy + ch * 0.25;

  return (
    <>
      {/* Cloud body */}
      <ellipse cx={cx} cy={baseY} rx={cw} ry={ch} fill={FILL} stroke={NEON} strokeWidth={SW} opacity="0.55" />
      <circle cx={cx - cw * 0.38} cy={baseY - ch * 0.5} r={ch * 0.65} fill={FILL} stroke={NEON} strokeWidth={SW} opacity="0.55" />
      <circle cx={cx + cw * 0.18} cy={baseY - ch * 0.72} r={ch * 0.75} fill={FILL} stroke={NEON} strokeWidth={SW} opacity="0.55" />
      <circle cx={cx + cw * 0.6} cy={baseY - ch * 0.38} r={ch * 0.55} fill={FILL} stroke={NEON} strokeWidth={SW} opacity="0.55" />
      {/* Upload/download arrows */}
      {[-0.38, 0, 0.38].map((xo, i) => {
        const ax = cx + xo * r;
        const ay = baseY + ch + r * 0.06;
        const isUp = i === 0;
        return (
          <g key={i}>
            <line x1={ax} y1={ay} x2={ax} y2={ay + r * 0.32} stroke={NEON} strokeWidth={SW} strokeLinecap="round" opacity="0.65" />
            {isUp ? (
              <path d={`M${ax - r * 0.1},${ay + r * 0.12} L${ax},${ay} L${ax + r * 0.1},${ay + r * 0.12}`} fill="none" stroke={NEON} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
            ) : (
              <path d={`M${ax - r * 0.1},${ay + r * 0.2} L${ax},${ay + r * 0.32} L${ax + r * 0.1},${ay + r * 0.2}`} fill="none" stroke={NEON} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
            )}
          </g>
        );
      })}
      {/* Connected devices below */}
      {[-0.45, 0.45].map((xo, i) => (
        <rect key={`dev-${i}`} x={cx + xo * r - r * 0.12} y={baseY + ch + r * 0.52} width={r * 0.24} height={r * 0.16} rx={r * 0.03} fill={FILL} stroke={NEON} strokeWidth="1.5" opacity="0.4" />
      ))}
      {/* Data streams */}
      {[-0.2, 0.2].map((xo, i) => (
        <line key={`ds-${i}`} x1={cx + xo * r} y1={baseY + ch + r * 0.5} x2={cx + xo * r * 0.8} y2={baseY + ch + r * 0.52} stroke={NEON} strokeWidth="0.8" opacity="0.25" strokeDasharray="4,4" />
      ))}
    </>
  );
}

function RocketIllustration({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const bodyH = r * 1.05;
  const bodyW = r * 0.4;
  const noseH = r * 0.5;

  return (
    <>
      {/* Stars */}
      {[[-0.7,-0.8],[0.75,-0.65],[-0.5,-0.45],[0.6,-0.3],[-0.78,-0.2],[0.8,0.1]].map(([xo, yo], i) => {
        const sx = cx + r * xo;
        const sy = cy + r * yo;
        const sr = r * (i % 2 === 0 ? 0.018 : 0.012);
        return <circle key={`star-${i}`} cx={sx} cy={sy} r={sr} fill={NEON} opacity={0.4 - i * 0.04} />;
      })}
      {/* Trajectory arc */}
      <path d={`M${cx - r * 0.9},${cy + r * 0.5} Q${cx},${cy - r * 0.3} ${cx + r * 0.85},${cy - r * 0.7}`} fill="none" stroke={NEON} strokeWidth="0.8" opacity="0.25" strokeDasharray="8,6" />
      {/* Rocket body */}
      <rect x={cx - bodyW / 2} y={cy - bodyH / 2} width={bodyW} height={bodyH} rx={bodyW * 0.24} fill={FILL} stroke={NEON} strokeWidth={SW} opacity="0.72" />
      {/* Nose cone */}
      <path d={`M${cx - bodyW / 2},${cy - bodyH / 2} Q${cx},${cy - bodyH / 2 - noseH} ${cx + bodyW / 2},${cy - bodyH / 2}`} fill={FILL} stroke={NEON} strokeWidth={SW} strokeLinejoin="round" opacity="0.72" />
      {/* Left fin */}
      <path d={`M${cx - bodyW / 2},${cy + bodyH * 0.08} L${cx - bodyW},${cy + bodyH / 2} L${cx - bodyW / 2},${cy + bodyH / 2}`} fill={FILL} stroke={NEON} strokeWidth={SW} strokeLinejoin="round" opacity="0.6" />
      {/* Right fin */}
      <path d={`M${cx + bodyW / 2},${cy + bodyH * 0.08} L${cx + bodyW},${cy + bodyH / 2} L${cx + bodyW / 2},${cy + bodyH / 2}`} fill={FILL} stroke={NEON} strokeWidth={SW} strokeLinejoin="round" opacity="0.6" />
      {/* Window */}
      <circle cx={cx} cy={cy - bodyH * 0.08} r={bodyW * 0.28} fill={FILL} stroke={NEON} strokeWidth={SW} opacity="0.85" />
      {/* Exhaust trail */}
      <path d={`M${cx - bodyW * 0.32},${cy + bodyH / 2} Q${cx - bodyW * 0.05},${cy + bodyH / 2 + r * 0.38} ${cx + bodyW * 0.32},${cy + bodyH / 2}`} fill="none" stroke={NEON} strokeWidth="1.5" opacity="0.45" />
      <path d={`M${cx - bodyW * 0.2},${cy + bodyH / 2 + r * 0.1} Q${cx},${cy + bodyH / 2 + r * 0.55} ${cx + bodyW * 0.2},${cy + bodyH / 2 + r * 0.1}`} fill="none" stroke={NEON} strokeWidth="1" opacity="0.3" />
    </>
  );
}

function CalendarIllustration({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const cw = r * 1.5;
  const ch = r * 1.35;
  const rows = 4;
  const cols = 7;
  const cellW = cw / cols;
  const cellH = (ch * 0.75) / rows;
  const startX = cx - cw / 2;
  const startY = cy - ch / 2 + ch * 0.25;
  // Cells with checkmarks (col, row)
  const checked = [[1,0],[3,0],[5,0],[0,1],[2,1],[4,2],[6,1]];
  // Progress bar positions (row)
  const progress = [{ row: 3, pct: 0.6 }, { row: 3, col: 3, pct: 0.85 }];

  return (
    <>
      {/* Frame */}
      <rect x={cx - cw / 2} y={cy - ch / 2} width={cw} height={ch} rx={r * 0.08} fill={FILL} stroke={NEON} strokeWidth={SW} opacity="0.55" />
      {/* Header bar */}
      <rect x={cx - cw / 2} y={cy - ch / 2} width={cw} height={ch * 0.22} rx={r * 0.08} fill="rgba(45,212,168,0.07)" stroke="none" />
      {/* Binding nubs */}
      {[0.28, 0.72].map((f, i) => (
        <rect key={i} x={cx - cw / 2 + cw * f - r * 0.06} y={cy - ch / 2 - r * 0.1} width={r * 0.12} height={r * 0.2} rx={r * 0.04} fill={FILL} stroke={NEON} strokeWidth="1.5" opacity="0.65" />
      ))}
      {/* Grid cells */}
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => {
          const isChecked = checked.some(([c, ro]) => c === col && ro === row);
          const isHighlight = col === 3 && row === 1;
          return (
            <rect
              key={`${row}-${col}`}
              x={startX + col * cellW + 1}
              y={startY + row * cellH + 1}
              width={cellW - 2}
              height={cellH - 2}
              rx={r * 0.02}
              fill={isHighlight ? "rgba(45,212,168,0.14)" : "none"}
              stroke={NEON}
              strokeWidth={isHighlight ? "1.5" : "0.7"}
              opacity={isHighlight ? "0.85" : "0.28"}
            />
          );
        })
      )}
      {/* Checkmarks */}
      {checked.map(([col, row], i) => {
        const mx = startX + col * cellW + cellW / 2;
        const my = startY + row * cellH + cellH / 2;
        const cs = cellH * 0.28;
        return (
          <path key={`ck-${i}`} d={`M${mx - cs},${my} L${mx - cs * 0.3},${my + cs * 0.8} L${mx + cs},${my - cs * 0.6}`} fill="none" stroke={NEON} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        );
      })}
      {/* Progress indicator */}
      <rect x={startX + 1} y={startY + rows * cellH + 4} width={(cw - 2) * 0.6} height={r * 0.07} rx={r * 0.035} fill={NEON} opacity="0.3" />
      <rect x={startX + 1} y={startY + rows * cellH + 4} width={(cw - 2) * 0.6 * 0.72} height={r * 0.07} rx={r * 0.035} fill={NEON} opacity="0.55" />
    </>
  );
}

function MagnetIllustration({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const aw = r * 0.3;
  const ah = r * 0.88;
  const gap = r * 0.32;

  return (
    <>
      {/* Force field arcs */}
      {[0.4, 0.65, 0.9].map((f, i) => (
        <path key={`arc-${i}`} d={`M${cx - gap / 2 - aw - r * f},${cy} A${r * f + gap / 2 + aw},${r * f * 0.6} 0 0 1 ${cx + gap / 2 + aw + r * f},${cy}`} fill="none" stroke={NEON} strokeWidth="0.8" opacity={0.25 - i * 0.06} strokeDasharray="6,6" />
      ))}
      {/* Left arm */}
      <path d={`M${cx - gap / 2 - aw},${cy - ah / 2} L${cx - gap / 2 - aw},${cy} A${aw / 2},${aw / 2} 0 0 0 ${cx - gap / 2},${cy} L${cx - gap / 2},${cy - ah / 2}`} fill={FILL} stroke={NEON} strokeWidth={SW} strokeLinejoin="round" opacity="0.72" />
      {/* Right arm */}
      <path d={`M${cx + gap / 2},${cy - ah / 2} L${cx + gap / 2},${cy} A${aw / 2},${aw / 2} 0 0 0 ${cx + gap / 2 + aw},${cy} L${cx + gap / 2 + aw},${cy - ah / 2}`} fill={FILL} stroke={NEON} strokeWidth={SW} strokeLinejoin="round" opacity="0.72" />
      {/* Top bar */}
      <rect x={cx - gap / 2 - aw} y={cy - ah / 2 - aw * 0.4} width={gap + aw * 2} height={aw * 0.4} rx={aw * 0.1} fill={FILL} stroke={NEON} strokeWidth={SW} opacity="0.82" />
      {/* Attracted particles (left side) */}
      {[0.15, 0.35, 0.55].map((f, i) => (
        <circle key={`lp-${i}`} cx={cx - gap / 2 - aw - r * (0.45 - f * 0.25)} cy={cy + ah * 0.1 + f * r * 0.25} r={r * 0.025} fill={NEON} opacity={0.55 - i * 0.12} />
      ))}
      {/* Attracted particles (right side) */}
      {[0.15, 0.35, 0.55].map((f, i) => (
        <circle key={`rp-${i}`} cx={cx + gap / 2 + aw + r * (0.45 - f * 0.25)} cy={cy + ah * 0.1 + f * r * 0.25} r={r * 0.025} fill={NEON} opacity={0.55 - i * 0.12} />
      ))}
      {/* Dashed attraction lines */}
      {[-0.22, 0.1, 0.38].map((yo, i) => (
        <line key={`al-${i}`} x1={cx - gap / 2 - aw - r * 0.2} y1={cy + ah * 0.3 + yo * r} x2={cx - gap / 2 - aw - r * 0.55} y2={cy + ah * 0.3 + yo * r} stroke={NEON} strokeWidth="1.2" opacity="0.35" strokeDasharray="3,3" />
      ))}
    </>
  );
}

function HandshakeIllustration({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const fw = r * 0.3;
  const fh = r * 0.52;

  return (
    <>
      {/* Energy field between hands */}
      {[0.28, 0.48, 0.68].map((f, i) => (
        <ellipse key={`ef-${i}`} cx={cx} cy={cy} rx={r * f * 0.5} ry={r * f * 0.35} fill="none" stroke={NEON} strokeWidth="0.7" opacity={0.18 - i * 0.04} />
      ))}
      {/* Left arm */}
      <path d={`M${cx - r * 0.95},${cy + r * 0.18} L${cx - r * 0.08},${cy - r * 0.1}`} stroke={NEON} strokeWidth={fw * 0.55} strokeLinecap="round" opacity="0.45" />
      {/* Right arm */}
      <path d={`M${cx + r * 0.95},${cy + r * 0.18} L${cx + r * 0.08},${cy - r * 0.1}`} stroke={NEON} strokeWidth={fw * 0.55} strokeLinecap="round" opacity="0.45" />
      {/* Clasped hands center */}
      <ellipse cx={cx} cy={cy} rx={fw} ry={fh * 0.42} fill={FILL} stroke={NEON} strokeWidth={SW} opacity="0.85" />
      {/* Finger lines left */}
      {[0.18, 0.38, 0.58].map((f, i) => (
        <path key={`fl-${i}`} d={`M${cx - fw * 0.8},${cy - fh * 0.18 + f * fh * 0.52} L${cx - fw * 1.38},${cy - fh * 0.32 + f * fh * 0.52}`} stroke={NEON} strokeWidth="1.5" strokeLinecap="round" opacity="0.52" />
      ))}
      {/* Finger lines right */}
      {[0.18, 0.38, 0.58].map((f, i) => (
        <path key={`fr-${i}`} d={`M${cx + fw * 0.8},${cy - fh * 0.18 + f * fh * 0.52} L${cx + fw * 1.38},${cy - fh * 0.32 + f * fh * 0.52}`} stroke={NEON} strokeWidth="1.5" strokeLinecap="round" opacity="0.52" />
      ))}
      {/* Thumb */}
      <path d={`M${cx - fw * 0.4},${cy - fh * 0.38} Q${cx - fw * 0.08},${cy - fh * 0.72} ${cx + fw * 0.4},${cy - fh * 0.38}`} fill="none" stroke={NEON} strokeWidth={SW} strokeLinecap="round" opacity="0.62" />
      {/* Connection sparks */}
      {[[-0.18,-0.55],[0.22,-0.58],[-0.05,-0.68]].map(([xo,yo],i) => (
        <circle key={`sp-${i}`} cx={cx + r * xo} cy={cy + r * yo} r={r * 0.02} fill={NEON} opacity="0.5" />
      ))}
    </>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function BgIllustration({
  type,
  width,
  height,
  scale = 1.0,
  offsetX = 0,
  offsetY = 0,
}: BgIllustrationProps) {
  const cx = width / 2 + offsetX;
  const cy = height / 2 + offsetY;
  const r = Math.min(width, height) * 0.38 * scale;

  function renderShape() {
    switch (type) {
      case "gear":       return <GearIllustration cx={cx} cy={cy} r={r} />;
      case "brain":      return <BrainIllustration cx={cx} cy={cy} r={r} />;
      case "nodes":      return <NodesIllustration cx={cx} cy={cy} r={r} />;
      case "chart":      return <ChartIllustration cx={cx} cy={cy} r={r} />;
      case "target":     return <TargetIllustration cx={cx} cy={cy} r={r} />;
      case "flow":       return <FlowIllustration cx={cx} cy={cy} r={r} />;
      case "circuit":    return <CircuitIllustration cx={cx} cy={cy} r={r} />;
      case "lightbulb":  return <LightbulbIllustration cx={cx} cy={cy} r={r} />;
      case "puzzle":     return <PuzzleIllustration cx={cx} cy={cy} r={r} />;
      case "cloud":      return <CloudIllustration cx={cx} cy={cy} r={r} />;
      case "rocket":     return <RocketIllustration cx={cx} cy={cy} r={r} />;
      case "calendar":   return <CalendarIllustration cx={cx} cy={cy} r={r} />;
      case "magnet":     return <MagnetIllustration cx={cx} cy={cy} r={r} />;
      case "handshake":  return <HandshakeIllustration cx={cx} cy={cy} r={r} />;
    }
  }

  return (
    <svg
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      opacity={0.12}
    >
      {renderShape()}
    </svg>
  );
}
