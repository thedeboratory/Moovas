import { useState } from "react";
import { X, AlertTriangle, Check, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { saveAssetLocally, markAssetSynced } from "@/lib/db";
import type { TabName, AssetType } from "@shared/types";

interface ExtractAssetsDrawerProps {
  url: string;
  onClose: () => void;
  onAssetsImported: () => void;
}

type SelectionMap = Record<string, boolean>;

export default function ExtractAssetsDrawer({
  url,
  onClose,
  onAssetsImported,
}: ExtractAssetsDrawerProps) {
  const [selection, setSelection] = useState<SelectionMap>({});
  const [isImporting, setIsImporting] = useState(false);

  const scrapeQuery = trpc.scrape.url.useMutation();
  const createAsset = trpc.assets.create.useMutation();

  const scraped = scrapeQuery.data;

  const toggle = (key: string) =>
    setSelection((prev) => ({ ...prev, [key]: !prev[key] }));

  const selectAll = () => {
    if (!scraped) return;
    const all: SelectionMap = {};
    scraped.fonts.forEach((_, i) => (all[`font_${i}`] = true));
    scraped.colors.forEach((_, i) => (all[`color_${i}`] = true));
    scraped.images.forEach((_, i) => (all[`image_${i}`] = true));
    scraped.codeBlocks.forEach((_, i) => (all[`code_${i}`] = true));
    setSelection(all);
  };

  const handleImport = async () => {
    if (!scraped) return;
    setIsImporting(true);
    let count = 0;

    try {
      const save = async (
        tab: TabName,
        type: AssetType,
        title: string,
        primaryPayload: string,
        meta?: any
      ) => {
        const local = await saveAssetLocally({
          tab,
          type,
          title,
          primaryPayload,
          meta,
          canvasX: Math.round(100 + Math.random() * 600),
          canvasY: Math.round(100 + Math.random() * 400),
          canvasWidth: 280,
          canvasHeight: type === "color" ? 160 : 180,
        });
        const result = await createAsset.mutateAsync({
          tab,
          type,
          title,
          primaryPayload,
          meta,
          canvasX: local.canvasX,
          canvasY: local.canvasY,
          canvasWidth: local.canvasWidth,
          canvasHeight: local.canvasHeight,
        });
        if (result?.insertId) await markAssetSynced(local.localId, result.insertId);
        count++;
      };

      for (let i = 0; i < scraped.fonts.length; i++) {
        if (!selection[`font_${i}`]) continue;
        const f = scraped.fonts[i];
        await save("fonts", "font_package", f.name, f.cssBlock ?? f.url ?? "", {
          fontFamily: f.name,
          sourceUrl: url,
        });
      }

      for (let i = 0; i < scraped.colors.length; i++) {
        if (!selection[`color_${i}`]) continue;
        const c = scraped.colors[i];
        await save("colors", "color", c.hex, c.hex, {
          colorHex: c.hex,
          colorRgba: c.rgba,
          sourceUrl: url,
        });
      }

      for (let i = 0; i < scraped.images.length; i++) {
        if (!selection[`image_${i}`]) continue;
        const img = scraped.images[i];
        await save("media", "media_element", img.alt ?? img.src.split("/").pop() ?? "Image", img.src, {
          sourceUrl: url,
          mimeType: "image/*",
        });
      }

      for (let i = 0; i < scraped.codeBlocks.length; i++) {
        if (!selection[`code_${i}`]) continue;
        const cb = scraped.codeBlocks[i];
        await save("code", "plain_text", cb.content.slice(0, 60), cb.content, {
          sourceUrl: url,
        });
      }

      toast.success(`Imported ${count} asset${count !== 1 ? "s" : ""}`);
      onAssetsImported();
    } catch (err) {
      toast.error("Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = Object.values(selection).filter(Boolean).length;

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-white border-l-2 border-black z-50 flex flex-col shadow-[-8px_0_0_rgba(0,0,0,0.05)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black flex-shrink-0">
        <div>
          <div className="font-mono text-[10px] text-black/40 uppercase tracking-widest">
            Asset Extraction
          </div>
          <div className="font-display text-xl text-black tracking-tighter leading-none">
            EXTRACT
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-black hover:text-white transition-colors press-feedback border-2 border-black"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>

      {/* URL display */}
      <div className="px-6 py-3 border-b-2 border-black/10 bg-black/[0.02] flex-shrink-0">
        <div className="font-mono text-[10px] text-black/40 uppercase tracking-widest mb-1">
          Source
        </div>
        <div className="font-mono text-xs text-black truncate">{url}</div>
      </div>

      {/* Scrape trigger */}
      {!scraped && !scrapeQuery.isPending && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="font-display text-4xl text-black/10 tracking-tighter mb-6">SCAN</div>
          <p className="font-mono text-xs text-black/40 uppercase tracking-widest mb-6 leading-relaxed">
            Scan this page for fonts,<br />colors, images, and code
          </p>
          <button
            onClick={() => scrapeQuery.mutate({ url })}
            className="flex items-center gap-2 bg-black text-white font-mono font-bold text-xs uppercase tracking-widest px-6 py-3 press-feedback hover:bg-black/80 transition-colors"
          >
            [ Scan Page ]
          </button>
          <p className="mt-4 font-mono text-[10px] text-black/30 leading-relaxed">
            Results may be partial for<br />JavaScript-rendered pages.
          </p>
        </div>
      )}

      {/* Loading */}
      {scrapeQuery.isPending && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 size={24} className="animate-spin text-black/40" />
          <div className="font-mono text-xs text-black/40 uppercase tracking-widest">
            Scanning...
          </div>
        </div>
      )}

      {/* Error */}
      {scrapeQuery.isError && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="font-mono text-xs text-red-600 mb-4">
            {scrapeQuery.error?.message ?? "Scan failed"}
          </div>
          <button
            onClick={() => scrapeQuery.mutate({ url })}
            className="font-mono text-xs text-black/40 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Results */}
      {scraped && (
        <>
          {scraped.isPartial && (
            <div className="mx-4 mt-3 flex items-start gap-2 border-2 border-black/20 p-3 bg-yellow-50 flex-shrink-0">
              <AlertTriangle size={14} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="font-mono text-[10px] text-yellow-700 leading-relaxed">
                {scraped.warning}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between px-6 py-2 border-b-2 border-black/10 flex-shrink-0">
            <div className="font-mono text-[10px] text-black/40 uppercase tracking-widest">
              {selectedCount} selected
            </div>
            <button
              onClick={selectAll}
              className="font-mono text-[10px] text-black underline uppercase tracking-widest"
            >
              Select All
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Fonts */}
            {scraped.fonts.length > 0 && (
              <Section title="Fonts" count={scraped.fonts.length}>
                {scraped.fonts.map((f, i) => (
                  <CheckRow
                    key={i}
                    id={`font_${i}`}
                    checked={!!selection[`font_${i}`]}
                    onToggle={() => toggle(`font_${i}`)}
                    label={f.name}
                    sub="Font family"
                  />
                ))}
              </Section>
            )}

            {/* Colors */}
            {scraped.colors.length > 0 && (
              <Section title="Colors" count={scraped.colors.length}>
                <div className="grid grid-cols-2 gap-2 px-4 pb-3">
                  {scraped.colors.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => toggle(`color_${i}`)}
                      className={`flex items-center gap-2 border-2 p-2 transition-all ${
                        selection[`color_${i}`]
                          ? "border-black"
                          : "border-black/10 hover:border-black/30"
                      }`}
                    >
                      <div
                        className="w-6 h-6 flex-shrink-0 border border-black/10"
                        style={{ backgroundColor: c.hex }}
                      />
                      <div className="text-left min-w-0">
                        <div className="font-mono font-bold text-[10px] text-black truncate">
                          {c.hex}
                        </div>
                      </div>
                      {selection[`color_${i}`] && (
                        <Check size={10} className="ml-auto text-black flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </Section>
            )}

            {/* Images */}
            {scraped.images.length > 0 && (
              <Section title="Images" count={scraped.images.length}>
                <div className="grid grid-cols-3 gap-2 px-4 pb-3">
                  {scraped.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => toggle(`image_${i}`)}
                      className={`relative overflow-hidden border-2 aspect-square transition-all ${
                        selection[`image_${i}`]
                          ? "border-black"
                          : "border-black/10 hover:border-black/30"
                      }`}
                    >
                      <img
                        src={img.src}
                        alt={img.alt ?? ""}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {selection[`image_${i}`] && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Check size={16} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </Section>
            )}

            {/* Code */}
            {scraped.codeBlocks.length > 0 && (
              <Section title="Code Blocks" count={scraped.codeBlocks.length}>
                {scraped.codeBlocks.map((cb, i) => (
                  <CheckRow
                    key={i}
                    id={`code_${i}`}
                    checked={!!selection[`code_${i}`]}
                    onToggle={() => toggle(`code_${i}`)}
                    label={cb.content.slice(0, 50)}
                    sub={`${cb.content.length} chars`}
                    mono
                  />
                ))}
              </Section>
            )}

            {scraped.fonts.length === 0 &&
              scraped.colors.length === 0 &&
              scraped.images.length === 0 &&
              scraped.codeBlocks.length === 0 && (
                <div className="p-8 text-center">
                  <div className="font-mono text-xs text-black/30 uppercase tracking-widest">
                    No extractable assets found
                  </div>
                </div>
              )}
          </div>

          {/* Import button */}
          <div className="border-t-2 border-black p-4 flex-shrink-0">
            <button
              onClick={handleImport}
              disabled={selectedCount === 0 || isImporting}
              className="w-full flex items-center justify-center gap-2 bg-black text-white font-mono font-bold text-xs uppercase tracking-widest py-3 press-feedback disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/80 transition-colors"
            >
              {isImporting ? (
                <><Loader2 size={12} className="animate-spin" /> Importing...</>
              ) : (
                <><Download size={12} strokeWidth={2.5} /> Import {selectedCount} Asset{selectedCount !== 1 ? "s" : ""}</>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b-2 border-black/5">
      <div className="flex items-center justify-between px-4 py-2 bg-black/[0.02]">
        <div className="font-mono font-bold text-[10px] text-black uppercase tracking-widest">
          {title}
        </div>
        <div className="font-mono text-[10px] text-black/40">{count}</div>
      </div>
      {children}
    </div>
  );
}

function CheckRow({
  id,
  checked,
  onToggle,
  label,
  sub,
  mono = false,
}: {
  id: string;
  checked: boolean;
  onToggle: () => void;
  label: string;
  sub?: string;
  mono?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-black/[0.02] transition-colors border-b border-black/5 last:border-0`}
    >
      <div
        className={`w-4 h-4 border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          checked ? "bg-black border-black" : "border-black/30"
        }`}
      >
        {checked && <Check size={10} className="text-white" strokeWidth={3} />}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`text-xs text-black truncate ${
            mono ? "font-mono" : "font-mono font-bold"
          }`}
        >
          {label}
        </div>
        {sub && (
          <div className="font-mono text-[10px] text-black/40">{sub}</div>
        )}
      </div>
    </button>
  );
}
