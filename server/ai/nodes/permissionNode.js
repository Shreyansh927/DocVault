import { success } from "zod";
import { accessControlTool } from "../tools/permissiontool.js";
import { toolresults } from "googleapis/build/src/apis/toolresults/index.js";

export async function permissionNode(state) {
  const { permissions } = state.intent.parameters;
  const result = await accessControlTool.invoke({
    userId: state.userId,
    permissions,
  });

  return {
    success: true,
    toolResult: result,
  };
}
