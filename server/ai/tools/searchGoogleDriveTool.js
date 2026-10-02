import { db } from "../../db.js";
import { getComposioMcpClient } from "../../utils/composioMcpClient.js";

export async function searchGoogleDrive({ userId, query }) {
  if (!userId) {
    throw new Error("Authenticated userId is required");
  }

  if (!query?.trim()) {
    throw new Error("Google Drive search query is required");
  }

  const client = await getComposioMcpClient();

  // Discover the Google Drive tool and initialize a session.
  const discoveryResult = await client.callTool({
    name: "COMPOSIO_SEARCH_TOOLS",
    arguments: {
      queries: [
        {
          use_case: "Search Google Drive files by filename or file contents",
        },
      ],
      session: {
        generate_id: true,
      },
    },
  });

  const discoveryText = discoveryResult.content?.find(
    (item) => item.type === "text",
  )?.text;

  if (discoveryResult.isError || !discoveryText) {
    throw new Error("Failed to discover Google Drive tools");
  }

  const discovery = JSON.parse(discoveryText);

  if (discovery.error || discovery.successful === false) {
    throw new Error("Google Drive tool discovery failed");
  }

  const discoveryData = discovery.data;
  const toolInfo = discoveryData?.results?.find((item) =>
    item.primary_tool_slugs?.includes("GOOGLEDRIVE_FIND_FILE"),
  );

  if (!toolInfo) {
    throw new Error("GOOGLEDRIVE_FIND_FILE was not discovered");
  }

  const sessionId = toolInfo.session_id ?? discoveryData?.session_id;

  // Resolve the connected account belonging to this user.
  // Implement this using your own database and Composio connection records.
  const accountId = await getGoogleDriveAccountId(userId);

  if (!accountId) {
    throw new Error("No Google Drive account connected for this user");
  }

  const escapedQuery = query.trim().replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  const driveQuery =
    `trashed = false and (` +
    `name contains '${escapedQuery}' or ` +
    `fullText contains '${escapedQuery}')`;

  const executionResult = await client.callTool({
    name: "COMPOSIO_MULTI_EXECUTE_TOOL",
    arguments: {
      tools: [
        {
          tool_slug: "GOOGLEDRIVE_FIND_FILE",
          account: accountId,
          arguments: {
            q: driveQuery,
            fields:
              "nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink)",
          },
        },
      ],
      sync_response_to_workbench: false,
      thought: "Search the authenticated user's Google Drive files.",
      current_step: "SEARCHING_GOOGLE_DRIVE",
      current_step_metric: "1/1",
      ...(sessionId ? { session_id: sessionId } : {}),
    },
  });

  const executionText = executionResult.content?.find(
    (item) => item.type === "text",
  )?.text;

  if (executionResult.isError || !executionText) {
    throw new Error("Google Drive MCP execution failed");
  }

  const execution = JSON.parse(executionText);

  if (execution.error || execution.successful === false) {
    throw new Error("Composio MCP execution failed");
  }

  const toolResult = execution.data?.results?.find(
    (item) => item.tool_slug === "GOOGLEDRIVE_FIND_FILE",
  );

  if (!toolResult?.response?.successful) {
    throw new Error("Google Drive search tool returned an error");
  }

  return {
    files: toolResult.response.data?.files ?? [],
    nextPageToken: toolResult.response.data?.nextPageToken ?? null,
  };
}

// Replace this with your actual database lookup.
// It must return the connected Google Drive account ID for this user.
async function getGoogleDriveAccountId(userId) {
  const result = await db.query(
    `SELECT connected_account_id
     FROM user_integrations
     WHERE user_id = $1
       AND LOWER(provider) = $2
       AND UPPER(status) = $3
     LIMIT 1`,
    [userId, "googledrive", "ACTIVE"],
  );

  return result.rows[0]?.connected_account_id ?? null;
}
