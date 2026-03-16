import { interpolate } from "remotion";
import { Scene } from "../types";
import { Icon } from "./Icon";

const CHARS_PER_FRAME = 2;
const LINE_START_DELAY = 8; // frames of pause between lines

const ACCENT_COLORS: Record<string, string> = {
  turquoise: "#23C6B7",
  geel: "#F4C533",
};

interface SceneContentProps {
  scene: Scene;
  frame: number; // frame relative to this scene start
}

function getLineRevealFrames(tekst: string[]): number[] {
  const starts: number[] = [];
  let cursor = 0;
  for (let i = 0; i < tekst.length; i++) {
    starts.push(cursor);
    cursor += Math.ceil(tekst[i].length / CHARS_PER_FRAME) + LINE_START_DELAY;
  }
  return starts;
}

function getRevealedText(text: string, frame: number, startFrame: number): string {
  const elapsed = frame - startFrame;
  if (elapsed < 0) return "";
  const charsVisible = Math.floor(elapsed * CHARS_PER_FRAME);
  return text.slice(0, charsVisible);
}

export const SceneContent: React.FC<SceneContentProps> = ({ scene, frame }) => {
  const { tekst, accentRegel, accentKleur = "turquoise", icon, isCta } = scene;
  const accentColor = ACCENT_COLORS[accentKleur];
  const lineStarts = getLineRevealFrames(tekst);

  // The icon fades in after all text is done
  const lastLineStart = lineStarts[tekst.length - 1] ?? 0;
  const lastLine = tekst[tekst.length - 1] ?? "";
  const iconRevealFrame =
    lastLineStart + Math.ceil(lastLine.length / CHARS_PER_FRAME) + LINE_START_DELAY;

  const containerOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 1080,
        height: 1080,
        opacity: containerOpacity,
      }}
    >
      {/* Text block — left-aligned, vertically centered */}
      <div
        style={{
          position: "absolute",
          top: isCta ? 380 : 340,
          left: 56,
          right: 56,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {tekst.map((line, i) => {
          const isAccent = i === accentRegel;
          const revealed = getRevealedText(line, frame, lineStarts[i]);
          const isLastLine = i === tekst.length - 1;

          // Last line or accent line gets larger
          const fontSize = isAccent || isLastLine ? 62 : 52;
          const color = isAccent ? accentColor : "#F3F5F7";
          const fontWeight = isAccent ? 700 : 600;

          // CTA scene: emphasize last line differently
          const lineStyle: React.CSSProperties = {
            display: "block",
            fontSize,
            fontWeight,
            color,
            lineHeight: 1.22,
            marginBottom: i < tekst.length - 1 ? 10 : 0,
            letterSpacing: isAccent ? "0.01em" : "-0.01em",
            minHeight: fontSize * 1.22,
          };

          return (
            <span key={i} style={lineStyle}>
              {revealed}
              {/* Blinking cursor on actively typing line */}
              {revealed.length < line.length && revealed.length > 0 && (
                <span
                  style={{
                    display: "inline-block",
                    width: 3,
                    height: fontSize * 0.85,
                    backgroundColor: accentColor,
                    marginLeft: 3,
                    verticalAlign: "middle",
                    opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
                  }}
                />
              )}
            </span>
          );
        })}

        {/* CTA underline accent */}
        {isCta && (
          <div
            style={{
              marginTop: 28,
              width: interpolate(
                frame,
                [iconRevealFrame, iconRevealFrame + 20],
                [0, 220],
                { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
              ),
              height: 3,
              backgroundColor: accentColor,
              borderRadius: 2,
            }}
          />
        )}
      </div>

      {/* Icon */}
      {icon && (
        <Icon
          name={icon}
          color={accentColor}
          revealFrame={iconRevealFrame}
          currentFrame={frame}
        />
      )}
    </div>
  );
};
