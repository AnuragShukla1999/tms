import { api } from "@/lib/axios";
import {
  useAuthStore,
  type AuthResponse,
  type Profile,
} from "@/store/auth.store";

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  companyName: string;
}

export const authService = {
  login: (input: LoginInput) =>
    api.post<AuthResponse>("/auth/login", input).then((r) => r.data),

  profile: () => api.get<Profile>("/auth/profile").then((r) => r.data),

  /**
   * The body is built at send time from the store: if the access token had expired, the
   * interceptor refreshes (rotating the refresh token) and retries, and the retry must
   * carry the *new* refresh token or the old one would be revoked instead.
   */
  logout: () =>
    api.post<{ message: string }>("/auth/logout", undefined, {
      transformRequest: [
        () =>
          JSON.stringify({
            refreshToken: useAuthStore.getState().refreshToken,
          }),
      ],
    }),

  signup: (input: SignupInput) =>
    api.post<AuthResponse>("/auth/signup", input).then((r) => r.data),
};
