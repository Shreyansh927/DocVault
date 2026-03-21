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
    const status = err.response?.status;

    if (status === 401) {
      try {
        
        await api.get("/api/auth/me");
        return api(err.config); 
      } catch {
        window.location.href = "/login";
      }
    }

    return Promise.reject(err);
  },
);

export default api;
