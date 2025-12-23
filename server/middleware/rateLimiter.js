import rateLimit from "express-rate-limit";

/* ---------- GENERAL API LIMITER ---------- */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please slow down.",
  },
});

/* ---------- AUTH (LOGIN / SIGNUP) ---------- */
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts. Try again later.",
  },
});
