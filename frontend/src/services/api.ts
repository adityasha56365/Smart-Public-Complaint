/** Centralized Axios API client with auth token injection and 401 handling. */
import axios, { AxiosError, AxiosResponse } from "axios";

// In production unified deployment, VITE_API_BASE_URL can be empty or omitted for same-origin /api/v1.
// In development, default to http://localhost:8000.
// If backend is deployed separately, set VITE_API_BASE_URL to https://your-backend.vercel.app.
const rawBase = import.meta.env.VITE_API_BASE_URL;
const BASE_URL = rawBase !== undefined ? rawBase.replace(/\/+$/, "") : (import.meta.env.DEV ? "http://localhost:8000" : "");

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — clear auth and redirect to login (except during login attempts)
api.interceptors.response.use(
  (res: AxiosResponse) => res,
  (error: AxiosError) => {
    const isAuthAttempt = error.config?.url?.includes("/auth/login");
    if (error.response?.status === 401 && !isAuthAttempt) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export function getAttachmentUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  const marker = "/api/v1/complaints/";
  if (url.includes(marker)) {
    const path = url.substring(url.indexOf(marker));
    const raw = import.meta.env.VITE_API_BASE_URL;
    const base = raw ? raw.replace(/\/+$/, "") : (import.meta.env.DEV ? "http://localhost:8000" : "");
    return `${base}${path}`;
  }

  if (url.startsWith("/")) {
    const raw = import.meta.env.VITE_API_BASE_URL;
    const base = raw ? raw.replace(/\/+$/, "") : (import.meta.env.DEV ? "http://localhost:8000" : "");
    return `${base}${url}`;
  }

  return url;
}

export default api;
