import { LayoutDashboard, BarChart3, Link2, Megaphone, X, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { NavTab } from "../App";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ activeTab, onTabChange, mobileOpen = false, onMobileClose }: SidebarProps) {
  const { user, logout, isDemoUser } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard" as NavTab },
    { icon: BarChart3, label: "Analytics" as NavTab },
    { icon: Link2, label: "Links" as NavTab },
    { icon: Megaphone, label: "Campaigns" as NavTab },
  ];

  const handleTabChange = (tab: NavTab) => {
    onTabChange(tab);
    onMobileClose?.();
  };

  const handleLogout = async () => {
    onMobileClose?.();
    await logout();
    toast.success("Signed out successfully.");
  };

  const NavItems = () => (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => (
        <motion.button
          key={item.label}
          onClick={() => handleTabChange(item.label)}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm font-medium transition-all duration-200 w-full text-left ${
            activeTab === item.label
              ? "bg-primary/10 text-primary"
              : "text-on-surface-variant hover:bg-surface-container-highest"
          }`}
        >
          <item.icon size={18} strokeWidth={activeTab === item.label ? 2.5 : 2} />
          {item.label}
        </motion.button>
      ))}
    </nav>
  );

  const LogoutButton = ({ className = "" }: { className?: string }) => (
    <button
      id="sidebar-logout-btn"
      onClick={handleLogout}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-colors w-full text-left ${className}`}
    >
      <LogOut size={18} />
      {isDemoUser ? "Exit Demo" : "Sign Out"}
    </button>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col h-[calc(100vh-72px)] w-56 p-4 gap-2 bg-surface-container-low sticky top-[72px] flex-shrink-0">
        <div className="mb-6 px-2">
          <div className="text-xs font-bold text-on-surface-variant/40 uppercase tracking-widest">Navigation</div>
        </div>
        <NavItems />

        {/* Logout at bottom of desktop sidebar */}
        <div className="mt-auto pt-4 border-t border-outline-variant/10">
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onMobileClose}
              className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="lg:hidden fixed top-0 left-0 h-full w-72 bg-surface p-6 z-50 shadow-2xl flex flex-col"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between mb-8">
                <div className="text-xl font-black text-primary">Shortify Pro</div>
                <button
                  onClick={onMobileClose}
                  className="p-2 rounded-xl hover:bg-surface-container-high transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Nav links */}
              <NavItems />

              {/* User info + Logout at bottom of drawer */}
              <div className="mt-auto pt-4 border-t border-outline-variant/10 space-y-1">
                {user && (
                  <div className="flex items-center gap-3 px-4 py-3 mb-1">
                    <div className="w-8 h-8 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="font-black text-primary text-sm">{(user.displayName?.[0] ?? "U").toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{user.displayName}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${isDemoUser ? "text-amber-600" : "text-primary"}`}>
                        {isDemoUser ? "Demo Mode" : "Pro Member"}
                      </p>
                    </div>
                  </div>
                )}
                <LogoutButton />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
