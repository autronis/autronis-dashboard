import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProfielEntry, Inzicht, InzichtCategorie } from "@/types/content";

// ============ PROFIEL ============

async function fetchContentProfiel(): Promise<ProfielEntry[]> {
  const res = await fetch("/api/content/profiel");
  if (!res.ok) throw new Error("Kon profiel niet ophalen");
  const data = await res.json();
  return data.profiel ?? [];
}

export function useContentProfiel() {
  return useQuery({
    queryKey: ["content-profiel"],
    queryFn: fetchContentProfiel,
    staleTime: 60_000,
  });
}

export function useUpdateProfiel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id?: number; onderwerp: string; inhoud: string }) => {
      const res = await fetch("/api/content/profiel", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.fout ?? "Kon profiel niet opslaan");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-profiel"] });
    },
  });
}

// ============ INZICHTEN ============

type RawInzicht = Omit<Inzicht, "isGebruikt"> & { isGebruikt: number };

async function fetchContentInzichten(): Promise<Inzicht[]> {
  const res = await fetch("/api/content/inzichten");
  if (!res.ok) throw new Error("Kon inzichten niet ophalen");
  const data = await res.json();
  return (data.inzichten ?? []).map((item: RawInzicht) => ({
    ...item,
    isGebruikt: item.isGebruikt === 1,
  }));
}

export function useContentInzichten() {
  return useQuery({
    queryKey: ["content-inzichten"],
    queryFn: fetchContentInzichten,
    staleTime: 30_000,
  });
}

export function useCreateInzicht() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      titel: string;
      inhoud: string;
      categorie: InzichtCategorie;
      klantId?: number;
      projectId?: number;
    }) => {
      const res = await fetch("/api/content/inzichten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.fout ?? "Kon inzicht niet aanmaken");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-inzichten"] });
    },
  });
}

export function useDeleteInzicht() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/content/inzichten/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.fout ?? "Kon inzicht niet verwijderen");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-inzichten"] });
    },
  });
}
