import React, { createContext, useContext, useState } from "react";

interface MockUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
}

interface AuthContextValue {
  user: MockUser | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Mock user — auth is bypassed, everyone gets straight in
const MOCK_USER: MockUser = {
  uid: "dev-user-001",
  displayName: "Ankit",
  email: "ankit@shortify.pro",
  photoURL: null,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [authError] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    // Bypass: instantly sign in with a mock user
    setUser(MOCK_USER);
  };

  const logout = async () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading: false, authError, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
