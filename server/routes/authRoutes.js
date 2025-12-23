import { signup, login, logout } from "../controllers/authController.js";

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

export default router;
