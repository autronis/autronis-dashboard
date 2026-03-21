"use client";

import { useEffect, useState, useRef } from "react";
import { usePortal } from "../layout";
import { Send, Loader2, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface Bericht {
  id: number;
  bericht: string;
  vanKlant: number;
  gelezen: number;
  aangemaaktOp: string;
  gebruikerNaam: string | null;
}

export default function PortalBerichten() {
  const { token, klant } = usePortal();
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [nieuwBericht, setNieuwBericht] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  async function loadBerichten() {
    try {
      const res = await fetch(`/api/portal/${token}/berichten`);
      if (res.ok) {
        const data = await res.json();
        setBerichten(data.berichten || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => {
    loadBerichten();
    // Poll every 30 seconds
    const interval = setInterval(loadBerichten, 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [berichten]);

  async function handleSend() {
    if (!nieuwBericht.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/portal/${token}/berichten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bericht: nieuwBericht.trim() }),
      });
      if (res.ok) {
        setNieuwBericht("");
        await loadBerichten();
      }
    } catch { /* ignore */ }
    setSending(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#17B8A5]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Berichten</h1>

      {/* Messages */}
      <div className="bg-[#192225] border border-[#2A3538] rounded-2xl overflow-hidden flex flex-col" style={{ height: "calc(100vh - 300px)", minHeight: "400px" }}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {berichten.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-[#17B8A5]/10 flex items-center justify-center mb-4">
                <Send className="w-7 h-7 text-[#17B8A5]" />
              </div>
              <p className="text-white font-medium mb-1">Nog geen berichten</p>
              <p className="text-sm text-[#8A9BA0]">Stel een vraag of laat een bericht achter.</p>
            </div>
          ) : (
            berichten.map((b) => {
              const isKlant = b.vanKlant === 1;
              const tijd = new Date(b.aangemaaktOp).toLocaleString("nl-NL", {
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
              });

              return (
                <div
                  key={b.id}
                  className={cn("flex gap-3", isKlant ? "flex-row-reverse" : "")}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    isKlant ? "bg-[#17B8A5]/15" : "bg-purple-500/15"
                  )}>
                    {isKlant ? <User className="w-4 h-4 text-[#17B8A5]" /> : <Bot className="w-4 h-4 text-purple-400" />}
                  </div>
                  <div className={cn("max-w-[75%]", isKlant ? "text-right" : "")}>
                    <div className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm",
                      isKlant
                        ? "bg-[#17B8A5]/15 text-white rounded-tr-md"
                        : "bg-[#0E1719] border border-[#2A3538] text-white rounded-tl-md"
                    )}>
                      {b.bericht}
                    </div>
                    <p className="text-[10px] text-[#8A9BA0] mt-1 px-1">
                      {!isKlant && b.gebruikerNaam && <span className="font-medium">{b.gebruikerNaam} · </span>}
                      {tijd}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <div className="border-t border-[#2A3538] p-4 flex gap-3">
          <input
            type="text"
            value={nieuwBericht}
            onChange={(e) => setNieuwBericht(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Typ een bericht..."
            className="flex-1 bg-[#0E1719] border border-[#2A3538] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#8A9BA0] focus:outline-none focus:border-[#17B8A5] transition-colors"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!nieuwBericht.trim() || sending}
            className="bg-[#17B8A5] text-[#0E1719] px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-[#4DC9B4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
