import { useQuery } from "@tanstack/react-query";

export interface Taak {
  id: number;
  titel: string;
  omschrijving: string | null;
  status: string;
  deadline: string | null;
  prioriteit: string;
  aangemaaktOp: string | null;
  projectId: number | null;
  projectNaam: string | null;
  klantNaam: string | null;
  toegewezenAanId: number | null;
  toegewezenAanNaam: string | null;
}

export interface TakenKPIs {
  totaal: number;
  open: number;
  bezig: number;
  afgerond: number;
  verlopen: number;
}

interface TakenResponse {
  taken: Taak[];
  kpis: TakenKPIs;
}

async function fetchTaken(status: string, zoek: string): Promise<TakenResponse> {
  const params = new URLSearchParams();
  if (status !== "alle") params.set("status", status);
  if (zoek) params.set("zoek", zoek);

  const res = await fetch(`/api/taken?${params}`);
  if (!res.ok) throw new Error("Kon taken niet laden");
  return res.json();
}

export function useTaken(status: string, zoek: string) {
  return useQuery({
    queryKey: ["taken", status, zoek],
    queryFn: () => fetchTaken(status, zoek),
    staleTime: 30_000,
  });
}
