import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";

import { registerFolderTools } from "./mcp-tools/folder-mcp-tools.js";
import { registerPermissonTools } from "./mcp-tools/permission-mcp-tool.js";

function createDocVaultMcpServer(userId) {
  // console.log("=================================");
  console.log("[MCP] Creating DocVault MCP server");
  console.log("[MCP] userId:", userId);
  // console.log("=================================");

  const server = new McpServer(
    {
      name: "docvault-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  const getUserId = () => userId;

  registerFolderTools(server, getUserId);
  registerPermissonTools(server, getUserId)

  console.log("[MCP] Folder tools registered");

  return server;
}

export function createDocVaultMcpHandler() {
  return createMcpHandler(({ authInfo }) => {
    // console.log("=================================");
    console.log("[MCP FACTORY CALLED]");
    console.log("[MCP] Auth info:", authInfo);
    // console.log("=================================");

    const userId = Number(authInfo?.clientId);

    console.log("[MCP] Authenticated user:", userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Unauthenticated MCP request");
    }

    return createDocVaultMcpServer(userId);
  });
}
