"use client";

import { useState, useEffect, createContext, useContext } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { FolderKanban, FileText, MessageCircle, LayoutDashboard, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortalKlant {
  id: number;
  bedrijfsnaam: string;
  contactpersoon: string | null;
  email: string | null;
}

interface PortalContext {
  klant: PortalKlant | null;
  token: string;
  ongelezenBerichten: number;
}

const PortalCtx = createContext<PortalContext>({ klant: null, token: "", ongelezenBerichten: 0 });
export const usePortal = () => useContext(PortalCtx);

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { token } = useParams<{ token: string }>();
  const pathname = usePathname();
  const [klant, setKlant] = useState<PortalKlant | null>(null);
  const [ongelezenBerichten, setOngelezenBerichten] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/portal/${token}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.fout || "Ongeldige link");
          return;
        }
        const data = await res.json();
        setKlant(data.klant);
        setOngelezenBerichten(data.ongelezenBerichten || 0);
      } catch {
        setError("Kon portal niet laden");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1719] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#17B8A5]" />
      </div>
    );
  }

  if (error || !klant) {
    return (
      <div className="min-h-screen bg-[#0E1719] flex items-center justify-center p-6">
        <div className="bg-[#192225] border border-[#2A3538] rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Toegang geweigerd</h1>
          <p className="text-[#8A9BA0]">{error || "Deze link is niet geldig of verlopen."}</p>
        </div>
      </div>
    );
  }

  const basePath = `/portal/${token}`;
  const navItems = [
    { href: basePath, label: "Overzicht", icon: LayoutDashboard },
    { href: `${basePath}/projecten`, label: "Projecten", icon: FolderKanban },
    { href: `${basePath}/facturen`, label: "Facturen", icon: FileText },
    { href: `${basePath}/berichten`, label: "Berichten", icon: MessageCircle, badge: ongelezenBerichten },
  ];

  return (
    <PortalCtx.Provider value={{ klant, token, ongelezenBerichten }}>
      <div className="min-h-screen bg-[#0E1719]">
        {/* Header */}
        <header className="bg-[#192225] border-b border-[#2A3538] sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="Autronis" width={28} height={28} className="h-7 w-auto" />
              <div>
                <p className="text-sm font-bold text-white">Autronis</p>
                <p className="text-[10px] text-[#8A9BA0]">{klant.bedrijfsnaam}</p>
              </div>
            </div>
            {klant.contactpersoon && (
              <p className="text-xs text-[#8A9BA0] hidden sm:block">
                Welkom, {klant.contactpersoon.split(" ")[0]}
              </p>
            )}
          </div>
        </header>

        {/* Navigation */}
        <nav className="bg-[#192225]/50 border-b border-[#2A3538]/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== basePath && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    isActive
                      ? "border-[#17B8A5] text-[#17B8A5]"
                      : "border-transparent text-[#8A9BA0] hover:text-white"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {item.badge && item.badge > 0 ? (
                    <span className="bg-[#17B8A5] text-[#0E1719] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#2A3538] py-6 text-center">
          <p className="text-xs text-[#8A9BA0]/50">
            Powered by Autronis · AI & Automatisering
          </p>
        </footer>
      </div>
    </PortalCtx.Provider>
  );
}
