"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Flame,
  Trophy,
  TrendingUp,
  Calendar,
  CheckCircle2,
  X,
  Pencil,
  Trash2,
  Lightbulb,
  ArrowRight,
  Loader2,
  Target,
  Dumbbell,
  BookOpen,
  Megaphone,
  Users,
  GraduationCap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/ui/page-transition";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// Icon mapping for Lucide icons
const ICON_MAP: Record<string, typeof Target> = {
  Target,
  Dumbbell,
  BookOpen,
  Megaphone,
  Users,
  GraduationCap,
  Sparkles,
  Flame,
  Trophy,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Lightbulb,
  Plus,
};

const ICON_OPTIONS = [
  { naam: "Target", icon: Target },
  { naam: "Dumbbell", icon: Dumbbell },
  { naam: "BookOpen", icon: BookOpen },
  { naam: "Megaphone", icon: Megaphone },
  { naam: "Users", icon: Users },
  { naam: "GraduationCap", icon: GraduationCap },
  { naam: "Sparkles", icon: Sparkles },
  { naam: "Flame", icon: Flame },
  { naam: "Trophy", icon: Trophy },
  { naam: "TrendingUp", icon: TrendingUp },
  { naam: "Calendar", icon: Calendar },
  { naam: "Lightbulb", icon: Lightbulb },
];

interface Gewoonte {
  id: number;
  naam: string;
  icoon: string;
  frequentie: string;
  streefwaarde: string | null;
  volgorde: number;
  voltooidVandaag: boolean;
}

interface Suggestie {
  naam: string;
  icoon: string;
  streefwaarde: string | null;
}

interface HabitStat {
  id: number;
  naam: string;
  icoon: string;
  huidigeStreak: number;
  langsteStreak: number;
  weekVoltooid: number;
  maandVoltooid: number;
  totaalVoltooid: number;
  completionRate: number;
  besteDag: string;
  slechteDag: string;
  heatmap: Record<string, number>;
}

// Heatmap component (GitHub-style)
function Heatmap({ data, naam }: { data: Record<string, number>; naam: string }) {
  const nu = new Date();
  const weken = 52;
  const cellen: { datum: string; waarde: number; dag: number; week: number }[] = [];

  // Start from 52 weeks ago, aligned to Monday
  const start = new Date(nu);
  start.setDate(start.getDate() - (weken * 7) - (start.getDay() === 0 ? 6 : start.getDay() - 1));

  for (let w = 0; w <= weken; w++) {
    for (let d = 0; d < 7; d++) {
      const datum = new Date(start);
      datum.setDate(start.getDate() + w * 7 + d);
      if (datum > nu) continue;
      const datumStr = datum.toISOString().slice(0, 10);
      cellen.push({
        datum: datumStr,
        waarde: data[datumStr] || 0,
        dag: d,
        week: w,
      });
    }
  }

  const maanden: { label: string; week: number }[] = [];
  let laatsteMaand = -1;
  for (const cel of cellen) {
    const maand = new Date(cel.datum).getMonth();
    if (maand !== laatsteMaand && cel.dag === 0) {
      maanden.push({
        label: new Date(cel.datum).toLocaleDateString("nl-NL", { month: "short" }),
        week: cel.week,
      });
      laatsteMaand = maand;
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium text-autronis-text-primary">{naam}</span>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Month labels */}
          <div className="flex mb-1 ml-6">
            {maanden.map((m, i) => (
              <span
                key={i}
                className="text-[10px] text-autronis-text-secondary"
                style={{ position: "relative", left: `${m.week * 14}px` }}
              >
                {m.label}
              </span>
            ))}
          </div>
          <div className="flex gap-0.5">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1">
              {["Ma", "", "Wo", "", "Vr", "", ""].map((d, i) => (
                <span key={i} className="text-[9px] text-autronis-text-secondary h-[12px] leading-[12px]">
                  {d}
                </span>
              ))}
            </div>
            {/* Grid */}
            {Array.from({ length: weken + 1 }, (_, w) => (
              <div key={w} className="flex flex-col gap-0.5">
                {Array.from({ length: 7 }, (_, d) => {
                  const cel = cellen.find((c) => c.week === w && c.dag === d);
                  if (!cel) return <div key={d} className="w-[12px] h-[12px]" />;
                  return (
                    <div
                      key={d}
                      className={cn(
                        "w-[12px] h-[12px] rounded-sm transition-colors",
                        cel.waarde > 0
                          ? "bg-emerald-500"
                          : "bg-autronis-border/50"
                      )}
                      title={`${cel.datum}: ${cel.waarde > 0 ? "Voltooid" : "Gemist"}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 mt-2 ml-6">
            <span className="text-[10px] text-autronis-text-secondary">Minder</span>
            <div className="w-[12px] h-[12px] rounded-sm bg-autronis-border/50" />
            <div className="w-[12px] h-[12px] rounded-sm bg-emerald-500/40" />
            <div className="w-[12px] h-[12px] rounded-sm bg-emerald-500" />
            <span className="text-[10px] text-autronis-text-secondary">Meer</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Form modal
function GewoonteModal({
  open,
  onClose,
  onSave,
  gewoonte,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: { naam: string; icoon: string; frequentie: string; streefwaarde: string }) => void;
  gewoonte?: Gewoonte | null;
}) {
  const [naam, setNaam] = useState("");
  const [icoon, setIcoon] = useState("Target");
  const [frequentie, setFrequentie] = useState("dagelijks");
  const [streefwaarde, setStreefwaarde] = useState("");

  useEffect(() => {
    if (gewoonte) {
      setNaam(gewoonte.naam);
      setIcoon(gewoonte.icoon);
      setFrequentie(gewoonte.frequentie);
      setStreefwaarde(gewoonte.streefwaarde || "");
    } else {
      setNaam("");
      setIcoon("Target");
      setFrequentie("dagelijks");
      setStreefwaarde("");
    }
  }, [gewoonte, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">
            {gewoonte ? "Gewoonte bewerken" : "Nieuwe gewoonte"}
          </h3>
          <button onClick={onClose} className="text-autronis-text-secondary hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-autronis-text-secondary mb-1 block">Naam</label>
            <input
              type="text"
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              placeholder="Bijv. Sporten"
              className="w-full bg-autronis-bg border border-autronis-border rounded-xl px-4 py-3 text-sm text-autronis-text-primary placeholder:text-autronis-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-autronis-accent/50 focus:border-autronis-accent transition-colors"
            />
          </div>

          <div>
            <label className="text-sm text-autronis-text-secondary mb-1 block">Icoon</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(({ naam: iconNaam, icon: Icon }) => (
                <button
                  key={iconNaam}
                  type="button"
                  onClick={() => setIcoon(iconNaam)}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all",
                    icoon === iconNaam
                      ? "bg-autronis-accent/15 border-autronis-accent text-autronis-accent"
                      : "bg-autronis-bg border-autronis-border text-autronis-text-secondary hover:border-autronis-accent/50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-autronis-text-secondary mb-1 block">Frequentie</label>
            <select
              value={frequentie}
              onChange={(e) => setFrequentie(e.target.value)}
              className="w-full bg-autronis-bg border border-autronis-border rounded-xl px-4 py-3 text-sm text-autronis-text-primary focus:outline-none focus:ring-2 focus:ring-autronis-accent/50 focus:border-autronis-accent transition-colors"
            >
              <option value="dagelijks">Dagelijks</option>
              <option value="weekelijks">Weekelijks</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-autronis-text-secondary mb-1 block">Streefwaarde (optioneel)</label>
            <input
              type="text"
              value={streefwaarde}
              onChange={(e) => setStreefwaarde(e.target.value)}
              placeholder="Bijv. 30 min, 1 persoon"
              className="w-full bg-autronis-bg border border-autronis-border rounded-xl px-4 py-3 text-sm text-autronis-text-primary placeholder:text-autronis-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-autronis-accent/50 focus:border-autronis-accent transition-colors"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-autronis-border rounded-xl text-sm text-autronis-text-secondary hover:bg-autronis-border/30 transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={() => {
              if (!naam.trim()) return;
              onSave({ naam: naam.trim(), icoon, frequentie, streefwaarde });
            }}
            disabled={!naam.trim()}
            className="flex-1 px-4 py-3 bg-autronis-accent hover:bg-autronis-accent-hover text-autronis-bg rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 btn-press"
          >
            {gewoonte ? "Opslaan" : "Toevoegen"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GewoontesPagina() {
  const { addToast } = useToast();
  const [gewoontesList, setGewoontesList] = useState<Gewoonte[]>([]);
  const [suggesties, setSuggesties] = useState<Suggestie[]>([]);
  const [statistieken, setStatistieken] = useState<HabitStat[]>([]);
  const [weekRate, setWeekRate] = useState(0);
  const [maandRate, setMaandRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editGewoonte, setEditGewoonte] = useState<Gewoonte | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [gRes, sRes] = await Promise.all([
        fetch("/api/gewoontes"),
        fetch("/api/gewoontes/statistieken"),
      ]);
      const gData = await gRes.json();
      const sData = await sRes.json();
      setGewoontesList(gData.gewoontes || []);
      setSuggesties(gData.suggesties || []);
      setStatistieken(sData.statistieken || []);
      setWeekRate(sData.weekCompletionRate || 0);
      setMaandRate(sData.maandCompletionRate || 0);
    } catch {
      addToast("Kon gewoontes niet laden", "fout");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleGewoonte = async (gewoonteId: number) => {
    const vandaag = new Date().toISOString().slice(0, 10);
    try {
      const res = await fetch("/api/gewoontes/logboek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gewoonteId, datum: vandaag }),
      });
      if (!res.ok) throw new Error();
      // Optimistic update
      setGewoontesList((prev) =>
        prev.map((g) =>
          g.id === gewoonteId ? { ...g, voltooidVandaag: !g.voltooidVandaag } : g
        )
      );
      // Refresh stats
      fetch("/api/gewoontes/statistieken")
        .then((r) => r.json())
        .then((d) => {
          setStatistieken(d.statistieken || []);
          setWeekRate(d.weekCompletionRate || 0);
          setMaandRate(d.maandCompletionRate || 0);
        });
    } catch {
      addToast("Kon gewoonte niet bijwerken", "fout");
    }
  };

  const handleSave = async (data: { naam: string; icoon: string; frequentie: string; streefwaarde: string }) => {
    try {
      if (editGewoonte) {
        const res = await fetch(`/api/gewoontes/${editGewoonte.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error();
        addToast("Gewoonte bijgewerkt", "succes");
      } else {
        const res = await fetch("/api/gewoontes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error();
        addToast("Gewoonte toegevoegd", "succes");
      }
      setModalOpen(false);
      setEditGewoonte(null);
      fetchData();
    } catch {
      addToast("Kon gewoonte niet opslaan", "fout");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/gewoontes/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      addToast("Gewoonte verwijderd", "succes");
      setDeleteId(null);
      fetchData();
    } catch {
      addToast("Kon gewoonte niet verwijderen", "fout");
    }
  };

  const addSuggestie = async (s: Suggestie) => {
    try {
      const res = await fetch("/api/gewoontes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      if (!res.ok) throw new Error();
      addToast(`${s.naam} toegevoegd`, "succes");
      fetchData();
    } catch {
      addToast("Kon suggestie niet toevoegen", "fout");
    }
  };

  const voltooid = gewoontesList.filter((g) => g.voltooidVandaag).length;
  const totaal = gewoontesList.length;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-autronis-accent animate-spin" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Gewoontes</h1>
            <p className="text-base text-autronis-text-secondary mt-1">
              Bouw consistente gewoontes op en track je voortgang
            </p>
          </div>
          <button
            onClick={() => {
              setEditGewoonte(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-3 bg-autronis-accent hover:bg-autronis-accent-hover text-autronis-bg rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-autronis-accent/20 btn-press"
          >
            <Plus className="w-4 h-4" />
            Nieuwe gewoonte
          </button>
        </div>

        {/* Suggesties (alleen als er geen gewoontes zijn) */}
        {suggesties.length > 0 && (
          <div className="bg-autronis-card border border-autronis-accent/20 rounded-2xl p-6 lg:p-7 card-gradient">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-autronis-accent" />
              <h2 className="text-lg font-semibold text-white">Aanbevolen gewoontes</h2>
            </div>
            <p className="text-sm text-autronis-text-secondary mb-4">
              Klik op een gewoonte om deze toe te voegen aan je tracker.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {suggesties.map((s) => {
                const Icon = ICON_MAP[s.icoon] || Target;
                return (
                  <button
                    key={s.naam}
                    onClick={() => addSuggestie(s)}
                    className="flex items-center gap-3 bg-autronis-bg/50 rounded-xl p-4 text-left hover:bg-autronis-bg/80 transition-colors group border border-transparent hover:border-autronis-accent/30"
                  >
                    <div className="p-2 bg-autronis-accent/10 rounded-xl group-hover:bg-autronis-accent/20 transition-colors">
                      <Icon className="w-5 h-5 text-autronis-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-autronis-text-primary">{s.naam}</p>
                      {s.streefwaarde && (
                        <p className="text-xs text-autronis-text-secondary">{s.streefwaarde}</p>
                      )}
                    </div>
                    <Plus className="w-4 h-4 text-autronis-text-secondary ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Vandaag overzicht + KPI's */}
        {totaal > 0 && (
          <>
            {/* Score vandaag */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 card-glow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-500/10 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-sm text-autronis-text-secondary">Vandaag</span>
                </div>
                <p className="text-3xl font-bold text-white tabular-nums">
                  {voltooid}/{totaal}
                </p>
                <p className="text-sm text-autronis-text-secondary mt-1">gewoontes voltooid</p>
              </div>
              <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 card-glow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-sm text-autronis-text-secondary">Deze week</span>
                </div>
                <p className="text-3xl font-bold text-white tabular-nums">{weekRate}%</p>
                <p className="text-sm text-autronis-text-secondary mt-1">completion rate</p>
              </div>
              <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 card-glow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-500/10 rounded-xl">
                    <Calendar className="w-5 h-5 text-purple-400" />
                  </div>
                  <span className="text-sm text-autronis-text-secondary">Deze maand</span>
                </div>
                <p className="text-3xl font-bold text-white tabular-nums">{maandRate}%</p>
                <p className="text-sm text-autronis-text-secondary mt-1">completion rate</p>
              </div>
            </div>

            {/* Gewoontes lijst vandaag */}
            <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-7 card-glow">
              <h2 className="text-xl font-semibold text-white mb-5 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-autronis-accent" />
                Vandaag
              </h2>
              <div className="space-y-3">
                {gewoontesList.map((g) => {
                  const Icon = ICON_MAP[g.icoon] || Target;
                  const stat = statistieken.find((s) => s.id === g.id);
                  return (
                    <div
                      key={g.id}
                      className={cn(
                        "bg-autronis-bg/50 rounded-xl p-4 flex items-center gap-4 group transition-all",
                        g.voltooidVandaag && "bg-emerald-500/5 border border-emerald-500/20"
                      )}
                    >
                      <button
                        onClick={() => toggleGewoonte(g.id)}
                        className={cn(
                          "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                          g.voltooidVandaag
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-autronis-border hover:border-emerald-500/50"
                        )}
                      >
                        {g.voltooidVandaag && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      <div className="p-2 bg-autronis-accent/10 rounded-xl flex-shrink-0">
                        <Icon className="w-4 h-4 text-autronis-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-base font-medium transition-colors",
                          g.voltooidVandaag ? "text-emerald-400 line-through" : "text-autronis-text-primary"
                        )}>
                          {g.naam}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {g.streefwaarde && (
                            <span className="text-xs text-autronis-text-secondary">{g.streefwaarde}</span>
                          )}
                          <span className="text-xs text-autronis-text-secondary capitalize">{g.frequentie}</span>
                        </div>
                      </div>
                      {stat && stat.huidigeStreak > 0 && (
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-orange-400 tabular-nums flex-shrink-0">
                          <Flame className="w-4 h-4" />
                          {stat.huidigeStreak}
                        </span>
                      )}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => {
                            setEditGewoonte(g);
                            setModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-autronis-text-secondary hover:text-white hover:bg-autronis-border/50 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(g.id)}
                          className="p-1.5 rounded-lg text-autronis-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Statistieken per gewoonte */}
            <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-7 card-glow">
              <h2 className="text-xl font-semibold text-white mb-5 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-autronis-accent" />
                Statistieken
              </h2>
              <div className="space-y-6">
                {statistieken.map((stat) => {
                  const Icon = ICON_MAP[stat.icoon] || Target;
                  return (
                    <div key={stat.id} className="bg-autronis-bg/50 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-autronis-accent/10 rounded-xl">
                          <Icon className="w-4 h-4 text-autronis-accent" />
                        </div>
                        <span className="text-base font-semibold text-autronis-text-primary">{stat.naam}</span>
                      </div>
                      {/* Stats grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                        <div>
                          <p className="text-xs text-autronis-text-secondary">Huidige streak</p>
                          <p className="text-lg font-bold text-orange-400 tabular-nums flex items-center gap-1">
                            <Flame className="w-4 h-4" />
                            {stat.huidigeStreak} dagen
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-autronis-text-secondary">Langste streak</p>
                          <p className="text-lg font-bold text-autronis-text-primary tabular-nums">
                            {stat.langsteStreak} dagen
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-autronis-text-secondary">Beste dag</p>
                          <p className="text-lg font-bold text-emerald-400">{stat.besteDag}</p>
                        </div>
                        <div>
                          <p className="text-xs text-autronis-text-secondary">Completion rate</p>
                          <p className="text-lg font-bold text-blue-400 tabular-nums">{stat.completionRate}%</p>
                        </div>
                      </div>
                      {/* Heatmap */}
                      <Heatmap data={stat.heatmap} naam={stat.naam} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Tips */}
            {statistieken.some((s) => s.totaalVoltooid > 3) && (
              <div className="bg-autronis-card border border-amber-500/20 rounded-2xl p-6 lg:p-7 card-glow card-gradient">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-400" />
                  Slimme tips
                </h2>
                <div className="space-y-3">
                  {statistieken
                    .filter((s) => s.totaalVoltooid > 3)
                    .map((stat) => {
                      const tips: string[] = [];

                      if (stat.slechteDag !== "-" && stat.slechteDag !== stat.besteDag) {
                        tips.push(
                          `Je mist "${stat.naam}" vaak op ${stat.slechteDag}. Probeer het in de ochtend in te plannen.`
                        );
                      }

                      if (stat.huidigeStreak > 5) {
                        tips.push(
                          `Sterk! Je streak van ${stat.huidigeStreak} dagen voor "${stat.naam}" is indrukwekkend. Blijf doorgaan!`
                        );
                      }

                      if (stat.completionRate < 50) {
                        tips.push(
                          `"${stat.naam}" heeft een lage completion rate (${stat.completionRate}%). Overweeg de streefwaarde te verlagen.`
                        );
                      }

                      if (stat.completionRate >= 80) {
                        tips.push(
                          `"${stat.naam}" loopt goed (${stat.completionRate}%). Misschien tijd om de lat hoger te leggen?`
                        );
                      }

                      return tips.map((tip, i) => (
                        <div
                          key={`${stat.id}-${i}`}
                          className="flex items-start gap-3 bg-amber-500/5 rounded-xl p-4 border border-amber-500/10"
                        >
                          <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-autronis-text-primary leading-relaxed">{tip}</p>
                        </div>
                      ));
                    })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {totaal === 0 && suggesties.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex p-4 bg-autronis-accent/10 rounded-2xl mb-4">
              <Target className="w-10 h-10 text-autronis-accent" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Geen gewoontes</h2>
            <p className="text-autronis-text-secondary mb-6">
              Voeg je eerste gewoonte toe om te beginnen met tracken.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-autronis-accent hover:bg-autronis-accent-hover text-autronis-bg rounded-xl text-sm font-semibold transition-colors btn-press"
            >
              <Plus className="w-4 h-4" />
              Eerste gewoonte toevoegen
            </button>
          </div>
        )}

        {/* Modal */}
        <GewoonteModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditGewoonte(null);
          }}
          onSave={handleSave}
          gewoonte={editGewoonte}
        />

        {/* Delete dialog */}
        <ConfirmDialog
          open={deleteId !== null}
          titel="Gewoonte verwijderen"
          bericht="Weet je zeker dat je deze gewoonte wilt verwijderen? De bijbehorende statistieken gaan verloren."
          onBevestig={handleDelete}
          onClose={() => setDeleteId(null)}
        />
      </div>
    </PageTransition>
  );
}
