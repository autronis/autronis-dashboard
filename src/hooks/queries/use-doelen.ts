"use client";

import { useQuery } from "@tanstack/react-query";

export interface KeyResult {
  id?: number;
  objectiveId?: number;
  titel: string;
  doelwaarde: number;
  huidigeWaarde: number;
  eenheid: string | null;
  autoKoppeling: string | null;
}

export interface Doel {
  id: number;
  titel: string;
  omschrijving: string | null;
  eigenaarId: number | null;
  kwartaal: number;
  jaar: number;
  status: string | null;
  keyResults: KeyResult[];
  voortgang: number;
}

export interface GebruikerOptie {
  id: number;
  naam: string;
}

export function useDoelen(kwartaal: number, jaar: number) {
  return useQuery<{ doelen: Doel[] }>({
    queryKey: ["doelen", kwartaal, jaar],
    queryFn: async () => {
      const res = await fetch(`/api/doelen?kwartaal=${kwartaal}&jaar=${jaar}`);
      if (!res.ok) throw new Error("Laden mislukt");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useGebruikers() {
  return useQuery<GebruikerOptie[]>({
    queryKey: ["gebruikers"],
    queryFn: async () => {
      const res = await fetch("/api/profiel");
      if (!res.ok) return [];
      const json = await res.json();
      const allRes = await fetch("/api/analytics/vergelijk");
      if (allRes.ok) {
        const allJson = await allRes.json();
        return allJson.gebruikers || [json.gebruiker];
      }
      return [json.gebruiker];
    },
    staleTime: 60_000,
  });
}
