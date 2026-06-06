import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createAsset,
  createCanvasTab,
  createCollection,
  deleteAsset,
  deleteCollection,
  getAssetsByUser,
  getCanvasTabsByUser,
  getCollectionsByUser,
  updateAsset,
} from "./db";
import { scrapeUrl } from "./scraper";
import { storagePut } from "./storage";

// ─── Asset Router ─────────────────────────────────────────────────────────────

const assetRouter = router({
  list: protectedProcedure
    .input(z.object({ tab: z.string().optional() }))
    .query(({ ctx, input }) => getAssetsByUser(ctx.user.id, input.tab)),

  create: protectedProcedure
    .input(
      z.object({
        tab: z.enum(["canvas", "fonts", "colors", "code", "media", "bookmarks"]),
        type: z.enum(["link_preview", "shadow_dom", "plain_text", "font_package", "media_element", "raw_binary", "color"]),
        title: z.string().optional(),
        primaryPayload: z.string().optional(),
        fallbackPayload: z.string().optional(),
        storageKey: z.string().optional(),
        storageUrl: z.string().optional(),
        canvasX: z.number().optional(),
        canvasY: z.number().optional(),
        canvasZ: z.number().optional(),
        canvasWidth: z.number().optional(),
        canvasHeight: z.number().optional(),
        renderFlags: z.object({ isCompiled: z.boolean().optional(), sandboxMode: z.string().optional() }).optional(),
        meta: z.object({
          mimeType: z.string().optional(),
          fileSize: z.number().optional(),
          colorRgba: z.string().optional(),
          colorHex: z.string().optional(),
          colorCmyk: z.string().optional(),
          fontFamily: z.string().optional(),
          customThumbnailUrl: z.string().optional(),
          sourceUrl: z.string().optional(),
        }).optional(),
        collectionId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await createAsset({ ...input, userId: ctx.user.id });
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deleteAsset(input.id, ctx.user.id)),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        primaryPayload: z.string().optional(),
        canvasX: z.number().optional(),
        canvasY: z.number().optional(),
        canvasZ: z.number().optional(),
        canvasWidth: z.number().optional(),
        canvasHeight: z.number().optional(),
        collectionId: z.number().nullable().optional(),
        meta: z.object({
          mimeType: z.string().optional(),
          fileSize: z.number().optional(),
          colorRgba: z.string().optional(),
          colorHex: z.string().optional(),
          colorCmyk: z.string().optional(),
          fontFamily: z.string().optional(),
          customThumbnailUrl: z.string().optional(),
          sourceUrl: z.string().optional(),
        }).optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      const { id, ...updates } = input;
      return updateAsset(id, ctx.user.id, updates as any);
    }),

  /** Upload a binary asset (font, image, etc.) to S3 and create the asset record */
  uploadBinary: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        mimeType: z.string(),
        base64Data: z.string(),
        tab: z.enum(["canvas", "fonts", "colors", "code", "media", "bookmarks"]),
        type: z.enum(["link_preview", "shadow_dom", "plain_text", "font_package", "media_element", "raw_binary", "color"]),
        title: z.string().optional(),
        meta: z.object({
          fontFamily: z.string().optional(),
          fileSize: z.number().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.base64Data, "base64");
      const key = `users/${ctx.user.id}/assets/${Date.now()}_${input.fileName}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      const result = await createAsset({
        userId: ctx.user.id,
        tab: input.tab,
        type: input.type,
        title: input.title ?? input.fileName,
        storageKey: key,
        storageUrl: url,
        meta: { mimeType: input.mimeType, fileSize: buffer.length, ...input.meta },
      });
      return { ...result, storageUrl: url };
    }),
});

// ─── Collection Router ────────────────────────────────────────────────────────

const collectionRouter = router({
  list: protectedProcedure.query(({ ctx }) => getCollectionsByUser(ctx.user.id)),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      extensionTag: z.string().max(64).optional(),
      tab: z.enum(["canvas", "fonts", "colors", "code", "media", "bookmarks"]).optional(),
    }))
    .mutation(({ ctx, input }) =>
      createCollection({ ...input, userId: ctx.user.id })
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deleteCollection(input.id, ctx.user.id)),

  addAsset: protectedProcedure
    .input(z.object({ collectionId: z.number(), assetId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Record the asset→collection association via extensionTag on the asset
      const result = await updateAsset(input.assetId, ctx.user.id, {
        collectionId: input.collectionId,
      });
      return result;
    }),
});

// ─── Canvas Tab Router ────────────────────────────────────────────────────────

const canvasTabRouter = router({
  list: protectedProcedure.query(({ ctx }) => getCanvasTabsByUser(ctx.user.id)),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(255) }))
    .mutation(({ ctx, input }) => createCanvasTab(ctx.user.id, input.name)),
});

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  assets: assetRouter,
  collections: collectionRouter,
  canvasTabs: canvasTabRouter,

  scrape: router({
    url: protectedProcedure
      .input(z.object({ url: z.string().url() }))
      .mutation(async ({ input }) => {
        try {
          return await scrapeUrl(input.url);
        } catch (err: any) {
          throw new Error(err.message ?? "Scrape failed");
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
