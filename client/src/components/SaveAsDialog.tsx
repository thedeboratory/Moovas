import { useState } from "react";
import { X, Plus, FolderPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface SaveAsDialogProps {
  assetId: number;
  assetTitle?: string;
  onClose: () => void;
}

export default function SaveAsDialog({ assetId, assetTitle, onClose }: SaveAsDialogProps) {
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { isAuthenticated } = useAuth();

  const collectionsQuery = trpc.collections.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const createCollection = trpc.collections.create.useMutation({
    onSuccess: () => collectionsQuery.refetch(),
  });
  const addToCollection = trpc.collections.addAsset.useMutation();

  const handleAddToCollection = async (collectionId: number, collectionName: string) => {
    try {
      await addToCollection.mutateAsync({ collectionId, assetId });
      toast.success(`Added to "${collectionName}"`);
      onClose();
    } catch {
      toast.error("Failed to add to collection");
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newCollectionName.trim()) return;
    setIsCreating(true);
    try {
      const result = await createCollection.mutateAsync({
        name: newCollectionName.trim(),
      });
      if (result?.insertId) {
        await addToCollection.mutateAsync({
          collectionId: result.insertId,
          assetId,
        });
        toast.success(`Created "${newCollectionName}" and added asset`);
        onClose();
      }
    } catch {
      toast.error("Failed to create collection");
    } finally {
      setIsCreating(false);
    }
  };

  const collections = collectionsQuery.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-[420px] bg-white border-2 border-black shadow-[8px_8px_0px_#000]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black">
          <div>
            <div className="font-mono text-[10px] text-black/40 uppercase tracking-widest">
              Organize
            </div>
            <div className="font-display text-xl text-black tracking-tighter leading-none">
              SAVE AS
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-black hover:text-white transition-colors press-feedback border-2 border-black"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* Asset name */}
        <div className="px-6 py-3 border-b-2 border-black/10 bg-black/[0.02]">
          <div className="font-mono text-[10px] text-black/40 uppercase tracking-widest mb-1">
            Asset
          </div>
          <div className="font-mono font-bold text-sm text-black truncate">
            {assetTitle ?? "Untitled"}
          </div>
        </div>

        {/* Create new collection */}
        <div className="px-6 py-4 border-b-2 border-black/10">
          <div className="font-mono text-[10px] text-black/40 uppercase tracking-widest mb-3">
            New Collection
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateAndAdd()}
              placeholder="Collection name..."
              className="flex-1 border-2 border-black px-3 py-2 font-mono text-sm text-black placeholder:text-black/20 focus:outline-none bg-white"
            />
            <button
              onClick={handleCreateAndAdd}
              disabled={!newCollectionName.trim() || isCreating}
              className="flex items-center gap-1.5 bg-black text-white font-mono font-bold text-xs uppercase tracking-widest px-4 py-2 press-feedback disabled:opacity-30 hover:bg-black/80 transition-colors"
            >
              <FolderPlus size={12} strokeWidth={2.5} />
              Create
            </button>
          </div>
        </div>

        {/* Existing collections */}
        <div className="max-h-64 overflow-y-auto">
          {collections.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <div className="font-mono text-xs text-black/30 uppercase tracking-widest">
                No collections yet
              </div>
            </div>
          ) : (
            <div>
              <div className="px-6 pt-3 pb-1">
                <div className="font-mono text-[10px] text-black/40 uppercase tracking-widest">
                  Add to Existing
                </div>
              </div>
              {collections.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleAddToCollection(c.id, c.name)}
                  className="w-full flex items-center justify-between px-6 py-3 hover:bg-black/[0.03] transition-colors border-b border-black/5 last:border-0 group"
                >
                  <div className="text-left">
                    <div className="font-mono font-bold text-sm text-black">{c.name}</div>
                    {c.extensionTag && (
                      <div className="font-mono text-[10px] text-black/40">{c.extensionTag}</div>
                    )}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus size={14} className="text-black" strokeWidth={2.5} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t-2 border-black/10">
          <button
            onClick={onClose}
            className="font-mono text-xs text-black/40 uppercase tracking-widest hover:text-black transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
