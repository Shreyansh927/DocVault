import { StateGraph, START, END } from "@langchain/langgraph";

import { GraphState } from "./state.js";

import { plannerNode } from "../nodes/plannerNode.js";
import { folderNode } from "../nodes/folderNode.js";
import { responseNode } from "../nodes/responseNode.js";

import { routeIntent } from "./router.js";
import { chatNode } from "../nodes/chatNode.js";
import { moveFileNode } from "../nodes/moveFileNode.js";
import { permissionNode } from "../nodes/permissionNode.js";

export const builder = new StateGraph(GraphState);

builder.addNode("planner", plannerNode);

builder.addNode("folders", folderNode);

builder.addNode("chat", chatNode);

builder.addNode("documents", async (state) => state);

builder.addNode("moveFile", moveFileNode);

builder.addNode("permissions", permissionNode);

builder.addNode("response", responseNode);

builder.addEdge(START, "planner"); 

builder.addConditionalEdges("planner", routeIntent, {
  folders: "folders",
  documents: "documents",
  permissions: "permissions",
  chat: "chat",
  moveFile: "moveFile",
});

builder.addEdge("folders", "response");

builder.addEdge("response", END);

builder.addEdge("documents", END);

builder.addEdge("permissions", "response");

builder.addEdge("chat", "response");

builder.addEdge("moveFile", "response");
