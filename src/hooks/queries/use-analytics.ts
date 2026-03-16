import { useQuery } from "@tanstack/react-query";

interface MaandData {
  maand: string;
  label: string;
  omzet: number;
  uren: number;
}

interface ProjectData {
  projectNaam: string;
  klantNaam: string;
  uren: number;
  omzet: number;
}

interface GebruikerData {
  naam: string;
  uren: number;
  omzet: number;
}

interface AnalyticsData {
  kpis: {
    omzetDitJaar: number;
    omzetVorigJaar: number;
    urenDitJaar: number;
    gemiddeldUurtarief: number;
    actieveKlanten: number;
  };
  maanden: MaandData[];
  topProjecten: ProjectData[];
  perGebruiker: GebruikerData[];
}

interface HeatmapItem {
  datum: string;
  uren: number;
}

interface VergelijkGebruiker {
  id: number;
  naam: string;
  urenDezeMaand: number;
  omzetDezeMaand: number;
  takenAfgerond: number;
  actieveProjecten: number;
}

async function fetchAnalytics(jaar: number): Promise<AnalyticsData> {
  const res = await fetch(`/api/analytics?jaar=${jaar}`);
  if (!res.ok) throw new Error("Analytics laden mislukt");
  return res.json();
}

async function fetchHeatmap(): Promise<HeatmapItem[]> {
  const res = await fetch("/api/analytics/heatmap");
  if (!res.ok) return [];
  const json = (await res.json()) as { data: HeatmapItem[] };
  return json.data || [];
}

async function fetchVergelijk(): Promise<VergelijkGebruiker[]> {
  const res = await fetch("/api/analytics/vergelijk");
  if (!res.ok) return [];
  const json = (await res.json()) as { gebruikers: VergelijkGebruiker[] };
  return json.gebruikers || [];
}

export function useAnalytics(jaar: number) {
  return useQuery({
    queryKey: ["analytics", jaar],
    queryFn: () => fetchAnalytics(jaar),
    staleTime: 30_000,
  });
}

export function useHeatmap() {
  return useQuery({
    queryKey: ["analytics", "heatmap"],
    queryFn: fetchHeatmap,
    staleTime: 30_000,
  });
}

export function useVergelijk() {
  return useQuery({
    queryKey: ["analytics", "vergelijk"],
    queryFn: fetchVergelijk,
    staleTime: 30_000,
  });
}

export type { AnalyticsData, MaandData, ProjectData, GebruikerData, HeatmapItem, VergelijkGebruiker };
