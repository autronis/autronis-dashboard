"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Monitor,
  Clock,
  TrendingUp,
  Sparkles,
  X,
  AppWindow,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Pause,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useSessies,
  useWeekSessies,
  useSamenvatting,
  useGenereerSamenvatting,
} from "@/hooks/queries/use-screen-time";
import type { WeekDagData } from "@/hooks/queries/use-screen-time";
import { useRegistraties } from "@/hooks/queries/use-tijdregistraties";
import { Skeleton } from "@/components/ui/skeleton";
import type { ScreenTimeCategorie, ScreenTimeSessie } from "@/types";
import {
  CATEGORIE_KLEUREN,
  CATEGORIE_LABELS,
  formatTijd,
  formatTijdRange,
  parseBestandenUitTitels,
  gisterenDatum,
  berekenVanTot,
  CategorieBadge,
} from "./constants";

// ============ TYPES ============

type TijdlijnView = "dag" | "week";

// ============ TIMELINE CONSTANTS ============

const DAY_START = 0;
const DAY_END = 24;
const TOTAL_HOURS = 24;
const HOUR_LABELS = Array.from({ length: 25 }, (_, i) => i); // 0-24

// ============ HELPERS ============

function getTimePosition(timeStr: string): number {
  const d = new Date(timeStr);
  const hours = d.getHours() + d.getMinutes() / 60;
  return Math.max(0, Math.min(100, ((hours - DAY_START) / TOTAL_HOURS) * 100));
}

function getBlockHeight(duurSeconden: number): number {
  return Math.max(1.5, (duurSeconden / 3600 / TOTAL_HOURS) * 100);
}

function getCurrentTimePosition(): number | null {
  const now = new Date();
  const hours = now.getHours() + now.getMinutes() / 60;
  return ((hours - DAY_START) / TOTAL_HOURS) * 100;
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split("T")[0];
}

function getWeekStart(datum: string): string {
  const d = new Date(datum);
  const day = d.getDay();
  const maandag = d.getDate() - ((day + 6) % 7);
  const start = new Date(d.getFullYear(), d.getMonth(), maandag);
  return start.toISOString().split("T")[0] ?? "";
}

// ============ SESSIE DETAIL PANEL ============

interface SessieDetail {
  app: string;
  categorie: string;
  projectNaam: string | null;
  klantNaam: string | null;
  startTijd: string;
  eindTijd: string;
  duurSeconden: number;
  venstertitels: string[];
  isIdle: boolean;
  beschrijving: string;
  isHandmatig?: boolean;
}

function SessieDetailPanel({
  sessie,
  onClose,
}: {
  sessie: SessieDetail;
  onClose: () => void;
}) {
  const bestanden = parseBestandenUitTitels(sessie.venstertitels);
  const kleur = CATEGORIE_KLEUREN[sessie.categorie] ?? "#6B7280";

  return (
    <div className="bg-autronis-card border border-autronis-border rounded-2xl p-5 space-y-4 animate-in slide-in-from-right-2 duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${kleur}20` }}
          >
            <AppWindow className="w-5 h-5" style={{ color: kleur }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold text-autronis-text-primary">{sessie.app}</p>
              {sessie.isHandmatig && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-autronis-accent/10 text-autronis-accent rounded-md">
                  Handmatig
                </span>
              )}
            </div>
            <CategorieBadge categorie={sessie.categorie} />
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-autronis-text-secondary hover:text-autronis-text-primary rounded-lg hover:bg-autronis-bg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {sessie.beschrijving && sessie.beschrijving !== sessie.app && (
        <p className="text-sm text-autronis-text-primary leading-relaxed">
          {sessie.beschrijving}
        </p>
      )}

      {(sessie.projectNaam || sessie.klantNaam) && (
        <div className="flex items-center gap-2 text-sm">
          {sessie.projectNaam && (
            <span className="text-autronis-accent font-medium">{sessie.projectNaam}</span>
          )}
          {sessie.klantNaam && (
            <span className="text-autronis-text-secondary">
              {sessie.projectNaam ? `(${sessie.klantNaam})` : sessie.klantNaam}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-autronis-bg rounded-xl p-3">
          <p className="text-xs text-autronis-text-secondary mb-1">Tijdspan</p>
          <p className="text-sm font-medium text-autronis-text-primary tabular-nums">
            {formatTijdRange(sessie.startTijd)} - {formatTijdRange(sessie.eindTijd)}
          </p>
        </div>
        <div className="bg-autronis-bg rounded-xl p-3">
          <p className="text-xs text-autronis-text-secondary mb-1">Duur</p>
          <p className="text-sm font-medium text-autronis-text-primary tabular-nums">
            {formatTijd(sessie.duurSeconden)}
          </p>
        </div>
      </div>

      {bestanden.length > 0 && (
        <div>
          <p className="text-xs text-autronis-text-secondary mb-2 uppercase tracking-wide">Bestanden / pagina&apos;s</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {bestanden.slice(0, 10).map((b, i) => (
              <p key={i} className="text-xs text-autronis-text-primary truncate px-2 py-1 bg-autronis-bg rounded-lg">
                {b}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ DAG TIMELINE ============

function DagTimeline({
  sessies,
  datum,
  selectedSessie,
  onSelect,
}: {
  sessies: ScreenTimeSessie[];
  datum: string;
  selectedSessie: number | null;
  onSelect: (idx: number | null) => void;
}) {
  const vandaag = isToday(datum);

  // Filter out idle sessions — show as gaps instead of blocks
  const visibleSessions = sessies.filter(s => !s.isIdle);

  // Auto-zoom: compute visible range from sessions
  const firstHour = visibleSessions.length > 0
    ? Math.max(0, Math.floor(new Date(visibleSessions[0].startTijd).getHours()) - 1)
    : 7;
  const lastHour = visibleSessions.length > 0
    ? Math.min(24, Math.ceil(new Date(visibleSessions[visibleSessions.length - 1].eindTijd).getHours()) + 1)
    : 23;
  const visibleStart = firstHour;
  const visibleEnd = lastHour;
  const visibleHours = visibleEnd - visibleStart;
  const hourLabels = Array.from({ length: visibleHours + 1 }, (_, i) => i + visibleStart);

  // Current time position within visible range
  const currentPos = useMemo(() => {
    if (!vandaag) return null;
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;
    if (hours < visibleStart || hours > visibleEnd) return null;
    return ((hours - visibleStart) / visibleHours) * 100;
  }, [vandaag, visibleStart, visibleEnd, visibleHours]);

  // Position blocks at their actual time — no overlap hack
  const positionedBlocks = useMemo(() => {
    return visibleSessions.map((sessie) => {
      const startDate = new Date(sessie.startTijd);
      const startHour = startDate.getHours() + startDate.getMinutes() / 60;
      const top = ((startHour - visibleStart) / visibleHours) * 100;
      const height = Math.max(1.2, (sessie.duurSeconden / 3600 / visibleHours) * 100);
      return { sessie, originalIdx: sessies.indexOf(sessie), top, height };
    });
  }, [visibleSessions, sessies, visibleStart, visibleHours]);

  return (
    <div className="relative flex" style={{ minHeight: `${visibleHours * 64}px` }}>
      {/* Hour gutter */}
      <div className="w-14 shrink-0 relative">
        {hourLabels.map((hour) => {
          const top = ((hour - visibleStart) / visibleHours) * 100;
          return (
            <div
              key={hour}
              className="absolute right-3 -translate-y-1/2 text-xs text-autronis-text-secondary tabular-nums select-none"
              style={{ top: `${top}%` }}
            >
              {String(hour).padStart(2, "0")}:00
            </div>
          );
        })}
      </div>

      {/* Timeline area */}
      <div className="flex-1 relative border-l border-autronis-border/40">
        {/* Hour lines */}
        {hourLabels.map((hour) => {
          const top = ((hour - visibleStart) / visibleHours) * 100;
          return (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-autronis-border/20"
              style={{ top: `${top}%` }}
            />
          );
        })}

        {/* Session blocks — positioned at actual time, no overlap hack */}
        {positionedBlocks.map(({ sessie, originalIdx, top, height }) => {
          const kleur = CATEGORIE_KLEUREN[sessie.categorie] ?? "#6B7280";
          const isSelected = selectedSessie === originalIdx;
          const isHandmatig = sessie.app === "Handmatig";

          return (
            <button
              key={originalIdx}
              onClick={() => onSelect(isSelected ? null : originalIdx)}
              className={cn(
                "absolute left-2 right-2 rounded-lg overflow-hidden text-left transition-all duration-150 cursor-pointer",
                "hover:brightness-110 hover:scale-[1.01]",
                isSelected && "ring-2 ring-autronis-accent ring-offset-1 ring-offset-autronis-bg"
              )}
              style={{
                top: `${top}%`,
                height: `${height}%`,
                backgroundColor: `${kleur}CC`,
                minHeight: "24px",
              }}
            >
              <div className="px-2.5 py-1 h-full flex flex-col justify-center overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-white truncate leading-tight">
                    {sessie.beschrijving || sessie.app}
                  </span>
                  {isHandmatig && (
                    <span className="shrink-0 text-[9px] font-medium bg-white/20 text-white px-1 rounded">
                      H
                    </span>
                  )}
                </div>
                {height > 2.5 && (
                  <span className="text-[10px] text-white/60 truncate">
                    {new Date(sessie.startTijd).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })} - {new Date(sessie.eindTijd).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })} &middot; {formatTijd(sessie.duurSeconden)}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {/* Current time indicator */}
        {currentPos !== null && (
          <div
            className="absolute left-0 right-0 z-10 pointer-events-none"
            style={{ top: `${currentPos}%` }}
          >
            <div className="relative flex items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-[5px] shadow-lg shadow-red-500/30" />
              <div className="flex-1 h-[2px] bg-red-500 shadow-lg shadow-red-500/20" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ WEEK TIMELINE ============

function WeekTimeline({
  weekData,
  onSelectSessie,
}: {
  weekData: WeekDagData[];
  onSelectSessie: (sessie: ScreenTimeSessie) => void;
}) {
  const DAG_NAMEN = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

  return (
    <div className="relative flex" style={{ minHeight: `${TOTAL_HOURS * 56}px` }}>
      {/* Hour gutter */}
      <div className="w-10 shrink-0 relative">
        {HOUR_LABELS.map((hour) => {
          const top = ((hour - DAY_START) / TOTAL_HOURS) * 100;
          return (
            <div
              key={hour}
              className="absolute right-2 -translate-y-1/2 text-[10px] text-autronis-text-secondary tabular-nums select-none"
              style={{ top: `${top}%` }}
            >
              {String(hour).padStart(2, "0")}
            </div>
          );
        })}
      </div>

      {/* 7 day columns */}
      <div className="flex-1 grid grid-cols-7">
        {weekData.map((dag, dagIdx) => {
          const dagDate = new Date(dag.datum);
          const dagNr = dagDate.getDate();
          const vandaag = isToday(dag.datum);
          const currentPos = vandaag ? getCurrentTimePosition() : null;

          return (
            <div
              key={dag.datum}
              className={cn(
                "relative border-l border-autronis-border/20",
                dagIdx === 0 && "border-l-autronis-border/40"
              )}
            >
              {/* Day header */}
              <div className={cn(
                "sticky top-0 z-10 text-center py-1.5 text-xs border-b border-autronis-border/20 bg-autronis-card/95 backdrop-blur-sm",
                vandaag ? "text-autronis-accent font-semibold" : "text-autronis-text-secondary"
              )}>
                {DAG_NAMEN[dagIdx]} {dagNr}
              </div>

              {/* Hour lines */}
              {HOUR_LABELS.map((hour) => {
                const top = ((hour - DAY_START) / TOTAL_HOURS) * 100;
                return (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-autronis-border/10"
                    style={{ top: `${top}%` }}
                  />
                );
              })}

              {/* Session blocks (idle filtered out) */}
              {dag.sessies.filter(s => !s.isIdle).map((sessie, sIdx) => {
                const top = getTimePosition(sessie.startTijd);
                const height = getBlockHeight(sessie.duurSeconden);
                const kleur = CATEGORIE_KLEUREN[sessie.categorie] ?? "#6B7280";
                const isHandmatig = sessie.app === "Handmatig";

                return (
                  <div
                    key={sIdx}
                    onClick={() => onSelectSessie(sessie)}
                    className="absolute left-[2px] right-[2px] rounded cursor-pointer group hover:brightness-125"
                    style={{
                      top: `${top}%`,
                      height: `${Math.max(height, 0.8)}%`,
                      backgroundColor: `${kleur}BB`,
                      minHeight: "4px",
                    }}
                  >
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20 pointer-events-none">
                      <div className="bg-autronis-bg border border-autronis-border rounded-lg px-3 py-2 shadow-xl max-w-xs text-xs">
                        <div className="flex items-center gap-1.5">
                          <p className="text-autronis-text-primary font-medium truncate">
                            {sessie.beschrijving && sessie.beschrijving !== sessie.app
                              ? sessie.beschrijving
                              : sessie.app}
                          </p>
                          {isHandmatig && (
                            <span className="shrink-0 text-[9px] font-medium bg-autronis-accent/20 text-autronis-accent px-1 rounded">
                              Handmatig
                            </span>
                          )}
                        </div>
                        {sessie.projectNaam && (
                          <p className="text-autronis-accent text-[10px]">{sessie.projectNaam}</p>
                        )}
                        <p className="text-autronis-text-secondary tabular-nums text-[10px] whitespace-nowrap">
                          {formatTijdRange(sessie.startTijd)} - {formatTijdRange(sessie.eindTijd)} &middot; {formatTijd(sessie.duurSeconden)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Current time */}
              {currentPos !== null && (
                <div
                  className="absolute left-0 right-0 z-10 pointer-events-none"
                  style={{ top: `${currentPos}%` }}
                >
                  <div className="h-[2px] bg-red-500 shadow-sm shadow-red-500/30" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ TAB TIJDLIJN ============

export function TabTijdlijn({ datum }: { datum: string }) {
  const [view, setView] = useState<TijdlijnView>("dag");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [weekSelectedSessie, setWeekSelectedSessie] = useState<ScreenTimeSessie | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const weekStart = useMemo(() => getWeekStart(datum), [datum]);
  const { data: sessiesData, isLoading: sessiesLoading } = useSessies(datum);
  const { data: weekData, isLoading: weekLoading } = useWeekSessies(weekStart);
  const { data: samenvatting, isLoading: samenvattingLoading } = useSamenvatting(datum);
  const genereer = useGenereerSamenvatting();

  // Fetch handmatige registraties for the same day and merge into sessies
  const { van: regVan, tot: regTot } = berekenVanTot(new Date(datum), "dag");
  const { data: registraties } = useRegistraties(regVan, regTot);

  const handmatigeSessies: ScreenTimeSessie[] = useMemo(() => {
    return (registraties ?? [])
      .filter(r => r.isHandmatig)
      .map(r => ({
        app: "Handmatig",
        categorie: (r.categorie === "meeting" ? "communicatie" : r.categorie) as ScreenTimeCategorie,
        startTijd: r.startTijd,
        eindTijd: r.eindTijd ?? r.startTijd,
        duurSeconden: (r.duurMinuten ?? 0) * 60,
        beschrijving: r.omschrijving ?? "",
        projectNaam: r.projectNaam ?? null,
        klantNaam: r.klantNaam ?? null,
        isIdle: false,
        venstertitels: r.omschrijving ? [r.omschrijving] : [],
      }));
  }, [registraties]);

  // Merge screen-time sessies with handmatige registraties, sorted by start time
  const alleSessies = useMemo(() => {
    return [...(sessiesData?.sessies ?? []).filter(s => !s.isIdle), ...handmatigeSessies]
      .sort((a, b) => new Date(a.startTijd).getTime() - new Date(b.startTijd).getTime());
  }, [sessiesData, handmatigeSessies]);

  const stats = sessiesData?.stats;
  const selectedSessie = selectedIdx !== null ? alleSessies[selectedIdx] ?? null : null;

  // Lazy auto-generation for yesterday's summary
  useEffect(() => {
    const lastCheck = sessionStorage.getItem("lastSummaryCheck");
    const vandaag = new Date().toISOString().split("T")[0];
    if (lastCheck === vandaag) return;
    sessionStorage.setItem("lastSummaryCheck", vandaag ?? "");

    const gisteren = gisterenDatum();
    fetch(`/api/screen-time/samenvatting?datum=${gisteren}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.samenvatting) {
          genereer.mutate(gisteren);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset selection when datum or view changes
  useEffect(() => {
    setSelectedIdx(null);
    setWeekSelectedSessie(null);
  }, [datum, view]);

  const isLoading = view === "dag" ? sessiesLoading : weekLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 rounded-2xl" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-[600px] rounded-2xl" />
      </div>
    );
  }

  const activeSessieDetail = view === "dag" ? selectedSessie : weekSelectedSessie;

  return (
    <div className="space-y-4">
      {/* 1. View toggle + AI Samenvatting row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* View toggle */}
        <div className="flex bg-autronis-card border border-autronis-border rounded-xl p-1">
          {(["dag", "week"] as TijdlijnView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors",
                view === v
                  ? "bg-autronis-accent text-autronis-bg"
                  : "text-autronis-text-secondary hover:text-autronis-text-primary"
              )}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Compact AI summary */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
          {samenvattingLoading ? (
            <Skeleton className="h-4 w-48 rounded" />
          ) : samenvatting?.samenvattingKort ? (
            <p className="text-xs text-autronis-text-secondary truncate">
              {samenvatting.samenvattingKort}
            </p>
          ) : (
            <p className="text-xs text-autronis-text-secondary opacity-50">Geen samenvatting</p>
          )}
          {samenvatting?.samenvattingDetail && (
            <button
              onClick={() => setDetailOpen(!detailOpen)}
              className="text-[10px] text-autronis-text-secondary hover:text-autronis-text-primary shrink-0 transition-colors"
            >
              {detailOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        <button
          onClick={() => genereer.mutate(datum)}
          disabled={genereer.isPending}
          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-autronis-accent bg-autronis-accent/10 rounded-lg hover:bg-autronis-accent/20 transition-colors disabled:opacity-50 shrink-0"
        >
          {genereer.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          {samenvatting ? "Opnieuw" : "Genereer"}
        </button>
      </div>

      {/* Expandable detail */}
      {detailOpen && samenvatting?.samenvattingDetail && (
        <div className="bg-autronis-card border border-autronis-border rounded-xl p-4">
          <p className="text-xs text-autronis-text-secondary leading-relaxed whitespace-pre-wrap">
            {samenvatting.samenvattingDetail}
          </p>
        </div>
      )}

      {/* 2. Compact KPI row */}
      {stats && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-autronis-card border border-autronis-border rounded-xl px-3.5 py-2">
            <Clock className="w-3.5 h-3.5 text-autronis-accent" />
            <span className="text-sm font-semibold text-autronis-accent tabular-nums">{formatTijd(stats.totaalActief)}</span>
            <span className="text-[10px] text-autronis-text-secondary uppercase">Actief</span>
          </div>
          <div className="flex items-center gap-2 bg-autronis-card border border-autronis-border rounded-xl px-3.5 py-2">
            <Pause className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm font-semibold text-gray-400 tabular-nums">{formatTijd(stats.totaalIdle)}</span>
            <span className="text-[10px] text-autronis-text-secondary uppercase">Idle</span>
          </div>
          <div className="flex items-center gap-2 bg-autronis-card border border-autronis-border rounded-xl px-3.5 py-2">
            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
            <span className="text-sm font-semibold text-green-400 tabular-nums">{stats.productiefPercentage}%</span>
            <span className="text-[10px] text-autronis-text-secondary uppercase">Productief</span>
          </div>
          <div className="flex items-center gap-2 bg-autronis-card border border-autronis-border rounded-xl px-3.5 py-2">
            <Hash className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-sm font-semibold text-blue-400 tabular-nums">{stats.aantalSessies}</span>
            <span className="text-[10px] text-autronis-text-secondary uppercase">Sessies</span>
          </div>
        </div>
      )}

      {/* 3. Calendar Timeline + Detail panel */}
      <div className="flex gap-4">
        {/* Main timeline */}
        <div className="flex-1 bg-autronis-card border border-autronis-border rounded-2xl p-4 overflow-hidden">
          {view === "dag" ? (
            alleSessies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Monitor className="w-12 h-12 text-autronis-text-secondary opacity-30 mb-4" />
                <p className="text-autronis-text-secondary text-sm">Geen data voor deze dag</p>
              </div>
            ) : (
              <DagTimeline
                sessies={alleSessies}
                datum={datum}
                selectedSessie={selectedIdx}
                onSelect={setSelectedIdx}
              />
            )
          ) : (
            weekData && weekData.length > 0 ? (
              <WeekTimeline
                weekData={weekData}
                onSelectSessie={setWeekSelectedSessie}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <Monitor className="w-12 h-12 text-autronis-text-secondary opacity-30 mb-4" />
                <p className="text-autronis-text-secondary text-sm">Geen data voor deze week</p>
              </div>
            )
          )}
        </div>

        {/* Detail panel — desktop */}
        {activeSessieDetail && (
          <div className="w-72 shrink-0 hidden lg:block">
            <SessieDetailPanel
              sessie={{ ...activeSessieDetail, isHandmatig: activeSessieDetail.app === "Handmatig" }}
              onClose={() => {
                setSelectedIdx(null);
                setWeekSelectedSessie(null);
              }}
            />
          </div>
        )}
      </div>

      {/* Mobile detail (bottom sheet style) */}
      {activeSessieDetail && (
        <div className="lg:hidden">
          <SessieDetailPanel
            sessie={{ ...activeSessieDetail, isHandmatig: activeSessieDetail.app === "Handmatig" }}
            onClose={() => {
              setSelectedIdx(null);
              setWeekSelectedSessie(null);
            }}
          />
        </div>
      )}

      {/* 4. Category legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
        {Object.entries(CATEGORIE_KLEUREN).map(([cat, kleur]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: kleur, opacity: cat === "inactief" ? 0.5 : 0.85 }}
            />
            <span className="text-[11px] text-autronis-text-secondary">
              {CATEGORIE_LABELS[cat]}
            </span>
          </div>
        ))}
        {/* Handmatig legend item */}
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-autronis-accent/60" />
          <span className="text-[11px] text-autronis-text-secondary">Handmatig</span>
        </div>
      </div>
    </div>
  );
}

export default TabTijdlijn;
