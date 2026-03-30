/**
 * Centralized Data Service Layer — Firestore Direct SDK
 *
 * Previously called an Express backend (/api/*). Now queries Firestore
 * directly from the client so the app works on Vercel (or any static host)
 * without a separate server. All logic that lived in server.ts is replicated
 * here with the same validation rules.
 */

import {
  collection, addDoc, getDocs, deleteDoc,
  doc, query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import { nanoid } from "nanoid";
import { db } from "../lib/firebase";

// ─── Types (unchanged — nothing in the rest of the app needs to change) ────────

export interface UrlData {
  id: string;
  originalUrl: string;
  shortId: string;
  clickCount: number;
  clickHistory: string[];
  createdAt: string;
  category: string;
  nickname?: string | null;
  expiryDate?: string | null;
  campaignId?: string | null;
  userId?: string | null;
  aiInsights?: {
    summary: string;
    safetyScore: number;
    isPhishing: boolean;
  } | null;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "completed";
  createdAt: string;
  userId?: string | null;
}

export interface ShortenPayload {
  originalUrl: string;
  category?: string;
  nickname?: string;
  customShortId?: string;
  expiryDate?: string;
  campaignId?: string;
  userId?: string | null;
}

export interface ShortenResponse {
  id: string;
  shortId: string;
  originalUrl: string;
  category: string;
  nickname?: string | null;
  existing?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BLOCKED_SCHEMES = ["javascript:", "data:", "vbscript:", "file:", "blob:"];

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const scheme = parsed.protocol.toLowerCase();
    if (BLOCKED_SCHEMES.some((b) => scheme.startsWith(b.replace(":", "")))) return false;
    return scheme === "http:" || scheme === "https:";
  } catch {
    return false;
  }
}

/** Convert a Firestore document data map into a UrlData object. */
function docToUrlData(id: string, data: Record<string, any>): UrlData {
  return {
    id,
    originalUrl: data.originalUrl,
    shortId: data.shortId,
    clickCount: data.clickCount ?? 0,
    clickHistory: data.clickHistory ?? [],
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    category: data.category ?? "General",
    nickname: data.nickname ?? null,
    expiryDate: data.expiryDate ?? null,
    campaignId: data.campaignId ?? null,
    userId: data.userId ?? null,
    aiInsights: data.aiInsights ?? null,
  };
}

/** Convert a Firestore document data map into a Campaign object. */
function docToCampaign(id: string, data: Record<string, any>): Campaign {
  return {
    id,
    name: data.name,
    description: data.description ?? "",
    status: data.status ?? "active",
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    userId: data.userId ?? null,
  };
}

// ─── URL Operations ───────────────────────────────────────────────────────────

/** Fetch all URLs, optionally filtered to a specific user. */
export async function fetchUrls(userId?: string | null): Promise<UrlData[]> {
  let q;
  if (userId) {
    q = query(collection(db, "urls"), where("userId", "==", userId));
  } else {
    q = query(collection(db, "urls"), orderBy("createdAt", "desc"));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToUrlData(d.id, d.data() as Record<string, any>));
}

/**
 * Shorten a URL.
 * Validates input, deduplicates by (originalUrl + userId), generates a
 * nanoid short ID (or uses the caller-supplied customShortId), then writes
 * to Firestore.
 */
export async function shortenUrl(payload: ShortenPayload): Promise<ShortenResponse> {
  const { originalUrl, category, nickname, customShortId, expiryDate, campaignId, userId } = payload;

  // ── Validate ──────────────────────────────────────────────────────────────
  if (!originalUrl || !isSafeUrl(originalUrl)) {
    throw new Error("Invalid or unsafe URL. Only http:// and https:// URLs are allowed.");
  }
  if (customShortId && !/^[a-zA-Z0-9_-]{3,20}$/.test(customShortId)) {
    throw new Error("Custom ID must be 3–20 alphanumeric characters (hyphens/underscores allowed).");
  }

  // ── Dedup: return existing link if same URL + user combo already exists ───
  if (!customShortId) {
    const existingQ = userId
      ? query(collection(db, "urls"), where("originalUrl", "==", originalUrl), where("userId", "==", userId))
      : query(collection(db, "urls"), where("originalUrl", "==", originalUrl));
    const existingSnap = await getDocs(existingQ);
    if (!existingSnap.empty) {
      const ex = existingSnap.docs[0];
      const exData = ex.data() as Record<string, any>;
      return {
        id: ex.id,
        shortId: exData.shortId,
        originalUrl,
        category: exData.category,
        nickname: exData.nickname ?? null,
        existing: true,
      };
    }
  }

  // ── Check custom shortId collision ────────────────────────────────────────
  if (customShortId) {
    const collisionQ = query(collection(db, "urls"), where("shortId", "==", customShortId));
    const colSnap = await getDocs(collisionQ);
    if (!colSnap.empty) {
      throw new Error("Custom short ID already taken. Please choose another.");
    }
  }

  // ── Write to Firestore ────────────────────────────────────────────────────
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
  return { id: docRef.id, shortId, originalUrl, category: urlDoc.category, nickname: urlDoc.nickname };
}

/** Hard-delete a URL document by its Firestore document ID. */
export async function deleteUrl(id: string): Promise<void> {
  await deleteDoc(doc(db, "urls", id));
}

// ─── Campaign Operations ──────────────────────────────────────────────────────

/** Fetch all campaigns, optionally filtered to a specific user. */
export async function fetchCampaigns(userId?: string | null): Promise<Campaign[]> {
  let q;
  if (userId) {
    q = query(collection(db, "campaigns"), where("userId", "==", userId));
  } else {
    q = query(collection(db, "campaigns"), orderBy("createdAt", "desc"));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToCampaign(d.id, d.data() as Record<string, any>));
}

/** Create a new campaign document. */
export async function createCampaign(data: {
  name: string;
  description: string;
  userId?: string | null;
}): Promise<Campaign> {
  if (!data.name?.trim()) throw new Error("Campaign name is required.");
  const campaignDoc = {
    name: data.name.trim().slice(0, 100),
    description: (data.description || "").slice(0, 500),
    status: "active" as const,
    createdAt: serverTimestamp(),
    userId: data.userId || null,
  };
  const docRef = await addDoc(collection(db, "campaigns"), campaignDoc);
  return {
    id: docRef.id,
    ...campaignDoc,
    createdAt: new Date().toISOString(), // serverTimestamp() hasn't resolved yet
  };
}
