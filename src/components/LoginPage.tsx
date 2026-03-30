import { useState } from "react";
import { Sparkles, Loader2, Link2, BarChart3, Shield, AlertCircle, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { signInWithGoogle, authError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setLocalError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setLocalError(err?.message ?? "Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || authError;

  const features = [
    { icon: Link2, label: "Instant URL shortening" },
    { icon: BarChart3, label: "Click analytics & trends" },
    { icon: Shield, label: "AI-powered safety scan" },
  ];

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="bg-primary/10 p-3 rounded-2xl">
              <Sparkles className="text-primary fill-primary/30" size={32} />
            </div>
          </div>
          <h1 className="text-4xl font-black text-on-surface tracking-tight mb-2">
            Shortify Pro
          </h1>
          <p className="text-on-surface-variant text-base">
            Smart URL shortener with real-time analytics
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-container-lowest rounded-3xl p-8 shadow-xl shadow-primary/5 border border-outline-variant/10"
        >
          <h2 className="text-2xl font-bold text-on-surface mb-2">Get Started</h2>
          <p className="text-sm text-on-surface-variant mb-8">
            Sign in with Google to create and manage your short links.
          </p>

          {/* Features */}
          <div className="space-y-3 mb-8">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm text-on-surface-variant">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-primary" />
                </div>
                {label}
              </div>
            ))}
          </div>

          {/* Error message — persistent and actionable */}
          <AnimatePresence>
            {displayError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex gap-3">
                  <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-600 mb-1">Sign-in failed</p>
                    <p className="text-xs text-red-500/80 leading-relaxed">{displayError}</p>
                    {displayError.includes("not authorized") && (
                      <a
                        href="https://console.firebase.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-red-500 font-bold mt-2 hover:underline"
                      >
                        Open Firebase Console <ExternalLink size={11} />
                      </a>
                    )}
                    {displayError.includes("not enabled") && (
                      <a
                        href="https://console.firebase.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-red-500 font-bold mt-2 hover:underline"
                      >
                        Open Firebase Console <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google Sign-In Button */}
          <button
            id="google-signin-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-on-surface text-surface py-4 rounded-2xl font-bold text-base hover:bg-on-surface/90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-on-surface/10"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {loading ? "Signing in…" : "Continue with Google"}
          </button>

          <p className="text-[11px] text-on-surface-variant/50 text-center mt-5">
            By continuing, you agree to use this app responsibly. Your links are yours.
          </p>
        </motion.div>

        {/* Setup checklist hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/10"
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/50 mb-3">Firebase Setup Checklist</p>
          <div className="space-y-2">
            {[
              "Authentication → Sign-in method → Google → Enabled",
              'Authentication → Settings → Authorized domains → "localhost" added',
            ].map((step) => (
              <div key={step} className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-on-surface-variant/20 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-on-surface-variant/60">{step}</p>
              </div>
            ))}
          </div>
          <a
            href="https://console.firebase.google.com/project/shortify-pro-aeca1/authentication/providers"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-bold text-primary hover:underline"
          >
            Open Authentication Settings <ExternalLink size={10} />
          </a>
        </motion.div>

        <p className="text-center text-xs text-on-surface-variant/40 mt-6">
          Shortify Pro · Built for CodeVerse Web Dev Hackathon
        </p>
      </div>
    </div>
  );
}
