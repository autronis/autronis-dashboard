"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Check, PenTool, Type } from "lucide-react";

interface Sectie {
  id: string;
  titel: string;
  inhoud: string;
  actief: boolean;
}

interface Regel {
  id: number;
  omschrijving: string;
  aantal: number | null;
  eenheidsprijs: number | null;
  totaal: number | null;
}

interface ProposalData {
  id: number;
  klantNaam: string;
  klantContactpersoon: string | null;
  titel: string;
  status: string;
  secties: string;
  totaalBedrag: number | null;
  geldigTot: string | null;
  ondertekendOp: string | null;
  ondertekendDoor: string | null;
  ondertekening: string | null;
  aangemaaktOp: string | null;
}

function formatBedrag(bedrag: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(bedrag);
}

function formatDatum(datum: string): string {
  return new Date(datum).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function SignatureCanvas({
  onSign,
}: {
  onSign: (data: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (hasDrawn && canvasRef.current) {
      onSign(canvasRef.current.toDataURL("image/png"));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSign("");
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={500}
          height={200}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl bg-white cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-400 text-sm">Teken hier uw handtekening</p>
          </div>
        )}
      </div>
      {hasDrawn && (
        <button
          onClick={clearCanvas}
          className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
        >
          Wissen
        </button>
      )}
    </div>
  );
}

export default function PublicProposalPage() {
  const params = useParams();
  const token = params.token as string;

  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [regels, setRegels] = useState<Regel[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [showSignArea, setShowSignArea] = useState(false);
  const [signTab, setSignTab] = useState<"tekening" | "getypt">("tekening");
  const [signNaam, setSignNaam] = useState("");
  const [signData, setSignData] = useState("");
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/proposal/${token}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error();
      const json = await res.json();
      setProposal(json.proposal);
      setRegels(json.regels);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSign = async () => {
    if (!signNaam.trim()) return;
    if (signTab === "tekening" && !signData) return;

    setSigning(true);
    try {
      const res = await fetch(`/api/proposal/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naam: signNaam.trim(),
          type: signTab,
          data: signTab === "tekening" ? signData : signNaam.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.fout || "Onbekende fout");
      }
      setSigned(true);
    } catch {
      // Error handling
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#128C7E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !proposal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Voorstel niet gevonden</h1>
          <p className="text-gray-500">Dit voorstel bestaat niet of is niet meer beschikbaar.</p>
        </div>
      </div>
    );
  }

  const secties: Sectie[] = JSON.parse(proposal.secties || "[]").filter(
    (s: Sectie) => s.actief
  );

  const isOndertekend = proposal.status === "ondertekend" || signed;
  const canSign = (proposal.status === "verzonden" || proposal.status === "bekeken") && !signed;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-[#128C7E]">Autronis</span>
          {isOndertekend && (
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
              <Check className="w-4 h-4" />
              Ondertekend
            </span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-16">
        {/* Cover section */}
        <section className="text-center py-16">
          <p className="text-sm text-[#128C7E] font-semibold uppercase tracking-widest mb-4">
            Voorstel
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {proposal.titel}
          </h1>
          <p className="text-xl text-gray-500">
            Voor {proposal.klantContactpersoon || proposal.klantNaam}
          </p>
          {proposal.aangemaaktOp && (
            <p className="text-sm text-gray-400 mt-4">
              {formatDatum(proposal.aangemaaktOp)}
            </p>
          )}
        </section>

        {/* Sections */}
        {secties.map((sectie) => (
          <section key={sectie.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
              {sectie.titel}
            </h2>
            <div className="text-gray-600 leading-relaxed whitespace-pre-wrap text-base">
              {sectie.inhoud}
            </div>
          </section>
        ))}

        {/* Pricing table */}
        {regels.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
              Investering
            </h2>
            <table className="w-full mb-8">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Omschrijving
                  </th>
                  <th className="text-center py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">
                    Aantal
                  </th>
                  <th className="text-right py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-28">
                    Prijs
                  </th>
                  <th className="text-right py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-28">
                    Totaal
                  </th>
                </tr>
              </thead>
              <tbody>
                {regels.map((regel) => (
                  <tr key={regel.id} className="border-b border-gray-100">
                    <td className="py-4 text-base text-gray-800">{regel.omschrijving}</td>
                    <td className="py-4 text-base text-gray-800 text-center tabular-nums">
                      {regel.aantal || 1}
                    </td>
                    <td className="py-4 text-base text-gray-800 text-right tabular-nums">
                      {formatBedrag(regel.eenheidsprijs || 0)}
                    </td>
                    <td className="py-4 text-base text-gray-800 text-right tabular-nums">
                      {formatBedrag(regel.totaal || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end">
              <div className="border-t-2 border-[#128C7E] pt-4 flex items-center gap-8">
                <span className="text-lg font-semibold text-gray-500">Totaal</span>
                <span className="text-2xl font-bold text-[#128C7E] tabular-nums">
                  {formatBedrag(proposal.totaalBedrag || 0)}
                </span>
              </div>
            </div>
            {proposal.geldigTot && (
              <p className="text-sm text-gray-400 mt-6 italic">
                Dit voorstel is geldig tot {formatDatum(proposal.geldigTot)}.
              </p>
            )}
          </section>
        )}

        {/* Signature section */}
        {isOndertekend && (
          <section className="bg-green-50 border border-green-200 rounded-2xl p-8 sm:p-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">
              Voorstel ondertekend
            </h2>
            <p className="text-green-600">
              Ondertekend door{" "}
              <span className="font-semibold">
                {signed ? signNaam : proposal.ondertekendDoor}
              </span>
              {proposal.ondertekendOp && (
                <> op {formatDatum(proposal.ondertekendOp)}</>
              )}
            </p>
          </section>
        )}

        {canSign && !showSignArea && (
          <section className="text-center py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Klaar om samen aan de slag te gaan?
            </h2>
            <p className="text-gray-500 mb-8 max-w-lg mx-auto">
              Door dit voorstel te ondertekenen gaat u akkoord met de hierboven beschreven
              werkzaamheden en investering.
            </p>
            <button
              onClick={() => setShowSignArea(true)}
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#128C7E] hover:bg-[#0E6B61] text-white rounded-xl text-lg font-semibold transition-colors shadow-lg shadow-[#128C7E]/20"
            >
              <PenTool className="w-5 h-5" />
              Akkoord & Ondertekenen
            </button>
          </section>
        )}

        {canSign && showSignArea && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Onderteken dit voorstel
            </h2>

            {/* Name input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Uw naam <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={signNaam}
                onChange={(e) => setSignNaam(e.target.value)}
                placeholder="Volledige naam"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#128C7E]/50 focus:border-[#128C7E] transition-colors"
              />
            </div>

            {/* Tab selector */}
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setSignTab("tekening")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  signTab === "tekening"
                    ? "bg-[#128C7E] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <PenTool className="w-4 h-4" />
                Tekenen
              </button>
              <button
                onClick={() => setSignTab("getypt")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  signTab === "getypt"
                    ? "bg-[#128C7E] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Type className="w-4 h-4" />
                Typ je naam
              </button>
            </div>

            {/* Signature area */}
            {signTab === "tekening" ? (
              <SignatureCanvas onSign={setSignData} />
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-xl bg-white p-8 flex items-center justify-center min-h-[120px]">
                {signNaam.trim() ? (
                  <p
                    className="text-3xl text-gray-800"
                    style={{ fontFamily: "cursive" }}
                  >
                    {signNaam}
                  </p>
                ) : (
                  <p className="text-gray-400">Vul uw naam in hierboven</p>
                )}
              </div>
            )}

            {/* Submit */}
            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={handleSign}
                disabled={
                  signing ||
                  !signNaam.trim() ||
                  (signTab === "tekening" && !signData)
                }
                className="inline-flex items-center gap-2 px-8 py-3 bg-[#128C7E] hover:bg-[#0E6B61] text-white rounded-xl text-base font-semibold transition-colors shadow-lg shadow-[#128C7E]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-5 h-5" />
                {signing ? "Ondertekenen..." : "Bevestig ondertekening"}
              </button>
              <button
                onClick={() => setShowSignArea(false)}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Annuleren
              </button>
            </div>
          </section>
        )}

        {proposal.status === "afgewezen" && (
          <section className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <h2 className="text-xl font-bold text-red-800 mb-2">
              Dit voorstel is afgewezen
            </h2>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-16">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Autronis. Alle rechten voorbehouden.
          </p>
        </div>
      </footer>
    </div>
  );
}
