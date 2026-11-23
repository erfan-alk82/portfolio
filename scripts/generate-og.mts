/**
 * Renders the Open Graph cards in real Chromium and writes public/og/{fa,en}.png.
 *
 * next/og (Satori) has no bidi support, so Persian words come out in the
 * wrong order. A browser shapes and orders both scripts correctly, and the
 * cards use the same content, fonts and contour generator as the site.
 *
 * Run after changing hero copy: npm run og
 */
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { en } from "../src/content/en.ts";
import { fa } from "../src/content/fa.ts";
import { buildContours } from "../src/lib/contours.ts";
import { parseRich } from "../src/lib/rich.ts";

const WIDTH = 1200;
const HEIGHT = 630;
const MAP_WIDTH = 420;
const root = process.cwd();

async function fontFace(family: string, file: string, weight: string): Promise<string> {
  const data = await readFile(join(root, "node_modules", file), "base64");
  return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${data}) format("woff2");font-weight:${weight};}`;
}

function mapSvg(): string {
  const paths = buildContours({ width: MAP_WIDTH, height: HEIGHT, cell: 14, levels: 10, seed: 20 })
    .map(
      (c) =>
        `<path d="${c.d}" fill="none" stroke="${c.index ? "#6e5330" : "#8a6a3f"}" stroke-width="${c.index ? 1.6 : 0.9}" stroke-opacity="${c.index ? 0.8 : 0.55}"/>`,
    )
    .join("");
  return `<svg viewBox="0 0 ${MAP_WIDTH} ${HEIGHT}" width="${MAP_WIDTH}" height="${HEIGHT}">${paths}
    <path d="M60 560C130 470 190 430 250 360S330 210 360 120" fill="none" stroke="#b0186e" stroke-width="4" stroke-dasharray="10 9" stroke-linecap="round"/>
    <circle cx="360" cy="120" r="11" fill="#b0186e" stroke="#18233a" stroke-width="4"/></svg>`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Same [[term]] isolation as the site's <Rich> component. */
function richHtml(text: string): string {
  return parseRich(text)
    .map((s) => (s.isolate ? `<bdi dir="ltr" lang="en">${escapeHtml(s.text)}</bdi>` : escapeHtml(s.text)))
    .join("");
}

function card(locale: "fa" | "en", fonts: string): string {
  const { hero } = locale === "fa" ? fa : en;
  const isFa = locale === "fa";
  return `<!doctype html><html lang="${locale}" dir="${isFa ? "rtl" : "ltr"}"><head><meta charset="utf-8"><style>
    ${fonts}
    *{margin:0;box-sizing:border-box}
    body{width:${WIDTH}px;height:${HEIGHT}px;display:flex;background:#e8ece6;color:#18233a;
      font-family:${isFa ? '"Vazirmatn"' : '"Archivo"'},sans-serif}
    .text{flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 72px}
    .loc{font-size:26px;color:#6e5330}
    h1{font-size:${isFa ? 96 : 104}px;font-weight:800;line-height:${isFa ? 1.3 : 1.02};margin-top:14px;letter-spacing:${isFa ? 0 : "-0.02em"}}
    .role{font-size:38px;color:#1d6b86;margin-top:20px;font-weight:600}
    .map{width:${MAP_WIDTH}px;height:${HEIGHT}px;background:#f3f5f1;border-inline-start:3px solid #18233a}
    bdi{unicode-bidi:isolate}
  </style></head><body>
    <div class="text">
      <div class="loc">${escapeHtml(hero.location)}</div>
      <h1>${escapeHtml(hero.name)}</h1>
      <div class="role">${richHtml(hero.role)}</div>
    </div>
    <div class="map">${mapSvg()}</div>
  </body></html>`;
}

async function main(): Promise<void> {
  const fonts = (
    await Promise.all([
      fontFace("Vazirmatn", "vazirmatn/fonts/webfonts/Vazirmatn-Regular.woff2", "400"),
      fontFace("Vazirmatn", "vazirmatn/fonts/webfonts/Vazirmatn-SemiBold.woff2", "600"),
      fontFace("Vazirmatn", "vazirmatn/fonts/webfonts/Vazirmatn-ExtraBold.woff2", "800"),
      fontFace("Archivo", "@fontsource/archivo/files/archivo-latin-400-normal.woff2", "400"),
      fontFace("Archivo", "@fontsource/archivo/files/archivo-latin-600-normal.woff2", "600"),
      fontFace("Archivo", "@fontsource/archivo/files/archivo-latin-800-normal.woff2", "800"),
    ])
  ).join("");

  const outDir = join(root, "public", "og");
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
    for (const locale of ["fa", "en"] as const) {
      await page.setContent(card(locale, fonts), { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: join(outDir, `${locale}.png`) });
      process.stdout.write(`wrote public/og/${locale}.png\n`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`OG generation failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
