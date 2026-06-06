import Dexie, { type Table } from "dexie";
import type { UniversalAsset, CollectionItem } from "../../../shared/types";

// ─── Local Asset (Dexie) ──────────────────────────────────────────────────────

export interface LocalAsset extends UniversalAsset {
  localId: string; // UUID, primary key in Dexie
  synced: boolean; // true once pushed to remote
  remoteId?: number; // remote DB id after sync
}

export interface LocalCollection extends CollectionItem {
  localId: string;
  synced: boolean;
  remoteId?: number;
}

// ─── Dexie Database ───────────────────────────────────────────────────────────

class MoovasDB extends Dexie {
  assets!: Table<LocalAsset, string>;
  collections!: Table<LocalCollection, string>;

  constructor() {
    super("MoovasDB");

    this.version(1).stores({
      assets:
        "localId, tab, type, userId, collectionId, synced, createdAt, updatedAt",
      collections: "localId, tab, userId, synced, createdAt",
    });
  }
}

export const localDb = new MoovasDB();

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function saveAssetLocally(
  asset: Omit<LocalAsset, "localId" | "synced" | "createdAt" | "updatedAt">
): Promise<LocalAsset> {
  const now = new Date();
  const record: LocalAsset = {
    ...asset,
    localId: generateLocalId(),
    synced: false,
    createdAt: now,
    updatedAt: now,
  };
  await localDb.assets.add(record);
  return record;
}

export async function getAssetsByTab(tab: string): Promise<LocalAsset[]> {
  return localDb.assets
    .where("tab")
    .equals(tab)
    .reverse()
    .sortBy("createdAt");
}

export async function getAllAssets(): Promise<LocalAsset[]> {
  return localDb.assets.orderBy("createdAt").reverse().toArray();
}

export async function deleteAssetLocally(localId: string): Promise<void> {
  await localDb.assets.delete(localId);
}

export async function updateAssetLocally(
  localId: string,
  updates: Partial<LocalAsset>
): Promise<void> {
  await localDb.assets.update(localId, { ...updates, updatedAt: new Date() });
}

export async function getUnsyncedAssets(): Promise<LocalAsset[]> {
  return localDb.assets.filter((a) => !a.synced).toArray();
}

export async function markAssetSynced(
  localId: string,
  remoteId: number
): Promise<void> {
  await localDb.assets.update(localId, {
    synced: true,
    remoteId,
    syncedAt: new Date(),
  });
}
