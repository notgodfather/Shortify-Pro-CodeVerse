import React, { createContext, useContext, useState, useEffect } from "react";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  authError: string | null;
  isDemoUser: boolean;
  signInWithGoogle: () => Promise<void>;
  enterDemoMode: () => void;
  logout: () => Promise<void>;
}

// ─── Demo identity ────────────────────────────────────────────────────────────
/**
 * The demo user deliberately shares the uid of the existing pre-seeded
 * Firestore data ("dev-user-001" / Ankit) so judges can see real links
 * and campaigns immediately on "Enter Demo".
 *
 * Demo writes are blocked UI-side (isDemoUser = true) and are further
 * isolated because real Google accounts get their own Firebase uid.
 */
const DEMO_USER: AppUser = {
  uid: "dev-user-001",          // ← matches pre-seeded Firestore data
  displayName: "Demo User",
  email: "demo@shortify.pro",
  photoURL: null,
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [loading, setLoading] = useState(true);   // wait for Firebase auth check
  const [authError, setAuthError] = useState<string | null>(null);

  // ── Listen to Firebase Auth state ──────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Real Google-authenticated user
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName ?? "User",
          email: firebaseUser.email ?? "",
          photoURL: firebaseUser.photoURL,
        });
        setIsDemoUser(false);
      } else {
        // Not signed in via Firebase — only set user if we're in demo mode
        // (demo mode is managed by local state, not Firebase)
        setUser((prev) => (prev?.uid === DEMO_USER.uid && isDemoUser ? prev : null));
      }
      setLoading(false);
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Real Google Sign-In ─────────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fu = result.user;
      setUser({
        uid: fu.uid,
        displayName: fu.displayName ?? "User",
        email: fu.email ?? "",
        photoURL: fu.photoURL,
      });
      setIsDemoUser(false);
    } catch (err: any) {
      const msg: string = err?.message ?? "Sign-in failed.";
      setAuthError(msg);
      throw err;
    }
  };

  // ── Demo Mode ──────────────────────────────────────────────────────────────
  /** Bypasses Firebase auth and loads the pre-seeded demo dataset. */
  const enterDemoMode = () => {
    setAuthError(null);
    setIsDemoUser(true);
    setUser(DEMO_USER);
    setLoading(false);
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    if (!isDemoUser) {
      await signOut(auth); // signs out of Firebase for real users
    }
    setIsDemoUser(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, authError, isDemoUser, signInWithGoogle, enterDemoMode, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
