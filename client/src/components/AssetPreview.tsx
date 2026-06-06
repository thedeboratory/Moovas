import { useRef, useEffect } from "react";
import ColorSwatch from "./ColorSwatch";
import type { UniversalAsset } from "@shared/types";

interface AssetPreviewProps {
  asset: UniversalAsset & { meta?: any };
  compact?: boolean;
}

export default function AssetPreview({ asset, compact = false }: AssetPreviewProps) {
  const { type, primaryPayload, meta, storageUrl } = asset;

  // ── Color ────────────────────────────────────────────────────────────────────
  if (type === "color") {
    return (
      <ColorSwatch
        hex={meta?.colorHex ?? primaryPayload ?? "#000000"}
        rgba={compact ? undefined : meta?.colorRgba}
        cmyk={compact ? undefined : meta?.colorCmyk}
        size={compact ? "sm" : "md"}
      />
    );
  }

  // ── Font ─────────────────────────────────────────────────────────────────────
  if (type === "font_package") {
    return (
      <FontPreview
        fontFamily={meta?.fontFamily ?? "Unknown Font"}
        dataUri={primaryPayload}
        compact={compact}
      />
    );
  }

  // ── Link preview (iframe) ────────────────────────────────────────────────────
  if (type === "link_preview") {
    const url = primaryPayload ?? meta?.sourceUrl ?? "";
    return (
      <div className={`relative overflow-hidden bg-black/5 ${compact ? "h-24" : "h-40"}`}>
        <iframe
          src={url}
          sandbox="allow-scripts allow-same-origin"
          className="absolute inset-0 w-full h-full border-0 pointer-events-none"
          style={{ transform: "scale(0.5)", transformOrigin: "top left", width: "200%", height: "200%" }}
          title={asset.title ?? url}
          loading="lazy"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/80 to-transparent h-8 pointer-events-none" />
      </div>
    );
  }

  // ── Shadow DOM / HTML code ────────────────────────────────────────────────────
  if (type === "shadow_dom") {
    return (
      <ShadowDomPreview
        code={primaryPayload ?? ""}
        compact={compact}
      />
    );
  }

  // ── Media ────────────────────────────────────────────────────────────────────
  if (type === "media_element") {
    const src = storageUrl ?? primaryPayload ?? "";
    const isVideo = meta?.mimeType?.startsWith("video/");
    return (
      <div className={`overflow-hidden bg-black/5 ${compact ? "h-24" : "h-40"} flex items-center justify-center`}>
        {isVideo ? (
          <video src={src} className="max-w-full max-h-full object-contain" muted />
        ) : (
          <img src={src} alt={asset.title ?? ""} className="max-w-full max-h-full object-contain" />
        )}
      </div>
    );
  }

  // ── Plain text / raw binary ───────────────────────────────────────────────────
  return (
    <div className={`bg-black/[0.03] p-3 overflow-hidden ${compact ? "h-16" : "h-32"}`}>
      <pre className="font-mono text-[10px] text-black/60 whitespace-pre-wrap break-all leading-relaxed">
        {(primaryPayload ?? "").slice(0, compact ? 80 : 300)}
      </pre>
    </div>
  );
}

// ── Font preview ──────────────────────────────────────────────────────────────

function FontPreview({ fontFamily, dataUri, compact }: { fontFamily: string; dataUri?: string; compact: boolean }) {
  const styleId = `font-${fontFamily.replace(/\s+/g, "-").toLowerCase()}`;

  useEffect(() => {
    if (!dataUri || document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `@font-face { font-family: "${fontFamily}"; src: url("${dataUri}"); }`;
    document.head.appendChild(style);
    return () => { document.getElementById(styleId)?.remove(); };
  }, [dataUri, fontFamily, styleId]);

  return (
    <div className={`flex items-center justify-center bg-black/[0.02] border-b-2 border-black ${compact ? "h-16" : "h-28"} px-4`}>
      <div
        style={{ fontFamily: `"${fontFamily}", serif` }}
        className={`text-black text-center ${compact ? "text-2xl" : "text-4xl"} leading-none`}
      >
        Aa Bb Cc
      </div>
    </div>
  );
}

// ── Shadow DOM preview ────────────────────────────────────────────────────────

function ShadowDomPreview({ code, compact }: { code: string; compact: boolean }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><style>
      body { margin: 0; padding: 8px; font-family: system-ui, sans-serif; font-size: 12px; overflow: hidden; }
    </style></head><body>${code}</body></html>`);
    doc.close();
  }, [code]);

  return (
    <div className={`overflow-hidden ${compact ? "h-16" : "h-36"}`}>
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        className="w-full h-full border-0"
        title="Code preview"
      />
    </div>
  );
}
