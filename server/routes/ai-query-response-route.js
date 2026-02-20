import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { aiQueryResponse } from "../controllers/ai-query-response.js";
import { aiLimiter } from "../middleware/rateLimiter.js";

const aiResponseRouter = express.Router();

aiResponseRouter.get("/", aiLimiter, authMiddleware, aiQueryResponse);

export default aiResponseRouter;
