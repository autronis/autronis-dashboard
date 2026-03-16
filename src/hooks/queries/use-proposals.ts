"use client";

import { useQuery } from "@tanstack/react-query";

export interface Proposal {
  id: number;
  klantId: number;
  klantNaam: string;
  titel: string;
  status: string;
  totaalBedrag: number | null;
  geldigTot: string | null;
  token: string | null;
  ondertekendOp: string | null;
  aangemaaktOp: string | null;
}

export interface ProposalKPIs {
  openstaand: number;
  verzonden: number;
  ondertekendDezeMaand: number;
  totaleWaarde: number;
}

export function useProposals(statusFilter: string) {
  return useQuery<{ proposals: Proposal[]; kpis: ProposalKPIs }>({
    queryKey: ["proposals", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "alle") params.set("status", statusFilter);
      const res = await fetch(`/api/proposals?${params}`);
      if (!res.ok) throw new Error("Kon proposals niet laden");
      return res.json();
    },
    staleTime: 30_000,
  });
}
