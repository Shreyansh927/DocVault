import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { aiQueryResponse } from "../controllers/ai-query-response.js";

const aiResponseRouter = express.Router();

aiResponseRouter.get("/", authMiddleware, aiQueryResponse);

export default aiResponseRouter;
