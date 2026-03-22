"use client";

import { useMemo } from "react";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProjectColor } from "./project-colors";
import type { Agent } from "./types";

interface ProjectPanelProps {
  agents: Agent[];
}

export function ProjectPanel({ agents }: ProjectPanelProps) {
  const activeProjects = useMemo(() => {
    const map = new Map<string, { names: string[]; hasError: boolean }>();
    agents.forEach((a) => {
      if (a.huidigeTaak) {
        const proj = a.huidigeTaak.project;
        if (!map.has(proj)) map.set(proj, { names: [], hasError: false });
        const entry = map.get(proj)!;
        entry.names.push(a.naam);
        if (a.status === "error") entry.hasError = true;
      }
    });
    return map;
  }, [agents]);

  if (activeProjects.size === 0) return null;

  return (
    <div className="rounded-xl border border-autronis-border/50 bg-autronis-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-autronis-border/30">
        <FolderOpen className="w-4 h-4 text-autronis-accent" />
        <span className="text-sm font-semibold text-autronis-text-primary">Projecten</span>
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-autronis-accent/15 text-autronis-accent">
          {activeProjects.size}
        </span>
      </div>
      <div className="p-2 space-y-1">
        {Array.from(activeProjects.entries()).map(([proj, { names, hasError }]) => {
          const color = getProjectColor(proj);
          return (
            <div
              key={proj}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-autronis-card-hover transition-colors"
            >
              <div
                className="w-1 h-8 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-autronis-text-primary truncate">
                  {proj}
                </p>
                <p className="text-[10px] text-autronis-text-tertiary truncate">
                  {names.slice(0, 3).join(", ")}
                  {names.length > 3 ? ` +${names.length - 3}` : ""}
                </p>
              </div>
              <span
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  hasError ? "bg-red-400" : "bg-green-400 animate-pulse"
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
