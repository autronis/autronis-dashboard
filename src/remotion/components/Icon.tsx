import { interpolate } from "remotion";

interface IconProps {
  name: string;
  color: string;
  revealFrame: number;
  currentFrame: number;
}

type IconPath = {
  d?: string;
  paths?: string[];
  circle?: { cx: number; cy: number; r: number };
  lines?: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  rects?: Array<{ x: number; y: number; width: number; height: number; rx?: number }>;
  polyline?: string;
};

const ICON_PATHS: Record<string, IconPath[]> = {
  database: [
    { d: "M12 2C7.58 2 4 3.79 4 6s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4z" },
    { d: "M4 6v4c0 2.21 3.58 4 8 4s8-1.79 8-4V6" },
    { d: "M4 10v4c0 2.21 3.58 4 8 4s8-1.79 8-4v-4" },
    { d: "M4 14v4c0 2.21 3.58 4 8 4s8-1.79 8-4v-4" },
  ],
  flow: [
    { lines: [{ x1: 3, y1: 12, x2: 9, y2: 12 }] },
    { lines: [{ x1: 15, y1: 12, x2: 21, y2: 12 }] },
    { circle: { cx: 12, cy: 12, r: 3 } },
    { lines: [{ x1: 9, y1: 6, x2: 9, y2: 18 }] },
    { lines: [{ x1: 15, y1: 6, x2: 15, y2: 18 }] },
  ],
  sync: [
    { d: "M23 4v6h-6" },
    { d: "M1 20v-6h6" },
    { d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" },
  ],
  shield: [
    { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
    { lines: [{ x1: 9, y1: 12, x2: 11, y2: 14 }] },
    { lines: [{ x1: 11, y1: 14, x2: 15, y2: 10 }] },
  ],
  deal: [
    { lines: [{ x1: 2, y1: 12, x2: 22, y2: 12 }] },
    { d: "M12 2l10 10-10 10L2 12z" },
  ],
  manual: [
    { rects: [{ x: 3, y: 3, width: 18, height: 18, rx: 2 }] },
    { lines: [{ x1: 8, y1: 9, x2: 16, y2: 9 }] },
    { lines: [{ x1: 8, y1: 13, x2: 16, y2: 13 }] },
    { lines: [{ x1: 8, y1: 17, x2: 12, y2: 17 }] },
  ],
  integration: [
    { circle: { cx: 18, cy: 6, r: 3 } },
    { circle: { cx: 6, cy: 18, r: 3 } },
    { lines: [{ x1: 18, y1: 9, x2: 6, y2: 15 }] },
    { circle: { cx: 18, cy: 18, r: 3 } },
    { lines: [{ x1: 18, y1: 9, x2: 18, y2: 15 }] },
    { lines: [{ x1: 6, y1: 9, x2: 6, y2: 15 }] },
    { circle: { cx: 6, cy: 6, r: 3 } },
  ],
  data: [
    { lines: [{ x1: 12, y1: 20, x2: 12, y2: 10 }] },
    { lines: [{ x1: 18, y1: 20, x2: 18, y2: 4 }] },
    { lines: [{ x1: 6, y1: 20, x2: 6, y2: 16 }] },
  ],
};

export const Icon: React.FC<IconProps> = ({
  name,
  color,
  revealFrame,
  currentFrame,
}) => {
  const relFrame = currentFrame - revealFrame;
  const opacity = interpolate(relFrame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const paths = ICON_PATHS[name] ?? ICON_PATHS["data"];

  return (
    <div
      style={{
        position: "absolute",
        bottom: 120,
        left: 56,
        opacity,
      }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths.map((p, i) => {
          if (p.d) return <path key={i} d={p.d} />;
          if (p.circle)
            return <circle key={i} cx={p.circle.cx} cy={p.circle.cy} r={p.circle.r} />;
          if (p.lines)
            return p.lines.map((l, j) => (
              <line
                key={`${i}-${j}`}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
              />
            ));
          if (p.rects)
            return p.rects.map((r, j) => (
              <rect
                key={`${i}-${j}`}
                x={r.x}
                y={r.y}
                width={r.width}
                height={r.height}
                rx={r.rx}
              />
            ));
          return null;
        })}
      </svg>
    </div>
  );
};
