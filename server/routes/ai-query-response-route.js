import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { aiQueryResponse } from "../controllers/ai-assistant.js";
import { aiLimiter } from "../middleware/rateLimiter.js";
import { RelatedRag } from "../controllers/user-rag-history.js";

const aiResponseRouter = express.Router();

aiResponseRouter.get("/", aiLimiter, authMiddleware, aiQueryResponse);
aiResponseRouter.get(
  "/related-past-queries",
  authMiddleware,
  RelatedRag,
);

export default aiResponseRouter;
