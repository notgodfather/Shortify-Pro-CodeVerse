import { LayoutDashboard, BarChart3, Link2, Megaphone, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { NavTab } from "../App";

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ activeTab, onTabChange, mobileOpen = false, onMobileClose }: SidebarProps) {
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

  const SidebarContent = () => (
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

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col h-[calc(100vh-72px)] w-56 p-4 gap-2 bg-surface-container-low sticky top-[72px] flex-shrink-0">
        <div className="mb-6 px-2">
          <div className="text-xs font-bold text-on-surface-variant/40 uppercase tracking-widest">Navigation</div>
        </div>
        <SidebarContent />
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
              className="lg:hidden fixed top-0 left-0 h-full w-72 bg-surface p-6 z-50 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="text-xl font-black text-primary">Shortify Pro</div>
                <button
                  onClick={onMobileClose}
                  className="p-2 rounded-xl hover:bg-surface-container-high transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
