import { Archivo, Vazirmatn } from "next/font/google";

/** Shared by both root layouts (the site under [locale] and the admin). */
export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const fontVariables = `${archivo.variable} ${vazirmatn.variable}`;
