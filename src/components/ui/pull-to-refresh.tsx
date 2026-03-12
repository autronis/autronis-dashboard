"use client";

import { useRef, useState, useCallback, type ReactNode } from "react";
import { motion } from "framer-motion";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, 100));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance > 80) {
      setRefreshing(true);
      setPullDistance(60);
      await onRefresh();
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance, onRefresh]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      {(pullDistance > 0 || refreshing) && (
        <motion.div
          className="flex items-center justify-center"
          style={{ height: pullDistance }}
          animate={{ height: refreshing ? 60 : pullDistance }}
        >
          {refreshing ? (
            <div className="w-6 h-6 border-2 border-autronis-accent/30 border-t-autronis-accent rounded-full animate-spin" />
          ) : (
            <motion.div
              className="w-6 h-6 border-2 border-autronis-accent/30 border-t-autronis-accent rounded-full"
              style={{ rotate: pullDistance * 3 }}
            />
          )}
        </motion.div>
      )}
      {children}
    </div>
  );
}
