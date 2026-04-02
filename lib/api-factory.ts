import axios, { type AxiosInstance } from "axios";
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

  const resolveBaseUrl = () => {
    if (!options.baseURL) {
      throw new Error("API base URL is not configured");
    }

    const baseUrl = typeof options.baseURL === "function"
      ? options.baseURL()
      : options.baseURL;

    if (!baseUrl) {
      throw new Error("API base URL is not configured");
    }

    return baseUrl;
  };

  instance.interceptors.request.use((config) => {
    config.baseURL = resolveBaseUrl();

    // Inject auth only for clients that need it.
    if (options.withAuth !== false) {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  });

  // Response interceptor for data extraction and 401 handling
  instance.interceptors.response.use(
    (res) => {
      // If it's a blob/binary, return the whole response so caller can access headers if needed
      // or just return the response if it's already structured
      if (res.config.responseType === "blob") return res;
      return res.data;
    },
    (err) => {
      const requestUrl = String(err.config?.url ?? "");
      const shouldHandleUnauthorized = err.response?.status === 401 && requestUrl !== "/auth/login";

      if (shouldHandleUnauthorized) {
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
