import { getCurrentQuery } from "../../utils/getCurrentQuery.js";
import ModelManager from "../models/modelmanager.js";
import { prompt } from "../planner/fileMovementRulesPrompt.js";
import { rewriteQuery } from "../planner/rewriteQuery.js";
import { prepareFileMovementTool } from "../tools/trackFileMovement.js";

export async function prepareFileMovementNode(state) {
  const query = getCurrentQuery(state);
  const rewrittenQuery = await rewriteQuery(state.messages);
  console.log("original query" + query);
  console.log("new query:" + rewrittenQuery);

  const systemPrompt = prompt;

  const finalRequestedMoves = ModelManager.cohere();

  const responseMoves = await finalRequestedMoves.invoke([
    {
      role: "model",
      content: `${systemPrompt}`,
    },
    {
      role: "user",
      content: `Please process the following file movement requests: ${rewrittenQuery}`,
    },
  ]);

  const result = await prepareFileMovementTool({
    userId: state.user.id,
    moves: JSON.parse(responseMoves.content),
    query: rewrittenQuery,
  });
  return {
    toolResult: result,
  };
}
