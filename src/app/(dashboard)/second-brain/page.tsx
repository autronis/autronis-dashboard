"use client";

import { useState, useCallback, useRef } from "react";
import {
  Brain,
  FileText,
  Link2,
  Image as ImageIcon,
  FileDown,
  Code,
  TrendingUp,
  Paperclip,
  Send,
  Star,
} from "lucide-react";
import { cn, formatDatum } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/ui/page-transition";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useSecondBrain,
  useCreateSecondBrainItem,
  useVerwerkenSecondBrain,
  useUpdateSecondBrainItem,
  type SecondBrainItem,
} from "@/hooks/queries/use-second-brain";
import { useQueryClient } from "@tanstack/react-query";
import { AiZoekenTab } from "./ai-zoeken-tab";
import { DetailModal } from "./detail-modal";

const typeConfig = {
  tekst: { icon: FileText, label: "Tekst", color: "text-blue-400" },
  url: { icon: Link2, label: "URL", color: "text-purple-400" },
  afbeelding: { icon: ImageIcon, label: "Afbeelding", color: "text-green-400" },
  pdf: { icon: FileDown, label: "PDF", color: "text-red-400" },
  code: { icon: Code, label: "Code", color: "text-yellow-400" },
} as const;

type TypeKey = keyof typeof typeConfig;

export default function SecondBrainPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"feed" | "zoeken">("feed");
  const [typeFilter, setTypeFilter] = useState("alle");
  const [tagFilter, setTagFilter] = useState("");
  const [zoek, setZoek] = useState("");
  const [favoriet, setFavoriet] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SecondBrainItem | null>(null);
  const [nieuwInput, setNieuwInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useSecondBrain(typeFilter, tagFilter, zoek, favoriet);
  const createMutation = useCreateSecondBrainItem();
  const verwerkenMutation = useVerwerkenSecondBrain();
  const updateMutation = useUpdateSecondBrainItem();

  const items = data?.items ?? [];
  const kpis = data?.kpis;

  const handleSubmit = useCallback(async () => {
    const input = nieuwInput.trim();
    if (!input) return;

    const isUrl = /^https?:\/\//.test(input);
    const isCode = input.startsWith("```");

    if (isUrl) {
      verwerkenMutation.mutate({ bronUrl: input });
    } else if (isCode) {
      createMutation.mutate({ type: "code", inhoud: input });
    } else {
      createMutation.mutate({ type: "tekst", inhoud: input });
    }

    setNieuwInput("");
    addToast("Item opgeslagen", "succes");
  }, [nieuwInput, verwerkenMutation, createMutation, addToast]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("bestand", file);

      if (file.type.startsWith("image/")) {
        formData.append("type", "afbeelding");
      } else if (file.type === "application/pdf") {
        formData.append("type", "pdf");
      } else {
        formData.append("type", "tekst");
      }

      verwerkenMutation.mutate(formData);
      addToast("Bestand wordt verwerkt...", "succes");

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [verwerkenMutation, addToast]
  );

  const toggleFavoriet = useCallback(
    (item: SecondBrainItem) => {
      updateMutation.mutate({ id: item.id, isFavoriet: item.isFavoriet ? 0 : 1 });
    },
    [updateMutation]
  );

  // Collect unique tags from all items
  const allTags = Array.from(
    new Set(
      items.flatMap((item) => {
        if (!item.aiTags) return [];
        try {
          return JSON.parse(item.aiTags) as string[];
        } catch {
          return [];
        }
      })
    )
  );

  // Most used type
  const meestGebruiktType =
    kpis?.perType
      ? (Object.entries(kpis.perType).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—")
      : "—";

  const meestGebruiktLabel =
    meestGebruiktType !== "—" && meestGebruiktType in typeConfig
      ? typeConfig[meestGebruiktType as TypeKey].label
      : meestGebruiktType;

  return (
    <PageTransition>
      <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-autronis-accent/10">
            <Brain className="w-6 h-6 text-autronis-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-autronis-text-primary">Second Brain</h1>
            <p className="text-sm text-autronis-text-secondary">Jouw persoonlijke kennisbank</p>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-autronis-card border border-autronis-border rounded-2xl p-5 flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-autronis-accent/10">
              <Brain className="w-5 h-5 text-autronis-accent" />
            </div>
            <div>
              <p className="text-xs text-autronis-text-secondary uppercase tracking-wide">Totaal items</p>
              <p className="text-2xl font-bold text-autronis-text-primary tabular-nums">
                {kpis?.totaal ?? "—"}
              </p>
            </div>
          </div>

          <div className="bg-autronis-card border border-autronis-border rounded-2xl p-5 flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-autronis-accent/10">
              <TrendingUp className="w-5 h-5 text-autronis-accent" />
            </div>
            <div>
              <p className="text-xs text-autronis-text-secondary uppercase tracking-wide">Deze week</p>
              <p className="text-2xl font-bold text-autronis-text-primary tabular-nums">
                {kpis?.dezeWeek ?? "—"}
              </p>
            </div>
          </div>

          <div className="bg-autronis-card border border-autronis-border rounded-2xl p-5 flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-autronis-accent/10">
              <FileText className="w-5 h-5 text-autronis-accent" />
            </div>
            <div>
              <p className="text-xs text-autronis-text-secondary uppercase tracking-wide">Meest gebruikt</p>
              <p className="text-xl font-bold text-autronis-text-primary">{meestGebruiktLabel}</p>
            </div>
          </div>
        </div>

        {/* Quick-add bar */}
        <div className="bg-autronis-card border border-autronis-border rounded-2xl p-4 flex items-center gap-3">
          <input
            className="flex-1 bg-transparent text-lg text-autronis-text-primary placeholder:text-autronis-text-secondary/50 outline-none"
            placeholder="Typ, plak een URL, of sleep een bestand..."
            value={nieuwInput}
            onChange={(e) => setNieuwInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            type="button"
            aria-label="Bestand uploaden"
          >
            <Paperclip className="w-5 h-5 text-autronis-text-secondary hover:text-autronis-accent transition-colors" />
          </button>
          <button
            onClick={handleSubmit}
            disabled={!nieuwInput.trim()}
            type="button"
            aria-label="Opslaan"
            className="disabled:opacity-40 transition-opacity"
          >
            <Send className="w-5 h-5 text-autronis-accent" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Tab buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("feed")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
              activeTab === "feed"
                ? "bg-autronis-accent text-white"
                : "text-autronis-text-secondary hover:text-autronis-text-primary"
            )}
          >
            Feed
          </button>
          <button
            onClick={() => setActiveTab("zoeken")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
              activeTab === "zoeken"
                ? "bg-autronis-accent text-white"
                : "text-autronis-text-secondary hover:text-autronis-text-primary"
            )}
          >
            AI Zoeken
          </button>
        </div>

        {/* Feed tab */}
        {activeTab === "feed" && (
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Type filters */}
              <button
                onClick={() => setTypeFilter("alle")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  typeFilter === "alle"
                    ? "bg-autronis-accent text-white"
                    : "bg-autronis-card border border-autronis-border text-autronis-text-secondary hover:text-autronis-text-primary"
                )}
              >
                Alle
              </button>
              {(Object.entries(typeConfig) as [TypeKey, (typeof typeConfig)[TypeKey]][]).map(
                ([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setTypeFilter(key)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      typeFilter === key
                        ? "bg-autronis-accent text-white"
                        : "bg-autronis-card border border-autronis-border text-autronis-text-secondary hover:text-autronis-text-primary"
                    )}
                  >
                    {cfg.label}
                  </button>
                )
              )}

              {/* Favoriet toggle */}
              <button
                onClick={() => setFavoriet((prev) => !prev)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5",
                  favoriet
                    ? "bg-yellow-400/20 text-yellow-400 border border-yellow-400/30"
                    : "bg-autronis-card border border-autronis-border text-autronis-text-secondary hover:text-autronis-text-primary"
                )}
              >
                <Star className="w-3 h-3" />
                Favorieten
              </button>
            </div>

            {/* Tag pills */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tagFilter && (
                  <button
                    onClick={() => setTagFilter("")}
                    className="px-2.5 py-0.5 rounded-full text-xs bg-autronis-border/50 text-autronis-text-secondary hover:text-autronis-text-primary transition-colors"
                  >
                    Wis tag ×
                  </button>
                )}
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(tagFilter === tag ? "" : tag)}
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs transition-colors",
                      tagFilter === tag
                        ? "bg-autronis-accent text-white"
                        : "bg-autronis-accent/10 text-autronis-accent hover:bg-autronis-accent/20"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {/* Loading skeletons */}
            {isLoading && (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-autronis-card border border-autronis-border rounded-2xl p-5 animate-pulse"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded bg-autronis-border mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-autronis-border rounded w-1/2" />
                        <div className="h-3 bg-autronis-border rounded w-3/4" />
                        <div className="h-3 bg-autronis-border rounded w-1/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && items.length === 0 && (
              <EmptyState
                icoon={<Brain className="w-7 h-7 text-autronis-text-secondary" />}
                titel="Nog niets opgeslagen"
                beschrijving="Typ een notitie, plak een URL of upload een bestand om te beginnen."
              />
            )}

            {/* Feed items */}
            {!isLoading && items.length > 0 && (
              <div className="space-y-3">
                {items.map((item) => {
                  const cfg = typeConfig[item.type] ?? typeConfig.tekst;
                  const TypeIcon = cfg.icon;
                  let tags: string[] = [];
                  if (item.aiTags) {
                    try {
                      tags = JSON.parse(item.aiTags) as string[];
                    } catch {
                      tags = [];
                    }
                  }

                  return (
                    <div
                      key={item.id}
                      className="bg-autronis-card border border-autronis-border rounded-2xl p-5 hover:border-autronis-accent/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="flex items-start gap-3">
                        <TypeIcon className={cn("w-5 h-5 mt-0.5 shrink-0", cfg.color)} />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-autronis-text-primary font-medium truncate">
                            {item.titel ?? "Zonder titel"}
                          </h3>
                          {item.aiSamenvatting && (
                            <p className="text-autronis-text-secondary text-sm mt-1 line-clamp-2">
                              {item.aiSamenvatting}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {tags.length > 0 ? (
                              tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="bg-autronis-accent/10 text-autronis-accent rounded-full px-2.5 py-0.5 text-xs"
                                >
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="bg-autronis-border/50 rounded-full px-2.5 py-0.5 text-xs text-autronis-text-secondary animate-pulse">
                                AI verwerkt...
                              </span>
                            )}
                            <span className="text-autronis-text-secondary text-xs ml-auto tabular-nums">
                              {formatDatum(item.aangemaaktOp)}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavoriet(item);
                          }}
                          className="text-autronis-text-secondary hover:text-yellow-400 transition-colors shrink-0"
                          aria-label={item.isFavoriet ? "Verwijder uit favorieten" : "Voeg toe aan favorieten"}
                        >
                          {item.isFavoriet ? (
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          ) : (
                            <Star className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* AI Zoeken tab */}
        {activeTab === "zoeken" && (
          <AiZoekenTab onSelectItem={(item) => setSelectedItem(item)} />
        )}

        {/* Detail modal */}
        {selectedItem && (
          <DetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onUpdate={() => queryClient.invalidateQueries({ queryKey: ["second-brain"] })}
          />
        )}
      </div>
    </PageTransition>
  );
}
