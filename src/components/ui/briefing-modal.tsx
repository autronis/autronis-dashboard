"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, CheckSquare, CalendarDays, Euro } from "lucide-react";

interface BriefingData {
  takenVandaag: number;
  deadlinesDezeWeek: number;
  openstaandeFacturen: number;
}

interface BriefingModalProps {
  data: BriefingData;
}

export function BriefingModal({ data }: BriefingModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vandaag = new Date().toISOString().slice(0, 10);
    const laatsteLogin = localStorage.getItem("autronis-briefing-date");
    if (laatsteLogin !== vandaag) {
      setOpen(true);
      localStorage.setItem("autronis-briefing-date", vandaag);
    }
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-autronis-card border border-autronis-border rounded-2xl p-8 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <motion.div
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="inline-flex p-3 bg-autronis-accent/10 rounded-2xl mb-4"
              >
                <Rocket className="w-8 h-8 text-autronis-accent" />
              </motion.div>
              <h2 className="text-2xl font-bold text-autronis-text-primary">
                Dagelijkse briefing
              </h2>
              <p className="text-sm text-autronis-text-secondary mt-1">
                Dit staat er vandaag op de planning
              </p>
            </div>

            <div className="space-y-3 mb-8">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-3 bg-autronis-bg/50 rounded-xl p-4"
              >
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <CheckSquare className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-autronis-text-primary">
                    {data.takenVandaag} taken
                  </p>
                  <p className="text-sm text-autronis-text-secondary">gepland voor vandaag</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-3 bg-autronis-bg/50 rounded-xl p-4"
              >
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <CalendarDays className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-autronis-text-primary">
                    {data.deadlinesDezeWeek} deadlines
                  </p>
                  <p className="text-sm text-autronis-text-secondary">deze week</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-3 bg-autronis-bg/50 rounded-xl p-4"
              >
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <Euro className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-autronis-text-primary">
                    {data.openstaandeFacturen} facturen
                  </p>
                  <p className="text-sm text-autronis-text-secondary">openstaand</p>
                </div>
              </motion.div>
            </div>

            <motion.button
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              onClick={() => setOpen(false)}
              className="w-full py-3 bg-autronis-accent hover:bg-autronis-accent-hover text-autronis-bg rounded-xl text-base font-semibold transition-colors shadow-lg shadow-autronis-accent/20"
            >
              Laten we gaan!
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
