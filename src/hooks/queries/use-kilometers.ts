"use client";

import { useQuery } from "@tanstack/react-query";

export interface Rit {
  id: number;
  datum: string;
  vanLocatie: string;
  naarLocatie: string;
  kilometers: number;
  zakelijkDoel: string | null;
  klantId: number | null;
  projectId: number | null;
  tariefPerKm: number | null;
  klantNaam: string | null;
  projectNaam: string | null;
}

export interface KlantOptie {
  id: number;
  bedrijfsnaam: string;
}

export interface ProjectOptie {
  id: number;
  naam: string;
  klantId: number | null;
}

interface RittenData {
  ritten: Rit[];
  totaalKm: number;
  totaalBedrag: number;
  aantalRitten: number;
}

export function useRitten(maand: number, jaar: number) {
  return useQuery<RittenData>({
    queryKey: ["kilometers", maand, jaar],
    queryFn: async () => {
      const res = await fetch(`/api/kilometers?maand=${maand}&jaar=${jaar}`);
      if (!res.ok) throw new Error("Kon ritten niet laden");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useKlantenProjecten() {
  return useQuery<{ klanten: KlantOptie[]; projecten: ProjectOptie[] }>({
    queryKey: ["kilometers", "klanten-projecten"],
    queryFn: async () => {
      const [kRes, pRes] = await Promise.all([
        fetch("/api/klanten"),
        fetch("/api/projecten"),
      ]);
      const klanten = kRes.ok ? (await kRes.json()).klanten ?? [] : [];
      const projecten = pRes.ok ? (await pRes.json()).projecten ?? [] : [];
      return { klanten, projecten };
    },
    staleTime: 60_000,
  });
}
