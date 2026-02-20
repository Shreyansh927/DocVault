import { signup, login, logout } from "../controllers/authController.js";

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
// authRoutes.js
router.get("/me", authMiddleware, (req, res) => {
  res.json({
    id: req.user.id,
    auth_uuid: req.user.auth_uuid,
    email: req.user.email,
  });
});

export default router;
