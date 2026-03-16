import { useQuery } from "@tanstack/react-query";

interface Klant {
  id: number;
  bedrijfsnaam: string;
  contactpersoon: string | null;
  email: string | null;
  telefoon: string | null;
  adres: string | null;
  uurtarief: number | null;
  notities: string | null;
}

interface Project {
  id: number;
  naam: string;
  omschrijving: string | null;
  status: string;
  voortgangPercentage: number | null;
  werkelijkeMinuten: number;
  geschatteUren: number | null;
  deadline: string | null;
  isActief: number;
}

interface Notitie {
  id: number;
  inhoud: string;
  type: string;
  aangemaaktOp: string;
}

interface DocumentItem {
  id: number;
  naam: string;
  url: string | null;
  type: string;
  aangemaaktOp: string;
}

interface Tijdregistratie {
  id: number;
  omschrijving: string;
  projectNaam: string | null;
  startTijd: string;
  duurMinuten: number;
  categorie: string | null;
}

interface KlantData {
  klant: Klant;
  projecten: Project[];
  notities: Notitie[];
  documenten: DocumentItem[];
  recenteTijdregistraties: Tijdregistratie[];
  kpis: {
    aantalProjecten: number;
    totaalMinuten: number;
    omzet: number;
    uurtarief: number;
  };
}

async function fetchKlantDetail(id: number): Promise<KlantData> {
  const res = await fetch(`/api/klanten/${id}`);
  if (res.status === 404) throw new NotFoundError();
  if (!res.ok) throw new Error("Fout bij ophalen klantgegevens");
  return res.json();
}

export class NotFoundError extends Error {
  constructor() {
    super("Klant niet gevonden");
    this.name = "NotFoundError";
  }
}

export function useKlantDetail(id: number) {
  return useQuery({
    queryKey: ["klant", id],
    queryFn: () => fetchKlantDetail(id),
    staleTime: 30_000,
    enabled: id > 0,
  });
}

export type { KlantData, Klant, Project, Notitie, DocumentItem, Tijdregistratie };
