import express from "express";
import {
  forGotPAssword,
  verifyOtp,
  setNewPassword,
} from "../controllers/forgotPasswordController.js";

const forgotPasswordRoute = express.Router();

forgotPasswordRoute.post("/reset-password", forGotPAssword);
forgotPasswordRoute.post("/verify-otp", verifyOtp);
forgotPasswordRoute.post("/set-new-password", setNewPassword);

export default forgotPasswordRoute;
