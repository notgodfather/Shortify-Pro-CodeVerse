import { useState, useRef, useEffect } from "react";
import { Search, Sparkles, LogOut, Menu, FlaskConical } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

interface NavbarProps {
  onSearch?: (q: string) => void;
  onMenuToggle?: () => void;
  onLogoClick?: () => void;
}

export default function Navbar({ onSearch, onMenuToggle, onLogoClick }: NavbarProps) {
  const { user, logout, isDemoUser } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    toast.success(isDemoUser ? "Exited demo mode." : "Signed out successfully.");
  };

  return (
    <nav className="w-full top-0 sticky bg-surface/80 backdrop-blur-md z-50 border-b border-outline-variant/5">
      <div className="flex justify-between items-center px-4 md:px-8 py-4 max-w-7xl mx-auto">
        {/* Left: Hamburger (mobile) + Logo + Search */}
        <div className="flex items-center gap-3 md:gap-8">
          {/* Mobile menu button */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-xl hover:bg-surface-container-high transition-colors text-on-surface-variant"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <button
            onClick={onLogoClick}
            className="text-xl md:text-2xl font-black text-primary tracking-tighter flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <Sparkles className="fill-primary" size={22} />
            Shortify Pro
          </button>

          <div className="hidden lg:flex items-center bg-surface-container-high px-4 py-2 rounded-full w-80 border border-outline-variant/10">
            <Search size={16} className="text-on-surface-variant/40 mr-2 flex-shrink-0" />
            <input
              type="text"
              placeholder="Quick search links..."
              className="bg-transparent border-none text-sm focus:ring-0 w-full caret-primary outline-none"
              onChange={(e) => onSearch?.(e.target.value)}
            />
            <span className="text-[10px] font-bold text-on-surface-variant/40 bg-surface-container-highest px-1.5 py-0.5 rounded border border-outline-variant/10">
              ⌘K
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Demo Mode badge */}
          {isDemoUser && (
            <div className="hidden sm:flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-600 text-[11px] font-bold px-3 py-1.5 rounded-full">
              <FlaskConical size={12} />
              Demo Mode
            </div>
          )}

          {/* Status indicator — desktop only, hide in demo */}
          {!isDemoUser && (
            <div className="hidden md:flex items-center gap-2 mr-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-on-surface-variant/60">All Systems Operational</span>
            </div>
          )}

          {/* User avatar with dropdown */}
          {user && (
            <div className="flex items-center gap-3 pl-3 border-l border-outline-variant/10">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-on-surface">{user.displayName ?? "User"}</div>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${isDemoUser ? "text-amber-500" : "text-primary"}`}>
                  {isDemoUser ? "Demo Mode" : "Pro Member"}
                </div>
              </div>

              {/* Avatar — click opens dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  id="avatar-btn"
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="w-9 h-9 rounded-xl overflow-hidden border border-outline-variant/20 shadow-sm hover:ring-2 hover:ring-primary/30 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
                  aria-label="Open user menu"
                  aria-expanded={dropdownOpen}
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName ?? "User"}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-lg font-black text-primary">
                      {(user.displayName?.[0] ?? "U").toUpperCase()}
                    </div>
                  )}
                </button>

                {/* Dropdown */}
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.92, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: -6 }}
                      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                      className="absolute right-0 mt-2 w-44 bg-surface-container-lowest rounded-2xl shadow-xl shadow-black/10 border border-outline-variant/15 overflow-hidden z-50"
                    >
                      {/* User info */}
                      <div className="px-4 py-3 border-b border-outline-variant/10">
                        <p className="text-xs font-bold text-on-surface truncate">{user.displayName}</p>
                        <p className="text-[10px] text-on-surface-variant/50 truncate">{user.email}</p>
                      </div>

                      {/* Logout */}
                      <button
                        id="logout-btn"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500/8 transition-colors text-left"
                      >
                        <LogOut size={15} />
                        {isDemoUser ? "Exit Demo" : "Sign Out"}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
