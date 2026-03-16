export type InzichtCategorie = "projectervaring" | "learning" | "tool_review" | "trend" | "tip";

export const INZICHT_CATEGORIE_LABELS: Record<InzichtCategorie, string> = {
  projectervaring: "Projectervaring",
  learning: "Technische learning",
  tool_review: "Tool review",
  trend: "Trend",
  tip: "Tip",
};

export const INZICHT_CATEGORIE_COLORS: Record<InzichtCategorie, { bg: string; text: string }> = {
  projectervaring: { bg: "bg-blue-500/10", text: "text-blue-400" },
  learning: { bg: "bg-purple-500/10", text: "text-purple-400" },
  tool_review: { bg: "bg-green-500/10", text: "text-green-400" },
  trend: { bg: "bg-orange-500/10", text: "text-orange-400" },
  tip: { bg: "bg-autronis-accent/10", text: "text-autronis-accent" },
};

export interface ProfielEntry {
  id: number;
  onderwerp: string;
  inhoud: string;
  bijgewerktOp: string;
}

export interface Inzicht {
  id: number;
  titel: string;
  inhoud: string;
  categorie: InzichtCategorie;
  klantId?: number;
  projectId?: number;
  klantNaam?: string;
  projectNaam?: string;
  isGebruikt: boolean;
  aangemaaktDoor: number;
  aangemaaktOp: string;
}

export type ContentPlatform = "linkedin" | "instagram";
export type ContentFormat = "post" | "caption" | "thought_leadership" | "tip" | "storytelling" | "how_to" | "vraag";
export type ContentStatus = "concept" | "goedgekeurd" | "bewerkt" | "afgewezen" | "gepubliceerd";

export interface ContentPost {
  id: number;
  titel: string;
  inhoud: string;
  platform: ContentPlatform;
  format: ContentFormat;
  status: ContentStatus;
  batchId?: string;
  batchWeek?: string;
  inzichtId?: number;
  bewerkteInhoud?: string;
  afwijsReden?: string;
  hashtags: string[];
  geplandOp?: string;
  gepubliceerdOp?: string;
  aangemaaktOp: string;
}
