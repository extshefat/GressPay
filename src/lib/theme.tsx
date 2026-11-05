"use client";

import * as React from "react";
import { MotionConfig } from "framer-motion";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

type ThemeContextValue = {
  theme: Theme;
  preference: ThemePreference;
  setTheme: (t: ThemePreference) => void;
  toggle: () => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);
const THEME_KEY = "gresspay_theme";

function readStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // ignore
  }
  return "system";
}

function applyDomTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("light");
  const [preference, setPreference] = React.useState<ThemePreference>("system");
  const update = React.useCallback((choice: ThemePreference) => {
    const resolved = choice === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : choice;
    setPreference(choice); setThemeState(resolved); applyDomTheme(resolved);
  }, []);
  React.useEffect(() => {
    update(readStoredTheme());
    const media = matchMedia("(prefers-color-scheme: dark)");
    const sync = () => update(readStoredTheme());
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    return () => { media.removeEventListener("change", sync); window.removeEventListener("storage", sync); };
  }, [update]);
  const setTheme = (choice: ThemePreference) => {
    try { if (choice === "system") localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, choice); } catch { /* Theme still works when storage is unavailable. */ }
    update(choice);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        preference,
        setTheme,
        toggle: () => setTheme(theme === "dark" ? "light" : "dark"),
      }}
    >
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeToggle({ size = "md" }: { size?: "sm" | "md" }) {
  const { theme, toggle } = useTheme();
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={`${dim} inline-flex items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]`}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
