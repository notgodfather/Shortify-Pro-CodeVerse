import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import UrlShortener from "./components/UrlShortener";
import RecentLinks from "./components/RecentLinks";
import Campaigns from "./components/Campaigns";
import LoginPage from "./components/LoginPage";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LayoutDashboard, BarChart3, Link2, Plus, TrendingUp } from "lucide-react";
import { Toaster, toast } from "sonner";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export type NavTab = "Dashboard" | "Analytics" | "Links" | "Campaigns";

function AppShell() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>("Dashboard");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [globalSearch, setGlobalSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

  // Loading state while Firebase resolves auth
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-on-surface-variant text-sm animate-pulse">Loading Shortify Pro...</p>
        </div>
      </div>
    );
  }

  // Not signed in → show login page
  if (!user) return <LoginPage />;

  // Signed in → show full app
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Toaster position="top-right" richColors />
      <Navbar onSearch={setGlobalSearch} onMenuToggle={() => setMobileMenuOpen(o => !o)} onLogoClick={() => setActiveTab("Dashboard")} />

      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

        <main className="flex-1 p-8 lg:p-12 overflow-hidden">
          <AnimatePresence mode="wait">
            {globalSearch ? (
              <motion.div
                key="global-search"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <span className="text-on-surface-variant/50 font-normal">Search results for</span>
                    <span className="text-primary">"{globalSearch}"</span>
                  </h1>
                </div>
                <RecentLinks key={`search-${refreshTrigger}`} onRefresh={handleRefresh} globalSearch={globalSearch} />
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "Dashboard" && (
                  <>
                    <UrlShortener onShortened={handleRefresh} />
                    <RecentLinks key={refreshTrigger} onRefresh={handleRefresh} />
                  </>
                )}
                {activeTab === "Analytics" && (
                  <div className="flex flex-col gap-8">
                    <div className="flex items-center gap-3 mb-4">
                      <BarChart3 className="text-primary" size={32} />
                      <h1 className="text-3xl font-bold">Global Analytics</h1>
                    </div>
                    <RecentLinks key={refreshTrigger} onRefresh={handleRefresh} showOnlyAnalytics />
                  </div>
                )}
                {activeTab === "Links" && (
                  <div className="flex flex-col gap-8">
                    <div className="flex items-center gap-3 mb-4">
                      <Link2 className="text-primary" size={32} />
                      <h1 className="text-3xl font-bold">Link Management</h1>
                    </div>
                    <RecentLinks key={refreshTrigger} onRefresh={handleRefresh} />
                  </div>
                )}
                {activeTab === "Campaigns" && <Campaigns />}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 w-full bg-surface-container-lowest px-6 py-3 flex justify-around items-center border-t border-outline-variant/10 z-50">
        <button
          onClick={() => setActiveTab("Dashboard")}
          className={activeTab === "Dashboard" ? "text-primary" : "text-on-surface-variant/40"}
        >
          <LayoutDashboard size={24} />
        </button>
        <button
          onClick={() => setActiveTab("Analytics")}
          className={activeTab === "Analytics" ? "text-primary" : "text-on-surface-variant/40"}
        >
          <BarChart3 size={24} />
        </button>
        <div className="relative">
          <button
            onClick={() => {
              setActiveTab("Dashboard");
              toast.info("Create a new link from the dashboard");
            }}
            className="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg -mt-10 border-4 border-surface active:scale-90 transition-transform"
          >
            <Plus size={24} />
          </button>
        </div>
        <button
          onClick={() => setActiveTab("Links")}
          className={activeTab === "Links" ? "text-primary" : "text-on-surface-variant/40"}
        >
          <Link2 size={24} />
        </button>
        <button
          onClick={() => setActiveTab("Campaigns")}
          className={activeTab === "Campaigns" ? "text-primary" : "text-on-surface-variant/40"}
        >
          <TrendingUp size={24} />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
