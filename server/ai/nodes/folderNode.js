import {
  createFolderTool,
  deleteFoldersTool,
  toggleVisibiltyTool,
  restoreFoldersTool,
} from "../tools/foldertool.js";

export async function folderNode(state) {
  console.log("========== FOLDER NODE ==========");

  console.log(state);
  const action = state.intent.action;
  const { folderNames, category } = state.intent.parameters;

  if (action == "create") {
    const result = await createFolderTool.invoke({
      folderNames,

      userId: state.userId,

      category,
    });

    return {
      toolResult: result,
    };
  } else if (action === "delete") {
    const result = await deleteFoldersTool.invoke({
      folderNames,

      userId: state.userId,
    });

    return {
      toolResult: result,
    };
  } else if (action === "toggleVisibility") {
    const result = await toggleVisibiltyTool.invoke({
      userId: state.userId,
      folderNames,
      category,
    });
    return {
      toolResult: result,
    };
  } else if (action === "restore") {
    const result = await restoreFoldersTool.invoke({
      userId: state.userId,
      folderNames,
    });
    return {
      toolResult: result,
    };
  }
}
