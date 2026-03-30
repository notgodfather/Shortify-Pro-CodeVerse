/**
 * Centralized API Service Layer
 * All backend communication goes through here.
 * Set VITE_API_BASE_URL in .env to override the base (defaults to same origin).
 */

const BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined) ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  existing?: boolean; // true when the URL was already shortened
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) errorMsg = body.error;
    } catch {
      // ignore parse error
    }
    throw new Error(errorMsg);
  }
  return res.json() as Promise<T>;
}

// ─── URL Endpoints ────────────────────────────────────────────────────────────

export async function fetchUrls(userId?: string | null): Promise<UrlData[]> {
  const params = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const res = await fetch(`${BASE_URL}/api/urls${params}`);
  return handleResponse<UrlData[]>(res);
}

export async function shortenUrl(payload: ShortenPayload): Promise<ShortenResponse> {
  const res = await fetch(`${BASE_URL}/api/shorten`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<ShortenResponse>(res);
}

export async function deleteUrl(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/urls/${id}`, { method: "DELETE" });
  return handleResponse<void>(res);
}

// ─── Campaign Endpoints ───────────────────────────────────────────────────────

export async function fetchCampaigns(userId?: string | null): Promise<Campaign[]> {
  const params = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const res = await fetch(`${BASE_URL}/api/campaigns${params}`);
  return handleResponse<Campaign[]>(res);
}

export async function createCampaign(data: {
  name: string;
  description: string;
  userId?: string | null;
}): Promise<Campaign> {
  const res = await fetch(`${BASE_URL}/api/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Campaign>(res);
}
