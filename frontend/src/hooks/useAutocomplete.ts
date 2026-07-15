import { useEffect, useRef, useState } from "react";
import { AutocompleteResponse } from "../types";
import { getAutocomplete } from "../services/api";
import { useApp } from "../Context/MainContext";

const EMPTY: AutocompleteResponse = { success: true, menuItems: [], restaurants: [] };

export function useAutocomplete(query: string, debounceMs = 300) {
  const [data, setData] = useState<AutocompleteResponse>(EMPTY);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { location } = useApp();

  useEffect(() => {
    const trimmed = query.trim();

    // Skip 1-char queries — low signal, and edge_ngram min_gram is 2
    // anyway, so a 1-char query would just return nothing useful.
    if (trimmed.length < 2) {
      abortRef.current?.abort();
      setData(EMPTY);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort(); // cancel previous in-flight request
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      const lat = location?.latitude ?? undefined;
      const lng = location?.longitude ?? undefined;

      getAutocomplete(trimmed, lat, lng, controller.signal)
        .then(setData)
        .catch((err) => {
          if (err.code !== "ERR_CANCELED") {
            console.error("[autocomplete] failed:", err);
          }
        })
        .finally(() => setLoading(false));
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs, location]);

  return { data, loading };
}