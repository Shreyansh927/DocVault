import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many attempts. Try again later.",
});

export const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1,
  message: "Too many attempts. Try again later.",
  handler: (req, res) => {
    console.log("Rate limit triggered for IP:", req.ip);
    res.status(429).json({
      message: "Too many AI requests. Try again later.",
    });
  },
});
