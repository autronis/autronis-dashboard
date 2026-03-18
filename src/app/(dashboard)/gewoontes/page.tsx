"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  Loader2,
  Target,
  Dumbbell,
  BookOpen,
  Megaphone,
  Users,
  GraduationCap,
  Sparkles,
  Award,
  Zap,
  Star,
  Crown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/ui/page-transition";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// Icon mapping for Lucide icons
const ICON_MAP: Record<string, typeof Target> = {
  Target, Dumbbell, BookOpen, Megaphone, Users, GraduationCap,
  Sparkles, Flame, Trophy, TrendingUp, Calendar, CheckCircle2,
  Lightbulb, Plus, Award, Zap, Star, Crown,
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
  frequentie?: string;
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

// ─── Gamification ───
function calculateLevel(totaalPunten: number): { level: number; naam: string; volgende: number; voortgang: number } {
  const levels = [
    { punten: 0, naam: "Beginner" },
    { punten: 50, naam: "Starter" },
    { punten: 150, naam: "Consistent" },
    { punten: 350, naam: "Gedreven" },
    { punten: 700, naam: "Expert" },
    { punten: 1200, naam: "Master" },
    { punten: 2000, naam: "Legende" },
  ];

  let currentLevel = 0;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (totaalPunten >= levels[i].punten) {
      currentLevel = i;
      break;
    }
  }

  const volgende = currentLevel < levels.length - 1 ? levels[currentLevel + 1].punten : levels[currentLevel].punten;
  const huidige = levels[currentLevel].punten;
  const voortgang = currentLevel < levels.length - 1
    ? ((totaalPunten - huidige) / (volgende - huidige)) * 100
    : 100;

  return { level: currentLevel + 1, naam: levels[currentLevel].naam, volgende, voortgang };
}

function getBadges(stats: HabitStat[]): Array<{ naam: string; icoon: typeof Trophy; kleur: string; behaald: boolean }> {
  const maxStreak = Math.max(...stats.map((s) => s.huidigeStreak), 0);
  const maxLangsteStreak = Math.max(...stats.map((s) => s.langsteStreak), 0);
  const gemRate = stats.length > 0 ? stats.reduce((s, st) => s + st.completionRate, 0) / stats.length : 0;

  return [
    { naam: "7 dagen streak", icoon: Flame, kleur: "text-orange-400 bg-orange-500/10", behaald: maxStreak >= 7 },
    { naam: "30 dagen streak", icoon: Flame, kleur: "text-red-400 bg-red-500/10", behaald: maxLangsteStreak >= 30 },
    { naam: "Week perfect", icoon: Star, kleur: "text-yellow-400 bg-yellow-500/10", behaald: stats.some((s) => s.weekVoltooid >= 7) },
    { naam: "80% consistent", icoon: TrendingUp, kleur: "text-emerald-400 bg-emerald-500/10", behaald: gemRate >= 80 },
    { naam: "5 gewoontes", icoon: Crown, kleur: "text-purple-400 bg-purple-500/10", behaald: stats.length >= 5 },
    { naam: "100 keer voltooid", icoon: Trophy, kleur: "text-autronis-accent bg-autronis-accent/10", behaald: stats.some((s) => s.totaalVoltooid >= 100) },
  ];
}

// ─── Streak flame scaling ───
function StreakFlame({ streak }: { streak: number }) {
  if (streak === 0) return null;
  const size = streak >= 30 ? "w-6 h-6" : streak >= 14 ? "w-5 h-5" : streak >= 7 ? "w-4.5 h-4.5" : "w-4 h-4";
  const color = streak >= 30 ? "text-red-400" : streak >= 14 ? "text-orange-400" : streak >= 7 ? "text-orange-400" : "text-orange-400/70";
  const animate = streak >= 14 ? "animate-pulse" : "";

  return (
    <span className={cn("inline-flex items-center gap-1 font-bold tabular-nums", color)}>
      <Flame className={cn(size, animate)} />
      <span className="text-sm">{streak}</span>
    </span>
  );
}

// ─── Heatmap ───
function Heatmap({ data, naam, totaalGewoontes }: { data: Record<string, number>; naam?: string; totaalGewoontes?: number }) {
  const nu = new Date();
  const weken = 26; // 6 months for more detail

  const start = new Date(nu);
  start.setDate(start.getDate() - (weken * 7) - (start.getDay() === 0 ? 6 : start.getDay() - 1));

  const celMap = new Map<string, { datum: string; waarde: number; dag: number; week: number }>();
  const cellen: typeof celMap extends Map<string, infer V> ? V[] : never = [];

  for (let w = 0; w <= weken; w++) {
    for (let d = 0; d < 7; d++) {
      const datum = new Date(start);
      datum.setDate(start.getDate() + w * 7 + d);
      if (datum > nu) continue;
      const datumStr = datum.toISOString().slice(0, 10);
      const cel = { datum: datumStr, waarde: data[datumStr] || 0, dag: d, week: w };
      cellen.push(cel);
      celMap.set(`${w}-${d}`, cel);
    }
  }

  // Month labels
  const maanden: { label: string; week: number }[] = [];
  let laatsteMaand = -1;
  for (const cel of cellen) {
    const maand = new Date(cel.datum).getMonth();
    if (maand !== laatsteMaand && cel.dag === 0) {
      maanden.push({ label: new Date(cel.datum).toLocaleDateString("nl-NL", { month: "short" }), week: cel.week });
      laatsteMaand = maand;
    }
  }

  const dagLabels = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

  function getCelColor(waarde: number): string {
    if (waarde === 0) return "bg-autronis-border/30";
    if (totaalGewoontes && totaalGewoontes > 1) {
      const ratio = waarde / totaalGewoontes;
      if (ratio >= 1) return "bg-emerald-500";
      if (ratio >= 0.5) return "bg-emerald-500/60";
      return "bg-emerald-500/30";
    }
    return "bg-emerald-500";
  }

  return (
    <div>
      {naam && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-autronis-text-primary">{naam}</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Month labels */}
          <div className="flex mb-1 ml-8">
            {maanden.map((m, i) => (
              <span key={i} className="text-[10px] text-autronis-text-secondary" style={{ position: "relative", left: `${m.week * 15}px` }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {/* Day labels — show all 7 */}
            <div className="flex flex-col gap-[3px] mr-1">
              {dagLabels.map((d) => (
                <span key={d} className="text-[9px] text-autronis-text-secondary h-[13px] leading-[13px] w-5">
                  {d}
                </span>
              ))}
            </div>
            {/* Grid */}
            {Array.from({ length: weken + 1 }, (_, w) => (
              <div key={w} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }, (_, d) => {
                  const cel = celMap.get(`${w}-${d}`);
                  if (!cel) return <div key={d} className="w-[13px] h-[13px]" />;
                  const isVandaag = cel.datum === nu.toISOString().slice(0, 10);
                  return (
                    <div
                      key={d}
                      className={cn(
                        "w-[13px] h-[13px] rounded-sm transition-colors",
                        getCelColor(cel.waarde),
                        isVandaag && "ring-1 ring-autronis-accent"
                      )}
                      title={`${new Date(cel.datum).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}: ${cel.waarde > 0 ? `${cel.waarde} voltooid` : "Gemist"}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 mt-2 ml-8">
            <span className="text-[10px] text-autronis-text-secondary">Minder</span>
            <div className="w-[13px] h-[13px] rounded-sm bg-autronis-border/30" />
            <div className="w-[13px] h-[13px] rounded-sm bg-emerald-500/30" />
            <div className="w-[13px] h-[13px] rounded-sm bg-emerald-500/60" />
            <div className="w-[13px] h-[13px] rounded-sm bg-emerald-500" />
            <span className="text-[10px] text-autronis-text-secondary">Meer</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal ───
function GewoonteModal({ open, onClose, onSave, gewoonte }: {
  open: boolean; onClose: () => void;
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
      setNaam(""); setIcoon("Target"); setFrequentie("dagelijks"); setStreefwaarde("");
    }
  }, [gewoonte, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">{gewoonte ? "Gewoonte bewerken" : "Nieuwe gewoonte"}</h3>
          <button onClick={onClose} className="text-autronis-text-secondary hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-autronis-text-secondary mb-1 block">Naam</label>
            <input type="text" value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Bijv. Sporten"
              className="w-full bg-autronis-bg border border-autronis-border rounded-xl px-4 py-3 text-sm text-autronis-text-primary placeholder:text-autronis-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-autronis-accent/50" />
          </div>
          <div>
            <label className="text-sm text-autronis-text-secondary mb-1 block">Icoon</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(({ naam: iconNaam, icon: Icon }) => (
                <button key={iconNaam} type="button" onClick={() => setIcoon(iconNaam)}
                  className={cn("p-2.5 rounded-xl border transition-all", icoon === iconNaam
                    ? "bg-autronis-accent/15 border-autronis-accent text-autronis-accent"
                    : "bg-autronis-bg border-autronis-border text-autronis-text-secondary hover:border-autronis-accent/50")}>
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-autronis-text-secondary mb-1 block">Frequentie</label>
            <select value={frequentie} onChange={(e) => setFrequentie(e.target.value)}
              className="w-full bg-autronis-bg border border-autronis-border rounded-xl px-4 py-3 text-sm text-autronis-text-primary focus:outline-none focus:ring-2 focus:ring-autronis-accent/50">
              <option value="dagelijks">Dagelijks</option>
              <option value="weekelijks">Weekelijks</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-autronis-text-secondary mb-1 block">Streefwaarde (optioneel)</label>
            <input type="text" value={streefwaarde} onChange={(e) => setStreefwaarde(e.target.value)} placeholder="Bijv. 30 min"
              className="w-full bg-autronis-bg border border-autronis-border rounded-xl px-4 py-3 text-sm text-autronis-text-primary placeholder:text-autronis-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-autronis-accent/50" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-3 border border-autronis-border rounded-xl text-sm text-autronis-text-secondary hover:bg-autronis-border/30 transition-colors">Annuleren</button>
          <button onClick={() => { if (!naam.trim()) return; onSave({ naam: naam.trim(), icoon, frequentie, streefwaarde }); }} disabled={!naam.trim()}
            className="flex-1 px-4 py-3 bg-autronis-accent hover:bg-autronis-accent-hover text-autronis-bg rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 btn-press">
            {gewoonte ? "Opslaan" : "Toevoegen"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───
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
  const [showSuggesties, setShowSuggesties] = useState(false);
  const [showStats, setShowStats] = useState(true);

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

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleGewoonte = async (gewoonteId: number) => {
    const vandaag = new Date().toISOString().slice(0, 10);
    // Optimistic update first
    setGewoontesList((prev) =>
      prev.map((g) => g.id === gewoonteId ? { ...g, voltooidVandaag: !g.voltooidVandaag } : g)
    );
    try {
      const res = await fetch("/api/gewoontes/logboek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gewoonteId, datum: vandaag }),
      });
      if (!res.ok) throw new Error();
      // Refresh stats in background
      fetch("/api/gewoontes/statistieken").then((r) => r.json()).then((d) => {
        setStatistieken(d.statistieken || []);
        setWeekRate(d.weekCompletionRate || 0);
        setMaandRate(d.maandCompletionRate || 0);
      });
    } catch {
      // Revert optimistic update
      setGewoontesList((prev) =>
        prev.map((g) => g.id === gewoonteId ? { ...g, voltooidVandaag: !g.voltooidVandaag } : g)
      );
      addToast("Kon gewoonte niet bijwerken", "fout");
    }
  };

  const handleSave = async (data: { naam: string; icoon: string; frequentie: string; streefwaarde: string }) => {
    try {
      if (editGewoonte) {
        const res = await fetch(`/api/gewoontes/${editGewoonte.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error();
        addToast("Gewoonte bijgewerkt", "succes");
      } else {
        const res = await fetch("/api/gewoontes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error();
        addToast("Gewoonte toegevoegd", "succes");
      }
      setModalOpen(false);
      setEditGewoonte(null);
      fetchData();
    } catch { addToast("Kon gewoonte niet opslaan", "fout"); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/gewoontes/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      addToast("Gewoonte verwijderd", "succes");
      setDeleteId(null);
      fetchData();
    } catch { addToast("Kon gewoonte niet verwijderen", "fout"); }
  };

  const addSuggestie = async (s: Suggestie) => {
    try {
      const res = await fetch("/api/gewoontes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
      if (!res.ok) throw new Error();
      addToast(`${s.naam} toegevoegd`, "succes");
      fetchData();
    } catch { addToast("Kon suggestie niet toevoegen", "fout"); }
  };

  const voltooid = gewoontesList.filter((g) => g.voltooidVandaag).length;
  const totaal = gewoontesList.length;
  const allesGedaan = totaal > 0 && voltooid === totaal;

  // Gamification
  const totaalPunten = useMemo(() => statistieken.reduce((s, st) => s + st.totaalVoltooid, 0), [statistieken]);
  const levelInfo = useMemo(() => calculateLevel(totaalPunten), [totaalPunten]);
  const badges = useMemo(() => getBadges(statistieken), [statistieken]);
  const behaalBadges = badges.filter((b) => b.behaald);

  // Combined heatmap data (all habits)
  const combinedHeatmap = useMemo(() => {
    const combined: Record<string, number> = {};
    for (const stat of statistieken) {
      for (const [datum, waarde] of Object.entries(stat.heatmap)) {
        combined[datum] = (combined[datum] || 0) + waarde;
      }
    }
    return combined;
  }, [statistieken]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-autronis-accent animate-spin" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Gewoontes</h1>
            <p className="text-base text-autronis-text-secondary mt-1">
              {totaal > 0 ? `${voltooid}/${totaal} vandaag` : "Bouw consistente gewoontes op"}
            </p>
          </div>
          <button onClick={() => { setEditGewoonte(null); setModalOpen(true); }}
            className="inline-flex items-center gap-2 px-5 py-3 bg-autronis-accent hover:bg-autronis-accent-hover text-autronis-bg rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-autronis-accent/20 btn-press">
            <Plus className="w-4 h-4" /> Nieuwe gewoonte
          </button>
        </div>

        {totaal > 0 && (
          <>
            {/* ─── KPIs + Level ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Today's score */}
              <div className={cn("rounded-2xl border p-5 card-glow col-span-2 lg:col-span-1",
                allesGedaan ? "bg-emerald-500/10 border-emerald-500/30" : "bg-autronis-card border-autronis-border")}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white tabular-nums">{voltooid}/{totaal}</p>
                <p className="text-xs text-autronis-text-secondary mt-1">
                  {allesGedaan ? "Alles gedaan!" : "Vandaag"}
                </p>
              </div>

              {/* Week rate */}
              <div className="bg-autronis-card border border-autronis-border rounded-2xl p-5 card-glow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-xl bg-blue-500/10"><TrendingUp className="w-4 h-4 text-blue-400" /></div>
                </div>
                <p className="text-2xl font-bold text-white tabular-nums">{weekRate}%</p>
                <p className="text-xs text-autronis-text-secondary mt-1">Week</p>
              </div>

              {/* Month rate */}
              <div className="bg-autronis-card border border-autronis-border rounded-2xl p-5 card-glow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-xl bg-purple-500/10"><Calendar className="w-4 h-4 text-purple-400" /></div>
                </div>
                <p className="text-2xl font-bold text-white tabular-nums">{maandRate}%</p>
                <p className="text-xs text-autronis-text-secondary mt-1">Maand</p>
              </div>

              {/* Total points */}
              <div className="bg-autronis-card border border-autronis-border rounded-2xl p-5 card-glow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-xl bg-yellow-500/10"><Zap className="w-4 h-4 text-yellow-400" /></div>
                </div>
                <p className="text-2xl font-bold text-yellow-400 tabular-nums">{totaalPunten}</p>
                <p className="text-xs text-autronis-text-secondary mt-1">Punten</p>
              </div>

              {/* Level */}
              <div className="bg-autronis-card border border-autronis-border rounded-2xl p-5 card-glow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-xl bg-autronis-accent/10"><Award className="w-4 h-4 text-autronis-accent" /></div>
                </div>
                <p className="text-lg font-bold text-autronis-accent">{levelInfo.naam}</p>
                <div className="w-full h-1.5 bg-autronis-border rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-autronis-accent rounded-full transition-all" style={{ width: `${levelInfo.voortgang}%` }} />
                </div>
              </div>
            </div>

            {/* ─── Vandaag: habit list with large checkboxes ─── */}
            <div className={cn("rounded-2xl border p-6 lg:p-7 card-glow",
              allesGedaan ? "bg-emerald-500/5 border-emerald-500/20" : "bg-autronis-card border-autronis-border")}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-autronis-accent" />
                  Vandaag
                </h2>
                {allesGedaan && (
                  <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                    <Flame className="w-5 h-5 animate-pulse" /> Alles gedaan!
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {gewoontesList.map((g) => {
                  const Icon = ICON_MAP[g.icoon] || Target;
                  const stat = statistieken.find((s) => s.id === g.id);
                  return (
                    <div key={g.id}
                      onClick={() => toggleGewoonte(g.id)}
                      className={cn(
                        "rounded-xl p-4 flex items-center gap-4 group transition-all cursor-pointer select-none",
                        g.voltooidVandaag
                          ? "bg-emerald-500/10 border border-emerald-500/20"
                          : "bg-autronis-bg/50 hover:bg-autronis-bg/80 border border-transparent"
                      )}
                    >
                      {/* Large checkbox */}
                      <div className={cn(
                        "w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all flex-shrink-0",
                        g.voltooidVandaag
                          ? "bg-emerald-500 border-emerald-500 text-white scale-105"
                          : "border-autronis-border group-hover:border-emerald-500/50"
                      )}>
                        {g.voltooidVandaag && <CheckCircle2 className="w-6 h-6" />}
                      </div>

                      <div className="p-2 bg-autronis-accent/10 rounded-xl flex-shrink-0">
                        <Icon className="w-5 h-5 text-autronis-accent" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={cn("text-base font-medium transition-colors",
                          g.voltooidVandaag ? "text-emerald-400" : "text-autronis-text-primary")}>
                          {g.naam}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {g.streefwaarde && <span className="text-xs text-autronis-text-secondary">{g.streefwaarde}</span>}
                          <span className="text-xs text-autronis-text-secondary capitalize">{g.frequentie}</span>
                        </div>
                      </div>

                      {/* Streak - prominent */}
                      <StreakFlame streak={stat?.huidigeStreak || 0} />

                      {/* Edit/Delete */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { setEditGewoonte(g); setModalOpen(true); }}
                          className="p-2 rounded-lg text-autronis-text-secondary hover:text-white hover:bg-autronis-border/50 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteId(g.id)}
                          className="p-2 rounded-lg text-autronis-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── Badges ─── */}
            {badges.length > 0 && (
              <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 card-glow">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Badges
                  <span className="text-xs text-autronis-text-secondary ml-1">{behaalBadges.length}/{badges.length}</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {badges.map((badge) => (
                    <div key={badge.naam}
                      className={cn("flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors",
                        badge.behaald
                          ? "bg-autronis-bg/50 border-autronis-border"
                          : "bg-autronis-bg/20 border-autronis-border/30 opacity-40")}>
                      <div className={cn("p-2.5 rounded-xl", badge.behaald ? badge.kleur : "bg-autronis-border/30 text-autronis-text-secondary")}>
                        <badge.icoon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] text-center text-autronis-text-secondary font-medium">{badge.naam}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Combined Heatmap ─── */}
            <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 card-glow">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-autronis-accent" />
                Activiteit
              </h2>
              <Heatmap data={combinedHeatmap} totaalGewoontes={totaal} />
            </div>

            {/* ─── Per-habit Statistieken (collapsible) ─── */}
            <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-7 card-glow">
              <button onClick={() => setShowStats(!showStats)}
                className="flex items-center justify-between w-full mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-autronis-accent" />
                  Statistieken per gewoonte
                </h2>
                {showStats ? <ChevronUp className="w-5 h-5 text-autronis-text-secondary" /> : <ChevronDown className="w-5 h-5 text-autronis-text-secondary" />}
              </button>
              {showStats && (
                <div className="space-y-5">
                  {statistieken.map((stat) => {
                    const Icon = ICON_MAP[stat.icoon] || Target;
                    const isRecordStreak = stat.huidigeStreak > 0 && stat.huidigeStreak >= stat.langsteStreak;
                    return (
                      <div key={stat.id} className="bg-autronis-bg/50 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-autronis-accent/10 rounded-xl"><Icon className="w-4 h-4 text-autronis-accent" /></div>
                          <span className="text-base font-semibold text-autronis-text-primary">{stat.naam}</span>
                          {isRecordStreak && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 font-bold">RECORD!</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-5">
                          <div>
                            <p className="text-[10px] text-autronis-text-secondary uppercase">Streak</p>
                            <StreakFlame streak={stat.huidigeStreak} />
                            {stat.huidigeStreak === 0 && <p className="text-sm text-autronis-text-secondary">0</p>}
                          </div>
                          <div>
                            <p className="text-[10px] text-autronis-text-secondary uppercase">Record</p>
                            <p className="text-sm font-bold text-autronis-text-primary tabular-nums">{stat.langsteStreak} dagen</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-autronis-text-secondary uppercase">Beste dag</p>
                            <p className="text-sm font-bold text-emerald-400">{stat.besteDag}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-autronis-text-secondary uppercase">Slechtste dag</p>
                            <p className="text-sm font-bold text-red-400/70">{stat.slechteDag}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-autronis-text-secondary uppercase">Rate</p>
                            <p className="text-sm font-bold text-blue-400 tabular-nums">{stat.completionRate}%</p>
                          </div>
                        </div>
                        <Heatmap data={stat.heatmap} naam="" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ─── AI Tips ─── */}
            {statistieken.some((s) => s.totaalVoltooid > 3) && (
              <div className="bg-autronis-card border border-amber-500/20 rounded-2xl p-6 lg:p-7 card-glow">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-400" />
                  Slimme tips
                </h2>
                <div className="space-y-3">
                  {statistieken.filter((s) => s.totaalVoltooid > 3).flatMap((stat) => {
                    const tips: string[] = [];
                    if (stat.slechteDag !== "-" && stat.slechteDag !== stat.besteDag) {
                      tips.push(`Je mist "${stat.naam}" vaak op ${stat.slechteDag}. Probeer het in de ochtend in te plannen.`);
                    }
                    if (stat.huidigeStreak > 5) {
                      tips.push(`Sterk! Je streak van ${stat.huidigeStreak} dagen voor "${stat.naam}" is indrukwekkend.`);
                    }
                    if (stat.completionRate < 50) {
                      tips.push(`"${stat.naam}" heeft een lage rate (${stat.completionRate}%). Overweeg de streefwaarde te verlagen.`);
                    }
                    if (stat.completionRate >= 80) {
                      tips.push(`"${stat.naam}" loopt top (${stat.completionRate}%). Misschien de lat hoger leggen?`);
                    }
                    return tips.map((tip, i) => (
                      <div key={`${stat.id}-${i}`} className="flex items-start gap-3 bg-amber-500/5 rounded-xl p-4 border border-amber-500/10">
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

        {/* ─── Suggesties (always shown if available) ─── */}
        {suggesties.length > 0 && (
          <div className="bg-autronis-card border border-autronis-accent/20 rounded-2xl p-6 card-glow">
            <button onClick={() => setShowSuggesties(!showSuggesties)}
              className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-autronis-accent" />
                <h2 className="text-lg font-semibold text-white">
                  {totaal === 0 ? "Aanbevolen gewoontes" : "Meer gewoontes toevoegen"}
                </h2>
                <span className="text-xs text-autronis-text-secondary">{suggesties.length} beschikbaar</span>
              </div>
              {totaal > 0 && (showSuggesties ? <ChevronUp className="w-5 h-5 text-autronis-text-secondary" /> : <ChevronDown className="w-5 h-5 text-autronis-text-secondary" />)}
            </button>
            {(totaal === 0 || showSuggesties) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                {suggesties.map((s) => {
                  const Icon = ICON_MAP[s.icoon] || Target;
                  return (
                    <button key={s.naam} onClick={() => addSuggestie(s)}
                      className="flex items-center gap-3 bg-autronis-bg/50 rounded-xl p-4 text-left hover:bg-autronis-bg/80 transition-colors group border border-transparent hover:border-autronis-accent/30">
                      <div className="p-2 bg-autronis-accent/10 rounded-xl group-hover:bg-autronis-accent/20 transition-colors">
                        <Icon className="w-4 h-4 text-autronis-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-autronis-text-primary">{s.naam}</p>
                        {s.streefwaarde && <p className="text-[11px] text-autronis-text-secondary truncate">{s.streefwaarde}</p>}
                      </div>
                      <Plus className="w-4 h-4 text-autronis-text-secondary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {totaal === 0 && suggesties.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex p-4 bg-autronis-accent/10 rounded-2xl mb-4">
              <Target className="w-10 h-10 text-autronis-accent" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Geen gewoontes</h2>
            <p className="text-autronis-text-secondary mb-6">Voeg je eerste gewoonte toe om te beginnen.</p>
            <button onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-autronis-accent hover:bg-autronis-accent-hover text-autronis-bg rounded-xl text-sm font-semibold transition-colors btn-press">
              <Plus className="w-4 h-4" /> Eerste gewoonte toevoegen
            </button>
          </div>
        )}

        <GewoonteModal open={modalOpen} onClose={() => { setModalOpen(false); setEditGewoonte(null); }} onSave={handleSave} gewoonte={editGewoonte} />
        <ConfirmDialog open={deleteId !== null} titel="Gewoonte verwijderen" bericht="Weet je zeker dat je deze gewoonte wilt verwijderen? De bijbehorende statistieken gaan verloren." onBevestig={handleDelete} onClose={() => setDeleteId(null)} />
      </div>
    </PageTransition>
  );
}
