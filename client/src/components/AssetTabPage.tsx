import { useState } from "react";
import { Plus, Copy, Trash2, FolderPlus, Unplug } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import MoovasLayout from "./MoovasLayout";
import IngestionOverlay from "./IngestionOverlay";
import AssetPreview from "./AssetPreview";
import SaveAsDialog from "./SaveAsDialog";
import ExtractAssetsDrawer from "./ExtractAssetsDrawer";
import { smartCopy, getCopyLabel } from "@/lib/clipboard";
import type { TabName, AssetType } from "@shared/types";

interface AssetTabPageProps {
  tab: TabName;
  title: string;
}

export default function AssetTabPage({ tab, title }: AssetTabPageProps) {
  const { isAuthenticated } = useAuth();
  const [showIngestion, setShowIngestion] = useState(false);
  const [saveAsId, setSaveAsId] = useState<{ id: number; title?: string } | null>(null);
  const [extractUrl, setExtractUrl] = useState<string | null>(null);

  const assetsQuery = trpc.assets.list.useQuery(
    { tab },
    { enabled: isAuthenticated }
  );
  const deleteAsset = trpc.assets.delete.useMutation({
    onSuccess: () => assetsQuery.refetch(),
  });

  const handleCopy = async (asset: any) => {
    const result = await smartCopy(
      (asset.type ?? "plain_text") as AssetType,
      asset.primaryPayload,
      asset.fallbackPayload,
      asset.meta ?? {}
    );
    if (result.success) {
      toast.success(result.label);
    } else {
      toast.error("Nothing to copy");
    }
  };

  const handleDelete = (id: number) => {
    deleteAsset.mutate({ id });
    toast.success("Asset deleted");
  };

  const assets = assetsQuery.data ?? [];

  return (
    <MoovasLayout activeTab={tab}>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 border-b-2 border-black flex-shrink-0">
          <div>
            <div className="font-mono text-[10px] text-black/40 uppercase tracking-widest">
              Library
            </div>
            <div className="font-display text-2xl text-black tracking-tighter leading-none">
              {title.toUpperCase()}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="font-mono text-xs text-black/40 uppercase tracking-wider">
              {assets.length} {assets.length === 1 ? "asset" : "assets"}
            </div>
            <button
              onClick={() => setShowIngestion(true)}
              className="flex items-center gap-2 bg-black text-white font-mono font-bold text-xs uppercase tracking-widest px-4 py-2.5 press-feedback hover:bg-black/80 transition-colors"
            >
              <Plus size={12} strokeWidth={3} />
              Add
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {assetsQuery.isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-48 bg-black/5 animate-pulse border-2 border-black/5" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
              <div className="font-display text-[60px] leading-none text-black/5 tracking-tighter select-none mb-4">
                {title.toUpperCase()}
              </div>
              <div className="font-mono text-xs text-black/30 uppercase tracking-widest mb-6">
                No assets yet
              </div>
              <button
                onClick={() => setShowIngestion(true)}
                className="flex items-center gap-2 border-2 border-black font-mono font-bold text-xs uppercase tracking-widest px-5 py-3 press-feedback hover:bg-black hover:text-white transition-colors"
              >
                <Plus size={12} strokeWidth={3} />
                Add your first {tab === "colors" ? "color" : tab === "fonts" ? "font" : "asset"}
              </button>
            </div>
          ) : (
            <div
              className={`grid gap-4 ${
                tab === "colors"
                  ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
                  : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              }`}
            >
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="group relative border-2 border-black bg-white asset-card-hover"
                >
                  {/* Preview area */}
                  <div className="relative">
                    <AssetPreview asset={asset as any} />
                  </div>

                  {/* Card footer */}
                  <div className="border-t-2 border-black px-3 py-2">
                    <div className="font-mono font-bold text-xs text-black truncate">
                      {asset.title ?? "Untitled"}
                    </div>
                    {tab === "colors" && (asset.meta as any)?.colorHex && (
                      <div className="font-mono text-[10px] text-black/40 mt-0.5">
                        {(asset.meta as any).colorHex}
                      </div>
                    )}
                    {tab === "bookmarks" && asset.type === "link_preview" && (
                      <div className="font-mono text-[10px] text-black/30 mt-0.5 truncate">
                        {asset.primaryPayload}
                      </div>
                    )}
                  </div>

                  {/* Action overlay */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Smart copy */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopy(asset); }}
                      className="p-1.5 bg-black text-white hover:bg-black/70 transition-colors press-feedback"
                      title={getCopyLabel((asset.type ?? "plain_text") as AssetType)}
                    >
                      <Copy size={11} strokeWidth={2.5} />
                    </button>

                    {/* Save As (collections) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSaveAsId({ id: asset.id, title: asset.title ?? undefined });
                      }}
                      className="p-1.5 bg-black text-white hover:bg-black/70 transition-colors press-feedback"
                      title="Save to collection"
                    >
                      <FolderPlus size={11} strokeWidth={2.5} />
                    </button>

                    {/* Extract assets (only for link_preview) */}
                    {asset.type === "link_preview" && asset.primaryPayload && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExtractUrl(asset.primaryPayload!);
                        }}
                        className="p-1.5 bg-black text-white hover:bg-blue-600 transition-colors press-feedback"
                        title="Extract assets from this page"
                      >
                        <Unplug size={11} strokeWidth={2.5} />
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(asset.id); }}
                      className="p-1.5 bg-black text-white hover:bg-red-600 transition-colors press-feedback"
                      title="Delete"
                    >
                      <Trash2 size={11} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ingestion overlay */}
      {showIngestion && (
        <IngestionOverlay
          onClose={() => setShowIngestion(false)}
          onAssetAdded={() => {
            assetsQuery.refetch();
            setShowIngestion(false);
          }}
          targetTab={tab}
        />
      )}

      {/* Save As dialog */}
      {saveAsId && (
        <SaveAsDialog
          assetId={saveAsId.id}
          assetTitle={saveAsId.title}
          onClose={() => setSaveAsId(null)}
        />
      )}

      {/* Extract Assets drawer */}
      {extractUrl && (
        <ExtractAssetsDrawer
          url={extractUrl}
          onClose={() => setExtractUrl(null)}
          onAssetsImported={() => {
            assetsQuery.refetch();
            setExtractUrl(null);
          }}
        />
      )}
    </MoovasLayout>
  );
}
