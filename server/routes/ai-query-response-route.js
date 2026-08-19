import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  aiQueryResponse,
  getUnreadCount,
  markResponsesAsSeen,
} from "../controllers/ai-assistant.js";
import { aiLimiter } from "../middleware/rateLimiter.js";
import {
  RelatedRag,
  getFullRagHistory,
  getTracesOfQuery,
} from "../controllers/user-rag-history.js";
import { auth } from "googleapis/build/src/apis/toolresults/index.js";

const aiResponseRouter = express.Router();

aiResponseRouter.get("/", aiLimiter, authMiddleware, aiQueryResponse);
aiResponseRouter.get("/unseen-responses-count", authMiddleware, getUnreadCount);
aiResponseRouter.get("/mark-as-seen", authMiddleware, markResponsesAsSeen);
aiResponseRouter.get("/related-past-queries", authMiddleware, RelatedRag);
aiResponseRouter.get("/full-rag-history", authMiddleware, getFullRagHistory);
aiResponseRouter.get("/get-query-trace-langsmith", authMiddleware, getTracesOfQuery)

export default aiResponseRouter;
