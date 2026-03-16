import { useQuery } from "@tanstack/react-query";

export interface AgendaItem {
  id: number;
  gebruikerId: number | null;
  gebruikerNaam: string | null;
  titel: string;
  omschrijving: string | null;
  type: string;
  startDatum: string;
  eindDatum: string | null;
  heleDag: number | null;
  herinneringMinuten: number | null;
}

function datumStr(jaar: number, maand: number, dag: number) {
  return `${jaar}-${String(maand + 1).padStart(2, "0")}-${String(dag).padStart(2, "0")}`;
}

async function fetchAgenda(jaar: number, maand: number): Promise<AgendaItem[]> {
  const van = datumStr(maand === 0 ? jaar - 1 : jaar, maand === 0 ? 11 : maand - 1, 1);
  const totJaar = maand === 11 ? jaar + 1 : jaar;
  const totMaand = maand === 11 ? 0 : maand + 1;
  const totDagen = new Date(totJaar, totMaand + 1, 0).getDate();
  const tot = datumStr(totJaar, totMaand, totDagen);

  const res = await fetch(`/api/agenda?van=${van}&tot=${tot}`);
  if (!res.ok) throw new Error("Kon agenda niet laden");
  const json = await res.json();
  return json.items;
}

export function useAgenda(jaar: number, maand: number) {
  return useQuery({
    queryKey: ["agenda", jaar, maand],
    queryFn: () => fetchAgenda(jaar, maand),
    staleTime: 30_000,
  });
}
