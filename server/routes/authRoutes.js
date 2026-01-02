import { signup, login, logout } from "../controllers/authController.js";

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { rediAuthRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

export default router;
