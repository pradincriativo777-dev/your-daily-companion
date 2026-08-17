import { useState, useEffect } from "react";

export type ViewMode = "simples" | "completo";

const VIEW_MODE_KEY = "jansol_view_mode";

export function useViewMode() {
  const [mode, setModeState] = useState<ViewMode>("simples");

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = localStorage.getItem(VIEW_MODE_KEY);
        if (stored === "completo" || stored === "simples") {
          setModeState(stored);
        }
      } catch {
        // Fallback default 'simples'
      }
    }
  }, []);

  const setViewMode = (newMode: ViewMode) => {
    setModeState(newMode);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(VIEW_MODE_KEY, newMode);
      } catch {
        // Ignore storage errors
      }
    }
  };

  const toggleViewMode = () => {
    setViewMode(mode === "simples" ? "completo" : "simples");
  };

  return {
    mode,
    setViewMode,
    toggleViewMode,
    isSimples: mode === "simples",
    isCompleto: mode === "completo",
  };
}
