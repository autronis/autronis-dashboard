"use client";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-autronis-card rounded-lg ${className}`}
    />
  );
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`rounded-2xl border border-autronis-border bg-autronis-card p-6 ${className}`}
    >
      <Skeleton className="h-4 w-1/3 mb-4" />
      <Skeleton className="h-3 w-2/3 mb-2" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonKPI({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`rounded-2xl border border-autronis-border bg-autronis-card p-6 flex items-center gap-4 ${className}`}
    >
      <Skeleton className="h-12 w-12 rounded-full shrink-0" />
      <div className="flex-1">
        <Skeleton className="h-7 w-20 mb-2" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, className = "" }: SkeletonTableProps) {
  return (
    <div
      className={`rounded-2xl border border-autronis-border bg-autronis-card overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-autronis-border">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-1/6" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 p-4 border-b border-autronis-border last:border-b-0"
        >
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/6" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SkeletonKPI />
        <SkeletonKPI />
        <SkeletonKPI />
        <SkeletonKPI />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-5 w-32 mb-2" />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-5 w-32 mb-2" />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

export function SkeletonKlanten() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-autronis-border bg-autronis-card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-3 w-full mb-2" />
          <Skeleton className="h-3 w-2/3 mb-4" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonFacturen() {
  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SkeletonKPI />
        <SkeletonKPI />
        <SkeletonKPI />
        <SkeletonKPI />
      </div>
      {/* Table */}
      <SkeletonTable rows={6} />
    </div>
  );
}

export function SkeletonTaken() {
  return (
    <div className="space-y-6">
      {/* Filter tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-20 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      {/* Task rows */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-autronis-border bg-autronis-card p-4 flex items-center gap-4"
          >
            <Skeleton className="h-5 w-5 rounded shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-4 w-1/3 mb-2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCRM() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 5 }).map((_, col) => (
        <div key={col} className="flex-1 min-w-[220px] space-y-3">
          <Skeleton className="h-5 w-24 mb-3" />
          {Array.from({ length: 3 - (col % 2) }).map((_, row) => (
            <div
              key={row}
              className="rounded-xl border border-autronis-border bg-autronis-card p-4"
            >
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-3" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
