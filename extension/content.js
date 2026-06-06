/**
 * Moovas Asset Harvester — Content Script
 *
 * Runs in the context of the page being viewed. Extracts:
 *   - Fonts (computed font-family, @font-face from stylesheets)
 *   - Colors (computed CSS custom properties, background-color, color)
 *   - Images (img src, background-image URLs)
 *   - Code blocks (pre/code elements)
 *
 * This script has full access to the rendered DOM and computed styles,
 * unlike the server-side cheerio scraper which only sees raw HTML.
 *
 * Communication: responds to chrome.runtime messages from the popup.
 */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXTRACT_ASSETS") {
    const result = extractAssets();
    sendResponse(result);
  }
  return true; // keep channel open for async
});

function extractAssets() {
  const fonts = extractFonts();
  const colors = extractColors();
  const images = extractImages();
  const codeBlocks = extractCodeBlocks();

  return {
    url: window.location.href,
    title: document.title,
    fonts,
    colors,
    images,
    codeBlocks,
    extractedAt: new Date().toISOString(),
  };
}

// ── Fonts ─────────────────────────────────────────────────────────────────────

function extractFonts() {
  const fontFamilies = new Set();

  // 1. Computed font-family from all visible elements
  document.querySelectorAll("*").forEach((el) => {
    try {
      const computed = window.getComputedStyle(el);
      const ff = computed.fontFamily;
      if (ff) {
        ff.split(",").forEach((f) => {
          const clean = f.trim().replace(/['"]/g, "");
          if (clean && !isSystemFont(clean)) fontFamilies.add(clean);
        });
      }
    } catch {}
  });

  // 2. @font-face rules from stylesheets
  const fontFaceBlocks = [];
  try {
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules ?? []) {
          if (rule instanceof CSSFontFaceRule) {
            fontFamilies.add(rule.style.getPropertyValue("font-family").replace(/['"]/g, "").trim());
            fontFaceBlocks.push(rule.cssText);
          }
        }
      } catch {} // cross-origin stylesheets throw
    }
  } catch {}

  return Array.from(fontFamilies).map((name) => ({
    name,
    cssBlock: fontFaceBlocks.find((b) => b.includes(name)) ?? null,
  }));
}

function isSystemFont(name) {
  const systemFonts = [
    "serif", "sans-serif", "monospace", "cursive", "fantasy",
    "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI",
    "Roboto", "Helvetica Neue", "Arial", "Noto Sans", "Liberation Sans",
    "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji",
  ];
  return systemFonts.some((sf) => name.toLowerCase().includes(sf.toLowerCase()));
}

// ── Colors ────────────────────────────────────────────────────────────────────

function extractColors() {
  const colorSet = new Map(); // hex → rgba

  // CSS custom properties from :root
  try {
    const rootStyle = window.getComputedStyle(document.documentElement);
    for (const prop of rootStyle) {
      if (prop.startsWith("--")) {
        const val = rootStyle.getPropertyValue(prop).trim();
        const hex = parseToHex(val);
        if (hex) colorSet.set(hex, val);
      }
    }
  } catch {}

  // Computed background-color and color from prominent elements
  const selectors = ["body", "header", "nav", "main", "footer", "h1", "h2", "button", "a"];
  selectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      try {
        const cs = window.getComputedStyle(el);
        [cs.backgroundColor, cs.color, cs.borderColor].forEach((val) => {
          const hex = parseToHex(val);
          if (hex && hex !== "#000000" && hex !== "#ffffff") colorSet.set(hex, val);
        });
      } catch {}
    });
  });

  return Array.from(colorSet.entries())
    .slice(0, 40)
    .map(([hex, rgba]) => ({ hex, rgba }));
}

function parseToHex(val) {
  if (!val) return null;
  const m = val.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return null;
  const r = parseInt(m[1]), g = parseInt(m[2]), b = parseInt(m[3]);
  if (r === 0 && g === 0 && b === 0) return null;
  if (r === 255 && g === 255 && b === 255) return null;
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ── Images ────────────────────────────────────────────────────────────────────

function extractImages() {
  const images = [];
  const seen = new Set();

  document.querySelectorAll("img[src]").forEach((img) => {
    const src = img.src;
    if (src && !seen.has(src) && !src.startsWith("data:")) {
      seen.add(src);
      images.push({ src, alt: img.alt || null, width: img.naturalWidth, height: img.naturalHeight });
    }
  });

  // background-image URLs
  document.querySelectorAll("*").forEach((el) => {
    try {
      const bg = window.getComputedStyle(el).backgroundImage;
      const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
      if (m && m[1] && !seen.has(m[1]) && !m[1].startsWith("data:")) {
        seen.add(m[1]);
        images.push({ src: m[1], alt: null, width: null, height: null });
      }
    } catch {}
  });

  return images.slice(0, 30);
}

// ── Code blocks ───────────────────────────────────────────────────────────────

function extractCodeBlocks() {
  const blocks = [];
  document.querySelectorAll("pre, code").forEach((el) => {
    const content = el.textContent?.trim();
    if (content && content.length > 20) {
      blocks.push({ content: content.slice(0, 2000) });
    }
  });
  return blocks.slice(0, 10);
}
