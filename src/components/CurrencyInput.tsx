"use client";

import React, { useState, useEffect } from "react";

interface CurrencyInputProps {
  id?: string;
  name?: string;
  value: number | undefined;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

function formatCurrency(val: number | undefined): string {
  if (val === undefined || val === null || isNaN(val) || val === 0) {
    return "";
  }
  return new Intl.NumberFormat("id-ID").format(val);
}

export function CurrencyInput({
  id,
  name,
  value,
  onChange,
  placeholder = "0",
  disabled = false,
  required = false,
  error,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(formatCurrency(value));

  useEffect(() => {
    setDisplayValue(formatCurrency(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value.replace(/[^0-9]/g, "");
    if (!rawInput) {
      setDisplayValue("");
      onChange(0);
      return;
    }

    const numericVal = parseInt(rawInput, 10);
    setDisplayValue(new Intl.NumberFormat("id-ID").format(numericVal));
    onChange(numericVal);
  };

  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <span className="text-xs font-bold text-slate-400">Rp</span>
      </div>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        disabled={disabled}
        required={required}
        value={displayValue}
        placeholder={placeholder}
        onChange={handleChange}
        className={`w-full rounded-xl border py-2.5 pl-9 pr-3 text-xs font-semibold tabular-nums text-slate-800 shadow-2xs transition-colors placeholder:text-slate-400 focus:outline-hidden focus:ring-1 ${
          error
            ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20"
            : "border-slate-200 bg-slate-50/70 focus:border-rose-500 focus:ring-rose-500 focus:bg-white"
        } ${disabled ? "cursor-not-allowed bg-slate-100 text-slate-400" : ""}`}
      />
    </div>
  );
}
