"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Timer, CheckSquare, Target, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  icon: typeof Timer;
  href: string;
}

const actions: QuickAction[] = [
  { label: "Timer starten", icon: Timer, href: "/tijdregistratie" },
  { label: "Taak aanmaken", icon: CheckSquare, href: "/taken?nieuw=true" },
  { label: "Lead toevoegen", icon: Target, href: "/crm?nieuw=true" },
  { label: "Factuur aanmaken", icon: FileText, href: "/financien/nieuw" },
  { label: "Nieuw document", icon: FileText, href: "/documenten?nieuw=notitie" },
];

export function QuickActionButton() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleAction(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-3">
      <AnimatePresence>
        {open &&
          actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.href}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{
                  duration: 0.2,
                  delay: (actions.length - 1 - i) * 0.05,
                }}
                onClick={() => handleAction(action.href)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl",
                  "bg-autronis-card border border-autronis-border",
                  "text-autronis-text-primary text-sm font-medium",
                  "hover:bg-autronis-border transition-colors",
                  "shadow-lg whitespace-nowrap"
                )}
              >
                <Icon className="w-4 h-4 text-autronis-accent" />
                {action.label}
              </motion.button>
            );
          })}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center",
          "bg-autronis-accent hover:bg-autronis-accent-hover",
          "text-white shadow-lg shadow-autronis-accent/25",
          "transition-colors"
        )}
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <Plus className="w-6 h-6" />
      </motion.button>
    </div>
  );
}
