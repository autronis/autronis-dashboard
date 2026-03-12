"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Clock,
  Users,
  Euro,
  BarChart3,
  Target,
  Calendar,
  CheckSquare,
  Settings,
  Building2,
  FolderOpen,
  FileText,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface Klant {
  id: number;
  bedrijfsnaam: string;
}

interface Project {
  id: number;
  naam: string;
  klant_naam?: string;
}

interface Taak {
  id: number;
  titel: string;
  project_naam?: string;
}

interface Factuur {
  id: number;
  factuurnummer: string;
  klant_naam?: string;
}

interface Lead {
  id: number;
  bedrijfsnaam: string;
  status: string;
}

interface RecentSearch {
  query: string;
  timestamp: number;
}

const RECENT_KEY = "autronis-recent-searches";
const MAX_RECENT = 5;

const pages = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Tijdregistratie", icon: Clock, href: "/tijdregistratie" },
  { label: "Klanten", icon: Users, href: "/klanten" },
  { label: "Financiën", icon: Euro, href: "/financien" },
  { label: "Analytics", icon: BarChart3, href: "/analytics" },
  { label: "CRM / Leads", icon: Target, href: "/crm" },
  { label: "Agenda", icon: Calendar, href: "/agenda" },
  { label: "Taken", icon: CheckSquare, href: "/taken" },
  { label: "Instellingen", icon: Settings, href: "/instellingen" },
];

function loadRecentSearches(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentSearch[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (!query.trim()) return;
  const existing = loadRecentSearches().filter((r) => r.query !== query);
  const updated = [{ query, timestamp: Date.now() }, ...existing].slice(
    0,
    MAX_RECENT
  );
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable
  }
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [klanten, setKlanten] = useState<Klant[]>([]);
  const [projecten, setProjecten] = useState<Project[]>([]);
  const [taken, setTaken] = useState<Taak[]>([]);
  const [facturen, setFacturen] = useState<Factuur[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchData = useCallback(async () => {
    if (loaded) return;
    try {
      const [klantenRes, projectenRes, takenRes, facturenRes, leadsRes] =
        await Promise.all([
          fetch("/api/klanten").then((r) => r.json()),
          fetch("/api/projecten").then((r) => r.json()),
          fetch("/api/taken").then((r) => r.json()),
          fetch("/api/facturen").then((r) => r.json()),
          fetch("/api/leads").then((r) => r.json()),
        ]);

      if (Array.isArray(klantenRes.klanten)) setKlanten(klantenRes.klanten);
      if (Array.isArray(projectenRes.projecten))
        setProjecten(projectenRes.projecten);
      if (Array.isArray(takenRes.taken)) setTaken(takenRes.taken);
      if (Array.isArray(facturenRes.facturen))
        setFacturen(facturenRes.facturen);
      if (Array.isArray(leadsRes.leads)) setLeads(leadsRes.leads);

      setLoaded(true);
    } catch {
      // Silently fail — data just won't be available
    }
  }, [loaded]);

  useEffect(() => {
    if (open) {
      setSearch("");
      setRecentSearches(loadRecentSearches());
      fetchData();
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, fetchData]);

  function navigate(href: string, searchQuery?: string) {
    if (searchQuery) saveRecentSearch(searchQuery);
    onClose();
    router.push(href);
  }

  function handleSelect(href: string) {
    navigate(href, search);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className={cn(
              "relative w-full max-w-xl mx-4",
              "bg-autronis-card border border-autronis-border",
              "rounded-2xl shadow-2xl overflow-hidden"
            )}
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
          >
            <Command
              className="flex flex-col"
              filter={(value, search) => {
                if (value.toLowerCase().includes(search.toLowerCase()))
                  return 1;
                return 0;
              }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 border-b border-autronis-border">
                <Search className="w-5 h-5 text-autronis-text-secondary flex-shrink-0" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Zoek pagina's, klanten, taken..."
                  className={cn(
                    "flex-1 py-4 bg-transparent text-autronis-text-primary",
                    "placeholder:text-autronis-text-secondary",
                    "outline-none text-base"
                  )}
                />
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-autronis-border text-autronis-text-secondary text-xs font-mono">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-autronis-text-secondary text-sm">
                  Geen resultaten gevonden.
                </Command.Empty>

                {/* Recente zoekopdrachten */}
                {!search && recentSearches.length > 0 && (
                  <Command.Group
                    heading="Recente zoekopdrachten"
                    className="mb-2"
                  >
                    {recentSearches.map((recent) => (
                      <Command.Item
                        key={`recent-${recent.timestamp}`}
                        value={`recent: ${recent.query}`}
                        onSelect={() => setSearch(recent.query)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
                          "text-autronis-text-secondary text-sm",
                          "data-[selected=true]:bg-autronis-accent/10 data-[selected=true]:text-autronis-accent",
                          "transition-colors"
                        )}
                      >
                        <History className="w-4 h-4 flex-shrink-0" />
                        <span>{recent.query}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Pagina's */}
                <Command.Group heading="Pagina's" className="mb-2">
                  {pages.map((page) => {
                    const Icon = page.icon;
                    return (
                      <Command.Item
                        key={page.href}
                        value={page.label}
                        onSelect={() => handleSelect(page.href)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
                          "text-autronis-text-primary text-sm",
                          "data-[selected=true]:bg-autronis-accent/10 data-[selected=true]:text-autronis-accent",
                          "transition-colors"
                        )}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{page.label}</span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>

                {/* Klanten */}
                {klanten.length > 0 && (
                  <Command.Group heading="Klanten" className="mb-2">
                    {klanten.map((klant) => (
                      <Command.Item
                        key={`klant-${klant.id}`}
                        value={`klant: ${klant.bedrijfsnaam}`}
                        onSelect={() =>
                          handleSelect(`/klanten/${klant.id}`)
                        }
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
                          "text-autronis-text-primary text-sm",
                          "data-[selected=true]:bg-autronis-accent/10 data-[selected=true]:text-autronis-accent",
                          "transition-colors"
                        )}
                      >
                        <Building2 className="w-4 h-4 flex-shrink-0 text-autronis-text-secondary" />
                        <span>{klant.bedrijfsnaam}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Projecten */}
                {projecten.length > 0 && (
                  <Command.Group heading="Projecten" className="mb-2">
                    {projecten.map((project) => (
                      <Command.Item
                        key={`project-${project.id}`}
                        value={`project: ${project.naam} ${project.klant_naam || ""}`}
                        onSelect={() =>
                          handleSelect(`/klanten/${project.id}`)
                        }
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
                          "text-autronis-text-primary text-sm",
                          "data-[selected=true]:bg-autronis-accent/10 data-[selected=true]:text-autronis-accent",
                          "transition-colors"
                        )}
                      >
                        <FolderOpen className="w-4 h-4 flex-shrink-0 text-autronis-text-secondary" />
                        <span>{project.naam}</span>
                        {project.klant_naam && (
                          <span className="ml-auto text-xs text-autronis-text-secondary">
                            {project.klant_naam}
                          </span>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Taken */}
                {taken.length > 0 && (
                  <Command.Group heading="Taken" className="mb-2">
                    {taken.map((taak) => (
                      <Command.Item
                        key={`taak-${taak.id}`}
                        value={`taak: ${taak.titel} ${taak.project_naam || ""}`}
                        onSelect={() => handleSelect("/taken")}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
                          "text-autronis-text-primary text-sm",
                          "data-[selected=true]:bg-autronis-accent/10 data-[selected=true]:text-autronis-accent",
                          "transition-colors"
                        )}
                      >
                        <CheckSquare className="w-4 h-4 flex-shrink-0 text-autronis-text-secondary" />
                        <span>{taak.titel}</span>
                        {taak.project_naam && (
                          <span className="ml-auto text-xs text-autronis-text-secondary">
                            {taak.project_naam}
                          </span>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Facturen */}
                {facturen.length > 0 && (
                  <Command.Group heading="Facturen" className="mb-2">
                    {facturen.map((factuur) => (
                      <Command.Item
                        key={`factuur-${factuur.id}`}
                        value={`factuur: ${factuur.factuurnummer} ${factuur.klant_naam || ""}`}
                        onSelect={() =>
                          handleSelect(`/financien/${factuur.id}`)
                        }
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
                          "text-autronis-text-primary text-sm",
                          "data-[selected=true]:bg-autronis-accent/10 data-[selected=true]:text-autronis-accent",
                          "transition-colors"
                        )}
                      >
                        <FileText className="w-4 h-4 flex-shrink-0 text-autronis-text-secondary" />
                        <span>{factuur.factuurnummer}</span>
                        {factuur.klant_naam && (
                          <span className="ml-auto text-xs text-autronis-text-secondary">
                            {factuur.klant_naam}
                          </span>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Leads */}
                {leads.length > 0 && (
                  <Command.Group heading="Leads" className="mb-2">
                    {leads.map((lead) => (
                      <Command.Item
                        key={`lead-${lead.id}`}
                        value={`lead: ${lead.bedrijfsnaam} ${lead.status}`}
                        onSelect={() => handleSelect("/crm")}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
                          "text-autronis-text-primary text-sm",
                          "data-[selected=true]:bg-autronis-accent/10 data-[selected=true]:text-autronis-accent",
                          "transition-colors"
                        )}
                      >
                        <Target className="w-4 h-4 flex-shrink-0 text-autronis-text-secondary" />
                        <span>{lead.bedrijfsnaam}</span>
                        <span className="ml-auto text-xs text-autronis-text-secondary capitalize">
                          {lead.status}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>

              {/* Footer */}
              <div className="flex items-center gap-4 px-4 py-2.5 border-t border-autronis-border text-autronis-text-secondary text-xs">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-autronis-border font-mono">
                    &uarr;&darr;
                  </kbd>
                  navigeren
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-autronis-border font-mono">
                    &crarr;
                  </kbd>
                  openen
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-autronis-border font-mono">
                    esc
                  </kbd>
                  sluiten
                </span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
