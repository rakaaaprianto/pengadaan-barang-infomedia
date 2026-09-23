"use client";

import React, { useState, useRef, useEffect, useMemo, useId } from "react";
import { Check, ChevronsUpDown, X, Plus, AlertTriangle } from "lucide-react";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
}

interface ComboboxProps {
  id?: string;
  name?: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string, isNew?: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  allowCreate?: boolean;
  createLabelPrefix?: string;
  error?: string;
  isNewValue?: boolean;
  onClearNewValueBadge?: () => void;
}

// Normalisasi string untuk pengecekan kemiripan (hapus spasi, titik, koma, pt/cv)
function normalizeForSimilarity(str: string): string {
  return str
    .toLowerCase()
    .replace(/^(pt|cv|ud|p\.t\.|c\.v\.)\s*/i, "")
    .replace(/[.\-–—,()/\\]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

export function Combobox({
  id: customId,
  name,
  options,
  value,
  onChange,
  placeholder = "Pilih atau cari opsi...",
  disabled = false,
  required = false,
  allowCreate = false,
  createLabelPrefix = "Tambah mitra baru",
  error,
  isNewValue = false,
}: ComboboxProps) {
  const generatedId = useId();
  const inputId = customId || generatedId;

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Selected option label
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value.toLowerCase() === value.toLowerCase());
  }, [options, value]);

  // Sync search input with value when closing/opening
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(selectedOption ? selectedOption.label : value);
      setHighlightedIndex(-1);
    }
  }, [isOpen, selectedOption, value]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchTerm) {
      return options.slice(0, 80);
    }
    const query = searchTerm.toLowerCase().trim();
    const matches = options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        opt.value.toLowerCase().includes(query) ||
        (opt.description && opt.description.toLowerCase().includes(query))
    );
    return matches.slice(0, 80);
  }, [options, searchTerm]);

  // Cek apakah query persis sama dengan opsi yang ada
  const exactMatchExists = useMemo(() => {
    if (!searchTerm) return true;
    const query = searchTerm.trim().toLowerCase();
    return options.some(
      (opt) =>
        opt.value.trim().toLowerCase() === query ||
        opt.label.trim().toLowerCase() === query
    );
  }, [options, searchTerm]);

  // Cek kemiripan nama (contoh: "PT ABC" vs "P.T. ABC") untuk peringatan typo
  const similarOption = useMemo(() => {
    if (!allowCreate || exactMatchExists || !searchTerm || searchTerm.trim().length < 3) {
      return null;
    }
    const normQuery = normalizeForSimilarity(searchTerm);
    if (!normQuery) return null;

    return options.find((opt) => {
      const normOpt = normalizeForSimilarity(opt.label);
      return normOpt === normQuery || (normOpt.length > 4 && normQuery.length > 4 && (normOpt.includes(normQuery) || normQuery.includes(normOpt)));
    });
  }, [allowCreate, exactMatchExists, searchTerm, options]);

  // Menutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val: string, isNew = false) => {
    onChange(val, isNew);
    setSearchTerm(val);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", false);
    setSearchTerm("");
    setIsOpen(false);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    const totalItems = filteredOptions.length + (allowCreate && !exactMatchExists && searchTerm.trim() ? 1 : 0);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1 >= totalItems ? 0 : prev + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev <= 0 ? totalItems - 1 : prev - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex].value, false);
        } else if (
          allowCreate &&
          !exactMatchExists &&
          searchTerm.trim() &&
          highlightedIndex === filteredOptions.length
        ) {
          handleSelect(searchTerm.trim(), true);
        } else if (filteredOptions.length > 0) {
          handleSelect(filteredOptions[0].value, false);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  // Auto scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const activeElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={`${inputId}-listbox`}
          aria-invalid={Boolean(error)}
          disabled={disabled}
          required={required && !value}
          value={searchTerm}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm("");
          }}
          onKeyDown={handleKeyDown}
          className={`w-full rounded-xl border py-2.5 pl-3 pr-16 text-xs font-medium text-slate-800 shadow-2xs transition-colors placeholder:text-slate-400 focus:outline-hidden focus:ring-1 ${
            error
              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20"
              : "border-slate-200 bg-slate-50/70 focus:border-rose-500 focus:ring-rose-500 focus:bg-white"
          } ${disabled ? "cursor-not-allowed bg-slate-100 text-slate-400" : ""}`}
        />

        <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
          {/* Badge 'Baru' jika nilai merupakan mitra baru */}
          {isNewValue && value && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Baru
            </span>
          )}

          {/* Tombol Clear */}
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 focus:outline-hidden"
              aria-label="Hapus pilihan"
              tabIndex={-1}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Icon Dropdown */}
          <button
            type="button"
            onClick={() => {
              if (!disabled) {
                setIsOpen(!isOpen);
                inputRef.current?.focus();
              }
            }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md focus:outline-hidden"
            tabIndex={-1}
            aria-label="Buka opsi"
          >
            <ChevronsUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Peringatan Kemiripan Nama Mitra (Anti-Duplikat) */}
      {similarOption && isOpen && (
        <div className="mt-1 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">
              Maksud Anda: <span className="font-bold underline">{similarOption.label}</span>?
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Nama yang Anda ketik mirip dengan mitra yang sudah ada di master.
            </p>
            <button
              type="button"
              onClick={() => handleSelect(similarOption.value, false)}
              className="mt-1.5 px-2.5 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300 font-bold text-amber-900 text-[11px] transition-colors"
            >
              Gunakan {similarOption.label}
            </button>
          </div>
        </div>
      )}

      {/* Dropdown Listbox */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg custom-scrollbar">
          <ul
            ref={listRef}
            id={`${inputId}-listbox`}
            role="listbox"
            tabIndex={-1}
            className="divide-y divide-slate-100 text-xs"
          >
            {filteredOptions.length === 0 && (!allowCreate || !searchTerm.trim()) && (
              <li className="px-3 py-3 text-center text-xs text-slate-400">
                Tidak ada opsi yang cocok dengan &quot;{searchTerm}&quot;
              </li>
            )}

            {filteredOptions.map((opt, idx) => {
              const isSelected = opt.value.toLowerCase() === value.toLowerCase();
              const isHighlighted = idx === highlightedIndex;

              return (
                <li
                  key={`${opt.value}-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    e.preventDefault(); // cegah input blur sebelum klik terdaftar
                    handleSelect(opt.value, false);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`flex cursor-pointer items-center justify-between px-3 py-2 transition-colors ${
                    isHighlighted ? "bg-slate-50" : isSelected ? "bg-rose-50/60" : ""
                  }`}
                >
                  <div className="flex flex-col pr-2">
                    <span className={`font-semibold ${isSelected ? "text-rose-600" : "text-slate-800"}`}>
                      {opt.label}
                    </span>
                    {opt.description && (
                      <span className="text-[11px] text-slate-400 line-clamp-1">{opt.description}</span>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-rose-600 shrink-0" />}
                </li>
              );
            })}

            {/* Opsi Tambah Mitra Baru jika belum ada di daftar */}
            {allowCreate && !exactMatchExists && searchTerm.trim() && (
              <li
                role="option"
                aria-selected={false}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(searchTerm.trim(), true);
                }}
                onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2.5 border-t border-rose-100 bg-rose-50/40 text-rose-700 transition-colors ${
                  highlightedIndex === filteredOptions.length ? "bg-rose-100/60" : "hover:bg-rose-100/40"
                }`}
              >
                <Plus className="w-4 h-4 shrink-0 font-bold text-rose-600" />
                <div className="text-xs">
                  <span className="font-semibold">{createLabelPrefix}: </span>
                  <span className="underline font-bold">&quot;{searchTerm.trim()}&quot;</span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">
                    Mitra baru akan otomatis ditambahkan ke MASTER_MITRA saat submit
                  </span>
                </div>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
