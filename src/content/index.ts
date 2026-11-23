import type { Locale } from "@/i18n/config";
import { en } from "./en";
import { fa } from "./fa";
import type { SiteCopy } from "./types";

const copy: Record<Locale, SiteCopy> = { fa, en };

export function getCopy(locale: Locale): SiteCopy {
  return copy[locale];
}

export { jobs, profile, projects, skillGroupOrder } from "./profile";
export type * from "./types";
