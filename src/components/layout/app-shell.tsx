"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import type { SessionGebruiker } from "@/types";

interface AppShellProps {
  gebruiker: SessionGebruiker;
  children: React.ReactNode;
}

export function AppShell({ gebruiker, children }: AppShellProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-autronis-bg">
      <Sidebar />
      <Header gebruiker={gebruiker} />
      <main
        className={cn(
          "pt-16 transition-all duration-300",
          "pl-0 lg:pl-64",
          isCollapsed && "lg:pl-16"
        )}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
