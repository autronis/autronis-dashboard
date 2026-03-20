"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Send,
  X,
  Loader2,
  MessageSquare,
  Plus,
  Trash2,
  Sparkles,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───
interface Bericht {
  rol: "gebruiker" | "assistent";
  inhoud: string;
  timestamp: string;
}

interface Gesprek {
  id: number;
  titel: string | null;
  bijgewerktOp: string | null;
}

// ─── Context-aware suggestions per page ───
function getPageSuggesties(pathname: string): string[] {
  const uur = new Date().getHours();

  // Time-based defaults
  const ochtend = uur < 12;
  const avond = uur >= 17;

  if (pathname.startsWith("/financien")) {
    return ["Omzet overzicht deze maand", "Hoeveel BTW dit kwartaal?", "Openstaande facturen"];
  }
  if (pathname.startsWith("/taken")) {
    return ["Wat moet ik vandaag doen?", "Prioriteer mijn taken", "Taken samenvatting deze week"];
  }
  if (pathname.startsWith("/klanten")) {
    return ["Schrijf een follow-up mail", "Klant overzicht", "Welke klanten hebben aandacht nodig?"];
  }
  if (pathname.startsWith("/projecten")) {
    return ["Project voortgang samenvatting", "Welk project heeft achterstand?", "Uren per project deze maand"];
  }
  if (pathname.startsWith("/agenda")) {
    return ["Wat staat er vandaag gepland?", "Plan een meeting", "Agenda samenvatting"];
  }
  if (pathname.startsWith("/leads") || pathname.startsWith("/crm")) {
    return ["Welke leads moet ik opvolgen?", "Lead pipeline overzicht", "Schrijf een outreach bericht"];
  }
  if (pathname.startsWith("/content")) {
    return ["Genereer een LinkedIn post", "Content ideeën", "Schrijf een case study"];
  }
  if (pathname.startsWith("/focus")) {
    return ["Hoeveel heb ik gefocust deze week?", "Focus statistieken", "Productiviteit tips"];
  }

  // Default / Dashboard
  if (ochtend) {
    return ["Dagbriefing bekijken", "Agenda vandaag", "Wat moet ik vandaag doen?"];
  }
  if (avond) {
    return ["Uren registreren", "Dag samenvatting", "Gewoontes afvinken"];
  }
  return ["Financieel overzicht deze maand", "Welke leads opvolgen?", "Project samenvatting"];
}

// ─── Markdown renderer ───
function renderMarkdown(text: string): string {
  let html = text;
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, _l, code) => {
    const escaped = code.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<pre class="bg-autronis-bg rounded-lg p-2 font-mono text-xs my-1.5 overflow-x-auto border border-autronis-border"><code>${escaped}</code></pre>`;
  });
  html = html.replace(/`([^`]+)`/g, (_m, code: string) =>
    `<code class="bg-autronis-bg px-1 py-0.5 rounded text-xs font-mono">${code.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</code>`
  );
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-2 mb-0.5">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold mt-2 mb-0.5">$1</h2>');
  html = html.replace(/^- (.+)$/gm, '<li class="ml-3 list-disc text-xs">$1</li>');
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="my-1 space-y-0.5">$1</ul>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-3 list-decimal text-xs">$1</li>');
  html = html.replace(/((?:<li class="ml-3 list-decimal[^>]*>.*<\/li>\n?)+)/g, '<ol class="my-1 space-y-0.5">$1</ol>');
  html = html.replace(/\n\n/g, "<br/><br/>");
  html = html.replace(/\n/g, "<br/>");
  return html;
}

// ─── A.R.I. Logo ───
function AriLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-6 h-6", md: "w-8 h-8", lg: "w-12 h-12" };
  const iconSizes = { sm: "w-3 h-3", md: "w-4 h-4", lg: "w-6 h-6" };
  return (
    <div className={cn("rounded-full bg-autronis-accent/20 flex items-center justify-center", sizes[size])}>
      <Sparkles className={cn("text-autronis-accent", iconSizes[size])} />
    </div>
  );
}

// ─── Widget Component ───
export function AriWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [gesprekken, setGesprekken] = useState<Gesprek[]>([]);
  const [actiefGesprekId, setActiefGesprekId] = useState<number | null>(null);
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [invoer, setInvoer] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const berichtenRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const suggesties = getPageSuggesties(pathname);

  // ─── Keyboard shortcut: Ctrl+A ───
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "a" && !e.shiftKey && !e.altKey) {
        // Don't intercept if typing in an input/textarea
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (berichtenRef.current) {
      berichtenRef.current.scrollTop = berichtenRef.current.scrollHeight;
    }
  }, [berichten]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
      // Load conversations
      fetch("/api/ai/gesprekken")
        .then((r) => r.json())
        .then((d: { gesprekken?: Gesprek[] }) => setGesprekken(d.gesprekken || []))
        .catch(() => {});
    }
  }, [isOpen]);

  const loadGesprek = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/ai/gesprekken/${id}`);
      if (!res.ok) return;
      const data = await res.json() as { gesprek: { id: number; berichten: Bericht[] } };
      setBerichten(data.gesprek.berichten);
      setActiefGesprekId(id);
      setShowHistory(false);
    } catch { /* silent */ }
  }, []);

  const deleteGesprek = useCallback(async (id: number) => {
    await fetch(`/api/ai/gesprekken?id=${id}`, { method: "DELETE" });
    setGesprekken((prev) => prev.filter((g) => g.id !== id));
    if (actiefGesprekId === id) {
      setActiefGesprekId(null);
      setBerichten([]);
    }
  }, [actiefGesprekId]);

  const nieuwGesprek = useCallback(() => {
    setActiefGesprekId(null);
    setBerichten([]);
    setShowHistory(false);
    textareaRef.current?.focus();
  }, []);

  const verstuurBericht = useCallback(async (tekst?: string) => {
    const bericht = (tekst ?? invoer).trim();
    if (!bericht || isStreaming) return;

    setInvoer("");
    setIsStreaming(true);

    const userMsg: Bericht = { rol: "gebruiker", inhoud: bericht, timestamp: new Date().toISOString() };
    const assistMsg: Bericht = { rol: "assistent", inhoud: "", timestamp: new Date().toISOString() };
    setBerichten((prev) => [...prev, userMsg, assistMsg]);

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gesprekId: actiefGesprekId, bericht }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json() as { fout?: string };
        throw new Error(err.fout ?? "Er ging iets mis");
      }

      if (!res.body) throw new Error("Geen response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6)) as { tekst?: string; klaar?: boolean; gesprekId?: number; fout?: string };
            if (data.fout) throw new Error(data.fout);
            if (data.tekst) {
              fullText += data.tekst;
              const currentText = fullText;
              setBerichten((prev) => {
                const updated = [...prev];
                const last = updated.length - 1;
                if (last >= 0 && updated[last].rol === "assistent") {
                  updated[last] = { ...updated[last], inhoud: currentText };
                }
                return updated;
              });
            }
            if (data.klaar && data.gesprekId) {
              setActiefGesprekId(data.gesprekId);
              fetch("/api/ai/gesprekken").then((r) => r.json()).then((d: { gesprekken?: Gesprek[] }) => setGesprekken(d.gesprekken || []));
            }
          } catch (e) {
            if (e instanceof Error && !e.message.includes("Unexpected end")) throw e;
          }
        }
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setBerichten((prev) => {
          const last = prev[prev.length - 1];
          if (last?.rol === "assistent" && last.inhoud === "") return prev.slice(0, -1);
          return prev;
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [invoer, isStreaming, actiefGesprekId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      verstuurBericht();
    }
  }, [verstuurBericht]);

  const isEmptyChat = berichten.length === 0;

  return (
    <>
      {/* ─── Floating button ─── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 md:bottom-8 right-6 z-50 w-14 h-14 rounded-full bg-autronis-accent text-white shadow-xl shadow-autronis-accent/30 hidden md:flex items-center justify-center hover:bg-autronis-accent-hover hover:scale-105 transition-all group"
          title="A.R.I. openen (Ctrl+A)"
        >
          <Sparkles className="w-6 h-6" />
          <span className="absolute -top-8 right-0 px-2 py-1 bg-autronis-card border border-autronis-border rounded-lg text-[10px] text-autronis-text-secondary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Ctrl+A
          </span>
        </button>
      )}

      {/* ─── Slide-over panel ─── */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/30 z-[55] md:bg-transparent md:pointer-events-none" onClick={() => setIsOpen(false)} />

          {/* Panel */}
          <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] z-[56] bg-autronis-bg border-l border-autronis-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-autronis-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <AriLogo size="sm" />
                <div>
                  <h2 className="text-sm font-bold text-autronis-text-primary">A.R.I.</h2>
                  <p className="text-[10px] text-autronis-text-secondary">Autronis Reasoning Intelligence</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowHistory(!showHistory)}
                  className={cn("p-2 rounded-lg transition-colors", showHistory ? "bg-autronis-accent/10 text-autronis-accent" : "text-autronis-text-secondary hover:text-autronis-text-primary hover:bg-autronis-border/50")}
                  title="Gesprekken">
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button onClick={nieuwGesprek}
                  className="p-2 rounded-lg text-autronis-text-secondary hover:text-autronis-text-primary hover:bg-autronis-border/50 transition-colors" title="Nieuw gesprek">
                  <Plus className="w-4 h-4" />
                </button>
                <button onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg text-autronis-text-secondary hover:text-autronis-text-primary hover:bg-autronis-border/50 transition-colors" title="Sluiten (Ctrl+A)">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* History sidebar */}
            {showHistory && (
              <div className="border-b border-autronis-border p-3 space-y-1 max-h-60 overflow-y-auto flex-shrink-0">
                {gesprekken.length === 0 ? (
                  <p className="text-xs text-autronis-text-secondary text-center py-4">Nog geen gesprekken</p>
                ) : gesprekken.map((g) => (
                  <div key={g.id}
                    className={cn("flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer group text-sm transition-colors",
                      actiefGesprekId === g.id ? "bg-autronis-accent/10 text-autronis-accent" : "text-autronis-text-secondary hover:bg-autronis-border/50")}
                    onClick={() => loadGesprek(g.id)}>
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate flex-1">{g.titel || "Nieuw gesprek"}</span>
                    <button onClick={(e) => { e.stopPropagation(); deleteGesprek(g.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 hover:text-red-400 transition-all">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Messages */}
            <div ref={berichtenRef} className="flex-1 overflow-y-auto px-4 py-4">
              {isEmptyChat ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <AriLogo size="lg" />
                  <h3 className="text-lg font-semibold text-autronis-text-primary mt-4 mb-1">
                    Hey Sem, wat kan ik voor je doen?
                  </h3>
                  <p className="text-xs text-autronis-text-secondary mb-6 max-w-xs">
                    Ik heb toegang tot al je bedrijfsdata. Vraag me alles.
                  </p>
                  <div className="flex flex-col gap-2 w-full max-w-xs">
                    {suggesties.map((s) => (
                      <button key={s} onClick={() => verstuurBericht(s)} disabled={isStreaming}
                        className="w-full px-4 py-2.5 rounded-xl border border-autronis-border text-xs text-autronis-text-secondary hover:bg-autronis-border/50 hover:text-autronis-text-primary transition-colors text-left disabled:opacity-50">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {berichten.map((b, i) => {
                    const isUser = b.rol === "gebruiker";
                    const isLastAssistantEmpty = b.rol === "assistent" && b.inhoud === "" && isStreaming && i === berichten.length - 1;

                    return (
                      <div key={i} className={cn("flex", isUser ? "justify-end" : "justify-start gap-2")}>
                        {!isUser && <AriLogo size="sm" />}
                        <div className={cn("max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                          isUser ? "bg-autronis-accent/20 border border-autronis-accent/30 text-autronis-text-primary"
                            : "bg-autronis-card border border-autronis-border text-autronis-text-primary")}>
                          {isLastAssistantEmpty ? (
                            <div className="flex items-center gap-1.5 py-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-autronis-accent animate-bounce [animation-delay:0ms]" />
                              <div className="w-1.5 h-1.5 rounded-full bg-autronis-accent animate-bounce [animation-delay:150ms]" />
                              <div className="w-1.5 h-1.5 rounded-full bg-autronis-accent animate-bounce [animation-delay:300ms]" />
                            </div>
                          ) : isUser ? (
                            <p className="whitespace-pre-wrap">{b.inhoud}</p>
                          ) : (
                            <div className="prose-invert prose-xs max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(b.inhoud) }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-autronis-border p-3 flex-shrink-0">
              <div className="flex items-end gap-2 bg-autronis-card border border-autronis-border rounded-xl px-3 py-2">
                <textarea
                  ref={textareaRef}
                  value={invoer}
                  onChange={(e) => setInvoer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Vraag A.R.I. iets..."
                  rows={1}
                  disabled={isStreaming}
                  className="flex-1 bg-transparent text-xs text-autronis-text-primary placeholder:text-autronis-text-secondary resize-none outline-none min-h-[20px] max-h-[80px]"
                />
                <button
                  onClick={() => verstuurBericht()}
                  disabled={!invoer.trim() || isStreaming}
                  className={cn("flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                    invoer.trim() && !isStreaming ? "bg-autronis-accent text-white hover:bg-autronis-accent-hover" : "bg-autronis-border text-autronis-text-secondary")}
                  title="Verstuur (Enter)">
                  {isStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
