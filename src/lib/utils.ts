import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string or Date object to Dutch long format
 * e.g. "12 maart 2026"
 */
export function formatDatum(datum: string | Date): string {
  const d = typeof datum === "string" ? new Date(datum) : datum;
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Format a date string or Date object to Dutch short format
 * e.g. "12-03-2026"
 */
export function formatDatumKort(datum: string | Date): string {
  const d = typeof datum === "string" ? new Date(datum) : datum;
  return d.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format a number as Dutch currency
 * e.g. 1234.56 -> "€ 1.234,56"
 */
export function formatBedrag(bedrag: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(bedrag)
    .replace("€", "€");
}

/**
 * Format minutes as hours:minutes
 * e.g. 150 -> "2:30"
 */
export function formatUren(minuten: number): string {
  const uren = Math.floor(minuten / 60);
  const mins = minuten % 60;
  return `${uren}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Return current ISO timestamp string
 */
export function nuTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Round a number to 2 decimal places
 */
export function roundBedrag(bedrag: number): number {
  return Math.round(bedrag * 100) / 100;
}
