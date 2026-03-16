"use client";

import { useQuery } from "@tanstack/react-query";

export interface Artikel {
  id: number;
  titel: string;
  inhoud: string | null;
  categorie: string | null;
  tags: string | null;
  gepubliceerd: number | null;
  auteurId: number | null;
  auteurNaam: string | null;
  aangemaaktOp: string | null;
  bijgewerktOp: string | null;
}

export interface CategorieCount {
  categorie: string | null;
  aantal: number;
}

export function useWiki(activeCategorie: string | null, zoek: string) {
  return useQuery<{ artikelen: Artikel[]; categorieCounts: CategorieCount[] }>({
    queryKey: ["wiki", activeCategorie, zoek],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeCategorie) params.set("categorie", activeCategorie);
      if (zoek) params.set("zoek", zoek);
      const res = await fetch(`/api/wiki?${params}`);
      if (!res.ok) throw new Error("Kon artikelen niet laden");
      return res.json();
    },
    staleTime: 30_000,
  });
}
