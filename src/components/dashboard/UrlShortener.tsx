import React, { useState, useEffect } from "react";
import {
  Link2, Zap, Calendar,
  ChevronDown, Globe, Copy, Check, ExternalLink, AlertCircle, Tag, Megaphone,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { shortenUrl, fetchCampaigns, type ShortenPayload, type Campaign } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

interface UrlShortenerProps {
  onShortened: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const categories = ["General", "Social", "Work", "Marketing", "Personal"] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function UrlShortener({ onShortened }: UrlShortenerProps) {
  const { user, fetchUserId } = useAuth();
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [category, setCategory] = useState("General");
  const [nickname, setNickname] = useState("");
  const [customShortId, setCustomShortId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [shortenedResult, setShortenedResult] = useState<{ url: string; existing: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(true); // open by default

  // Load campaigns for the dropdown
  useEffect(() => {
    fetchCampaigns(fetchUserId)
      .then(setCampaigns)
      .catch(() => {}); // silent fail — campaigns are optional
  }, [fetchUserId]);

  // ── Validation ──────────────────────────────────────────────────────────────

  const validateUrl = (value: string): boolean => {
    if (!value.trim()) { setUrlError("Please enter a URL."); return false; }
    if (!isValidUrl(value)) { setUrlError("Please enter a valid URL starting with http:// or https://"); return false; }
    setUrlError(null);
    return true;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrl(val);
    if (urlError) validateUrl(val);
  };

  // ── Copy ────────────────────────────────────────────────────────────────────

  const handleCopy = async () => {
    if (!shortenedResult) return;
    try {
      await navigator.clipboard.writeText(shortenedResult.url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shortenedResult.url;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  // ── Shorten ─────────────────────────────────────────────────────────────────

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUrl(url)) return;

    setLoading(true);
    try {
      const payload: ShortenPayload = {
        originalUrl: url,
        category,
        nickname: nickname.trim() || undefined,
        customShortId: customShortId.trim() || undefined,
        expiryDate: expiryDate || undefined,
        campaignId: campaignId || undefined,
        userId: fetchUserId,
      };

      const data = await shortenUrl(payload);
      const fullUrl = `${window.location.origin}/${data.shortId}`;
      setShortenedResult({ url: fullUrl, existing: data.existing ?? false });

      if (data.existing) {
        toast.info("This URL was already shortened — returning your existing link.", { duration: 4000 });
      } else {
        toast.success("URL shortened successfully! 🎉");
      }

      // Reset form
      setUrl(""); setUrlError(null);
      setNickname(""); setCustomShortId("");
      setExpiryDate(""); setCampaignId("");
      onShortened();
    } catch (error: any) {
      toast.error(error?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Display-friendly version: strip protocol
  const getDisplayUrl = (fullUrl: string) => {
    try { const u = new URL(fullUrl); return `${u.hostname}${u.pathname}`; }
    catch { return fullUrl; }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <section className="mb-12">
      <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-xl shadow-primary/5 border border-outline-variant/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Zap className="text-primary" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-on-surface">Create New Link</h2>
        </div>

        <form onSubmit={handleShorten} className="space-y-6" noValidate>
          {/* URL Input */}
          <div className="space-y-2">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40">
                <Globe size={20} />
              </div>
              <input
                id="url-input"
                type="url"
                placeholder="Paste your long URL here (e.g., https://example.com/very-long-path)"
                className={`w-full bg-surface-container-high border-none rounded-2xl py-4 pl-12 pr-4 text-on-surface focus:ring-2 transition-all ${
                  urlError ? "ring-2 ring-error focus:ring-error" : "focus:ring-primary/50"
                }`}
                value={url}
                onChange={handleUrlChange}
                onBlur={() => url && validateUrl(url)}
                autoComplete="url"
              />
            </div>

            {/* Inline validation error */}
            <AnimatePresence>
              {urlError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 text-sm text-error font-medium pl-1"
                >
                  <AlertCircle size={14} />
                  {urlError}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Advanced Options Toggle */}
          <div className="flex items-center justify-between">
            <motion.button
              type="button"
              id="toggle-advanced-btn"
              onClick={() => setShowAdvanced(!showAdvanced)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.97 }}
              className="text-sm font-bold text-primary flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <motion.span
                animate={{ rotate: showAdvanced ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="inline-flex"
              >
                <ChevronDown size={16} />
              </motion.span>
              {showAdvanced ? "Hide Options" : "Show Options"}
              {(nickname || customShortId || expiryDate || campaignId) && (
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}
            </motion.button>
          </div>

          {/* Advanced Fields */}
          <AnimatePresence initial={false}>
            {showAdvanced && (
              <motion.div
                key="advanced"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: "hidden" }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">

                  {/* Category */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 mb-2 ml-1">
                      <Tag size={12} /> Category
                    </label>
                    <div className="relative">
                      <select
                        className="w-full bg-surface-container-high border-none rounded-2xl py-3 px-4 text-on-surface appearance-none focus:ring-2 focus:ring-primary/50 transition-all"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" size={16} />
                    </div>
                  </div>

                  {/* Nickname (optional friendly label) */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 mb-2 ml-1">
                      Nickname (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., My Portfolio Link"
                      className="w-full bg-surface-container-high border-none rounded-2xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 transition-all"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      maxLength={60}
                    />
                  </div>

                  {/* Custom ID */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 mb-2 ml-1">
                      Custom ID (optional)
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-sm font-mono">/</div>
                      <input
                        type="text"
                        placeholder="my-cool-link"
                        className="w-full bg-surface-container-high border-none rounded-2xl py-3 pl-8 pr-4 text-on-surface focus:ring-2 focus:ring-primary/50 transition-all"
                        value={customShortId}
                        onChange={(e) => setCustomShortId(e.target.value.replace(/\s/g, "-").toLowerCase())}
                        pattern="[a-z0-9\-]+"
                        title="Lowercase letters, numbers and hyphens only"
                      />
                    </div>
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 mb-2 ml-1">
                      <Calendar size={12} /> Expiry Date (optional)
                    </label>
                    <input
                      type="date"
                      className="w-full bg-surface-container-high border-none rounded-2xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 transition-all"
                      value={expiryDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>

                  {/* Campaign (full width) */}
                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 mb-2 ml-1">
                      <Megaphone size={12} /> Add to Campaign (optional)
                    </label>
                    <div className="relative">
                      <select
                        className="w-full bg-surface-container-high border-none rounded-2xl py-3 px-4 text-on-surface appearance-none focus:ring-2 focus:ring-primary/50 transition-all"
                        value={campaignId}
                        onChange={(e) => setCampaignId(e.target.value)}
                      >
                        <option value="">— No campaign —</option>
                        {campaigns.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                        {campaigns.length === 0 && (
                          <option disabled value="">No campaigns yet — create one in the Campaigns tab</option>
                        )}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" size={16} />
                    </div>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button
            type="submit"
            id="shorten-btn"
            disabled={loading}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
          >
            {loading ? (
              <div className="w-6 h-6 border-[3px] border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Shorten URL <Zap size={20} /></>
            )}
          </button>
        </form>

        {/* Result Card */}
        <AnimatePresence>
          {shortenedResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className={`mt-8 p-6 rounded-3xl border ${
                shortenedResult.existing
                  ? "bg-amber-500/5 border-amber-500/20"
                  : "bg-primary/5 border-primary/20"
              }`}
            >
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${
                shortenedResult.existing ? "text-amber-500" : "text-primary/60"
              }`}>
                {shortenedResult.existing ? "♻️ Already shortened — returning existing link" : "✅ Your shortened link is ready"}
              </p>

              {/* URL display pill */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                <div className="flex-1 flex items-center gap-3 bg-white border border-primary/20 rounded-2xl px-4 py-3 min-w-0">
                  <Link2 className="text-primary flex-shrink-0" size={20} />
                  <input
                    readOnly
                    value={getDisplayUrl(shortenedResult.url)}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="flex-1 font-mono font-bold text-on-surface text-base bg-transparent border-none outline-none focus:ring-0 cursor-text min-w-0 select-all"
                    title="Click to select all"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="copy-result-btn"
                    onClick={handleCopy}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-outline-variant/10 px-5 py-3 rounded-2xl font-bold text-sm hover:bg-surface-container-high transition-all active:scale-95 min-w-[110px]"
                  >
                    {copied ? <Check size={17} className="text-green-500" /> : <Copy size={17} />}
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                  <a
                    href={shortenedResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    id="visit-link-btn"
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl font-bold text-sm hover:bg-primary/90 transition-all active:scale-95 min-w-[100px]"
                  >
                    Test Link
                    <ExternalLink size={17} />
                  </a>
                </div>
              </div>

              <p className="text-[11px] text-on-surface-variant/50 mt-3">
                🔗 Clicking "Test Link" opens a new tab and redirects to the original URL.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
