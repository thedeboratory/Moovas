import { useState } from "react";
import { X, Download, Code2, Image, Loader2 } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import type { Canvas } from "fabric";

interface ExportPanelProps {
  onClose: () => void;
  fabricCanvas?: Canvas | null;
}

export default function ExportPanel({ onClose, fabricCanvas }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const allAssetsQuery = trpc.assets.list.useQuery(
    { tab: "canvas" },
    { enabled: isAuthenticated }
  );

  // ── ZIP Export ─────────────────────────────────────────────────────────────
  const handleZipExport = async () => {
    setIsExporting("zip");
    try {
      const zip = new JSZip();
      const assets = allAssetsQuery.data ?? [];

      // Group by type
      const byType: Record<string, typeof assets> = {};
      for (const a of assets) {
        const key = a.type ?? "misc";
        if (!byType[key]) byType[key] = [];
        byType[key].push(a);
      }

      // Add a manifest
      zip.file(
        "manifest.json",
        JSON.stringify(
          assets.map((a) => ({
            id: a.id,
            title: a.title,
            type: a.type,
            tab: a.tab,
            payload: a.primaryPayload?.slice(0, 200),
          })),
          null,
          2
        )
      );

      // Add colors as CSS variables
      const colorAssets = assets.filter((a) => a.type === "color");
      if (colorAssets.length > 0) {
        const cssVars = colorAssets
          .map((a, i) => {
            const name = (a.title ?? `color-${i}`)
              .replace(/[^a-zA-Z0-9-]/g, "-")
              .toLowerCase();
            return `  --${name}: ${a.primaryPayload ?? "#000000"};`;
          })
          .join("\n");
        zip.file("colors/variables.css", `:root {\n${cssVars}\n}\n`);
      }

      // Add code snippets
      const codeAssets = assets.filter(
        (a) => a.type === "shadow_dom" || a.type === "plain_text"
      );
      codeAssets.forEach((a, i) => {
        const name = `snippet-${i + 1}.html`;
        zip.file(`code/${name}`, a.primaryPayload ?? "");
      });

      // Add font @font-face blocks
      const fontAssets = assets.filter((a) => a.type === "font_package");
      if (fontAssets.length > 0) {
        const fontCss = fontAssets
          .map((a) => a.primaryPayload ?? "")
          .join("\n\n");
        zip.file("fonts/fonts.css", fontCss);
      }

      // Add bookmarks as HTML
      const linkAssets = assets.filter((a) => a.type === "link_preview");
      if (linkAssets.length > 0) {
        const html = `<!DOCTYPE html>\n<html><head><title>Moovas Bookmarks</title></head><body>\n<ul>\n${linkAssets
          .map((a) => `  <li><a href="${a.primaryPayload}">${a.title ?? a.primaryPayload}</a></li>`)
          .join("\n")}\n</ul>\n</body></html>`;
        zip.file("bookmarks/bookmarks.html", html);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `moovas-export-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("ZIP exported successfully");
    } catch (err) {
      toast.error("ZIP export failed");
    } finally {
      setIsExporting(null);
    }
  };

  // ── Embed Code ─────────────────────────────────────────────────────────────
  const handleEmbedCopy = async () => {
    setIsExporting("embed");
    try {
      const assets = allAssetsQuery.data ?? [];
      const colors = assets.filter((a) => a.type === "color");
      const fonts = assets.filter((a) => a.type === "font_package");
      const links = assets.filter((a) => a.type === "link_preview");

      let embed = "<!-- Moovas Export -->\n";

      if (colors.length > 0) {
        embed += `\n<style>\n:root {\n${colors
          .map((a, i) => {
            const name = (a.title ?? `color-${i}`)
              .replace(/[^a-zA-Z0-9-]/g, "-")
              .toLowerCase();
            return `  --${name}: ${a.primaryPayload ?? "#000"};`;
          })
          .join("\n")}\n}\n</style>\n`;
      }

      if (fonts.length > 0) {
        embed += `\n<style>\n${fonts.map((a) => a.primaryPayload ?? "").join("\n\n")}\n</style>\n`;
      }

      if (links.length > 0) {
        embed += `\n<!-- Bookmarks -->\n<ul>\n${links
          .map((a) => `  <li><a href="${a.primaryPayload}">${a.title}</a></li>`)
          .join("\n")}\n</ul>\n`;
      }

      await navigator.clipboard.writeText(embed);
      toast.success("Embed code copied to clipboard");
    } catch {
      toast.error("Failed to copy embed code");
    } finally {
      setIsExporting(null);
    }
  };

  // ── Canvas PNG Export ──────────────────────────────────────────────────────
  const handleCanvasPng = () => {
    if (!fabricCanvas) {
      toast.error("Canvas not available");
      return;
    }
    setIsExporting("png");
    try {
      const dataUrl = fabricCanvas.toDataURL({
        format: "png",
        quality: 1,
        multiplier: 2,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `moovas-canvas-${Date.now()}.png`;
      a.click();
      toast.success("Canvas exported as PNG");
    } catch {
      toast.error("PNG export failed");
    } finally {
      setIsExporting(null);
    }
  };

  // ── Canvas SVG Export ──────────────────────────────────────────────────────
  const handleCanvasSvg = () => {
    if (!fabricCanvas) {
      toast.error("Canvas not available");
      return;
    }
    setIsExporting("svg");
    try {
      const svg = fabricCanvas.toSVG();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `moovas-canvas-${Date.now()}.svg`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Canvas exported as SVG");
    } catch {
      toast.error("SVG export failed");
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[380px] bg-white border-l-2 border-black z-50 flex flex-col shadow-[-8px_0_0_rgba(0,0,0,0.05)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black flex-shrink-0">
        <div>
          <div className="font-mono text-[10px] text-black/40 uppercase tracking-widest">
            Output
          </div>
          <div className="font-display text-xl text-black tracking-tighter leading-none">
            EXPORT
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-black hover:text-white transition-colors press-feedback border-2 border-black"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* ZIP */}
        <ExportOption
          icon={<Download size={18} strokeWidth={2} />}
          title="ZIP Archive"
          description="Download all assets as a structured ZIP with CSS variables, font files, code snippets, and bookmarks."
          action="[ Download ZIP ]"
          loading={isExporting === "zip"}
          onClick={handleZipExport}
        />

        {/* Embed Code */}
        <ExportOption
          icon={<Code2 size={18} strokeWidth={2} />}
          title="Embed Code"
          description="Copy a ready-to-paste HTML/CSS block containing all colors as CSS variables, @font-face rules, and bookmark links."
          action="[ Copy Embed Code ]"
          loading={isExporting === "embed"}
          onClick={handleEmbedCopy}
        />

        {/* PNG */}
        <ExportOption
          icon={<Image size={18} strokeWidth={2} />}
          title="Canvas → PNG"
          description="Export the current canvas view as a high-resolution PNG image (2x pixel density)."
          action="[ Export PNG ]"
          loading={isExporting === "png"}
          onClick={handleCanvasPng}
          disabled={!fabricCanvas}
        />

        {/* SVG */}
        <ExportOption
          icon={<Image size={18} strokeWidth={2} />}
          title="Canvas → SVG"
          description="Export the canvas as a scalable SVG vector file. Ideal for design handoff."
          action="[ Export SVG ]"
          loading={isExporting === "svg"}
          onClick={handleCanvasSvg}
          disabled={!fabricCanvas}
        />
      </div>
    </div>
  );
}

function ExportOption({
  icon,
  title,
  description,
  action,
  loading,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  loading: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="border-2 border-black p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="text-black/60 mt-0.5">{icon}</div>
        <div>
          <div className="font-mono font-bold text-sm text-black">{title}</div>
          <p className="font-mono text-[10px] text-black/50 leading-relaxed mt-1">
            {description}
          </p>
        </div>
      </div>
      <button
        onClick={onClick}
        disabled={loading || disabled}
        className="w-full flex items-center justify-center gap-2 bg-black text-white font-mono font-bold text-xs uppercase tracking-widest py-2.5 press-feedback disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/80 transition-colors"
      >
        {loading ? (
          <><Loader2 size={12} className="animate-spin" /> Processing...</>
        ) : (
          action
        )}
      </button>
    </div>
  );
}
