"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface Shortcut {
  toetsen: string[];
  beschrijving: string;
}

interface ShortcutSectie {
  titel: string;
  shortcuts: Shortcut[];
}

const SHORTCUTS: ShortcutSectie[] = [
  {
    titel: "Navigatie",
    shortcuts: [
      { toetsen: ["G", "D"], beschrijving: "Ga naar Dashboard" },
      { toetsen: ["G", "T"], beschrijving: "Ga naar Tijdregistratie" },
      { toetsen: ["G", "K"], beschrijving: "Ga naar Klanten" },
      { toetsen: ["G", "F"], beschrijving: "Ga naar Financiën" },
      { toetsen: ["G", "A"], beschrijving: "Ga naar Analytics" },
      { toetsen: ["G", "C"], beschrijving: "Ga naar CRM" },
      { toetsen: ["G", "L"], beschrijving: "Ga naar Agenda" },
      { toetsen: ["G", "N"], beschrijving: "Ga naar Taken" },
      { toetsen: ["G", "I"], beschrijving: "Ga naar Instellingen" },
    ],
  },
  {
    titel: "Timer",
    shortcuts: [
      { toetsen: ["S"], beschrijving: "Timer starten / stoppen" },
    ],
  },
  {
    titel: "Taken",
    shortcuts: [
      { toetsen: ["N"], beschrijving: "Nieuwe taak" },
      { toetsen: ["F"], beschrijving: "Filter taken" },
    ],
  },
  {
    titel: "Algemeen",
    shortcuts: [
      { toetsen: ["?"], beschrijving: "Sneltoetsen tonen" },
      { toetsen: ["Esc"], beschrijving: "Sluiten / Annuleren" },
      { toetsen: ["/"], beschrijving: "Zoeken" },
    ],
  },
];

interface KeyboardShortcutsOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsOverlay({
  open,
  onClose,
}: KeyboardShortcutsOverlayProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border border-autronis-border bg-autronis-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-autronis-border">
                <h2 className="text-lg font-semibold text-autronis-text-primary">
                  Sneltoetsen
                </h2>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-autronis-text-secondary hover:text-autronis-text-primary hover:bg-autronis-bg transition-colors"
                  aria-label="Sluiten"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                {SHORTCUTS.map((sectie) => (
                  <div key={sectie.titel}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-autronis-text-secondary mb-3">
                      {sectie.titel}
                    </h3>
                    <ul className="space-y-2">
                      {sectie.shortcuts.map((shortcut, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between gap-4"
                        >
                          <span className="text-sm text-autronis-text-primary">
                            {shortcut.beschrijving}
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            {shortcut.toetsen.map((toets, j) => (
                              <span key={j} className="flex items-center gap-1">
                                {j > 0 && (
                                  <span className="text-xs text-autronis-text-secondary">
                                    +
                                  </span>
                                )}
                                <kbd className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 text-xs font-mono bg-autronis-bg border border-autronis-border rounded text-autronis-text-secondary">
                                  {toets}
                                </kbd>
                              </span>
                            ))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
