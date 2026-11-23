"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import {
  THEME_STORAGE_KEY,
  nextTheme,
  readStoredTheme,
  resolveTheme,
  type Theme,
} from "@/lib/theme";

type Props = {
  labels: { toNight: string; toDay: string };
};

const DARK_QUERY = "(prefers-color-scheme: dark)";
const CHANGE_EVENT = "themechange";

function readStorage(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function currentTheme(): Theme {
  const applied = readStoredTheme(
    document.documentElement.dataset.theme ?? null,
  );
  return resolveTheme(
    applied ?? readStoredTheme(readStorage()),
    window.matchMedia(DARK_QUERY).matches,
  );
}

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Day map ↔ Night map. The choice is remembered on this device; without one the system decides. */
export function ThemeToggle({ labels }: Props) {
  // The server cannot know the visitor's theme; "light" is only used until hydration.
  const theme = useSyncExternalStore(
    subscribe,
    currentTheme,
    () => "light" as Theme,
  );
  const label = theme === "dark" ? labels.toDay : labels.toNight;

  const handleClick = (): void => {
    const next = nextTheme(currentTheme());
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage blocked (private mode): the theme still applies for this page view.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      data-testid="theme-toggle"
      className="inline-flex size-11 items-center justify-center rounded-sm border border-ink/25 text-ink transition-colors duration-150 hover:border-signal hover:text-signal-deep"
    >
      {theme === "dark" ? (
        <Sun aria-hidden="true" className="size-4" strokeWidth={1.75} />
      ) : (
        <Moon aria-hidden="true" className="size-4" strokeWidth={1.75} />
      )}
    </button>
  );
}
