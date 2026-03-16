interface FlowLinesProps {
  width: number;
  height: number;
}

export function FlowLines({ width, height }: FlowLinesProps) {
  const h = height;
  const w = width;

  // 11 wave lines — varying thickness, opacity, and curve depth for organic depth
  const lines = [
    { y: h * 0.06, amp: h * 0.055, freq: 1.1, sw: 1.5, op: 0.06 },
    { y: h * 0.15, amp: h * 0.07,  freq: 0.9, sw: 2.5, op: 0.10 },
    { y: h * 0.24, amp: h * 0.045, freq: 1.3, sw: 1.5, op: 0.05 },
    { y: h * 0.34, amp: h * 0.08,  freq: 1.0, sw: 3.0, op: 0.11 },
    { y: h * 0.43, amp: h * 0.06,  freq: 1.2, sw: 2.0, op: 0.08 },
    { y: h * 0.52, amp: h * 0.09,  freq: 0.85,sw: 2.5, op: 0.12 },
    { y: h * 0.61, amp: h * 0.05,  freq: 1.35,sw: 1.5, op: 0.06 },
    { y: h * 0.70, amp: h * 0.075, freq: 1.05,sw: 3.0, op: 0.10 },
    { y: h * 0.79, amp: h * 0.055, freq: 0.95,sw: 2.0, op: 0.07 },
    { y: h * 0.88, amp: h * 0.065, freq: 1.15,sw: 2.5, op: 0.09 },
    { y: h * 0.96, amp: h * 0.04,  freq: 1.25,sw: 1.5, op: 0.05 },
  ];

  function buildPath(y: number, amp: number, freq: number): string {
    // 5 cubic bezier segments spanning the full width with organic crossing curves
    const segments = 5;
    const segW = w / segments;
    // Offset starting y slightly per-freq to break symmetry
    const startY = y + amp * 0.15 * freq;
    let d = `M0,${startY}`;

    for (let i = 0; i < segments; i++) {
      const x1 = (i + 1) * segW;
      const cp1x = i * segW + segW * 0.25;
      const cp2x = i * segW + segW * 0.75;
      const sign = i % 2 === 0 ? 1 : -1;
      // Vary the end Y slightly to create crossing behaviour over the full height
      const endY = y + sign * amp * 0.12 * freq;
      const cp1y = y + amp * sign * freq;
      const cp2y = y - amp * sign * freq * 0.8;
      d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${x1},${endY}`;
    }

    return d;
  }

  return (
    <svg
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
    >
      {lines.map((line, i) => (
        <path
          key={i}
          d={buildPath(line.y, line.amp, line.freq)}
          fill="none"
          stroke="#2DD4A8"
          strokeWidth={line.sw}
          opacity={line.op}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
