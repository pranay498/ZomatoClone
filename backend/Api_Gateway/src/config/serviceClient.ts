import axios, {
  AxiosInstance,
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,} from "axios";
import { AppError } from "../utils/AppError";

const INTERNAL_SERVICE_KEY: string = process.env.INTERNAL_SERVICE_KEY ?? "";

interface ErrorResponse {
  message: string;
}

const serviceClient: AxiosInstance = axios.create({
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "x-internal-key": INTERNAL_SERVICE_KEY,
  },
});

serviceClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    console.log(
      `📤 [ServiceClient] ${config.method?.toUpperCase()} ${config.url}`
    );
    return config;
  },
  (error: AxiosError) => {
    console.error("❌ [ServiceClient] Request error:", error.message);
    return Promise.reject(error);
  }
);

serviceClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    console.log(
      `✅ [ServiceClient] ${response.status} ${response.config.url}`
    );
    return response;
  },
  (error: AxiosError<ErrorResponse>) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const errorData = error.response?.data;

    console.error(
      `❌ [ServiceClient] ${status} ${url}`,
      errorData?.message ?? error.message
    );

    switch (status) {
      case 401:
        return Promise.reject(
          new AppError("Unauthorized - Invalid token", 401)
        );

      case 403:
        return Promise.reject(
          new AppError("Forbidden - Access denied", 403)
        );

      case 404:
        return Promise.reject(
          new AppError(`Not found: ${url}`, 404)
        );

      case 500:
        return Promise.reject(
          new AppError("Internal server error", 500)
        );

      default:
        return Promise.reject(
          new AppError(
            errorData?.message ?? error.message,
            status ?? 500
          )
        );
    }
  }
);

export const addUserAuthHeader = (token: string): void => {
  serviceClient.defaults.headers.common.Authorization = `Bearer ${token}`;
};

export const removeUserAuthHeader = (): void => {
  delete serviceClient.defaults.headers.common.Authorization;
};

export default serviceClient;