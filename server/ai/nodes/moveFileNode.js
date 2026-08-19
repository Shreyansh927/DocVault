import { getCurrentQuery } from "../../utils/getCurrentQuery.js";
import { rewriteQuery } from "../planner/rewriteQuery.js";
import { movingFileTool } from "../tools/moveFileTool.js";

export async function moveFileNode(state) {
  const { moves } = state.intent.parameters;
  const query = getCurrentQuery(state);
  const rewrittenQuery = await rewriteQuery(state.messages);
  console.log("original query"+ query)
  console.log("new query:" + rewrittenQuery)

  const result = await movingFileTool.invoke({
    query: rewriteQuery,
    userId: state.userId,
    moves,
  });

  return {
    toolResult: result,
  };
}
