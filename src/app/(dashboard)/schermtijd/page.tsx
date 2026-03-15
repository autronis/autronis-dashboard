"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Monitor,
  Clock,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Users,
  Shield,
  Lightbulb,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Check,
  X,
  AppWindow,
  Globe,
  LayoutGrid,
  Loader2,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useScreenTime,
  useScreenTimeRegels,
  useScreenTimeRegelMutatie,
  useScreenTimeSuggesties,
  useScreenTimeSuggestieMutatie,
  useCategoriseer,
} from "@/hooks/queries/use-screen-time";
import { useGebruikers } from "@/hooks/queries/use-doelen";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/ui/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  ScreenTimeEntry,
  ScreenTimeRegel,
  ScreenTimeSuggestie,
  ScreenTimeCategorie,
} from "@/types";

// ============ CONSTANTS ============

const CATEGORIE_KLEUREN: Record<string, string> = {
  development: "#17B8A5",
  communicatie: "#3B82F6",
  design: "#A855F7",
  administratie: "#F59E0B",
  afleiding: "#EF4444",
  overig: "#6B7280",
};

const CATEGORIE_LABELS: Record<string, string> = {
  development: "Development",
  communicatie: "Communicatie",
  design: "Design",
  administratie: "Administratie",
  afleiding: "Afleiding",
  overig: "Overig",
};

const PRODUCTIEF_CATEGORIEEN: ScreenTimeCategorie[] = [
  "development",
  "design",
  "administratie",
];

type Periode = "dag" | "week" | "maand";
type TabId = "overzicht" | "team" | "regels" | "suggesties";

const TABS: { id: TabId; label: string; icon: typeof Monitor }[] = [
  { id: "overzicht", label: "Overzicht", icon: Monitor },
  { id: "team", label: "Team", icon: Users },
  { id: "regels", label: "Regels", icon: Shield },
  { id: "suggesties", label: "Suggesties", icon: Lightbulb },
];

// ============ HELPERS ============

function formatTijd(seconden: number): string {
  const uren = Math.floor(seconden / 3600);
  const minuten = Math.round((seconden % 3600) / 60);
  if (uren === 0) return `${minuten}m`;
  if (minuten === 0) return `${uren}u`;
  return `${uren}u ${minuten}m`;
}

function datumLabel(datum: Date, periode: Periode): string {
  const opties: Intl.DateTimeFormatOptions =
    periode === "dag"
      ? { weekday: "long", day: "numeric", month: "long" }
      : periode === "week"
        ? { day: "numeric", month: "short" }
        : { month: "long", year: "numeric" };
  if (periode === "week") {
    const einde = new Date(datum);
    einde.setDate(einde.getDate() + 6);
    return `${datum.toLocaleDateString("nl-NL", opties)} - ${einde.toLocaleDateString("nl-NL", opties)}`;
  }
  return datum.toLocaleDateString("nl-NL", opties);
}

function berekenVanTot(datum: Date, periode: Periode): { van: string; tot: string } {
  const d = new Date(datum);
  let van: Date;
  let tot: Date;
  if (periode === "dag") {
    van = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    tot = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  } else if (periode === "week") {
    const dag = d.getDay();
    const maandag = d.getDate() - ((dag + 6) % 7);
    van = new Date(d.getFullYear(), d.getMonth(), maandag);
    tot = new Date(van.getFullYear(), van.getMonth(), van.getDate() + 7);
  } else {
    van = new Date(d.getFullYear(), d.getMonth(), 1);
    tot = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return {
    van: van.toISOString().split("T")[0],
    tot: tot.toISOString().split("T")[0],
  };
}

function navigeerDatum(datum: Date, periode: Periode, richting: -1 | 1): Date {
  const d = new Date(datum);
  if (periode === "dag") d.setDate(d.getDate() + richting);
  else if (periode === "week") d.setDate(d.getDate() + richting * 7);
  else d.setMonth(d.getMonth() + richting);
  return d;
}

// ============ SUB-COMPONENTS ============

function CategorieBadge({ categorie }: { categorie: string }) {
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${CATEGORIE_KLEUREN[categorie] ?? "#6B7280"}20`,
        color: CATEGORIE_KLEUREN[categorie] ?? "#6B7280",
      }}
    >
      {CATEGORIE_LABELS[categorie] ?? categorie}
    </span>
  );
}

function TypeIcon({ type }: { type: ScreenTimeRegel["type"] }) {
  const Icon = type === "app" ? AppWindow : type === "url" ? Globe : LayoutGrid;
  return <Icon className="w-4 h-4 text-autronis-text-secondary" />;
}

// ============ TAB: OVERZICHT ============

function TabOverzicht({
  entries,
  isLoading,
}: {
  entries: ScreenTimeEntry[];
  isLoading: boolean;
}) {
  const stats = useMemo(() => {
    if (!entries.length) return null;
    const totaal = entries.reduce((s, e) => s + e.duurSeconden, 0);
    const perCategorie: Record<string, number> = {};
    const perApp: Record<string, number> = {};
    for (const e of entries) {
      perCategorie[e.categorie] = (perCategorie[e.categorie] ?? 0) + e.duurSeconden;
      perApp[e.app] = (perApp[e.app] ?? 0) + e.duurSeconden;
    }
    const categorieen = Object.entries(perCategorie)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, sec]) => ({ categorie: cat, seconden: sec }));
    const productiefSec = PRODUCTIEF_CATEGORIEEN.reduce(
      (s, c) => s + (perCategorie[c] ?? 0),
      0
    );
    const topCategorie = categorieen[0]?.categorie ?? "overig";
    const apps = Object.entries(perApp)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([app, sec]) => ({ app, seconden: sec }));
    return {
      totaal,
      productiefPct: totaal > 0 ? Math.round((productiefSec / totaal) * 100) : 0,
      topCategorie,
      categorieen,
      apps,
    };
  }, [entries]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-5">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-autronis-card border border-autronis-border rounded-2xl p-12 text-center">
        <Monitor className="w-12 h-12 text-autronis-text-secondary mx-auto mb-4 opacity-40" />
        <p className="text-autronis-text-secondary text-lg">Geen schermtijd data voor deze periode</p>
        <p className="text-autronis-text-secondary text-sm mt-1 opacity-60">
          De screen time agent stuurt automatisch data als deze actief is.
        </p>
      </div>
    );
  }

  const maxCat = Math.max(...stats.categorieen.map((c) => c.seconden), 1);
  const maxApp = Math.max(...stats.apps.map((a) => a.seconden), 1);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 card-glow">
          <div className="p-2.5 bg-autronis-accent/10 rounded-xl w-fit mb-3">
            <Clock className="w-5 h-5 text-autronis-accent" />
          </div>
          <p className="text-2xl font-bold text-autronis-accent tabular-nums">
            {formatTijd(stats.totaal)}
          </p>
          <p className="text-sm text-autronis-text-secondary mt-1 uppercase tracking-wide">
            Totale schermtijd
          </p>
        </div>
        <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 card-glow">
          <div className="p-2.5 bg-green-500/10 rounded-xl w-fit mb-3">
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-400 tabular-nums">
            {stats.productiefPct}%
          </p>
          <p className="text-sm text-autronis-text-secondary mt-1 uppercase tracking-wide">
            Productief
          </p>
        </div>
        <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 card-glow">
          <div
            className="p-2.5 rounded-xl w-fit mb-3"
            style={{ backgroundColor: `${CATEGORIE_KLEUREN[stats.topCategorie]}15` }}
          >
            <Monitor
              className="w-5 h-5"
              style={{ color: CATEGORIE_KLEUREN[stats.topCategorie] }}
            />
          </div>
          <p
            className="text-2xl font-bold tabular-nums"
            style={{ color: CATEGORIE_KLEUREN[stats.topCategorie] }}
          >
            {CATEGORIE_LABELS[stats.topCategorie]}
          </p>
          <p className="text-sm text-autronis-text-secondary mt-1 uppercase tracking-wide">
            Top categorie
          </p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-7">
        <h2 className="text-lg font-semibold text-autronis-text-primary mb-5">
          Verdeling per categorie
        </h2>
        <div className="space-y-3">
          {stats.categorieen.map((c) => (
            <div key={c.categorie} className="flex items-center gap-4">
              <span className="text-sm text-autronis-text-primary w-28 shrink-0">
                {CATEGORIE_LABELS[c.categorie] ?? c.categorie}
              </span>
              <div className="flex-1 h-6 bg-autronis-bg rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(c.seconden / maxCat) * 100}%`,
                    backgroundColor: CATEGORIE_KLEUREN[c.categorie] ?? "#6B7280",
                  }}
                />
              </div>
              <span className="text-sm text-autronis-text-secondary tabular-nums w-20 text-right shrink-0">
                {formatTijd(c.seconden)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Apps */}
      <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-7">
        <h2 className="text-lg font-semibold text-autronis-text-primary mb-5">Top apps</h2>
        <div className="space-y-3">
          {stats.apps.map((a, i) => (
            <div key={a.app} className="flex items-center gap-4">
              <span className="text-xs text-autronis-text-secondary w-5 text-right tabular-nums shrink-0">
                {i + 1}
              </span>
              <span className="text-sm text-autronis-text-primary w-40 truncate shrink-0">
                {a.app}
              </span>
              <div className="flex-1 h-4 bg-autronis-bg rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-autronis-accent/50 transition-all duration-500"
                  style={{ width: `${(a.seconden / maxApp) * 100}%` }}
                />
              </div>
              <span className="text-sm text-autronis-text-secondary tabular-nums w-20 text-right shrink-0">
                {formatTijd(a.seconden)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ TAB: TEAM ============

function TabTeam({ van, tot }: { van: string; tot: string }) {
  const { data: gebruikers } = useGebruikers();
  const { data: alleEntries, isLoading } = useScreenTime(van, tot);

  const perGebruiker = useMemo(() => {
    if (!gebruikers || !alleEntries) return [];
    return gebruikers.map((g) => {
      const entries = alleEntries.filter((e) => e.gebruikerId === g.id);
      const totaal = entries.reduce((s, e) => s + e.duurSeconden, 0);
      const perCategorie: Record<string, number> = {};
      const perApp: Record<string, number> = {};
      for (const e of entries) {
        perCategorie[e.categorie] = (perCategorie[e.categorie] ?? 0) + e.duurSeconden;
        perApp[e.app] = (perApp[e.app] ?? 0) + e.duurSeconden;
      }
      const topApps = Object.entries(perApp)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([app]) => app);
      return { id: g.id, naam: g.naam, totaal, perCategorie, topApps };
    });
  }, [gebruikers, alleEntries]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!perGebruiker.length) {
    return (
      <div className="bg-autronis-card border border-autronis-border rounded-2xl p-12 text-center">
        <Users className="w-12 h-12 text-autronis-text-secondary mx-auto mb-4 opacity-40" />
        <p className="text-autronis-text-secondary text-lg">Geen teamgegevens beschikbaar</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {perGebruiker.map((g) => {
        const maxCat = Math.max(...Object.values(g.perCategorie), 1);
        return (
          <div
            key={g.id}
            className="bg-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-7 card-glow"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-autronis-accent/10 flex items-center justify-center">
                <span className="text-sm font-bold text-autronis-accent">
                  {g.naam.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-base font-semibold text-autronis-text-primary">{g.naam}</p>
                <p className="text-sm text-autronis-text-secondary tabular-nums">
                  {formatTijd(g.totaal)}
                </p>
              </div>
            </div>

            {/* Category mini-bars */}
            <div className="space-y-2 mb-5">
              {Object.entries(g.perCategorie)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, sec]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-xs text-autronis-text-secondary w-24 truncate shrink-0">
                      {CATEGORIE_LABELS[cat] ?? cat}
                    </span>
                    <div className="flex-1 h-3 bg-autronis-bg rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(sec / maxCat) * 100}%`,
                          backgroundColor: CATEGORIE_KLEUREN[cat] ?? "#6B7280",
                        }}
                      />
                    </div>
                    <span className="text-xs text-autronis-text-secondary tabular-nums w-14 text-right shrink-0">
                      {formatTijd(sec)}
                    </span>
                  </div>
                ))}
            </div>

            {/* Top 3 apps */}
            {g.topApps.length > 0 && (
              <div>
                <p className="text-xs text-autronis-text-secondary mb-2 uppercase tracking-wide">
                  Top apps
                </p>
                <div className="flex flex-wrap gap-2">
                  {g.topApps.map((app) => (
                    <span
                      key={app}
                      className="px-2.5 py-1 bg-autronis-bg rounded-lg text-xs text-autronis-text-primary"
                    >
                      {app}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============ TAB: REGELS ============

function TabRegels() {
  const { addToast } = useToast();
  const { data: regels, isLoading } = useScreenTimeRegels();
  const { create, update, remove } = useScreenTimeRegelMutatie();
  const categoriseer = useCategoriseer();

  const [toonForm, setToonForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formType, setFormType] = useState<ScreenTimeRegel["type"]>("app");
  const [formPatroon, setFormPatroon] = useState("");
  const [formCategorie, setFormCategorie] = useState<ScreenTimeCategorie>("development");

  const resetForm = useCallback(() => {
    setToonForm(false);
    setEditId(null);
    setFormType("app");
    setFormPatroon("");
    setFormCategorie("development");
  }, []);

  const handleOpslaan = useCallback(async () => {
    if (!formPatroon.trim()) return;
    try {
      if (editId !== null) {
        await update.mutateAsync({
          id: editId,
          body: { type: formType, patroon: formPatroon.trim(), categorie: formCategorie },
        });
        addToast("Regel bijgewerkt", "succes");
      } else {
        await create.mutateAsync({
          type: formType,
          patroon: formPatroon.trim(),
          categorie: formCategorie,
        });
        addToast("Regel aangemaakt", "succes");
      }
      resetForm();
    } catch {
      addToast("Kon regel niet opslaan", "fout");
    }
  }, [formPatroon, formType, formCategorie, editId, create, update, addToast, resetForm]);

  const handleVerwijder = useCallback(
    async (id: number) => {
      try {
        await remove.mutateAsync(id);
        addToast("Regel verwijderd", "succes");
      } catch {
        addToast("Kon regel niet verwijderen", "fout");
      }
    },
    [remove, addToast]
  );

  const handleBewerk = useCallback((regel: ScreenTimeRegel) => {
    setEditId(regel.id);
    setFormType(regel.type);
    setFormPatroon(regel.patroon);
    setFormCategorie(regel.categorie);
    setToonForm(true);
  }, []);

  const handleCategoriseer = useCallback(async () => {
    try {
      await categoriseer.mutateAsync({ entryIds: [] });
      addToast("AI categorisering gestart", "succes");
    } catch {
      addToast("Kon niet categoriseren", "fout");
    }
  }, [categoriseer, addToast]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 rounded-lg" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { resetForm(); setToonForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-autronis-accent text-autronis-bg rounded-xl font-medium text-sm hover:bg-autronis-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nieuwe regel
        </button>
        <button
          onClick={handleCategoriseer}
          disabled={categoriseer.isPending}
          className="flex items-center gap-2 px-4 py-2.5 bg-autronis-card border border-autronis-border text-autronis-text-primary rounded-xl font-medium text-sm hover:border-autronis-accent/40 transition-colors disabled:opacity-50"
        >
          {categoriseer.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-yellow-400" />
          )}
          AI Categoriseren
        </button>
      </div>

      {/* Inline form */}
      {toonForm && (
        <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-autronis-text-primary">
            {editId !== null ? "Regel bewerken" : "Nieuwe regel"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-autronis-text-secondary mb-1.5">Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as ScreenTimeRegel["type"])}
                className="w-full bg-autronis-bg border border-autronis-border rounded-lg px-3 py-2 text-sm text-autronis-text-primary focus:outline-none focus:border-autronis-accent transition-colors"
              >
                <option value="app">App</option>
                <option value="url">URL</option>
                <option value="venstertitel">Venster</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-autronis-text-secondary mb-1.5">Patroon</label>
              <input
                type="text"
                value={formPatroon}
                onChange={(e) => setFormPatroon(e.target.value)}
                placeholder="bijv. VS Code, *slack*"
                className="w-full bg-autronis-bg border border-autronis-border rounded-lg px-3 py-2 text-sm text-autronis-text-primary placeholder:text-autronis-text-secondary/50 focus:outline-none focus:border-autronis-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-autronis-text-secondary mb-1.5">Categorie</label>
              <select
                value={formCategorie}
                onChange={(e) => setFormCategorie(e.target.value as ScreenTimeCategorie)}
                className="w-full bg-autronis-bg border border-autronis-border rounded-lg px-3 py-2 text-sm text-autronis-text-primary focus:outline-none focus:border-autronis-accent transition-colors"
              >
                {Object.entries(CATEGORIE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpslaan}
              disabled={!formPatroon.trim() || create.isPending || update.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-autronis-accent text-autronis-bg rounded-lg font-medium text-sm hover:bg-autronis-accent-hover transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Opslaan
            </button>
            <button
              onClick={resetForm}
              className="flex items-center gap-2 px-4 py-2 text-autronis-text-secondary hover:text-autronis-text-primary text-sm transition-colors"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      {!regels?.length && !toonForm ? (
        <div className="bg-autronis-card border border-autronis-border rounded-2xl p-12 text-center">
          <Shield className="w-12 h-12 text-autronis-text-secondary mx-auto mb-4 opacity-40" />
          <p className="text-autronis-text-secondary text-lg">Nog geen regels ingesteld</p>
          <p className="text-autronis-text-secondary text-sm mt-1 opacity-60">
            Regels koppelen apps en websites automatisch aan categorieeen.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {regels?.map((regel) => (
            <div
              key={regel.id}
              className="bg-autronis-card border border-autronis-border rounded-xl p-4 flex items-center gap-4 hover:border-autronis-accent/20 transition-colors"
            >
              <TypeIcon type={regel.type} />
              <span className="text-sm font-mono text-autronis-text-primary flex-1 truncate">
                {regel.patroon}
              </span>
              <CategorieBadge categorie={regel.categorie} />
              {(regel.projectNaam || regel.klantNaam) && (
                <span className="text-xs text-autronis-text-secondary truncate max-w-32">
                  {regel.projectNaam ?? regel.klantNaam}
                </span>
              )}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleBewerk(regel)}
                  className="p-1.5 text-autronis-text-secondary hover:text-autronis-accent transition-colors rounded-lg hover:bg-autronis-accent/10"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleVerwijder(regel.id)}
                  className="p-1.5 text-autronis-text-secondary hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ TAB: SUGGESTIES ============

function TabSuggesties() {
  const { addToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<"openstaand" | "goedgekeurd" | "afgewezen">(
    "openstaand"
  );
  const { data: suggesties, isLoading } = useScreenTimeSuggesties(statusFilter);
  const mutatie = useScreenTimeSuggestieMutatie();

  const handleActie = useCallback(
    async (id: number, status: "goedgekeurd" | "afgewezen") => {
      try {
        await mutatie.mutateAsync({ id, status });
        addToast(status === "goedgekeurd" ? "Suggestie goedgekeurd" : "Suggestie afgewezen", "succes");
      } catch {
        addToast("Kon suggestie niet bijwerken", "fout");
      }
    },
    [mutatie, addToast]
  );

  const handleAllesGoedkeuren = useCallback(async () => {
    if (!suggesties?.length) return;
    try {
      await Promise.all(suggesties.map((s) => mutatie.mutateAsync({ id: s.id, status: "goedgekeurd" })));
      addToast(`${suggesties.length} suggesties goedgekeurd`, "succes");
    } catch {
      addToast("Kon niet alle suggesties goedkeuren", "fout");
    }
  }, [suggesties, mutatie, addToast]);

  const STATUS_TABS: { key: typeof statusFilter; label: string }[] = [
    { key: "openstaand", label: "Openstaand" },
    { key: "goedgekeurd", label: "Goedgekeurd" },
    { key: "afgewezen", label: "Afgewezen" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status filter + bulk action */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-autronis-card border border-autronis-border rounded-xl p-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                statusFilter === t.key
                  ? "bg-autronis-accent text-autronis-bg"
                  : "text-autronis-text-secondary hover:text-autronis-text-primary"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        {statusFilter === "openstaand" && (suggesties?.length ?? 0) > 1 && (
          <button
            onClick={handleAllesGoedkeuren}
            disabled={mutatie.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl text-sm font-medium hover:bg-green-500/20 transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            Alles goedkeuren ({suggesties?.length})
          </button>
        )}
      </div>

      {/* Suggestions list */}
      {!suggesties?.length ? (
        <div className="bg-autronis-card border border-autronis-border rounded-2xl p-12 text-center">
          <Lightbulb className="w-12 h-12 text-autronis-text-secondary mx-auto mb-4 opacity-40" />
          <p className="text-autronis-text-secondary text-lg">
            Geen {statusFilter === "openstaand" ? "openstaande" : statusFilter === "goedgekeurd" ? "goedgekeurde" : "afgewezen"} suggesties
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggesties.map((s) => (
            <div
              key={s.id}
              className="bg-autronis-card border border-autronis-border rounded-xl p-5 flex items-start gap-4 hover:border-autronis-accent/20 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      s.type === "categorie"
                        ? "bg-purple-500/15 text-purple-400"
                        : s.type === "tijdregistratie"
                          ? "bg-blue-500/15 text-blue-400"
                          : "bg-yellow-500/15 text-yellow-400"
                    )}
                  >
                    {s.type === "categorie"
                      ? "Categorie"
                      : s.type === "tijdregistratie"
                        ? "Tijdregistratie"
                        : "Project koppeling"}
                  </span>
                  <span className="text-xs text-autronis-text-secondary tabular-nums">
                    {new Date(s.startTijd).toLocaleString("nl-NL", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" - "}
                    {new Date(s.eindTijd).toLocaleTimeString("nl-NL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm text-autronis-text-primary">{s.voorstel}</p>
              </div>
              {statusFilter === "openstaand" && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleActie(s.id, "goedgekeurd")}
                    disabled={mutatie.isPending}
                    className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Goedkeuren"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleActie(s.id, "afgewezen")}
                    disabled={mutatie.isPending}
                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Afwijzen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ MAIN PAGE ============

export default function SchermtijdPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overzicht");
  const [periode, setPeriode] = useState<Periode>("dag");
  const [datum, setDatum] = useState(() => new Date());

  const { van, tot } = useMemo(() => berekenVanTot(datum, periode), [datum, periode]);
  const { data: entries, isLoading } = useScreenTime(van, tot);

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-autronis-text-primary">Schermtijd</h1>
            <p className="text-base text-autronis-text-secondary mt-1">
              Inzicht in app- en websitegebruik
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-autronis-card border border-autronis-border rounded-xl p-1 w-fit">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-autronis-accent text-autronis-bg"
                    : "text-autronis-text-secondary hover:text-autronis-text-primary"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Period selector (only for overzicht and team) */}
        {(activeTab === "overzicht" || activeTab === "team") && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex bg-autronis-card border border-autronis-border rounded-xl p-1">
              {(["dag", "week", "maand"] as Periode[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriode(p)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors",
                    periode === p
                      ? "bg-autronis-accent text-autronis-bg"
                      : "text-autronis-text-secondary hover:text-autronis-text-primary"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDatum(navigeerDatum(datum, periode, -1))}
                className="p-2 text-autronis-text-secondary hover:text-autronis-text-primary bg-autronis-card border border-autronis-border rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-autronis-text-primary font-medium min-w-48 text-center">
                {datumLabel(datum, periode)}
              </span>
              <button
                onClick={() => setDatum(navigeerDatum(datum, periode, 1))}
                className="p-2 text-autronis-text-secondary hover:text-autronis-text-primary bg-autronis-card border border-autronis-border rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab content */}
        {activeTab === "overzicht" && (
          <TabOverzicht entries={entries ?? []} isLoading={isLoading} />
        )}
        {activeTab === "team" && <TabTeam van={van} tot={tot} />}
        {activeTab === "regels" && <TabRegels />}
        {activeTab === "suggesties" && <TabSuggesties />}
      </div>
    </PageTransition>
  );
}
