"use client";
import Link from "next/link";
import { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  titel: string;
  beschrijving: string;
  actieLabel?: string;
  actieHref?: string;
  onActie?: () => void;
  icoon?: ReactNode;
  className?: string;
}

export function EmptyState({
  titel,
  beschrijving,
  actieLabel,
  actieHref,
  onActie,
  icoon,
  className = "",
}: EmptyStateProps) {
  const ActionButton = () => {
    if (!actieLabel) return null;

    const buttonClasses =
      "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-autronis-accent text-white font-medium hover:bg-autronis-accent-hover transition-colors";

    if (actieHref) {
      return (
        <Link href={actieHref} className={buttonClasses}>
          {actieLabel}
        </Link>
      );
    }

    return (
      <button onClick={onActie} className={buttonClasses}>
        {actieLabel}
      </button>
    );
  };

  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-autronis-card border border-autronis-border mb-5">
        {icoon ?? (
          <Inbox className="h-7 w-7 text-autronis-text-secondary" />
        )}
      </div>
      <h3 className="text-lg font-semibold text-autronis-text-primary mb-2">
        {titel}
      </h3>
      <p className="text-sm text-autronis-text-secondary max-w-sm mb-6">
        {beschrijving}
      </p>
      <ActionButton />
    </div>
  );
}
