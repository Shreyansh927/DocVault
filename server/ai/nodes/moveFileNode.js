import { getCurrentQuery } from "../../utils/getCurrentQuery.js";
import { movingFileTool } from "../tools/moveFileTool.js";

export async function moveFileNode(state) {
  const { moves } = state.intent.parameters;
  const query = getCurrentQuery(state);

  const result = await movingFileTool.invoke({
    query,
    userId: state.userId,
    moves,
  });

  return {
    toolResult: result,
  };
}
