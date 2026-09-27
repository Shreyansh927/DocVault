import { StateGraph, START, END } from "@langchain/langgraph";

import { GraphState } from "./state.js";

import { plannerNode } from "../nodes/plannerNode.js";
import { folderNode } from "../nodes/folderNode.js";
import { responseNode } from "../nodes/responseNode.js";
import { hitlNode } from "../nodes/hitlNode.js";
import { routeIntent } from "./router.js";
import { chatNode } from "../nodes/chatNode.js";
import { moveFileNode } from "../nodes/moveFileNode.js";
import { permissionNode } from "../nodes/permissionNode.js";
import { evaluationNode } from "../nodes/evaluationNode.js";
import { moveFileExecutionNode } from "../nodes/moveFileExecutionNode.js";
import { evaluationRecoveryNode } from "../nodes/evaluationRecoveryNode.js";
import { fallbackNode } from "../nodes/fallbackNode.js";

export const builder = new StateGraph(GraphState);

builder.addNode("planner", plannerNode);

builder.addNode("folders", folderNode);

builder.addNode("chat", chatNode);

// builder.addNode("documents", async (state) => state);

builder.addNode("moveFile", moveFileNode);

builder.addNode("hitlNode", hitlNode);

builder.addNode("moveFileExecution", moveFileExecutionNode);

builder.addNode("permissions", permissionNode);

builder.addNode("response", responseNode);

builder.addNode("evaluation", evaluationNode);

builder.addNode("evaluationRecovery", evaluationRecoveryNode);

builder.addNode("fallback", fallbackNode);

builder.addEdge(START, "planner");

builder.addConditionalEdges("planner", routeIntent, {
  folders: "folders",
  // documents: "documents",
  permissions: "permissions",
  chat: "chat",
  moveFile: "moveFile",
});

builder.addEdge("folders", "response");

// builder.addEdge("documents", END);

builder.addEdge("permissions", "response");

builder.addEdge("chat", "response");

builder.addEdge("moveFile", "hitlNode");

builder.addConditionalEdges(
  "hitlNode",
  (state) => {
    console.log("===== HITL ROUTER =====");
    console.log("hitlDecision:", state.hitlDecision);

    return state.hitlDecision === "approved" ? "approved" : "rejected";
  },
  {
    approved: "moveFileExecution",
    rejected: "response",
  },
);

builder.addEdge("moveFileExecution", "response");

builder.addEdge("response", "evaluation");

builder.addConditionalEdges(
  "evaluation",
  (state) => {
    const score = Number(state.evaluationResult?.answerRelevance?.score);

    console.log("Evaluation score:", score);
    console.log("Retry count:", state.retryCount);

    // Evaluation data is invalid
    if (!Number.isFinite(score)) {
      return "failed";
    }

    // Good answer
    if (score >= 5) {
      return "success";
    }

    // One retry allowed
    if ((state.retryCount ?? 0) < 1) {
      return "retry";
    }

    // Retry already consumed
    return "failed";
  },
  {
    success: END,
    retry: "evaluationRecovery",
    failed: "fallback",
  },
);

builder.addEdge("evaluationRecovery", "planner");

builder.addEdge("fallback", END);
