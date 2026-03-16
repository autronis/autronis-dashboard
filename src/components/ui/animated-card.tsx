"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  index?: number; // For staggered entry
  hover?: boolean; // Enable hover lift (default true)
  gradient?: boolean; // Use gradient background
  onClick?: () => void;
}

export function AnimatedCard({
  children,
  className,
  index = 0,
  hover = true,
  gradient = false,
  onClick,
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      onClick={onClick}
      className={cn(
        "border border-autronis-border rounded-xl p-6",
        gradient ? "card-gradient" : "bg-autronis-card",
        hover && "card-glow cursor-pointer",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
