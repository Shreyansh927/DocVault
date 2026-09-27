import { callMcpTool } from "../../mcp/client.js";

export async function folderNode(state) {
  console.log("=================================");
  console.log("[FOLDER NODE]");
  console.log("Intent:", state.intent);
  console.log("User:", state.userId);
  console.log("=================================");

  const action = state.intent.action;
  const { folderNames, category } = state.intent.parameters;

  if (action === "create") {
    const result = await callMcpTool(
      "create_folder",
      {
        folderNames,
        category,
      },
      state.mcpToken,
    );

    return {
      toolResult: extractMcpText(result),
    };
  }

  if (action === "delete") {
    const result = await callMcpTool(
      "delete_folders",
      {
        folderNames,
      },
      state.mcpToken,
    );

    return {
      toolResult: extractMcpText(result),
    };
  }

  if (action === "toggleVisibility") {
    const result = await callMcpTool(
      "toggle_folder_visibility",
      {
        folderNames,
        category,
      },
      state.mcpToken,
    );

    return {
      toolResult: extractMcpText(result),
    };
  }

  if (action === "restore") {
    const result = await callMcpTool(
      "restore_folders",
      {
        folderNames,
      },
      state.mcpToken,
    );

    return {
      toolResult: extractMcpText(result),
    };
  }

  return {
    toolResult: "Unsupported folder action.",
  };
}

function extractMcpText(result) {
  return (
    result.content
      ?.filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n") ?? ""
  );
}
