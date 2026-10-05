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
import { googleDriveNode } from "../nodes/googleDriveNode.js";

import { queryDecomposerNode } from "../nodes/queryDecomposerNode.js";
import { queryExtractorNode } from "../nodes/queryExtractorNode.js";
import { advanceQueryNode } from "../nodes/advanceQueryNode.js";

export const builder = new StateGraph(GraphState);

// ==========================================
// NODES
// ==========================================

builder.addNode("queryDecomposer", queryDecomposerNode);

builder.addNode("queryExtractor", queryExtractorNode);

builder.addNode("planner", plannerNode);

builder.addNode("folders", folderNode);

builder.addNode("chat", chatNode);

builder.addNode("moveFile", moveFileNode);

builder.addNode("hitlNode", hitlNode);

builder.addNode("moveFileExecution", moveFileExecutionNode);

builder.addNode("permissions", permissionNode);

builder.addNode("googleDrive", googleDriveNode);

builder.addNode("advanceQuery", advanceQueryNode);

builder.addNode("response", responseNode);

builder.addNode("evaluation", evaluationNode);

builder.addNode("evaluationRecovery", evaluationRecoveryNode);

builder.addNode("fallback", fallbackNode);

// ==========================================
// START
// ==========================================

builder.addEdge(START, "queryDecomposer");

// ==========================================
// DECOMPOSER → EXTRACTOR
// ==========================================

builder.addEdge("queryDecomposer", "queryExtractor");

// ==========================================
// EXTRACTOR → PLANNER
// ==========================================

builder.addEdge("queryExtractor", "planner");

// ==========================================
// PLANNER → ROUTER
// ==========================================

builder.addConditionalEdges("planner", routeIntent, {
  folders: "folders",
  permissions: "permissions",
  chat: "chat",
  moveFile: "moveFile",
  googleDrive: "googleDrive",
});

// ==========================================
// FOLDERS → ADVANCE
// ==========================================

builder.addEdge("folders", "advanceQuery");

// ==========================================
// PERMISSIONS → ADVANCE
// ==========================================

builder.addEdge("permissions", "advanceQuery");

// ==========================================
// CHAT → ADVANCE
// ==========================================

builder.addEdge("chat", "advanceQuery");

// ==========================================
// MOVE FILE → HITL
// ==========================================

builder.addEdge("moveFile", "hitlNode");

// ==========================================
// GOOGLE DRIVE → ADVANCE
// ==========================================

builder.addEdge("googleDrive", "advanceQuery");

// ==========================================
// HITL
// ==========================================

builder.addConditionalEdges(
  "hitlNode",

  (state) => {
    console.log("=================================");
    console.log("HITL ROUTER");
    console.log("Decision:", state.hitlDecision);
    console.log("=================================");

    return state.hitlDecision === "approved" ? "approved" : "rejected";
  },

  {
    approved: "moveFileExecution",

    // IMPORTANT:
    // Rejected task should not terminate
    // the entire multi-task request.
    rejected: "advanceQuery",
  },
);

// ==========================================
// MOVE EXECUTION → ADVANCE
// ==========================================

builder.addEdge("moveFileExecution", "advanceQuery");

// ==========================================
// ADVANCE QUERY → NEXT OR DONE
// ==========================================

builder.addConditionalEdges(
  "advanceQuery",

  (state) => {
    const nextIndex = state.nextQueryIndex ?? 0;

    const totalQueries = state.queries?.length ?? 0;

    console.log("=================================");
    console.log("QUERY PROGRESS");
    console.log("Next Index:", nextIndex);
    console.log("Total Queries:", totalQueries);
    console.log("=================================");

    if (nextIndex < totalQueries) {
      return "next";
    }

    return "done";
  },

  {
    next: "queryExtractor",
    done: "response",
  },
);

// ==========================================
// RESPONSE → EVALUATION
// ==========================================

builder.addEdge("response", "evaluation");

// ==========================================
// EVALUATION
// ==========================================

builder.addConditionalEdges(
  "evaluation",

  (state) => {
    const score = Number(state.evaluationResult?.answerRelevance?.score);

    console.log("Evaluation score:", score);
    console.log("Retry count:", state.retryCount);

    if (!Number.isFinite(score)) {
      return "failed";
    }

    if (score >= 5) {
      return "success";
    }

    if ((state.retryCount ?? 0) < 1) {
      return "retry";
    }

    return "failed";
  },

  {
    success: END,
    retry: "evaluationRecovery",
    failed: "fallback",
  },
);

// ==========================================
// EVALUATION RECOVERY
// ==========================================

builder.addEdge("evaluationRecovery", "planner");

// ==========================================
// FALLBACK
// ==========================================

builder.addEdge("fallback", END);
