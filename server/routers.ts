import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import bcrypt from "bcryptjs";
import {
  createAsset,
  createCanvasTab,
  createCollection,
  createEmailUser,
  deleteAsset,
  deleteCollection,
  getAssetsByUser,
  getCanvasTabsByUser,
  getCollectionsByUser,
  getUserByEmail,
  updateAsset,
  updateUserLastSignedIn,
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

    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8, "Password must be at least 8 characters"),
        name: z.string().min(1).max(120),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists" });
        const passwordHash = await bcrypt.hash(input.password, 12);
        const user = await createEmailUser({ email: input.email, name: input.name, passwordHash });
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create account" });
        const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, user: { id: user.id, email: user.email, name: user.name } };
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        await updateUserLastSignedIn(user.id);
        const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, user: { id: user.id, email: user.email, name: user.name } };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  assets: assetRouter,
  collections: collectionRouter,
  canvasTabs: canvasTabRouter,

  // ── Feedback (public, no auth) ──────────────────────────────────────────────
  feedback: router({
    submit: publicProcedure
      .input(
        z.object({
          message: z.string().min(1).max(5000),
          email: z.string().email().optional(),
          name: z.string().max(100).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const content = [
          input.name ? `Name: ${input.name}` : null,
          input.email ? `Email: ${input.email}` : null,
          ``,
          input.message,
        ].filter(Boolean).join("\n");
        try {
          const { notifyOwner } = await import("./_core/notification");
          await notifyOwner({
            title: `[Feedback] ${input.email ?? "Anonymous"} — Moovas`,
            content,
          });
        } catch (e) {
          // Notification failure is non-fatal
          console.warn("[Feedback] Notification failed:", e);
        }
        return { success: true };
      }),
  }),

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

  // ── Waitlist (public, no auth) ─────────────────────────────────────────────
  waitlist: router({
    join: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          platform: z.enum(["macos", "ios", "both"]).default("both"),
          marketingConsent: z.boolean(),
        })
      )
      .mutation(async ({ input }) => {
        if (!input.marketingConsent) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You must agree to receive updates to join the waitlist.",
          });
        }
        const { addToWaitlist } = await import("./db");
        const result = await addToWaitlist({
          email: input.email,
          platform: input.platform,
          marketingConsent: 1,
        });
        if (result.alreadyExists) {
          return { success: true, alreadyOnList: true };
        }
        // Notify owner of new waitlist signup
        try {
          const { notifyOwner } = await import("./_core/notification");
          await notifyOwner({
            title: `[Waitlist] New signup: ${input.email}`,
            content: `Platform: ${input.platform}\nEmail: ${input.email}\nMarketing consent: yes`,
          });
        } catch (e) {
          console.warn("[Waitlist] Notification failed:", e);
        }
        return { success: true, alreadyOnList: false };
      }),
  }),
});

export type AppRouter = typeof appRouter;
