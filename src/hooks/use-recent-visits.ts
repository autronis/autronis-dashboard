"use client";

import { create } from "zustand";

interface Visit {
  path: string;
  label: string;
  timestamp: number;
}

interface RecentVisitsState {
  visits: Visit[];
  addVisit: (path: string, label: string) => void;
  getRecent: () => Visit[];
}

const MAX_VISITS = 5;
const STORAGE_KEY = "autronis-recent-visits";

function loadVisits(): Visit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Visit[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_VISITS) : [];
  } catch {
    return [];
  }
}

function saveVisits(visits: Visit[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
  } catch {
    // localStorage full or unavailable
  }
}

export const useRecentVisits = create<RecentVisitsState>((set, get) => ({
  visits: loadVisits(),

  addVisit: (path: string, label: string) => {
    const existing = get().visits.filter((v) => v.path !== path);
    const updated = [{ path, label, timestamp: Date.now() }, ...existing].slice(
      0,
      MAX_VISITS
    );
    saveVisits(updated);
    set({ visits: updated });
  },

  getRecent: () => get().visits,
}));
