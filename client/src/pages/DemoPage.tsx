/**
 * DemoPage — Public, no-login sandbox demo
 * Used by the moovas.design deck site iframe at /demo.
 * Assets are stored in IndexedDB (localStorage-backed) only — no server sync.
 * Sets a session key so the deck site can detect when it's cleared.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Rect, Textbox, Group, Shadow, Point } from "fabric";
import { saveAssetLocally } from "@/lib/db";
import { classifyAsset } from "@/lib/assetClassifier";
import type { TabName, AssetType } from "@shared/types";
import { toast } from "sonner";

const DEMO_SESSION_KEY = "moovas-sandbox-session";

// Accent color
const ACCENT = "#3D5AFE";

// ── Minimal inline ingestion panel (no tRPC — demo only) ──────────────────────
function DemoIngestionPanel({
  onClose,
  onAssetAdded,
}: {
  onClose: () => void;
  onAssetAdded: (tab: TabName, title: string) => void;
}) {
  const [value, setValue] = useState("");
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processRaw = useCallback(
    async (raw: string, file?: File) => {
      if (!raw.trim() && !file) return;
      setProcessing(true);
      try {
        const classified = classifyAsset(raw, file);
        const tab: TabName = classified.suggestedTab as TabName;
        await saveAssetLocally({
          tab,
          type: classified.type as AssetType,
          title: classified.title,
          primaryPayload: classified.primaryPayload,
          fallbackPayload: classified.fallbackPayload,
          meta: classified.meta,
          canvasX: Math.round(80 + Math.random() * 500),
          canvasY: Math.round(80 + Math.random() * 300),
          canvasWidth: 240,
          canvasHeight: 130,
        });
        toast.success(`Added to ${tab}`);
        onAssetAdded(tab, classified.title);
        onClose();
      } catch (e) {
        toast.error("Could not add asset");
      } finally {
        setProcessing(false);
      }
    },
    [onAssetAdded, onClose]
  );

  const handleFile = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => processRaw(ev.target?.result as string ?? "", f);
      if (f.type.startsWith("text/") || /\.(html|css|js|ts|json|md|txt|svg)$/i.test(f.name)) {
        reader.readAsText(f);
      } else {
        reader.readAsDataURL(f);
      }
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#fff",
          border: "2px solid #000",
          padding: "32px",
          width: "100%",
          maxWidth: "480px",
          boxShadow: "8px 8px 0 #000",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", marginBottom: "4px" }}>Add Asset</div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 900, fontSize: "22px", letterSpacing: "-0.02em" }}>DROP ANYTHING.</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", lineHeight: 1 }}>×</button>
        </div>

        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste a URL, color (#hex / rgb()), code snippet, or any text…"
          style={{
            width: "100%",
            border: "2px solid #000",
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: "12px",
            padding: "12px",
            resize: "vertical",
            minHeight: "80px",
            outline: "none",
            marginBottom: "12px",
          }}
        />

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => processRaw(value)}
            disabled={processing || !value.trim()}
            style={{
              background: ACCENT,
              color: "#fff",
              border: "none",
              fontFamily: "'IBM Plex Mono',monospace",
              fontWeight: 700,
              fontSize: "10px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              padding: "12px 20px",
              cursor: "pointer",
              boxShadow: "3px 3px 0 rgba(61,90,254,0.4)",
              opacity: processing || !value.trim() ? 0.5 : 1,
            }}
          >
            {processing ? "Adding…" : "Add Asset"}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              background: "transparent",
              color: "#000",
              border: "2px solid #000",
              fontFamily: "'IBM Plex Mono',monospace",
              fontWeight: 700,
              fontSize: "10px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              padding: "12px 20px",
              cursor: "pointer",
              boxShadow: "3px 3px 0 #000",
            }}
          >
            Choose File
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".ttf,.otf,.woff,.woff2,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp4,.webm,.html,.css,.js,.ts,.json,.md,.txt"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files)}
          />
        </div>

        <div style={{ marginTop: "16px", fontFamily: "'IBM Plex Mono',monospace", fontSize: "9px", color: "rgba(0,0,0,0.35)", letterSpacing: "0.1em" }}>
          Demo mode · Assets saved locally · No account required
        </div>
      </div>
    </div>
  );
}

// ── Main Demo Canvas ──────────────────────────────────────────────────────────
export default function DemoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [assetCount, setAssetCount] = useState(0);

  // Mark session active
  useEffect(() => {
    localStorage.setItem(DEMO_SESSION_KEY, "1");
  }, []);

  // Init Fabric canvas
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const canvas = new FabricCanvas(el, {
      backgroundColor: "#fafafa",
      selection: true,
    });

    const resize = () => {
      canvas.setDimensions({ width: window.innerWidth, height: window.innerHeight - 33 });
      canvas.renderAll();
    };
    resize();
    window.addEventListener("resize", resize);
    fabricRef.current = canvas;

    // Pan with space+drag
    let isPanning = false;
    let lastPos = { x: 0, y: 0 };
    let spaceDown = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        spaceDown = true;
        canvas.defaultCursor = "grab";
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceDown = false;
        canvas.defaultCursor = "default";
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    canvas.on("mouse:down", (opt: any) => {
      if (spaceDown) {
        isPanning = true;
        canvas.defaultCursor = "grabbing";
        const e = opt.e as MouseEvent;
        lastPos = { x: e.clientX, y: e.clientY };
      }
    });
    canvas.on("mouse:move", (opt: any) => {
      if (!isPanning) return;
      const e = opt.e as MouseEvent;
      const vpt = canvas.viewportTransform!;
      vpt[4] += e.clientX - lastPos.x;
      vpt[5] += e.clientY - lastPos.y;
      canvas.requestRenderAll();
      lastPos = { x: e.clientX, y: e.clientY };
    });
    canvas.on("mouse:up", (_opt: any) => {
      isPanning = false;
      canvas.defaultCursor = spaceDown ? "grab" : "default";
    });

    // Zoom
    canvas.on("mouse:wheel", (opt: any) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      zoom = Math.min(Math.max(zoom, 0.1), 10);
      canvas.zoomToPoint(
        new Point(opt.e.offsetX, opt.e.offsetY),
        zoom
      );
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Welcome watermark
    const wText = new Textbox("DROP ANYTHING HERE", {
      left: window.innerWidth / 2 - 220,
      top: (window.innerHeight - 33) / 2 - 40,
      width: 440,
      fontSize: 32,
      fontFamily: "Space Grotesk",
      fontWeight: "900",
      fill: "#000",
      textAlign: "center",
      selectable: false,
      evented: false,
      opacity: 0.06,
    });
    const wSub = new Textbox("URLs · Code · Colors · Fonts · Images", {
      left: window.innerWidth / 2 - 220,
      top: (window.innerHeight - 33) / 2 + 10,
      width: 440,
      fontSize: 12,
      fontFamily: "IBM Plex Mono",
      fill: "#000",
      textAlign: "center",
      selectable: false,
      evented: false,
      opacity: 0.06,
    });
    canvas.add(wText, wSub);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.dispose();
    };
  }, []);

  const handleAssetAdded = useCallback((tab: TabName, title: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const count = assetCount;
    const x = 60 + (count % 5) * 210;
    const y = 60 + Math.floor(count / 5) * 150;

    const tabColors: Record<TabName, string> = {
      canvas: "#3D5AFE",
      fonts: "#8B5CF6",
      colors: "#EC4899",
      code: "#10B981",
      media: "#F59E0B",
      bookmarks: "#6B7280",
    };

    const rect = new Rect({
      left: 0,
      top: 0,
      width: 190,
      height: 120,
      fill: "#ffffff",
      stroke: "#000",
      strokeWidth: 2,
    });
    const accent = new Rect({
      left: 0,
      top: 0,
      width: 4,
      height: 120,
      fill: tabColors[tab] ?? ACCENT,
    });
    const labelText = new Textbox(title.slice(0, 28), {
      left: 14,
      top: 12,
      width: 168,
      fontSize: 11,
      fontFamily: "IBM Plex Mono",
      fontWeight: "700",
      fill: "#000",
    });
    const tabText = new Textbox(tab.toUpperCase(), {
      left: 14,
      top: 96,
      width: 168,
      fontSize: 8,
      fontFamily: "IBM Plex Mono",
      fill: "rgba(0,0,0,0.35)",
      charSpacing: 150,
    });

    const group = new Group([rect, accent, labelText, tabText], {
      left: x,
      top: y,
    });

    canvas.add(group);
    canvas.renderAll();
    setAssetCount((c) => c + 1);
  }, [assetCount]);

  // Global drag-over to open panel
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setShowPanel(true);
  }, []);

  return (
    <div
      style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#fafafa" }}
      onDragOver={handleDragOver}
    >
      {/* Demo banner */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        background: "#000",
        color: "#fff",
        fontFamily: "'IBM Plex Mono',monospace",
        fontSize: "10px",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "33px",
      }}>
        <span>Moovas — Live Demo · No account required</span>
        <span style={{ opacity: 0.5 }}>{assetCount} asset{assetCount !== 1 ? "s" : ""}</span>
      </div>

      <canvas ref={canvasRef} style={{ display: "block", marginTop: "33px" }} />

      {/* Add asset FAB */}
      <button
        onClick={() => setShowPanel(true)}
        aria-label="Add asset"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 20,
          background: ACCENT,
          color: "#fff",
          border: "none",
          fontFamily: "'IBM Plex Mono',monospace",
          fontWeight: 700,
          fontSize: "11px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          padding: "14px 24px",
          cursor: "pointer",
          boxShadow: "4px 4px 0 rgba(61,90,254,0.4)",
          transition: "transform 0.12s cubic-bezier(0.23,1,0.32,1), box-shadow 0.12s",
        }}
        onMouseEnter={e => { const t = e.currentTarget; t.style.transform = "translate(-2px,-2px)"; t.style.boxShadow = "6px 6px 0 rgba(61,90,254,0.4)"; }}
        onMouseLeave={e => { const t = e.currentTarget; t.style.transform = ""; t.style.boxShadow = "4px 4px 0 rgba(61,90,254,0.4)"; }}
        onMouseDown={e => { const t = e.currentTarget; t.style.transform = "translate(2px,2px)"; t.style.boxShadow = "2px 2px 0 rgba(61,90,254,0.4)"; }}
        onMouseUp={e => { const t = e.currentTarget; t.style.transform = ""; t.style.boxShadow = "4px 4px 0 rgba(61,90,254,0.4)"; }}
      >
        + Add Asset
      </button>

      {showPanel && (
        <DemoIngestionPanel
          onClose={() => setShowPanel(false)}
          onAssetAdded={handleAssetAdded}
        />
      )}
    </div>
  );
}
