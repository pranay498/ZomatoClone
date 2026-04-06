import axios from "axios";

const API_BASE_URL = "http://localhost:8000/api/v1";

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request Interceptor - Add token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses for debugging
    console.log("[API] Response successful:", response.status, response.config.url);
    return response;
  },
  (error) => {
    // Log error details
    console.error("[API] Response error:", error.config?.url, error.response?.status);
    
    // If 401, clear tokens and redirect to login
  if (error.response?.status === 401) {
  const errorData = error.response.data;

  // ❌ ignore Razorpay type errors
  if (errorData?.error?.code === "BAD_REQUEST_ERROR") {
    return Promise.reject(error);
  }

  // ✅ real auth failure
  // localStorage.removeItem("accessToken");
  // window.location.href = "/";
}
    return Promise.reject(error);
  }
);

export default apiClient;
