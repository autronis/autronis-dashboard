import { useQuery } from "@tanstack/react-query";

export interface Inzicht {
  id: string;
  type: "waarschuwing" | "kans" | "tip" | "succes";
  prioriteit: number;
  titel: string;
  omschrijving: string;
  actie?: { label: string; link: string };
}

interface InzichtenResponse {
  inzichten: Inzicht[];
}

export function useInzichten() {
  return useQuery<InzichtenResponse>({
    queryKey: ["inzichten"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/inzichten");
      if (!res.ok) throw new Error("Fout bij laden inzichten");
      return res.json() as Promise<InzichtenResponse>;
    },
    staleTime: 60_000, // 1 minuut cache — inzichten hoeven niet real-time
  });
}
