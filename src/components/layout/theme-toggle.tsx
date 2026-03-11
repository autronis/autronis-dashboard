"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="p-2 rounded-lg hover:bg-autronis-border transition-colors"
      aria-label="Thema wisselen"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-autronis-text-secondary" />
      ) : (
        <Moon className="w-5 h-5 text-autronis-text-secondary" />
      )}
    </button>
  );
}
