/** Centralized Axios API client with auth token injection, pre-warming, retry handling, and 401 handling. */
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";

// In production unified deployment, VITE_API_BASE_URL can be empty or omitted for same-origin /api/v1.
// In development, default to http://localhost:8000.
// If backend is deployed separately, set VITE_API_BASE_URL to https://your-backend.vercel.app.
const rawBase = import.meta.env.VITE_API_BASE_URL;
const BASE_URL = rawBase !== undefined ? rawBase.replace(/\/+$/, "") : (import.meta.env.DEV ? "http://localhost:8000" : "");

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
  timeout: 45000, // 45s to accommodate serverless / cloud free-tier spin-up
});

interface CustomRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle retries on cold start timeouts/network drops, and handle 401
api.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (error: AxiosError) => {
    const config = error.config as CustomRequestConfig | undefined;
    const isAuthAttempt = config?.url?.includes("/auth/login") || config?.url?.includes("/auth/register");
    const isNetworkOrTimeout =
      error.code === "ECONNABORTED" ||
      error.message?.toLowerCase().includes("timeout") ||
      error.message === "Network Error" ||
      !error.response ||
      error.response?.status === 502 ||
      error.response?.status === 503 ||
      error.response?.status === 504;

    // Retry once for cold starts if it timed out or network dropped
    if (config && isNetworkOrTimeout && (!config._retryCount || config._retryCount < 1)) {
      config._retryCount = (config._retryCount || 0) + 1;
      // Wait 1.5 seconds before retrying to give server time to wake up
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return api(config);
    }

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

/**
 * Pre-warms the backend on initial application load (e.g. Render / Neon sleep wakeup).
 * Fire and forget.
 */
export function warmUpBackend(): void {
  try {
    const base = rawBase !== undefined ? rawBase.replace(/\/+$/, "") : (import.meta.env.DEV ? "http://localhost:8000" : "");
    fetch(`${base}/health`, { method: "GET" }).catch(() => {});
  } catch {
    // Ignore any synchronous pre-warm errors
  }
}

// Trigger initial pre-warm immediately when module is loaded
warmUpBackend();

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
