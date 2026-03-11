"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clock,
  Users,
  Euro,
  BarChart3,
  Target,
  Calendar,
  CheckSquare,
  Settings,
  ChevronLeft,
  X,
} from "lucide-react";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Tijdregistratie", icon: Clock, href: "/tijdregistratie" },
  { label: "Klanten", icon: Users, href: "/klanten" },
  { label: "Financiën", icon: Euro, href: "/financien" },
  { label: "Analytics", icon: BarChart3, href: "/analytics" },
  { label: "CRM / Leads", icon: Target, href: "/crm" },
  { label: "Agenda", icon: Calendar, href: "/agenda" },
  { label: "Taken", icon: CheckSquare, href: "/taken" },
];

const bottomNavItem = { label: "Instellingen", icon: Settings, href: "/instellingen" };

export function Sidebar() {
  const { isOpen, isCollapsed, setOpen, setCollapsed } = useSidebar();
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-30 flex flex-col bg-autronis-card border-r border-autronis-border transition-all duration-300",
          isCollapsed ? "w-16" : "w-64",
          // Mobile: hidden unless isOpen
          "max-lg:translate-x-full max-lg:w-64",
          isOpen && "max-lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-autronis-border flex-shrink-0">
          {!isCollapsed && (
            <span className="text-xl font-bold text-autronis-accent tracking-tight">
              Autronis
            </span>
          )}
          {/* Close button on mobile */}
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg hover:bg-autronis-border text-autronis-text-secondary lg:hidden ml-auto"
          >
            <X className="w-5 h-5" />
          </button>
          {/* Collapse button on desktop */}
          <button
            onClick={() => setCollapsed(!isCollapsed)}
            className={cn(
              "hidden lg:flex p-1 rounded-lg hover:bg-autronis-border text-autronis-text-secondary transition-transform duration-300",
              isCollapsed ? "ml-auto rotate-180" : "ml-auto"
            )}
            aria-label={isCollapsed ? "Uitklappen" : "Inklappen"}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  active
                    ? "bg-autronis-accent/10 text-autronis-accent"
                    : "text-autronis-text-secondary hover:bg-autronis-border"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom nav */}
        <div className="border-t border-autronis-border p-2">
          {(() => {
            const Icon = bottomNavItem.icon;
            const active = isActive(bottomNavItem.href);
            return (
              <Link
                href={bottomNavItem.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  active
                    ? "bg-autronis-accent/10 text-autronis-accent"
                    : "text-autronis-text-secondary hover:bg-autronis-border"
                )}
                title={isCollapsed ? bottomNavItem.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">{bottomNavItem.label}</span>
                )}
              </Link>
            );
          })()}
        </div>
      </aside>
    </>
  );
}
