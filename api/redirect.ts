/**
 * Vercel Serverless Function — Short URL Redirect + Click Tracking
 *
 * Handles:  GET /:shortId  (routed via vercel.json rewrites)
 *
 * Uses the Firebase client SDK with config embedded directly (same values
 * used by the Vite frontend — these are not secrets, they are safe to expose).
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore, collection, query, where, getDocs,
  doc, updateDoc, increment,
} from "firebase/firestore";

// ─── Firebase config (identical to firebase-applet-config.json) ───────────────
// The client SDK config is NOT a secret — it's already shipped inside the
// browser bundle. Safe to embed here.
const firebaseConfig = {
  apiKey: "AIzaSyBukvU56pYq7DRZe6YfA-JEzOxL7QY6ssg",
  authDomain: "shortify-pro-aeca1.firebaseapp.com",
  projectId: "shortify-pro-aeca1",
  storageBucket: "shortify-pro-aeca1.firebasestorage.app",
  messagingSenderId: "818804796233",
  appId: "1:818804796233:web:e067e82522e01618790898",
};

// Singleton — reuse across warm lambda invocations
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(firebaseApp);

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const shortId = (req.query.shortId as string) ?? "";

  if (!shortId || !/^[a-zA-Z0-9_-]{3,20}$/.test(shortId)) {
    return res.status(400).send("Invalid short ID.");
  }

  try {
    const q = query(collection(db, "urls"), where("shortId", "==", shortId));
    const snap = await getDocs(q);

    if (snap.empty) {
      return res.status(404).send(`
        <!DOCTYPE html><html><head>
          <title>Link Not Found – Shortify Pro</title><meta charset="utf-8">
          <style>
            body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;
                 min-height:100vh;margin:0;background:#f8f9fa}
            .box{text-align:center;padding:3rem;background:#fff;border-radius:1.5rem;
                 box-shadow:0 4px 40px rgba(0,0,0,.08);max-width:400px}
            .btn{display:inline-block;background:#6c63ff;color:#fff;padding:.75rem 2rem;
                 border-radius:.75rem;text-decoration:none;font-weight:700}
          </style>
        </head><body><div class="box">
          <div style="font-size:4rem">🔍</div>
          <h1>Link Not Found</h1>
          <p>The short link <strong>/${shortId}</strong> doesn't exist or may have been deleted.</p>
          <a class="btn" href="/">← Go to Shortify Pro</a>
        </div></body></html>
      `);
    }

    const urlDoc = snap.docs[0];
    const data = urlDoc.data();

    // Check expiry
    if (data.expiryDate && new Date(data.expiryDate) < new Date()) {
      return res.status(410).send(`
        <!DOCTYPE html><html><head><title>Link Expired – Shortify Pro</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:60px">
          <h1>⏰ This link has expired</h1>
          <p>The short link you followed is no longer active.</p>
          <a href="/">Go to Shortify Pro</a>
        </body></html>
      `);
    }

    // Track click non-blocking — don't delay the redirect
    updateDoc(doc(db, "urls", urlDoc.id), {
      clickCount: increment(1),
      clickHistory: [...(data.clickHistory || []), new Date().toISOString()],
    }).catch(() => {});

    // 302 = temporary; every visit is counted (no browser caching)
    return res.redirect(302, data.originalUrl);
  } catch (err) {
    console.error("Redirect error:", err);
    return res.status(500).send("Internal Server Error");
  }
}
