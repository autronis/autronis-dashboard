"use client";

import { create } from "zustand";

export type ToastType = "succes" | "fout" | "info";

interface Toast {
  id: string;
  bericht: string;
  type: ToastType;
}

interface ToastState {
  toasts: Toast[];
  addToast: (bericht: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],

  addToast: (bericht, type = "succes") => {
    const id = crypto.randomUUID();
    set((state) => ({
      toasts: [...state.toasts, { id, bericht, type }],
    }));
    // Auto-remove after 3 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
