import { interpolate, useCurrentFrame } from "remotion";

export const Footer: React.FC = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 44,
        left: 0,
        right: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        opacity,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Minimal logo mark */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <polygon
          points="12,2 22,20 2,20"
          stroke="#8B98A3"
          strokeWidth="2"
          fill="none"
          strokeLinejoin="round"
        />
        <line
          x1="7"
          y1="14"
          x2="17"
          y2="14"
          stroke="#8B98A3"
          strokeWidth="2"
        />
      </svg>

      <span style={{ color: "#8B98A3", fontSize: 14, letterSpacing: "0.02em" }}>
        autronis.nl ·{" "}
        <span style={{ fontStyle: "italic" }}>
          Brengt structuur in je groei.
        </span>
      </span>
    </div>
  );
};
