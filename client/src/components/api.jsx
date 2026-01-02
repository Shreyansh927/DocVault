import axios from "axios";
const base_url = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: base_url,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
