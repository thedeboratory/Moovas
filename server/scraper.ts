import * as cheerio from "cheerio";

export interface ScrapedAssets {
  fonts: Array<{ name: string; url?: string; cssBlock?: string }>;
  colors: Array<{ hex: string; rgba?: string; source: string }>;
  images: Array<{ src: string; alt?: string }>;
  codeBlocks: Array<{ content: string; language: string }>;
  meta: {
    title?: string;
    description?: string;
    ogImage?: string;
    themeColor?: string;
  };
  isPartial: boolean;
  warning?: string;
}

const HEX_RE = /#([0-9a-fA-F]{3,8})\b/g;
const RGB_RE = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)/g;

function hexToRgba(hex: string): string {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 1)`;
}

function extractColorsFromCss(css: string): Array<{ hex: string; rgba: string; source: string }> {
  const found = new Map<string, string>();

  const hexMatches = Array.from(css.matchAll(HEX_RE));
  for (const m of hexMatches) {
    let hex = m[0];
    let h = hex.slice(1);
    if (h.length === 3) h = h.split("").map((c: string) => c + c).join("");
    if (h.length === 6) {
      const normalized = `#${h.toLowerCase()}`;
      if (!found.has(normalized)) {
        found.set(normalized, hexToRgba(normalized));
      }
    }
  }

  return Array.from(found.entries()).map(([hex, rgba]) => ({
    hex,
    rgba,
    source: "css",
  }));
}

function extractFontsFromCss(css: string): Array<{ name: string; cssBlock: string }> {
  const fonts: Array<{ name: string; cssBlock: string }> = [];
  const fontFaceRe = /@font-face\s*\{([^}]+)\}/gi;
  const familyRe = /font-family\s*:\s*['"]?([^;'"]+)['"]?/i;

  let match;
  while ((match = fontFaceRe.exec(css)) !== null) {
    const block = match[0];
    const familyMatch = familyRe.exec(block);
    const name = familyMatch ? familyMatch[1].trim() : "Unknown Font";
    fonts.push({ name, cssBlock: block });
  }

  // Also extract Google Fonts links
  return fonts;
}

export async function scrapeUrl(url: string): Promise<ScrapedAssets> {
  const result: ScrapedAssets = {
    fonts: [],
    colors: [],
    images: [],
    codeBlocks: [],
    meta: {},
    isPartial: false,
  };

  let html: string;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Moovas/1.0; +https://moovas.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    html = await response.text();
  } catch (err: any) {
    throw new Error(`Failed to fetch URL: ${err.message}`);
  }

  const $ = cheerio.load(html);

  // ── Meta ──────────────────────────────────────────────────────────────────
  result.meta.title = $("title").first().text().trim() || $('meta[property="og:title"]').attr("content");
  result.meta.description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content");
  result.meta.ogImage = $('meta[property="og:image"]').attr("content");
  result.meta.themeColor = $('meta[name="theme-color"]').attr("content");

  // ── Images ────────────────────────────────────────────────────────────────
  $("img").each((_, el) => {
    const src = $(el).attr("src");
    if (!src || src.startsWith("data:")) return;
    const absoluteSrc = src.startsWith("http") ? src : new URL(src, url).href;
    result.images.push({ src: absoluteSrc, alt: $(el).attr("alt") });
  });

  // Limit images
  result.images = result.images.slice(0, 30);

  // ── Google Fonts ──────────────────────────────────────────────────────────
  $('link[href*="fonts.googleapis.com"]').each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const familyMatch = href.match(/family=([^&:]+)/);
    if (familyMatch) {
      const name = decodeURIComponent(familyMatch[1]).replace(/\+/g, " ");
      result.fonts.push({ name, url: href });
    }
  });

  // ── Inline styles for colors ──────────────────────────────────────────────
  const inlineCss: string[] = [];
  $("style").each((_, el) => {
    inlineCss.push($(el).html() ?? "");
  });

  const allCss = inlineCss.join("\n");
  const cssColors = extractColorsFromCss(allCss);
  result.colors.push(...cssColors.slice(0, 40));

  // Theme color from meta
  if (result.meta.themeColor) {
    const tc = result.meta.themeColor;
    if (tc.startsWith("#")) {
      result.colors.unshift({ hex: tc, rgba: hexToRgba(tc), source: "theme-color" });
    }
  }

  // ── Font-face from inline CSS ─────────────────────────────────────────────
  const cssFonts = extractFontsFromCss(allCss);
  result.fonts.push(...cssFonts);

  // ── Code blocks ───────────────────────────────────────────────────────────
  $("pre, code").each((_, el) => {
    const content = $(el).text().trim();
    if (content.length > 20) {
      result.codeBlocks.push({ content: content.slice(0, 2000), language: "text" });
    }
  });
  result.codeBlocks = result.codeBlocks.slice(0, 10);

  // ── Partial result warning ────────────────────────────────────────────────
  // If no colors/fonts found from inline CSS, the site is likely JS-rendered
  if (result.colors.length === 0 && result.fonts.length === 0 && result.images.length < 3) {
    result.isPartial = true;
    result.warning =
      "This site appears to be JavaScript-rendered. Results may be incomplete. The live iframe preview shows the full page.";
  }

  return result;
}
