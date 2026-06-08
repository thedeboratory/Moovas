import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  InsertAsset, assets,
  collections,
  canvasTabs,
  waitlist, InsertWaitlistEntry,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createEmailUser(data: { email: string; name: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `email_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await db.insert(users).values({
    openId,
    email: data.email,
    name: data.name,
    loginMethod: "email",
    passwordHash: data.passwordHash,
    emailVerified: 0,
    lastSignedIn: new Date(),
  });
  return getUserByEmail(data.email);
}

export async function updateUserLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

// ─── Assets ───────────────────────────────────────────────────────────────────

export async function createAsset(asset: InsertAsset) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(assets).values(asset);
  return result;
}

export async function getAssetsByUser(userId: number, tab?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(assets.userId, userId)];
  if (tab) conditions.push(eq(assets.tab, tab as any));
  return db.select().from(assets).where(and(...conditions)).orderBy(desc(assets.createdAt));
}

export async function deleteAsset(assetId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(assets).where(and(eq(assets.id, assetId), eq(assets.userId, userId)));
}

export async function updateAsset(assetId: number, userId: number, updates: Partial<InsertAsset>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(assets).set(updates).where(and(eq(assets.id, assetId), eq(assets.userId, userId)));
}

// ─── Collections ──────────────────────────────────────────────────────────────

export async function getCollectionsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(collections).where(eq(collections.userId, userId)).orderBy(desc(collections.createdAt));
}

export async function createCollection(data: { userId: number; name: string; extensionTag?: string; tab?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(collections).values({
    userId: data.userId,
    name: data.name,
    extensionTag: data.extensionTag,
    tab: (data.tab as any) ?? "canvas",
  });
  return result;
}

export async function deleteCollection(collectionId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(collections).where(and(eq(collections.id, collectionId), eq(collections.userId, userId)));
}

// ─── Canvas Tabs ──────────────────────────────────────────────────────────────

export async function getCanvasTabsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(canvasTabs).where(eq(canvasTabs.userId, userId)).orderBy(canvasTabs.sortOrder);
}

export async function createCanvasTab(userId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(canvasTabs).values({ userId, name });
  return result;
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────

export async function addToWaitlist(entry: InsertWaitlistEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check for duplicate email — return existing entry rather than throwing
  const existing = await db.select().from(waitlist).where(eq(waitlist.email, entry.email)).limit(1);
  if (existing.length > 0) return { alreadyExists: true };
  await db.insert(waitlist).values(entry);
  return { alreadyExists: false };
}

export async function getWaitlistCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(waitlist);
  return result.length;
}
