"use client";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1.5 text-sm ${className}`}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-autronis-text-secondary" />
            )}
            {isLast || !item.href ? (
              <span
                className={
                  isLast
                    ? "text-autronis-text-primary font-medium"
                    : "text-autronis-text-secondary"
                }
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-autronis-text-secondary hover:text-autronis-accent transition-colors"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
