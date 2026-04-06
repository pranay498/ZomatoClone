import axios, { AxiosInstance, AxiosError } from "axios";
import { AppError } from "../utils/AppError";

const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || "";

/**
 * Create a centralized axios instance for Api_Gateway to call backend services
 * Used for restaurant service, auth service, rider service, etc.
 */
const serviceClient: AxiosInstance = axios.create({
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "x-internal-key": INTERNAL_SERVICE_KEY,
  },
});

/**
 * Request Interceptor
 */
serviceClient.interceptors.request.use(
  (config) => {
    console.log(`📤 [ServiceClient] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("❌ [ServiceClient] Request error:", error.message);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 */
serviceClient.interceptors.response.use(
  (response) => {
    console.log(`✅ [ServiceClient] ${response.status} ${response.config.url}`);
    return response;
  },
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const errorData = error.response?.data as any;

    console.error(`❌ [ServiceClient] ${status} ${url}`, errorData?.message || error.message);

    // Convert axios error to AppError
    if (status === 401) {
      return Promise.reject(new AppError("Unauthorized - Invalid token", 401));
    } else if (status === 403) {
      return Promise.reject(new AppError("Forbidden - Access denied", 403));
    } else if (status === 404) {
      return Promise.reject(new AppError(`Not found: ${url}`, 404));
    } else if (status === 500) {
      return Promise.reject(new AppError("Internal server error", 500));
    }

    return Promise.reject(new AppError(errorData?.message || error.message, status || 500));
  }
);

/**
 * Add authorization header dynamically for user requests
 */
export const addUserAuthHeader = (token: string) => {
  serviceClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

/**
 * Remove auth header when needed
 */
export const removeUserAuthHeader = () => {
  delete serviceClient.defaults.headers.common["Authorization"];
};

export default serviceClient;
