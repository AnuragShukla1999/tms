import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_URL } from "./env";
import { useAuthStore, type AuthResponse } from "@/store/auth.store";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20_000,
  headers: { "Content-Type": "application/json" },
});

// Separate instance without interceptors, used only for /auth/refresh.
const bare = axios.create({ baseURL: API_URL, timeout: 20_000 });

/**
 * The backend rotates refresh tokens (each is single-use). If two requests got a 401 at
 * the same time and both refreshed, the second would fail and log the user out. All
 * callers therefore share one in-flight refresh promise.
 */
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  const token = useAuthStore.getState().refreshToken;
  if (!token) return Promise.reject(new Error("No refresh token"));

  refreshPromise = bare
    .post<AuthResponse>("/auth/refresh", { refreshToken: token })
    .then((res) => {
      useAuthStore.getState().setSession(res.data);
      return res.data.accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

type RetryableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

const NO_REFRESH_URLS = ["/auth/login", "/auth/refresh"];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;
    const skip = NO_REFRESH_URLS.some((u) => original?.url?.startsWith(u));

    if (error.response?.status === 401 && original && !original._retried && !skip) {
      original._retried = true;
      try {
        // If another request already refreshed while this one was in flight, reuse that token
        // instead of rotating again (needless rotations also risk the backend's same-second
        // refresh-token collision; see BACKEND_API_GAPS.md).
        const sent = original.headers.get("Authorization");
        const current = useAuthStore.getState().accessToken;
        const token = current && sent !== `Bearer ${current}` ? current : await refreshAccessToken();
        original.headers.set("Authorization", `Bearer ${token}`);
        return api(original);
      } catch {
        useAuthStore.getState().clearSession();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          // Full navigation on purpose: it also discards all in-memory app state.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/login?reason=expired");
        }
      }
    }
    return Promise.reject(error);
  },
);
