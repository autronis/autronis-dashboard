import { Composition } from "remotion";
import { AutronisVideo } from "./AutronisVideo";
import { VideoSchema } from "./types";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AutronisVideo"
      component={AutronisVideo}
      durationInFrames={1350}
      fps={30}
      width={1080}
      height={1080}
      schema={VideoSchema}
      defaultProps={{
        scenes: [
          {
            tekst: [
              "Data wordt overgetypt.",
              "Updates lopen achter.",
              "Overzicht verdwijnt.",
            ],
            accentRegel: 2,
            accentKleur: "geel" as const,
            icon: "database",
            duur: 4,
          },
          {
            tekst: ["System integrations", "verbinden die stappen."],
            accentRegel: 1,
            accentKleur: "turquoise" as const,
            icon: "flow",
            duur: 3,
          },
          {
            tekst: ["Breng structuur", "in je data flows."],
            accentRegel: 1,
            accentKleur: "turquoise" as const,
            icon: "shield",
            duur: 4,
            isCta: true,
          },
        ],
      }}
    />
  );
};
