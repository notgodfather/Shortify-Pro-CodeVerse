import { Bell, Search, Sparkles, LogOut, Menu } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "motion/react";

interface NavbarProps {
  onSearch?: (q: string) => void;
  onMenuToggle?: () => void;
  onLogoClick?: () => void;
}

export default function Navbar({ onSearch, onMenuToggle, onLogoClick }: NavbarProps) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out successfully.");
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
          {/* Status indicator — desktop only */}
          <div className="hidden md:flex items-center gap-2 mr-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-on-surface-variant/60">All Systems Operational</span>
          </div>

          {/* User avatar + logout */}
          {user && (
            <div className="flex items-center gap-3 pl-3 border-l border-outline-variant/10">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-on-surface">{user.displayName ?? "User"}</div>
                <div className="text-[10px] font-bold text-primary uppercase tracking-wider">Pro Member</div>
              </div>

              {/* Avatar */}
              <div className="relative group">
                <div className="w-9 h-9 rounded-xl overflow-hidden border border-outline-variant/20 shadow-sm cursor-pointer">
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

                {/* Logout tooltip */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ opacity: 1, scale: 1 }}
                  onClick={handleLogout}
                  className="absolute -bottom-1 -right-1 w-5 h-5 bg-error/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  title="Sign out"
                  id="logout-btn"
                >
                  <LogOut size={10} />
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
