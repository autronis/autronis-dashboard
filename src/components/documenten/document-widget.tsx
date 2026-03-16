"use client";

import Link from "next/link";
import { useDocumenten } from "@/hooks/queries/use-documenten";
import { usePinnedDocuments } from "@/hooks/use-document-prefs";
import { DocumentBase, DOCUMENT_TYPE_CONFIG } from "@/types/documenten";
import { FileText, ArrowRight, Pin, ExternalLink } from "lucide-react";

export function DocumentWidget() {
  const { data, isLoading } = useDocumenten();
  const { isPinned } = usePinnedDocuments();

  if (isLoading) {
    return (
      <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-7 card-glow">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-autronis-accent/10 rounded-xl">
            <FileText className="w-5 h-5 text-autronis-accent" />
          </div>
          <h3 className="text-base font-semibold text-autronis-text-primary">Documenten</h3>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-autronis-bg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const documenten = data?.documenten ?? [];
  const pinned = documenten.filter((d: DocumentBase) => isPinned(d.notionId)).slice(0, 3);
  const recent = documenten.filter((d: DocumentBase) => !isPinned(d.notionId)).slice(0, 3);
  const items = [...pinned, ...recent].slice(0, 6);

  return (
    <div className="bg-autronis-card border border-autronis-border rounded-2xl p-6 lg:p-7 card-glow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-autronis-accent/10 rounded-xl">
            <FileText className="w-5 h-5 text-autronis-accent" />
          </div>
          <h3 className="text-base font-semibold text-autronis-text-primary">Documenten</h3>
        </div>
        <span className="text-xs text-autronis-text-secondary">{documenten.length} totaal</span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-autronis-text-secondary">Nog geen documenten</p>
      ) : (
        <div className="space-y-2">
          {items.map((doc: DocumentBase) => {
            const config = DOCUMENT_TYPE_CONFIG[doc.type];
            const docPinned = isPinned(doc.notionId);
            return (
              <a
                key={doc.notionId}
                href={doc.notionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-autronis-bg transition-colors group"
              >
                <div className="w-1 h-8 rounded-full opacity-60" style={{ backgroundColor: config.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {docPinned && <Pin className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                    <p className="text-sm text-autronis-text-primary truncate">{doc.titel}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-autronis-text-secondary mt-0.5">
                    <span className={config.textClass}>{config.label}</span>
                    {doc.klantNaam && <span>· {doc.klantNaam}</span>}
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-autronis-text-secondary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </a>
            );
          })}
        </div>
      )}

      <Link
        href="/documenten"
        className="flex items-center gap-1.5 mt-4 text-sm text-autronis-accent hover:text-autronis-accent-hover transition-colors"
      >
        Bekijk alle documenten
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
