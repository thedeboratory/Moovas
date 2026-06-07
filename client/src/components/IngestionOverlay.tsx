import { useState, useCallback, useRef } from "react";
import { X, Link2, FileCode, Palette, Type, Image, File, Upload } from "lucide-react";
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

const ACCEPTED_TYPES = [
  ".ttf", ".otf", ".woff", ".woff2",
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif",
  ".mp4", ".webm", ".mov",
  ".html", ".css", ".js", ".ts", ".json", ".md", ".txt",
  "image/*", "video/*", "font/*", "text/*",
].join(",");

export default function IngestionOverlay({
  onClose,
  onAssetAdded,
  targetTab,
}: IngestionOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0); // track nested drag enter/leave

  const createAsset = trpc.assets.create.useMutation();

  const processInput = useCallback(
    async (raw: string, file?: File, label?: string) => {
      if (!raw.trim() && !file) return;
      setIsProcessing(true);
      setProcessingLabel(label ?? "Processing…");

      try {
        const classified = classifyAsset(raw, file);
        const tab: TabName =
          targetTab === "canvas"
            ? (classified.suggestedTab as TabName)
            : targetTab;

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
        setProcessingLabel("");
      }
    },
    [createAsset, onAssetAdded, targetTab]
  );

  // ── File processing helper ─────────────────────────────────────────────────
  const processFiles = useCallback(
    (files: File[]) => {
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          processInput(ev.target?.result as string ?? "", file, `Adding ${file.name}…`);
        };
        // Read text files as text, everything else as data URL
        if (file.type.startsWith("text/") || /\.(html|css|js|ts|json|md|txt|svg)$/i.test(file.name)) {
          reader.readAsText(file);
        } else {
          reader.readAsDataURL(file);
        }
      });
    },
    [processInput]
  );

  // ── Drag and drop ──────────────────────────────────────────────────────────
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);

      const text = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text/uri-list");
      const files = Array.from(e.dataTransfer.files);

      if (files.length > 0) {
        processFiles(files);
      } else if (text) {
        processInput(text, undefined, "Processing dropped content…");
      }
    },
    [processFiles, processInput]
  );

  // ── Paste ──────────────────────────────────────────────────────────────────
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData("text/plain");
      const files = Array.from(e.clipboardData.files);

      if (files.length > 0) {
        e.preventDefault();
        processFiles(files);
      } else if (text) {
        setInputValue(text);
      }
    },
    [processFiles]
  );

  // ── File input (upload button) ─────────────────────────────────────────────
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) processFiles(files);
      // Reset so same file can be re-selected
      e.target.value = "";
    },
    [processFiles]
  );

  const handleSubmit = () => {
    if (inputValue.trim()) {
      processInput(inputValue.trim(), undefined, "Processing…");
      setInputValue("");
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES}
        className="sr-only"
        onChange={handleFileInputChange}
        aria-label="Upload files"
      />

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
          aria-label="Close"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
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

        {/* Drop zone + upload button */}
        <div className="w-full max-w-xl mb-6">
          <div
            className={`border-2 border-dashed transition-all p-8 text-center ${
              isDragging
                ? "border-black bg-black/5 scale-[1.01]"
                : "border-black/20 hover:border-black/40"
            }`}
          >
            <div className="font-display text-3xl text-black/20 tracking-tighter mb-2">
              {isDragging ? "RELEASE TO ADD" : "DROP HERE"}
            </div>
            <div className="font-mono text-xs text-black/30 uppercase tracking-widest mb-5">
              or use the button below
            </div>

            {/* Upload button — visible, accessible fallback */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 border-2 border-black bg-white text-black font-mono font-bold text-xs uppercase tracking-widest px-5 py-2.5 press-feedback hover:bg-black hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Upload size={13} strokeWidth={2.5} />
              Choose Files
            </button>
          </div>
        </div>

        {/* Text / URL input */}
        <div className="w-full max-w-xl">
          <div className="font-mono text-[10px] text-black/40 uppercase tracking-widest mb-2">
            Paste a URL, color, or code snippet
          </div>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
            placeholder="https://example.com  ·  #3D5AFE  ·  .btn { ... }"
            className="w-full h-24 border-2 border-black bg-white font-mono text-sm text-black placeholder:text-black/20 p-4 resize-none focus:outline-none focus:ring-0"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="font-mono text-[10px] text-black/30 uppercase tracking-widest">
              {isProcessing ? processingLabel : "⌘+Enter to add"}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isProcessing}
              className="flex items-center gap-2 bg-black text-white font-mono font-bold text-xs uppercase tracking-widest px-5 py-2.5 press-feedback disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/80 transition-colors"
            >
              {isProcessing ? "Processing…" : "[ Add Asset ]"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
