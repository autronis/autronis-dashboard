// ============ ENUM TYPES ============

export type ThemaVoorkeur = "donker" | "licht";

export type GebruikerRol = "admin" | "gebruiker";

export type ProjectStatus = "actief" | "afgerond" | "on-hold";

export type FactuurStatus = "concept" | "verzonden" | "betaald" | "te_laat";

export type LeadStatus = "nieuw" | "contact" | "offerte" | "gewonnen" | "verloren";

export type TaakStatus = "open" | "bezig" | "afgerond";

export type Prioriteit = "laag" | "normaal" | "hoog";

export type TijdCategorie = "development" | "meeting" | "administratie" | "overig";

// ============ INTERFACES ============

export interface SessionGebruiker {
  id: number;
  naam: string;
  email: string;
  rol: GebruikerRol;
  themaVoorkeur: ThemaVoorkeur;
  uurtariefStandaard?: number | null;
}
