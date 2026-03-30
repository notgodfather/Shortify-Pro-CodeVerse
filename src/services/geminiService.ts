import { GoogleGenAI } from "@google/genai";

export interface AiScanResult {
  safetyScore: number;
  summary: string;
  isPhishing: boolean;
  category: string;
}

const FALLBACK: AiScanResult = {
  safetyScore: 100,
  summary: "AI insights unavailable — no API key configured.",
  isPhishing: false,
  category: "Unknown",
};

const NO_KEY_WARNING_SHOWN = { shown: false };

export async function scanUrlSafety(url: string): Promise<AiScanResult> {
  // Browser env — use VITE_ prefix (process.env is Node-only)
  const apiKey =
    (import.meta as any).env?.VITE_GEMINI_API_KEY ??
    (typeof process !== "undefined" ? (process.env?.GEMINI_API_KEY ?? "") : "");

  if (!apiKey) {
    if (!NO_KEY_WARNING_SHOWN.shown) {
      console.warn("[AI Scan] VITE_GEMINI_API_KEY not set — AI scan disabled.");
      NO_KEY_WARNING_SHOWN.shown = true;
    }
    return {
      ...FALLBACK,
      summary: "AI scan skipped — no API key set. Add VITE_GEMINI_API_KEY to your .env file.",
    };
  }

  // Quick client-side URL sanity check before hitting the API
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return {
        safetyScore: 0,
        summary: "URL has a non-HTTP protocol and cannot be scanned.",
        isPhishing: true,
        category: "Unknown",
      };
    }
  } catch {
    return {
      safetyScore: 0,
      summary: "The URL is malformed and could not be analysed.",
      isPhishing: true,
      category: "Unknown",
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Analyze this URL for safety. Return ONLY valid JSON with no markdown:
{ "safetyScore": <0-100>, "summary": <string>, "isPhishing": <boolean>, "category": <string> }
URL: ${url}`,
      config: { responseMimeType: "application/json" },
    });

    const text = response.text?.trim() ?? "";
    const clean = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(clean);

    return {
      safetyScore: typeof parsed.safetyScore === "number" ? Math.min(100, Math.max(0, parsed.safetyScore)) : 100,
      summary: parsed.summary ?? "No summary available.",
      isPhishing: parsed.isPhishing === true,
      category: parsed.category ?? "Unknown",
    };
  } catch (error) {
    console.error("[AI Scan] Error:", error);
    return { ...FALLBACK, summary: "AI scan failed. URL may still be safe." };
  }
}
