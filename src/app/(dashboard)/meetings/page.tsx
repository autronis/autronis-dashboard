"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Mic,
  Upload,
  FileText,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  Trash2,
  ChevronDown,
  Plus,
  Loader2,
  X,
  ArrowLeft,
  Calendar,
  Users,
  ClipboardList,
} from "lucide-react";
import { cn, formatDatum } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/ui/page-transition";
import {
  useMeetings,
  useMeeting,
  useUploadMeeting,
  useVerwerkMeeting,
  useSubmitTranscript,
  useDeleteMeeting,
} from "@/hooks/queries/use-meetings";
import type { Meeting } from "@/hooks/queries/use-meetings";

interface Klant {
  id: number;
  bedrijfsnaam: string;
}

interface Project {
  id: number;
  naam: string;
  klantId: number;
}

const statusConfig = {
  verwerken: { label: "Verwerken", color: "text-yellow-400", bg: "bg-yellow-500/15" },
  klaar: { label: "Klaar", color: "text-emerald-400", bg: "bg-emerald-500/15" },
  mislukt: { label: "Mislukt", color: "text-red-400", bg: "bg-red-500/15" },
} as const;

const verantwoordelijkeConfig: Record<string, { color: string; bg: string }> = {
  sem: { color: "text-autronis-accent", bg: "bg-autronis-accent/15" },
  syb: { color: "text-blue-400", bg: "bg-blue-500/15" },
  klant: { color: "text-purple-400", bg: "bg-purple-500/15" },
};

function getVerantwoordelijkeStyle(naam: string) {
  const lower = naam.toLowerCase();
  if (lower.includes("sem")) return verantwoordelijkeConfig.sem;
  if (lower.includes("syb")) return verantwoordelijkeConfig.syb;
  return verantwoordelijkeConfig.klant;
}

export default function MeetingsPage() {
  const { addToast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [pasteTranscript, setPasteTranscript] = useState("");

  const { data: meetings = [], isLoading } = useMeetings();
  const { data: selectedMeeting } = useMeeting(selectedId ?? 0);
  const uploadMutation = useUploadMeeting();
  const verwerkMutation = useVerwerkMeeting();
  const transcriptMutation = useSubmitTranscript();
  const deleteMutation = useDeleteMeeting();

  // KPI calculations
  const totaal = meetings.length;
  const dezeMaand = meetings.filter((m) => {
    const d = new Date(m.datum);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const inVerwerking = meetings.filter((m) => m.status === "verwerken").length;

  const handleDelete = useCallback(
    (id: number) => {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          addToast("Meeting verwijderd", "succes");
          if (selectedId === id) setSelectedId(null);
        },
        onError: () => addToast("Kon meeting niet verwijderen", "fout"),
      });
    },
    [deleteMutation, addToast, selectedId]
  );

  const handleSubmitTranscript = useCallback(
    (id: number) => {
      if (!pasteTranscript.trim()) return;
      transcriptMutation.mutate(
        { id, transcript: pasteTranscript },
        {
          onSuccess: () => {
            addToast("Transcript verzonden voor verwerking", "succes");
            setPasteTranscript("");
          },
          onError: () => addToast("Kon transcript niet verwerken", "fout"),
        }
      );
    },
    [transcriptMutation, pasteTranscript, addToast]
  );

  const handleVerwerk = useCallback(
    (id: number) => {
      verwerkMutation.mutate(id, {
        onSuccess: () => addToast("Verwerking gestart", "succes"),
        onError: () => addToast("Verwerking mislukt", "fout"),
      });
    },
    [verwerkMutation, addToast]
  );

  // Detail view
  if (selectedId && selectedMeeting) {
    const m = selectedMeeting;
    const sc = statusConfig[m.status];

    return (
      <PageTransition>
        <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6">
          {/* Back + header */}
          <div>
            <button
              onClick={() => setSelectedId(null)}
              className="flex items-center gap-2 text-autronis-text-secondary hover:text-autronis-accent transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Terug naar overzicht
            </button>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-autronis-text-primary">{m.titel}</h1>
                <div className="flex items-center gap-3 mt-2 text-autronis-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {formatDatum(m.datum)}
                  </span>
                  {m.klantNaam && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-autronis-accent/15 text-autronis-accent">
                      {m.klantNaam}
                    </span>
                  )}
                  {m.projectNaam && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400">
                      {m.projectNaam}
                    </span>
                  )}
                  <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1.5", sc.bg, sc.color)}>
                    {m.status === "verwerken" && <Loader2 className="w-3 h-3 animate-spin" />}
                    {sc.label}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(m.id)}
                className="p-2 text-autronis-text-secondary hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {m.status === "verwerken" && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
              <p className="text-yellow-400 font-medium">Meeting wordt verwerkt...</p>
            </div>
          )}

          {m.status === "mislukt" && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
              <p className="text-red-400 font-medium mb-3">Verwerking mislukt</p>
              <button
                onClick={() => handleVerwerk(m.id)}
                disabled={verwerkMutation.isPending}
                className="px-4 py-2 bg-autronis-accent text-autronis-bg rounded-xl font-medium hover:bg-autronis-accent-hover transition-colors disabled:opacity-50"
              >
                {verwerkMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Opnieuw verwerken"}
              </button>
            </div>
          )}

          {/* Samenvatting */}
          {m.samenvatting && (
            <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-7 card-glow">
              <h2 className="text-lg font-semibold text-autronis-text-primary flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-autronis-accent" />
                Samenvatting
              </h2>
              <div className="text-autronis-text-secondary leading-relaxed whitespace-pre-wrap">{m.samenvatting}</div>
            </div>
          )}

          {/* Actiepunten */}
          {m.actiepunten.length > 0 && (
            <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-7 card-glow">
              <h2 className="text-lg font-semibold text-autronis-text-primary flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Actiepunten
                <span className="text-sm font-normal text-autronis-text-secondary">({m.actiepunten.length})</span>
              </h2>
              <div className="space-y-3">
                {m.actiepunten.map((ap, i) => {
                  const style = getVerantwoordelijkeStyle(ap.verantwoordelijke);
                  return (
                    <div key={i} className="flex items-start gap-3 bg-autronis-bg/30 rounded-xl px-4 py-3">
                      <CheckCircle2 className="w-4 h-4 text-autronis-text-secondary mt-0.5 flex-shrink-0" />
                      <span className="text-autronis-text-primary flex-1">{ap.tekst}</span>
                      <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0", style.bg, style.color)}>
                        {ap.verantwoordelijke}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Besluiten */}
          {m.besluiten.length > 0 && (
            <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-7 card-glow">
              <h2 className="text-lg font-semibold text-autronis-text-primary flex items-center gap-2 mb-4">
                <ClipboardList className="w-5 h-5 text-blue-400" />
                Besluiten
                <span className="text-sm font-normal text-autronis-text-secondary">({m.besluiten.length})</span>
              </h2>
              <div className="space-y-2">
                {m.besluiten.map((b, i) => (
                  <div key={i} className="flex items-start gap-3 bg-autronis-bg/30 rounded-xl px-4 py-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                    <span className="text-autronis-text-primary">{b}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Open vragen */}
          {m.openVragen.length > 0 && (
            <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-7 card-glow">
              <h2 className="text-lg font-semibold text-autronis-text-primary flex items-center gap-2 mb-4">
                <HelpCircle className="w-5 h-5 text-yellow-400" />
                Open vragen
                <span className="text-sm font-normal text-autronis-text-secondary">({m.openVragen.length})</span>
              </h2>
              <div className="space-y-2">
                {m.openVragen.map((v, i) => (
                  <div key={i} className="flex items-start gap-3 bg-autronis-bg/30 rounded-xl px-4 py-3">
                    <HelpCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <span className="text-autronis-text-primary">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transcript */}
          {m.transcript ? (
            <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-7 card-glow">
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="flex items-center gap-2 text-lg font-semibold text-autronis-text-primary w-full"
              >
                <MessageSquare className="w-5 h-5 text-autronis-text-secondary" />
                Transcript
                <ChevronDown className={cn("w-5 h-5 text-autronis-text-secondary ml-auto transition-transform", showTranscript && "rotate-180")} />
              </button>
              {showTranscript && (
                <div className="mt-4 text-sm text-autronis-text-secondary leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {m.transcript}
                </div>
              )}
            </div>
          ) : m.status !== "verwerken" ? (
            <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-7 card-glow">
              <h2 className="text-lg font-semibold text-autronis-text-primary flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-autronis-text-secondary" />
                Transcript plakken
              </h2>
              <textarea
                value={pasteTranscript}
                onChange={(e) => setPasteTranscript(e.target.value)}
                placeholder="Plak hier het transcript van de meeting..."
                rows={8}
                className="w-full bg-autronis-bg border border-autronis-border rounded-xl px-4 py-3 text-sm text-autronis-text-primary placeholder:text-autronis-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-autronis-accent/50 focus:border-autronis-accent transition-colors resize-none"
              />
              <button
                onClick={() => handleSubmitTranscript(m.id)}
                disabled={transcriptMutation.isPending || !pasteTranscript.trim()}
                className="mt-3 px-5 py-2.5 bg-autronis-accent text-autronis-bg rounded-xl font-medium hover:bg-autronis-accent-hover transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {transcriptMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Verwerk
              </button>
            </div>
          ) : null}
        </div>
      </PageTransition>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 lg:p-8 flex items-center justify-center min-h-[400px]">
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
            <h1 className="text-3xl font-bold text-autronis-text-primary">Meetings</h1>
            <p className="text-base text-autronis-text-secondary mt-1">
              {totaal} meetings &middot; {inVerwerking} in verwerking
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-autronis-accent text-autronis-bg rounded-xl font-medium hover:bg-autronis-accent-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nieuwe meeting
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 card-glow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-autronis-accent/10 rounded-xl">
                <Mic className="w-5 h-5 text-autronis-accent" />
              </div>
            </div>
            <p className="text-3xl font-bold text-autronis-text-primary tabular-nums">{totaal}</p>
            <p className="text-sm text-autronis-text-secondary mt-1.5 uppercase tracking-wide">Totaal meetings</p>
          </div>

          <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 card-glow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-blue-500/10 rounded-xl">
                <Calendar className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-400 tabular-nums">{dezeMaand}</p>
            <p className="text-sm text-autronis-text-secondary mt-1.5 uppercase tracking-wide">Deze maand</p>
          </div>

          <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 card-glow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-yellow-500/10 rounded-xl">
                <Loader2 className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-yellow-400 tabular-nums">{inVerwerking}</p>
            <p className="text-sm text-autronis-text-secondary mt-1.5 uppercase tracking-wide">In verwerking</p>
          </div>
        </div>

        {/* Meeting list */}
        <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-7">
          <h2 className="text-lg font-semibold text-autronis-text-primary mb-5">Alle meetings</h2>

          {meetings.length === 0 ? (
            <div className="text-center py-12">
              <Mic className="w-12 h-12 text-autronis-text-secondary/30 mx-auto mb-4" />
              <p className="text-autronis-text-secondary">Nog geen meetings</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-3 text-autronis-accent hover:text-autronis-accent-hover transition-colors text-sm font-medium"
              >
                Voeg je eerste meeting toe
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {meetings.map((m) => {
                const sc = statusConfig[m.status];
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    className="w-full text-left bg-autronis-bg/30 rounded-xl border border-autronis-border/50 px-5 py-4 hover:border-autronis-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <p className="text-base font-medium text-autronis-text-primary truncate">{m.titel}</p>
                          <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1.5 flex-shrink-0", sc.bg, sc.color)}>
                            {m.status === "verwerken" && <Loader2 className="w-3 h-3 animate-spin" />}
                            {sc.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-sm text-autronis-text-secondary">
                          <span>{formatDatum(m.datum)}</span>
                          {m.klantNaam && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-autronis-accent/10 text-autronis-accent">
                              {m.klantNaam}
                            </span>
                          )}
                          {m.projectNaam && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-400">
                              {m.projectNaam}
                            </span>
                          )}
                          {m.status === "klaar" && (
                            <span className="text-xs text-autronis-text-secondary">
                              {m.actiepunten.length} actiepunten &middot; {m.besluiten.length} besluiten
                            </span>
                          )}
                        </div>
                      </div>
                      <Trash2
                        className="w-4 h-4 text-autronis-text-secondary hover:text-red-400 transition-colors flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(m.id);
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Upload modal */}
        {showModal && <UploadModal onClose={() => setShowModal(false)} uploadMutation={uploadMutation} verwerkMutation={verwerkMutation} addToast={addToast} />}
      </div>
    </PageTransition>
  );
}

// ---- Upload Modal ----

interface UploadModalProps {
  onClose: () => void;
  uploadMutation: ReturnType<typeof useUploadMeeting>;
  verwerkMutation: ReturnType<typeof useVerwerkMeeting>;
  addToast: (msg: string, type: "succes" | "fout") => void;
}

function UploadModal({ onClose, uploadMutation, verwerkMutation, addToast }: UploadModalProps) {
  const [titel, setTitel] = useState("");
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
  const [klantId, setKlantId] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [klanten, setKlanten] = useState<Klant[]>([]);
  const [projecten, setProjecten] = useState<Project[]>([]);

  useEffect(() => {
    fetch("/api/klanten")
      .then((r) => r.json())
      .then((d) => setKlanten(d.klanten || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!klantId) {
      setProjecten([]);
      setProjectId(null);
      return;
    }
    fetch(`/api/projecten?klantId=${klantId}`)
      .then((r) => r.json())
      .then((d) => setProjecten(d.projecten || []))
      .catch(() => {});
  }, [klantId]);

  const handleSubmit = async () => {
    if (!titel.trim()) {
      addToast("Titel is verplicht", "fout");
      return;
    }

    const formData = new FormData();
    formData.append("titel", titel);
    formData.append("datum", datum);
    if (klantId) formData.append("klantId", String(klantId));
    if (projectId) formData.append("projectId", String(projectId));
    if (audioFile) formData.append("audio", audioFile);
    if (transcript.trim()) formData.append("transcript", transcript);

    uploadMutation.mutate(formData, {
      onSuccess: (data) => {
        addToast("Meeting aangemaakt", "succes");
        const meetingId = data?.meeting?.id;
        if (meetingId && (audioFile || transcript.trim())) {
          verwerkMutation.mutate(meetingId, {
            onSuccess: () => addToast("Verwerking gestart", "succes"),
            onError: () => addToast("Verwerking mislukt", "fout"),
          });
        }
        onClose();
      },
      onError: (err) => addToast(err.message || "Upload mislukt", "fout"),
    });
  };

  const submitting = uploadMutation.isPending || verwerkMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-8 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-autronis-text-primary">Nieuwe meeting</h2>
          <button onClick={onClose} className="p-1 text-autronis-text-secondary hover:text-autronis-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Titel */}
          <div>
            <label className="block text-sm font-medium text-autronis-text-secondary mb-1.5">Titel *</label>
            <input
              type="text"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="Bijv. Kickoff project X"
              className="w-full bg-autronis-bg border border-autronis-border rounded-xl px-4 py-2.5 text-sm text-autronis-text-primary placeholder:text-autronis-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-autronis-accent/50 focus:border-autronis-accent transition-colors"
            />
          </div>

          {/* Datum */}
          <div>
            <label className="block text-sm font-medium text-autronis-text-secondary mb-1.5">Datum</label>
            <input
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              className="w-full bg-autronis-bg border border-autronis-border rounded-xl px-4 py-2.5 text-sm text-autronis-text-primary focus:outline-none focus:ring-2 focus:ring-autronis-accent/50 focus:border-autronis-accent transition-colors"
            />
          </div>

          {/* Klant */}
          <div>
            <label className="block text-sm font-medium text-autronis-text-secondary mb-1.5">Klant (optioneel)</label>
            <select
              value={klantId ?? ""}
              onChange={(e) => setKlantId(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-autronis-bg border border-autronis-border rounded-xl px-4 py-2.5 text-sm text-autronis-text-primary focus:outline-none focus:ring-2 focus:ring-autronis-accent/50 focus:border-autronis-accent transition-colors"
            >
              <option value="">Geen klant</option>
              {klanten.map((k) => (
                <option key={k.id} value={k.id}>{k.bedrijfsnaam}</option>
              ))}
            </select>
          </div>

          {/* Project */}
          {klantId && projecten.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-autronis-text-secondary mb-1.5">Project (optioneel)</label>
              <select
                value={projectId ?? ""}
                onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-autronis-bg border border-autronis-border rounded-xl px-4 py-2.5 text-sm text-autronis-text-primary focus:outline-none focus:ring-2 focus:ring-autronis-accent/50 focus:border-autronis-accent transition-colors"
              >
                <option value="">Geen project</option>
                {projecten.map((p) => (
                  <option key={p.id} value={p.id}>{p.naam}</option>
                ))}
              </select>
            </div>
          )}

          {/* Audio upload */}
          <div>
            <label className="block text-sm font-medium text-autronis-text-secondary mb-1.5">Audio bestand</label>
            <label className="flex items-center gap-3 bg-autronis-bg border border-autronis-border border-dashed rounded-xl px-4 py-4 cursor-pointer hover:border-autronis-accent/50 transition-colors">
              <Upload className="w-5 h-5 text-autronis-text-secondary" />
              <span className="text-sm text-autronis-text-secondary">
                {audioFile ? audioFile.name : "Kies een audiobestand..."}
              </span>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-autronis-border" />
            <span className="text-xs text-autronis-text-secondary uppercase tracking-wide">of</span>
            <div className="flex-1 h-px bg-autronis-border" />
          </div>

          {/* Direct transcript */}
          <div>
            <label className="block text-sm font-medium text-autronis-text-secondary mb-1.5">Direct transcript plakken</label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Plak hier het transcript..."
              rows={5}
              className="w-full bg-autronis-bg border border-autronis-border rounded-xl px-4 py-3 text-sm text-autronis-text-primary placeholder:text-autronis-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-autronis-accent/50 focus:border-autronis-accent transition-colors resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-autronis-text-secondary hover:text-autronis-text-primary transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !titel.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-autronis-accent text-autronis-bg rounded-xl font-medium hover:bg-autronis-accent-hover transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Aanmaken
          </button>
        </div>
      </div>
    </div>
  );
}
