import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { db } from "../db.js";
import { composio } from "./composioClient.js";

const GOOGLE_DRIVE_TOOLKIT = "googledrive";

export async function getGoogleDriveToolsForUser(userId) {
  // Always resolve the connection from the authenticated user's ID.
  const result = await db.query(
    `SELECT connected_account_id, status
     FROM user_integrations
     WHERE user_id = $1 AND provider = $2`,
    [userId, "google_drive"],
  );

  const integration = result.rows[0];

  if (!integration?.connected_account_id) {
    throw new Error("Google Drive is not connected");
  }

  // Do not create a tool session for a pending connection.
  const account = await composio.connectedAccounts.get(
    integration.connected_account_id,
  );

  if (account.status !== "ACTIVE" || account.isDisabled) {
    throw new Error("Google Drive connection is not active");
  }

  // Create a session scoped to this DocVault user and account.
  const session = await composio.sessions.create(String(userId), {
    mcp: true,
    toolkits: [GOOGLE_DRIVE_TOOLKIT],
    authConfigs: {
      [GOOGLE_DRIVE_TOOLKIT]: authConfigIdFromEnv(),
    },
    connectedAccounts: {
      [GOOGLE_DRIVE_TOOLKIT]: [integration.connected_account_id],
    },
  });

  if (!session.mcp?.url) {
    throw new Error("Composio did not provide an MCP endpoint");
  }

  // Use the session's credentials, not a shared global MCP client.
  const mcpClient = new MultiServerMCPClient({
    googleDrive: {
      transport: "http",
      url: session.mcp.url,
      headers: session.mcp.headers,
    },
  });

  const tools = await mcpClient.getTools();

  return { tools, mcpClient, session };
}

function authConfigIdFromEnv() {
  const id = process.env.COMPOSIO_GOOGLE_DRIVE_AUTH_CONFIG_ID;

  if (!id) {
    throw new Error("COMPOSIO_GOOGLE_DRIVE_AUTH_CONFIG_ID is missing");
  }

  return id;
}
