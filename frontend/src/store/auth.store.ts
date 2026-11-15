import { create } from "zustand";
import type { Role } from "@/lib/roles";

/** Matches `user` in the backend login/refresh response. */
export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: Role;
  companyId: string | null;
  branchId: string | null;
}

/** Matches GET /auth/profile. */
export interface Profile extends AuthUser {
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

type Status = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  status: Status;
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  loadFromStorage: () => boolean;
  setSession: (res: AuthResponse) => void;
  setUser: (user: AuthUser) => void;
  clearSession: () => void;
}

// The backend returns tokens in the JSON body only (no HttpOnly cookies), so they are
// kept in memory and mirrored to sessionStorage (per-tab, cleared when the tab closes).
const STORAGE_KEY = "tms.session";

function persist(accessToken: string | null, refreshToken: string | null) {
  try {
    if (accessToken && refreshToken) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, refreshToken }));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* storage unavailable: the session just won't survive a reload */
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  accessToken: null,
  refreshToken: null,
  user: null,

  loadFromStorage: () => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { accessToken?: string; refreshToken?: string };
      if (!parsed.accessToken || !parsed.refreshToken) return false;
      set({ accessToken: parsed.accessToken, refreshToken: parsed.refreshToken });
      return true;
    } catch {
      return false;
    }
  },

  setSession: (res) => {
    persist(res.accessToken, res.refreshToken);
    set({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      user: res.user,
      status: "authenticated",
    });
  },

  setUser: (user) => set({ user, status: "authenticated" }),

  clearSession: () => {
    persist(null, null);
    set({ accessToken: null, refreshToken: null, user: null, status: "unauthenticated" });
  },
}));
