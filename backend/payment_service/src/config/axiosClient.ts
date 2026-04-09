import axios, { AxiosInstance, AxiosError } from "axios";
import { AppError } from "../utils/AppError";

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || "http://localhost:8000";
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || "";

/**
 * Create a centralized axios instance for inter-service communication
 * Automatically includes auth tokens & internal service key
 */
const axiosClient: AxiosInstance = axios.create({
  baseURL: API_GATEWAY_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "x-internal-key": INTERNAL_SERVICE_KEY,
  },
});

/**
 * Request Interceptor
 * - Add Bearer token from request context (passed via headers)
 * - Add internal service key
 */
axiosClient.interceptors.request.use(
  (config) => {
    console.log(`📤 [axios] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("❌ [axios] Request error:", error.message);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * - Handle successful responses
 * - Handle errors with proper logging
 */
axiosClient.interceptors.response.use(
  (response) => {
    console.log(`✅ [axios] ${response.status} ${response.config.url}`);
    return response;
  },
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const errorData = error.response?.data as any;

    console.error(`❌ [axios] ${status} ${url}`, {
      errorMessage: errorData?.message || error.message,
      errorData: errorData,
      fullError: error.response?.data,
    });

    // Convert axios error to AppError
    if (status === 401) {
      return Promise.reject(new AppError("Unauthorized - Invalid token", 401));
    } else if (status === 403) {
      return Promise.reject(new AppError(`Forbidden - ${errorData?.message || "Access denied"}`, 403));
    } else if (status === 404) {
      return Promise.reject(new AppError(`Not found: ${url}`, 404));
    } else if (status === 500) {
      return Promise.reject(new AppError("Internal server error", 500));
    }

    return Promise.reject(new AppError(errorData?.message || error.message, status || 500));
  }
);

/**
 * Helper function to add authorization header dynamically
 */
export const addAuthHeader = (token: string) => {
  axiosClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

/**
 * Remove auth header when user logs out
 */
export const removeAuthHeader = () => {
  delete axiosClient.defaults.headers.common["Authorization"];
};

export default axiosClient;
