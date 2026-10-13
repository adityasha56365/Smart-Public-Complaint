/** Centralized Axios API client with auth token injection and 401 handling. */
import axios, { AxiosError, AxiosResponse } from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

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

export default api;
