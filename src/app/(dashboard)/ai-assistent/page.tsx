"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/ui/page-transition";

// ============ TYPES ============

interface Bericht {
  rol: "gebruiker" | "assistent";
  inhoud: string;
  timestamp: string;
}

interface Gesprek {
  id: number;
  titel: string | null;
  aangemaaktOp: string | null;
  bijgewerktOp: string | null;
}

// ============ MARKDOWN RENDERER ============

function renderMarkdown(text: string): string {
  let html = text;

  // Code blocks (```...```)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, _lang, code) => {
    const escaped = escapeHtml(code.trim());
    return `<pre class="bg-autronis-bg rounded-lg p-3 font-mono text-sm my-2 overflow-x-auto border border-autronis-border"><code>${escaped}</code></pre>`;
  });

  // Inline code (`...`)
  html = html.replace(/`([^`]+)`/g, (_match, code) => {
    return `<code class="bg-autronis-bg px-1.5 py-0.5 rounded text-sm font-mono border border-autronis-border">${escapeHtml(code)}</code>`;
  });

  // Bold (**...**)
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic (*...*)
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Headers (### ... , ## ..., # ...)
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-3 mb-1">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-3 mb-1">$1</h1>');

  // Unordered lists (- ...)
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="my-1 space-y-0.5">$1</ul>');

  // Numbered lists (1. ...)
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');
  html = html.replace(/((?:<li class="ml-4 list-decimal">.*<\/li>\n?)+)/g, '<ol class="my-1 space-y-0.5">$1</ol>');

  // Line breaks (double newline = paragraph)
  html = html.replace(/\n\n/g, '<br/><br/>');
  html = html.replace(/\n/g, '<br/>');

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ============ QUICK ACTIONS ============

const quickActions = [
  "Financieel overzicht deze maand",
  "Welke leads moet ik opvolgen?",
  "Hoeveel BTW dit kwartaal?",
  "Meest winstgevende klanten?",
  "Schrijf follow-up email",
  "Project samenvatting",
];

// ============ COMPONENTS ============

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="w-2 h-2 rounded-full bg-autronis-accent animate-bounce [animation-delay:0ms]" />
      <div className="w-2 h-2 rounded-full bg-autronis-accent animate-bounce [animation-delay:150ms]" />
      <div className="w-2 h-2 rounded-full bg-autronis-accent animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

function ChatBubble({ bericht }: { bericht: Bericht }) {
  const isUser = bericht.rol === "gebruiker";

  return (
    <div className={cn("flex w-full mb-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-autronis-accent/20 flex items-center justify-center mr-3 mt-1">
          <Sparkles className="w-4 h-4 text-autronis-accent" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-autronis-accent/20 border border-autronis-accent/30 text-autronis-text-primary"
            : "bg-autronis-card border border-autronis-border text-autronis-text-primary"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{bericht.inhoud}</p>
        ) : (
          <div
            className="prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(bericht.inhoud) }}
          />
        )}
      </div>
    </div>
  );
}

function GesprekItem({
  gesprek,
  isActive,
  onClick,
  onDelete,
}: {
  gesprek: Gesprek;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const datum = gesprek.bijgewerktOp
    ? new Date(gesprek.bijgewerktOp).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "short",
      })
    : "";

  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
        isActive
          ? "bg-autronis-accent/10 text-autronis-accent"
          : "text-autronis-text-secondary hover:bg-autronis-border/50"
      )}
    >
      <MessageSquare className="w-4 h-4 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{gesprek.titel ?? "Nieuw gesprek"}</p>
        <p className="text-xs text-autronis-text-secondary">{datum}</p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 hover:text-red-400 transition-all"
        title="Verwijderen"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </button>
  );
}

// ============ MAIN PAGE ============

export default function AIAssistentPage() {
  const { addToast } = useToast();

  // State
  const [gesprekken, setGesprekken] = useState<Gesprek[]>([]);
  const [actiefGesprekId, setActiefGesprekId] = useState<number | null>(null);
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [invoer, setInvoer] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Refs
  const berichtenRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ============ DATA FETCHING ============

  const laadGesprekken = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/gesprekken");
      if (!res.ok) return;
      const data = await res.json() as { gesprekken: Gesprek[] };
      setGesprekken(data.gesprekken);
    } catch {
      // Silently fail
    }
  }, []);

  const laadGesprek = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/ai/gesprekken/${id}`);
      if (!res.ok) return;
      const data = await res.json() as {
        gesprek: {
          id: number;
          berichten: Bericht[];
        };
      };
      setBerichten(data.gesprek.berichten);
      setActiefGesprekId(id);
    } catch {
      addToast("Fout bij laden gesprek", "fout");
    }
  }, [addToast]);

  useEffect(() => {
    laadGesprekken().then(() => setIsLoading(false));
  }, [laadGesprekken]);

  // ============ AUTO SCROLL ============

  useEffect(() => {
    if (berichtenRef.current) {
      berichtenRef.current.scrollTop = berichtenRef.current.scrollHeight;
    }
  }, [berichten, isStreaming]);

  // ============ AUTO RESIZE TEXTAREA ============

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const maxHeight = 4 * 24; // ~4 lines
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [invoer, resizeTextarea]);

  // ============ ACTIONS ============

  const nieuwGesprek = useCallback(() => {
    setActiefGesprekId(null);
    setBerichten([]);
    setInvoer("");
    textareaRef.current?.focus();
  }, []);

  const verwijderGesprek = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/ai/gesprekken?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        addToast("Fout bij verwijderen", "fout");
        return;
      }
      setGesprekken((prev) => prev.filter((g) => g.id !== id));
      if (actiefGesprekId === id) {
        setActiefGesprekId(null);
        setBerichten([]);
      }
      addToast("Gesprek verwijderd", "succes");
    } catch {
      addToast("Fout bij verwijderen", "fout");
    }
  }, [actiefGesprekId, addToast]);

  const verstuurBericht = useCallback(async (tekst?: string) => {
    const bericht = (tekst ?? invoer).trim();
    if (!bericht || isStreaming) return;

    setInvoer("");
    setIsStreaming(true);

    // Add user message immediately
    const userBericht: Bericht = {
      rol: "gebruiker",
      inhoud: bericht,
      timestamp: new Date().toISOString(),
    };
    setBerichten((prev) => [...prev, userBericht]);

    // Add empty assistant message for streaming
    const assistentBericht: Bericht = {
      rol: "assistent",
      inhoud: "",
      timestamp: new Date().toISOString(),
    };
    setBerichten((prev) => [...prev, assistentBericht]);

    try {
      abortRef.current = new AbortController();

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gesprekId: actiefGesprekId,
          bericht,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errorData = await res.json() as { fout?: string };
        throw new Error(errorData.fout ?? "Er ging iets mis");
      }

      if (!res.body) {
        throw new Error("Geen response stream");
      }

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
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6)) as {
                tekst?: string;
                klaar?: boolean;
                gesprekId?: number;
                fout?: string;
              };

              if (data.fout) {
                throw new Error(data.fout);
              }

              if (data.tekst) {
                fullText += data.tekst;
                const currentText = fullText;
                setBerichten((prev) => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;
                  if (lastIdx >= 0 && updated[lastIdx].rol === "assistent") {
                    updated[lastIdx] = { ...updated[lastIdx], inhoud: currentText };
                  }
                  return updated;
                });
              }

              if (data.klaar && data.gesprekId) {
                setActiefGesprekId(data.gesprekId);
                // Refresh conversation list
                laadGesprekken();
              }
            } catch (parseError) {
              if (parseError instanceof Error && parseError.message !== "Unexpected end of JSON input") {
                throw parseError;
              }
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User cancelled, keep partial response
      } else {
        const errorMessage = err instanceof Error ? err.message : "Er ging iets mis";
        addToast(errorMessage, "fout");
        // Remove empty assistant message on error
        setBerichten((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.rol === "assistent" && last.inhoud === "") {
            return prev.slice(0, -1);
          }
          return prev;
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [invoer, isStreaming, actiefGesprekId, addToast, laadGesprekken]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        verstuurBericht();
      }
    },
    [verstuurBericht]
  );

  // ============ RENDER ============

  if (isLoading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="w-8 h-8 border-2 border-autronis-border border-t-autronis-accent rounded-full animate-spin" />
        </div>
      </PageTransition>
    );
  }

  const isEmptyChat = berichten.length === 0;

  return (
    <PageTransition>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* ============ SIDEBAR ============ */}
        <div
          className={cn(
            "flex-shrink-0 border-r border-autronis-border bg-autronis-bg transition-all duration-300 flex flex-col",
            sidebarOpen ? "w-72" : "w-0 overflow-hidden",
            "max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-10",
            !sidebarOpen && "max-md:w-0"
          )}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between p-4 border-b border-autronis-border flex-shrink-0">
            <h2 className="text-sm font-semibold text-autronis-text-primary">Gesprekken</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg hover:bg-autronis-border text-autronis-text-secondary transition-colors"
              title="Sluit sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* New conversation button */}
          <div className="p-3 flex-shrink-0">
            <button
              onClick={nieuwGesprek}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-autronis-border text-autronis-text-secondary hover:border-autronis-accent hover:text-autronis-accent transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Nieuw gesprek
            </button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
            {gesprekken.length === 0 ? (
              <p className="text-xs text-autronis-text-secondary text-center py-8">
                Nog geen gesprekken
              </p>
            ) : (
              gesprekken.map((gesprek) => (
                <GesprekItem
                  key={gesprek.id}
                  gesprek={gesprek}
                  isActive={actiefGesprekId === gesprek.id}
                  onClick={() => laadGesprek(gesprek.id)}
                  onDelete={() => verwijderGesprek(gesprek.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* ============ MAIN CHAT AREA ============ */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-autronis-border flex-shrink-0">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg hover:bg-autronis-border text-autronis-text-secondary transition-colors"
                title="Open sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-autronis-accent/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-autronis-accent" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-autronis-text-primary">A.R.I.</h1>
                <p className="text-xs text-autronis-text-secondary">Autronis Reasoning Intelligence</p>
              </div>
            </div>
          </div>

          {/* Messages area */}
          <div ref={berichtenRef} className="flex-1 overflow-y-auto px-4 py-6">
            {isEmptyChat ? (
              <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center">
                <div className="w-16 h-16 rounded-2xl bg-autronis-accent/10 flex items-center justify-center mb-6">
                  <Sparkles className="w-8 h-8 text-autronis-accent" />
                </div>
                <h2 className="text-xl font-semibold text-autronis-text-primary mb-2">
                  Hey Sem, wat kan ik voor je doen?
                </h2>
                <p className="text-sm text-autronis-text-secondary mb-8">
                  Ik ben A.R.I., je Autronis AI. Vraag me alles over je bedrijfsdata.
                </p>

                {/* Quick actions */}
                <div className="flex flex-wrap justify-center gap-2">
                  {quickActions.map((action) => (
                    <button
                      key={action}
                      onClick={() => verstuurBericht(action)}
                      disabled={isStreaming}
                      className="px-4 py-2 rounded-full border border-autronis-border text-sm text-autronis-text-secondary hover:bg-autronis-border hover:text-autronis-text-primary transition-colors disabled:opacity-50"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                {berichten.map((bericht, index) => {
                  // Don't render empty streaming assistant message, show typing indicator instead
                  if (
                    bericht.rol === "assistent" &&
                    bericht.inhoud === "" &&
                    isStreaming &&
                    index === berichten.length - 1
                  ) {
                    return (
                      <div key={index} className="flex w-full mb-4 justify-start">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-autronis-accent/20 flex items-center justify-center mr-3 mt-1">
                          <Sparkles className="w-4 h-4 text-autronis-accent" />
                        </div>
                        <div className="bg-autronis-card border border-autronis-border rounded-2xl">
                          <TypingIndicator />
                        </div>
                      </div>
                    );
                  }
                  return <ChatBubble key={index} bericht={bericht} />;
                })}
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-autronis-border p-4 flex-shrink-0">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-end gap-3 bg-autronis-card border border-autronis-border rounded-2xl px-4 py-3">
                <textarea
                  ref={textareaRef}
                  value={invoer}
                  onChange={(e) => setInvoer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Vraag A.R.I. iets..."
                  rows={1}
                  disabled={isStreaming}
                  className="flex-1 bg-transparent text-sm text-autronis-text-primary placeholder:text-autronis-text-secondary resize-none outline-none min-h-[24px] max-h-[96px]"
                />
                <button
                  onClick={() => verstuurBericht()}
                  disabled={!invoer.trim() || isStreaming}
                  className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    invoer.trim() && !isStreaming
                      ? "bg-autronis-accent text-white hover:bg-autronis-accent-hover"
                      : "bg-autronis-border text-autronis-text-secondary"
                  )}
                  title="Verstuur"
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-autronis-text-secondary text-center mt-2">
                Enter om te versturen, Shift+Enter voor nieuwe regel
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
