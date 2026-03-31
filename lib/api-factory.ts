import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { getToken, clearSession } from "./auth";

interface CreateApiOptions {
  baseURL?: string | (() => string | null);
  withAuth?: boolean;
  onUnauthorized?: () => void;
}

/**
 * Factory function to create axios instances with common interceptors
 * Deduplicates auth header injection and 401 handling logic
 */
export function createApiClient(options: CreateApiOptions): AxiosInstance {
  const instance = axios.create({
    headers: { "Content-Type": "application/json" },
  });

  // Request interceptor for auth headers
  if (options.withAuth !== false) {
    instance.interceptors.request.use((config) => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Handle dynamic baseURL
      if (options.baseURL) {
        const baseUrl = typeof options.baseURL === "function" 
          ? options.baseURL() 
          : options.baseURL;
        if (baseUrl) {
          config.baseURL = baseUrl;
        } else {
          throw new Error("API base URL is not configured");
        }
      } else {
        throw new Error("API base URL is not configured");
      }

      return config;
    });
  }

  // Response interceptor for 401 handling
  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401) {
        clearSession();
        const onUnauthorized = options.onUnauthorized ?? (() => {
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        });
        onUnauthorized();
      }
      return Promise.reject(err);
    }
  );

  return instance;
}
