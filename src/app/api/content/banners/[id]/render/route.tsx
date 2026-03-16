import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { contentBanners } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import type { BannerFormaat, BannerIcon, BannerIllustration } from "@/types/content";
import { BANNER_FORMAAT_SIZES } from "@/types/content";

async function getLogoBase64(): Promise<string> {
  try {
    const logoBuffer = await readFile(join(process.cwd(), "public", "logo.png"));
    return `data:image/png;base64,${logoBuffer.toString("base64")}`;
  } catch {
    return "";
  }
}

const BG = "#0B1A1F";
const NEON = "#2DD4A8";
const WHITE = "#F3F5F7";
const GRAY = "#8B98A3";
const FONT = "Inter, sans-serif";

// ─── Simplified OG-safe icon ────────────────────────────────────────────────
function OgIcon({ icon, size }: { icon: BannerIcon; size: number }) {
  const s = size;
  const sw = "2";

  switch (icon) {
    case "cog":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" stroke={NEON} strokeWidth={sw} />
          <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={NEON} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "brain":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" stroke={NEON} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" stroke={NEON} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "bar-chart":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="12" width="4" height="9" rx="1" stroke={NEON} strokeWidth={sw} />
          <rect x="10" y="7" width="4" height="14" rx="1" stroke={NEON} strokeWidth={sw} />
          <rect x="17" y="3" width="4" height="18" rx="1" stroke={NEON} strokeWidth={sw} />
        </svg>
      );
    case "link":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke={NEON} strokeWidth={sw} strokeLinecap="round" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke={NEON} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "lightbulb":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M9 21h6M12 3a6 6 0 0 1 6 6c0 2.22-1.2 4.16-3 5.2V17H9v-2.8A6 6 0 0 1 6 9a6 6 0 0 1 6-6z" stroke={NEON} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "target":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke={NEON} strokeWidth={sw} />
          <circle cx="12" cy="12" r="6" stroke={NEON} strokeWidth={sw} />
          <circle cx="12" cy="12" r="2" stroke={NEON} strokeWidth={sw} />
        </svg>
      );
    case "git-branch":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <line x1="6" y1="3" x2="6" y2="15" stroke={NEON} strokeWidth={sw} strokeLinecap="round" />
          <circle cx="18" cy="6" r="3" stroke={NEON} strokeWidth={sw} />
          <circle cx="6" cy="18" r="3" stroke={NEON} strokeWidth={sw} />
          <path d="M18 9a9 9 0 0 1-9 9" stroke={NEON} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "zap":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke={NEON} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      );
    case "plug":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M12 22V12M5 12H2a10 10 0 0 0 20 0h-3" stroke={NEON} strokeWidth={sw} strokeLinecap="round" />
          <rect x="7" y="2" width="3" height="5" rx="1" stroke={NEON} strokeWidth={sw} />
          <rect x="14" y="2" width="3" height="5" rx="1" stroke={NEON} strokeWidth={sw} />
          <path d="M7 7v2a5 5 0 0 0 10 0V7" stroke={NEON} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "users":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={NEON} strokeWidth={sw} strokeLinecap="round" />
          <circle cx="9" cy="7" r="4" stroke={NEON} strokeWidth={sw} />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={NEON} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "euro":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M4 10h12M4 14h12" stroke={NEON} strokeWidth={sw} strokeLinecap="round" />
          <path d="M19.5 7.5A7 7 0 1 0 19.5 16.5" stroke={NEON} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "shield":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={NEON} strokeWidth={sw} strokeLinejoin="round" />
        </svg>
      );
    case "database":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <ellipse cx="12" cy="5" rx="9" ry="3" stroke={NEON} strokeWidth={sw} />
          <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" stroke={NEON} strokeWidth={sw} strokeLinecap="round" />
          <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" stroke={NEON} strokeWidth={sw} />
        </svg>
      );
    case "mail":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect x="2" y="4" width="20" height="16" rx="2" stroke={NEON} strokeWidth={sw} />
          <path d="M2 7l10 7 10-7" stroke={NEON} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "globe":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke={NEON} strokeWidth={sw} />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke={NEON} strokeWidth={sw} />
        </svg>
      );
    case "rocket":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2L4.5 16.5z" stroke={NEON} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" stroke={NEON} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" stroke={NEON} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "clock":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke={NEON} strokeWidth={sw} />
          <polyline points="12 6 12 12 16 14" stroke={NEON} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "layers":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <polygon points="12 2 2 7 12 12 22 7 12 2" stroke={NEON} strokeWidth={sw} strokeLinejoin="round" />
          <polyline points="2 17 12 22 22 17" stroke={NEON} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="2 12 12 17 22 12" stroke={NEON} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "trending-up":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke={NEON} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="17 6 23 6 23 12" stroke={NEON} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "cpu":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect x="9" y="9" width="6" height="6" stroke={NEON} strokeWidth={sw} />
          <rect x="4" y="4" width="16" height="16" rx="2" stroke={NEON} strokeWidth={sw} />
          <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" stroke={NEON} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "cloud":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" stroke={NEON} strokeWidth={sw} strokeLinejoin="round" />
        </svg>
      );
    case "calendar":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke={NEON} strokeWidth={sw} />
          <line x1="16" y1="2" x2="16" y2="6" stroke={NEON} strokeWidth={sw} strokeLinecap="round" />
          <line x1="8" y1="2" x2="8" y2="6" stroke={NEON} strokeWidth={sw} strokeLinecap="round" />
          <line x1="3" y1="10" x2="21" y2="10" stroke={NEON} strokeWidth={sw} />
        </svg>
      );
    case "key":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <circle cx="7.5" cy="15.5" r="5.5" stroke={NEON} strokeWidth={sw} />
          <path d="M21 2l-9.6 9.6M15.5 7.5l3 3L21 8l-3-3" stroke={NEON} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "heart":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke={NEON} strokeWidth={sw} strokeLinejoin="round" />
        </svg>
      );
  }
}

// ─── OG-safe simplified illustration ────────────────────────────────────────
function OgIllustration({ type, width, height }: { type: BannerIllustration; width: number; height: number }) {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.38;

  function renderLines() {
    switch (type) {
      case "gear":
        return (
          <>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={NEON} strokeWidth="2" />
            <circle cx={cx} cy={cy} r={r * 0.55} fill="none" stroke={NEON} strokeWidth="2" />
            <circle cx={cx} cy={cy} r={r * 0.22} fill="none" stroke={NEON} strokeWidth="2" />
            {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              return <line key={i} x1={cx + Math.cos(rad) * r} y1={cy + Math.sin(rad) * r} x2={cx + Math.cos(rad) * (r * 1.22)} y2={cy + Math.sin(rad) * (r * 1.22)} stroke={NEON} strokeWidth="6" strokeLinecap="round" />;
            })}
          </>
        );
      case "brain":
        return (
          <>
            <ellipse cx={cx - r * 0.22} cy={cy} rx={r * 0.52} ry={r * 0.62} fill="none" stroke={NEON} strokeWidth="2" />
            <ellipse cx={cx + r * 0.22} cy={cy} rx={r * 0.52} ry={r * 0.62} fill="none" stroke={NEON} strokeWidth="2" />
            {[[cx-r*0.5,cy-r*0.2],[cx,cy-r*0.4],[cx+r*0.5,cy-r*0.2],[cx-r*0.5,cy+r*0.2],[cx,cy+r*0.4],[cx+r*0.5,cy+r*0.2]].map(([x,y], i) => (
              <circle key={i} cx={x} cy={y} r={r*0.06} fill={NEON} />
            ))}
          </>
        );
      case "chart":
        return (
          <>
            <line x1={cx-r} y1={cy+r*0.6} x2={cx+r} y2={cy+r*0.6} stroke={NEON} strokeWidth="2" />
            <line x1={cx-r} y1={cy-r*0.5} x2={cx-r} y2={cy+r*0.6} stroke={NEON} strokeWidth="2" />
            <path d={`M${cx-r*0.7},${cy+r*0.3} L${cx-r*0.3},${cy} L${cx+r*0.1},${cy-r*0.3} L${cx+r*0.7},${cy-r*0.9}`} fill="none" stroke={NEON} strokeWidth="2.5" strokeLinejoin="round" />
          </>
        );
      case "nodes":
        return (
          <>
            {[[cx,cy],[cx-r*0.6,cy-r*0.4],[cx+r*0.6,cy-r*0.4],[cx-r*0.6,cy+r*0.4],[cx+r*0.6,cy+r*0.4]].map(([x,y],i) => (
              <circle key={i} cx={x} cy={y} r={i===0?r*0.12:r*0.08} fill="none" stroke={NEON} strokeWidth="2" />
            ))}
            {[[0,1],[0,2],[0,3],[0,4],[1,3],[2,4]].map(([a,b],i) => {
              const pts = [[cx,cy],[cx-r*0.6,cy-r*0.4],[cx+r*0.6,cy-r*0.4],[cx-r*0.6,cy+r*0.4],[cx+r*0.6,cy+r*0.4]];
              return <line key={i} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} stroke={NEON} strokeWidth="1.5" />;
            })}
          </>
        );
      case "target":
        return (
          <>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={NEON} strokeWidth="2" />
            <circle cx={cx} cy={cy} r={r*0.65} fill="none" stroke={NEON} strokeWidth="2" />
            <circle cx={cx} cy={cy} r={r*0.32} fill="none" stroke={NEON} strokeWidth="2" />
          </>
        );
      case "puzzle":
        return (
          <>
            {[
              { x: cx - r * 0.5, y: cy - r * 0.5 },
              { x: cx,           y: cy - r * 0.5 },
              { x: cx - r * 0.5, y: cy            },
              { x: cx,           y: cy            },
            ].map((p, i) => (
              <rect key={i} x={p.x} y={p.y} width={r * 0.46} height={r * 0.46} rx={r * 0.05} fill="none" stroke={NEON} strokeWidth="2" opacity="0.7" />
            ))}
            <circle cx={cx} cy={cy - r * 0.27} r={r * 0.09} fill="none" stroke={NEON} strokeWidth="2" opacity="0.6" />
            <circle cx={cx - r * 0.27} cy={cy} r={r * 0.09} fill="none" stroke={NEON} strokeWidth="2" opacity="0.6" />
          </>
        );
      case "rocket":
        return (
          <>
            <path d={`M${cx},${cy - r * 0.9} Q${cx + r * 0.35},${cy - r * 0.3} ${cx + r * 0.35},${cy + r * 0.2} L${cx - r * 0.35},${cy + r * 0.2} Q${cx - r * 0.35},${cy - r * 0.3} ${cx},${cy - r * 0.9}`} fill="none" stroke={NEON} strokeWidth="2" opacity="0.7" />
            <circle cx={cx} cy={cy - r * 0.2} r={r * 0.16} fill="none" stroke={NEON} strokeWidth="2" opacity="0.8" />
            <path d={`M${cx - r * 0.35},${cy + r * 0.1} L${cx - r * 0.6},${cy + r * 0.4} L${cx - r * 0.35},${cy + r * 0.4}`} fill="none" stroke={NEON} strokeWidth="2" opacity="0.6" />
            <path d={`M${cx + r * 0.35},${cy + r * 0.1} L${cx + r * 0.6},${cy + r * 0.4} L${cx + r * 0.35},${cy + r * 0.4}`} fill="none" stroke={NEON} strokeWidth="2" opacity="0.6" />
          </>
        );
      case "calendar":
        return (
          <>
            <rect x={cx - r * 0.7} y={cy - r * 0.6} width={r * 1.4} height={r * 1.2} rx={r * 0.07} fill="none" stroke={NEON} strokeWidth="2" opacity="0.6" />
            <line x1={cx - r * 0.7} y1={cy - r * 0.3} x2={cx + r * 0.7} y2={cy - r * 0.3} stroke={NEON} strokeWidth="2" opacity="0.5" />
            {[-0.35, 0, 0.35].map((xo, i) =>
              [-0.05, 0.25].map((yo, j) => (
                <rect key={`${i}-${j}`} x={cx + xo * r - r * 0.12} y={cy + yo * r} width={r * 0.22} height={r * 0.2} rx={r * 0.03} fill="none" stroke={NEON} strokeWidth="1.5" opacity="0.4" />
              ))
            )}
          </>
        );
      case "cloud":
        return (
          <>
            <ellipse cx={cx} cy={cy} rx={r * 0.8} ry={r * 0.42} fill="none" stroke={NEON} strokeWidth="2" opacity="0.6" />
            <circle cx={cx - r * 0.35} cy={cy - r * 0.28} r={r * 0.3} fill="none" stroke={NEON} strokeWidth="2" opacity="0.6" />
            <circle cx={cx + r * 0.2} cy={cy - r * 0.38} r={r * 0.35} fill="none" stroke={NEON} strokeWidth="2" opacity="0.6" />
            {[-0.3, 0, 0.3].map((xo, i) => (
              <line key={i} x1={cx + xo * r} y1={cy + r * 0.45} x2={cx + xo * r} y2={cy + r * 0.75} stroke={NEON} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
            ))}
          </>
        );
      case "magnet":
        return (
          <>
            <path d={`M${cx - r * 0.55},${cy - r * 0.7} L${cx - r * 0.55},${cy + r * 0.1} A${r * 0.2},${r * 0.2} 0 0 0 ${cx - r * 0.15},${cy + r * 0.1} L${cx - r * 0.15},${cy - r * 0.7}`} fill="none" stroke={NEON} strokeWidth="3" strokeLinejoin="round" opacity="0.7" />
            <path d={`M${cx + r * 0.15},${cy - r * 0.7} L${cx + r * 0.15},${cy + r * 0.1} A${r * 0.2},${r * 0.2} 0 0 0 ${cx + r * 0.55},${cy + r * 0.1} L${cx + r * 0.55},${cy - r * 0.7}`} fill="none" stroke={NEON} strokeWidth="3" strokeLinejoin="round" opacity="0.7" />
            <rect x={cx - r * 0.55} y={cy - r * 0.9} width={r * 1.1} height={r * 0.22} rx={r * 0.05} fill="none" stroke={NEON} strokeWidth="2" opacity="0.8" />
          </>
        );
      case "handshake":
        return (
          <>
            <line x1={cx - r * 0.8} y1={cy + r * 0.1} x2={cx - r * 0.1} y2={cy - r * 0.1} stroke={NEON} strokeWidth="6" strokeLinecap="round" opacity="0.4" />
            <line x1={cx + r * 0.8} y1={cy + r * 0.1} x2={cx + r * 0.1} y2={cy - r * 0.1} stroke={NEON} strokeWidth="6" strokeLinecap="round" opacity="0.4" />
            <ellipse cx={cx} cy={cy} rx={r * 0.22} ry={r * 0.3} fill="none" stroke={NEON} strokeWidth="2" opacity="0.8" />
          </>
        );
      default:
        // flow / circuit / lightbulb — use parallel angled lines
        return (
          <>
            {[0.2,0.35,0.5,0.65,0.8].map((f, i) => (
              <line key={i} x1={cx - r * 1.1} y1={cy - r * 0.8 + height * f * 0.5} x2={cx + r * 1.1} y2={cy - r * 0.8 + height * f * 0.5 + r * 0.15} stroke={NEON} strokeWidth="1.5" />
            ))}
          </>
        );
    }
  }

  return (
    <svg
      style={{ position: "absolute", top: 0, left: 0 }}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      opacity={0.10}
    >
      {renderLines()}
    </svg>
  );
}

// ─── OG-safe flow lines ───────────────────────────────────────────────────────
function OgFlowLines({ width, height }: { width: number; height: number }) {
  const w = width;
  const h = height;
  return (
    <svg style={{ position: "absolute", top: 0, left: 0 }} width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={`M0,${h*0.06} C${w*0.2},${h*0.01} ${w*0.5},${h*0.11} ${w*0.75},${h*0.04} S${w},${h*0.08} ${w},${h*0.06}`} fill="none" stroke={NEON} strokeWidth="1.5" opacity="0.06" />
      <path d={`M0,${h*0.15} C${w*0.25},${h*0.08} ${w*0.5},${h*0.22} ${w*0.72},${h*0.12} S${w},${h*0.17} ${w},${h*0.15}`} fill="none" stroke={NEON} strokeWidth="2.5" opacity="0.10" />
      <path d={`M0,${h*0.24} C${w*0.2},${h*0.18} ${w*0.45},${h*0.30} ${w*0.65},${h*0.21} S${w*0.88},${h*0.26} ${w},${h*0.24}`} fill="none" stroke={NEON} strokeWidth="1.5" opacity="0.05" />
      <path d={`M0,${h*0.34} C${w*0.3},${h*0.26} ${w*0.55},${h*0.42} ${w*0.75},${h*0.31} S${w},${h*0.36} ${w},${h*0.34}`} fill="none" stroke={NEON} strokeWidth="3.0" opacity="0.11" />
      <path d={`M0,${h*0.43} C${w*0.22},${h*0.37} ${w*0.48},${h*0.49} ${w*0.7},${h*0.40} S${w},${h*0.45} ${w},${h*0.43}`} fill="none" stroke={NEON} strokeWidth="2.0" opacity="0.08" />
      <path d={`M0,${h*0.52} C${w*0.28},${h*0.43} ${w*0.52},${h*0.61} ${w*0.74},${h*0.50} S${w},${h*0.55} ${w},${h*0.52}`} fill="none" stroke={NEON} strokeWidth="2.5" opacity="0.12" />
      <path d={`M0,${h*0.61} C${w*0.18},${h*0.55} ${w*0.42},${h*0.67} ${w*0.62},${h*0.59} S${w*0.86},${h*0.63} ${w},${h*0.61}`} fill="none" stroke={NEON} strokeWidth="1.5" opacity="0.06" />
      <path d={`M0,${h*0.70} C${w*0.25},${h*0.63} ${w*0.5},${h*0.77} ${w*0.72},${h*0.68} S${w},${h*0.72} ${w},${h*0.70}`} fill="none" stroke={NEON} strokeWidth="3.0" opacity="0.10" />
      <path d={`M0,${h*0.79} C${w*0.2},${h*0.73} ${w*0.45},${h*0.85} ${w*0.68},${h*0.77} S${w},${h*0.81} ${w},${h*0.79}`} fill="none" stroke={NEON} strokeWidth="2.0" opacity="0.07" />
      <path d={`M0,${h*0.88} C${w*0.22},${h*0.82} ${w*0.48},${h*0.94} ${w*0.7},${h*0.86} S${w},${h*0.90} ${w},${h*0.88}`} fill="none" stroke={NEON} strokeWidth="2.5" opacity="0.09" />
      <path d={`M0,${h*0.96} C${w*0.18},${h*0.91} ${w*0.44},${h*1.00} ${w*0.66},${h*0.94} S${w},${h*0.97} ${w},${h*0.96}`} fill="none" stroke={NEON} strokeWidth="1.5" opacity="0.05" />
    </svg>
  );
}

// ─── Main OG banner layout ────────────────────────────────────────────────────
function OgBanner({
  onderwerp,
  icon,
  illustration,
  width,
  height,
  logoSrc,
}: {
  onderwerp: string;
  icon: BannerIcon;
  illustration: BannerIllustration;
  width: number;
  height: number;
  logoSrc: string;
}) {
  const scale = width / 1080;
  const iconSize = Math.round(44 * scale);
  const fontSize = Math.min(Math.round(40 * scale), Math.round(height * 0.04));
  const paddingV = Math.round(24 * scale);
  const paddingH = Math.round(48 * scale);
  const capsuleGap = Math.round(18 * scale);

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        background: BG,
        display: "flex",
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      {/* Flow lines */}
      <OgFlowLines width={width} height={height} />

      {/* Illustration */}
      <OgIllustration type={illustration} width={width} height={height} />

      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: Math.round(width * 0.9),
          height: Math.round(height * 0.55),
          background: "radial-gradient(ellipse at center, rgba(45,212,168,0.18) 0%, rgba(45,212,168,0.06) 40%, transparent 70%)",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: Math.round(36 * scale),
          left: Math.round(44 * scale),
          display: "flex",
          alignItems: "center",
          gap: Math.round(10 * scale),
        }}
      >
        {logoSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} width={Math.round(40 * scale)} height={Math.round(40 * scale)} style={{ objectFit: "contain" }} alt="Autronis" />
        )}
        <div
          style={{
            fontFamily: FONT,
            fontSize: Math.round(18 * scale),
            fontWeight: 600,
            color: WHITE,
            letterSpacing: "0.02em",
            display: "flex",
          }}
        >
          Autronis
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: Math.round(32 * scale),
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: Math.round(8 * scale),
        }}
      >
        {logoSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} width={Math.round(24 * scale)} height={Math.round(24 * scale)} style={{ objectFit: "contain", opacity: 0.6 }} alt="Autronis" />
        )}
        <div
          style={{
            fontFamily: FONT,
            fontSize: Math.round(14 * scale),
            color: GRAY,
            letterSpacing: "0.02em",
            display: "flex",
          }}
        >
          autronis.nl · Brengt structuur in je groei. · zakelijk@autronis.com
        </div>
      </div>

      {/* Centered capsule */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          transform: "translateY(-50%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: capsuleGap,
            padding: `${paddingV}px ${paddingH}px`,
            borderRadius: "999px",
            border: `${Math.round(2 * scale)}px solid ${NEON}`,
            background: "rgba(45,212,168,0.08)",
            boxShadow: `0 0 ${Math.round(30 * scale)}px rgba(45,212,168,0.5), 0 0 ${Math.round(80 * scale)}px rgba(45,212,168,0.25), 0 0 ${Math.round(120 * scale)}px rgba(45,212,168,0.1)`,
          }}
        >
          <OgIcon icon={icon} size={iconSize} />
          <span
            style={{
              fontFamily: FONT,
              fontSize,
              fontWeight: 800,
              color: NEON,
              textShadow: `0 0 ${Math.round(10 * scale)}px rgba(45,212,168,0.5)`,
              letterSpacing: "0.01em",
              whiteSpace: "nowrap",
            }}
          >
            {onderwerp}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bannerId = parseInt(id, 10);

  try {
    await requireAuth();

    if (isNaN(bannerId)) {
      return NextResponse.json({ fout: "Ongeldig ID" }, { status: 400 });
    }

    const banner = await db
      .select()
      .from(contentBanners)
      .where(eq(contentBanners.id, bannerId))
      .get();

    if (!banner) {
      return NextResponse.json({ fout: "Banner niet gevonden" }, { status: 404 });
    }

    const parsed = JSON.parse(banner.data) as {
      onderwerp?: string;
      icon?: string;
      illustration?: string;
    };

    const onderwerp = parsed.onderwerp ?? "Autronis";
    const icon = (parsed.icon ?? "cog") as BannerIcon;
    const illustration = (parsed.illustration ?? "gear") as BannerIllustration;
    const formaat = (banner.formaat ?? "instagram") as BannerFormaat;
    const { width, height } = BANNER_FORMAAT_SIZES[formaat];

    const logoSrc = await getLogoBase64();

    const jsx = (
      <OgBanner
        onderwerp={onderwerp}
        icon={icon}
        illustration={illustration}
        width={width}
        height={height}
        logoSrc={logoSrc}
      />
    );

    const imageResponse = new ImageResponse(jsx, { width, height });
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileName = `banner-${bannerId}-${Date.now()}.png`;
    const publicDir = join(process.cwd(), "public", "banners");
    await mkdir(publicDir, { recursive: true });
    await writeFile(join(publicDir, fileName), buffer);

    const imagePath = `/banners/${fileName}`;

    await db
      .update(contentBanners)
      .set({ imagePath, status: "klaar" })
      .where(eq(contentBanners.id, bannerId));

    return NextResponse.json({ ok: true, imagePath });
  } catch (error) {
    if (!isNaN(bannerId)) {
      await db
        .update(contentBanners)
        .set({ status: "fout" })
        .where(eq(contentBanners.id, bannerId))
        .catch(() => undefined);
    }

    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Renderen mislukt" },
      { status: 500 }
    );
  }
}
