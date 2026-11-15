import { authService } from "./auth.service";
import { useAuthStore } from "@/store/auth.store";

let started: Promise<void> | null = null;

/** Restores a session from sessionStorage and validates it against GET /auth/profile. */
export function bootstrapSession(): Promise<void> {
  if (started) return started;
  started = (async () => {
    const store = useAuthStore.getState();
    if (!store.loadFromStorage()) {
      store.clearSession();
      return;
    }
    try {
      const profile = await authService.profile();
      useAuthStore.getState().setUser(profile);
    } catch {
      useAuthStore.getState().clearSession();
    }
  })();
  return started;
}

export async function signOut(): Promise<void> {
  try {
    await authService.logout();
  } catch {
    /* revoke is best-effort; the local session is cleared regardless */
  }
  useAuthStore.getState().clearSession();
}
