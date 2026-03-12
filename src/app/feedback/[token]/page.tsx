"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Star, Send, CheckCircle } from "lucide-react";

interface SurveyData {
  id: number;
  klantNaam: string;
  projectNaam: string | null;
  score: number;
  ingevuldOp: string | null;
}

export default function PublicFeedbackPage() {
  const params = useParams();
  const token = params.token as string;

  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [opmerking, setOpmerking] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/tevredenheid/${token}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error();
      const json = await res.json();
      setSurvey(json.survey);
      if (json.survey.ingevuldOp) {
        setSubmitted(true);
        setScore(json.survey.score);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async () => {
    if (score === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tevredenheid/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, opmerking: opmerking.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.fout || "Onbekende fout");
      }
      setSubmitted(true);
    } catch {
      // Error handling
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#128C7E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !survey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Enquete niet gevonden
          </h1>
          <p className="text-gray-500">
            Deze link is ongeldig of niet meer beschikbaar.
          </p>
        </div>
      </div>
    );
  }

  const scoreLabels = [
    "",
    "Zeer ontevreden",
    "Ontevreden",
    "Neutraal",
    "Tevreden",
    "Zeer tevreden",
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <span className="text-xl font-bold text-[#128C7E]">Autronis</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        {submitted ? (
          /* Thank you state */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Bedankt voor uw feedback!
            </h1>
            <p className="text-lg text-gray-500 mb-8 max-w-md mx-auto">
              Uw beoordeling helpt ons om onze dienstverlening continu te verbeteren.
            </p>
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-8 h-8 ${
                    s <= score
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-400 mt-3">{scoreLabels[score]}</p>
          </div>
        ) : (
          /* Survey form */
          <div className="space-y-8">
            {/* Intro */}
            <div className="text-center py-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Hoe tevreden bent u?
              </h1>
              <p className="text-lg text-gray-500 max-w-md mx-auto">
                Wij horen graag hoe u de samenwerking met Autronis heeft ervaren.
              </p>
              {survey.projectNaam && (
                <p className="text-sm text-gray-400 mt-2">
                  Project: {survey.projectNaam}
                </p>
              )}
            </div>

            {/* Rating card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-10">
              {/* Star rating */}
              <div className="text-center mb-8">
                <p className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">
                  Geef uw beoordeling
                </p>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setScore(s)}
                      onMouseEnter={() => setHoverScore(s)}
                      onMouseLeave={() => setHoverScore(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-12 h-12 transition-colors ${
                          s <= (hoverScore || score)
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300 hover:text-yellow-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {(hoverScore || score) > 0 && (
                  <p className="text-sm text-gray-500 mt-3 h-5">
                    {scoreLabels[hoverScore || score]}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heeft u nog opmerkingen? (optioneel)
                </label>
                <textarea
                  value={opmerking}
                  onChange={(e) => setOpmerking(e.target.value)}
                  placeholder="Vertel ons wat u vond van de samenwerking, communicatie, kwaliteit..."
                  rows={4}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#128C7E]/50 focus:border-[#128C7E] transition-colors resize-none placeholder:text-gray-400"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={score === 0 || submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#128C7E] hover:bg-[#0E6B61] text-white rounded-xl text-lg font-semibold transition-colors shadow-lg shadow-[#128C7E]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
                {submitting ? "Verzenden..." : "Verstuur beoordeling"}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-16">
        <div className="max-w-2xl mx-auto px-6 py-8 text-center">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Autronis. Alle rechten voorbehouden.
          </p>
        </div>
      </footer>
    </div>
  );
}
