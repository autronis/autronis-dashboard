"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  Zap,
  User,
  ChevronRight,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn, formatBedrag } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/ui/page-transition";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { ProgressRing } from "@/components/ui/progress-ring";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// ---- Types ----

interface KeyResult {
  id?: number;
  objectiveId?: number;
  titel: string;
  doelwaarde: number;
  huidigeWaarde: number;
  eenheid: string | null;
  autoKoppeling: string | null;
}

interface Doel {
  id: number;
  titel: string;
  omschrijving: string | null;
  eigenaarId: number | null;
  kwartaal: number;
  jaar: number;
  status: string | null;
  keyResults: KeyResult[];
  voortgang: number;
}

interface GebruikerOptie {
  id: number;
  naam: string;
}

// ---- Helpers ----

function voortgangKleur(pct: number): string {
  if (pct >= 75) return "#22c55e";
  if (pct >= 40) return "#f59e0b";
  return "#ef4444";
}

function voortgangTekstKleur(pct: number): string {
  if (pct >= 75) return "text-green-400";
  if (pct >= 40) return "text-yellow-400";
  return "text-red-400";
}

function statusBadgeKleur(status: string | null): string {
  switch (status) {
    case "actief": return "bg-autronis-accent/20 text-autronis-accent";
    case "afgerond": return "bg-green-500/20 text-green-400";
    case "geannuleerd": return "bg-red-500/20 text-red-400";
    default: return "bg-autronis-border text-autronis-text-secondary";
  }
}

function autoKoppelingLabel(koppeling: string | null): string {
  switch (koppeling) {
    case "omzet": return "Omzet";
    case "uren": return "Uren";
    case "taken": return "Taken";
    case "klanten": return "Klanten";
    default: return "";
  }
}

function formatKrWaarde(waarde: number, eenheid: string | null, koppeling: string | null): string {
  if (koppeling === "omzet" || eenheid === "euro") return formatBedrag(waarde);
  if (koppeling === "uren" || eenheid === "uren") return `${Math.round(waarde)}u`;
  return String(Math.round(waarde * 10) / 10);
}

// ---- Skeleton ----

function DoelenSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-8 space-y-8">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-16 rounded-lg" />
        <Skeleton className="h-10 w-16 rounded-lg" />
        <Skeleton className="h-10 w-16 rounded-lg" />
        <Skeleton className="h-10 w-16 rounded-lg" />
      </div>
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

// ---- Empty Key Result form row ----

function emptyKr(): KeyResult {
  return {
    titel: "",
    doelwaarde: 0,
    huidigeWaarde: 0,
    eenheid: null,
    autoKoppeling: "geen",
  };
}

// ---- Main Page ----

export default function DoelenPage() {
  const { addToast } = useToast();
  const [doelen, setDoelen] = useState<Doel[]>([]);
  const [loading, setLoading] = useState(true);
  const [gebruikers, setGebruikers] = useState<GebruikerOptie[]>([]);

  // Kwartaal + jaar state
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const [kwartaal, setKwartaal] = useState(currentQuarter);
  const [jaar, setJaar] = useState(new Date().getFullYear());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editDoel, setEditDoel] = useState<Doel | null>(null);
  const [formTitel, setFormTitel] = useState("");
  const [formOmschrijving, setFormOmschrijving] = useState("");
  const [formEigenaarId, setFormEigenaarId] = useState<number | "">("");
  const [formKeyResults, setFormKeyResults] = useState<KeyResult[]>([emptyKr()]);
  const [opslaan, setOpslaan] = useState(false);

  // Delete confirm
  const [verwijderDoel, setVerwijderDoel] = useState<Doel | null>(null);

  // Inline KR update
  const [editKrId, setEditKrId] = useState<number | null>(null);
  const [editKrWaarde, setEditKrWaarde] = useState("");

  // Jaaroverzicht
  const [jaaroverzichtOpen, setJaaroverzichtOpen] = useState(false);
  const [jaaroverzichtData, setJaaroverzichtData] = useState<Record<number, Doel[]>>({});
  const [jaaroverzichtLoading, setJaaroverzichtLoading] = useState(false);

  const fetchDoelen = useCallback(async () => {
    try {
      const res = await fetch(`/api/doelen?kwartaal=${kwartaal}&jaar=${jaar}`);
      if (!res.ok) throw new Error("Laden mislukt");
      const json = await res.json() as { doelen: Doel[] };
      setDoelen(json.doelen);
    } catch {
      addToast("Kon doelen niet laden", "fout");
    } finally {
      setLoading(false);
    }
  }, [kwartaal, jaar, addToast]);

  const fetchGebruikers = useCallback(async () => {
    try {
      const res = await fetch("/api/profiel");
      if (res.ok) {
        const json = await res.json() as { gebruiker: GebruikerOptie };
        // Fetch all users if we can
        const allRes = await fetch("/api/analytics/vergelijk");
        if (allRes.ok) {
          const allJson = await allRes.json() as { gebruikers: GebruikerOptie[] };
          setGebruikers(allJson.gebruikers || [json.gebruiker]);
        } else {
          setGebruikers([json.gebruiker]);
        }
      }
    } catch {
      // Non-critical, ignore
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchDoelen();
  }, [fetchDoelen]);

  useEffect(() => {
    fetchGebruikers();
  }, [fetchGebruikers]);

  // Open modal for new/edit
  function openNieuw() {
    setEditDoel(null);
    setFormTitel("");
    setFormOmschrijving("");
    setFormEigenaarId("");
    setFormKeyResults([emptyKr()]);
    setModalOpen(true);
  }

  function openBewerken(doel: Doel) {
    setEditDoel(doel);
    setFormTitel(doel.titel);
    setFormOmschrijving(doel.omschrijving || "");
    setFormEigenaarId(doel.eigenaarId || "");
    setFormKeyResults(
      doel.keyResults.length > 0
        ? doel.keyResults.map((kr) => ({ ...kr }))
        : [emptyKr()]
    );
    setModalOpen(true);
  }

  // Save
  async function handleOpslaan() {
    if (!formTitel.trim()) {
      addToast("Titel is verplicht", "fout");
      return;
    }
    const validKrs = formKeyResults.filter((kr) => kr.titel.trim() && kr.doelwaarde > 0);
    if (validKrs.length === 0) {
      addToast("Voeg minimaal 1 key result toe", "fout");
      return;
    }
    setOpslaan(true);
    try {
      const payload = {
        titel: formTitel.trim(),
        omschrijving: formOmschrijving.trim() || undefined,
        eigenaarId: formEigenaarId || undefined,
        kwartaal,
        jaar,
        keyResults: validKrs.map((kr) => ({
          id: kr.id,
          titel: kr.titel,
          doelwaarde: kr.doelwaarde,
          huidigeWaarde: kr.huidigeWaarde || 0,
          eenheid: kr.eenheid,
          autoKoppeling: kr.autoKoppeling || "geen",
        })),
      };

      const url = editDoel ? `/api/doelen/${editDoel.id}` : "/api/doelen";
      const method = editDoel ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json() as { fout: string };
        throw new Error(d.fout || "Opslaan mislukt");
      }

      addToast(editDoel ? "Doel bijgewerkt" : "Doel aangemaakt", "succes");
      setModalOpen(false);
      fetchDoelen();
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Opslaan mislukt", "fout");
    } finally {
      setOpslaan(false);
    }
  }

  // Delete
  async function handleVerwijderen() {
    if (!verwijderDoel) return;
    try {
      const res = await fetch(`/api/doelen/${verwijderDoel.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Verwijderen mislukt");
      addToast("Doel verwijderd", "succes");
      setVerwijderDoel(null);
      fetchDoelen();
    } catch {
      addToast("Kon doel niet verwijderen", "fout");
    }
  }

  // Inline KR update
  async function handleKrUpdate(doelId: number, krId: number) {
    const waarde = Number(editKrWaarde);
    if (isNaN(waarde)) return;
    try {
      const res = await fetch(`/api/doelen/${doelId}/key-results/${krId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ huidigeWaarde: waarde }),
      });
      if (!res.ok) throw new Error("Update mislukt");
      addToast("Voortgang bijgewerkt", "succes");
      setEditKrId(null);
      fetchDoelen();
    } catch {
      addToast("Kon waarde niet bijwerken", "fout");
    }
  }

  // Jaaroverzicht
  async function loadJaaroverzicht() {
    setJaaroverzichtOpen(true);
    setJaaroverzichtLoading(true);
    const data: Record<number, Doel[]> = {};
    for (let q = 1; q <= 4; q++) {
      try {
        const res = await fetch(`/api/doelen?kwartaal=${q}&jaar=${jaar}`);
        if (res.ok) {
          const json = await res.json() as { doelen: Doel[] };
          data[q] = json.doelen;
        }
      } catch {
        data[q] = [];
      }
    }
    setJaaroverzichtData(data);
    setJaaroverzichtLoading(false);
  }

  // KR form helpers
  function updateKr(index: number, field: keyof KeyResult, value: string | number | null) {
    setFormKeyResults((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function removeKr(index: number) {
    setFormKeyResults((prev) => prev.filter((_, i) => i !== index));
  }

  if (loading) return <DoelenSkeleton />;

  const inputClasses =
    "w-full bg-autronis-bg border border-autronis-border rounded-lg px-3 py-2.5 text-sm text-autronis-text-primary placeholder:text-autronis-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-autronis-accent/50 focus:border-autronis-accent transition-colors";

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto p-4 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-autronis-text-primary">Doelen (OKR)</h1>
            <p className="text-base text-autronis-text-secondary mt-1">
              Objectives & Key Results per kwartaal
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadJaaroverzicht}
              className="px-4 py-2.5 text-sm font-medium text-autronis-text-secondary hover:text-autronis-text-primary bg-autronis-card border border-autronis-border rounded-xl transition-colors"
            >
              Jaaroverzicht
            </button>
            <button
              onClick={openNieuw}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-autronis-accent hover:bg-autronis-accent-hover text-autronis-bg rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-autronis-accent/20"
            >
              <Plus className="w-4 h-4" />
              Nieuw doel
            </button>
          </div>
        </div>

        {/* Kwartaal + Jaar selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-autronis-card border border-autronis-border rounded-xl p-1">
            {[1, 2, 3, 4].map((q) => (
              <button
                key={q}
                onClick={() => setKwartaal(q)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  kwartaal === q
                    ? "bg-autronis-accent text-autronis-bg"
                    : "text-autronis-text-secondary hover:text-autronis-text-primary"
                )}
              >
                Q{q}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setJaar(jaar - 1)}
              className="px-3 py-2 text-sm text-autronis-text-secondary hover:text-autronis-text-primary bg-autronis-card border border-autronis-border rounded-lg transition-colors"
            >
              {jaar - 1}
            </button>
            <span className="px-4 py-2 text-sm font-bold text-autronis-bg bg-autronis-accent rounded-lg">
              {jaar}
            </span>
            <button
              onClick={() => setJaar(jaar + 1)}
              className="px-3 py-2 text-sm text-autronis-text-secondary hover:text-autronis-text-primary bg-autronis-card border border-autronis-border rounded-lg transition-colors"
            >
              {jaar + 1}
            </button>
          </div>
        </div>

        {/* Doelen list */}
        {doelen.length === 0 ? (
          <EmptyState
            titel="Geen doelen voor dit kwartaal"
            beschrijving={`Maak je eerste OKR aan voor Q${kwartaal} ${jaar}`}
            actieLabel="Nieuw doel"
            onActie={openNieuw}
            icoon={<Target className="h-7 w-7 text-autronis-text-secondary" />}
          />
        ) : (
          <div className="space-y-6">
            {doelen.map((doel, doelIndex) => {
              const eigenaar = gebruikers.find((g) => g.id === doel.eigenaarId);
              return (
                <motion.div
                  key={doel.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: doelIndex * 0.05 }}
                  className="bg-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-7 card-glow"
                >
                  {/* Objective header */}
                  <div className="flex items-start gap-4 mb-6">
                    <ProgressRing
                      percentage={doel.voortgang}
                      size={72}
                      strokeWidth={6}
                      color={voortgangKleur(doel.voortgang)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <h3 className="text-lg font-semibold text-autronis-text-primary">
                          {doel.titel}
                        </h3>
                        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", statusBadgeKleur(doel.status))}>
                          {doel.status === "actief" ? "Actief" : doel.status === "afgerond" ? "Afgerond" : "Geannuleerd"}
                        </span>
                        {eigenaar && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-autronis-border text-autronis-text-secondary">
                            <User className="w-3 h-3" />
                            {eigenaar.naam}
                          </span>
                        )}
                      </div>
                      {doel.omschrijving && (
                        <p className="text-sm text-autronis-text-secondary">{doel.omschrijving}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openBewerken(doel)}
                        className="p-2 rounded-lg hover:bg-autronis-border text-autronis-text-secondary transition-colors"
                        title="Bewerken"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setVerwijderDoel(doel)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-autronis-text-secondary hover:text-red-400 transition-colors"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Key Results */}
                  <div className="space-y-4">
                    {doel.keyResults.map((kr) => {
                      const pct = kr.doelwaarde > 0
                        ? Math.min(((kr.huidigeWaarde ?? 0) / kr.doelwaarde) * 100, 100)
                        : 0;
                      const isAuto = kr.autoKoppeling && kr.autoKoppeling !== "geen";
                      const isEditing = editKrId === kr.id;

                      return (
                        <div
                          key={kr.id}
                          className="bg-autronis-bg/50 rounded-xl p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-medium text-autronis-text-primary truncate">
                                {kr.titel}
                              </span>
                              {isAuto && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-autronis-accent/15 text-autronis-accent flex-shrink-0">
                                  <Zap className="w-2.5 h-2.5" />
                                  Automatisch ({autoKoppelingLabel(kr.autoKoppeling)})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={editKrWaarde}
                                    onChange={(e) => setEditKrWaarde(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && kr.id) handleKrUpdate(doel.id, kr.id);
                                      if (e.key === "Escape") setEditKrId(null);
                                    }}
                                    className="w-20 bg-autronis-bg border border-autronis-accent rounded-lg px-2 py-1 text-xs text-autronis-text-primary focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => kr.id && handleKrUpdate(doel.id, kr.id)}
                                    className="text-xs text-autronis-accent hover:text-autronis-accent-hover"
                                  >
                                    OK
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    if (!isAuto && kr.id) {
                                      setEditKrId(kr.id);
                                      setEditKrWaarde(String(kr.huidigeWaarde ?? 0));
                                    }
                                  }}
                                  disabled={!!isAuto}
                                  className={cn(
                                    "text-sm tabular-nums",
                                    isAuto
                                      ? "text-autronis-text-secondary cursor-default"
                                      : "text-autronis-text-primary hover:text-autronis-accent cursor-pointer"
                                  )}
                                >
                                  {formatKrWaarde(kr.huidigeWaarde ?? 0, kr.eenheid, kr.autoKoppeling)}
                                  <span className="text-autronis-text-secondary mx-1">/</span>
                                  {formatKrWaarde(kr.doelwaarde, kr.eenheid, kr.autoKoppeling)}
                                </button>
                              )}
                              <span className={cn("text-xs font-semibold tabular-nums min-w-[40px] text-right", voortgangTekstKleur(pct))}>
                                {Math.round(pct)}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-autronis-border rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: voortgangKleur(pct) }}
                              initial={{ width: "0%" }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ---- New/Edit Modal ---- */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          titel={editDoel ? "Doel bewerken" : "Nieuw doel"}
          breedte="lg"
          footer={
            <>
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm text-autronis-text-secondary hover:text-autronis-text-primary transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleOpslaan}
                disabled={opslaan}
                className="px-5 py-2 bg-autronis-accent hover:bg-autronis-accent-hover text-autronis-bg rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {opslaan ? "Opslaan..." : editDoel ? "Bijwerken" : "Aanmaken"}
              </button>
            </>
          }
        >
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-autronis-text-secondary">Titel *</label>
              <input
                type="text"
                value={formTitel}
                onChange={(e) => setFormTitel(e.target.value)}
                placeholder="Bijv. Meer klanten binnenhalen"
                className={inputClasses}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-autronis-text-secondary">Omschrijving</label>
              <textarea
                value={formOmschrijving}
                onChange={(e) => setFormOmschrijving(e.target.value)}
                placeholder="Optionele toelichting..."
                rows={2}
                className={cn(inputClasses, "resize-none")}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-autronis-text-secondary">Eigenaar</label>
              <select
                value={formEigenaarId}
                onChange={(e) => setFormEigenaarId(e.target.value ? Number(e.target.value) : "")}
                className={cn(inputClasses, "cursor-pointer")}
              >
                <option value="">Geen eigenaar</option>
                {gebruikers.map((g) => (
                  <option key={g.id} value={g.id}>{g.naam}</option>
                ))}
              </select>
            </div>

            {/* Key Results */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-autronis-text-secondary">Key Results</label>
                <button
                  onClick={() => setFormKeyResults((prev) => [...prev, emptyKr()])}
                  className="text-xs text-autronis-accent hover:text-autronis-accent-hover transition-colors"
                >
                  + Key result toevoegen
                </button>
              </div>
              <div className="space-y-3">
                {formKeyResults.map((kr, i) => (
                  <div key={i} className="bg-autronis-bg rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-autronis-accent w-5">KR{i + 1}</span>
                      <input
                        type="text"
                        value={kr.titel}
                        onChange={(e) => updateKr(i, "titel", e.target.value)}
                        placeholder="Key result titel"
                        className={cn(inputClasses, "flex-1")}
                      />
                      {formKeyResults.length > 1 && (
                        <button
                          onClick={() => removeKr(i)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-autronis-text-secondary hover:text-red-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] text-autronis-text-secondary">Doelwaarde</label>
                        <input
                          type="number"
                          value={kr.doelwaarde || ""}
                          onChange={(e) => updateKr(i, "doelwaarde", Number(e.target.value))}
                          placeholder="0"
                          className={inputClasses}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] text-autronis-text-secondary">Eenheid</label>
                        <input
                          type="text"
                          value={kr.eenheid || ""}
                          onChange={(e) => updateKr(i, "eenheid", e.target.value || null)}
                          placeholder="euro, uren, stuks..."
                          className={inputClasses}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] text-autronis-text-secondary">Auto-koppeling</label>
                        <select
                          value={kr.autoKoppeling || "geen"}
                          onChange={(e) => updateKr(i, "autoKoppeling", e.target.value)}
                          className={cn(inputClasses, "cursor-pointer")}
                        >
                          <option value="geen">Geen (handmatig)</option>
                          <option value="omzet">Omzet (facturen)</option>
                          <option value="uren">Uren (tijdreg.)</option>
                          <option value="taken">Taken (afgerond)</option>
                          <option value="klanten">Klanten (nieuw)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>

        {/* Delete confirm */}
        <ConfirmDialog
          open={!!verwijderDoel}
          onClose={() => setVerwijderDoel(null)}
          onBevestig={handleVerwijderen}
          titel="Doel verwijderen"
          bericht={`Weet je zeker dat je "${verwijderDoel?.titel}" wilt verwijderen? Alle key results worden ook verwijderd.`}
          bevestigTekst="Verwijderen"
          variant="danger"
        />

        {/* Jaaroverzicht Modal */}
        <Modal
          open={jaaroverzichtOpen}
          onClose={() => setJaaroverzichtOpen(false)}
          titel={`Jaaroverzicht ${jaar}`}
          breedte="lg"
        >
          {jaaroverzichtLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((q) => {
                const qDoelen = jaaroverzichtData[q] || [];
                const avgVoortgang = qDoelen.length > 0
                  ? qDoelen.reduce((s, d) => s + d.voortgang, 0) / qDoelen.length
                  : 0;
                const isCurrent = q === currentQuarter && jaar === new Date().getFullYear();

                return (
                  <div
                    key={q}
                    className={cn(
                      "rounded-xl p-4 border",
                      isCurrent
                        ? "border-autronis-accent/50 bg-autronis-accent/5"
                        : "border-autronis-border bg-autronis-bg/50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={cn(
                        "text-sm font-bold",
                        isCurrent ? "text-autronis-accent" : "text-autronis-text-primary"
                      )}>
                        Q{q}
                      </span>
                      <span className={cn("text-xs font-semibold tabular-nums", voortgangTekstKleur(avgVoortgang))}>
                        {Math.round(avgVoortgang)}% gem.
                      </span>
                    </div>
                    {qDoelen.length === 0 ? (
                      <p className="text-xs text-autronis-text-secondary">Geen doelen</p>
                    ) : (
                      <div className="space-y-2">
                        {qDoelen.map((d) => (
                          <div key={d.id} className="flex items-center gap-2">
                            <div className="w-full h-1.5 bg-autronis-border rounded-full overflow-hidden flex-1">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${d.voortgang}%`,
                                  backgroundColor: voortgangKleur(d.voortgang),
                                }}
                              />
                            </div>
                            <span className="text-[11px] text-autronis-text-secondary truncate max-w-[100px]">
                              {d.titel}
                            </span>
                            <button
                              onClick={() => {
                                setKwartaal(q);
                                setJaaroverzichtOpen(false);
                              }}
                              className="text-autronis-text-secondary hover:text-autronis-accent transition-colors flex-shrink-0"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      </div>
    </PageTransition>
  );
}
