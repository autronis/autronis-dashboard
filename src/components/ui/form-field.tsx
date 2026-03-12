"use client";

import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface BaseFieldProps {
  label: string;
  fout?: string;
  verplicht?: boolean;
}

interface InputFieldProps extends BaseFieldProps, InputHTMLAttributes<HTMLInputElement> {
  type?: "text" | "email" | "number" | "date" | "time" | "password";
}

interface SelectFieldProps extends BaseFieldProps, SelectHTMLAttributes<HTMLSelectElement> {
  opties: { waarde: string; label: string }[];
}

interface TextareaFieldProps extends BaseFieldProps, TextareaHTMLAttributes<HTMLTextAreaElement> {
  isTextarea: true;
}

const inputClasses =
  "w-full bg-autronis-bg border border-autronis-border rounded-lg px-3 py-2.5 text-sm text-autronis-text-primary placeholder:text-autronis-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-autronis-accent/50 focus:border-autronis-accent transition-colors";

export function FormField({ label, fout, verplicht, ...props }: InputFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-autronis-text-secondary">
        {label}
        {verplicht && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        className={cn(inputClasses, fout && "border-red-400 focus:ring-red-400/50")}
        {...props}
      />
      {fout && <p className="text-xs text-red-400">{fout}</p>}
    </div>
  );
}

export function SelectField({ label, fout, verplicht, opties, ...props }: SelectFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-autronis-text-secondary">
        {label}
        {verplicht && <span className="text-red-400 ml-1">*</span>}
      </label>
      <select
        className={cn(inputClasses, "cursor-pointer", fout && "border-red-400 focus:ring-red-400/50")}
        {...props}
      >
        {opties.map((o) => (
          <option key={o.waarde} value={o.waarde}>
            {o.label}
          </option>
        ))}
      </select>
      {fout && <p className="text-xs text-red-400">{fout}</p>}
    </div>
  );
}

export function TextareaField({ label, fout, verplicht, isTextarea: _, ...props }: TextareaFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-autronis-text-secondary">
        {label}
        {verplicht && <span className="text-red-400 ml-1">*</span>}
      </label>
      <textarea
        className={cn(inputClasses, "resize-none", fout && "border-red-400 focus:ring-red-400/50")}
        rows={3}
        {...props}
      />
      {fout && <p className="text-xs text-red-400">{fout}</p>}
    </div>
  );
}
