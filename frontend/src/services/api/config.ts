import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

// Base API URL - adjust based on your backend URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";


// Socket.io base URL
// Priority: VITE_SOCKET_URL (explicit) > strip /api/v1 from API URL (fallback)
// For Hostinger VPS / Nginx reverse proxy, always set VITE_SOCKET_URL explicitly
export const getSocketBaseURL = (): string => {
  // Use dedicated socket URL if set — recommended for production VPS
  if (import.meta.env.VITE_SOCKET_URL) {
    const url = import.meta.env.VITE_SOCKET_URL.replace(/\/$/, ''); // strip trailing slash
    if (import.meta.env.DEV) console.log('[Socket] Using VITE_SOCKET_URL:', url);
    return url;
  }

  // Fallback: derive from API URL by stripping /api/v1 suffix
  const apiBaseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";
  const socketUrl = apiBaseUrl.replace(/\/api\/v\d+\/?$|\/api\/?$|\/$/, '');

  if (import.meta.env.DEV) {
    console.log('[Socket] Derived socket URL from API URL:', socketUrl);
    console.warn('[Socket] ⚠️ Set VITE_SOCKET_URL explicitly in .env.production to avoid issues on VPS/Nginx');
  }

  return socketUrl || "http://localhost:5000";
};


// Log the API base URL for debugging (only in development or if there's an issue)
if (import.meta.env.DEV || !import.meta.env.VITE_API_BASE_URL) {
  console.log('[API Config] Base URL:', API_BASE_URL);
  console.log('[API Config] VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
  console.log('[API Config] Socket Base URL:', getSocketBaseURL());
  console.log('[API Config] Secure Context:', window.isSecureContext ? '✅ Yes' : '❌ No (FCM will fail on mobile)');
}

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("authToken");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: any) => {
    // Only handle 401 (Unauthorized) for auto-logout
    // 403 (Forbidden) means user is authenticated but doesn't have permission - DO NOT LOGOUT
    if (error.response?.status === 401) {
      // Check if this is an authentication endpoint (OTP verification, etc.)
      // Don't redirect for auth endpoints - let the component handle the error
      const isAuthEndpoint = error.config?.url?.includes("/auth/");

      // Check if there was a token in the request (meaning user was logged in)
      const hadToken = error.config?.headers?.Authorization;

      // Only redirect if:
      // 1. It's not an auth endpoint
      // 2. There was a token in the request (user was logged in but token expired)
      // 3. User is not already on login/signup pages
      if (!isAuthEndpoint && hadToken) {
        const currentPath = window.location.pathname;

        // Skip redirect if already on public auth pages (login/signup)
        if (currentPath.includes("/login") || currentPath.includes("/signup")) {
          return Promise.reject(error);
        }

        // Token expired or invalid - clear token and redirect to appropriate login
        // Determine which login page based on the Current URL or API endpoint
        const apiUrl = error.config?.url || "";
        let redirectPath = "/login";

        if (currentPath.includes("/admin/") || apiUrl.includes("/admin/")) {
          redirectPath = "/admin/login";
        } else if (
          currentPath.includes("/seller/") ||
          apiUrl.includes("/seller/") ||
          apiUrl.includes("/sellers")
        ) {
          redirectPath = "/seller/login";
        } else if (
          currentPath.includes("/delivery/") ||
          apiUrl.includes("/delivery/")
        ) {
          redirectPath = "/delivery/login";
        }

        localStorage.removeItem("authToken");
        localStorage.removeItem("userData");
        window.location.href = redirectPath;
      }
      // If no token was present, user is just browsing as guest - don't redirect
      // Just reject the promise so the component can handle it gracefully
    }
    // For 403 and other errors, just reject the promise so the UI can handle it
    return Promise.reject(error);
  }
);

// Token management helpers
export const setAuthToken = (token: string) => {
  localStorage.setItem("authToken", token);
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem("authToken");
};

export const removeAuthToken = () => {
  const token = localStorage.getItem('fcm_token_web');
  if (token) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    api.delete('/fcm-tokens/remove', {
      data: { token, platform: isMobile ? 'mobile' : 'web' }
    }).catch(err => console.warn('Failed to unregister FCM token on logout:', err));
  }

  localStorage.removeItem("authToken");
  localStorage.removeItem("userData");
  localStorage.removeItem("fcm_token_web"); // Clear FCM registration cache on logout
};

export default api;
