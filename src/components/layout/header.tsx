"use client";

import { useRouter } from "next/navigation";
import { Menu, LogOut } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import type { SessionGebruiker } from "@/types";

interface HeaderProps {
  gebruiker: SessionGebruiker;
}

export function Header({ gebruiker }: HeaderProps) {
  const router = useRouter();
  const { isCollapsed, setOpen } = useSidebar();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const initials = gebruiker.naam.charAt(0).toUpperCase();

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-10 h-16 bg-autronis-card border-b border-autronis-border transition-all duration-300",
        "left-0 lg:left-64",
        isCollapsed && "lg:left-16"
      )}
    >
      <div className="flex items-center justify-between h-full px-4">
        {/* Left: hamburger (mobile only) */}
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg hover:bg-autronis-border text-autronis-text-secondary lg:hidden"
          aria-label="Menu openen"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Spacer for desktop */}
        <div className="hidden lg:block" />

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* User avatar */}
          <div className="flex items-center gap-2 ml-2">
            <div className="w-8 h-8 rounded-full bg-autronis-accent flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-autronis-bg">{initials}</span>
            </div>
            <span className="hidden sm:block text-sm font-medium text-autronis-text-primary">
              {gebruiker.naam}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-autronis-border text-autronis-text-secondary transition-colors ml-1"
            aria-label="Uitloggen"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
