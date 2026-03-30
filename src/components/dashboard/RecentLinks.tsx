import { useState, useEffect, useMemo } from "react";
import {
  Copy, ExternalLink, Check, Trash2, BarChart3,
  Search, Filter, ArrowUpDown, Calendar, QrCode,
  Download, ShieldAlert,
  Clock, TrendingUp, MousePointer2, Tag, Link2, AlertTriangle, RefreshCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { QRCodeSVG } from "qrcode.react";
import { fetchUrls, deleteUrl, type UrlData } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

interface RecentLinksProps {
  onRefresh: () => void;
  showOnlyAnalytics?: boolean;
  globalSearch?: string;
  key?: any;
}

export default function RecentLinks({ onRefresh, showOnlyAnalytics = false, globalSearch = "" }: RecentLinksProps) {
  const { user, fetchUserId } = useAuth();
  const [links, setLinks] = useState<UrlData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"newest" | "clicks">("newest");
  const [selectedLink, setSelectedLink] = useState<UrlData | null>(null);
  const [showQr, setShowQr] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadLinks = async () => {
    try {
      setError(null);
      const data = await fetchUrls(fetchUserId);
      setLinks(data);
    } catch (err: any) {
      console.error("Error fetching links:", err);
      setError(err?.message ?? "Failed to load links.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
    const interval = setInterval(loadLinks, 10000);
    return () => clearInterval(interval);
  }, [fetchUserId]);

  const handleDelete = async (id: string) => {
    try {
      await deleteUrl(id);
      toast.success("Link deleted successfully");
      setDeletingId(null);
      setLinks(prev => prev.filter(l => l.id !== id));
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete link");
    }
  };

  const copyToClipboard = (shortId: string, id: string) => {
    const fullUrl = `${window.location.origin}/${shortId}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    toast.success("Link copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Merge Navbar global search with local panel search
  const activeSearch = globalSearch || search;

  const filteredLinks = useMemo(() => {
    return links
      .filter(link => {
        const q = activeSearch.toLowerCase();
        const matchesSearch = !q ||
          link.originalUrl.toLowerCase().includes(q) ||
          link.shortId.toLowerCase().includes(q) ||
          link.category.toLowerCase().includes(q) ||
          (link.nickname?.toLowerCase().includes(q) ?? false);
        const matchesCategory = categoryFilter === "All" || link.category === categoryFilter;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return b.clickCount - a.clickCount;
      });
  }, [links, activeSearch, categoryFilter, sortBy]);

  const exportToCsv = () => {
    const headers = ["Original URL,Short URL,Clicks,Category,Created At"];
    const rows = filteredLinks.map(link =>
      `"${link.originalUrl}","${window.location.origin}/${link.shortId}",${link.clickCount},"${link.category}","${link.createdAt}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(csvContent);
    const a = document.createElement("a");
    a.setAttribute("href", encodedUri);
    a.setAttribute("download", `links_export_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getChartData = (history: string[]) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return format(d, "MMM dd");
    }).reverse();
    return last7Days.map(day => ({
      name: day,
      clicks: history.filter(ts => format(new Date(ts), "MMM dd") === day).length,
    }));
  };

  // ── Loading / Error states ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-on-surface-variant animate-pulse">Loading your links...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 bg-surface-container-lowest rounded-3xl border border-dashed border-outline-variant/20">
        <div className="bg-error/10 p-4 rounded-full">
          <AlertTriangle size={40} className="text-error" />
        </div>
        <h3 className="text-xl font-bold text-on-surface">Could not load links</h3>
        <p className="text-on-surface-variant/60 text-sm max-w-xs text-center">{error}</p>
        <button
          onClick={() => { setLoading(true); loadLinks(); }}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all active:scale-95"
        >
          <RefreshCcw size={16} />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header / Stats */}
      {!showOnlyAnalytics && !globalSearch && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
            <div className="flex items-center gap-4 mb-2">
              <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500">
                <MousePointer2 size={20} />
              </div>
              <span className="text-sm font-bold text-on-surface-variant/60 uppercase">Total Clicks</span>
            </div>
            <div className="text-3xl font-bold">{links.reduce((acc, curr) => acc + curr.clickCount, 0)}</div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
            <div className="flex items-center gap-4 mb-2">
              <div className="bg-green-500/10 p-2 rounded-lg text-green-500">
                <TrendingUp size={20} />
              </div>
              <span className="text-sm font-bold text-on-surface-variant/60 uppercase">Active Links</span>
            </div>
            <div className="text-3xl font-bold">{links.length}</div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
            <div className="flex items-center gap-4 mb-2">
              <div className="bg-purple-500/10 p-2 rounded-lg text-purple-500">
                <Tag size={20} />
              </div>
              <span className="text-sm font-bold text-on-surface-variant/60 uppercase">Top Category</span>
            </div>
            <div className="text-3xl font-bold">
              {Object.entries(links.reduce((acc: any, curr) => {
                acc[curr.category] = (acc[curr.category] || 0) + 1;
                return acc;
              }, {})).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || "None"}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      {!globalSearch && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={18} />
          <input
            type="text"
            placeholder="Search links or IDs..."
            className="w-full bg-surface-container-high border-none rounded-xl py-2.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-surface-container-high px-3 py-2 rounded-xl">
            <Filter size={16} className="text-on-surface-variant/60" />
            <select
              className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All">All Categories</option>
              {["General", "Social", "Work", "Marketing", "Personal"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-high px-3 py-2 rounded-xl">
            <ArrowUpDown size={16} className="text-on-surface-variant/60" />
            <select
              className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="newest">Newest</option>
              <option value="clicks">Most Clicks</option>
            </select>
          </div>
          <button
            onClick={exportToCsv}
            className="p-2.5 bg-surface-container-high hover:bg-primary/10 text-primary rounded-xl transition-colors"
            title="Export to CSV"
          >
            <Download size={20} />
          </button>
        </div>
      </div>
      )}

      {/* Links List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredLinks.map((link) => (
            <motion.div
              layout
              key={link.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 overflow-hidden hover:border-primary/20 transition-colors group"
            >
              <div className="p-5 space-y-3">

                {/* Row 1: Category badge + original URL + meta */}
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary text-[10px] uppercase tracking-wider rounded-full">
                      <Tag size={11} />
                      <span className="font-bold">{link.category}</span>
                      {link.nickname && (
                        <>
                          <span className="opacity-30 px-0.5 mt-[-1px]">|</span>
                          <span className="font-black tracking-normal text-primary">{link.nickname}</span>
                        </>
                      )}
                    </div>
                    {link.expiryDate && (
                      <span className={`flex items-center gap-1 text-[10px] font-bold uppercase ${new Date(link.expiryDate) < new Date() ? 'text-red-500' : 'text-orange-500'}`}>
                        <Clock size={11} />
                        {new Date(link.expiryDate) < new Date() ? 'Expired' : `Expires ${format(new Date(link.expiryDate), "MMM dd")}`}
                      </span>
                    )}
                    {link.aiInsights?.isPhishing && (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                        <ShieldAlert size={11} />
                        High Risk
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-on-surface break-all line-clamp-1 group-hover:line-clamp-none transition-all duration-300 cursor-default leading-snug">
                    {link.originalUrl}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-on-surface-variant/50">
                    <div className="flex items-center gap-1"><Calendar size={12} />{format(new Date(link.createdAt), "MMM dd, yyyy")}</div>
                    <div className="flex items-center gap-1"><BarChart3 size={12} />{link.clickCount} clicks</div>
                  </div>
                </div>

                {/* Row 2: Short link pill + action buttons — same flex row */}
                <div className="flex flex-wrap items-center gap-2">

                  {/* Short link pill — full URL in a selectable readonly input */}
                  <div className="flex items-center bg-surface-container-high rounded-2xl pl-3 pr-1 py-1.5 border border-outline-variant/5 flex-1 min-w-0">
                    <input
                      readOnly
                      value={`${window.location.host}/${link.shortId}`}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="flex-1 min-w-0 font-mono font-bold text-on-surface text-sm bg-transparent border-none outline-none focus:ring-0 cursor-text select-all p-0"
                      title="Click to select · Ctrl+C to copy"
                    />
                    <div className="flex items-center gap-0.5 ml-auto flex-shrink-0">
                      <button
                        onClick={() => copyToClipboard(link.shortId, link.id)}
                        className="p-1.5 hover:bg-white/80 rounded-xl transition-colors text-on-surface-variant"
                        title="Copy full link"
                      >
                        {copiedId === link.id
                          ? <Check size={14} className="text-green-500" />
                          : <Copy size={14} />}
                      </button>
                      <a
                        href={`/${link.shortId}`}
                        target="_blank"
                        className="p-1.5 hover:bg-white/80 rounded-xl transition-colors text-on-surface-variant"
                        title="Open short link"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <AnimatePresence mode="wait">
                      {deletingId === link.id ? (
                        <motion.div
                          key="confirm"
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.92 }}
                          transition={{ duration: 0.14 }}
                          className="flex items-center gap-1.5 bg-red-500/10 px-1.5 py-1 rounded-2xl border border-red-500/20"
                        >
                          <button onClick={() => handleDelete(link.id)} className="px-3 py-1.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors">
                            Confirm
                          </button>
                          <button onClick={() => setDeletingId(null)} className="px-3 py-1.5 text-on-surface-variant text-xs font-bold hover:bg-surface-container-high rounded-xl transition-colors">
                            Cancel
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="actions"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.14 }}
                          className="flex items-center gap-1.5"
                        >
                          {/* QR */}
                          <button
                            onClick={() => setShowQr(showQr === link.id ? null : link.id)}
                            title="QR Code"
                            className={`flex flex-col items-center justify-center gap-0.5 w-11 h-11 rounded-2xl text-[9px] font-bold uppercase tracking-wide transition-all ${
                              showQr === link.id
                                ? "bg-primary text-white shadow-md shadow-primary/20"
                                : "bg-surface-container-high hover:bg-primary/10 text-on-surface-variant hover:text-primary"
                            }`}
                          >
                            <QrCode size={15} />
                            <span>QR</span>
                          </button>

                          {/* Stats — only in Dashboard mode, not Analytics mode */}
                          {!showOnlyAnalytics && (
                            <button
                              onClick={() => setSelectedLink(selectedLink?.id === link.id ? null : link)}
                              title="Analytics"
                              className={`flex flex-col items-center justify-center gap-0.5 w-11 h-11 rounded-2xl text-[9px] font-bold uppercase tracking-wide transition-all ${
                                selectedLink?.id === link.id
                                  ? "bg-primary text-white shadow-md shadow-primary/20"
                                  : "bg-surface-container-high hover:bg-primary/10 text-on-surface-variant hover:text-primary"
                              }`}
                            >
                              <BarChart3 size={15} />
                              <span>Stats</span>
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => setDeletingId(link.id)}
                            title="Delete"
                            className="flex flex-col items-center justify-center gap-0.5 w-11 h-11 bg-surface-container-high hover:bg-red-500/10 text-on-surface-variant hover:text-red-500 rounded-2xl text-[9px] font-bold uppercase tracking-wide transition-all"
                          >
                            <Trash2 size={15} />
                            <span>Del</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* ── Expand: QR Code ─────────────────────────────────── */}
                <AnimatePresence initial={false}>
                  {showQr === link.id && (
                    <motion.div
                      key="qr"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="pt-4 border-t border-outline-variant/10 flex flex-col items-center gap-4">
                        <div className="bg-white p-4 rounded-2xl shadow-inner">
                          <QRCodeSVG value={`${window.location.origin}/${link.shortId}`} size={160} />
                        </div>
                        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Scan to visit link</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Expand: Analytics ───────────────────────────────── */}
                <AnimatePresence initial={false}>
                  {(selectedLink?.id === link.id || showOnlyAnalytics) && (
                    <motion.div
                      key="analytics"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="pt-4 border-t border-outline-variant/10">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant/60 mb-4 flex items-center gap-2">
                              <TrendingUp size={16} />
                              Click Trends (Last 7 Days)
                            </h4>
                            <div className="h-52 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={getChartData(link.clickHistory)}>
                                  <defs>
                                    <linearGradient id={`grad-${link.id}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                  <Area type="monotone" dataKey="clicks" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill={`url(#grad-${link.id})`} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                          <div className="space-y-5">
                            <div>
                              <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant/60 mb-3">AI Insights</h4>
                              <div className="bg-surface-container-high rounded-2xl p-4 text-sm">
                                {link.aiInsights ? (
                                  <>
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-medium">Safety Score</span>
                                      <span className={`font-bold ${link.aiInsights.safetyScore > 80 ? 'text-green-500' : 'text-yellow-500'}`}>
                                        {link.aiInsights.safetyScore}/100
                                      </span>
                                    </div>
                                    <p className="text-on-surface-variant leading-relaxed italic">"{link.aiInsights.summary}"</p>
                                  </>
                                ) : (
                                  <p className="text-on-surface-variant/40 italic">No AI insights for this link.</p>
                                )}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant/60 mb-3">Last Clicked</h4>
                              <div className="text-sm font-medium">
                                {link.clickHistory.length > 0
                                  ? format(new Date(link.clickHistory[link.clickHistory.length - 1]), "MMM dd, HH:mm")
                                  : "Never clicked"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredLinks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-surface-container-lowest rounded-3xl border border-dashed border-outline-variant/20">
            <div className="bg-surface-container-high p-6 rounded-full mb-4">
              {links.length === 0
                ? <Link2 size={48} className="text-on-surface-variant/20" />
                : <Search size={48} className="text-on-surface-variant/20" />}
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2">
              {links.length === 0 ? "No links yet" : "No links found"}
            </h3>
            <p className="text-on-surface-variant/60">
              {links.length === 0
                ? "Create your first shortened link above to get started."
                : "Try adjusting your search or filters."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
