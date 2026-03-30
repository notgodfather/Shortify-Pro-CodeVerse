import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { nanoid } from "nanoid";

import { initializeApp as initializeClientApp } from "firebase/app";
import {
  getFirestore as getClientFirestore,
  collection, addDoc, query, where, getDocs,
  updateDoc, doc, increment, serverTimestamp, deleteDoc,
} from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

const clientApp = initializeClientApp(firebaseConfig);
const db = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId);

// ─── Simple in-memory rate limiter ──────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return false; // not limited
  }
  entry.count++;
  return entry.count > maxRequests;
}

// ─── URL security validator ──────────────────────────────────────────────────
const BLOCKED_SCHEMES = ["javascript:", "data:", "vbscript:", "file:", "blob:"];

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const scheme = parsed.protocol.toLowerCase();
    if (BLOCKED_SCHEMES.some(b => scheme.startsWith(b.replace(":", "")))) return false;
    return scheme === "http:" || scheme === "https:";
  } catch {
    return false;
  }
}

// ─── Short ID regex ──────────────────────────────────────────────────────────
const SHORT_ID_RE = /^[a-zA-Z0-9_-]{3,20}$/;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors({ origin: true, credentials: true }));
  app.use(
    helmet({
      contentSecurityPolicy: false,           // Disabled for dev/Vite compat
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }, // Required for Firebase popup auth
    })
  );
  app.use(morgan("dev"));
  app.use(express.json({ limit: "10kb" })); // protect against large payloads

  // ─── Firestore connection check ──────────────────────────────────────────
  try {
    await getDocs(query(collection(db, "urls"), where("shortId", "==", "__test__")));
    console.log("✅ Firestore connected.");
  } catch (error) {
    console.error("❌ Firestore connection failed:", error);
  }

  // ─── API: Shorten URL ────────────────────────────────────────────────────
  app.post("/api/shorten", async (req, res) => {
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    if (rateLimit(ip, 30, 60_000)) {
      return res.status(429).json({ error: "Too many requests. Please slow down." });
    }

    const { originalUrl, category, customShortId, expiryDate, campaignId, nickname, userId } = req.body;

    // Security: validate URL
    if (!originalUrl || !isSafeUrl(originalUrl)) {
      return res.status(400).json({ error: "Invalid or unsafe URL. Only http:// and https:// URLs are allowed." });
    }

    // Security: sanitize customShortId
    if (customShortId && !/^[a-zA-Z0-9_-]{3,20}$/.test(customShortId)) {
      return res.status(400).json({ error: "Custom ID must be 3–20 alphanumeric characters (hyphens/underscores allowed)." });
    }

    try {
      // ── Dedup: return existing short link if same URL + user already exists ──
      if (!customShortId) {
        const existingQ = userId
          ? query(collection(db, "urls"), where("originalUrl", "==", originalUrl), where("userId", "==", userId))
          : query(collection(db, "urls"), where("originalUrl", "==", originalUrl));
        const existingSnap = await getDocs(existingQ);
        if (!existingSnap.empty) {
          const ex = existingSnap.docs[0];
          const exData = ex.data();
          console.log(`[Shorten] Returning existing shortId "${exData.shortId}" for URL: ${originalUrl}`);
          return res.json({ id: ex.id, shortId: exData.shortId, originalUrl, category: exData.category, existing: true });
        }
      }

      // Check if custom shortId is already taken
      if (customShortId) {
        const q = query(collection(db, "urls"), where("shortId", "==", customShortId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          return res.status(400).json({ error: "Custom short ID already taken. Please choose another." });
        }
      }

      const shortId = customShortId || nanoid(6);
      const urlDoc = {
        originalUrl,
        shortId,
        clickCount: 0,
        clickHistory: [],
        createdAt: serverTimestamp(),
        category: category || "General",
        nickname: nickname?.trim() || null,
        expiryDate: expiryDate || null,
        campaignId: campaignId || null,
        aiInsights: null,
        userId: userId || null,
      };

      const docRef = await addDoc(collection(db, "urls"), urlDoc);
      res.json({ id: docRef.id, shortId, originalUrl, category: urlDoc.category, nickname: urlDoc.nickname });
    } catch (error) {
      console.error("Error shortening URL:", error);
      res.status(500).json({ error: "Failed to shorten URL. Please try again." });
    }
  });

  // ─── API: Get all URLs (optionally filter by userId) ────────────────────
  app.get("/api/urls", async (req, res) => {
    try {
      const { userId } = req.query;
      let q;
      if (userId && typeof userId === "string") {
        q = query(collection(db, "urls"), where("userId", "==", userId));
      } else {
        q = collection(db, "urls");
      }
      const snapshot = await getDocs(q);
      const urls = snapshot.docs.map(d => {
        const data = d.data() as Record<string, any>;
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          clickHistory: data.clickHistory || [],
        };
      });
      res.json(urls);
    } catch (error) {
      console.error("Error fetching URLs:", error);
      res.status(500).json({ error: "Failed to fetch URLs." });
    }
  });

  // ─── API: Update URL ─────────────────────────────────────────────────────
  app.patch("/api/urls/:id", async (req, res) => {
    const { id } = req.params;
    const ALLOWED_FIELDS = ["category", "nickname", "expiryDate", "aiInsights", "campaignId"];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => ALLOWED_FIELDS.includes(k))
    );
    try {
      await updateDoc(doc(db, "urls", id), updates);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating URL:", error);
      res.status(500).json({ error: "Failed to update URL." });
    }
  });

  // ─── API: Delete URL ─────────────────────────────────────────────────────
  app.delete("/api/urls/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await deleteDoc(doc(db, "urls", id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting URL:", error);
      res.status(500).json({ error: "Failed to delete URL." });
    }
  });

  // ─── API: Get Campaigns ──────────────────────────────────────────────────
  app.get("/api/campaigns", async (req, res) => {
    try {
      const { userId } = req.query;
      let q;
      if (userId && typeof userId === "string") {
        q = query(collection(db, "campaigns"), where("userId", "==", userId));
      } else {
        q = collection(db, "campaigns");
      }
      const snapshot = await getDocs(q);
      const campaigns = snapshot.docs.map(d => {
        const data = d.data() as Record<string, any>;
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
      });
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ error: "Failed to fetch campaigns." });
    }
  });

  // ─── API: Create Campaign ────────────────────────────────────────────────
  app.post("/api/campaigns", async (req, res) => {
    const { name, description, status, userId } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Campaign name is required." });
    }
    try {
      const campaignDoc = {
        name: name.trim().slice(0, 100), // cap length
        description: (description || "").slice(0, 500),
        status: status || "active",
        createdAt: serverTimestamp(),
        userId: userId || null,
      };
      const docRef = await addDoc(collection(db, "campaigns"), campaignDoc);
      res.json({ id: docRef.id, ...campaignDoc });
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ error: "Failed to create campaign." });
    }
  });

  // ─── SHORT URL REDIRECT (:shortId) ──────────────────────────────────────
  // IMPORTANT: This MUST be registered BEFORE vite.middlewares.
  // In SPA/middlewareMode, Vite intercepts ALL browser HTML requests and
  // returns index.html — the redirect would never fire if Vite came first.
  app.get("/:shortId", async (req, res, next) => {
    const { shortId } = req.params;

    // Pass through anything that isn't a valid short ID format
    if (
      !SHORT_ID_RE.test(shortId) ||
      shortId.startsWith("@") ||
      shortId.startsWith("_") ||
      shortId.startsWith("src") ||
      shortId.startsWith("api") ||
      shortId.startsWith("node_modules") ||
      shortId.includes(".")
    ) {
      return next();
    }

    try {
      console.log(`[Redirect] Looking up shortId: "${shortId}"`);
      const q = query(collection(db, "urls"), where("shortId", "==", shortId));
      const snapshot = await getDocs(q);
      console.log(`[Redirect] Found ${snapshot.size} doc(s) for shortId: "${shortId}"`);

      if (snapshot.empty) {
        // Show a proper 404 page — do NOT call next() which would serve React
        // and confusingly show the login page for every broken/unknown link.
        return res.status(404).send(`
          <!DOCTYPE html><html><head>
            <title>Link Not Found – Shortify Pro</title>
            <meta charset="utf-8">
            <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8f9fa;color:#1a1a2e}.box{text-align:center;padding:3rem;background:#fff;border-radius:1.5rem;box-shadow:0 4px 40px rgba(0,0,0,.08);max-width:400px}.icon{font-size:4rem;margin-bottom:1rem}.title{font-size:1.75rem;font-weight:800;margin-bottom:.5rem}.sub{color:#666;margin-bottom:1.5rem;font-size:.95rem}.btn{display:inline-block;background:#6c63ff;color:#fff;padding:.75rem 2rem;border-radius:.75rem;text-decoration:none;font-weight:700;transition:opacity .2s}.btn:hover{opacity:.85}</style>
          </head><body><div class="box">
            <div class="icon">🔍</div>
            <h1 class="title">Link Not Found</h1>
            <p class="sub">The short link <strong>/${shortId}</strong> doesn't exist or may have been deleted.</p>
            <a class="btn" href="/">← Go to Shortify Pro</a>
          </div></body></html>
        `);
      }

      const urlDoc = snapshot.docs[0];
      const data = urlDoc.data();

      // Check expiry
      if (data.expiryDate && new Date(data.expiryDate) < new Date()) {
        return res.status(410).send(`
          <html><head><title>Link Expired</title></head>
          <body style="font-family:sans-serif;text-align:center;padding:60px">
            <h1>⏰ This link has expired</h1>
            <p>The short link you followed is no longer active.</p>
            <a href="/">Go to Shortify Pro</a>
          </body></html>
        `);
      }

      // Track click non-blocking so redirect is instant
      updateDoc(doc(db, "urls", urlDoc.id), {
        clickCount: increment(1),
        clickHistory: [...(data.clickHistory || []), new Date().toISOString()],
      }).catch(err => console.error("Click tracking error:", err));

      // 302 = temporary redirect; every visit hits the server (enables analytics)
      return res.redirect(302, data.originalUrl);
    } catch (error) {
      console.error("Redirect error:", error);
      return res.status(500).send("Internal Server Error");
    }
  });

  // ─── Vite Dev Middleware (SPA) — must come AFTER /:shortId ──────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running → http://localhost:${PORT}`);
  });
}

startServer();
