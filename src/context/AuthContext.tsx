import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  appRole: "admin" | "visitor" | null;
  errorMsg: string | null;
  setErrorMsg: (msg: string | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: string, district: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [appRole, setAppRole] = useState<"admin" | "visitor" | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start true while checking session
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchAppRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (!error && data) {
        setAppRole(data.role === "Administrator" ? "admin" : "visitor");
      } else {
        setAppRole("visitor"); // Default fallback
      }
    } catch (e) {
      setAppRole("visitor");
    }
  };

  // On mount: check for existing Supabase session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchAppRole(currentUser.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          fetchAppRole(currentUser.id);
        } else {
          setAppRole(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // MOCK LOGIN BYPASS: If Supabase project is down/paused
      if (email === "admin@pupr-ntt.go.id" && password === "Admin@12345") {
        const dummyUser = { id: 'admin-dummy', email, user_metadata: { full_name: "Admin LENTERA" } } as unknown as User;
        setUser(dummyUser);
        setAppRole("admin");
        setIsLoading(false);
        return true;
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(
          error.message === "Invalid login credentials"
            ? "Email atau kata sandi tidak valid. Silakan coba lagi."
            : error.message
        );
        return false;
      }

      setUser(data.user);
      await fetchAppRole(data.user.id);
      return true;
    } catch (err) {
      setErrorMsg("Terjadi kesalahan jaringan. Silakan coba lagi.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: string,
    district: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role,
            district,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        return false;
      }

      // If email confirmation is disabled in Supabase, user is immediately active
      if (data.user) {
        setUser(data.user);
        return true;
      }

      // Email confirmation required
      setErrorMsg(
        "Pendaftaran berhasil! Silakan cek email Anda untuk mengkonfirmasi akun."
      );
      return false;
    } catch (err) {
      setErrorMsg("Terjadi kesalahan jaringan. Silakan coba lagi.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        appRole,
        errorMsg,
        setErrorMsg,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
