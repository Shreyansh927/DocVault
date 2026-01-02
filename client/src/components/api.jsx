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
  (err) => {
    const status = err.response?.status;
    const path = window.location.pathname;

    if (status === 401 && path !== "/login") {
      window.location.href = "/login";
    }

    return Promise.reject(err);
  }
);

export default api;
