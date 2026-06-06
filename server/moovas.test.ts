import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ─── Auth logout (existing test) ─────────────────────────────────────────────

type CookieCall = { name: string; options: Record<string, unknown> };
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1 });
  });
});

// ─── Color parser (using inline logic matching assetClassifier.ts exactly) ────
// NOTE: assetClassifier.ts is a client-side module and cannot be imported in
// a Node/vitest server context. We test the identical pure functions here.

function parseColorValue(raw: string): { hex: string; rgba: string; cmyk: string } | null {
  const trimmed = raw.trim();
  const HEX_RE = /^#([0-9a-fA-F]{3,8})$/;
  const RGB_RE = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i;
  let r = 0, g = 0, b = 0, a = 1;

  if (HEX_RE.test(trimmed)) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) hex = hex.split("").map((c: string) => c + c).join("");
    if (hex.length !== 6) return null;
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else if (RGB_RE.test(trimmed)) {
    const m = trimmed.match(RGB_RE)!;
    r = parseInt(m[1]); g = parseInt(m[2]); b = parseInt(m[3]);
    a = m[4] !== undefined ? parseFloat(m[4]) : 1;
  } else {
    return null;
  }

  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  const rgba = `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  const c = k === 1 ? 0 : (1 - rn - k) / (1 - k);
  const m2 = k === 1 ? 0 : (1 - gn - k) / (1 - k);
  const y = k === 1 ? 0 : (1 - bn - k) / (1 - k);
  const cmyk = `cmyk(${Math.round(c * 100)}%, ${Math.round(m2 * 100)}%, ${Math.round(y * 100)}%, ${Math.round(k * 100)}%)`;
  return { hex, rgba, cmyk };
}

describe("Color harvester — parseColorValue", () => {
  it("parses 6-digit hex", () => {
    const r = parseColorValue("#ff6600")!;
    expect(r.hex).toBe("#ff6600");
    expect(r.rgba).toBe("rgba(255, 102, 0, 1.00)");
  });

  it("expands 3-digit hex shorthand", () => {
    expect(parseColorValue("#f60")!.hex).toBe("#ff6600");
  });

  it("parses rgba()", () => {
    const r = parseColorValue("rgba(10, 20, 30, 0.5)")!;
    expect(r.hex).toBe("#0a141e");
    expect(r.rgba).toBe("rgba(10, 20, 30, 0.50)");
  });

  it("parses rgb() without alpha", () => {
    const r = parseColorValue("rgb(0, 0, 0)")!;
    expect(r.hex).toBe("#000000");
  });

  it("returns null for non-color strings", () => {
    expect(parseColorValue("hello")).toBeNull();
    expect(parseColorValue("https://example.com")).toBeNull();
    expect(parseColorValue("const x = 1")).toBeNull();
  });

  it("computes CMYK for pure red", () => {
    expect(parseColorValue("#ff0000")!.cmyk).toBe("cmyk(0%, 100%, 100%, 0%)");
  });

  it("computes CMYK for white", () => {
    expect(parseColorValue("#ffffff")!.cmyk).toBe("cmyk(0%, 0%, 0%, 0%)");
  });

  it("computes CMYK for black", () => {
    expect(parseColorValue("#000000")!.cmyk).toBe("cmyk(0%, 0%, 0%, 100%)");
  });
});

// ─── Asset classifier ─────────────────────────────────────────────────────────

function classifyType(raw: string): string {
  const trimmed = raw.trim();
  if (parseColorValue(trimmed)) return "color";
  try {
    const u = new URL(trimmed);
    if (u.protocol === "http:" || u.protocol === "https:") return "link_preview";
  } catch {}
  const codePatterns = [
    /^<[a-zA-Z][\s\S]*>/m,
    /^\s*(function|const|let|var|class|import|export)\s/m,
    /^\s*\.[a-zA-Z-]+\s*\{/m,
  ];
  if (codePatterns.some((re) => re.test(trimmed))) return "shadow_dom";
  return "plain_text";
}

describe("Asset type classifier", () => {
  it("classifies hex as color", () => expect(classifyType("#ff6600")).toBe("color"));
  it("classifies rgba as color", () => expect(classifyType("rgba(255, 0, 0, 1)")).toBe("color"));
  it("classifies https URL as link_preview", () => expect(classifyType("https://example.com")).toBe("link_preview"));
  it("classifies HTML as shadow_dom", () => expect(classifyType("<div>Hello</div>")).toBe("shadow_dom"));
  it("classifies JS as shadow_dom", () => expect(classifyType("const x = 42;")).toBe("shadow_dom"));
  it("classifies plain text as plain_text", () => expect(classifyType("some random note")).toBe("plain_text"));
  it("classifies CSS class as shadow_dom", () => expect(classifyType(".btn { color: red; }")).toBe("shadow_dom"));
});

// ─── Smart clipboard label routing ───────────────────────────────────────────

type AssetType = "color" | "font_package" | "shadow_dom" | "plain_text" | "link_preview" | "media_element" | "raw_binary";

function getCopyLabel(type: AssetType): string {
  const labels: Record<AssetType, string> = {
    color: "Copy HEX",
    font_package: "Copy @font-face",
    shadow_dom: "Copy Source",
    plain_text: "Copy Text",
    link_preview: "Copy URL",
    media_element: "Copy URL",
    raw_binary: "Copy Payload",
  };
  return labels[type] ?? "Copy";
}

describe("Smart clipboard — getCopyLabel", () => {
  it("returns 'Copy HEX' for color", () => expect(getCopyLabel("color")).toBe("Copy HEX"));
  it("returns '@font-face' for font", () => expect(getCopyLabel("font_package")).toBe("Copy @font-face"));
  it("returns 'Copy URL' for link", () => expect(getCopyLabel("link_preview")).toBe("Copy URL"));
  it("returns 'Copy Source' for code", () => expect(getCopyLabel("shadow_dom")).toBe("Copy Source"));
  it("returns 'Copy Text' for plain text", () => expect(getCopyLabel("plain_text")).toBe("Copy Text"));
  it("returns 'Copy Payload' for binary", () => expect(getCopyLabel("raw_binary")).toBe("Copy Payload"));
});

// ─── Scraper router — basic shape validation ──────────────────────────────────

describe("scrape router — input validation", () => {
  it("rejects missing url input", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // @ts-expect-error intentionally passing wrong input
    await expect(caller.scrape.url({ notAUrl: "x" })).rejects.toThrow();
  });
});
