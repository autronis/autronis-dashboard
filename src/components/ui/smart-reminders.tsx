"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Clock,
  X,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Herinnering {
  id: string;
  type: "lead_inactief" | "project_geen_uren";
  titel: string;
  omschrijving: string;
  urgentie: "laag" | "normaal" | "hoog";
}

const STORAGE_KEY = "autronis-dismissed-reminders";

function getDismissed(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function dismissReminder(id: string) {
  const dismissed = getDismissed();
  dismissed[id] = new Date().toISOString().slice(0, 10);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
}

function isVandaagDismissed(id: string): boolean {
  const dismissed = getDismissed();
  const vandaag = new Date().toISOString().slice(0, 10);
  return dismissed[id] === vandaag;
}

const urgentieKleuren: Record<string, string> = {
  hoog: "border-l-red-500 bg-red-500/5",
  normaal: "border-l-amber-500 bg-amber-500/5",
  laag: "border-l-blue-500 bg-blue-500/5",
};

const urgentieIconKleuren: Record<string, string> = {
  hoog: "text-red-400",
  normaal: "text-amber-400",
  laag: "text-blue-400",
};

const typeIcons: Record<string, typeof AlertTriangle> = {
  lead_inactief: Users,
  project_geen_uren: Clock,
};

export function SmartReminders() {
  const [herinneringen, setHerinneringen] = useState<Herinnering[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const fetchHerinneringen = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/herinneringen");
      if (!res.ok) return;
      const data = await res.json();
      setHerinneringen(data.herinneringen || []);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchHerinneringen();
  }, [fetchHerinneringen]);

  // Filter dismissed
  useEffect(() => {
    const dismissedIds = new Set<string>();
    for (const h of herinneringen) {
      if (isVandaagDismissed(h.id)) {
        dismissedIds.add(h.id);
      }
    }
    setDismissed(dismissedIds);
  }, [herinneringen]);

  function handleDismiss(id: string) {
    dismissReminder(id);
    setDismissed((prev) => new Set([...prev, id]));
  }

  const zichtbaar = herinneringen.filter((h) => !dismissed.has(h.id));
  if (zichtbaar.length === 0) return null;

  // Toon alleen de meest urgente
  const herinnering = zichtbaar[0];
  const Icon = typeIcons[herinnering.type] || AlertTriangle;

  return (
    <div
      className={cn(
        "rounded-xl border-l-4 border border-autronis-border p-4 flex items-start gap-3",
        urgentieKleuren[herinnering.urgentie]
      )}
    >
      <div className={cn("flex-shrink-0 mt-0.5", urgentieIconKleuren[herinnering.urgentie])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-autronis-text-primary">
          {herinnering.titel}
        </p>
        <p className="text-xs text-autronis-text-secondary mt-0.5">
          {herinnering.omschrijving}
        </p>
        {zichtbaar.length > 1 && (
          <p className="text-xs text-autronis-text-secondary/60 mt-1">
            +{zichtbaar.length - 1} andere herinnering{zichtbaar.length - 1 > 1 ? "en" : ""}
          </p>
        )}
      </div>
      <button
        onClick={() => handleDismiss(herinnering.id)}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-autronis-border text-autronis-text-secondary transition-colors"
        aria-label="Herinnering sluiten"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
