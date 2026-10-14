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

export function isTokenValid(token?: string | null): boolean {
  if (!token) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    if (typeof payload.exp === "number") {
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now + 5; // 5-second buffer
    }
    return true;
  } catch {
    return false;
  }
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
    if (!this.isAuthenticated()) {
      return null;
    }
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  },

  isAuthenticated(): boolean {
    const token = localStorage.getItem("access_token");
    if (!token || !isTokenValid(token)) {
      if (token) {
        this.logout();
      }
      return false;
    }
    return true;
  },
};

