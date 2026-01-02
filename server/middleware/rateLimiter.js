import { redis } from "../redis.js";

export const rediAuthRateLimiter = ({
  windowMs,
  max,
  keyPrefix,
  message,
}) => {
  return async (req, res, next) => {
    try {
      const identifier =
        req.ip || req.headers["x-forwarded-for"] || "unknown";

      const key = `${keyPrefix}:${identifier}`;

      const current = await redis.incr(key);

      if (current === 1) {
        // first request → set TTL
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }

      if (current > max) {
        return res.status(429).json({
          error: message || "Too many requests",
        });
      }

      next();
    } catch (err) {
      console.error("Redis rate limiter error:", err.message);
      // Redis down → allow request (fail open)
      next();
    }
  };
};
