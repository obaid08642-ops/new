/**
 * Axios HTTP client for Nabd Admin API.
 *
 * يستخدم REACT_APP_BACKEND_URL من ملف .env كـ base URL.
 * كل طلب backend يجب أن يبدأ بـ /api/ ليُوجَّه عبر الـ ingress بشكل صحيح.
 *
 * عند إرسالك للـ APIs الحقيقية لاحقاً، سأملأ src/api/endpoints.js
 * بالـ functions اللي تستخدم هذا الـ client.
 */
import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL || "";

const client = axios.create({
  baseURL: `${BASE}/api/v1`,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// ── Request interceptor ──────────────────────────────────────
client.interceptors.request.use((config) => {
  const impUser = localStorage.getItem("nabd_impersonated_user_id");
  if (impUser) config.headers["x-impersonate-user-id"] = impUser;
  return config;
});

// ── Error interceptor ──────────────────────────────────────
client.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      console.warn("Session expired or unauthorized");
      // Don't completely crash or remove localstorage immediately here, let App.js handle session state
      // but we could emit an event if needed.
    }
    return Promise.reject(err);
  }
);

export default client;
