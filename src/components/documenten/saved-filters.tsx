"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Bookmark } from "lucide-react";
import { DocumentType } from "@/types/documenten";

export interface SavedFilter {
  naam: string;
  filters: {
    type: DocumentType | "alle";
    klant: string;
    maand: string;
    zoekterm: string;
  };
}

const STORAGE_KEY = "autronis-saved-filters";
const MAX_FILTERS = 8;

function loadFilters(): SavedFilter[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveFilters(filters: SavedFilter[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // localStorage unavailable
  }
}

interface SavedFiltersProps {
  currentFilters: {
    type: DocumentType | "alle";
    klant: string;
    maand: string;
    zoekterm: string;
  };
  onApply: (filters: SavedFilter["filters"]) => void;
}

export function SavedFilters({ currentFilters, onApply }: SavedFiltersProps) {
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [naam, setNaam] = useState("");

  useEffect(() => {
    setFilters(loadFilters());
  }, []);

  const hasActiveFilter = currentFilters.type !== "alle" || currentFilters.klant || currentFilters.maand || currentFilters.zoekterm;

  const handleSave = useCallback(() => {
    if (!naam.trim()) return;
    const updated = [...filters, { naam: naam.trim(), filters: currentFilters }].slice(-MAX_FILTERS);
    setFilters(updated);
    saveFilters(updated);
    setNaam("");
    setShowSave(false);
  }, [naam, filters, currentFilters]);

  const handleRemove = useCallback((index: number) => {
    const updated = filters.filter((_, i) => i !== index);
    setFilters(updated);
    saveFilters(updated);
  }, [filters]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter, i) => (
        <button
          key={i}
          onClick={() => onApply(filter.filters)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-autronis-card border border-autronis-border hover:border-autronis-accent/50 text-autronis-text-secondary hover:text-autronis-text-primary transition-colors group"
        >
          <Bookmark className="w-3 h-3" />
          {filter.naam}
          <span
            onClick={(e) => { e.stopPropagation(); handleRemove(i); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
          >
            <X className="w-3 h-3" />
          </span>
        </button>
      ))}

      {hasActiveFilter && filters.length < MAX_FILTERS && (
        <>
          {showSave ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder="Naam..."
                autoFocus
                className="w-24 px-2 py-1 rounded-lg bg-autronis-bg border border-autronis-border text-xs text-autronis-text-primary focus:outline-none focus:border-autronis-accent"
              />
              <button onClick={handleSave} className="text-xs text-autronis-accent hover:text-autronis-accent-hover">Opslaan</button>
              <button onClick={() => setShowSave(false)} className="text-xs text-autronis-text-secondary">Annuleer</button>
            </div>
          ) : (
            <button
              onClick={() => setShowSave(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-autronis-text-secondary hover:text-autronis-accent transition-colors"
            >
              <Bookmark className="w-3 h-3" />
              Filter opslaan
            </button>
          )}
        </>
      )}
    </div>
  );
}
