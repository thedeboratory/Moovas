// ─── Shared Asset Types ───────────────────────────────────────────────────────

export const ASSET_TYPES = [
  "link_preview",
  "shadow_dom",
  "plain_text",
  "font_package",
  "media_element",
  "raw_binary",
  "color",
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

export const TAB_NAMES = [
  "canvas",
  "fonts",
  "colors",
  "code",
  "media",
  "bookmarks",
] as const;

export type TabName = (typeof TAB_NAMES)[number];

export interface AssetMeta {
  mimeType?: string;
  fileSize?: number;
  colorRgba?: string;
  colorHex?: string;
  colorCmyk?: string;
  fontFamily?: string;
  customThumbnailUrl?: string;
  sourceUrl?: string;
}

export interface AssetRenderFlags {
  isCompiled?: boolean;
  sandboxMode?: string;
}

export interface CanvasPosition {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
}

/** Unified asset object used across local (Dexie) and remote (Drizzle) storage */
export interface UniversalAsset {
  id?: number;
  localId?: string; // Dexie local ID (UUID)
  userId?: number;
  collectionId?: number | null;
  tab: TabName;
  type: AssetType;
  title?: string;
  primaryPayload?: string;
  fallbackPayload?: string;
  storageKey?: string;
  storageUrl?: string;
  canvasX?: number;
  canvasY?: number;
  canvasZ?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  renderFlags?: AssetRenderFlags;
  meta?: AssetMeta;
  syncedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CollectionItem {
  id?: number;
  localId?: string;
  userId?: number;
  name: string;
  extensionTag?: string;
  tab: TabName;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Tab label map for display */
export const TAB_LABELS: Record<TabName, string> = {
  canvas: "Canvas",
  fonts: "Fonts",
  colors: "Colors",
  code: "Code",
  media: "Media",
  bookmarks: "Bookmarks",
};
