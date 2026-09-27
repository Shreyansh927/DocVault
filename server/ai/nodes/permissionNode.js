import { success } from "zod";
import { accessControlTool } from "../tools/permissiontool.js";
import { toolresults } from "googleapis/build/src/apis/toolresults/index.js";
import { callMcpTool } from "../../mcp/client.js";

export async function permissionNode(state) {
  const { permissions } = state.intent.parameters;
  const result = await callMcpTool(
    "permission-access-control",
    { permissions },
    state.mcpToken,
  );

  return {
    toolResult: result.content,
  };
}

// function extractMcpText(result) {
//   return (
//     result.content
//       ?.filter((item) => item.type === "text")
//       .map((item) => item.text)
//       .join("\n") ?? ""
//   );
// }
