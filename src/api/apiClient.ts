import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { apiScope } from "../msalConfig";
import { silentAcquireToken, interactiveLogin } from "../auth/msalClient";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

// Single guard to prevent multiple concurrent redirects
let isRedirecting = false;

// Use deployed backend URL; optionally override via Vite env `VITE_API_BASE_URL` (declared in vite env types)
// Fallback to Render deployment if env not defined.
// @ts-ignore - Vite injects `import.meta.env` at build time.
const BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  "https://sso-spike-backend.onrender.com";
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

async function attachAuth(config: InternalAxiosRequestConfig) {
  if (isRedirecting) return config; // Skip if redirect already happening
  try {
    const { accessToken } = await silentAcquireToken([apiScope]);
    config.headers = config.headers || {};
    config.headers["Authorization"] = `Bearer ${accessToken}`;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      if (!isRedirecting) {
        isRedirecting = true;
        await interactiveLogin([apiScope]);
      }
    } else {
      console.error("[apiClient] Initial silent token attach failed", err);
    }
  }
  return config;
}

apiClient.interceptors.request.use((config) => attachAuth(config));

apiClient.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError) => {
    if (!error.config) return Promise.reject(error);
    const originalConfig = error.config;
    if (isRedirecting) return Promise.reject(error);

    if (error.response?.status === 401) {
      try {
        const silentResult = await silentAcquireToken([apiScope]);
        const newToken = silentResult.accessToken;
        originalConfig.headers = originalConfig.headers || {};
        originalConfig.headers["Authorization"] = `Bearer ${newToken}`;
        return apiClient.request(originalConfig);
      } catch (silentErr) {
        if (silentErr instanceof InteractionRequiredAuthError) {
          if (!isRedirecting) {
            isRedirecting = true;
            await interactiveLogin([apiScope]);
          }
          return Promise.reject(silentErr);
        }
        console.error(
          "[apiClient] Silent refresh failed (non-interaction)",
          silentErr
        );
        return Promise.reject(silentErr);
      }
    }
    return Promise.reject(error);
  }
);
