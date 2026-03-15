"use client";

import { useState } from "react";
import { useDocumenten } from "@/hooks/queries/use-documenten";
import { DocumentBase, DocumentType, SortOption, DOCUMENT_TYPE_CONFIG, DOCUMENT_TYPE_LABELS, SORT_LABELS } from "@/types/documenten";
import { FileText, ExternalLink, Search, ArrowUpDown, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export function DocumentList() {
  const [zoekterm, setZoekterm] = useState("");
  const [filterType, setFilterType] = useState<DocumentType | "alle">("alle");
  const [filterKlant, setFilterKlant] = useState("");
  const [filterDatum, setFilterDatum] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("datum-desc");
  const [cursor, setCursor] = useState<string | undefined>();
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);

  const { data, isLoading, error } = useDocumenten(sortBy, cursor);
  const documenten = data?.documenten;

  const klantNamen = [...new Set(documenten?.map((d: DocumentBase) => d.klantNaam).filter(Boolean) ?? [])];

  // Client-side filtering (search, type, klant, datum are local filters on top of server data)
  const gefilterd = documenten?.filter((doc: DocumentBase) => {
    const matchType = filterType === "alle" || doc.type === filterType;
    const matchZoek = !zoekterm || doc.titel.toLowerCase().includes(zoekterm.toLowerCase()) || doc.samenvatting.toLowerCase().includes(zoekterm.toLowerCase());
    const matchKlant = !filterKlant || doc.klantNaam === filterKlant;
    const matchDatum = !filterDatum || doc.aangemaaktOp.startsWith(filterDatum);
    return matchType && matchZoek && matchKlant && matchDatum;
  });

  function handleNextPage() {
    if (data?.nextCursor) {
      setCursorHistory((prev) => [...prev, cursor ?? ""]);
      setCursor(data.nextCursor);
    }
  }

  function handlePrevPage() {
    const prev = cursorHistory.slice(0, -1);
    const prevCursor = cursorHistory[cursorHistory.length - 1];
    setCursorHistory(prev);
    setCursor(prevCursor || undefined);
  }

  function handleSortChange(newSort: SortOption) {
    setSortBy(newSort);
    setCursor(undefined);
    setCursorHistory([]);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-autronis-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-autronis-card border border-autronis-border p-8 text-center">
        <p className="text-autronis-text-secondary">Kon documenten niet ophalen. Probeer het opnieuw.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-autronis-text-secondary" />
          <input
            type="text"
            value={zoekterm}
            onChange={(e) => setZoekterm(e.target.value)}
            placeholder="Zoek documenten..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-autronis-card border border-autronis-border text-sm text-autronis-text-primary focus:outline-none focus:border-autronis-accent"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as DocumentType | "alle")}
          className="rounded-lg bg-autronis-card border border-autronis-border px-3 py-2 text-sm text-autronis-text-primary focus:outline-none focus:border-autronis-accent"
        >
          <option value="alle">Alle types</option>
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={filterKlant}
          onChange={(e) => setFilterKlant(e.target.value)}
          className="rounded-lg bg-autronis-card border border-autronis-border px-3 py-2 text-sm text-autronis-text-primary focus:outline-none focus:border-autronis-accent"
        >
          <option value="">Alle klanten</option>
          {klantNamen.map((naam) => (
            <option key={naam} value={naam}>{naam}</option>
          ))}
        </select>
        <input
          type="month"
          value={filterDatum}
          onChange={(e) => setFilterDatum(e.target.value)}
          className="rounded-lg bg-autronis-card border border-autronis-border px-3 py-2 text-sm text-autronis-text-primary focus:outline-none focus:border-autronis-accent"
        />
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="w-4 h-4 text-autronis-text-secondary flex-shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as SortOption)}
            className="rounded-lg bg-autronis-card border border-autronis-border px-3 py-2 text-sm text-autronis-text-primary focus:outline-none focus:border-autronis-accent"
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Document list */}
      {!gefilterd?.length ? (
        <div className="rounded-xl bg-autronis-card border border-autronis-border p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-autronis-text-secondary opacity-50" />
          <p className="text-autronis-text-secondary">
            {zoekterm || filterType !== "alle" ? "Geen documenten gevonden" : "Nog geen documenten. Maak je eerste document aan!"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {gefilterd.map((doc: DocumentBase) => {
            const config = DOCUMENT_TYPE_CONFIG[doc.type];
            return (
              <a
                key={doc.notionId}
                href={doc.isOptimistic ? undefined : doc.notionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`block rounded-xl bg-autronis-card border border-autronis-border p-4 hover:border-autronis-accent/50 transition-colors group ${doc.isOptimistic ? "opacity-60 pointer-events-none" : ""}`}
              >
                <div className="flex items-start gap-4">
                  {/* Color bar */}
                  <div className="w-1 self-stretch rounded-full opacity-60" style={{ backgroundColor: config.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-autronis-text-primary truncate">{doc.titel}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bgClass} ${config.textClass}`}>
                        {config.label}
                      </span>
                      {doc.isOptimistic && <Loader2 className="w-3.5 h-3.5 animate-spin text-autronis-text-secondary" />}
                    </div>
                    {doc.samenvatting && (
                      <p className="text-xs text-autronis-text-secondary line-clamp-1">{doc.samenvatting}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-autronis-text-secondary">
                      {doc.klantNaam && <span>{doc.klantNaam}</span>}
                      {doc.aangemaaktOp && <span>{new Date(doc.aangemaaktOp).toLocaleDateString("nl-NL")}</span>}
                      <span>{doc.aangemaaktDoor}</span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-autronis-text-secondary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {(data?.hasMore || cursorHistory.length > 0) && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handlePrevPage}
            disabled={cursorHistory.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-autronis-text-secondary hover:text-autronis-text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
            Vorige
          </button>
          <span className="text-xs text-autronis-text-secondary">
            Pagina {cursorHistory.length + 1}
          </span>
          <button
            onClick={handleNextPage}
            disabled={!data?.hasMore}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-autronis-text-secondary hover:text-autronis-text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            Volgende
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
