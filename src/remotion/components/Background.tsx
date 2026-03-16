import { DataWaves } from "./DataWaves";

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1080;

export const Background: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: "#061217",
        overflow: "hidden",
      }}
    >
      {/* Turquoise radial glow top-left */}
      <div
        style={{
          position: "absolute",
          top: -120,
          left: -120,
          width: 560,
          height: 560,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(35,198,183,0.09) 0%, rgba(35,198,183,0.03) 50%, transparent 75%)",
          pointerEvents: "none",
        }}
      />

      {/* Subtle bottom-right glow for depth */}
      <div
        style={{
          position: "absolute",
          bottom: -80,
          right: -80,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(35,198,183,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <DataWaves />
    </div>
  );
};
