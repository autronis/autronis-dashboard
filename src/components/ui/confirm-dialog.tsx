"use client";

import { Modal } from "./modal";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onBevestig: () => void;
  titel?: string;
  bericht: string;
  bevestigTekst?: string;
  annuleerTekst?: string;
  variant?: "danger" | "warning";
}

export function ConfirmDialog({
  open,
  onClose,
  onBevestig,
  titel = "Weet je het zeker?",
  bericht,
  bevestigTekst = "Verwijderen",
  annuleerTekst = "Annuleren",
  variant = "danger",
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      titel={titel}
      breedte="sm"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-autronis-text-secondary hover:text-autronis-text-primary transition-colors"
          >
            {annuleerTekst}
          </button>
          <button
            onClick={() => {
              onBevestig();
              onClose();
            }}
            className={
              variant === "danger"
                ? "px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors"
                : "px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors"
            }
          >
            {bevestigTekst}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div
          className={
            variant === "danger"
              ? "p-2 bg-red-500/10 rounded-lg flex-shrink-0"
              : "p-2 bg-orange-500/10 rounded-lg flex-shrink-0"
          }
        >
          <AlertTriangle
            className={
              variant === "danger" ? "w-5 h-5 text-red-400" : "w-5 h-5 text-orange-400"
            }
          />
        </div>
        <p className="text-sm text-autronis-text-secondary leading-relaxed">{bericht}</p>
      </div>
    </Modal>
  );
}
