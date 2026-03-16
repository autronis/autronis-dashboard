import { useQuery } from "@tanstack/react-query";

interface Notificatie {
  id: number;
  gebruikerId: number;
  type: "factuur_te_laat" | "deadline_nadert" | "factuur_betaald" | "taak_toegewezen" | "belasting_deadline" | "verlof_aangevraagd" | "verlof_goedgekeurd" | "client_bericht" | "proposal_ondertekend" | "offerte_geaccepteerd";
  titel: string;
  omschrijving: string | null;
  link: string | null;
  gelezen: number;
  aangemaaktOp: string;
}

interface NotificatiesResponse {
  notificaties: Notificatie[];
  ongelezen: number;
}

async function fetchNotificaties(): Promise<NotificatiesResponse> {
  const res = await fetch("/api/notificaties");
  if (!res.ok) throw new Error("Kon notificaties niet laden");
  return res.json();
}

export function useNotificaties() {
  return useQuery({
    queryKey: ["notificaties"],
    queryFn: fetchNotificaties,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export type { Notificatie };
