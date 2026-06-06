import { useState, useCallback, useRef } from "react";
import { X, Link2, FileCode, Palette, Type, Image, File } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { saveAssetLocally, markAssetSynced } from "@/lib/db";
import { classifyAsset, parseColorValue } from "@/lib/assetClassifier";
import type { TabName, AssetType } from "@shared/types";

interface IngestionOverlayProps {
  onClose: () => void;
  onAssetAdded: () => void;
  targetTab: TabName;
}

export default function IngestionOverlay({
  onClose,
  onAssetAdded,
  targetTab,
}: IngestionOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createAsset = trpc.assets.create.useMutation();

  const processInput = useCallback(
    async (raw: string, file?: File) => {
      if (!raw.trim() && !file) return;
      setIsProcessing(true);

      try {
        const classified = classifyAsset(raw, file);
        const tab: TabName =
          targetTab === "canvas"
            ? (classified.suggestedTab as TabName)
            : targetTab;

        // Save locally first (local-first)
        const local = await saveAssetLocally({
          tab,
          type: classified.type as AssetType,
          title: classified.title,
          primaryPayload: classified.primaryPayload,
          fallbackPayload: classified.fallbackPayload,
          meta: classified.meta,
          canvasX: Math.round(100 + Math.random() * 600),
          canvasY: Math.round(100 + Math.random() * 400),
          canvasWidth: 280,
          canvasHeight: classified.type === "color" ? 160 : 180,
        });

        // Sync to remote
        const result = await createAsset.mutateAsync({
          tab,
          type: classified.type as AssetType,
          title: classified.title,
          primaryPayload: classified.primaryPayload,
          fallbackPayload: classified.fallbackPayload,
          meta: classified.meta,
          canvasX: local.canvasX,
          canvasY: local.canvasY,
          canvasWidth: local.canvasWidth,
          canvasHeight: local.canvasHeight,
        });

        if (result?.insertId) {
          await markAssetSynced(local.localId, result.insertId);
        }

        toast.success(`Asset added to ${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
        onAssetAdded();
      } catch (err) {
        console.error(err);
        toast.error("Failed to add asset");
      } finally {
        setIsProcessing(false);
      }
    },
    [createAsset, onAssetAdded, targetTab]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const text = e.dataTransfer.getData("text/plain");
      const files = Array.from(e.dataTransfer.files);

      if (files.length > 0) {
        files.forEach((file) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            processInput(ev.target?.result as string ?? "", file);
          };
          reader.readAsDataURL(file);
        });
      } else if (text) {
        processInput(text);
      }
    },
    [processInput]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData("text/plain");
      const files = Array.from(e.clipboardData.files);

      if (files.length > 0) {
        files.forEach((file) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            processInput(ev.target?.result as string ?? "", file);
          };
          reader.readAsDataURL(file);
        });
      } else if (text) {
        setInputValue(text);
      }
    },
    [processInput]
  );

  const handleSubmit = () => {
    if (inputValue.trim()) {
      processInput(inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b-2 border-black">
        <div>
          <div className="font-mono text-[10px] text-black/40 uppercase tracking-widest">
            Ingestion
          </div>
          <div className="font-display text-2xl text-black tracking-tighter leading-none">
            ADD ASSET
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-black hover:text-white transition-colors press-feedback border-2 border-black"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Drop zone */}
      <div
        className={`flex-1 flex flex-col items-center justify-center p-8 transition-colors ${
          isDragging ? "bg-black/5" : ""
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {/* Asset type hints */}
        <div className="grid grid-cols-3 gap-4 mb-10 w-full max-w-xl">
          {[
            { icon: <Link2 size={16} />, label: "URLs", desc: "Links, iframes" },
            { icon: <FileCode size={16} />, label: "Code", desc: "HTML, CSS, JS" },
            { icon: <Palette size={16} />, label: "Colors", desc: "#hex, rgba()" },
            { icon: <Type size={16} />, label: "Fonts", desc: ".ttf, .woff2" },
            { icon: <Image size={16} />, label: "Media", desc: "Images, video" },
            { icon: <File size={16} />, label: "Files", desc: "Any binary" },
          ].map((t) => (
            <div
              key={t.label}
              className="border-2 border-black/10 p-3 flex items-start gap-2"
            >
              <div className="text-black/40 mt-0.5">{t.icon}</div>
              <div>
                <div className="font-mono font-bold text-xs text-black uppercase tracking-wider">
                  {t.label}
                </div>
                <div className="font-mono text-[10px] text-black/40">{t.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Drop target */}
        <div
          className={`w-full max-w-xl border-2 border-dashed transition-all ${
            isDragging ? "border-black bg-black/5" : "border-black/20"
          } p-8 text-center mb-6`}
        >
          <div className="font-display text-3xl text-black/20 tracking-tighter mb-2">
            DROP HERE
          </div>
          <div className="font-mono text-xs text-black/30 uppercase tracking-widest">
            or paste / type below
          </div>
        </div>

        {/* Text input */}
        <div className="w-full max-w-xl">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
            placeholder="Paste a URL, color value, code snippet, or any text..."
            className="w-full h-24 border-2 border-black bg-white font-mono text-sm text-black placeholder:text-black/20 p-4 resize-none focus:outline-none focus:ring-0"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="font-mono text-[10px] text-black/30 uppercase tracking-widest">
              ⌘+Enter to add
            </div>
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isProcessing}
              className="flex items-center gap-2 bg-black text-white font-mono font-bold text-xs uppercase tracking-widest px-5 py-2.5 press-feedback disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/80 transition-colors"
            >
              {isProcessing ? "Processing..." : "[ Add Asset ]"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
