import { useQuery } from "@tanstack/react-query";

export interface Klant {
  id: number;
  bedrijfsnaam: string;
  contactpersoon: string | null;
  email: string | null;
  telefoon: string | null;
  adres: string | null;
  notities: string | null;
  uurtarief: number | null;
  isActief: number;
  aantalProjecten: number;
  totaalMinuten: number;
}

async function fetchKlanten(): Promise<Klant[]> {
  const res = await fetch("/api/klanten");
  if (!res.ok) throw new Error("Kon klanten niet laden");
  const data = await res.json();
  return data.klanten || [];
}

export function useKlanten() {
  return useQuery({
    queryKey: ["klanten"],
    queryFn: fetchKlanten,
    staleTime: 30_000,
  });
}
