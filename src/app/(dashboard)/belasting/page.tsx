"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Receipt,
  CreditCard,
  TrendingDown,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Landmark,
  Building2,
  Send,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Timer,
} from "lucide-react";
import { cn, formatBedrag, formatDatum } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/ui/page-transition";
import { SkeletonKPI } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { ProgressRing } from "@/components/ui/progress-ring";

// ============ TYPES ============

interface Deadline {
  id: number;
  type: "btw" | "inkomstenbelasting" | "icp" | "kvk_publicatie";
  omschrijving: string;
  datum: string;
  kwartaal: number | null;
  jaar: number;
  afgerond: number | null;
  notities: string | null;
}

interface BtwAangifte {
  id: number;
  kwartaal: number;
  jaar: number;
  btwOntvangen: number;
  btwBetaald: number;
  btwAfdragen: number;
  status: "open" | "ingediend" | "betaald";
  ingediendOp: string | null;
  notities: string | null;
}

interface UrenCriteriumData {
  id: number;
  gebruikerId: number | null;
  jaar: number;
  doelUren: number;
  behaaldUren: number;
  zelfstandigenaftrek: number;
  mkbVrijstelling: number;
  voldoet: boolean;
  voortgangPercentage: number;
}

// ============ CONSTANTS ============

const typeConfig: Record<string, { icon: typeof Receipt; color: string; label: string }> = {
  btw: { icon: Receipt, color: "text-blue-400", label: "BTW" },
  inkomstenbelasting: { icon: Landmark, color: "text-purple-400", label: "Inkomstenbelasting" },
  icp: { icon: Send, color: "text-cyan-400", label: "ICP" },
  kvk_publicatie: { icon: Building2, color: "text-amber-400", label: "KvK" },
};

const btwStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: "bg-yellow-500/15", text: "text-yellow-400", label: "Open" },
  ingediend: { bg: "bg-blue-500/15", text: "text-blue-400", label: "Ingediend" },
  betaald: { bg: "bg-green-500/15", text: "text-green-400", label: "Betaald" },
};

// ============ COMPONENT ============

export default function BelastingPage() {
  const { addToast } = useToast();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [aangiftes, setAangiftes] = useState<BtwAangifte[]>([]);
  const [urenCriterium, setUrenCriterium] = useState<UrenCriteriumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [jaar, setJaar] = useState(new Date().getFullYear());
  const [deadlinesOpen, setDeadlinesOpen] = useState(true);
  const [btwOpen, setBtwOpen] = useState(true);
  const [urenOpen, setUrenOpen] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [deadlinesRes, btwRes, urenRes] = await Promise.all([
        fetch(`/api/belasting/deadlines?jaar=${jaar}`),
        fetch(`/api/belasting/btw?jaar=${jaar}`),
        fetch(`/api/belasting/uren-criterium?jaar=${jaar}`),
      ]);

      if (deadlinesRes.ok) {
        const data = await deadlinesRes.json();
        setDeadlines(data.deadlines ?? []);
      }
      if (btwRes.ok) {
        const data = await btwRes.json();
        setAangiftes(data.aangiftes ?? []);
      }
      if (urenRes.ok) {
        const data = await urenRes.json();
        setUrenCriterium(data.urenCriterium ?? null);
      }
    } catch {
      addToast("Kon belastinggegevens niet laden", "fout");
    } finally {
      setLoading(false);
    }
  }, [jaar, addToast]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // ---- HANDLERS ----

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/belasting/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        addToast(data.bericht ?? "Gegevens aangemaakt", "succes");
        await fetchData();
      } else {
        addToast(data.fout ?? "Fout bij seeden", "fout");
      }
    } catch {
      addToast("Kon gegevens niet aanmaken", "fout");
    } finally {
      setSeeding(false);
    }
  };

  const handleToggleDeadline = async (deadline: Deadline) => {
    const nieuweStatus = deadline.afgerond ? 0 : 1;
    try {
      const res = await fetch(`/api/belasting/deadlines/${deadline.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ afgerond: nieuweStatus }),
      });
      if (res.ok) {
        setDeadlines((prev) =>
          prev.map((d) => (d.id === deadline.id ? { ...d, afgerond: nieuweStatus } : d))
        );
        addToast(
          nieuweStatus ? "Deadline afgerond" : "Deadline heropend",
          "succes"
        );
      }
    } catch {
      addToast("Kon deadline niet bijwerken", "fout");
    }
  };

  const handleBtwStatus = async (aangifte: BtwAangifte, nieuweStatus: "ingediend" | "betaald") => {
    try {
      const res = await fetch(`/api/belasting/btw/${aangifte.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nieuweStatus }),
      });
      if (res.ok) {
        setAangiftes((prev) =>
          prev.map((a) =>
            a.id === aangifte.id ? { ...a, status: nieuweStatus } : a
          )
        );
        addToast(
          `Q${aangifte.kwartaal} gemarkeerd als ${nieuweStatus}`,
          "succes"
        );
      }
    } catch {
      addToast("Kon status niet bijwerken", "fout");
    }
  };

  // ---- COMPUTED VALUES ----

  const nu = new Date();
  const nuStr = nu.toISOString().slice(0, 10);

  const currentQuarter = Math.ceil((nu.getMonth() + 1) / 3);
  const currentQAangifte = aangiftes.find((a) => a.kwartaal === currentQuarter);
  const btwOntvangen = currentQAangifte?.btwOntvangen ?? 0;
  const btwBetaald = currentQAangifte?.btwBetaald ?? 0;
  const nettoAfdragen = btwOntvangen - btwBetaald;

  const openDeadlines = deadlines
    .filter((d) => !d.afgerond)
    .sort((a, b) => a.datum.localeCompare(b.datum));
  const volgendeDeadline = openDeadlines[0];
  const dagenTotDeadline = volgendeDeadline
    ? Math.ceil(
        (new Date(volgendeDeadline.datum).getTime() - nu.getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  // ---- LOADING STATE ----

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-8">
        <div className="h-10 w-48 bg-autronis-card rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonKPI key={i} />
          ))}
        </div>
        <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-autronis-bg/50 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-autronis-bg/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const noData = deadlines.length === 0 && aangiftes.length === 0;

  // ---- RENDER ----

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-autronis-text-primary">
              Belasting & Compliance
            </h1>
            <p className="text-base text-autronis-text-secondary mt-1">
              Overzicht BTW, deadlines en urencriterium
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Year selector */}
            <div className="flex items-center gap-1 bg-autronis-card border border-autronis-border rounded-xl">
              <button
                onClick={() => setJaar((j) => j - 1)}
                className="px-3 py-2 text-autronis-text-secondary hover:text-autronis-text-primary transition-colors"
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
              </button>
              <span className="text-sm font-semibold text-autronis-text-primary tabular-nums px-1">
                {jaar}
              </span>
              <button
                onClick={() => setJaar((j) => j + 1)}
                className="px-3 py-2 text-autronis-text-secondary hover:text-autronis-text-primary transition-colors"
              >
                <ChevronUp className="w-4 h-4 rotate-90" />
              </button>
            </div>

            {noData && (
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-autronis-accent hover:bg-autronis-accent-hover text-autronis-bg rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-autronis-accent/20 disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", seeding && "animate-spin")} />
                Gegevens aanmaken
              </button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {/* BTW ontvangen */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-7 card-glow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                <Receipt className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <AnimatedNumber
              value={btwOntvangen}
              format={formatBedrag}
              className="text-3xl font-bold text-emerald-400 tabular-nums"
            />
            <p className="text-sm text-autronis-text-secondary mt-1.5 uppercase tracking-wide">
              BTW ontvangen Q{currentQuarter}
            </p>
          </div>

          {/* BTW betaald */}
          <div className="bg-gradient-to-br from-orange-500/10 to-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-7 card-glow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-orange-500/10 rounded-xl">
                <CreditCard className="w-5 h-5 text-orange-400" />
              </div>
            </div>
            <AnimatedNumber
              value={btwBetaald}
              format={formatBedrag}
              className="text-3xl font-bold text-orange-400 tabular-nums"
            />
            <p className="text-sm text-autronis-text-secondary mt-1.5 uppercase tracking-wide">
              BTW betaald Q{currentQuarter}
            </p>
          </div>

          {/* Netto afdragen */}
          <div className="bg-gradient-to-br from-blue-500/10 to-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-7 card-glow">
            <div className="flex items-center gap-3 mb-3">
              <div className={cn("p-2.5 rounded-xl", nettoAfdragen > 0 ? "bg-red-500/10" : "bg-autronis-accent/10")}>
                <TrendingDown className={cn("w-5 h-5", nettoAfdragen > 0 ? "text-red-400" : "text-autronis-accent")} />
              </div>
            </div>
            <AnimatedNumber
              value={nettoAfdragen}
              format={formatBedrag}
              className={cn(
                "text-3xl font-bold tabular-nums",
                nettoAfdragen > 0 ? "text-red-400" : "text-autronis-accent"
              )}
            />
            <p className="text-sm text-autronis-text-secondary mt-1.5 uppercase tracking-wide">
              Netto afdragen Q{currentQuarter}
            </p>
          </div>

          {/* Volgende deadline */}
          <div
            className={cn(
              "bg-gradient-to-br to-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-7 card-glow",
              dagenTotDeadline !== null && dagenTotDeadline < 14
                ? "from-red-500/10"
                : "from-autronis-accent/10"
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={cn(
                  "p-2.5 rounded-xl",
                  dagenTotDeadline !== null && dagenTotDeadline < 14
                    ? "bg-red-500/10"
                    : "bg-autronis-accent/10"
                )}
              >
                <CalendarClock
                  className={cn(
                    "w-5 h-5",
                    dagenTotDeadline !== null && dagenTotDeadline < 14
                      ? "text-red-400"
                      : "text-autronis-accent"
                  )}
                />
              </div>
            </div>
            {dagenTotDeadline !== null ? (
              <>
                <AnimatedNumber
                  value={dagenTotDeadline}
                  format={(n) => `${Math.round(n)} dagen`}
                  className={cn(
                    "text-3xl font-bold tabular-nums",
                    dagenTotDeadline < 14 ? "text-red-400" : "text-autronis-text-primary"
                  )}
                />
                <p
                  className="text-sm text-autronis-text-secondary mt-1.5 uppercase tracking-wide truncate"
                  title={volgendeDeadline?.omschrijving}
                >
                  {volgendeDeadline?.omschrijving}
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-autronis-accent">Alles af</p>
                <p className="text-sm text-autronis-text-secondary mt-1.5 uppercase tracking-wide">
                  Geen openstaande deadlines
                </p>
              </>
            )}
          </div>
        </div>

        {/* BTW Kwartaaloverzicht */}
        <div className="bg-autronis-card border border-autronis-border rounded-2xl">
          <button
            onClick={() => setBtwOpen(!btwOpen)}
            className="w-full flex items-center justify-between p-6 lg:p-7"
          >
            <div className="flex items-center gap-3">
              <Receipt className="w-5 h-5 text-autronis-accent" />
              <h2 className="text-xl font-bold text-autronis-text-primary">
                BTW Kwartaaloverzicht {jaar}
              </h2>
            </div>
            {btwOpen ? (
              <ChevronUp className="w-5 h-5 text-autronis-text-secondary" />
            ) : (
              <ChevronDown className="w-5 h-5 text-autronis-text-secondary" />
            )}
          </button>

          {btwOpen && (
            <div className="px-6 lg:px-7 pb-6 lg:pb-7">
              {aangiftes.length === 0 ? (
                <p className="text-autronis-text-secondary text-sm py-4">
                  Nog geen BTW aangiftes voor {jaar}. Klik op &quot;Gegevens aanmaken&quot; om te starten.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-autronis-border">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-autronis-text-secondary uppercase tracking-wide">
                          Kwartaal
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-autronis-text-secondary uppercase tracking-wide">
                          BTW Ontvangen
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-autronis-text-secondary uppercase tracking-wide">
                          BTW Betaald
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-autronis-text-secondary uppercase tracking-wide">
                          Netto
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-autronis-text-secondary uppercase tracking-wide">
                          Status
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-autronis-text-secondary uppercase tracking-wide">
                          Actie
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {aangiftes.map((aangifte) => {
                        const sc = btwStatusConfig[aangifte.status] ?? btwStatusConfig.open;
                        const netto = aangifte.btwOntvangen - aangifte.btwBetaald;
                        return (
                          <tr
                            key={aangifte.id}
                            className="border-b border-autronis-border/50 hover:bg-autronis-bg/30 transition-colors"
                          >
                            <td className="py-4 px-4">
                              <span className="text-base font-semibold text-autronis-text-primary">
                                Q{aangifte.kwartaal}
                              </span>
                              <span className="text-sm text-autronis-text-secondary ml-2">
                                {jaar}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className="text-base font-medium text-emerald-400 tabular-nums">
                                {formatBedrag(aangifte.btwOntvangen)}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className="text-base font-medium text-orange-400 tabular-nums">
                                {formatBedrag(aangifte.btwBetaald)}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span
                                className={cn(
                                  "text-base font-semibold tabular-nums",
                                  netto > 0 ? "text-red-400" : "text-autronis-accent"
                                )}
                              >
                                {formatBedrag(netto)}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span
                                className={cn(
                                  "text-xs px-2.5 py-1 rounded-full font-semibold",
                                  sc.bg,
                                  sc.text
                                )}
                              >
                                {sc.label}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              {aangifte.status === "open" && (
                                <button
                                  onClick={() => handleBtwStatus(aangifte, "ingediend")}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                                >
                                  <Send className="w-3 h-3" />
                                  Ingediend
                                </button>
                              )}
                              {aangifte.status === "ingediend" && (
                                <button
                                  onClick={() => handleBtwStatus(aangifte, "betaald")}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  Betaald
                                </button>
                              )}
                              {aangifte.status === "betaald" && (
                                <span className="text-xs text-autronis-text-secondary">
                                  Afgerond
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Totaal row */}
                    <tfoot>
                      <tr className="bg-autronis-bg/30">
                        <td className="py-4 px-4 text-base font-bold text-autronis-text-primary">
                          Totaal
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-base font-bold text-emerald-400 tabular-nums">
                            {formatBedrag(
                              aangiftes.reduce((sum, a) => sum + a.btwOntvangen, 0)
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-base font-bold text-orange-400 tabular-nums">
                            {formatBedrag(
                              aangiftes.reduce((sum, a) => sum + a.btwBetaald, 0)
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span
                            className={cn(
                              "text-base font-bold tabular-nums",
                              aangiftes.reduce((sum, a) => sum + a.btwOntvangen - a.btwBetaald, 0) > 0
                                ? "text-red-400"
                                : "text-autronis-accent"
                            )}
                          >
                            {formatBedrag(
                              aangiftes.reduce(
                                (sum, a) => sum + a.btwOntvangen - a.btwBetaald,
                                0
                              )
                            )}
                          </span>
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Deadlines overzicht */}
        <div className="bg-autronis-card border border-autronis-border rounded-2xl">
          <button
            onClick={() => setDeadlinesOpen(!deadlinesOpen)}
            className="w-full flex items-center justify-between p-6 lg:p-7"
          >
            <div className="flex items-center gap-3">
              <CalendarClock className="w-5 h-5 text-autronis-accent" />
              <h2 className="text-xl font-bold text-autronis-text-primary">
                Deadlines {jaar}
              </h2>
              {openDeadlines.length > 0 && (
                <span className="text-xs px-2 py-0.5 bg-autronis-accent/15 text-autronis-accent rounded-full font-semibold">
                  {openDeadlines.length} open
                </span>
              )}
            </div>
            {deadlinesOpen ? (
              <ChevronUp className="w-5 h-5 text-autronis-text-secondary" />
            ) : (
              <ChevronDown className="w-5 h-5 text-autronis-text-secondary" />
            )}
          </button>

          {deadlinesOpen && (
            <div className="px-6 lg:px-7 pb-6 lg:pb-7">
              {deadlines.length === 0 ? (
                <p className="text-autronis-text-secondary text-sm py-4">
                  Nog geen deadlines voor {jaar}. Klik op &quot;Gegevens aanmaken&quot; om te starten.
                </p>
              ) : (
                <div className="space-y-2">
                  {deadlines
                    .sort((a, b) => a.datum.localeCompare(b.datum))
                    .map((deadline) => {
                      const config = typeConfig[deadline.type] ?? typeConfig.btw;
                      const Icon = config.icon;
                      const isAfgerond = !!deadline.afgerond;
                      const deadlineDatum = new Date(deadline.datum);
                      const dagen = Math.ceil(
                        (deadlineDatum.getTime() - nu.getTime()) / (1000 * 60 * 60 * 24)
                      );
                      const isOverdue = !isAfgerond && dagen < 0;
                      const isUrgent = !isAfgerond && dagen >= 0 && dagen < 14;

                      return (
                        <div
                          key={deadline.id}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-xl border transition-colors cursor-pointer group",
                            isAfgerond
                              ? "border-autronis-border/50 bg-autronis-bg/20 opacity-60"
                              : isOverdue
                              ? "border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
                              : isUrgent
                              ? "border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10"
                              : "border-autronis-border hover:bg-autronis-bg/30"
                          )}
                          onClick={() => handleToggleDeadline(deadline)}
                        >
                          {/* Icon */}
                          <div
                            className={cn(
                              "p-2 rounded-lg",
                              isAfgerond ? "bg-green-500/10" : "bg-autronis-bg/50"
                            )}
                          >
                            {isAfgerond ? (
                              <CheckCircle2 className="w-5 h-5 text-green-400" />
                            ) : (
                              <Icon className={cn("w-5 h-5", config.color)} />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "text-base font-medium",
                                  isAfgerond
                                    ? "text-autronis-text-secondary line-through"
                                    : "text-autronis-text-primary"
                                )}
                              >
                                {deadline.omschrijving}
                              </span>
                              <span
                                className={cn(
                                  "text-xs px-2 py-0.5 rounded-full font-semibold",
                                  isAfgerond
                                    ? "bg-green-500/15 text-green-400"
                                    : `bg-${config.color.replace("text-", "")}/15 ${config.color}`
                                )}
                              >
                                {config.label}
                              </span>
                            </div>
                            <p className="text-sm text-autronis-text-secondary mt-0.5">
                              {formatDatum(deadline.datum)}
                            </p>
                          </div>

                          {/* Status / countdown */}
                          <div className="text-right flex-shrink-0">
                            {isAfgerond ? (
                              <span className="text-sm font-medium text-green-400">
                                Afgerond
                              </span>
                            ) : isOverdue ? (
                              <div className="flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                                <span className="text-sm font-semibold text-red-400">
                                  {Math.abs(dagen)} dagen te laat
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-autronis-text-secondary" />
                                <span
                                  className={cn(
                                    "text-sm font-semibold tabular-nums",
                                    isUrgent ? "text-yellow-400" : "text-autronis-text-secondary"
                                  )}
                                >
                                  {dagen} dagen
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Urencriterium */}
        <div className="bg-autronis-card border border-autronis-border rounded-2xl">
          <button
            onClick={() => setUrenOpen(!urenOpen)}
            className="w-full flex items-center justify-between p-6 lg:p-7"
          >
            <div className="flex items-center gap-3">
              <Timer className="w-5 h-5 text-autronis-accent" />
              <h2 className="text-xl font-bold text-autronis-text-primary">
                Urencriterium {jaar}
              </h2>
              {urenCriterium && (
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-semibold",
                    urenCriterium.voldoet
                      ? "bg-green-500/15 text-green-400"
                      : "bg-yellow-500/15 text-yellow-400"
                  )}
                >
                  {urenCriterium.voldoet ? "Voldoet" : "Nog niet"}
                </span>
              )}
            </div>
            {urenOpen ? (
              <ChevronUp className="w-5 h-5 text-autronis-text-secondary" />
            ) : (
              <ChevronDown className="w-5 h-5 text-autronis-text-secondary" />
            )}
          </button>

          {urenOpen && urenCriterium && (
            <div className="px-6 lg:px-7 pb-6 lg:pb-7">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Progress ring */}
                <div className="flex flex-col items-center justify-center p-6 bg-autronis-bg/30 rounded-xl border border-autronis-border">
                  <ProgressRing
                    percentage={urenCriterium.voortgangPercentage}
                    size={120}
                    strokeWidth={10}
                    color={urenCriterium.voldoet ? "#22c55e" : "#17B8A5"}
                  />
                  <p className="text-2xl font-bold text-autronis-text-primary mt-4 tabular-nums">
                    {urenCriterium.behaaldUren} / {urenCriterium.doelUren}
                  </p>
                  <p className="text-sm text-autronis-text-secondary mt-1">uren gewerkt</p>
                </div>

                {/* Details */}
                <div className="md:col-span-2 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-autronis-bg/30 rounded-xl border border-autronis-border">
                      <p className="text-sm text-autronis-text-secondary mb-1">Doel uren</p>
                      <p className="text-2xl font-bold text-autronis-text-primary tabular-nums">
                        {urenCriterium.doelUren}
                      </p>
                    </div>
                    <div className="p-4 bg-autronis-bg/30 rounded-xl border border-autronis-border">
                      <p className="text-sm text-autronis-text-secondary mb-1">Behaald</p>
                      <p className="text-2xl font-bold text-autronis-accent tabular-nums">
                        {urenCriterium.behaaldUren}
                      </p>
                    </div>
                    <div className="p-4 bg-autronis-bg/30 rounded-xl border border-autronis-border">
                      <p className="text-sm text-autronis-text-secondary mb-1">
                        Zelfstandigenaftrek
                      </p>
                      <p
                        className={cn(
                          "text-2xl font-bold tabular-nums",
                          urenCriterium.zelfstandigenaftrek > 0
                            ? "text-green-400"
                            : "text-autronis-text-secondary"
                        )}
                      >
                        {urenCriterium.zelfstandigenaftrek > 0
                          ? formatBedrag(urenCriterium.zelfstandigenaftrek)
                          : "Niet bereikt"}
                      </p>
                    </div>
                    <div className="p-4 bg-autronis-bg/30 rounded-xl border border-autronis-border">
                      <p className="text-sm text-autronis-text-secondary mb-1">
                        MKB-winstvrijstelling
                      </p>
                      <p
                        className={cn(
                          "text-2xl font-bold",
                          urenCriterium.mkbVrijstelling
                            ? "text-green-400"
                            : "text-autronis-text-secondary"
                        )}
                      >
                        {urenCriterium.mkbVrijstelling ? "13,31%" : "Niet bereikt"}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="p-4 bg-autronis-bg/30 rounded-xl border border-autronis-border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-autronis-text-secondary">Voortgang</p>
                      <p className="text-sm font-semibold text-autronis-text-primary tabular-nums">
                        {urenCriterium.voortgangPercentage}%
                      </p>
                    </div>
                    <div className="h-3 bg-autronis-bg rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          urenCriterium.voldoet ? "bg-green-500" : "bg-autronis-accent"
                        )}
                        style={{ width: `${urenCriterium.voortgangPercentage}%` }}
                      />
                    </div>
                    {!urenCriterium.voldoet && (
                      <p className="text-xs text-autronis-text-secondary mt-2">
                        Nog{" "}
                        <span className="font-semibold text-autronis-text-primary">
                          {Math.max(0, urenCriterium.doelUren - urenCriterium.behaaldUren).toFixed(1)}
                        </span>{" "}
                        uren nodig voor het urencriterium
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {urenOpen && !urenCriterium && (
            <div className="px-6 lg:px-7 pb-6 lg:pb-7">
              <p className="text-autronis-text-secondary text-sm py-4">
                Geen urencriterium data beschikbaar voor {jaar}.
              </p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
