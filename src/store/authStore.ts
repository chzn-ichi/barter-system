import { create } from "zustand";
import * as authApi from "@/lib/supabaseAuth";
import type { Profile } from "@/lib/supabaseAuth";
import { supabase } from "@/lib/supabase";

type AuthState = {
  user: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  restore: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: { name: string; identifier: string; password: string; barangay: string }) => Promise<void>;
  verifyOtp: (identifier: string, code: string, purpose: "register" | "reset") => Promise<void>;
  resendOtp: (identifier: string, purpose: "register" | "reset") => Promise<void>;
  requestPasswordReset: (identifier: string) => Promise<void>;
  resetPassword: (identifier: string, newPassword: string) => Promise<void>;
  updateProfile: (patch: Partial<{ name: string; barangay: string; avatarUrl: string }>) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  restore: async () => {
    const user = await authApi.restoreSession();
    set({ user, isAuthenticated: !!user, isLoading: false });

    supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        set({ user: null, isAuthenticated: false });
      }
    });
  },

  login: async (identifier, password) => {
    const user = await authApi.loginUser(identifier, password);
    set({ user, isAuthenticated: true });
  },

  register: async (input) => {
    await authApi.registerUser(input);
  },

  verifyOtp: async (identifier, code, purpose) => {
    if (purpose === "register") {
      const user = await authApi.verifySignupOtp(identifier, code);
      set({ user, isAuthenticated: true });
    } else {
      await authApi.verifyRecoveryOtp(identifier, code);
    }
  },

  resendOtp: async (identifier, purpose) => {
    if (purpose === "register") {
      await authApi.resendSignupOtp(identifier);
    } else {
      await authApi.requestPasswordReset(identifier);
    }
  },

  requestPasswordReset: async (identifier) => {
    await authApi.requestPasswordReset(identifier);
  },

  resetPassword: async (_identifier, newPassword) => {
    await authApi.resetPassword(newPassword);
    await authApi.logout();
    set({ user: null, isAuthenticated: false });
  },

  updateProfile: async (patch) => {
    const current = get().user;
    if (!current) return;
    await authApi.updateProfile(current.id, patch);
    const refreshed = await authApi.fetchProfile(current.id, current.email);
    set({ user: refreshed });
  },

  logout: async () => {
    await authApi.logout();
    set({ user: null, isAuthenticated: false });
  },
}));