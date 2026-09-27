import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { handleHITLDecision } from "../controllers/hitlController.js";

const hitlRoutes = express.Router();

hitlRoutes.post(
  "/ai-query-response/:jobId/hitl",
  authMiddleware,
  handleHITLDecision,
);

export default hitlRoutes;
