import { useState, useRef, useEffect } from "react";
import { Search, Sparkles, LogOut, Menu, FlaskConical, ChevronDown } from "lucide-react";
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

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    toast.success("Signed out successfully.");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
            <div className="hidden md:flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-600 px-3 py-1.5 rounded-full">
              <FlaskConical size={13} className="flex-shrink-0" />
              <span className="text-[11px] font-bold tracking-wide">Demo Mode Active</span>
            </div>
          )}

          {/* Status indicator — desktop only, hidden in demo mode */}
          {!isDemoUser && (
            <div className="hidden md:flex items-center gap-2 mr-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-on-surface-variant/60">All Systems Operational</span>
            </div>
          )}

          {/* User avatar + dropdown */}
          {user && (
            <div className="relative" ref={dropdownRef}>
              {/* Profile trigger button */}
              <button
                id="profile-menu-btn"
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-2 pl-3 border-l border-outline-variant/10 hover:opacity-90 transition-opacity"
                aria-label="Open profile menu"
                aria-expanded={dropdownOpen}
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-on-surface">{user.displayName ?? "User"}</div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${isDemoUser ? "text-amber-600" : "text-primary"}`}>
                    {isDemoUser ? "Demo Mode" : "Pro Member"}
                  </div>
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl overflow-hidden border border-outline-variant/20 shadow-sm flex-shrink-0">
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
                </div>

                <motion.span
                  animate={{ rotate: dropdownOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-on-surface-variant/50 hidden sm:inline-flex"
                >
                  <ChevronDown size={15} />
                </motion.span>
              </button>

              {/* Dropdown menu */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute right-0 top-full mt-2 w-52 bg-surface-container-lowest rounded-2xl shadow-xl shadow-black/10 border border-outline-variant/10 overflow-hidden z-50"
                  >
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-outline-variant/10 bg-surface-container-low">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="font-black text-primary text-sm">{(user.displayName?.[0] ?? "U").toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-on-surface truncate">{user.displayName}</p>
                          <p className="text-[10px] text-on-surface-variant/50 truncate">{user.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="p-1.5">
                      <button
                        id="logout-dropdown-btn"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut size={15} />
                        {isDemoUser ? "Exit Demo" : "Sign Out"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
