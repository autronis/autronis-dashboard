"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  Plus,
  Tag,
  User,
  Clock,
  FolderOpen,
  FileText,
} from "lucide-react";
import { cn, formatDatum } from "@/lib/utils";
import { PageTransition } from "@/components/ui/page-transition";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useWiki } from "@/hooks/queries/use-wiki";

const categorieConfig: Record<string, { label: string; color: string; bg: string }> = {
  processen: { label: "Processen", color: "text-blue-400", bg: "bg-blue-500/15" },
  klanten: { label: "Klanten", color: "text-green-400", bg: "bg-green-500/15" },
  technisch: { label: "Technisch", color: "text-purple-400", bg: "bg-purple-500/15" },
  templates: { label: "Templates", color: "text-amber-400", bg: "bg-amber-500/15" },
  financien: { label: "Financieel", color: "text-red-400", bg: "bg-red-500/15" },
};

function getSnippet(inhoud: string | null): string {
  if (!inhoud) return "";
  // Strip markdown formatting for snippet
  const plain = inhoud
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\n/g, " ");
  return plain.length > 120 ? plain.slice(0, 120) + "..." : plain;
}

function parseTags(tagsJson: string | null): string[] {
  if (!tagsJson) return [];
  try {
    const parsed: unknown = JSON.parse(tagsJson);
    if (Array.isArray(parsed)) return parsed.filter((t): t is string => typeof t === "string");
    return [];
  } catch {
    return [];
  }
}

export default function WikiPage() {
  const [zoek, setZoek] = useState("");
  const [activeCategorie, setActiveCategorie] = useState<string | null>(null);

  const { data, isLoading } = useWiki(activeCategorie, zoek);
  const artikelen = data?.artikelen ?? [];
  const categorieCounts = data?.categorieCounts ?? [];

  const totaalArtikelen = categorieCounts.reduce((sum, c) => sum + c.aantal, 0);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <SkeletonCard />
          </div>
          <div className="lg:col-span-3 space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-autronis-text-primary">Kennisbank</h1>
            <p className="text-base text-autronis-text-secondary mt-1">
              {totaalArtikelen} artikelen
            </p>
          </div>
          <Link
            href="/wiki/nieuw"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-autronis-accent hover:bg-autronis-accent-hover text-autronis-bg rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-autronis-accent/20"
          >
            <Plus className="w-4 h-4" />
            Nieuw artikel
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left sidebar: categories + recent */}
          <div className="lg:col-span-1 space-y-6">
            {/* Categories */}
            <div className="bg-autronis-card border border-autronis-border rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-autronis-text-primary uppercase tracking-wide mb-4 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-autronis-accent" />
                Categorieën
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveCategorie(null)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                    !activeCategorie
                      ? "bg-autronis-accent/10 text-autronis-accent"
                      : "text-autronis-text-secondary hover:text-autronis-text-primary hover:bg-autronis-bg/50"
                  )}
                >
                  <span>Alle</span>
                  <span className="tabular-nums">{totaalArtikelen}</span>
                </button>
                {Object.entries(categorieConfig).map(([key, config]) => {
                  const count = categorieCounts.find((c) => c.categorie === key)?.aantal || 0;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveCategorie(activeCategorie === key ? null : key)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                        activeCategorie === key
                          ? "bg-autronis-accent/10 text-autronis-accent"
                          : "text-autronis-text-secondary hover:text-autronis-text-primary hover:bg-autronis-bg/50"
                      )}
                    >
                      <span>{config.label}</span>
                      <span className="tabular-nums">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recent articles */}
            <div className="bg-autronis-card border border-autronis-border rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-autronis-text-primary uppercase tracking-wide mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-autronis-accent" />
                Recent bijgewerkt
              </h3>
              <div className="space-y-2">
                {artikelen.slice(0, 5).map((artikel) => (
                  <Link
                    key={artikel.id}
                    href={`/wiki/${artikel.id}`}
                    className="block px-3 py-2 rounded-lg text-sm text-autronis-text-secondary hover:text-autronis-text-primary hover:bg-autronis-bg/50 transition-colors truncate"
                  >
                    {artikel.titel}
                  </Link>
                ))}
                {artikelen.length === 0 && (
                  <p className="text-sm text-autronis-text-secondary/50 px-3">
                    Nog geen artikelen
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Main area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-autronis-text-secondary" />
              <input
                type="text"
                value={zoek}
                onChange={(e) => setZoek(e.target.value)}
                placeholder="Zoeken in kennisbank..."
                className="w-full bg-autronis-card border border-autronis-border rounded-xl pl-11 pr-4 py-3 text-sm text-autronis-text-primary placeholder:text-autronis-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-autronis-accent/50 focus:border-autronis-accent transition-colors"
              />
            </div>

            {/* Article list */}
            {artikelen.length === 0 ? (
              <EmptyState
                titel="Geen artikelen gevonden"
                beschrijving={
                  zoek || activeCategorie
                    ? "Probeer een andere zoekterm of categorie."
                    : "Begin met het toevoegen van je eerste artikel."
                }
                actieLabel={!zoek && !activeCategorie ? "Nieuw artikel" : undefined}
                actieHref={!zoek && !activeCategorie ? "/wiki/nieuw" : undefined}
                icoon={<BookOpen className="h-7 w-7 text-autronis-text-secondary" />}
              />
            ) : (
              <div className="space-y-3">
                {artikelen.map((artikel) => {
                  const cat = categorieConfig[artikel.categorie || "processen"] || categorieConfig.processen;
                  const tags = parseTags(artikel.tags);

                  return (
                    <Link
                      key={artikel.id}
                      href={`/wiki/${artikel.id}`}
                      className="block bg-autronis-card border border-autronis-border rounded-2xl p-5 lg:p-6 card-glow transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-autronis-text-primary truncate">
                              {artikel.titel}
                            </h3>
                            <span
                              className={cn(
                                "text-xs px-2.5 py-0.5 rounded-full font-medium flex-shrink-0",
                                cat.bg,
                                cat.color
                              )}
                            >
                              {cat.label}
                            </span>
                          </div>

                          <p className="text-sm text-autronis-text-secondary leading-relaxed mb-3">
                            {getSnippet(artikel.inhoud)}
                          </p>

                          <div className="flex items-center flex-wrap gap-3">
                            {tags.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <Tag className="w-3 h-3 text-autronis-text-secondary" />
                                {tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-xs px-2 py-0.5 bg-autronis-bg rounded-md text-autronis-text-secondary"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {tags.length > 3 && (
                                  <span className="text-xs text-autronis-text-secondary">
                                    +{tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-xs text-autronis-text-secondary">
                              <User className="w-3 h-3" />
                              {artikel.auteurNaam || "Onbekend"}
                            </div>
                            {artikel.bijgewerktOp && (
                              <div className="flex items-center gap-1.5 text-xs text-autronis-text-secondary">
                                <Clock className="w-3 h-3" />
                                {formatDatum(artikel.bijgewerktOp)}
                              </div>
                            )}
                          </div>
                        </div>
                        <FileText className="w-5 h-5 text-autronis-text-secondary flex-shrink-0 mt-1" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
