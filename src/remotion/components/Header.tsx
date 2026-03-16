import { interpolate, useCurrentFrame } from "remotion";

export const Header: React.FC = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 48,
        left: 56,
        display: "flex",
        alignItems: "center",
        gap: 10,
        opacity,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Minimal logo mark — geometric A shape */}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <polygon
          points="12,2 22,20 2,20"
          stroke="#23C6B7"
          strokeWidth="2"
          fill="none"
          strokeLinejoin="round"
        />
        <line
          x1="7"
          y1="14"
          x2="17"
          y2="14"
          stroke="#23C6B7"
          strokeWidth="2"
        />
      </svg>

      <span
        style={{
          color: "#F3F5F7",
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "0.04em",
        }}
      >
        Autronis
      </span>
    </div>
  );
};
