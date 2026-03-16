import { useQuery } from "@tanstack/react-query";

interface Project {
  id: number;
  naam: string;
  klantId: number;
  klantNaam: string;
  status: string;
}

interface Registratie {
  id: number;
  projectId: number;
  omschrijving: string | null;
  startTijd: string;
  eindTijd: string | null;
  duurMinuten: number | null;
  categorie: string;
  isHandmatig: number;
  projectNaam: string | null;
  klantNaam: string | null;
}

async function fetchProjecten(): Promise<Project[]> {
  const res = await fetch("/api/projecten");
  if (!res.ok) throw new Error("Kon projecten niet laden");
  const data = await res.json();
  return data.projecten || [];
}

async function fetchRegistraties(van: string, tot: string): Promise<Registratie[]> {
  const res = await fetch(`/api/tijdregistraties?van=${van}&tot=${tot}`);
  if (!res.ok) throw new Error("Kon registraties niet laden");
  const data = await res.json();
  return data.registraties || [];
}

export function useProjecten() {
  return useQuery({
    queryKey: ["projecten"],
    queryFn: fetchProjecten,
    staleTime: 30_000,
  });
}

export function useRegistraties(van: string, tot: string) {
  return useQuery({
    queryKey: ["registraties", van, tot],
    queryFn: () => fetchRegistraties(van, tot),
    staleTime: 30_000,
  });
}

export type { Project, Registratie };
