import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DocumentBase, DocumentPayload, AiDraftRequest, AiDraftResponse, PaginatedDocumenten, SortOption } from "@/types/documenten";
import type { ImproveMode } from "@/lib/ai/documenten";

async function fetchDocumenten(sort?: SortOption, cursor?: string): Promise<PaginatedDocumenten> {
  const params = new URLSearchParams();
  if (sort) params.set("sort", sort);
  if (cursor) params.set("cursor", cursor);
  params.set("limit", "20");

  const res = await fetch(`/api/documenten?${params.toString()}`);
  if (!res.ok) throw new Error("Kon documenten niet ophalen");
  return res.json();
}

export function useDocumenten(sort?: SortOption, cursor?: string) {
  return useQuery({
    queryKey: ["documenten", sort ?? "datum-desc", cursor ?? ""],
    queryFn: () => fetchDocumenten(sort, cursor),
    staleTime: 60_000,
    select: (data: PaginatedDocumenten) => data,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DocumentPayload) => {
      const res = await fetch("/api/documenten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.fout ?? "Kon document niet aanmaken");
      }
      return res.json();
    },
    onMutate: async (payload: DocumentPayload) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["documenten"] });

      // Snapshot previous state
      const previousData = queryClient.getQueriesData<PaginatedDocumenten>({ queryKey: ["documenten"] });

      // Optimistically add the document to all matching query caches
      queryClient.setQueriesData<PaginatedDocumenten>(
        { queryKey: ["documenten"] },
        (old) => {
          if (!old) return old;
          const optimisticDoc: DocumentBase = {
            notionId: `optimistic-${Date.now()}`,
            titel: payload.titel,
            type: payload.type,
            samenvatting: "",
            aangemaaktDoor: "Jij",
            aangemaaktOp: new Date().toISOString().split("T")[0],
            notionUrl: "",
            isOptimistic: true,
          };
          return {
            ...old,
            documenten: [optimisticDoc, ...old.documenten],
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _payload, context) => {
      // Rollback on error
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["documenten"] });
    },
  });
}

export function useArchiveDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const res = await fetch(`/api/documenten/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.fout ?? "Kon document niet archiveren");
      }
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["documenten"] });
    },
  });
}

export function useGenerateDraft() {
  return useMutation({
    mutationFn: async (request: AiDraftRequest): Promise<AiDraftResponse> => {
      const res = await fetch("/api/documenten/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.fout ?? "Kon draft niet genereren");
      }
      const data = await res.json();
      return data.draft;
    },
  });
}

export function useImproveDocument() {
  return useMutation({
    mutationFn: async ({ content, mode }: { content: string; mode: ImproveMode }): Promise<{ original: string; improved: string }> => {
      const res = await fetch("/api/documenten/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, mode }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.fout ?? "Kon document niet verbeteren");
      }
      const data = await res.json();
      return data.result;
    },
  });
}
