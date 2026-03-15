"use client";

import { useState } from "react";
import { useDocumenten } from "@/hooks/queries/use-documenten";
import { DocumentBase, DocumentType, DOCUMENT_TYPE_LABELS } from "@/types/documenten";
import { FileText, ExternalLink, Search } from "lucide-react";

const TYPE_COLORS: Record<DocumentType, string> = {
  contract: "bg-blue-500/10 text-blue-400",
  klantdocument: "bg-green-500/10 text-green-400",
  intern: "bg-purple-500/10 text-purple-400",
  "belangrijke-info": "bg-orange-500/10 text-orange-400",
  plan: "bg-autronis-accent/10 text-autronis-accent",
  notitie: "bg-gray-500/10 text-gray-400",
};

export function DocumentList() {
  const { data: documenten, isLoading, error } = useDocumenten();
  const [zoekterm, setZoekterm] = useState("");
  const [filterType, setFilterType] = useState<DocumentType | "alle">("alle");
  const [filterKlant, setFilterKlant] = useState("");
  const [filterDatum, setFilterDatum] = useState("");

  const klantNamen = [...new Set(documenten?.map((d: DocumentBase) => d.klantNaam).filter(Boolean) ?? [])];

  const gefilterd = documenten?.filter((doc: DocumentBase) => {
    const matchType = filterType === "alle" || doc.type === filterType;
    const matchZoek = !zoekterm || doc.titel.toLowerCase().includes(zoekterm.toLowerCase()) || doc.samenvatting.toLowerCase().includes(zoekterm.toLowerCase());
    const matchKlant = !filterKlant || doc.klantNaam === filterKlant;
    const matchDatum = !filterDatum || doc.aangemaaktOp.startsWith(filterDatum);
    return matchType && matchZoek && matchKlant && matchDatum;
  });

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
      </div>

      {!gefilterd?.length ? (
        <div className="rounded-xl bg-autronis-card border border-autronis-border p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-autronis-text-secondary opacity-50" />
          <p className="text-autronis-text-secondary">
            {zoekterm || filterType !== "alle" ? "Geen documenten gevonden" : "Nog geen documenten. Maak je eerste document aan!"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {gefilterd.map((doc: DocumentBase) => (
            <a
              key={doc.notionId}
              href={doc.notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl bg-autronis-card border border-autronis-border p-4 hover:border-autronis-accent/50 transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-autronis-text-primary truncate">{doc.titel}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[doc.type]}`}>
                      {DOCUMENT_TYPE_LABELS[doc.type]}
                    </span>
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
          ))}
        </div>
      )}
    </div>
  );
}
