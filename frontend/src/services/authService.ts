/** Auth service — login, register, logout, token management. */
import api from "./api";
import type { TokenResponse, User } from "../types";

export interface LoginPayload {
  email?: string;
  phone?: string;
  password: string;
}

export interface RegisterPayload {
  full_name: string;
  email?: string;
  phone?: string;
  password: string;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<User> {
    const { data } = await api.post<User>("/auth/register", payload);
    return data;
  },

  async login(payload: LoginPayload): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>("/auth/login", payload);
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    localStorage.setItem("user", JSON.stringify({ id: data.user_id, full_name: data.full_name, role: data.user_role }));
    return data;
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>("/auth/me");
    return data;
  },

  async updateProfile(payload: { full_name?: string; email?: string; phone?: string }): Promise<User> {
    const { data } = await api.patch<User>("/auth/me", payload);
    const stored = this.getStoredUser();
    if (stored) {
      localStorage.setItem("user", JSON.stringify({ ...stored, full_name: data.full_name }));
    }
    return data;
  },

  async changePassword(payload: { current_password: string; new_password: string }): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>("/auth/change-password", payload);
    return data;
  },

  logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  },

  getStoredUser(): { id: number; full_name: string; role: string } | null {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem("access_token");
  },
};
