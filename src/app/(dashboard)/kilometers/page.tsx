"use client";

import { useState } from "react";
import {
  Car,
  Plus,
  ChevronLeft,
  ChevronRight,
  Download,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn, formatBedrag, formatDatumKort } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useRitten, useKlantenProjecten, type Rit } from "@/hooks/queries/use-kilometers";
import { PageTransition } from "@/components/ui/page-transition";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { FormField, SelectField } from "@/components/ui/form-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface RitForm {
  datum: string;
  vanLocatie: string;
  naarLocatie: string;
  kilometers: string;
  zakelijkDoel: string;
  klantId: string;
  projectId: string;
  tariefPerKm: string;
}

const EMPTY_FORM: RitForm = {
  datum: new Date().toISOString().slice(0, 10),
  vanLocatie: "",
  naarLocatie: "",
  kilometers: "",
  zakelijkDoel: "",
  klantId: "",
  projectId: "",
  tariefPerKm: "0.23",
};

const MAAND_NAMEN = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December",
];

export default function KilometersPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editRit, setEditRit] = useState<Rit | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<RitForm>(EMPTY_FORM);

  const [maand, setMaand] = useState(new Date().getMonth() + 1);
  const [jaar, setJaar] = useState(new Date().getFullYear());

  const { data: rittenData, isLoading: loading } = useRitten(maand, jaar);
  const ritten = rittenData?.ritten ?? [];
  const totaalKm = rittenData?.totaalKm ?? 0;
  const totaalBedrag = rittenData?.totaalBedrag ?? 0;
  const aantalRitten = rittenData?.aantalRitten ?? 0;

  const { data: kpData } = useKlantenProjecten();
  const klanten = kpData?.klanten ?? [];
  const projecten = kpData?.projecten ?? [];

  const handlePrevMonth = () => {
    if (maand === 1) {
      setMaand(12);
      setJaar(jaar - 1);
    } else {
      setMaand(maand - 1);
    }
  };

  const handleNextMonth = () => {
    if (maand === 12) {
      setMaand(1);
      setJaar(jaar + 1);
    } else {
      setMaand(maand + 1);
    }
  };

  const openNieuwModal = () => {
    setEditRit(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (rit: Rit) => {
    setEditRit(rit);
    setForm({
      datum: rit.datum,
      vanLocatie: rit.vanLocatie,
      naarLocatie: rit.naarLocatie,
      kilometers: rit.kilometers.toString(),
      zakelijkDoel: rit.zakelijkDoel || "",
      klantId: rit.klantId?.toString() || "",
      projectId: rit.projectId?.toString() || "",
      tariefPerKm: (rit.tariefPerKm ?? 0.23).toString(),
    });
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async ({ payload, isEdit, editId }: { payload: Record<string, unknown>; isEdit: boolean; editId?: number }) => {
      const url = isEdit ? `/api/kilometers/${editId}` : "/api/kilometers";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.fout || "Onbekende fout");
      }
      return isEdit;
    },
    onSuccess: (isEdit) => {
      addToast(isEdit ? "Rit bijgewerkt" : "Rit toegevoegd", "succes");
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["kilometers"] });
    },
    onError: (err) => {
      addToast(err instanceof Error ? err.message : "Kon rit niet opslaan", "fout");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/kilometers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      addToast("Rit verwijderd", "succes");
      setDeleteDialogOpen(false);
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["kilometers"] });
    },
    onError: () => {
      addToast("Kon rit niet verwijderen", "fout");
    },
  });

  const handleSubmit = () => {
    if (!form.datum || !form.vanLocatie.trim() || !form.naarLocatie.trim() || !form.kilometers) {
      addToast("Vul alle verplichte velden in", "fout");
      return;
    }
    const payload = {
      datum: form.datum,
      vanLocatie: form.vanLocatie,
      naarLocatie: form.naarLocatie,
      kilometers: parseFloat(form.kilometers),
      zakelijkDoel: form.zakelijkDoel || null,
      klantId: form.klantId ? parseInt(form.klantId) : null,
      projectId: form.projectId ? parseInt(form.projectId) : null,
      tariefPerKm: parseFloat(form.tariefPerKm) || 0.23,
    };
    saveMutation.mutate({ payload, isEdit: !!editRit, editId: editRit?.id });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  const saving = saveMutation.isPending;

  const handleExport = () => {
    window.open(`/api/kilometers/export?maand=${maand}&jaar=${jaar}`, "_blank");
  };

  const filteredProjecten = form.klantId
    ? projecten.filter((p) => p.klantId === parseInt(form.klantId))
    : projecten;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-autronis-border rounded-2xl p-6">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
        <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6">
          <Skeleton className="h-4 w-48 mb-4" />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full mb-2" />
          ))}
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
            <h1 className="text-3xl font-bold text-autronis-text-primary">Kilometerregistratie</h1>
            <p className="text-base text-autronis-text-secondary mt-1">
              Zakelijke ritten bijhouden voor belastingaangifte
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-autronis-border text-autronis-text-secondary hover:text-autronis-text-primary rounded-xl text-sm font-medium transition-colors hover:bg-autronis-card"
            >
              <Download className="w-4 h-4" />
              Exporteer CSV
            </button>
            <button
              onClick={openNieuwModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-autronis-accent hover:bg-autronis-accent-hover text-autronis-bg rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-autronis-accent/20"
            >
              <Plus className="w-4 h-4" />
              Nieuwe rit
            </button>
          </div>
        </div>

        {/* Month selector */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-lg hover:bg-autronis-card border border-autronis-border text-autronis-text-secondary hover:text-autronis-text-primary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-semibold text-autronis-text-primary min-w-[200px] text-center">
            {MAAND_NAMEN[maand - 1]} {jaar}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-lg hover:bg-autronis-card border border-autronis-border text-autronis-text-secondary hover:text-autronis-text-primary transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="border border-autronis-border rounded-2xl p-6 lg:p-7 card-glow bg-autronis-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-autronis-accent/10 rounded-xl">
                <Car className="w-5 h-5 text-autronis-accent" />
              </div>
            </div>
            <AnimatedNumber
              value={totaalKm}
              className="text-3xl font-bold text-autronis-text-primary tabular-nums"
            />
            <p className="text-sm text-autronis-text-secondary mt-1.5 uppercase tracking-wide">
              Totaal km deze maand
            </p>
          </div>

          <div className="border border-autronis-border rounded-2xl p-6 lg:p-7 card-glow bg-autronis-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-green-500/10 rounded-xl">
                <MapPin className="w-5 h-5 text-green-400" />
              </div>
            </div>
            <AnimatedNumber
              value={totaalBedrag}
              format={formatBedrag}
              className="text-3xl font-bold text-green-400 tabular-nums"
            />
            <p className="text-sm text-autronis-text-secondary mt-1.5 uppercase tracking-wide">
              Aftrekbaar bedrag
            </p>
          </div>

          <div className="border border-autronis-border rounded-2xl p-6 lg:p-7 card-glow bg-autronis-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-blue-500/10 rounded-xl">
                <Car className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <AnimatedNumber
              value={aantalRitten}
              className="text-3xl font-bold text-autronis-text-primary tabular-nums"
            />
            <p className="text-sm text-autronis-text-secondary mt-1.5 uppercase tracking-wide">
              Aantal ritten
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-7">
          {ritten.length === 0 ? (
            <EmptyState
              titel="Nog geen ritten"
              beschrijving="Voeg je eerste zakelijke rit toe om te beginnen met registreren."
              actieLabel="Nieuwe rit"
              onActie={openNieuwModal}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-autronis-border">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-autronis-text-secondary uppercase tracking-wide">Datum</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-autronis-text-secondary uppercase tracking-wide">Route</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-autronis-text-secondary uppercase tracking-wide">Km</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-autronis-text-secondary uppercase tracking-wide">Klant / Project</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-autronis-text-secondary uppercase tracking-wide">Doel</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-autronis-text-secondary uppercase tracking-wide">Bedrag</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-autronis-text-secondary uppercase tracking-wide">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {ritten.map((rit) => (
                    <tr
                      key={rit.id}
                      className="border-b border-autronis-border/50 hover:bg-autronis-bg/30 transition-colors"
                    >
                      <td className="py-4 px-4 text-sm text-autronis-text-secondary">
                        {formatDatumKort(rit.datum)}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-base text-autronis-text-primary">
                          {rit.vanLocatie}
                        </span>
                        <span className="text-autronis-text-secondary mx-2">&rarr;</span>
                        <span className="text-base text-autronis-text-primary">
                          {rit.naarLocatie}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-base font-semibold text-autronis-text-primary text-right tabular-nums">
                        {rit.kilometers.toFixed(1)}
                      </td>
                      <td className="py-4 px-4 text-sm text-autronis-text-secondary">
                        {rit.klantNaam && (
                          <span className="block">{rit.klantNaam}</span>
                        )}
                        {rit.projectNaam && (
                          <span className="block text-xs text-autronis-text-secondary/70">
                            {rit.projectNaam}
                          </span>
                        )}
                        {!rit.klantNaam && !rit.projectNaam && "\u2014"}
                      </td>
                      <td className="py-4 px-4 text-sm text-autronis-text-secondary max-w-[200px] truncate">
                        {rit.zakelijkDoel || "\u2014"}
                      </td>
                      <td className="py-4 px-4 text-base font-semibold text-green-400 text-right tabular-nums">
                        {formatBedrag(rit.kilometers * (rit.tariefPerKm ?? 0.23))}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(rit)}
                            className="p-2 text-autronis-text-secondary hover:text-autronis-accent rounded-lg hover:bg-autronis-accent/10 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteId(rit.id);
                              setDeleteDialogOpen(true);
                            }}
                            className="p-2 text-autronis-text-secondary hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          titel={editRit ? "Rit bewerken" : "Nieuwe rit"}
          breedte="lg"
          footer={
            <>
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 text-sm font-medium text-autronis-text-secondary hover:text-autronis-text-primary transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2.5 bg-autronis-accent hover:bg-autronis-accent-hover text-autronis-bg rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? "Opslaan..." : editRit ? "Bijwerken" : "Toevoegen"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Datum"
                type="date"
                verplicht
                value={form.datum}
                onChange={(e) => setForm({ ...form, datum: e.target.value })}
              />
              <FormField
                label="Kilometers"
                type="number"
                verplicht
                placeholder="0.0"
                value={form.kilometers}
                onChange={(e) => setForm({ ...form, kilometers: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Van"
                verplicht
                placeholder="Bijv. Kantoor"
                value={form.vanLocatie}
                onChange={(e) => setForm({ ...form, vanLocatie: e.target.value })}
              />
              <FormField
                label="Naar"
                verplicht
                placeholder="Bijv. Klantlocatie"
                value={form.naarLocatie}
                onChange={(e) => setForm({ ...form, naarLocatie: e.target.value })}
              />
            </div>

            <FormField
              label="Zakelijk doel"
              placeholder="Bijv. Klantbezoek, projectoverleg"
              value={form.zakelijkDoel}
              onChange={(e) => setForm({ ...form, zakelijkDoel: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Klant"
                value={form.klantId}
                onChange={(e) => setForm({ ...form, klantId: e.target.value, projectId: "" })}
                opties={[
                  { waarde: "", label: "Geen klant" },
                  ...klanten.map((k) => ({ waarde: k.id.toString(), label: k.bedrijfsnaam })),
                ]}
              />
              <SelectField
                label="Project"
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                opties={[
                  { waarde: "", label: "Geen project" },
                  ...filteredProjecten.map((p) => ({ waarde: p.id.toString(), label: p.naam })),
                ]}
              />
            </div>

            <FormField
              label="Tarief per km"
              type="number"
              placeholder="0.23"
              value={form.tariefPerKm}
              onChange={(e) => setForm({ ...form, tariefPerKm: e.target.value })}
            />
          </div>
        </Modal>

        {/* Delete confirmation */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setDeleteId(null);
          }}
          onBevestig={handleDelete}
          titel="Rit verwijderen?"
          bericht="Weet je zeker dat je deze rit wilt verwijderen?"
          bevestigTekst="Verwijderen"
          variant="danger"
        />
      </div>
    </PageTransition>
  );
}
