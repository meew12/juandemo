"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Wrench, Car, Home, Search } from "lucide-react";

type SuggestionCategory = "servicio" | "auto" | "propiedad";

interface Suggestion {
  text: string;
  category: SuggestionCategory;
}

const SUGGESTIONS: Suggestion[] = [
  { text: "Plomero", category: "servicio" },
  { text: "Electricista", category: "servicio" },
  { text: "Diseño web", category: "servicio" },
  { text: "Programador", category: "servicio" },
  { text: "Carpintero", category: "servicio" },
  { text: "Toyota Corolla", category: "auto" },
  { text: "Volkswagen", category: "auto" },
  { text: "Departamento Palermo", category: "propiedad" },
  { text: "Alquiler temporario", category: "propiedad" },
  { text: "Casa en Córdoba", category: "propiedad" },
];

function getCategoryIcon(category: SuggestionCategory) {
  switch (category) {
    case "servicio":
      return <Wrench className="w-4 h-4" />;
    case "auto":
      return <Car className="w-4 h-4" />;
    case "propiedad":
      return <Home className="w-4 h-4" />;
  }
}

function getCategoryColor(category: SuggestionCategory) {
  switch (category) {
    case "servicio":
      return "var(--umpi-accent)";
    case "auto":
      return "var(--umpi-blue)";
    case "propiedad":
      return "var(--umpi-green)";
  }
}

function getCategoryLabel(category: SuggestionCategory) {
  switch (category) {
    case "servicio":
      return "Servicio";
    case "auto":
      return "Auto";
    case "propiedad":
      return "Propiedad";
  }
}

interface SearchSuggestionsProps {
  query: string;
  onSelect: (suggestion: string) => void;
  onClose: () => void;
}

export function SearchSuggestions({ query, onSelect, onClose }: SearchSuggestionsProps) {
  const filtered = query.trim()
    ? SUGGESTIONS.filter((s) =>
        s.text.toLowerCase().includes(query.trim().toLowerCase())
      )
    : SUGGESTIONS;

  if (filtered.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl umpi-shadow-md overflow-hidden animate-slide-up">
      <div className="p-1.5">
        {filtered.map((suggestion, index) => (
          <button
            key={suggestion.text}
            onClick={() => {
              onSelect(suggestion.text);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors hover:bg-[var(--umpi-surface2)] group"
          >
            <div
              className="shrink-0 grid place-items-center rounded-md"
              style={{
                width: 32,
                height: 32,
                background: `${getCategoryColor(suggestion.category)}12`,
                color: getCategoryColor(suggestion.category),
              }}
            >
              {getCategoryIcon(suggestion.category)}
            </div>
            <span className="flex-1 text-[var(--umpi-text)] font-medium">
              {suggestion.text}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full shrink-0"
              style={{
                background: `${getCategoryColor(suggestion.category)}12`,
                color: getCategoryColor(suggestion.category),
              }}
            >
              {getCategoryLabel(suggestion.category)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* Hook that manages the suggestions dropdown open/close logic */
export function useSearchSuggestions() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  return { open, setOpen, ref };
}
