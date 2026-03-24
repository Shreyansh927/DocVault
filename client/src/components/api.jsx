import axios from "axios";

const base_url = import.meta.env.VITE_API_BASE_URL;

if (!base_url) {
  console.error("❌ VITE_API_BASE_URL is not defined");
}

const api = axios.create({
  baseURL: base_url,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    const errorMsg = err.response?.data?.error;

    // ❌ prevent infinite loop
    if (originalRequest.url.includes("/auth/refresh")) {
      window.location.href = "/login";
      return Promise.reject(err);
    }

    // 🔥 HANDLE TOKEN EXPIRED (refresh case)
    if (
      err.response?.status === 401 &&
      errorMsg === "ACCESS_TOKEN_EXPIRED" &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        await api.post("/api/auth/refresh");
        return api(originalRequest);
      } catch {
        window.location.href = "/login";
      }
    }

    // 🔥 HANDLE SESSION INVALIDATED (logout all devices)
    if (err.response?.status === 401 && errorMsg === "Session expired") {
      window.location.href = "/login";
    }

    return Promise.reject(err);
  },
);

export default api;
