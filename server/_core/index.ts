import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import path from "path";
import { notifyOwner } from "./notification";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);

  // ── /api/collab — Let's Collaborate form (no auth required) ──────────────
  app.post("/api/collab", async (req, res) => {
    try {
      const { email, phone, subject, message, timeframe } = req.body as {
        email: string;
        phone?: string;
        subject: string;
        message: string;
        timeframe: string;
      };
      if (!email || !subject || !message || !timeframe) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }
      const content = [
        `From: ${email}`,
        phone ? `Phone: ${phone}` : null,
        `Subject: ${subject}`,
        `Timeframe: ${timeframe}`,
        ``,
        message,
      ].filter(Boolean).join("\n");
      await notifyOwner({
        title: `[URGENT] Collab Inquiry — ${subject}`,
        content,
      });
      res.json({ success: true });
    } catch (err) {
      console.error("[Collab] Error:", err);
      res.status(500).json({ error: "Failed to send" });
    }
  });

  // ── /deck — Serve the moovas-deck static site ─────────────────────────────
  const deckDir = path.join(process.cwd(), "moovas-deck");
  app.use("/deck", express.static(deckDir));
  app.get("/deck", (_req, res) => res.sendFile(path.join(deckDir, "index.html")));

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
