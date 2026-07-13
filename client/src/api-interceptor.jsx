import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

const refreshApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const message = error.response?.data?.error;

    if (
      status === 401 &&
      !originalRequest._retry &&
      (message === "ACCESS_TOKEN_EXPIRED" || message === "No token")
    ) {
      originalRequest._retry = true;

      try {
        if (window.location.pathname !== "/login" || message !== "No token") {
          await refreshApi.get("/api/auth/refresh");
          return api(originalRequest);
        }
      } catch {
        window.location.href = "/login";
      }
    }

    if (status === 401 && message === "Session expired") {
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
