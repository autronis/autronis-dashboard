"use client";

import { useEffect, useState, useCallback } from "react";

interface KeyboardShortcutsOptions {
  onNieuw?: () => void;
  onBewerk?: () => void;
  onEscape?: () => void;
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    (el as HTMLElement).isContentEditable
  );
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsOverlayOpen, setShortcutsOverlayOpen] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K: command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Escape
      if (e.key === "Escape") {
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
          return;
        }
        if (shortcutsOverlayOpen) {
          setShortcutsOverlayOpen(false);
          return;
        }
        options.onEscape?.();
        return;
      }

      // Keys that only work when not in an input
      if (isInputFocused()) return;

      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOverlayOpen((prev) => !prev);
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      if (e.key === "n" || e.key === "N") {
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          options.onNieuw?.();
          return;
        }
      }

      if (e.key === "e" || e.key === "E") {
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          options.onBewerk?.();
          return;
        }
      }
    },
    [commandPaletteOpen, shortcutsOverlayOpen, options]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return {
    commandPaletteOpen,
    setCommandPaletteOpen,
    shortcutsOverlayOpen,
    setShortcutsOverlayOpen,
  };
}
