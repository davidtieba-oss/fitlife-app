"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getTheme, setTheme as saveTheme, type ThemeMode } from "./storage";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  resolvedDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  setTheme: () => {},
  resolvedDark: true,
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemDark(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyClass(dark: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [resolvedDark, setResolvedDark] = useState(true);

  useEffect(() => {
    const saved = getTheme();
    setThemeState(saved);
    const dark = saved === "dark" || (saved === "system" && getSystemDark());
    setResolvedDark(dark);
    applyClass(dark);
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setResolvedDark(e.matches);
      applyClass(e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  function setTheme(mode: ThemeMode) {
    setThemeState(mode);
    saveTheme(mode);
    const dark = mode === "dark" || (mode === "system" && getSystemDark());
    setResolvedDark(dark);
    applyClass(dark);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
