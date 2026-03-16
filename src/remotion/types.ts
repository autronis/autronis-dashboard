import { z } from "zod";

export const SceneSchema = z.object({
  tekst: z.array(z.string()),
  accentRegel: z.number().optional(),
  accentKleur: z.enum(["turquoise", "geel"]).default("turquoise"),
  icon: z.string().optional(),
  duur: z.number().default(3),
  isCta: z.boolean().optional(),
});

export const VideoSchema = z.object({
  scenes: z.array(SceneSchema),
});

export type Scene = z.infer<typeof SceneSchema>;
export type VideoProps = z.infer<typeof VideoSchema>;
