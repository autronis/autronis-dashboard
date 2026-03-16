"use client";

import { useState, useCallback } from "react";
import { Search, Loader2, Brain, FileText, Link2, Image as ImageIcon, FileDown, Code } from "lucide-react";
import { useAiZoeken, type SecondBrainItem } from "@/hooks/queries/use-second-brain";
import { useToast } from "@/hooks/use-toast";

interface AiZoekenTabProps {
  onSelectItem: (item: SecondBrainItem) => void;
}

const typeIcons: Record<string, typeof FileText> = {
  tekst: FileText,
  url: Link2,
  afbeelding: ImageIcon,
  pdf: FileDown,
  code: Code,
};

export function AiZoekenTab({ onSelectItem }: AiZoekenTabProps) {
  const { addToast } = useToast();
  const [vraag, setVraag] = useState("");
  const zoekMutation = useAiZoeken();

  const resultaat = zoekMutation.data;

  const handleZoek = useCallback(() => {
    if (!vraag.trim()) return;
    zoekMutation.mutate(vraag, {
      onError: () => addToast("Zoeken mislukt", "fout"),
    });
  }, [vraag, zoekMutation, addToast]);

  const handleBronClick = useCallback(
    async (bronId: number) => {
      try {
        const res = await fetch(`/api/second-brain/${bronId}`);
        if (!res.ok) throw new Error("Kon item niet laden");
        const data = (await res.json()) as { item: SecondBrainItem };
        onSelectItem(data.item);
      } catch {
        addToast("Kon item niet openen", "fout");
      }
    },
    [onSelectItem, addToast]
  );

  const cleanAntwoord = resultaat?.antwoord
    ? resultaat.antwoord.replace(/\[ID:\d+\]/g, "").replace(/\s{2,}/g, " ").trim()
    : null;

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="bg-autronis-card border border-autronis-border rounded-2xl p-4 flex items-center gap-3">
        <Search className="w-5 h-5 text-autronis-text-secondary shrink-0" />
        <input
          className="flex-1 bg-transparent text-lg text-autronis-text-primary placeholder:text-autronis-text-secondary/50 outline-none"
          placeholder="Stel een vraag over je opgeslagen kennis..."
          value={vraag}
          onChange={(e) => setVraag(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !zoekMutation.isPending && handleZoek()}
        />
        <button
          type="button"
          onClick={handleZoek}
          disabled={zoekMutation.isPending || !vraag.trim()}
          className="disabled:opacity-40 transition-opacity"
          aria-label="Zoeken"
        >
          {zoekMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin text-autronis-accent" />
          ) : (
            <Brain className="w-5 h-5 text-autronis-accent" />
          )}
        </button>
      </div>

      {/* Loading state */}
      {zoekMutation.isPending && (
        <div className="flex items-center gap-3 text-autronis-text-secondary px-1">
          <Loader2 className="w-4 h-4 animate-spin text-autronis-accent" />
          <span className="text-sm">Even denken...</span>
        </div>
      )}

      {/* Response area */}
      {cleanAntwoord && !zoekMutation.isPending && (
        <div className="space-y-4">
          <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6">
            <p className="text-autronis-text-primary whitespace-pre-wrap leading-relaxed">
              {cleanAntwoord}
            </p>
          </div>

          {/* Bronnen */}
          {resultaat && resultaat.bronnen.length > 0 && (
            <div>
              <h3 className="text-autronis-text-secondary text-sm font-medium mb-3">Bronnen</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {resultaat.bronnen.map((bron) => {
                  const TypeIcon = typeIcons[bron.type] ?? FileText;
                  return (
                    <button
                      key={bron.id}
                      type="button"
                      onClick={() => handleBronClick(bron.id)}
                      className="flex-shrink-0 bg-autronis-card border border-autronis-border rounded-xl p-3 hover:border-autronis-accent/30 transition-colors flex items-center gap-2"
                    >
                      <TypeIcon className="w-4 h-4 text-autronis-text-secondary" />
                      <span className="text-sm text-autronis-text-primary whitespace-nowrap">
                        {bron.titel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!zoekMutation.isPending && !resultaat && (
        <div className="text-center py-16 text-autronis-text-secondary text-sm">
          Stel een vraag om je kennis te doorzoeken
        </div>
      )}
    </div>
  );
}
