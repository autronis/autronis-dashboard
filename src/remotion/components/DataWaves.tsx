import { useCurrentFrame } from "remotion";

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1080;

interface WaveConfig {
  amplitude: number;
  frequency: number;
  phaseOffset: number;
  yBase: number;
  opacity: number;
}

const WAVES: WaveConfig[] = [
  { amplitude: 18, frequency: 0.0032, phaseOffset: 0, yBase: 0.28, opacity: 0.14 },
  { amplitude: 22, frequency: 0.0045, phaseOffset: 2.1, yBase: 0.52, opacity: 0.18 },
  { amplitude: 15, frequency: 0.0038, phaseOffset: 4.4, yBase: 0.76, opacity: 0.12 },
];

function buildWavePath(
  frame: number,
  wave: WaveConfig,
  width: number,
  height: number
): string {
  const yBase = wave.yBase * height;
  const speed = 0.04;
  const points: string[] = [];
  const step = 8;

  for (let x = 0; x <= width; x += step) {
    const phase = x * wave.frequency + frame * speed + wave.phaseOffset;
    const y = yBase + Math.sin(phase) * wave.amplitude;
    if (x === 0) {
      points.push(`M ${x} ${y}`);
    } else {
      points.push(`L ${x} ${y}`);
    }
  }

  return points.join(" ");
}

export const DataWaves: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        pointerEvents: "none",
      }}
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
    >
      {WAVES.map((wave, i) => (
        <path
          key={i}
          d={buildWavePath(frame, wave, CANVAS_WIDTH, CANVAS_HEIGHT)}
          stroke="#23C6B7"
          strokeWidth={1.5}
          fill="none"
          opacity={wave.opacity}
        />
      ))}
    </svg>
  );
};
