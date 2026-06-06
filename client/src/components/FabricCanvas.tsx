import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, FabricObject, Rect, FabricText, Group, Shadow, Point } from "fabric";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ZoomIn, ZoomOut, Maximize2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { UniversalAsset } from "@shared/types";
import IngestionOverlay from "./IngestionOverlay";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.1;

interface FabricCanvasProps {
  onCanvasReady?: (canvas: Canvas) => void;
  onRequestIngestion?: () => void;
}

export default function FabricCanvas({ onCanvasReady, onRequestIngestion }: FabricCanvasProps = {}) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const spaceHeldRef = useRef(false);

  const [zoom, setZoom] = useState(1);
  const [showIngestion, setShowIngestion] = useState(false);
  const { isAuthenticated } = useAuth();

  const assetsQuery = trpc.assets.list.useQuery(
    { tab: "canvas" },
    { enabled: isAuthenticated }
  );

  // ── Initialize Fabric ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasElRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const { width, height } = container.getBoundingClientRect();

    const canvas = new Canvas(canvasElRef.current, {
      width,
      height,
      backgroundColor: "#fafafa",
      selection: true,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;
    onCanvasReady?.(canvas);

    // Draw grid
    drawGrid(canvas, width, height);

    // ── Zoom via scroll wheel ────────────────────────────────────────────────
    canvas.on("mouse:wheel", (opt) => {
      const delta = opt.e.deltaY;
      let newZoom = canvas.getZoom() * (delta > 0 ? 0.95 : 1.05);
      newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
      canvas.zoomToPoint(new Point(opt.e.offsetX, opt.e.offsetY), newZoom);
      setZoom(newZoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // ── Pan via space+drag or middle mouse ───────────────────────────────────
    canvas.on("mouse:down", (opt) => {
      const e = opt.e as MouseEvent;
      if (spaceHeldRef.current || e.button === 1) {
        isPanningRef.current = true;
        lastPosRef.current = { x: e.clientX, y: e.clientY };
        canvas.setCursor("grabbing");
        canvas.selection = false;
      }
    });

    canvas.on("mouse:move", (opt) => {
      if (!isPanningRef.current) return;
      const e = opt.e as MouseEvent;
      const vpt = canvas.viewportTransform;
      if (!vpt) return;
      vpt[4] += e.clientX - lastPosRef.current.x;
      vpt[5] += e.clientY - lastPosRef.current.y;
      canvas.requestRenderAll();
      lastPosRef.current = { x: e.clientX, y: e.clientY };
    });

    canvas.on("mouse:up", () => {
      isPanningRef.current = false;
      canvas.setCursor(spaceHeldRef.current ? "grab" : "default");
      canvas.selection = !spaceHeldRef.current;
    });

    // ── Keyboard listeners ───────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !spaceHeldRef.current) {
        spaceHeldRef.current = true;
        canvas.setCursor("grab");
        canvas.selection = false;
      }
      // Delete selected objects
      if ((e.key === "Delete" || e.key === "Backspace") && document.activeElement === document.body) {
        const active = canvas.getActiveObjects();
        if (active.length > 0) {
          active.forEach((obj) => canvas.remove(obj));
          canvas.discardActiveObject();
          canvas.requestRenderAll();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeldRef.current = false;
        canvas.setCursor("default");
        canvas.selection = true;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // ── Resize observer ──────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      if (!container) return;
      const { width: w, height: h } = container.getBoundingClientRect();
      canvas.setDimensions({ width: w, height: h });
      canvas.requestRenderAll();
    });
    ro.observe(container);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      ro.disconnect();
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  // ── Render assets on canvas ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !assetsQuery.data) return;

    // Remove existing asset groups (keep grid)
    const toRemove = canvas.getObjects().filter((o) => (o as any).assetId);
    toRemove.forEach((o) => canvas.remove(o));

    assetsQuery.data.forEach((asset) => {
      const group = createAssetCard(asset as unknown as UniversalAsset);
      canvas.add(group);
    });

    canvas.requestRenderAll();
  }, [assetsQuery.data]);

  // ── Zoom controls ──────────────────────────────────────────────────────────
  const zoomIn = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const newZoom = Math.min(MAX_ZOOM, canvas.getZoom() + ZOOM_STEP);
    const center = canvas.getVpCenter();
    canvas.zoomToPoint(new Point(center.x, center.y), newZoom);
    setZoom(newZoom);
  }, []);

  const zoomOut = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const newZoom = Math.max(MIN_ZOOM, canvas.getZoom() - ZOOM_STEP);
    const center = canvas.getVpCenter();
    canvas.zoomToPoint(new Point(center.x, center.y), newZoom);
    setZoom(newZoom);
  }, []);

  const resetView = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.setZoom(1);
    setZoom(1);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#fafafa] overflow-hidden">
      {/* Fabric canvas element */}
      <canvas ref={canvasElRef} />

      {/* Ingestion overlay */}
      {showIngestion && (
        <IngestionOverlay
          onClose={() => setShowIngestion(false)}
          onAssetAdded={() => {
            assetsQuery.refetch();
            setShowIngestion(false);
          }}
          targetTab="canvas"
        />
      )}

      {/* Toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-0 border-2 border-black bg-white shadow-[4px_4px_0px_#000]">
        <button
          onClick={zoomOut}
          className="p-3 font-mono text-black hover:bg-black hover:text-white transition-colors press-feedback border-r-2 border-black"
          title="Zoom out"
        >
          <ZoomOut size={16} strokeWidth={2.5} />
        </button>

        <div className="px-4 py-3 font-mono font-bold text-xs text-black border-r-2 border-black min-w-[64px] text-center">
          {Math.round(zoom * 100)}%
        </div>

        <button
          onClick={zoomIn}
          className="p-3 font-mono text-black hover:bg-black hover:text-white transition-colors press-feedback border-r-2 border-black"
          title="Zoom in"
        >
          <ZoomIn size={16} strokeWidth={2.5} />
        </button>

        <button
          onClick={resetView}
          className="p-3 font-mono text-black hover:bg-black hover:text-white transition-colors press-feedback"
          title="Reset view"
        >
          <Maximize2 size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Add asset button */}
      <button
        onClick={() => onRequestIngestion ? onRequestIngestion() : setShowIngestion(true)}
        className="absolute bottom-6 right-6 flex items-center gap-2 bg-black text-white font-mono font-bold text-xs uppercase tracking-widest px-5 py-3 press-feedback hover:bg-black/80 transition-colors border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.2)]"
      >
        <Plus size={14} strokeWidth={3} />
        Add Asset
      </button>

      {/* Empty state */}
      {assetsQuery.data?.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="font-display text-[80px] leading-none text-black/5 tracking-tighter select-none">
              EMPTY
            </div>
            <div className="font-mono text-xs text-black/20 uppercase tracking-widest mt-2">
              Drop assets or click Add Asset
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Grid drawing ─────────────────────────────────────────────────────────────

function drawGrid(canvas: Canvas, width: number, height: number) {
  // Grid is drawn via CSS background on the container, not Fabric objects
  // This keeps it performant and non-interactive
}

// ── Asset card factory ────────────────────────────────────────────────────────

function createAssetCard(asset: UniversalAsset): Group {
  const w = asset.canvasWidth ?? 280;
  const h = asset.canvasHeight ?? 180;
  const x = asset.canvasX ?? Math.random() * 400;
  const y = asset.canvasY ?? Math.random() * 300;

  // Card background
  const bg = new Rect({
    width: w,
    height: h,
    fill: "#ffffff",
    stroke: "#141414",
    strokeWidth: 2,
    rx: 0,
    ry: 0,
    shadow: new Shadow({ color: "rgba(0,0,0,0.12)", blur: 0, offsetX: 4, offsetY: 4 }),
  });

  // Type badge background
  const badgeBg = new Rect({
    width: w,
    height: 28,
    fill: "#141414",
    top: 0,
    left: 0,
  });

  // Type label
  const typeLabel = new FabricText(getTypeLabel(asset.type ?? "plain_text"), {
    fontSize: 9,
    fontFamily: "IBM Plex Mono",
    fontWeight: "700",
    fill: "#ffffff",
    top: 8,
    left: 10,
    letterSpacing: 2,
  });

  // Title
  const title = new FabricText(
    truncate(asset.title ?? "Untitled", 32),
    {
      fontSize: 12,
      fontFamily: "Space Grotesk",
      fontWeight: "700",
      fill: "#141414",
      top: 40,
      left: 10,
      width: w - 20,
    }
  );

  // Color preview (for color assets)
  let colorSwatch: Rect | null = null;
  if (asset.type === "color" && asset.primaryPayload) {
    colorSwatch = new Rect({
      width: w - 20,
      height: h - 100,
      fill: asset.primaryPayload,
      stroke: "#e2e8f0",
      strokeWidth: 1,
      top: 64,
      left: 10,
    });
  }

  // Payload preview text
  const preview = new FabricText(
    truncate(asset.primaryPayload ?? "", 48),
    {
      fontSize: 10,
      fontFamily: "IBM Plex Mono",
      fill: "#718096",
      top: asset.type === "color" ? h - 28 : 64,
      left: 10,
      width: w - 20,
    }
  );

  const objects: FabricObject[] = [bg, badgeBg, typeLabel, title];
  if (colorSwatch) objects.push(colorSwatch);
  objects.push(preview);

  const group = new Group(objects, {
    left: x,
    top: y,
    hasControls: true,
    hasBorders: true,
    lockRotation: true,
  });

  (group as any).assetId = asset.id ?? asset.localId;
  return group;
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    link_preview: "LINK",
    shadow_dom: "HTML/JS",
    plain_text: "TEXT",
    font_package: "FONT",
    media_element: "MEDIA",
    raw_binary: "BINARY",
    color: "COLOR",
  };
  return map[type] ?? type.toUpperCase();
}

function truncate(str: string, max: number): string {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}
