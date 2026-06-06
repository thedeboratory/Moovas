import type { AssetType, TabName, AssetMeta } from "@shared/types";

export interface ClassifiedAsset {
  type: AssetType;
  suggestedTab: TabName;
  title: string;
  primaryPayload: string;
  fallbackPayload?: string;
  meta?: AssetMeta;
}

// ─── Color parsing ────────────────────────────────────────────────────────────

const HEX_RE = /^#([0-9a-fA-F]{3,8})$/;
const RGB_RE = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i;
const HSL_RE = /^hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*[\d.]+%(?:\s*,\s*[\d.]+)?\s*\)$/i;

export function parseColorValue(raw: string): {
  hex: string;
  rgba: string;
  cmyk: string;
} | null {
  const trimmed = raw.trim();

  let r = 0, g = 0, b = 0, a = 1;

  if (HEX_RE.test(trimmed)) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else if (hex.length === 8) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
      a = parseInt(hex.slice(6, 8), 16) / 255;
    } else {
      return null;
    }
  } else if (RGB_RE.test(trimmed)) {
    const m = trimmed.match(RGB_RE)!;
    r = parseInt(m[1]);
    g = parseInt(m[2]);
    b = parseInt(m[3]);
    a = m[4] !== undefined ? parseFloat(m[4]) : 1;
  } else {
    return null;
  }

  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  const rgba = `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;

  // CMYK conversion
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  const c = k === 1 ? 0 : (1 - rn - k) / (1 - k);
  const m2 = k === 1 ? 0 : (1 - gn - k) / (1 - k);
  const y = k === 1 ? 0 : (1 - bn - k) / (1 - k);
  const cmyk = `cmyk(${Math.round(c * 100)}%, ${Math.round(m2 * 100)}%, ${Math.round(y * 100)}%, ${Math.round(k * 100)}%)`;

  return { hex, rgba, cmyk };
}

// ─── URL detection ────────────────────────────────────────────────────────────

function isUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// ─── Code detection ───────────────────────────────────────────────────────────

function isCodeSnippet(s: string): boolean {
  const codePatterns = [
    /^<[a-zA-Z][\s\S]*>/m,          // HTML tags
    /^\s*(function|const|let|var|class|import|export)\s/m, // JS/TS
    /^\s*\.[a-zA-Z-]+\s*\{/m,       // CSS class
    /^\s*@[a-zA-Z]/m,               // CSS at-rule / decorator
    /<style[\s>]/i,
    /<script[\s>]/i,
    /\{[\s\S]*\}/m,                  // JSON-ish or CSS block
  ];
  return codePatterns.some((re) => re.test(s));
}

// ─── Font file detection ──────────────────────────────────────────────────────

const FONT_EXTS = [".ttf", ".otf", ".woff", ".woff2"];

function isFontFile(file?: File): boolean {
  if (!file) return false;
  return FONT_EXTS.some((ext) => file.name.toLowerCase().endsWith(ext));
}

// ─── Image/media detection ────────────────────────────────────────────────────

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"];
const VIDEO_EXTS = [".mp4", ".webm", ".mov", ".avi"];

function isMediaFile(file?: File): boolean {
  if (!file) return false;
  const name = file.name.toLowerCase();
  return [...IMAGE_EXTS, ...VIDEO_EXTS].some((ext) => name.endsWith(ext));
}

// ─── Main classifier ──────────────────────────────────────────────────────────

export function classifyAsset(raw: string, file?: File): ClassifiedAsset {
  const trimmed = raw.trim();

  // Font file
  if (isFontFile(file)) {
    const fontFamily = file!.name.replace(/\.[^.]+$/, "");
    return {
      type: "font_package",
      suggestedTab: "fonts",
      title: fontFamily,
      primaryPayload: raw, // base64 data URI
      meta: {
        fontFamily,
        mimeType: file!.type,
        fileSize: file!.size,
      },
    };
  }

  // Media file
  if (isMediaFile(file)) {
    return {
      type: "media_element",
      suggestedTab: "media",
      title: file!.name,
      primaryPayload: raw, // base64 data URI
      meta: {
        mimeType: file!.type,
        fileSize: file!.size,
      },
    };
  }

  // Color value
  const colorParsed = parseColorValue(trimmed);
  if (colorParsed) {
    return {
      type: "color",
      suggestedTab: "colors",
      title: colorParsed.hex,
      primaryPayload: colorParsed.hex,
      meta: {
        colorHex: colorParsed.hex,
        colorRgba: colorParsed.rgba,
        colorCmyk: colorParsed.cmyk,
      },
    };
  }

  // URL
  if (isUrl(trimmed)) {
    let hostname = "";
    try { hostname = new URL(trimmed).hostname; } catch {}
    return {
      type: "link_preview",
      suggestedTab: "bookmarks",
      title: hostname || trimmed,
      primaryPayload: trimmed,
      meta: { sourceUrl: trimmed },
    };
  }

  // HTML/JS/CSS code
  if (isCodeSnippet(trimmed)) {
    const firstLine = trimmed.split("\n")[0].slice(0, 60);
    return {
      type: "shadow_dom",
      suggestedTab: "code",
      title: firstLine,
      primaryPayload: trimmed,
    };
  }

  // Plain text / code snippet fallback
  const firstLine = trimmed.split("\n")[0].slice(0, 60);
  return {
    type: "plain_text",
    suggestedTab: "code",
    title: firstLine || "Text snippet",
    primaryPayload: trimmed,
  };
}
