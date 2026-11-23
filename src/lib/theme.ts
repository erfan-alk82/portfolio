/**
 * Day map / Night map. With no saved choice the site follows the system
 * (`prefers-color-scheme`, handled purely in CSS); a saved choice is applied
 * as `data-theme` on <html> before first paint by `themeBootScript`.
 */

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

export function readStoredTheme(value: string | null): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}

export function resolveTheme(stored: Theme | null, prefersDark: boolean): Theme {
  return stored ?? (prefersDark ? "dark" : "light");
}

export function nextTheme(current: Theme): Theme {
  return current === "dark" ? "light" : "dark";
}

/**
 * Inline, render-blocking on purpose: it runs before the first paint so a saved
 * Night map never flashes white. Storage may be unavailable (privacy modes), so
 * it fails silently and the CSS system preference applies.
 */
export const themeBootScript =
  `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});` +
  `if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}})()`;
