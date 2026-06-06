import { useState, useRef, useCallback } from "react";
import MoovasLayout from "@/components/MoovasLayout";
import FabricCanvas from "@/components/FabricCanvas";
import ExportPanel from "@/components/ExportPanel";
import IngestionOverlay from "@/components/IngestionOverlay";
import type { Canvas } from "fabric";
import { Download } from "lucide-react";

export default function CanvasPage() {
  const fabricRef = useRef<Canvas | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showIngestion, setShowIngestion] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCanvasReady = useCallback((canvas: Canvas) => {
    fabricRef.current = canvas;
  }, []);

  return (
    <MoovasLayout activeTab="canvas">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page header */}
        <div className="flex items-center justify-between px-8 py-4 border-b-2 border-black flex-shrink-0">
          <div>
            <div className="font-mono text-[10px] text-black/40 uppercase tracking-widest">
              Workspace
            </div>
            <div className="font-display text-2xl text-black tracking-tighter leading-none">
              CANVAS
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 font-mono text-xs text-black/40 uppercase tracking-wider">
              <span>Scroll to zoom</span>
              <span className="text-black/20">·</span>
              <span>Space+drag to pan</span>
            </div>
            <button
              onClick={() => setShowExport(true)}
              className="flex items-center gap-2 border-2 border-black font-mono font-bold text-xs uppercase tracking-widest px-4 py-2 press-feedback hover:bg-black hover:text-white transition-colors"
            >
              <Download size={12} strokeWidth={2.5} />
              Export
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-hidden relative">
          <FabricCanvas
            key={refreshKey}
            onCanvasReady={handleCanvasReady}
            onRequestIngestion={() => setShowIngestion(true)}
          />
        </div>
      </div>

      {/* Export panel — receives live fabric canvas */}
      {showExport && (
        <ExportPanel
          onClose={() => setShowExport(false)}
          fabricCanvas={fabricRef.current}
        />
      )}

      {/* Ingestion overlay triggered from canvas toolbar */}
      {showIngestion && (
        <IngestionOverlay
          onClose={() => setShowIngestion(false)}
          onAssetAdded={() => {
            setRefreshKey((k) => k + 1);
            setShowIngestion(false);
          }}
          targetTab="canvas"
        />
      )}
    </MoovasLayout>
  );
}
