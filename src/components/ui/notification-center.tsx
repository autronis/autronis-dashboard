"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  FileWarning,
  Clock,
  CheckCircle,
  UserPlus,
  X,
  CheckCheck,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Notificatie {
  id: number;
  gebruikerId: number;
  type: "factuur_te_laat" | "deadline_nadert" | "factuur_betaald" | "taak_toegewezen";
  titel: string;
  omschrijving: string | null;
  link: string | null;
  gelezen: number;
  aangemaaktOp: string;
}

const typeIcons: Record<Notificatie["type"], typeof Bell> = {
  factuur_te_laat: FileWarning,
  deadline_nadert: Clock,
  factuur_betaald: CheckCircle,
  taak_toegewezen: UserPlus,
};

const typeKleuren: Record<Notificatie["type"], string> = {
  factuur_te_laat: "text-red-400",
  deadline_nadert: "text-amber-400",
  factuur_betaald: "text-emerald-400",
  taak_toegewezen: "text-autronis-accent",
};

function tijdGeleden(datum: string): string {
  const nu = new Date();
  const then = new Date(datum);
  const diffMs = nu.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Zojuist";
  if (diffMin < 60) return `${diffMin} min geleden`;

  const diffUur = Math.floor(diffMin / 60);
  if (diffUur < 24) return `${diffUur} uur geleden`;

  const diffDag = Math.floor(diffUur / 24);
  if (diffDag === 1) return "Gisteren";
  if (diffDag < 7) return `${diffDag} dagen geleden`;

  return then.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export function NotificationCenter() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notificaties, setNotificaties] = useState<Notificatie[]>([]);
  const [ongelezen, setOngelezen] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotificaties = useCallback(async () => {
    try {
      const res = await fetch("/api/notificaties");
      if (!res.ok) return;
      const data = await res.json();
      setNotificaties(data.notificaties || []);
      setOngelezen(data.ongelezen || 0);
    } catch {
      // Silently fail
    }
  }, []);

  // Initial fetch + genereer notificaties
  useEffect(() => {
    fetch("/api/notificaties/genereer", { method: "POST" }).then(() => {
      fetchNotificaties();
    });
  }, [fetchNotificaties]);

  // Poll elke 30 seconden
  useEffect(() => {
    const interval = setInterval(fetchNotificaties, 30000);
    return () => clearInterval(interval);
  }, [fetchNotificaties]);

  // Sluit panel als je buiten klikt
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  async function markeerAllesGelezen() {
    try {
      await fetch("/api/notificaties", { method: "PUT" });
      setNotificaties((prev) => prev.map((n) => ({ ...n, gelezen: 1 })));
      setOngelezen(0);
    } catch {
      // Silently fail
    }
  }

  async function handleNotificatieKlik(notificatie: Notificatie) {
    if (notificatie.gelezen === 0) {
      try {
        await fetch(`/api/notificaties/${notificatie.id}`, { method: "PUT" });
        setNotificaties((prev) =>
          prev.map((n) => (n.id === notificatie.id ? { ...n, gelezen: 1 } : n))
        );
        setOngelezen((prev) => Math.max(0, prev - 1));
      } catch {
        // Silently fail
      }
    }
    if (notificatie.link) {
      setOpen(false);
      router.push(notificatie.link);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-autronis-border text-autronis-text-secondary transition-colors"
        aria-label="Notificaties"
      >
        <Bell className="w-5 h-5" />
        {ongelezen > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 tabular-nums">
            {ongelezen > 99 ? "99+" : ongelezen}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-autronis-card border border-autronis-border rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-autronis-border">
              <h3 className="text-sm font-semibold text-autronis-text-primary">
                Notificaties
              </h3>
              <div className="flex items-center gap-1">
                {ongelezen > 0 && (
                  <button
                    onClick={markeerAllesGelezen}
                    className="flex items-center gap-1 text-xs text-autronis-accent hover:text-autronis-accent-hover transition-colors px-2 py-1 rounded-lg hover:bg-autronis-accent/10"
                    title="Alles als gelezen markeren"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Alles gelezen
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg hover:bg-autronis-border text-autronis-text-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lijst */}
            <div className="max-h-96 overflow-y-auto">
              {notificaties.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-autronis-text-secondary">
                  Geen notificaties
                </div>
              ) : (
                notificaties.map((notificatie) => {
                  const Icon = typeIcons[notificatie.type];
                  const kleur = typeKleuren[notificatie.type];

                  return (
                    <button
                      key={notificatie.id}
                      onClick={() => handleNotificatieKlik(notificatie)}
                      className={cn(
                        "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-autronis-border/50 transition-colors border-b border-autronis-border/50 last:border-0",
                        notificatie.gelezen === 0 && "bg-autronis-accent/5"
                      )}
                    >
                      <div className={cn("mt-0.5 flex-shrink-0", kleur)}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm leading-tight",
                            notificatie.gelezen === 0
                              ? "font-semibold text-autronis-text-primary"
                              : "text-autronis-text-secondary"
                          )}
                        >
                          {notificatie.titel}
                        </p>
                        {notificatie.omschrijving && (
                          <p className="text-xs text-autronis-text-secondary mt-0.5 truncate">
                            {notificatie.omschrijving}
                          </p>
                        )}
                        <p className="text-xs text-autronis-text-secondary/60 mt-1">
                          {tijdGeleden(notificatie.aangemaaktOp)}
                        </p>
                      </div>
                      {notificatie.gelezen === 0 && (
                        <div className="w-2 h-2 rounded-full bg-autronis-accent flex-shrink-0 mt-1.5" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
