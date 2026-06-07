import {
  bigint,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  /** Hashed password for email/password auth (bcrypt) */
  passwordHash: varchar("passwordHash", { length: 255 }),
  /** Whether the email has been verified (0 = no, 1 = yes) */
  emailVerified: int("emailVerified").default(0).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Asset Type Enum ──────────────────────────────────────────────────────────

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

// ─── Tab Names ────────────────────────────────────────────────────────────────

export const TAB_NAMES = [
  "canvas",
  "fonts",
  "colors",
  "code",
  "media",
  "bookmarks",
] as const;

export type TabName = (typeof TAB_NAMES)[number];

// ─── Collections ──────────────────────────────────────────────────────────────

export const collections = mysqlTable("collections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  /** Custom extension tag e.g. ".manus", ".brand-kit" */
  extensionTag: varchar("extensionTag", { length: 64 }),
  tab: mysqlEnum("tab", TAB_NAMES).default("canvas").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Collection = typeof collections.$inferSelect;
export type InsertCollection = typeof collections.$inferInsert;

// ─── Assets ───────────────────────────────────────────────────────────────────

export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  collectionId: int("collectionId"),

  /** Logical tab this asset belongs to */
  tab: mysqlEnum("tab", TAB_NAMES).default("canvas").notNull(),

  /** Asset classification */
  type: mysqlEnum("type", ASSET_TYPES).notNull(),

  /** Human-readable label */
  title: varchar("title", { length: 512 }),

  /**
   * Primary clipboard payload — what gets copied on one-click:
   *  - color   → "#2b6cb0"
   *  - font    → base64 @font-face block
   *  - code    → raw source string
   *  - link    → raw URL string
   *  - media   → storage key or data-URI
   */
  primaryPayload: text("primaryPayload"),

  /** Fallback payload (base64 or raw binary string) */
  fallbackPayload: text("fallbackPayload"),

  /** S3/storage key for binary assets */
  storageKey: varchar("storageKey", { length: 1024 }),

  /** Storage URL for binary assets */
  storageUrl: text("storageUrl"),

  /** Canvas position and size */
  canvasX: int("canvasX").default(0),
  canvasY: int("canvasY").default(0),
  canvasZ: int("canvasZ").default(0),
  canvasWidth: int("canvasWidth").default(320),
  canvasHeight: int("canvasHeight").default(220),

  /** Render flags as JSON */
  renderFlags: json("renderFlags").$type<{
    isCompiled?: boolean;
    sandboxMode?: string;
  }>(),

  /** Extra metadata as JSON */
  meta: json("meta").$type<{
    mimeType?: string;
    fileSize?: number;
    colorRgba?: string;
    colorHex?: string;
    colorCmyk?: string;
    fontFamily?: string;
    customThumbnailUrl?: string;
    sourceUrl?: string;
  }>(),

  /** Sync state for local-first architecture */
  syncedAt: timestamp("syncedAt"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

// ─── Canvas Tabs (user-defined workspace tabs) ────────────────────────────────

export const canvasTabs = mysqlTable("canvas_tabs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  /** Viewport state persisted per tab */
  viewportX: int("viewportX").default(0),
  viewportY: int("viewportY").default(0),
  viewportZoom: bigint("viewportZoom", { mode: "number" }).default(100),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CanvasTab = typeof canvasTabs.$inferSelect;
export type InsertCanvasTab = typeof canvasTabs.$inferInsert;
