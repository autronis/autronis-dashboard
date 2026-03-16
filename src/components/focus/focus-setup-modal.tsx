"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { SelectField } from "@/components/ui/form-field";
import { Target } from "lucide-react";
import { useFocus } from "@/hooks/use-focus";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: number;
  naam: string;
}

interface Taak {
  id: number;
  titel: string;
}

const DUUR_OPTIES = [
  { waarde: 25, label: "25 min" },
  { waarde: 50, label: "50 min" },
  { waarde: 0, label: "Custom" },
];

export function FocusSetupModal() {
  const focus = useFocus();
  const { addToast } = useToast();
  const [projecten, setProjecten] = useState<Project[]>([]);
  const [taken, setTaken] = useState<Taak[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [taakId, setTaakId] = useState<number | null>(null);
  const [duurType, setDuurType] = useState(25);
  const [customDuur, setCustomDuur] = useState(30);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!focus.showSetup) return;
    fetch("/api/projecten")
      .then((r) => r.json())
      .then((data: { projecten?: Project[] }) =>
        setProjecten(data.projecten || [])
      )
      .catch(() => {});
  }, [focus.showSetup]);

  useEffect(() => {
    if (!projectId) {
      setTaken([]);
      setTaakId(null);
      return;
    }
    fetch(`/api/taken?projectId=${projectId}&status=open,bezig`)
      .then((r) => r.json())
      .then((data: { taken?: Taak[] }) => setTaken(data.taken || []))
      .catch(() => {});
  }, [projectId]);

  const handleStart = async () => {
    if (!projectId) {
      addToast("Selecteer een project", "fout");
      return;
    }

    const duurMinuten = duurType === 0 ? customDuur : duurType;
    if (duurMinuten < 5 || duurMinuten > 120) {
      addToast("Duur moet tussen 5 en 120 minuten zijn", "fout");
      return;
    }

    const project = projecten.find((p) => p.id === projectId);
    const taak = taken.find((t) => t.id === taakId);

    setIsStarting(true);
    try {
      await focus.start({
        projectId,
        projectNaam: project?.naam || "",
        taakId: taakId,
        taakTitel: taak?.titel || null,
        duurMinuten,
      });
      addToast("Focus sessie gestart!", "succes");
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : "Focus starten mislukt",
        "fout"
      );
    } finally {
      setIsStarting(false);
    }
  };

  const handleClose = () => {
    focus.closeSetup();
    setProjectId(null);
    setTaakId(null);
    setDuurType(25);
    setCustomDuur(30);
  };

  return (
    <Modal
      open={focus.showSetup}
      onClose={handleClose}
      titel="Focus starten"
      breedte="md"
    >
      <div className="space-y-6">
        {/* Project selectie */}
        <SelectField
          label="Project"
          verplicht
          value={projectId || ""}
          onChange={(e) => setProjectId(Number(e.target.value) || null)}
          opties={[
            { waarde: "", label: "Selecteer project..." },
            ...projecten.map((p) => ({
              waarde: String(p.id),
              label: p.naam,
            })),
          ]}
        />

        {/* Taak selectie (optioneel) */}
        {projectId && taken.length > 0 && (
          <SelectField
            label="Taak (optioneel)"
            value={taakId || ""}
            onChange={(e) => setTaakId(Number(e.target.value) || null)}
            opties={[
              { waarde: "", label: "Geen specifieke taak" },
              ...taken.map((t) => ({
                waarde: String(t.id),
                label: t.titel,
              })),
            ]}
          />
        )}

        {/* Duur selectie */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-autronis-text-secondary">
            Duur <span className="text-red-400 ml-1">*</span>
          </label>
          <div className="flex gap-2">
            {DUUR_OPTIES.map((optie) => (
              <button
                key={optie.waarde}
                type="button"
                onClick={() => setDuurType(optie.waarde)}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  duurType === optie.waarde
                    ? "bg-autronis-accent text-white"
                    : "bg-autronis-card border border-autronis-border text-autronis-text-secondary hover:border-autronis-accent/50"
                }`}
              >
                {optie.label}
              </button>
            ))}
          </div>
          {duurType === 0 && (
            <div className="flex items-center gap-3 mt-2">
              <input
                type="number"
                min={5}
                max={120}
                value={customDuur}
                onChange={(e) => setCustomDuur(Number(e.target.value))}
                className="w-24 px-3 py-2 rounded-xl bg-autronis-card border border-autronis-border text-autronis-text-primary focus:outline-none focus:ring-2 focus:ring-autronis-accent/50 tabular-nums"
              />
              <span className="text-sm text-autronis-text-secondary">
                minuten
              </span>
            </div>
          )}
        </div>

        {/* Start knop */}
        <button
          onClick={handleStart}
          disabled={!projectId || isStarting}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-autronis-accent text-white font-semibold text-base hover:bg-autronis-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isStarting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Target className="w-5 h-5" />
              Start Focus
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
